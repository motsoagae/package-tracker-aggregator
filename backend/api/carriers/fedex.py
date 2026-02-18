import os
from datetime import datetime
from typing import Optional
import httpx

from .base import BaseCarrier
from ..models import Package, TrackingEvent, CarrierType, PackageStatus

class FedExCarrier(BaseCarrier):
    carrier_type = CarrierType.FEDEX
    tracking_url_template = "https://www.fedex.com/apps/fedextrack/?tracknumbers={tracking_number}"
    
    tracking_patterns = [
        r'^[0-9]{12}$',       # Standard FedEx
        r'^[0-9]{15}$',       # Ground
        r'^[0-9]{20}$',       # SmartPost
        r'^[0-9]{34}$',       # Express
    ]
    
    def __init__(self):
        self.client_id = os.getenv("FEDEX_CLIENT_ID")
        self.client_secret = os.getenv("FEDEX_CLIENT_SECRET")
        self.account_number = os.getenv("FEDEX_ACCOUNT_NUMBER")
        self.base_url = "https://apis.fedex.com/track/v1"
    
    async def track(self, tracking_number: str) -> Optional[Package]:
        if not self.client_id:
            return await self._mock_track(tracking_number)
        
        access_token = await self._get_access_token()
        
        headers = {
            "Authorization": f"Bearer {access_token}",
            "Content-Type": "application/json"
        }
        
        payload = {
            "includeDetailedScans": True,
            "trackingInfo": [{
                "trackingNumberInfo": {
                    "trackingNumber": tracking_number
                }
            }]
        }
        
        async with httpx.AsyncClient() as client:
            response = await client.post(
                f"{self.base_url}/trackingnumbers",
                headers=headers,
                json=payload,
                timeout=30.0
            )
            
            if response.status_code != 200:
                return None
            
            data = response.json()
            return self._parse_response(data, tracking_number)
    
    async def _get_access_token(self) -> str:
        async with httpx.AsyncClient() as client:
            response = await client.post(
                "https://apis.fedex.com/oauth/token",
                data={
                    "grant_type": "client_credentials",
                    "client_id": self.client_id,
                    "client_secret": self.client_secret
                },
                timeout=10.0
            )
            return response.json()["access_token"]
    
    def _parse_response(self, data: dict, tracking_number: str) -> Optional[Package]:
        try:
            complete_track_results = data.get("output", {}).get("completeTrackResults", [{}])[0]
            track_results = complete_track_results.get("trackResults", [{}])[0]
            
            events = []
            scan_events = track_results.get("scanEvents", [])
            
            for event in scan_events:
                event_time = event.get("date", "") + "T" + event.get("time", "")
                location = event.get("scanLocation", {})
                city = location.get("city", "")
                state = location.get("stateOrProvinceCode", "")
                country = location.get("countryCode", "")
                
                loc_str = f"{city}, {state}" if state else city
                if country and country != "US":
                    loc_str += f" ({country})"
                
                tracking_event = TrackingEvent(
                    timestamp=datetime.fromisoformat(event_time.replace("Z", "+00:00")),
                    status=event.get("eventDescription", ""),
                    location=loc_str,
                    description=event.get("eventDescription", ""),
                    raw_status=event.get("eventType", "")
                )
                events.append(tracking_event)
            
            latest_status = track_results.get("latestStatusDetail", {})
            status_code = latest_status.get("statusByLocale", "")
            
            return Package(
                id=f"fedex_{tracking_number}",
                tracking_number=tracking_number,
                carrier=self.carrier_type,
                carrier_detected=True,
                status=self.parse_status(status_code),
                events=sorted(events, key=lambda x: x.timestamp, reverse=True),
                last_updated=datetime.utcnow(),
                created_at=datetime.utcnow()
            )
        except Exception as e:
            print(f"Error parsing FedEx response: {e}")
            return None
    
    async def _mock_track(self, tracking_number: str) -> Package:
        return Package(
            id=f"fedex_{tracking_number}",
            tracking_number=tracking_number,
            carrier=self.carrier_type,
            carrier_detected=True,
            status=PackageStatus.DELIVERED,
            delivered_at=datetime.utcnow(),
            events=[
                TrackingEvent(
                    timestamp=datetime.utcnow(),
                    status="Delivered",
                    location="Front Porch",
                    description="Left at front porch. Signature not required.",
                    raw_status="Delivered"
                )
            ],
            last_updated=datetime.utcnow(),
            created_at=datetime.utcnow()
        )
    
    def parse_status(self, raw_status: str) -> PackageStatus:
        status_map = {
            'picked_up': PackageStatus.PRE_TRANSIT,
            'in_transit': PackageStatus.IN_TRANSIT,
            'out_for_delivery': PackageStatus.OUT_FOR_DELIVERY,
            'delivered': PackageStatus.DELIVERED,
            'exception': PackageStatus.EXCEPTION,
            'shipment_canceled': PackageStatus.EXCEPTION,
        }
        return status_map.get(raw_status.lower().replace(" ", "_"), PackageStatus.UNKNOWN)
