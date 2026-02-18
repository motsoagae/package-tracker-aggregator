export type CarrierType = 'usps' | 'ups' | 'fedex' | 'dhl' | 'amazon' | 'ontrac' | 'lasership' | 'unknown';

export type PackageStatus = 
  | 'pre_transit' 
  | 'in_transit' 
  | 'out_for_delivery' 
  | 'delivered' 
  | 'exception' 
  | 'returned' 
  | 'unknown';

export interface TrackingEvent {
  timestamp: string;
  status: string;
  location?: string;
  description: string;
  raw_status?: string;
}

export interface Package {
  id: string;
  tracking_number: string;
  carrier: CarrierType;
  carrier_detected: boolean;
  nickname?: string;
  status: PackageStatus;
  estimated_delivery?: string;
  events: TrackingEvent[];
  last_updated: string;
  created_at: string;
  archived: boolean;
  delivered_at?: string;
  source?: string;
}

export interface TrackingResponse {
  success: boolean;
  package?: Package;
  error?: string;
  cached: boolean;
}

export const CARRIER_COLORS: Record<CarrierType, string> = {
  usps: 'bg-blue-600',
  ups: 'bg-amber-700',
  fedex: 'bg-purple-600',
  dhl: 'bg-yellow-500',
  amazon: 'bg-orange-500',
  ontrac: 'bg-green-600',
  lasership: 'bg-red-600',
  unknown: 'bg-gray-500'
};

export const CARRIER_NAMES: Record<CarrierType, string> = {
  usps: 'USPS',
  ups: 'UPS',
  fedex: 'FedEx',
  dhl: 'DHL',
  amazon: 'Amazon Logistics',
  ontrac: 'OnTrac',
  lasership: 'LaserShip',
  unknown: 'Unknown'
};

export const STATUS_COLORS: Record<PackageStatus, { bg: string; text: string; icon: string }> = {
  pre_transit: { bg: 'bg-gray-100', text: 'text-gray-600', icon: 'package' },
  in_transit: { bg: 'bg-blue-100', text: 'text-blue-600', icon: 'truck' },
  out_for_delivery: { bg: 'bg-amber-100', text: 'text-amber-600', icon: 'map-pin' },
  delivered: { bg: 'bg-green-100', text: 'text-green-600', icon: 'check-circle' },
  exception: { bg: 'bg-red-100', text: 'text-red-600', icon: 'alert-circle' },
  returned: { bg: 'bg-purple-100', text: 'text-purple-600', icon: 'rotate-ccw' },
  unknown: { bg: 'bg-gray-100', text: 'text-gray-600', icon: 'help-circle' }
};
