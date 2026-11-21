import { db } from './db.ts';

export type TransportMode = 'bike' | 'car' | 'bus' | 'train' | 'flight' | 'freight';
export type DeliveryModel = 'community_relay' | 'premium_express';
export type UrgencyLevel = 'standard' | 'express' | 'priority';

export interface PricingInput {
  mode: TransportMode;
  deliveryModel: DeliveryModel;
  urgency: UrgencyLevel;
  distanceKm: number;
  weightKg: number;
  lengthCm: number;
  widthCm: number;
  heightCm: number;
}

export interface PricingConfigRow {
  mode: TransportMode;
  display_name: string;
  base_fare: number;
  per_km_rate: number;
  per_kg_rate: number;
  volumetric_divisor: number;
  min_eta_mins: number;
  avg_speed_kmh: number;
  max_weight_kg: number;
  max_length_cm: number;
  max_width_cm: number;
  max_height_cm: number;
  integration_status: string;
  restrictions_summary: string;
  is_active: number;
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

export const PROTOTYPE_MAX_WEIGHT_KG = 15.0;

export function getParcelCategory(weightKg: number): 'XS' | 'S' | 'M' | 'L' | 'XL' {
  if (weightKg <= 0.5) return 'XS';
  if (weightKg <= 2.0) return 'S';
  if (weightKg <= 5.0) return 'M';
  if (weightKg <= 10.0) return 'L';
  return 'XL';
}

export function formatEtaLabel(minutes: number): string {
  if (minutes < 60) return `${minutes} mins`;
  const hrs = Math.floor(minutes / 60);
  const mins = minutes % 60;
  if (mins === 0) return `${hrs} hr${hrs > 1 ? 's' : ''}`;
  return `${hrs} hr${hrs > 1 ? 's' : ''} ${mins} mins`;
}

export function getAllPricingConfigs(): PricingConfigRow[] {
  return db.prepare('SELECT * FROM pricing_configs WHERE is_active = 1 ORDER BY base_fare ASC').all() as PricingConfigRow[];
}

export function calculateModeQuote(input: PricingInput, config?: PricingConfigRow): PricingQuote {
  const cfg = config || (db.prepare('SELECT * FROM pricing_configs WHERE mode = ?').get(input.mode) as PricingConfigRow | undefined);
  if (!cfg) {
    throw new Error(`Unsupported transportation mode: ${input.mode}`);
  }

  const incompatibilityReasons: string[] = [];
  const weight = Math.max(0.1, Number(input.weightKg) || 0.5);
  const l = Math.max(1, Number(input.lengthCm) || 10);
  const w = Math.max(1, Number(input.widthCm) || 10);
  const h = Math.max(1, Number(input.heightCm) || 10);
  const dist = Math.max(1, Number(input.distanceKm) || 5);

  if (weight > PROTOTYPE_MAX_WEIGHT_KG) {
    incompatibilityReasons.push(`Exceeds prototype maximum limit of ${PROTOTYPE_MAX_WEIGHT_KG} kg.`);
  }
  if (weight > cfg.max_weight_kg) {
    incompatibilityReasons.push(`${cfg.display_name} supports up to ${cfg.max_weight_kg} kg.`);
  }
  if (l > cfg.max_length_cm || w > cfg.max_width_cm || h > cfg.max_height_cm) {
    incompatibilityReasons.push(`Dimensions exceed ${cfg.display_name} limit (${cfg.max_length_cm}×${cfg.max_width_cm}×${cfg.max_height_cm} cm).`);
  }

  // Bike is optimal for local/regional routes (< 120 km)
  if (cfg.mode === 'bike' && dist > 120) {
    incompatibilityReasons.push('Bike delivery is limited to routes under 120 km.');
  }

  // Flight is suited for long-distance corridors (> 150 km)
  if (cfg.mode === 'flight' && dist < 120) {
    incompatibilityReasons.push('Flight mode is intended for intercity corridors over 120 km.');
  }

  const baseFare = round2(cfg.base_fare);

  // Distance charge scales with mode; long distance tiers keep bus/train competitive
  let effectivePerKm = cfg.per_km_rate;
  if (cfg.mode === 'bus' && dist > 100) effectivePerKm = cfg.per_km_rate * 0.82;
  if (cfg.mode === 'train' && dist > 150) effectivePerKm = cfg.per_km_rate * 0.78;
  if (cfg.mode === 'flight' && dist > 300) effectivePerKm = cfg.per_km_rate * 0.85;
  const distanceCharge = round2(dist * effectivePerKm);

  // Gradual weight charge that increases cleanly as weight increases
  const weightCharge = round2(weight * cfg.per_kg_rate);

  // Dimension / volumetric charge
  const volumeCm3 = l * w * h;
  const volumetricKg = volumeCm3 / cfg.volumetric_divisor;
  const excessVolKg = Math.max(0, volumetricKg - weight);
  const dimensionCharge = round2(
    (volumeCm3 / 4000) * (cfg.mode === 'freight' ? 1.8 : 0.9) + excessVolKg * (cfg.mode === 'freight' ? 8 : 4)
  );

  // Delivery model charge: Community Relay uses existing journeys (₹0 surcharge), Premium Express adds dedicated partner surcharge
  let modelCharge = 0;
  if (input.deliveryModel === 'premium_express') {
    modelCharge = round2(Math.max(35, Math.min(240, 30 + dist * 0.65)));
  }

  // Urgency charge
  let urgencyCharge = 0;
  if (input.urgency === 'express') {
    urgencyCharge = round2(20 + dist * 0.15);
  } else if (input.urgency === 'priority') {
    urgencyCharge = round2(45 + dist * 0.25);
  }

  const subtotal = baseFare + distanceCharge + weightCharge + dimensionCharge + modelCharge + urgencyCharge;
  const platformFee = round2(Math.max(5, Math.min(120, subtotal * 0.06)));
  const totalPrice = round2(subtotal + platformFee);

  // Partner receives 85% of subtotal; platform retains commission + fee
  const partnerEarning = round2(subtotal * 0.85);
  const platformCommission = round2(totalPrice - partnerEarning);

  // ETA calculation: mode speed + handover/terminal buffer + model/urgency adjustment
  const travelMins = (dist / cfg.avg_speed_kmh) * 60;
  let bufferMins = cfg.min_eta_mins * 0.5;
  if (cfg.mode === 'flight') bufferMins = 75;
  if (cfg.mode === 'train') bufferMins = 45;
  if (cfg.mode === 'bus') bufferMins = 30;
  if (input.deliveryModel === 'premium_express') bufferMins *= 0.65;
  if (input.urgency === 'priority') bufferMins *= 0.75;
  else if (input.urgency === 'express') bufferMins *= 0.88;

  const etaMinutes = Math.max(18, Math.round(travelMins + bufferMins));

  return {
    mode: cfg.mode,
    displayName: cfg.display_name,
    compatible: incompatibilityReasons.length === 0,
    incompatibilityReasons,
    baseFare,
    distanceCharge,
    weightCharge,
    dimensionCharge,
    modelCharge,
    urgencyCharge,
    platformFee,
    totalPrice,
    partnerEarning,
    platformCommission,
    etaMinutes,
    etaLabel: formatEtaLabel(etaMinutes),
    integrationStatus: cfg.integration_status,
    restrictionsSummary: cfg.restrictions_summary,
    startingPrice: cfg.base_fare
  };
}

export function calculateAllModeQuotes(input: Omit<PricingInput, 'mode'>): PricingQuote[] {
  const configs = getAllPricingConfigs();
  return configs.map((cfg) => calculateModeQuote({ ...input, mode: cfg.mode }, cfg));
}

function round2(n: number): number {
  return Math.round(n * 100) / 100;
}
