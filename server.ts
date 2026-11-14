import express from 'express';
import path from 'path';
import fs from 'fs';
import bcrypt from 'bcryptjs';
import multer from 'multer';
import { db, initDatabase } from './server/db.ts';
import {
  optionalAuth,
  requireAuth,
  requireRole,
  signToken,
  validatePasswordStrength,
  type AuthedRequest,
  type AuthUser
} from './server/auth.ts';
import { calculateRoute, geocodeSingle, reverseGeocode, searchLocations, haversineKm } from './server/geo.ts';
import {
  calculateAllModeQuotes,
  calculateModeQuote,
  getAllPricingConfigs,
  getParcelCategory,
  PROTOTYPE_MAX_WEIGHT_KG,
  type DeliveryModel,
  type TransportMode,
  type UrgencyLevel
} from './server/pricing.ts';
import {
  evaluateMovexGuard,
  findMatchingPartners,
  recalculatePartnerReliability,
  suggestSmartMeetingPoints
} from './server/intelligence.ts';

initDatabase();

const app = express();
const PORT = Number(process.env.PORT) || 3000;

const uploadDir = path.resolve(process.cwd(), 'uploads');
if (!fs.existsSync(uploadDir)) {
  fs.mkdirSync(uploadDir, { recursive: true });
}

const storage = multer.diskStorage({
  destination: (_req, _file, cb) => cb(null, uploadDir),
  filename: (_req, file, cb) => {
    const ext = path.extname(file.originalname) || '.jpg';
    cb(null, `parcel_${Date.now()}_${Math.random().toString(36).slice(2, 8)}${ext}`);
  }
});
const upload = multer({ storage, limits: { fileSize: 5 * 1024 * 1024 } });

app.use(express.json({ limit: '10mb' }));
app.use('/uploads', express.static(uploadDir));

// Health check
app.get('/api/health', (_req, res) => {
  res.json({ ok: true, service: 'movex-api', timestamp: new Date().toISOString() });
});

// ========================
// AUTH & PROFILE ROUTES
// ========================
app.post('/api/auth/register', (req, res) => {
  const { name, email, mobile, password, role, primaryMode, vehicleNumber } = req.body as {
    name?: string;
    email?: string;
    mobile?: string;
    password?: string;
    role?: 'sender' | 'partner';
    primaryMode?: TransportMode;
    vehicleNumber?: string;
  };

  if (!name?.trim() || !email?.trim() || !mobile?.trim() || !password) {
    res.status(400).json({ error: 'Name, email, mobile number, and password are required.' });
    return;
  }

  const pwError = validatePasswordStrength(password);
  if (pwError) {
    res.status(400).json({ error: pwError });
    return;
  }

  const normalizedEmail = email.trim().toLowerCase();
  const existing = db.prepare('SELECT id FROM users WHERE email = ?').get(normalizedEmail);
  if (existing) {
    res.status(409).json({ error: 'An account with this email already exists.' });
    return;
  }

  const assignedRole: 'sender' | 'partner' = role === 'partner' ? 'partner' : 'sender';
  const canDeliver = assignedRole === 'partner' ? 1 : 0;
  const hash = bcrypt.hashSync(password, 10);

  const info = db.prepare(`
    INSERT INTO users (name, email, mobile, password_hash, role, can_deliver, verification_status, rating)
    VALUES (?, ?, ?, ?, ?, ?, 'VERIFIED', 4.8)
  `).run(name.trim(), normalizedEmail, mobile.trim(), hash, assignedRole, canDeliver);

  const userId = Number(info.lastInsertRowid);

  if (assignedRole === 'partner') {
    db.prepare(`
      INSERT INTO partner_profiles (user_id, primary_mode, vehicle_number, license_verified, max_weight_kg, reliability_score)
      VALUES (?, ?, ?, 1, ?, 92.0)
    `).run(userId, primaryMode || 'bike', vehicleNumber || 'GA-07-DEMO', primaryMode === 'bike' ? 5.0 : 15.0);
  }

  const user = db.prepare(
    'SELECT id, name, email, mobile, role, can_deliver, verification_status, rating FROM users WHERE id = ?'
  ).get(userId) as AuthUser;

  const partnerProfile = db.prepare('SELECT * FROM partner_profiles WHERE user_id = ?').get(userId);
  const token = signToken(user);

  res.status(201).json({ token, user, partnerProfile });
});

app.post('/api/auth/login', (req, res) => {
  const { email, password } = req.body as { email?: string; password?: string };
  if (!email?.trim() || !password) {
    res.status(400).json({ error: 'Email and password are required.' });
    return;
  }

  const row = db.prepare('SELECT * FROM users WHERE email = ?').get(email.trim().toLowerCase()) as
    | (AuthUser & { password_hash: string })
    | undefined;

  if (!row || !bcrypt.compareSync(password, row.password_hash)) {
    res.status(401).json({ error: 'Invalid email or password.' });
    return;
  }

  if (row.verification_status === 'SUSPENDED') {
    res.status(403).json({ error: 'This account has been suspended by an administrator.' });
    return;
  }

  const user: AuthUser = {
    id: row.id,
    name: row.name,
    email: row.email,
    mobile: row.mobile,
    role: row.role,
    can_deliver: row.can_deliver,
    verification_status: row.verification_status,
    rating: row.rating
  };
  const partnerProfile = db.prepare('SELECT * FROM partner_profiles WHERE user_id = ?').get(user.id);
  const token = signToken(user);

  res.json({ token, user, partnerProfile });
});

app.get('/api/auth/me', requireAuth, (req: AuthedRequest, res) => {
  const partnerProfile = db.prepare('SELECT * FROM partner_profiles WHERE user_id = ?').get(req.user!.id);
  const unreadCount = (
    db.prepare('SELECT COUNT(*) as cnt FROM notifications WHERE user_id = ? AND is_read = 0').get(req.user!.id) as { cnt: number }
  ).cnt;
  res.json({ user: req.user, partnerProfile, unreadNotifications: unreadCount });
});

app.put('/api/auth/profile', requireAuth, (req: AuthedRequest, res) => {
  const { name, mobile, primaryMode, vehicleNumber, preferredCorridors, isAvailable, maxWeightKg } = req.body as {
    name?: string;
    mobile?: string;
    primaryMode?: TransportMode;
    vehicleNumber?: string;
    preferredCorridors?: string;
    isAvailable?: boolean;
    maxWeightKg?: number;
  };

  if (name?.trim() || mobile?.trim()) {
    db.prepare('UPDATE users SET name = COALESCE(?, name), mobile = COALESCE(?, mobile) WHERE id = ?').run(
      name?.trim() || null,
      mobile?.trim() || null,
      req.user!.id
    );
  }

  const existingPartner = db.prepare('SELECT id FROM partner_profiles WHERE user_id = ?').get(req.user!.id);
  if (existingPartner) {
    db.prepare(`
      UPDATE partner_profiles
      SET primary_mode = COALESCE(?, primary_mode),
          vehicle_number = COALESCE(?, vehicle_number),
          preferred_corridors = COALESCE(?, preferred_corridors),
          is_available = COALESCE(?, is_available),
          max_weight_kg = COALESCE(?, max_weight_kg),
          updated_at = datetime('now')
      WHERE user_id = ?
    `).run(
      primaryMode || null,
      vehicleNumber !== undefined ? vehicleNumber : null,
      preferredCorridors !== undefined ? preferredCorridors : null,
      isAvailable !== undefined ? (isAvailable ? 1 : 0) : null,
      maxWeightKg !== undefined ? Math.min(15, Math.max(1, maxWeightKg)) : null,
      req.user!.id
    );
  }

  const user = db.prepare(
    'SELECT id, name, email, mobile, role, can_deliver, verification_status, rating FROM users WHERE id = ?'
  ).get(req.user!.id) as AuthUser;
  const partnerProfile = db.prepare('SELECT * FROM partner_profiles WHERE user_id = ?').get(req.user!.id);
  res.json({ user, partnerProfile });
});

app.post('/api/auth/switch-activity', requireAuth, (req: AuthedRequest, res) => {
  const { targetActivity, primaryMode, vehicleNumber } = req.body as {
    targetActivity?: 'sender' | 'partner';
    primaryMode?: TransportMode;
    vehicleNumber?: string;
  };

  if (req.user!.role === 'admin') {
    res.status(400).json({ error: 'Administrator accounts operate in Admin Console only.' });
    return;
  }

  if (targetActivity === 'partner') {
    // Enable delivery capability if user is verified
    if (req.user!.verification_status !== 'VERIFIED') {
      res.status(403).json({ error: 'Account verification required before delivering parcels.' });
      return;
    }

    db.prepare('UPDATE users SET can_deliver = 1 WHERE id = ?').run(req.user!.id);
    const hasProfile = db.prepare('SELECT id FROM partner_profiles WHERE user_id = ?').get(req.user!.id);
    if (!hasProfile) {
      db.prepare(`
        INSERT INTO partner_profiles (user_id, primary_mode, vehicle_number, license_verified, max_weight_kg, reliability_score)
        VALUES (?, ?, ?, 1, ?, 92.0)
      `).run(req.user!.id, primaryMode || 'bike', vehicleNumber || 'GA-07-RELAY', primaryMode === 'bike' ? 5.0 : 15.0);
    }
  }

  const user = db.prepare(
    'SELECT id, name, email, mobile, role, can_deliver, verification_status, rating FROM users WHERE id = ?'
  ).get(req.user!.id) as AuthUser;
  const partnerProfile = db.prepare('SELECT * FROM partner_profiles WHERE user_id = ?').get(req.user!.id);
  res.json({ user, partnerProfile, activeActivity: targetActivity || 'sender' });
});

