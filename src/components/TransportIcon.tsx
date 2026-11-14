import { Bike, Bus, Car, Plane, Train, Truck } from 'lucide-react';
import type { TransportMode } from '../types/movex';

export function TransportModeIcon({ mode, className = 'h-5 w-5' }: { mode: TransportMode | string; className?: string }) {
  switch (mode) {
    case 'bike':
      return <Bike className={className} />;
    case 'car':
      return <Car className={className} />;
    case 'bus':
      return <Bus className={className} />;
    case 'train':
      return <Train className={className} />;
    case 'flight':
      return <Plane className={className} />;
    case 'freight':
      return <Truck className={className} />;
    default:
      return <Bike className={className} />;
  }
}

export function formatTransportModeLabel(mode: TransportMode | string): string {
  switch (mode) {
    case 'bike':
      return 'Bike';
    case 'car':
      return 'Car';
    case 'bus':
      return 'Bus';
    case 'train':
      return 'Train';
    case 'flight':
      return 'Flight';
    case 'freight':
      return 'Commercial Freight';
    default:
      return mode;
  }
}

export function formatStatusLabel(status: string): string {
  return status.replace(/_/g, ' ');
}

export function getStatusToneClass(status: string): string {
  switch (status) {
    case 'DELIVERED':
    case 'APPROVED':
    case 'COMPLETED':
    case 'VERIFIED':
    case 'PERMITTED':
      return 'text-emerald-700';
    case 'IN_TRANSIT':
    case 'PICKED_UP':
    case 'PARTNER_ASSIGNED':
    case 'MATCHING':
      return 'text-[#101114]';
    case 'DECLARED':
    case 'HANDOVER_PENDING':
    case 'ON_HOLD':
    case 'RESTRICTED':
    case 'PENDING':
      return 'text-amber-700';
    case 'REJECTED':
    case 'DISPUTED':
    case 'CANCELLED':
    case 'PROHIBITED':
    case 'SUSPENDED':
      return 'text-red-700';
    default:
      return 'text-[#777777]';
  }
}
