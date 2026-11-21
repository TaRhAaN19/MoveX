export type UserRole = 'sender' | 'partner' | 'admin';
export type TransportMode = 'bike' | 'car' | 'bus' | 'train' | 'flight' | 'freight';
export type DeliveryModel = 'community_relay' | 'premium_express';
export type UrgencyLevel = 'standard' | 'express' | 'priority';

export interface User {
  id: number;
  name: string;
  email: string;
  mobile: string;
  role: UserRole;
  can_deliver: number;
  verification_status: 'VERIFIED' | 'PENDING' | 'SUSPENDED';
  rating: number;
}

export interface PartnerProfile {
  id: number;
  user_id: number;
  primary_mode: TransportMode;
  vehicle_number: string;
  license_verified: number;
  max_weight_kg: number;
  preferred_corridors: string;
  completed_deliveries: number;
  on_time_deliveries: number;
  cancellations: number;
  verified_complaints: number;
  handover_compliance_rate: number;
  reliability_score: number;
  is_available: number;
}

export interface GeoPoint {
  name: string;
  displayName: string;
  lat: number;
  lng: number;
  source: 'local_index' | 'nominatim';
}

export interface RouteResult {
  distanceKm: number;
  durationMins: number;
  coordinates: [number, number][];
  source: 'osrm' | 'haversine_fallback';
}

export interface PricingQuote {
  mode: TransportMode;
  displayName: string;
  compatible: boolean;
  incompatibilityReasons: string[];
  baseFare: number;
  distanceCharge: number;
  weightCharge: number;
  dimensionCharge: number;
  modelCharge: number;
  urgencyCharge: number;
  platformFee: number;
  totalPrice: number;
  partnerEarning: number;
  platformCommission: number;
  etaMinutes: number;
  etaLabel: string;
  integrationStatus: string;
  restrictionsSummary: string;
  startingPrice: number;
}

export interface GuardEvaluation {
  classification: 'PERMITTED' | 'RESTRICTED' | 'PROHIBITED';
  riskLevel: 'LOW' | 'MEDIUM' | 'HIGH' | 'CRITICAL';
  reasons: string[];
  allowBooking: boolean;
  requiresAdminReview: boolean;
}

export interface MeetingPointSuggestion {
  id: string;
  type: 'pickup' | 'dropoff';
  name: string;
  landmarkType: string;
  lat: number;
  lng: number;
  reason: string;
}

export interface PartnerMatchResult {
  journeyId: number | null;
  partnerId: number;
  partnerName: string;
  partnerMobile: string;
  transportMode: TransportMode;
  vehicleNumber: string;
  journeyOrigin: string;
  journeyDest: string;
  departureTime: string;
  expectedArrival: string;
  travelDate: string;
  availableCapacityCount: number;
  maxWeightKg: number;
  compatibilityScore: number;
  reliabilityScore: number;
  etaMinutes: number;
  etaLabel: string;
  expectedCharge: number;
  matchReasons: string[];
  preferredMeetingPoints: string[];
  isDedicatedExpress: boolean;
}

export interface TrackingEvent {
  id: number;
  booking_id: number;
  status: string;
  title: string;
  description: string;
  location_name: string;
  lat: number | null;
  lng: number | null;
  actor_name: string;
  is_simulated_gps: number;
  created_at: string;
}

export interface Booking {
  id: number;
  parcel_code: string;
  sender_id: number;
  sender_name?: string;
  sender_mobile?: string;
  partner_id: number | null;
  partner_name?: string;
  partner_mobile?: string;
  partner_vehicle?: string;
  partner_reliability?: number;
  journey_id: number | null;
  delivery_model: DeliveryModel;
  transport_mode: TransportMode;
  urgency: UrgencyLevel;
  pickup_location: string;
  pickup_lat: number;
  pickup_lng: number;
  destination_location: string;
  destination_lat: number;
  destination_lng: number;
  distance_km: number;
  eta_minutes: number;
  eta_label: string;
  parcel_category: string;
  weight_kg: number;
  length_cm: number;
  width_cm: number;
  height_cm: number;
  declared_contents: string;
  declared_value: number;
  is_fragile: number;
  packaging_type: string;
  parcel_photo_url: string;
  guard_classification: 'PERMITTED' | 'RESTRICTED' | 'PROHIBITED';
  guard_notes: string;
  pickup_meeting_point: string;
  dropoff_meeting_point: string;
  meeting_agreed_by_sender: number;
  meeting_agreed_by_partner: number;
  base_fare: number;
  distance_charge: number;
  weight_charge: number;
  dimension_charge: number;
  model_charge: number;
  urgency_charge: number;
  platform_fee: number;
  total_price: number;
  partner_earning: number;
  platform_commission: number;
  status: string;
  pickup_otp: string;
  handover_otp: string;
  delivery_otp: string;
  current_lat: number | null;
  current_lng: number | null;
  route_deviation_alert: number;
  created_at: string;
  updated_at: string;
  trackingEvents?: TrackingEvent[];
  payment?: Payment | null;
  disputes?: Dispute[];
  securityAlerts?: SecurityAlert[];
}

export interface Journey {
  id: number;
  partner_id: number;
  origin_name: string;
  origin_lat: number;
  origin_lng: number;
  dest_name: string;
  dest_lat: number;
  dest_lng: number;
  travel_date: string;
  departure_time: string;
  expected_arrival: string;
  transport_mode: TransportMode;
  available_capacity_count: number;
  max_weight_kg: number;
  preferred_meeting_points: string;
  is_recurring: number;
  recurrence_rule: string;
  status: 'ACTIVE' | 'PAUSED' | 'COMPLETED' | 'CANCELLED';
  declaration_confirmed: number;
  created_at: string;
}

export interface Payment {
  id: number;
  booking_id: number;
  parcel_code?: string;
  sender_name?: string;
  partner_name?: string;
  pickup_location?: string;
  destination_location?: string;
  transport_mode?: string;
  booking_status?: string;
  amount: number;
  platform_commission: number;
  partner_earning: number;
  method: string;
  transaction_ref: string;
  status: 'PENDING' | 'COMPLETED' | 'ON_HOLD' | 'REFUNDED' | 'PARTIAL_REFUND';
  is_simulated: number;
  created_at: string;
}

export interface Dispute {
  id: number;
  booking_id: number;
  parcel_code?: string;
  total_price?: number;
  raised_by_id: number;
  raised_by_name?: string;
  reason: string;
  description: string;
  status: 'OPEN' | 'UNDER_REVIEW' | 'RESOLVED_REFUND' | 'RESOLVED_RELEASE';
  resolution_note: string;
  created_at: string;
}

export interface SecurityAlert {
  id: number;
  booking_id: number;
  parcel_code?: string;
  declared_contents?: string;
  declared_value?: number;
  weight_kg?: number;
  transport_mode?: string;
  pickup_location?: string;
  destination_location?: string;
  booking_status?: string;
  sender_name?: string;
  sender_email?: string;
  user_id: number;
  risk_level: 'LOW' | 'MEDIUM' | 'HIGH' | 'CRITICAL';
  classification: string;
  reasons_json: string;
  status: 'OPEN' | 'APPROVED' | 'REJECTED' | 'INFO_REQUESTED' | 'ESCALATED';
  admin_decision_note: string;
  created_at: string;
}