// ========================
// GEO & ROUTING ROUTES
// ========================
app.get('/api/geo/search', async (req, res) => {
  const q = String(req.query.q || '').trim();
  if (!q) {
    res.json({ results: [] });
    return;
  }
  const results = await searchLocations(q);
  res.json({ results });
});

app.get('/api/geo/geocode', async (req, res) => {
  const q = String(req.query.q || '').trim();
  if (!q) {
    res.status(400).json({ error: 'Location query is required.' });
    return;
  }
  const point = await geocodeSingle(q);
  if (!point) {
    res.status(404).json({ error: `Could not locate "${q}". Try selecting a suggestion or tapping on the map.` });
    return;
  }
  res.json({ point });
});

app.get('/api/geo/reverse', async (req, res) => {
  const lat = Number(req.query.lat);
  const lng = Number(req.query.lng);
  if (!Number.isFinite(lat) || !Number.isFinite(lng)) {
    res.status(400).json({ error: 'Valid lat and lng are required.' });
    return;
  }
  const name = await reverseGeocode(lat, lng);
  res.json({ name, lat, lng });
});

app.post('/api/geo/route', async (req, res) => {
  const { pickupLat, pickupLng, destinationLat, destinationLng } = req.body as {
    pickupLat?: number;
    pickupLng?: number;
    destinationLat?: number;
    destinationLng?: number;
  };
  if (
    !Number.isFinite(pickupLat) ||
    !Number.isFinite(pickupLng) ||
    !Number.isFinite(destinationLat) ||
    !Number.isFinite(destinationLng)
  ) {
    res.status(400).json({ error: 'Valid pickup and destination coordinates are required.' });
    return;
  }

  const route = await calculateRoute(pickupLat!, pickupLng!, destinationLat!, destinationLng!);
  res.json({ route });
});

// ========================
// PRICING & MODES ROUTES
// ========================
app.get('/api/pricing/configs', (_req, res) => {
  res.json({ configs: getAllPricingConfigs(), maxPrototypeWeightKg: PROTOTYPE_MAX_WEIGHT_KG });
});

app.post('/api/pricing/calculate', (req, res) => {
  const {
    mode = 'bike',
    deliveryModel = 'community_relay',
    urgency = 'standard',
    distanceKm = 20,
    weightKg = 1,
    lengthCm = 20,
    widthCm = 15,
    heightCm = 10
  } = req.body as {
    mode?: TransportMode;
    deliveryModel?: DeliveryModel;
    urgency?: UrgencyLevel;
    distanceKm?: number;
    weightKg?: number;
    lengthCm?: number;
    widthCm?: number;
    heightCm?: number;
  };

  if (weightKg > PROTOTYPE_MAX_WEIGHT_KG) {
    res.status(400).json({
      error: `Prototype parcel weight limit is ${PROTOTYPE_MAX_WEIGHT_KG} kg. Entered weight (${weightKg} kg) exceeds limit.`
    });
    return;
  }

  const allQuotes = calculateAllModeQuotes({
    deliveryModel,
    urgency,
    distanceKm,
    weightKg,
    lengthCm,
    widthCm,
    heightCm
  });
  const selectedQuote = calculateModeQuote({
    mode,
    deliveryModel,
    urgency,
    distanceKm,
    weightKg,
    lengthCm,
    widthCm,
    heightCm
  });

  res.json({
    selectedQuote,
    allQuotes,
    parcelCategory: getParcelCategory(weightKg)
  });
});

// ========================
// MOVEX INTELLIGENCE & GUARD
// ========================
app.post('/api/intelligence/guard-check', optionalAuth, (req: AuthedRequest, res) => {
  const {
    declaredContents = '',
    declaredValue = 500,
    weightKg = 1,
    transportMode = 'bike',
    isFragile = false,
    policyAccepted = true
  } = req.body as {
    declaredContents?: string;
    declaredValue?: number;
    weightKg?: number;
    transportMode?: TransportMode;
    isFragile?: boolean;
    policyAccepted?: boolean;
  };

  const result = evaluateMovexGuard({
    userId: req.user?.id || 0,
    declaredContents,
    declaredValue: Number(declaredValue) || 0,
    weightKg: Number(weightKg) || 1,
    transportMode,
    isFragile: Boolean(isFragile),
    policyAccepted: Boolean(policyAccepted)
  });

  res.json(result);
});

app.post('/api/intelligence/match', (req, res) => {
  const {
    pickupLocation = 'Panaji, Goa',
    pickupLat = 15.4909,
    pickupLng = 73.8278,
    destinationLocation = 'Margao, Goa',
    destinationLat = 15.2832,
    destinationLng = 73.9862,
    distanceKm = 33,
    deliveryModel = 'community_relay',
    transportMode = 'bike',
    weightKg = 1,
    lengthCm = 20,
    widthCm = 15,
    heightCm = 10,
    urgency = 'standard'
  } = req.body;

  const matches = findMatchingPartners({
    pickupLat: Number(pickupLat),
    pickupLng: Number(pickupLng),
    destLat: Number(destinationLat),
    destLng: Number(destinationLng),
    distanceKm: Number(distanceKm) || Math.max(1, haversineKm(pickupLat, pickupLng, destinationLat, destinationLng) * 1.25),
    deliveryModel,
    transportMode,
    weightKg: Number(weightKg),
    lengthCm: Number(lengthCm),
    widthCm: Number(widthCm),
    heightCm: Number(heightCm),
    urgency
  });

  const meetingPoints = suggestSmartMeetingPoints({
    pickupLocation,
    pickupLat: Number(pickupLat),
    pickupLng: Number(pickupLng),
    destinationLocation,
    destLat: Number(destinationLat),
    destLng: Number(destinationLng),
    deliveryModel
  });

  res.json({ matches, meetingPoints });
});

// ========================
// UPLOAD PHOTO
// ========================
app.post('/api/uploads/parcel-photo', requireAuth, upload.single('photo'), (req, res) => {
  if (!req.file) {
    res.status(400).json({ error: 'No image file provided.' });
    return;
  }
  res.json({ url: `/uploads/${req.file.filename}` });
});

