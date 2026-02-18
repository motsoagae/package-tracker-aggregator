from pydantic import BaseModel, Field
from typing import Optional, List, Literal
from datetime import datetime
from enum import Enum

class CarrierType(str, Enum):
    USPS = "usps"
    UPS = "ups"
    FEDEX = "fedex"
    DHL = "dhl"
    AMAZON = "amazon"
    ONTRAC = "ontrac"
    LASERSHIP = "lasership"
    UNKNOWN = "unknown"

class PackageStatus(str, Enum):
    PRE_TRANSIT = "pre_transit"
    IN_TRANSIT = "in_transit"
    OUT_FOR_DELIVERY = "out_for_delivery"
    DELIVERED = "delivered"
    EXCEPTION = "exception"
    RETURNED = "returned"
    UNKNOWN = "unknown"

class TrackingEvent(BaseModel):
    timestamp: datetime
    status: str
    location: Optional[str] = None
    description: str
    raw_status: Optional[str] = None

class Package(BaseModel):
    id: str = Field(..., description="Unique package ID")
    tracking_number: str
    carrier: CarrierType
    carrier_detected: bool = Field(default=False, description="Was carrier auto-detected?")
    nickname: Optional[str] = None
    status: PackageStatus
    estimated_delivery: Optional[datetime] = None
    events: List[TrackingEvent] = []
    last_updated: datetime
    created_at: datetime
    archived: bool = False
    delivered_at: Optional[datetime] = None
    source: Optional[str] = None  # Where was it added from

class PackageCreate(BaseModel):
    tracking_number: str = Field(..., min_length=5, max_length=50)
    carrier: Optional[CarrierType] = None
    nickname: Optional[str] = Field(None, max_length=100)

class PackageUpdate(BaseModel):
    nickname: Optional[str] = None
    archived: Optional[bool] = None

class TrackingResponse(BaseModel):
    success: bool
    package: Optional[Package] = None
    error: Optional[str] = None
    cached: bool = False

class StatsResponse(BaseModel):
    total_packages: int
    active_packages: int
    delivered_packages: int
    in_transit_packages: int
    carrier_breakdown: dict
    recent_deliveries: List[Package]
