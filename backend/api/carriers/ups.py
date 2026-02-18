import os
import base64
import hashlib
import hmac
from datetime import datetime
from typing import Optional
import httpx
import json

from .base import BaseCarrier
from ..models import Package, TrackingEvent, CarrierType, PackageStatus

class UPSCarrier(BaseCarrier):
    carrier_type = CarrierType.UPS
    tracking_url_template = "https://www.ups.com/track?tracknum={tracking_number}"
    
    tracking_patterns = [
        r'^1Z[A-Z0-9]{16}$',  # Standard UPS
        r'^[0-9]{9}$',         # UPS Mail Innovations
        r'^[A-Z]{2}[0-9]{9}US$',  # SurePost
    ]
    
    def __init__(self):
        self.client_id = os.getenv("UPS_CLIENT_ID")
        self.client_secret = os.getenv("UPS_CLIENT_SECRET")
        self.account_number = os.getenv("UPS_ACCOUNT_NUMBER")
        self.base_url = "https://onlinetools.ups.com/api/track/v1"
    
    async def track(self, tracking_number: str) -> Optional[Package]:
        if not self.client_id:
            return await self._mock_track(tracking_number)
        
        access_token = await self._get_access_token()
        
        headers = {
            "Authorization": f"Bearer {access_token}",
            "Content-Type": "application/json"
        }
        
        async with httpx.AsyncClient() as client:
            response = await client.get(
                f"{self.base_url}/details/{tracking_number}",
                headers=headers,
                timeout=30.0
            )
            
            if response.status_code != 200:
                return None
            
            data = response.json()
            return self._parse_response(data, tracking_number)
    
    async def _get_access_token(self) -> str:
        """OAuth2 token retrieval"""
        auth_string = base64.b64encode(
            f"{self.client_id}:{self.client_secret}".encode()
        ).decode()
        
        async with httpx.AsyncClient() as client:
            response = await client.post(
                "https://onlinetools.ups.com/security/v1/oauth/token",
                headers={
                    "Authorization": f"Basic {auth_string}",
                    "Content-Type": "application/x-www-form-urlencoded"
                },
                data={"grant_type": "client_credentials"},
                timeout=10.0
            )
            return response.json()["access_token"]
    
    def _parse_response(self, data: dict, tracking_number: str) -> Optional[Package]:
        try:
            shipment = data.get("trackResponse", {}).get("shipment", [{}])[0]
            package = shipment.get("package", [{}])[0]
            
            events = []
            for activity in package.get("activity", []):
                location = activity.get("location", {})
                address = location.get("address", {})
                city = address.get("city", "")
                state = address.get("stateProvince", "")
                country = address.get("country", "")
                
                loc_str = f"{city}, {state}" if state else city
                if country and country != "US":
                    loc_str += f" ({country})"
                
                status_type = activity.get("status", {}).get("type", "")
                description = activity.get("status", {}).get("description", "")
                
                event = TrackingEvent(
                    timestamp=datetime.fromisoformat(
                        activity.get("date", "").replace("Z", "+00:00")
                    ),
                    status=description,
                    location=loc_str,
                    description=description,
                    raw_status=status_type
                )
                events.append(event)
            
            current_status = package.get("currentStatus", "")
            
            return Package(
                id=f"ups_{tracking_number}",
                tracking_number=tracking_number,
                carrier=self.carrier_type,
                carrier_detected=True,
                status=self.parse_status(current_status),
                events=sorted(events, key=lambda x: x.timestamp, reverse=True),
                last_updated=datetime.utcnow(),
                created_at=datetime.utcnow()
            )
        except Exception as e:
            print(f"Error parsing UPS response: {e}")
            return None
    
    async def _mock_track(self, tracking_number: str) -> Package:
        return Package(
            id=f"ups_{tracking_number}",
            tracking_number=tracking_number,
            carrier=self.carrier_type,
            carrier_detected=True,
            status=PackageStatus.OUT_FOR_DELIVERY,
            events=[
                TrackingEvent(
                    timestamp=datetime.utcnow(),
                    status="Out for Delivery",
                    location="Local Facility",
                    description="Out for delivery today by 9:00 PM",
                    raw_status="OutForDelivery"
                )
            ],
            last_updated=datetime.utcnow(),
            created_at=datetime.utcnow()
        )
    
    def parse_status(self, raw_status: str) -> PackageStatus:
        status_map = {
            'pickup': PackageStatus.PRE_TRANSIT,
            'intransit': PackageStatus.IN_TRANSIT,
            'outforDelivery': PackageStatus.OUT_FOR_DELIVERY,
            'delivered': PackageStatus.DELIVERED,
            'exception': PackageStatus.EXCEPTION,
            'returned': PackageStatus.RETURNED,
        }
        return status_map.get(raw_status.lower(), PackageStatus.UNKNOWN)