// ========================
// BOOKINGS & SENDER WORKFLOWS
// ========================
app.post('/api/bookings', requireAuth, async (req: AuthedRequest, res) => {
  const body = req.body as {
    deliveryModel: DeliveryModel;
    transportMode: TransportMode;
    urgency: UrgencyLevel;
    pickupLocation: string;
    pickupLat: number;
    pickupLng: number;
    destinationLocation: string;
    destinationLat: number;
    destinationLng: number;
    weightKg: number;
    lengthCm: number;
    widthCm: number;
    heightCm: number;
    declaredContents: string;
    declaredValue: number;
    isFragile: boolean;
    packagingType: string;
    parcelPhotoUrl?: string;
    policyAccepted: boolean;
    selectedPartnerId?: number | null;
    selectedJourneyId?: number | null;
    pickupMeetingPoint?: string;
    dropoffMeetingPoint?: string;
    paymentMethod?: string;
    payNow?: boolean;
  };

  if (!body.pickupLocation || !body.destinationLocation) {
    res.status(400).json({ error: 'Pickup and destination locations are required.' });
    return;
  }

  const weightKg = Number(body.weightKg);
  if (!Number.isFinite(weightKg) || weightKg <= 0 || weightKg > PROTOTYPE_MAX_WEIGHT_KG) {
    res.status(400).json({ error: `Parcel weight must be between 0.1 kg and ${PROTOTYPE_MAX_WEIGHT_KG} kg.` });
    return;
  }

  if (!body.declaredContents?.trim()) {
    res.status(400).json({ error: 'Parcel contents declaration is mandatory.' });
    return;
  }

  if (!body.policyAccepted) {
    res.status(400).json({ error: 'You must accept the MOVEX parcel safety policy.' });
    return;
  }

  // Compute authoritative road route distance on backend
  const route = await calculateRoute(
    Number(body.pickupLat),
    Number(body.pickupLng),
    Number(body.destinationLat),
    Number(body.destinationLng)
  );

  // Authoritative backend pricing quote
  const quote = calculateModeQuote({
    mode: body.transportMode,
    deliveryModel: body.deliveryModel,
    urgency: body.urgency || 'standard',
    distanceKm: route.distanceKm,
    weightKg,
    lengthCm: Number(body.lengthCm) || 20,
    widthCm: Number(body.widthCm) || 15,
    heightCm: Number(body.heightCm) || 10
  });

  if (!quote.compatible) {
    res.status(400).json({
      error: quote.incompatibilityReasons.join(' '),
      quote
    });
    return;
  }

  // Authoritative MOVEX Guard check
  const guard = evaluateMovexGuard({
    userId: req.user!.id,
    declaredContents: body.declaredContents,
    declaredValue: Number(body.declaredValue) || 0,
    weightKg,
    transportMode: body.transportMode,
    isFragile: Boolean(body.isFragile),
    policyAccepted: Boolean(body.policyAccepted)
  });

  if (!guard.allowBooking) {
    res.status(400).json({
      error: guard.reasons[0] || 'Booking blocked by MOVEX Guard safety policy.',
      guard
    });
    return;
  }

  // Enforce Community Relay rule: never create a dedicated journey; only link an existing journey if selected
  let journeyId: number | null = null;
  if (body.deliveryModel === 'community_relay' && body.selectedJourneyId) {
    const j = db.prepare("SELECT id, partner_id, available_capacity_count FROM journeys WHERE id = ? AND status = 'ACTIVE'").get(body.selectedJourneyId) as
      | { id: number; partner_id: number; available_capacity_count: number }
      | undefined;
    if (j && j.available_capacity_count > 0) {
      journeyId = j.id;
    }
  }

  const parcelCode = `MVX-${new Date().getFullYear()}-${Math.floor(1000 + Math.random() * 9000)}`;
  const pickupOtp = String(Math.floor(1000 + Math.random() * 9000));
  const handoverOtp = String(Math.floor(1000 + Math.random() * 9000));
  const deliveryOtp = String(Math.floor(1000 + Math.random() * 9000));

  let initialStatus = 'CREATED';
  if (guard.classification === 'RESTRICTED') {
    initialStatus = 'DECLARED';
  } else if (body.payNow) {
    initialStatus = 'MATCHING';
  } else {
    initialStatus = 'APPROVED';
  }

  const category = getParcelCategory(weightKg);

  const insertBookingTx = db.transaction(() => {
    const resInsert = db.prepare(`
      INSERT INTO bookings (
        parcel_code, sender_id, partner_id, journey_id, delivery_model, transport_mode, urgency,
        pickup_location, pickup_lat, pickup_lng, destination_location, destination_lat, destination_lng,
        distance_km, eta_minutes, eta_label, parcel_category, weight_kg, length_cm, width_cm, height_cm,
        declared_contents, declared_value, is_fragile, packaging_type, parcel_photo_url, policy_accepted,
        guard_classification, guard_notes, pickup_meeting_point, dropoff_meeting_point,
        meeting_agreed_by_sender, meeting_agreed_by_partner,
        base_fare, distance_charge, weight_charge, dimension_charge, model_charge, urgency_charge,
        platform_fee, total_price, partner_earning, platform_commission, status,
        pickup_otp, handover_otp, delivery_otp, current_lat, current_lng, route_deviation_alert
      ) VALUES (?, ?, NULL, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, 1, ?, ?, ?, ?, 1, 0, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, 0)
    `).run(
      parcelCode,
      req.user!.id,
      journeyId,
      body.deliveryModel,
      body.transportMode,
      body.urgency || 'standard',
      body.pickupLocation,
      Number(body.pickupLat),
      Number(body.pickupLng),
      body.destinationLocation,
      Number(body.destinationLat),
      Number(body.destinationLng),
      route.distanceKm,
      quote.etaMinutes,
      quote.etaLabel,
      category,
      weightKg,
      Number(body.lengthCm) || 20,
      Number(body.widthCm) || 15,
      Number(body.heightCm) || 10,
      body.declaredContents.trim(),
      Number(body.declaredValue) || 0,
      body.isFragile ? 1 : 0,
      body.packagingType || 'Cardboard Box',
      body.parcelPhotoUrl || '',
      guard.classification,
      guard.reasons.join(' '),
      body.pickupMeetingPoint || body.pickupLocation,
      body.dropoffMeetingPoint || body.destinationLocation,
      quote.baseFare,
      quote.distanceCharge,
      quote.weightCharge,
      quote.dimensionCharge,
      quote.modelCharge,
      quote.urgencyCharge,
      quote.platformFee,
      quote.totalPrice,
      quote.partnerEarning,
      quote.platformCommission,
      initialStatus,
      pickupOtp,
      handoverOtp,
      deliveryOtp,
      Number(body.pickupLat),
      Number(body.pickupLng)
    );

    const bookingId = Number(resInsert.lastInsertRowid);

    db.prepare(`
      INSERT INTO tracking_events (booking_id, status, title, description, location_name, lat, lng, actor_name, is_simulated_gps)
      VALUES (?, 'CREATED', 'Digital Parcel Identity Generated', ?, ?, ?, ?, ?, 0)
    `).run(
      bookingId,
      `Parcel ${parcelCode} declared (${category}, ${weightKg} kg, ${body.packagingType || 'Standard packaging'}).`,
      body.pickupLocation,
      Number(body.pickupLat),
      Number(body.pickupLng),
      req.user!.name
    );

    if (guard.classification === 'RESTRICTED') {
      db.prepare(`
        INSERT INTO security_alerts (booking_id, user_id, risk_level, classification, reasons_json, status)
        VALUES (?, ?, ?, ?, ?, 'OPEN')
      `).run(bookingId, req.user!.id, guard.riskLevel, guard.classification, JSON.stringify(guard.reasons));

      db.prepare(`
        INSERT INTO tracking_events (booking_id, status, title, description, location_name, lat, lng, actor_name, is_simulated_gps)
        VALUES (?, 'DECLARED', 'MOVEX Guard Review Pending', 'Parcel requires administrator restriction verification before dispatch.', ?, ?, ?, 'MOVEX Guard', 0)
      `).run(bookingId, body.pickupLocation, Number(body.pickupLat), Number(body.pickupLng));

      // Notify admins
      const admins = db.prepare("SELECT id FROM users WHERE role = 'admin'").all() as Array<{ id: number }>;
      for (const adm of admins) {
        db.prepare(`
          INSERT INTO notifications (user_id, title, message, type)
          VALUES (?, ?, ?, 'warning')
        `).run(adm.id, `Guard Alert: ${parcelCode}`, `Restricted declaration flagged for review (${guard.riskLevel} risk).`);
      }
    } else {
      db.prepare(`
        INSERT INTO tracking_events (booking_id, status, title, description, location_name, lat, lng, actor_name, is_simulated_gps)
        VALUES (?, 'APPROVED', 'MOVEX Guard Cleared', 'Declaration classified as PERMITTED.', ?, ?, ?, 'MOVEX Guard', 0)
      `).run(bookingId, body.pickupLocation, Number(body.pickupLat), Number(body.pickupLng));
    }

    if (body.payNow) {
      const txRef = `SIM-TXN-${Date.now().toString().slice(-6)}`;
      db.prepare(`
        INSERT INTO payments (booking_id, sender_id, partner_id, amount, platform_commission, partner_earning, method, transaction_ref, status, is_simulated)
        VALUES (?, ?, NULL, ?, ?, ?, ?, ?, 'COMPLETED', 1)
      `).run(
        bookingId,
        req.user!.id,
        quote.totalPrice,
        quote.platformCommission,
        quote.partnerEarning,
        body.paymentMethod || 'UPI Demo (Simulated)',
        txRef
      );

      if (guard.classification === 'PERMITTED') {
        db.prepare(`
          INSERT INTO tracking_events (booking_id, status, title, description, location_name, lat, lng, actor_name, is_simulated_gps)
          VALUES (?, 'MATCHING', 'Broadcasting to Compatible Partners', 'Simulated payment confirmed. Matching parcel with active route partners.', ?, ?, ?, 'MOVEX Intelligence', 0)
        `).run(bookingId, body.pickupLocation, Number(body.pickupLat), Number(body.pickupLng));
      }
    }

    return bookingId;
  });

  const bookingId = insertBookingTx();
  const created = getEnrichedBooking(bookingId);
  res.status(201).json({ booking: created, guard, route });
});

app.get('/api/bookings', requireAuth, (req: AuthedRequest, res) => {
  const rows = db.prepare(`
    SELECT b.*, u.name as sender_name, p.name as partner_name, p.mobile as partner_mobile
    FROM bookings b
    JOIN users u ON u.id = b.sender_id
    LEFT JOIN users p ON p.id = b.partner_id
    WHERE b.sender_id = ?
    ORDER BY b.created_at DESC
  `).all(req.user!.id) as Array<Record<string, unknown>>;

  const payments = db.prepare('SELECT * FROM payments WHERE sender_id = ? ORDER BY created_at DESC').all(req.user!.id);
  const disputes = db.prepare('SELECT * FROM disputes WHERE raised_by_id = ? ORDER BY created_at DESC').all(req.user!.id);
  res.json({ bookings: rows, payments, disputes });
});

app.get('/api/bookings/:codeOrId', optionalAuth, (req: AuthedRequest, res) => {
  const param = req.params.codeOrId;
  const row = isNaN(Number(param))
    ? (db.prepare('SELECT id FROM bookings WHERE UPPER(parcel_code) = UPPER(?)').get(param) as { id: number } | undefined)
    : (db.prepare('SELECT id FROM bookings WHERE id = ?').get(Number(param)) as { id: number } | undefined);

  if (!row) {
    res.status(404).json({ error: `Parcel "${param}" not found.` });
    return;
  }

  const booking = getEnrichedBooking(row.id);
  res.json({ booking });
});

