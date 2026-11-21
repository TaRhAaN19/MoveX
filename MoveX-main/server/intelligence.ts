import { db } from './db.ts';
import { haversineKm } from './geo.ts';
import { calculateModeQuote, type DeliveryModel, type TransportMode, type UrgencyLevel } from './pricing.ts';

export type GuardClassification = 'PERMITTED' | 'RESTRICTED' | 'PROHIBITED';

export interface GuardEvaluation {
  classification: GuardClassification;
  riskLevel: 'LOW' | 'MEDIUM' | 'HIGH' | 'CRITICAL';
  reasons: string[];
  allowBooking: boolean;
  requiresAdminReview: boolean;
}

const PROHIBITED_KEYWORDS = [
  'explosive', 'gunpowder', 'firework', 'ammunition', 'firearm', 'gun', 'pistol', 'knife', 'weapon',
  'narcotic', 'cocaine', 'heroin', 'cannabis', 'marijuana', 'acid', 'cyanide', 'flammable',
  'petrol', 'gasoline', 'kerosene', 'radioactive', 'corrosive', 'biohazard', 'illegal', 'counterfeit'
];

const RESTRICTED_KEYWORDS = [
  'battery', 'lithium', 'powerbank', 'perfume', 'aerosol', 'alcohol', 'liquid', 'chemical',
  'medicine', 'pharma', 'prescription', 'jewelry', 'gold', 'silver', 'cash', 'passport',
  'drone', 'laptop', 'camera', 'glass', 'fragile', 'perishable'
];

