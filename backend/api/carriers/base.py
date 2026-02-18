from abc import ABC, abstractmethod
from typing import Optional, List
from ..models import Package, TrackingEvent, CarrierType, PackageStatus

class BaseCarrier(ABC):
    """Abstract base class for all carrier implementations"""
    
    carrier_type: CarrierType
    tracking_url_template: str
    
    # Regex patterns for tracking number validation
    tracking_patterns: List[str] = []
    
    @abstractmethod
    async def track(self, tracking_number: str) -> Optional[Package]:
        """Fetch tracking information for a package"""
        pass
    
    @abstractmethod
    def parse_status(self, raw_status: str) -> PackageStatus:
        """Convert carrier-specific status to standardized status"""
        pass
    
    def validate_tracking_number(self, tracking_number: str) -> bool:
        """Validate if tracking number matches carrier patterns"""
        import re
        cleaned = tracking_number.upper().replace(" ", "").replace("-", "")
        for pattern in self.tracking_patterns:
            if re.match(pattern, cleaned):
                return True
        return False
    
    def generate_tracking_url(self, tracking_number: str) -> str:
        """Generate direct URL to carrier's tracking page"""
        return self.tracking_url_template.format(tracking_number=tracking_number)
    
    def normalize_tracking_number(self, tracking_number: str) -> str:
        """Clean and normalize tracking number"""
        return tracking_number.upper().replace(" ", "").replace("-", "")