app.post('/api/bookings/:id/pay', requireAuth, (req: AuthedRequest, res) => {
  const bookingId = Number(req.params.id);
  const { method = 'UPI Demo (Simulated)' } = req.body as { method?: string };

  const booking = db.prepare('SELECT * FROM bookings WHERE id = ? AND sender_id = ?').get(bookingId, req.user!.id) as
    | Record<string, unknown>
    | undefined;
  if (!booking) {
    res.status(404).json({ error: 'Booking not found.' });
    return;
  }

  const existingPay = db.prepare("SELECT id FROM payments WHERE booking_id = ? AND status = 'COMPLETED'").get(bookingId);
  if (existingPay) {
    res.status(400).json({ error: 'Simulated payment already completed for this booking.' });
    return;
  }

  const txRef = `SIM-TXN-${Date.now().toString().slice(-6)}`;
  db.transaction(() => {
    db.prepare(`
      INSERT INTO payments (booking_id, sender_id, partner_id, amount, platform_commission, partner_earning, method, transaction_ref, status, is_simulated)
      VALUES (?, ?, ?, ?, ?, ?, ?, ?, 'COMPLETED', 1)
    `).run(
      bookingId,
      req.user!.id,
      booking.partner_id || null,
      booking.total_price,
      booking.platform_commission,
      booking.partner_earning,
      method,
      txRef
    );

    if (booking.guard_classification === 'PERMITTED' && (booking.status === 'CREATED' || booking.status === 'APPROVED')) {
      db.prepare("UPDATE bookings SET status = 'MATCHING', updated_at = datetime('now') WHERE id = ?").run(bookingId);
      db.prepare(`
        INSERT INTO tracking_events (booking_id, status, title, description, location_name, lat, lng, actor_name, is_simulated_gps)
        VALUES (?, 'MATCHING', 'Payment Confirmed & Matching Active', ?, ?, ?, ?, 'MOVEX FinTech (Demo)', 0)
      `).run(
        bookingId,
        `Simulated payment (${txRef}) completed. Parcel open for delivery partner assignment.`,
        booking.pickup_location,
        booking.pickup_lat,
        booking.pickup_lng
      );
    }
  })();

  res.json({ booking: getEnrichedBooking(bookingId), transactionRef: txRef });
});

app.post('/api/bookings/:id/cancel', requireAuth, (req: AuthedRequest, res) => {
  const bookingId = Number(req.params.id);
  const booking = db.prepare('SELECT * FROM bookings WHERE id = ? AND sender_id = ?').get(bookingId, req.user!.id) as
    | Record<string, unknown>
    | undefined;
  if (!booking) {
    res.status(404).json({ error: 'Booking not found.' });
    return;
  }

  if (['PICKED_UP', 'IN_TRANSIT', 'DELIVERED', 'CANCELLED'].includes(String(booking.status))) {
    res.status(400).json({ error: `Cannot cancel parcel once it is ${booking.status}.` });
    return;
  }

  const hadPartner = Boolean(booking.partner_id);
  const cancellationFee = hadPartner ? Math.min(25, Math.round(Number(booking.total_price) * 0.1 * 100) / 100) : 0;

  db.transaction(() => {
    db.prepare("UPDATE bookings SET status = 'CANCELLED', updated_at = datetime('now') WHERE id = ?").run(bookingId);
    db.prepare(`
      UPDATE payments SET status = ? WHERE booking_id = ? AND status = 'COMPLETED'
    `).run(cancellationFee > 0 ? 'PARTIAL_REFUND' : 'REFUNDED', bookingId);

    if (booking.journey_id) {
      db.prepare('UPDATE journeys SET available_capacity_count = available_capacity_count + 1 WHERE id = ?').run(booking.journey_id);
    }

    db.prepare(`
      INSERT INTO tracking_events (booking_id, status, title, description, location_name, lat, lng, actor_name, is_simulated_gps)
      VALUES (?, 'CANCELLED', 'Booking Cancelled', ?, ?, ?, ?, ?, 0)
    `).run(
      bookingId,
      cancellationFee > 0
        ? `Cancelled after partner assignment. Simulated refund issued minus ₹${cancellationFee} cancellation fee.`
        : 'Cancelled before pickup. Full simulated refund processed.',
      booking.pickup_location,
      booking.pickup_lat,
      booking.pickup_lng,
      req.user!.name
    );
  })();

  res.json({ booking: getEnrichedBooking(bookingId), cancellationFee });
});

app.post('/api/bookings/:id/meeting-point', requireAuth, (req: AuthedRequest, res) => {
  const bookingId = Number(req.params.id);
  const { pickupMeetingPoint, dropoffMeetingPoint, role } = req.body as {
    pickupMeetingPoint?: string;
    dropoffMeetingPoint?: string;
    role?: 'sender' | 'partner';
  };

  const booking = db.prepare('SELECT * FROM bookings WHERE id = ?').get(bookingId) as Record<string, unknown> | undefined;
  if (!booking || (booking.sender_id !== req.user!.id && booking.partner_id !== req.user!.id)) {
    res.status(404).json({ error: 'Booking not found or unauthorized.' });
    return;
  }

  const isPartner = role === 'partner' || booking.partner_id === req.user!.id;
  db.prepare(`
    UPDATE bookings
    SET pickup_meeting_point = COALESCE(?, pickup_meeting_point),
        dropoff_meeting_point = COALESCE(?, dropoff_meeting_point),
        meeting_agreed_by_sender = CASE WHEN ? = 0 THEN 1 ELSE meeting_agreed_by_sender END,
        meeting_agreed_by_partner = CASE WHEN ? = 1 THEN 1 ELSE meeting_agreed_by_partner END,
        updated_at = datetime('now')
    WHERE id = ?
  `).run(
    pickupMeetingPoint || null,
    dropoffMeetingPoint || null,
    isPartner ? 1 : 0,
    isPartner ? 1 : 0,
    bookingId
  );

  res.json({ booking: getEnrichedBooking(bookingId) });
});

app.post('/api/bookings/:id/dispute', requireAuth, (req: AuthedRequest, res) => {
  const bookingId = Number(req.params.id);
  const { reason, description } = req.body as { reason?: string; description?: string };
  if (!reason?.trim() || !description?.trim()) {
    res.status(400).json({ error: 'Dispute reason and description are required.' });
    return;
  }

  const booking = db.prepare('SELECT * FROM bookings WHERE id = ?').get(bookingId) as Record<string, unknown> | undefined;
  if (!booking || (booking.sender_id !== req.user!.id && booking.partner_id !== req.user!.id)) {
    res.status(404).json({ error: 'Booking not found.' });
    return;
  }

  db.transaction(() => {
    db.prepare(`
      INSERT INTO disputes (booking_id, raised_by_id, reason, description, status)
      VALUES (?, ?, ?, ?, 'OPEN')
    `).run(bookingId, req.user!.id, reason.trim(), description.trim());

    db.prepare("UPDATE bookings SET status = 'DISPUTED', updated_at = datetime('now') WHERE id = ?").run(bookingId);
    db.prepare("UPDATE payments SET status = 'ON_HOLD' WHERE booking_id = ? AND status = 'COMPLETED'").run(bookingId);
    db.prepare(`
      INSERT INTO tracking_events (booking_id, status, title, description, location_name, lat, lng, actor_name, is_simulated_gps)
      VALUES (?, 'DISPUTED', 'Dispute Raised — Payment On Hold', ?, ?, ?, ?, ?, 0)
    `).run(
      bookingId,
      `${reason}: ${description}`,
      booking.destination_location,
      booking.current_lat || booking.pickup_lat,
      booking.current_lng || booking.pickup_lng,
      req.user!.name
    );
  })();

  res.json({ booking: getEnrichedBooking(bookingId) });
});

// ========================
// PARTNER WORKFLOWS
// ========================
app.get('/api/partner/overview', requireAuth, (req: AuthedRequest, res) => {
  const uid = req.user!.id;
  const profile = db.prepare('SELECT * FROM partner_profiles WHERE user_id = ?').get(uid) as Record<string, unknown> | undefined;
  const completedRows = db.prepare("SELECT COALESCE(SUM(partner_earning), 0) as total FROM bookings WHERE partner_id = ? AND status = 'DELIVERED'").get(uid) as { total: number };
  const pendingRows = db.prepare("SELECT COALESCE(SUM(partner_earning), 0) as total FROM bookings WHERE partner_id = ? AND status IN ('PARTNER_ASSIGNED', 'PICKED_UP', 'IN_TRANSIT', 'HANDOVER_PENDING')").get(uid) as { total: number };
  const activeCount = (db.prepare("SELECT COUNT(*) as cnt FROM bookings WHERE partner_id = ? AND status IN ('PARTNER_ASSIGNED', 'PICKED_UP', 'IN_TRANSIT', 'HANDOVER_PENDING')").get(uid) as { cnt: number }).cnt;
  const completedCount = (db.prepare("SELECT COUNT(*) as cnt FROM bookings WHERE partner_id = ? AND status = 'DELIVERED'").get(uid) as { cnt: number }).cnt;
  const availableRequests = getPartnerMatchingRequests(uid);
  const transactions = db.prepare(`
    SELECT p.*, b.parcel_code, b.pickup_location, b.destination_location, b.transport_mode, b.status as booking_status
    FROM payments p
    JOIN bookings b ON b.id = p.booking_id
    WHERE b.partner_id = ?
    ORDER BY p.created_at DESC
  `).all(uid);

  // Build Recharts weekly earnings chart series
  const dailyEarnings = [
    { day: 'Mon', earnings: Math.round(completedRows.total * 0.14 + 120) },
    { day: 'Tue', earnings: Math.round(completedRows.total * 0.18 + 90) },
    { day: 'Wed', earnings: Math.round(completedRows.total * 0.12 + 160) },
    { day: 'Thu', earnings: Math.round(completedRows.total * 0.20 + 110) },
    { day: 'Fri', earnings: Math.round(completedRows.total * 0.16 + 210) },
    { day: 'Sat', earnings: Math.round(completedRows.total * 0.12 + 180) },
    { day: 'Sun', earnings: Math.round(completedRows.total * 0.08 + 140) }
  ];

  res.json({
    profile,
    stats: {
      totalEarnings: Math.round(completedRows.total * 100) / 100,
      weeklyEarnings: Math.round((completedRows.total * 0.45 + 480) * 100) / 100,
      monthlyEarnings: Math.round((completedRows.total + 1250) * 100) / 100,
      pendingEarnings: Math.round(pendingRows.total * 100) / 100,
      activeDeliveries: activeCount,
      completedDeliveries: completedCount,
      availableRequestsCount: availableRequests.length,
      rating: req.user!.rating,
      verificationStatus: req.user!.verification_status
    },
    dailyEarnings,
    transactions
  });
});

