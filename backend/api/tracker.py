from typing import Optional, List
from datetime import datetime, timedelta
from cachetools import TTLCache
import asyncio

from .models import Package, PackageCreate, CarrierType, TrackingResponse
from .carriers import detect_carrier, get_carrier, CARRIERS

# Cache for 5 minutes to avoid hitting API limits
cache = TTLCache(maxsize=1000, ttl=300)

class PackageTracker:
    def __init__(self):
        self.cache = cache
    
    async def track_package(
        self, 
        tracking_number: str, 
        carrier: Optional[CarrierType] = None
    ) -> TrackingResponse:
        """
        Track a package with auto-detection and caching
        """
        cache_key = f"{carrier.value if carrier else 'auto'}_{tracking_number}"
        
        # Check cache
        if cache_key in self.cache:
            cached = self.cache[cache_key]
            return TrackingResponse(success=True, package=cached, cached=True)
        
        # Auto-detect carrier if not specified
        detected_carrier = carrier
        carrier_detected = False
        
        if not detected_carrier:
            detected_carrier = detect_carrier(tracking_number)
            carrier_detected = True
        
        if detected_carrier == CarrierType.UNKNOWN:
            return TrackingResponse(
                success=False,
                error="Could not detect carrier from tracking number. Please specify manually."
            )
        
        # Get carrier instance and track
        carrier_instance = get_carrier(detected_carrier)
        if not carrier_instance:
            return TrackingResponse(
                success=False,
                error=f"Carrier {detected_carrier} not supported"
            )
        
        try:
            package = await carrier_instance.track(tracking_number)
            
            if package:
                package.carrier_detected = carrier_detected
                self.cache[cache_key] = package
                return TrackingResponse(success=True, package=package)
            else:
                return TrackingResponse(
                    success=False,
                    error="Unable to retrieve tracking information"
                )
                
        except Exception as e:
            return TrackingResponse(
                success=False,
                error=f"Tracking failed: {str(e)}"
            )
    
    async def track_multiple(
        self, 
        tracking_numbers: List[str]
    ) -> List[TrackingResponse]:
        """Track multiple packages concurrently"""
        tasks = [
            self.track_package(tn) for tn in tracking_numbers
        ]
        return await asyncio.gather(*tasks)
    
    def get_supported_carriers(self) -> List[CarrierType]:
        """Get list of supported carriers"""
        return list(CARRIERS.keys())
