import os
import xml.etree.ElementTree as ET
from datetime import datetime
from typing import Optional
import httpx

from .base import BaseCarrier
from ..models import Package, TrackingEvent, CarrierType, PackageStatus

class USPSCarrier(BaseCarrier):
    carrier_type = CarrierType.USPS
    tracking_url_template = "https://tools.usps.com/go/TrackConfirmAction?tLabels={tracking_number}"
    
    # USPS tracking number patterns
    tracking_patterns = [
        r'^(94|93|92|95|96)[0-9]{20}$',  # Domestic
        r'^[A-Z]{2}[0-9]{9}[A-Z]{2}$',    # International
        r'^(70|14|23|03)[0-9]{14}$',      # Priority Mail Express
        r'^(M0|82)[0-9]{8}$',             # Signature Confirmation
    ]
    
    def __init__(self):
        self.user_id = os.getenv("USPS_API_USER_ID")
        self.api_url = "https://secure.shippingapis.com/ShippingAPI.dll"
    
    async def track(self, tracking_number: str) -> Optional[Package]:
        if not self.user_id:
            # Fallback to scraping or return mock for demo
            return await self._mock_track(tracking_number)
        
        xml_request = f"""<?xml version="1.0" encoding="UTF-8"?>
        <TrackRequest USERID="{self.user_id}">
            <TrackID ID="{tracking_number}"></TrackID>
        </TrackRequest>"""
        
        async with httpx.AsyncClient() as client:
            response = await client.get(
                self.api_url,
                params={"API": "TrackV2", "XML": xml_request},
                timeout=30.0
            )
            
            if response.status_code != 200:
                return None
            
            return self._parse_response(response.text, tracking_number)
    
    def _parse_response(self, xml_data: str, tracking_number: str) -> Optional[Package]:
        try:
            root = ET.fromstring(xml_data)
            track_info = root.find('.//TrackInfo')
            
            if track_info is None:
                return None
            
            status = track_info.find('Status')
            status_category = track_info.find('StatusCategory')
            
            events = []
            for detail in track_info.findall('.//TrackDetail'):
                event = TrackingEvent(
                    timestamp=datetime.strptime(
                        detail.find('EventDate').text + ' ' + detail.find('EventTime').text,
                        '%B %d, %Y %H:%M %p'
                    ),
                    status=detail.find('Event').text,
                    location=f"{detail.find('EventCity').text}, {detail.find('EventState').text}",
                    description=detail.find('Event').text,
                    raw_status=detail.find('Event').text
                )
                events.append(event)
            
            return Package(
                id=f"usps_{tracking_number}",
                tracking_number=tracking_number,
                carrier=self.carrier_type,
                carrier_detected=True,
                status=self.parse_status(status_category.text if status_category else status.text),
                estimated_delivery=None,  # Parse from response if available
                events=sorted(events, key=lambda x: x.timestamp, reverse=True),
                last_updated=datetime.utcnow(),
                created_at=datetime.utcnow()
            )
        except Exception as e:
            print(f"Error parsing USPS response: {e}")
            return None
    
    async def _mock_track(self, tracking_number: str) -> Package:
        """Mock implementation for demo purposes"""
        return Package(
            id=f"usps_{tracking_number}",
            tracking_number=tracking_number,
            carrier=self.carrier_type,
            carrier_detected=True,
            status=PackageStatus.IN_TRANSIT,
            events=[
                TrackingEvent(
                    timestamp=datetime.utcnow(),
                    status="In Transit",
                    location="Memphis, TN",
                    description="Arrived at Regional Facility",
                    raw_status="In Transit"
                )
            ],
            last_updated=datetime.utcnow(),
            created_at=datetime.utcnow()
        )
    
    def parse_status(self, raw_status: str) -> PackageStatus:
        status_map = {
            'pre_transit': PackageStatus.PRE_TRANSIT,
            'transit': PackageStatus.IN_TRANSIT,
            'delivered': PackageStatus.DELIVERED,
            'out_for_delivery': PackageStatus.OUT_FOR_DELIVERY,
            'exception': PackageStatus.EXCEPTION,
            'returned': PackageStatus.RETURNED,
        }
        raw_lower = raw_status.lower().replace(' ', '_')
        return status_map.get(raw_lower, PackageStatus.UNKNOWN)