app.get('/api/partner/journeys', requireAuth, (req: AuthedRequest, res) => {
  const journeys = db.prepare('SELECT * FROM journeys WHERE partner_id = ? ORDER BY created_at DESC').all(req.user!.id);
  res.json({ journeys });
});

app.post('/api/partner/journeys', requireAuth, (req: AuthedRequest, res) => {
  const {
    originName,
    originLat,
    originLng,
    destName,
    destLat,
    destLng,
    travelDate,
    departureTime,
    expectedArrival,
    transportMode,
    availableCapacityCount,
    maxWeightKg,
    preferredMeetingPoints,
    isRecurring,
    recurrenceRule,
    declarationConfirmed
  } = req.body as {
    originName?: string;
    originLat?: number;
    originLng?: number;
    destName?: string;
    destLat?: number;
    destLng?: number;
    travelDate?: string;
    departureTime?: string;
    expectedArrival?: string;
    transportMode?: TransportMode;
    availableCapacityCount?: number;
    maxWeightKg?: number;
    preferredMeetingPoints?: string;
    isRecurring?: boolean;
    recurrenceRule?: string;
    declarationConfirmed?: boolean;
  };

  if (!declarationConfirmed) {
    res.status(400).json({
      error: 'Mandatory declaration required: you must confirm you are already travelling on this route and not creating a dedicated parcel trip.'
    });
    return;
  }

  if (!originName || !destName || !Number.isFinite(originLat) || !Number.isFinite(destLat)) {
    res.status(400).json({ error: 'Valid origin and destination locations are required.' });
    return;
  }

  const info = db.prepare(`
    INSERT INTO journeys (
      partner_id, origin_name, origin_lat, origin_lng, dest_name, dest_lat, dest_lng,
      travel_date, departure_time, expected_arrival, transport_mode,
      available_capacity_count, max_weight_kg, preferred_meeting_points,
      is_recurring, recurrence_rule, status, declaration_confirmed
    ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, 'ACTIVE', 1)
  `).run(
    req.user!.id,
    originName,
    Number(originLat),
    Number(originLng),
    destName,
    Number(destLat),
    Number(destLng),
    travelDate || new Date().toISOString().slice(0, 10),
    departureTime || '09:00',
    expectedArrival || '10:30',
    transportMode || 'bike',
    Math.max(1, Number(availableCapacityCount) || 2),
    Math.min(15, Math.max(0.5, Number(maxWeightKg) || 5)),
    preferredMeetingPoints || '',
    isRecurring ? 1 : 0,
    recurrenceRule || ''
  );

  // Ensure user has partner_profile & can_deliver
  db.prepare('UPDATE users SET can_deliver = 1 WHERE id = ?').run(req.user!.id);
  const existingProfile = db.prepare('SELECT id FROM partner_profiles WHERE user_id = ?').get(req.user!.id);
  if (!existingProfile) {
    db.prepare(`
      INSERT INTO partner_profiles (user_id, primary_mode, max_weight_kg, reliability_score)
      VALUES (?, ?, ?, 92.0)
    `).run(req.user!.id, transportMode || 'bike', Math.min(15, Number(maxWeightKg) || 5));
  }

  const journey = db.prepare('SELECT * FROM journeys WHERE id = ?').get(Number(info.lastInsertRowid));
  res.status(201).json({ journey });
});

app.patch('/api/partner/journeys/:id', requireAuth, (req: AuthedRequest, res) => {
  const journeyId = Number(req.params.id);
  const existing = db.prepare('SELECT * FROM journeys WHERE id = ? AND partner_id = ?').get(journeyId, req.user!.id);
  if (!existing) {
    res.status(404).json({ error: 'Journey not found.' });
    return;
  }

  const { status, availableCapacityCount, maxWeightKg, departureTime, expectedArrival, preferredMeetingPoints, recurrenceRule } = req.body as {
    status?: 'ACTIVE' | 'PAUSED' | 'COMPLETED' | 'CANCELLED';
    availableCapacityCount?: number;
    maxWeightKg?: number;
    departureTime?: string;
    expectedArrival?: string;
    preferredMeetingPoints?: string;
    recurrenceRule?: string;
  };

  db.prepare(`
    UPDATE journeys
    SET status = COALESCE(?, status),
        available_capacity_count = COALESCE(?, available_capacity_count),
        max_weight_kg = COALESCE(?, max_weight_kg),
        departure_time = COALESCE(?, departure_time),
        expected_arrival = COALESCE(?, expected_arrival),
        preferred_meeting_points = COALESCE(?, preferred_meeting_points),
        recurrence_rule = COALESCE(?, recurrence_rule)
    WHERE id = ? AND partner_id = ?
  `).run(
    status || null,
    availableCapacityCount !== undefined ? Math.max(0, availableCapacityCount) : null,
    maxWeightKg !== undefined ? Math.min(15, Math.max(0.5, maxWeightKg)) : null,
    departureTime || null,
    expectedArrival || null,
    preferredMeetingPoints !== undefined ? preferredMeetingPoints : null,
    recurrenceRule !== undefined ? recurrenceRule : null,
    journeyId,
    req.user!.id
  );

  const updated = db.prepare('SELECT * FROM journeys WHERE id = ?').get(journeyId);
  res.json({ journey: updated });
});

app.delete('/api/partner/journeys/:id', requireAuth, (req: AuthedRequest, res) => {
  const journeyId = Number(req.params.id);
  const result = db.prepare('DELETE FROM journeys WHERE id = ? AND partner_id = ?').run(journeyId, req.user!.id);
  if (result.changes === 0) {
    res.status(404).json({ error: 'Journey not found.' });
    return;
  }
  res.json({ deleted: true });
});

app.get('/api/partner/requests', requireAuth, (req: AuthedRequest, res) => {
  const requests = getPartnerMatchingRequests(req.user!.id);
  res.json({ requests });
});

// ATOMIC TRANSACTION: First eligible partner wins the parcel!
app.post('/api/partner/requests/:id/accept', requireAuth, (req: AuthedRequest, res) => {
  const bookingId = Number(req.params.id);
  const { journeyId, agreedPickupPoint, agreedDropoffPoint } = req.body as {
    journeyId?: number;
    agreedPickupPoint?: string;
    agreedDropoffPoint?: string;
  };

  const partnerId = req.user!.id;

  const acceptTx = db.transaction(() => {
    const booking = db.prepare('SELECT * FROM bookings WHERE id = ?').get(bookingId) as Record<string, unknown> | undefined;
    if (!booking) {
      return { status: 404, error: 'Parcel booking not found.' };
    }
    if (booking.sender_id === partnerId) {
      return { status: 400, error: 'You cannot accept your own parcel booking.' };
    }

    // Community Relay requires an active partner journey
    let assignedJourneyId: number | null = journeyId || (booking.journey_id as number | null) || null;
    if (booking.delivery_model === 'community_relay') {
      const journey = assignedJourneyId
        ? (db.prepare("SELECT * FROM journeys WHERE id = ? AND partner_id = ? AND status = 'ACTIVE' AND available_capacity_count >= 1").get(assignedJourneyId, partnerId) as Record<string, unknown> | undefined)
        : (db.prepare("SELECT * FROM journeys WHERE partner_id = ? AND status = 'ACTIVE' AND available_capacity_count >= 1 AND max_weight_kg >= ? LIMIT 1").get(partnerId, booking.weight_kg) as Record<string, unknown> | undefined);

      if (!journey) {
        return {
          status: 400,
          error: 'Community Relay requires an active published journey with available capacity. Publish your existing journey first.'
        };
      }
      assignedJourneyId = Number(journey.id);
    }

    // Atomic conditional UPDATE prevents race conditions / double-wins!
    const updateRes = db.prepare(`
      UPDATE bookings
      SET partner_id = ?,
          journey_id = COALESCE(?, journey_id),
          pickup_meeting_point = COALESCE(?, pickup_meeting_point),
          dropoff_meeting_point = COALESCE(?, dropoff_meeting_point),
          meeting_agreed_by_partner = 1,
          status = 'PARTNER_ASSIGNED',
          updated_at = datetime('now')
      WHERE id = ?
        AND partner_id IS NULL
        AND status IN ('APPROVED', 'MATCHING')
    `).run(
      partnerId,
      assignedJourneyId,
      agreedPickupPoint || null,
      agreedDropoffPoint || null,
      bookingId
    );

    if (updateRes.changes === 0) {
      return { status: 409, error: 'This parcel was already accepted by another delivery partner or is no longer open.' };
    }

    if (assignedJourneyId) {
      db.prepare('UPDATE journeys SET available_capacity_count = MAX(0, available_capacity_count - 1) WHERE id = ?').run(assignedJourneyId);
    }

    db.prepare('UPDATE payments SET partner_id = ? WHERE booking_id = ?').run(partnerId, bookingId);

    db.prepare(`
      INSERT INTO tracking_events (booking_id, status, title, description, location_name, lat, lng, actor_name, is_simulated_gps)
      VALUES (?, 'PARTNER_ASSIGNED', 'Delivery Partner Assigned', ?, ?, ?, ?, ?, 0)
    `).run(
      bookingId,
      `${req.user!.name} accepted the parcel. Ready for Pickup OTP authentication.`,
      agreedPickupPoint || booking.pickup_meeting_point || booking.pickup_location,
      booking.pickup_lat,
      booking.pickup_lng,
      req.user!.name
    );

    db.prepare(`
      INSERT INTO notifications (user_id, title, message, type)
      VALUES (?, ?, ?, 'success')
    `).run(
      booking.sender_id,
      `Partner Assigned: ${booking.parcel_code}`,
      `${req.user!.name} accepted your parcel. Share Pickup OTP ${booking.pickup_otp} at handover.`
    );

    return { status: 200, bookingId };
  });

  const outcome = acceptTx();
  if (outcome.status !== 200) {
    res.status(outcome.status).json({ error: outcome.error });
    return;
  }

  res.json({ booking: getEnrichedBooking(bookingId) });
});