export function evaluateMovexGuard(params: {
  userId: number;
  declaredContents: string;
  declaredValue: number;
  weightKg: number;
  transportMode: TransportMode;
  isFragile: boolean;
  policyAccepted: boolean;
}): GuardEvaluation {
  const contentsLower = (params.declaredContents || '').toLowerCase();
  const reasons: string[] = [];

  if (!params.policyAccepted) {
    return {
      classification: 'PROHIBITED',
      riskLevel: 'HIGH',
      reasons: ['Sender must accept MOVEX declaration and safety terms before proceeding.'],
      allowBooking: false,
      requiresAdminReview: false
    };
  }

  // Check prohibited keywords
  const matchedProhibited = PROHIBITED_KEYWORDS.filter((kw) => contentsLower.includes(kw));
  if (matchedProhibited.length > 0) {
    return {
      classification: 'PROHIBITED',
      riskLevel: 'CRITICAL',
      reasons: [
        `Declared item matches prohibited goods policy (${matchedProhibited.join(', ')}).`,
        'Prohibited items cannot be transported via Community Relay or Premium Express.',
        'Note: Assessment is based solely on sender declaration; MOVEX never claims to inspect unopened parcels.'
      ],
      allowBooking: false,
      requiresAdminReview: true
    };
  }

  let classification: GuardClassification = 'PERMITTED';
  let riskLevel: 'LOW' | 'MEDIUM' | 'HIGH' | 'CRITICAL' = 'LOW';

  // Check restricted keywords
  const matchedRestricted = RESTRICTED_KEYWORDS.filter((kw) => contentsLower.includes(kw));
  if (matchedRestricted.length > 0) {
    classification = 'RESTRICTED';
    riskLevel = 'MEDIUM';
    reasons.push(`Declared contents include conditionally restricted keywords (${matchedRestricted.join(', ')}).`);
  }

  // Air transport lithium/liquid rules
  if (params.transportMode === 'flight' && (contentsLower.includes('battery') || contentsLower.includes('lithium') || contentsLower.includes('liquid') || contentsLower.includes('perfume'))) {
    classification = 'RESTRICTED';
    riskLevel = 'HIGH';
    reasons.push('Airline / DGCA regulations require additional checks for batteries or liquids in air transit.');
  }

  // High declared value threshold
  if (params.declaredValue > 25000) {
    classification = 'RESTRICTED';
    riskLevel = riskLevel === 'LOW' ? 'MEDIUM' : 'HIGH';
    reasons.push(`Declared value (₹${params.declaredValue.toLocaleString('en-IN')}) exceeds standard ₹25,000 limit and requires verification.`);
  }

  // Unusual weight-to-value ratio
  if (params.declaredValue > 15000 && params.weightKg < 0.2) {
    classification = 'RESTRICTED';
    riskLevel = 'HIGH';
    reasons.push('High declared value on an ultra-light parcel (<200 g) flagged for manual confirmation.');
  }

  // Check user's recent booking velocity & prior rejections
  const recentCountRow = db.prepare(`
    SELECT COUNT(*) as cnt FROM bookings
    WHERE sender_id = ? AND created_at >= datetime('now', '-1 hour')
  `).get(params.userId) as { cnt: number };

  const rejectedCountRow = db.prepare(`
    SELECT COUNT(*) as cnt FROM bookings
    WHERE sender_id = ? AND status IN ('REJECTED', 'DISPUTED')
  `).get(params.userId) as { cnt: number };

  if (recentCountRow && recentCountRow.cnt >= 5) {
    classification = 'RESTRICTED';
    riskLevel = 'HIGH';
    reasons.push(`Unusual booking frequency (${recentCountRow.cnt} bookings in the past hour) triggered velocity review.`);
  }

  if (rejectedCountRow && rejectedCountRow.cnt >= 2) {
    classification = 'RESTRICTED';
    riskLevel = 'HIGH';
    reasons.push(`Account has ${rejectedCountRow.cnt} prior rejected or disputed parcels requiring manual review.`);
  }

  if (params.isFragile && reasons.length === 0) {
    reasons.push('Marked as fragile — partner notified to handle carefully in padded packaging.');
  }

  if (reasons.length === 0) {
    reasons.push('Ordinary permitted parcel cleared against sender declaration and transport operator rules.');
  }

  reasons.push('Assessment is based strictly on sender declaration and platform safety rules.');

  return {
    classification,
    riskLevel,
    reasons,
    allowBooking: true,
    requiresAdminReview: classification === 'RESTRICTED'
  };
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

export function suggestSmartMeetingPoints(params: {
  pickupLocation: string;
  pickupLat: number;
  pickupLng: number;
  destinationLocation: string;
  destLat: number;
  destLng: number;
  deliveryModel: DeliveryModel;
}): { pickupSuggestions: MeetingPointSuggestion[]; dropoffSuggestions: MeetingPointSuggestion[] } {
  const pickupCity = params.pickupLocation.split(',')[0].trim();
  const destCity = params.destinationLocation.split(',')[0].trim();

  if (params.deliveryModel === 'premium_express') {
    return {
      pickupSuggestions: [
        {
          id: 'pe-pickup-doorstep',
          type: 'pickup',
          name: `Doorstep Pickup — ${pickupCity}`,
          landmarkType: 'Exact Address',
          lat: params.pickupLat,
          lng: params.pickupLng,
          reason: 'Premium Express provides dedicated doorstep collection.'
        }
      ],
      dropoffSuggestions: [
        {
          id: 'pe-drop-doorstep',
          type: 'dropoff',
          name: `Doorstep Delivery — ${destCity}`,
          landmarkType: 'Exact Address',
          lat: params.destLat,
          lng: params.destLng,
          reason: 'Premium Express delivers directly to recipient doorstep.'
        }
      ]
    };
  }

  return {
    pickupSuggestions: [
      {
        id: 'cr-pickup-1',
        type: 'pickup',
        name: `${pickupCity} Central Bus Terminus`,
        landmarkType: 'Public Transit Hub',
        lat: params.pickupLat + 0.0032,
        lng: params.pickupLng + 0.0028,
        reason: 'High footfall, well-lit transit stand with easy short-stop parking.'
      },
      {
        id: 'cr-pickup-2',
        type: 'pickup',
        name: `${pickupCity} Main Market Circle`,
        landmarkType: 'Civic Landmark',
        lat: params.pickupLat - 0.0024,
        lng: params.pickupLng + 0.0035,
        reason: 'Central commercial intersection convenient for quick relay handoff.'
      },
      {
        id: 'cr-pickup-3',
        type: 'pickup',
        name: `${pickupCity} Highway Junction Fuel Station`,
        landmarkType: 'Highway Corridor',
        lat: params.pickupLat + 0.0041,
        lng: params.pickupLng - 0.0021,
        reason: 'Zero-detour junction directly on intercity outbound route.'
      }
    ],
    dropoffSuggestions: [
      {
        id: 'cr-drop-1',
        type: 'dropoff',
        name: `${destCity} KTC / City Bus Stand`,
        landmarkType: 'Public Transit Hub',
        lat: params.destLat + 0.0028,
        lng: params.destLng - 0.0024,
        reason: 'Central transit terminal accessible by bus, bike, and car.'
      },
      {
        id: 'cr-drop-2',
        type: 'dropoff',
        name: `${destCity} Municipal Square`,
        landmarkType: 'Civic Landmark',
        lat: params.destLat - 0.0021,
        lng: params.destLng + 0.0029,
        reason: 'Safe daytime public landmark near recipient neighbourhood.'
      },
      {
        id: 'cr-drop-3',
        type: 'dropoff',
        name: `${destCity} Railway / Ring Road Gate`,
        landmarkType: 'Transit Junction',
        lat: params.destLat + 0.0035,
        lng: params.destLng + 0.0031,
        reason: 'Convenient arrival point with direct road access.'
      }
    ]
  };
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

export function findMatchingPartners(params: {
  pickupLat: number;
  pickupLng: number;
  destLat: number;
  destLng: number;
  distanceKm: number;
  deliveryModel: DeliveryModel;
  transportMode: TransportMode;
  weightKg: number;
  lengthCm: number;
  widthCm: number;
  heightCm: number;
  urgency: UrgencyLevel;
}): PartnerMatchResult[] {
  const quote = calculateModeQuote({
    mode: params.transportMode,
    deliveryModel: params.deliveryModel,
    urgency: params.urgency,
    distanceKm: params.distanceKm,
    weightKg: params.weightKg,
    lengthCm: params.lengthCm,
    widthCm: params.widthCm,
    heightCm: params.heightCm
  });

  if (params.deliveryModel === 'premium_express') {
    // Match dedicated verified partners supporting the mode & weight
    const partners = db.prepare(`
      SELECT u.id as partner_id, u.name, u.mobile, pp.primary_mode, pp.vehicle_number,
             pp.max_weight_kg, pp.reliability_score, pp.completed_deliveries, pp.on_time_deliveries
      FROM users u
      JOIN partner_profiles pp ON pp.user_id = u.id
      WHERE u.verification_status = 'VERIFIED'
        AND (u.role = 'partner' OR u.can_deliver = 1)
        AND pp.is_available = 1
        AND pp.max_weight_kg >= ?
      ORDER BY pp.reliability_score DESC
    `).all(Math.min(params.weightKg, 15)) as Array<{
      partner_id: number;
      name: string;
      mobile: string;
      primary_mode: TransportMode;
      vehicle_number: string;
      max_weight_kg: number;
      reliability_score: number;
      completed_deliveries: number;
      on_time_deliveries: number;
    }>;

    return partners.map((p, idx) => {
      const modeBonus = p.primary_mode === params.transportMode ? 12 : 4;
      const score = Math.min(99, Math.round(80 + modeBonus - idx * 2));
      return {
        journeyId: null,
        partnerId: p.partner_id,
        partnerName: p.name,
        partnerMobile: p.mobile,
        transportMode: params.transportMode,
        vehicleNumber: p.vehicle_number || 'Dedicated Fleet',
        journeyOrigin: 'Doorstep Express Pickup',
        journeyDest: 'Direct Doorstep Delivery',
        departureTime: 'Immediate Dispatch',
        expectedArrival: quote.etaLabel,
        travelDate: new Date().toISOString().slice(0, 10),
        availableCapacityCount: 1,
        maxWeightKg: Math.max(p.max_weight_kg, params.weightKg),
        compatibilityScore: score,
        reliabilityScore: Math.round(p.reliability_score * 10) / 10,
        etaMinutes: quote.etaMinutes,
        etaLabel: quote.etaLabel,
        expectedCharge: quote.totalPrice,
        matchReasons: [
          `Dedicated Premium Express dispatch via ${quote.displayName}`,
          `${p.completed_deliveries} completed deliveries (${p.on_time_deliveries} on-time)`,
          `Doorstep collection and OTP-verified recipient handover`
        ],
        preferredMeetingPoints: ['Doorstep Pickup', 'Direct Doorstep Delivery'],
        isDedicatedExpress: true
      };
    });
  }

  // Community Relay MUST match ONLY existing published journeys (never create dedicated journeys!)
  const journeys = db.prepare(`
    SELECT j.*, u.name as partner_name, u.mobile as partner_mobile,
           pp.vehicle_number, pp.reliability_score, pp.completed_deliveries, pp.on_time_deliveries
    FROM journeys j
    JOIN users u ON u.id = j.partner_id
    LEFT JOIN partner_profiles pp ON pp.user_id = u.id
    WHERE j.status = 'ACTIVE'
      AND j.declaration_confirmed = 1
      AND j.available_capacity_count >= 1
      AND j.max_weight_kg >= ?
      AND u.verification_status = 'VERIFIED'
  `).all(params.weightKg) as Array<{
    id: number;
    partner_id: number;
    partner_name: string;
    partner_mobile: string;
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
    vehicle_number: string;
    reliability_score: number;
    completed_deliveries: number;
    on_time_deliveries: number;
  }>;

  const scored: PartnerMatchResult[] = [];

  for (const j of journeys) {
    const originDevKm = haversineKm(params.pickupLat, params.pickupLng, j.origin_lat, j.origin_lng);
    const destDevKm = haversineKm(params.destLat, params.destLng, j.dest_lat, j.dest_lng);
    const totalDeviation = originDevKm + destDevKm;

    // Score components out of 100
    const proximityScore = Math.max(0, 55 - totalDeviation * 0.45);
    const modeScore = j.transport_mode === params.transportMode ? 22 : 10;
    const capacityScore = Math.min(10, ((j.max_weight_kg - params.weightKg) / Math.max(1, j.max_weight_kg)) * 10 + 4);
    const relScore = ((j.reliability_score || 90) / 100) * 13;

    const compatibilityScore = Math.max(15, Math.min(99, Math.round(proximityScore + modeScore + capacityScore + relScore)));

    // Keep reasonable corridor matches (or intercity matches)
    if (totalDeviation > 140 && j.transport_mode !== 'train' && j.transport_mode !== 'flight') {
      continue;
    }

    const journeyQuote = calculateModeQuote({
      mode: j.transport_mode,
      deliveryModel: 'community_relay',
      urgency: params.urgency,
      distanceKm: params.distanceKm,
      weightKg: params.weightKg,
      lengthCm: params.lengthCm,
      widthCm: params.widthCm,
      heightCm: params.heightCm
    });

    const reasons: string[] = [
      `Existing ${j.transport_mode.toUpperCase()} journey: ${j.origin_name} → ${j.dest_name}`,
      `Pickup corridor deviation: ${originDevKm.toFixed(1)} km · Drop deviation: ${destDevKm.toFixed(1)} km`,
      `Capacity headroom: ${j.available_capacity_count} slot(s), up to ${j.max_weight_kg} kg`,
      `Partner reliability: ${(j.reliability_score || 90).toFixed(1)}/100 (${j.completed_deliveries || 0} completed trips)`
    ];

    scored.push({
      journeyId: j.id,
      partnerId: j.partner_id,
      partnerName: j.partner_name,
      partnerMobile: j.partner_mobile,
      transportMode: j.transport_mode,
      vehicleNumber: j.vehicle_number || 'Verified Traveller',
      journeyOrigin: j.origin_name,
      journeyDest: j.dest_name,
      departureTime: j.departure_time,
      expectedArrival: j.expected_arrival,
      travelDate: j.travel_date,
      availableCapacityCount: j.available_capacity_count,
      maxWeightKg: j.max_weight_kg,
      compatibilityScore,
      reliabilityScore: Math.round((j.reliability_score || 90) * 10) / 10,
      etaMinutes: journeyQuote.etaMinutes,
      etaLabel: journeyQuote.etaLabel,
      expectedCharge: journeyQuote.totalPrice,
      matchReasons: reasons,
      preferredMeetingPoints: j.preferred_meeting_points
        ? j.preferred_meeting_points.split(',').map((s) => s.trim()).filter(Boolean)
        : [],
      isDedicatedExpress: false
    });
  }

  return scored.sort((a, b) => b.compatibilityScore - a.compatibilityScore);
}

export function recalculatePartnerReliability(partnerUserId: number): number {
  const profile = db.prepare('SELECT * FROM partner_profiles WHERE user_id = ?').get(partnerUserId) as {
    completed_deliveries: number;
    on_time_deliveries: number;
    cancellations: number;
    verified_complaints: number;
    handover_compliance_rate: number;
  } | undefined;
  if (!profile) return 90;

  const total = Math.max(1, profile.completed_deliveries + profile.cancellations);
  const completionRatio = profile.completed_deliveries / total;
  const onTimeRatio = profile.completed_deliveries > 0 ? profile.on_time_deliveries / profile.completed_deliveries : 0.95;
  const complaintPenalty = profile.verified_complaints * 4.5;
  const handoverFactor = (profile.handover_compliance_rate || 98) / 100;

  const score = Math.max(
    45,
    Math.min(100, Math.round((completionRatio * 40 + onTimeRatio * 35 + handoverFactor * 25 - complaintPenalty) * 10) / 10)
  );

  db.prepare("UPDATE partner_profiles SET reliability_score = ?, updated_at = datetime('now') WHERE user_id = ?").run(score, partnerUserId);
  return score;
}
