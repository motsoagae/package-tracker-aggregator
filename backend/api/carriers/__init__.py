from .usps import USPSCarrier
from .ups import UPSCarrier
from .fedex import FedExCarrier
from .dhl import DHLCarrier
from .amazon import AmazonCarrier
from ..models import CarrierType

# Registry of all carriers
CARRIERS = {
    CarrierType.USPS: USPSCarrier(),
    CarrierType.UPS: UPSCarrier(),
    CarrierType.FEDEX: FedExCarrier(),
    CarrierType.DHL: DHLCarrier(),
    CarrierType.AMAZON: AmazonCarrier(),
}

def detect_carrier(tracking_number: str) -> CarrierType:
    """Auto-detect carrier from tracking number patterns"""
    for carrier_type, carrier in CARRIERS.items():
        if carrier.validate_tracking_number(tracking_number):
            return carrier_type
    return CarrierType.UNKNOWN

def get_carrier(carrier_type: CarrierType):
    """Get carrier instance by type"""
    return CARRIERS.get(carrier_type)

__all__ = ['CARRIERS', 'detect_carrier', 'get_carrier', 'USPSCarrier', 'UPSCarrier', 'FedExCarrier']