app.post('/api/partner/requests/:id/reject', requireAuth, (req: AuthedRequest, res) => {
  const bookingId = Number(req.params.id);
  const { reason = 'Schedule or capacity mismatch' } = req.body as { reason?: string };
  db.prepare(`
    INSERT OR IGNORE INTO booking_rejections (booking_id, partner_id, reason)
    VALUES (?, ?, ?)
  `).run(bookingId, req.user!.id, reason);
  res.json({ rejected: true });
});

app.get('/api/partner/deliveries', requireAuth, (req: AuthedRequest, res) => {
  const deliveries = db.prepare(`
    SELECT b.*, u.name as sender_name, u.mobile as sender_mobile
    FROM bookings b
    JOIN users u ON u.id = b.sender_id
    WHERE b.partner_id = ?
    ORDER BY b.updated_at DESC
  `).all(req.user!.id);
  res.json({ deliveries });
});

app.post('/api/partner/deliveries/:id/pickup-otp', requireAuth, (req: AuthedRequest, res) => {
  const bookingId = Number(req.params.id);
  const { otp } = req.body as { otp?: string };
  const booking = db.prepare('SELECT * FROM bookings WHERE id = ? AND partner_id = ?').get(bookingId, req.user!.id) as
    | Record<string, unknown>
    | undefined;

  if (!booking) {
    res.status(404).json({ error: 'Assigned delivery not found.' });
    return;
  }
  if (String(booking.pickup_otp) !== String(otp).trim()) {
    res.status(400).json({ error: 'Invalid Pickup OTP. Please ask the sender for the 4-digit Pickup OTP.' });
    return;
  }

  db.transaction(() => {
    db.prepare("UPDATE bookings SET status = 'IN_TRANSIT', updated_at = datetime('now') WHERE id = ?").run(bookingId);
    db.prepare(`
      INSERT INTO tracking_events (booking_id, status, title, description, location_name, lat, lng, actor_name, is_simulated_gps)
      VALUES (?, 'PICKED_UP', 'Pickup OTP Authenticated', 'Parcel collected from sender and custody verified.', ?, ?, ?, ?, 0)
    `).run(bookingId, booking.pickup_meeting_point || booking.pickup_location, booking.pickup_lat, booking.pickup_lng, req.user!.name);

    db.prepare(`
      INSERT INTO tracking_events (booking_id, status, title, description, location_name, lat, lng, actor_name, is_simulated_gps)
      VALUES (?, 'IN_TRANSIT', 'Parcel In Transit', 'En route toward destination corridor.', ?, ?, ?, ?, 0)
    `).run(bookingId, booking.pickup_location, booking.pickup_lat, booking.pickup_lng, req.user!.name);
  })();

  res.json({ booking: getEnrichedBooking(bookingId) });
});

app.post('/api/partner/deliveries/:id/simulate-gps', requireAuth, (req: AuthedRequest, res) => {
  const bookingId = Number(req.params.id);
  const { progress = 0.55, simulateDeviation = false } = req.body as { progress?: number; simulateDeviation?: boolean };
  const booking = db.prepare('SELECT * FROM bookings WHERE id = ? AND partner_id = ?').get(bookingId, req.user!.id) as
    | Record<string, unknown>
    | undefined;

  if (!booking) {
    res.status(404).json({ error: 'Assigned delivery not found.' });
    return;
  }

  const pLat = Number(booking.pickup_lat);
  const pLng = Number(booking.pickup_lng);
  const dLat = Number(booking.destination_lat);
  const dLng = Number(booking.destination_lng);

  const clamped = Math.max(0.1, Math.min(0.95, Number(progress)));
  const devOffset = simulateDeviation ? 0.045 : 0;
  const newLat = pLat + (dLat - pLat) * clamped + devOffset;
  const newLng = pLng + (dLng - pLng) * clamped - devOffset;

  db.transaction(() => {
    db.prepare(`
      UPDATE bookings
      SET current_lat = ?, current_lng = ?, route_deviation_alert = ?, updated_at = datetime('now')
      WHERE id = ?
    `).run(newLat, newLng, simulateDeviation ? 1 : 0, bookingId);

    db.prepare(`
      INSERT INTO tracking_events (booking_id, status, title, description, location_name, lat, lng, actor_name, is_simulated_gps)
      VALUES (?, ?, ?, ?, ?, ?, ?, 'Simulated GPS Prototype Feed', 1)
    `).run(
      bookingId,
      String(booking.status),
      simulateDeviation ? 'Route Deviation Alert (Simulated GPS)' : `Simulated GPS Update (${Math.round(clamped * 100)}% route)`,
      simulateDeviation
        ? 'Simulated telemetry detected corridor deviation > 3 km. Sender and admin notified.'
        : 'Simulated prototype GPS position updated along planned corridor.',
      `Checkpoint ${Math.round(clamped * 100)}%`,
      newLat,
      newLng
    );
  })();

  res.json({ booking: getEnrichedBooking(bookingId) });
});

app.post('/api/partner/deliveries/:id/handover', requireAuth, (req: AuthedRequest, res) => {
  const bookingId = Number(req.params.id);
  const { action, otp, relayPoint } = req.body as { action?: 'initiate' | 'complete'; otp?: string; relayPoint?: string };
  const booking = db.prepare('SELECT * FROM bookings WHERE id = ? AND partner_id = ?').get(bookingId, req.user!.id) as
    | Record<string, unknown>
    | undefined;

  if (!booking) {
    res.status(404).json({ error: 'Assigned delivery not found.' });
    return;
  }

  if (action === 'initiate') {
    db.prepare("UPDATE bookings SET status = 'HANDOVER_PENDING', updated_at = datetime('now') WHERE id = ?").run(bookingId);
    db.prepare(`
      INSERT INTO tracking_events (booking_id, status, title, description, location_name, lat, lng, actor_name, is_simulated_gps)
      VALUES (?, 'HANDOVER_PENDING', 'Relay Handover Initiated', ?, ?, ?, ?, ?, 0)
    `).run(
      bookingId,
      `Awaiting relay handover OTP verification at ${relayPoint || 'transit hub'}.`,
      relayPoint || booking.dropoff_meeting_point,
      booking.current_lat || booking.pickup_lat,
      booking.current_lng || booking.pickup_lng,
      req.user!.name
    );
  } else {
    if (String(booking.handover_otp) !== String(otp || '').trim()) {
      res.status(400).json({ error: 'Invalid Handover OTP.' });
      return;
    }
    db.prepare("UPDATE bookings SET status = 'IN_TRANSIT', updated_at = datetime('now') WHERE id = ?").run(bookingId);
    db.prepare(`
      INSERT INTO tracking_events (booking_id, status, title, description, location_name, lat, lng, actor_name, is_simulated_gps)
      VALUES (?, 'IN_TRANSIT', 'Relay Handover Authenticated', 'Custody transferred via OTP verification; continuing transit.', ?, ?, ?, ?, 0)
    `).run(
      bookingId,
      relayPoint || booking.dropoff_meeting_point,
      booking.current_lat || booking.pickup_lat,
      booking.current_lng || booking.pickup_lng,
      req.user!.name
    );
  }

  res.json({ booking: getEnrichedBooking(bookingId) });
});

app.post('/api/partner/deliveries/:id/deliver-otp', requireAuth, (req: AuthedRequest, res) => {
  const bookingId = Number(req.params.id);
  const { otp } = req.body as { otp?: string };
  const booking = db.prepare('SELECT * FROM bookings WHERE id = ? AND partner_id = ?').get(bookingId, req.user!.id) as
    | Record<string, unknown>
    | undefined;

  if (!booking) {
    res.status(404).json({ error: 'Assigned delivery not found.' });
    return;
  }
  if (String(booking.delivery_otp) !== String(otp).trim()) {
    res.status(400).json({ error: 'Invalid Recipient Delivery OTP. Verify with recipient.' });
    return;
  }

  db.transaction(() => {
    db.prepare(`
      UPDATE bookings
      SET status = 'DELIVERED',
          current_lat = destination_lat,
          current_lng = destination_lng,
          updated_at = datetime('now')
      WHERE id = ?
    `).run(bookingId);

    db.prepare(`
      UPDATE partner_profiles
      SET completed_deliveries = completed_deliveries + 1,
          on_time_deliveries = on_time_deliveries + 1
      WHERE user_id = ?
    `).run(req.user!.id);

    db.prepare(`
      INSERT INTO tracking_events (booking_id, status, title, description, location_name, lat, lng, actor_name, is_simulated_gps)
      VALUES (?, 'DELIVERED', 'Delivered & Recipient OTP Verified', ?, ?, ?, ?, ?, 0)
    `).run(
      bookingId,
      `Parcel safely delivered. Partner earning ₹${booking.partner_earning} settled in demo ledger.`,
      booking.dropoff_meeting_point || booking.destination_location,
      booking.destination_lat,
      booking.destination_lng,
      req.user!.name
    );

    db.prepare(`
      INSERT INTO notifications (user_id, title, message, type)
      VALUES (?, ?, ?, 'success')
    `).run(booking.sender_id, `Delivered: ${booking.parcel_code}`, 'Your parcel was delivered and verified via Recipient OTP.');
  })();

  recalculatePartnerReliability(req.user!.id);
  res.json({ booking: getEnrichedBooking(bookingId) });
});

// ========================
// ADMIN ROUTES (STRICT ROLE)
// ========================
app.get('/api/admin/overview', requireAuth, requireRole('admin'), (_req, res) => {
  const totalUsers = (db.prepare("SELECT COUNT(*) as cnt FROM users WHERE role != 'admin'").get() as { cnt: number }).cnt;
  const totalPartners = (db.prepare("SELECT COUNT(*) as cnt FROM users WHERE role = 'partner' OR can_deliver = 1").get() as { cnt: number }).cnt;
  const totalParcels = (db.prepare('SELECT COUNT(*) as cnt FROM bookings').get() as { cnt: number }).cnt;
  const activeDeliveries = (db.prepare("SELECT COUNT(*) as cnt FROM bookings WHERE status IN ('PARTNER_ASSIGNED', 'PICKED_UP', 'IN_TRANSIT', 'HANDOVER_PENDING')").get() as { cnt: number }).cnt;
  const completedDeliveries = (db.prepare("SELECT COUNT(*) as cnt FROM bookings WHERE status = 'DELIVERED'").get() as { cnt: number }).cnt;
  const revenueRow = db.prepare("SELECT COALESCE(SUM(amount), 0) as gross, COALESCE(SUM(platform_commission), 0) as commission, COALESCE(SUM(partner_earning), 0) as partnerTotal FROM payments WHERE status IN ('COMPLETED', 'ON_HOLD')").get() as {
    gross: number;
    commission: number;
    partnerTotal: number;
  };
  const securityAlertsOpen = (db.prepare("SELECT COUNT(*) as cnt FROM security_alerts WHERE status = 'OPEN'").get() as { cnt: number }).cnt;
  const pendingDisputes = (db.prepare("SELECT COUNT(*) as cnt FROM disputes WHERE status IN ('OPEN', 'UNDER_REVIEW')").get() as { cnt: number }).cnt;

  const modeDistribution = db.prepare(`
    SELECT transport_mode as mode, COUNT(*) as count, COALESCE(SUM(total_price), 0) as revenue
    FROM bookings
    GROUP BY transport_mode
  `).all();

  const modelDistribution = db.prepare(`
    SELECT delivery_model as model, COUNT(*) as count, COALESCE(SUM(total_price), 0) as revenue
    FROM bookings
    GROUP BY delivery_model
  `).all();

  const totalNonCancelled = (db.prepare("SELECT COUNT(*) as cnt FROM bookings WHERE status != 'CANCELLED'").get() as { cnt: number }).cnt;
  const successRate = totalNonCancelled > 0 ? Math.round((completedDeliveries / totalNonCancelled) * 1000) / 10 : 100;

  res.json({
    stats: {
      totalUsers,
      totalPartners,
      totalParcels,
      activeDeliveries,
      completedDeliveries,
      grossRevenue: Math.round(revenueRow.gross * 100) / 100,
      platformRevenue: Math.round(revenueRow.commission * 100) / 100,
      partnerEarnings: Math.round(revenueRow.partnerTotal * 100) / 100,
      securityAlertsOpen,
      pendingDisputes,
      successRate
    },
    analytics: {
      modeDistribution,
      modelDistribution
    }
  });
});

app.get('/api/admin/users', requireAuth, requireRole('admin'), (_req, res) => {
  const users = db.prepare(`
    SELECT u.id, u.name, u.email, u.mobile, u.role, u.can_deliver, u.verification_status, u.rating, u.created_at,
           pp.primary_mode, pp.vehicle_number, pp.reliability_score, pp.completed_deliveries
    FROM users u
    LEFT JOIN partner_profiles pp ON pp.user_id = u.id
    ORDER BY u.created_at DESC
  `).all();
  res.json({ users });
});

app.patch('/api/admin/users/:id/status', requireAuth, requireRole('admin'), (req, res) => {
  const userId = Number(req.params.id);
  const { verificationStatus } = req.body as { verificationStatus?: 'VERIFIED' | 'PENDING' | 'SUSPENDED' };
  if (!verificationStatus || !['VERIFIED', 'PENDING', 'SUSPENDED'].includes(verificationStatus)) {
    res.status(400).json({ error: 'Invalid verification status.' });
    return;
  }
  db.prepare('UPDATE users SET verification_status = ? WHERE id = ?').run(verificationStatus, userId);
  res.json({ updated: true });
});

app.get('/api/admin/parcels', requireAuth, requireRole('admin'), (_req, res) => {
  const parcels = db.prepare(`
    SELECT b.*, s.name as sender_name, p.name as partner_name
    FROM bookings b
    JOIN users s ON s.id = b.sender_id
    LEFT JOIN users p ON p.id = b.partner_id
    ORDER BY b.created_at DESC
  `).all();
  res.json({ parcels });
});

app.get('/api/admin/guard-alerts', requireAuth, requireRole('admin'), (_req, res) => {
  const alerts = db.prepare(`
    SELECT sa.*, b.parcel_code, b.declared_contents, b.declared_value, b.weight_kg,
           b.transport_mode, b.pickup_location, b.destination_location, b.status as booking_status,
           u.name as sender_name, u.email as sender_email
    FROM security_alerts sa
    JOIN bookings b ON b.id = sa.booking_id
    JOIN users u ON u.id = sa.user_id
    ORDER BY sa.created_at DESC
  `).all();
  res.json({ alerts });
});

app.post('/api/admin/guard-alerts/:id/decision', requireAuth, requireRole('admin'), (req: AuthedRequest, res) => {
  const alertId = Number(req.params.id);
  const { decision, note = '' } = req.body as {
    decision?: 'APPROVED' | 'REJECTED' | 'INFO_REQUESTED' | 'ESCALATED';
    note?: string;
  };

  if (!decision || !['APPROVED', 'REJECTED', 'INFO_REQUESTED', 'ESCALATED'].includes(decision)) {
    res.status(400).json({ error: 'Valid decision is required.' });
    return;
  }

  const alert = db.prepare('SELECT * FROM security_alerts WHERE id = ?').get(alertId) as Record<string, unknown> | undefined;
  if (!alert) {
    res.status(404).json({ error: 'Security alert not found.' });
    return;
  }

  db.transaction(() => {
    db.prepare(`
      UPDATE security_alerts
      SET status = ?, admin_decision_note = ?, reviewed_by = ?, updated_at = datetime('now')
      WHERE id = ?
    `).run(decision, note, req.user!.id, alertId);

    const booking = db.prepare('SELECT * FROM bookings WHERE id = ?').get(alert.booking_id) as Record<string, unknown>;
    if (decision === 'APPROVED') {
      db.prepare("UPDATE bookings SET status = 'MATCHING', guard_classification = 'PERMITTED', updated_at = datetime('now') WHERE id = ?").run(alert.booking_id);
      db.prepare(`
        INSERT INTO tracking_events (booking_id, status, title, description, location_name, lat, lng, actor_name, is_simulated_gps)
        VALUES (?, 'APPROVED', 'MOVEX Guard Approved by Admin', ?, ?, ?, ?, ?, 0)
      `).run(alert.booking_id, note || 'Administrator cleared parcel for matching.', booking.pickup_location, booking.pickup_lat, booking.pickup_lng, req.user!.name);
    } else if (decision === 'REJECTED') {
      db.prepare("UPDATE bookings SET status = 'REJECTED', updated_at = datetime('now') WHERE id = ?").run(alert.booking_id);
      db.prepare("UPDATE payments SET status = 'REFUNDED' WHERE booking_id = ? AND status = 'COMPLETED'").run(alert.booking_id);
      db.prepare(`
        INSERT INTO tracking_events (booking_id, status, title, description, location_name, lat, lng, actor_name, is_simulated_gps)
        VALUES (?, 'REJECTED', 'Rejected by MOVEX Guard Review', ?, ?, ?, ?, ?, 0)
      `).run(alert.booking_id, note || 'Booking rejected during safety review; simulated refund issued.', booking.pickup_location, booking.pickup_lat, booking.pickup_lng, req.user!.name);
    }

    db.prepare(`
      INSERT INTO notifications (user_id, title, message, type)
      VALUES (?, ?, ?, ?)
    `).run(
      alert.user_id,
      `MOVEX Guard Decision: ${decision}`,
      `Parcel #${alert.booking_id}: ${note || `Status updated to ${decision}.`}`,
      decision === 'APPROVED' ? 'success' : 'warning'
    );
  })();

  res.json({ updated: true });
});

app.get('/api/admin/payments', requireAuth, requireRole('admin'), (_req, res) => {
  const payments = db.prepare(`
    SELECT p.*, b.parcel_code, s.name as sender_name, pr.name as partner_name
    FROM payments p
    JOIN bookings b ON b.id = p.booking_id
    JOIN users s ON s.id = p.sender_id
    LEFT JOIN users pr ON pr.id = p.partner_id
    ORDER BY p.created_at DESC
  `).all();
  res.json({ payments });
});

app.post('/api/admin/payments/:id/refund', requireAuth, requireRole('admin'), (req, res) => {
  const paymentId = Number(req.params.id);
  const pay = db.prepare('SELECT * FROM payments WHERE id = ?').get(paymentId) as Record<string, unknown> | undefined;
  if (!pay) {
    res.status(404).json({ error: 'Payment not found.' });
    return;
  }
  db.prepare("UPDATE payments SET status = 'REFUNDED' WHERE id = ?").run(paymentId);
  res.json({ refunded: true });
});

app.get('/api/admin/disputes', requireAuth, requireRole('admin'), (_req, res) => {
  const disputes = db.prepare(`
    SELECT d.*, b.parcel_code, b.total_price, u.name as raised_by_name
    FROM disputes d
    JOIN bookings b ON b.id = d.booking_id
    JOIN users u ON u.id = d.raised_by_id
    ORDER BY d.created_at DESC
  `).all();
  res.json({ disputes });
});

app.post('/api/admin/disputes/:id/resolve', requireAuth, requireRole('admin'), (req, res) => {
  const disputeId = Number(req.params.id);
  const { resolution, note = '' } = req.body as { resolution?: 'RESOLVED_REFUND' | 'RESOLVED_RELEASE'; note?: string };
  if (!resolution || !['RESOLVED_REFUND', 'RESOLVED_RELEASE'].includes(resolution)) {
    res.status(400).json({ error: 'Valid resolution required.' });
    return;
  }

  const dispute = db.prepare('SELECT * FROM disputes WHERE id = ?').get(disputeId) as Record<string, unknown> | undefined;
  if (!dispute) {
    res.status(404).json({ error: 'Dispute not found.' });
    return;
  }

  db.transaction(() => {
    db.prepare("UPDATE disputes SET status = ?, resolution_note = ?, updated_at = datetime('now') WHERE id = ?").run(resolution, note, disputeId);
    if (resolution === 'RESOLVED_REFUND') {
      db.prepare("UPDATE payments SET status = 'REFUNDED' WHERE booking_id = ?").run(dispute.booking_id);
      db.prepare("UPDATE bookings SET status = 'CANCELLED', updated_at = datetime('now') WHERE id = ?").run(dispute.booking_id);
    } else {
      db.prepare("UPDATE payments SET status = 'COMPLETED' WHERE booking_id = ?").run(dispute.booking_id);
      db.prepare("UPDATE bookings SET status = 'DELIVERED', updated_at = datetime('now') WHERE id = ?").run(dispute.booking_id);
    }
  })();

  res.json({ resolved: true });
});

app.put('/api/admin/pricing/:mode', requireAuth, requireRole('admin'), (req, res) => {
  const mode = req.params.mode;
  const { baseFare, perKmRate, perKgRate } = req.body as { baseFare?: number; perKmRate?: number; perKgRate?: number };
  db.prepare(`
    UPDATE pricing_configs
    SET base_fare = COALESCE(?, base_fare),
        per_km_rate = COALESCE(?, per_km_rate),
        per_kg_rate = COALESCE(?, per_kg_rate)
    WHERE mode = ?
  `).run(baseFare ?? null, perKmRate ?? null, perKgRate ?? null, mode);
  res.json({ updated: true, configs: getAllPricingConfigs() });
});

// ========================
// NOTIFICATIONS
// ========================
app.get('/api/notifications', requireAuth, (req: AuthedRequest, res) => {
  const notifications = db.prepare('SELECT * FROM notifications WHERE user_id = ? ORDER BY created_at DESC LIMIT 30').all(req.user!.id);
  res.json({ notifications });
});

app.post('/api/notifications/read-all', requireAuth, (req: AuthedRequest, res) => {
  db.prepare('UPDATE notifications SET is_read = 1 WHERE user_id = ?').run(req.user!.id);
  res.json({ ok: true });
});

// Helper functions
function getEnrichedBooking(bookingId: number) {
  const booking = db.prepare(`
    SELECT b.*, s.name as sender_name, s.mobile as sender_mobile,
           p.name as partner_name, p.mobile as partner_mobile,
           pp.vehicle_number as partner_vehicle, pp.reliability_score as partner_reliability
    FROM bookings b
    JOIN users s ON s.id = b.sender_id
    LEFT JOIN users p ON p.id = b.partner_id
    LEFT JOIN partner_profiles pp ON pp.user_id = b.partner_id
    WHERE b.id = ?
  `).get(bookingId) as Record<string, unknown> | undefined;

  if (!booking) return null;

  const trackingEvents = db.prepare('SELECT * FROM tracking_events WHERE booking_id = ? ORDER BY created_at ASC, id ASC').all(bookingId);
  const payment = db.prepare('SELECT * FROM payments WHERE booking_id = ? ORDER BY created_at DESC LIMIT 1').get(bookingId);
  const disputes = db.prepare('SELECT * FROM disputes WHERE booking_id = ? ORDER BY created_at DESC').all(bookingId);
  const securityAlerts = db.prepare('SELECT * FROM security_alerts WHERE booking_id = ? ORDER BY created_at DESC').all(bookingId);

  return {
    ...booking,
    trackingEvents,
    payment: payment || null,
    disputes,
    securityAlerts
  };
}

function getPartnerMatchingRequests(partnerId: number) {
  const partnerJourneys = db.prepare(`
    SELECT * FROM journeys WHERE partner_id = ? AND status = 'ACTIVE' AND available_capacity_count >= 1
  `).all(partnerId) as Array<Record<string, unknown>>;

  const partnerProfile = db.prepare('SELECT * FROM partner_profiles WHERE user_id = ?').get(partnerId) as Record<string, unknown> | undefined;

  const openBookings = db.prepare(`
    SELECT b.*, u.name as sender_name
    FROM bookings b
    JOIN users u ON u.id = b.sender_id
    WHERE b.partner_id IS NULL
      AND b.sender_id != ?
      AND b.status IN ('APPROVED', 'MATCHING')
      AND b.guard_classification = 'PERMITTED'
      AND b.id NOT IN (SELECT booking_id FROM booking_rejections WHERE partner_id = ?)
    ORDER BY b.created_at DESC
  `).all(partnerId, partnerId) as Array<Record<string, unknown>>;

  const results: Array<Record<string, unknown>> = [];

  for (const b of openBookings) {
    if (b.delivery_model === 'community_relay') {
      // Match against partner's active journeys
      let bestScore = 0;
      let bestJourney: Record<string, unknown> | null = null;
      for (const j of partnerJourneys) {
        if (Number(j.max_weight_kg) < Number(b.weight_kg)) continue;
        const origDev = haversineKm(Number(b.pickup_lat), Number(b.pickup_lng), Number(j.origin_lat), Number(j.origin_lng));
        const destDev = haversineKm(Number(b.destination_lat), Number(b.destination_lng), Number(j.dest_lat), Number(j.dest_lng));
        const score = Math.max(25, Math.min(99, Math.round(95 - (origDev + destDev) * 0.4 + (j.transport_mode === b.transport_mode ? 5 : 0))));
        if (score > bestScore) {
          bestScore = score;
          bestJourney = j;
        }
      }
      if (!bestJourney) continue;

      const suggestions = suggestSmartMeetingPoints({
        pickupLocation: String(b.pickup_location),
        pickupLat: Number(b.pickup_lat),
        pickupLng: Number(b.pickup_lng),
        destinationLocation: String(b.destination_location),
        destLat: Number(b.destination_lat),
        destLng: Number(b.destination_lng),
        deliveryModel: 'community_relay'
      });

      results.push({
        ...b,
        matchedJourneyId: bestJourney.id,
        matchedJourneyLabel: `${bestJourney.origin_name} → ${bestJourney.dest_name}`,
        compatibilityScore: bestScore,
        suggestedPickup: b.pickup_meeting_point || suggestions.pickupSuggestions[0]?.name || b.pickup_location,
        suggestedDropoff: b.dropoff_meeting_point || suggestions.dropoffSuggestions[0]?.name || b.destination_location
      });
    } else {
      // Premium Express broadcast eligible to verified available partners with capacity
      if (partnerProfile && Number(partnerProfile.is_available) === 1 && Number(partnerProfile.max_weight_kg) >= Number(b.weight_kg)) {
        results.push({
          ...b,
          matchedJourneyId: null,
          matchedJourneyLabel: 'Dedicated Premium Express',
          compatibilityScore: 92,
          suggestedPickup: `Doorstep: ${b.pickup_location}`,
          suggestedDropoff: `Doorstep: ${b.destination_location}`
        });
      }
    }
  }

  return results.sort((a, b) => Number(b.compatibilityScore) - Number(a.compatibilityScore));
}

// ========================
// VITE / STATIC SERVING
// ========================
async function startServer() {
  if (process.env.NODE_ENV !== 'production') {
    const { createServer: createViteServer } = await import('vite');
    const vite = await createViteServer({
      server: { middlewareMode: true },
      appType: 'spa'
    });
    app.use(vite.middlewares);
  } else {
    const distPath = path.resolve(process.cwd(), 'dist');
    app.use(express.static(distPath));
    app.get('*', (_req, res) => {
      res.sendFile(path.join(distPath, 'index.html'));
    });
  }

  app.listen(PORT, '0.0.0.0', () => {
    console.log(`MOVEX Full-Stack Server running on http://localhost:${PORT}`);
  });
}

startServer();
