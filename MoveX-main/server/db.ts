import Database from 'better-sqlite3';
import bcrypt from 'bcryptjs';
import path from 'path';

const dbPath = path.resolve(process.cwd(), 'movex.db');
export const db = new Database(dbPath);

db.pragma('journal_mode = WAL');
db.pragma('foreign_keys = ON');

export function initDatabase() {
  db.exec(`
    CREATE TABLE IF NOT EXISTS users (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      name TEXT NOT NULL,
      email TEXT UNIQUE NOT NULL,
      mobile TEXT NOT NULL,
      password_hash TEXT NOT NULL,
      role TEXT NOT NULL CHECK(role IN ('sender', 'partner', 'admin')),
      can_deliver INTEGER NOT NULL DEFAULT 0,
      verification_status TEXT NOT NULL DEFAULT 'VERIFIED' CHECK(verification_status IN ('VERIFIED', 'PENDING', 'SUSPENDED')),
      rating REAL NOT NULL DEFAULT 4.8,
      created_at TEXT NOT NULL DEFAULT (datetime('now'))
    );

    CREATE TABLE IF NOT EXISTS partner_profiles (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      user_id INTEGER UNIQUE NOT NULL,
      primary_mode TEXT NOT NULL DEFAULT 'bike',
      vehicle_number TEXT DEFAULT '',
      license_verified INTEGER NOT NULL DEFAULT 1,
      max_weight_kg REAL NOT NULL DEFAULT 5.0,
      preferred_corridors TEXT DEFAULT 'Panaji - Margao, Vasco - Mapusa',
      completed_deliveries INTEGER NOT NULL DEFAULT 0,
      on_time_deliveries INTEGER NOT NULL DEFAULT 0,
      cancellations INTEGER NOT NULL DEFAULT 0,
      verified_complaints INTEGER NOT NULL DEFAULT 0,
      handover_compliance_rate REAL NOT NULL DEFAULT 98.0,
      reliability_score REAL NOT NULL DEFAULT 94.0,
      is_available INTEGER NOT NULL DEFAULT 1,
      updated_at TEXT NOT NULL DEFAULT (datetime('now')),
      FOREIGN KEY (user_id) REFERENCES users(id) ON DELETE CASCADE
    );

    CREATE TABLE IF NOT EXISTS pricing_configs (
      mode TEXT PRIMARY KEY,
      display_name TEXT NOT NULL,
      base_fare REAL NOT NULL,
      per_km_rate REAL NOT NULL,
      per_kg_rate REAL NOT NULL,
      volumetric_divisor REAL NOT NULL,
      min_eta_mins INTEGER NOT NULL,
      avg_speed_kmh REAL NOT NULL,
      max_weight_kg REAL NOT NULL,
      max_length_cm REAL NOT NULL,
      max_width_cm REAL NOT NULL,
      max_height_cm REAL NOT NULL,
      integration_status TEXT NOT NULL,
      restrictions_summary TEXT NOT NULL,
      is_active INTEGER NOT NULL DEFAULT 1
    );

    CREATE TABLE IF NOT EXISTS journeys (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      partner_id INTEGER NOT NULL,
      origin_name TEXT NOT NULL,
      origin_lat REAL NOT NULL,
      origin_lng REAL NOT NULL,
      dest_name TEXT NOT NULL,
      dest_lat REAL NOT NULL,
      dest_lng REAL NOT NULL,
      travel_date TEXT NOT NULL,
      departure_time TEXT NOT NULL,
      expected_arrival TEXT NOT NULL,
      transport_mode TEXT NOT NULL,
      available_capacity_count INTEGER NOT NULL DEFAULT 2,
      max_weight_kg REAL NOT NULL DEFAULT 5.0,
      preferred_meeting_points TEXT NOT NULL DEFAULT '',
      is_recurring INTEGER NOT NULL DEFAULT 0,
      recurrence_rule TEXT DEFAULT '',
      status TEXT NOT NULL DEFAULT 'ACTIVE' CHECK(status IN ('ACTIVE', 'PAUSED', 'COMPLETED', 'CANCELLED')),
      declaration_confirmed INTEGER NOT NULL DEFAULT 1,
      created_at TEXT NOT NULL DEFAULT (datetime('now')),
      FOREIGN KEY (partner_id) REFERENCES users(id) ON DELETE CASCADE
    );

    CREATE TABLE IF NOT EXISTS bookings (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      parcel_code TEXT UNIQUE NOT NULL,
      sender_id INTEGER NOT NULL,
      partner_id INTEGER,
      journey_id INTEGER,
      delivery_model TEXT NOT NULL CHECK(delivery_model IN ('community_relay', 'premium_express')),
      transport_mode TEXT NOT NULL CHECK(transport_mode IN ('bike', 'car', 'bus', 'train', 'flight', 'freight')),
      urgency TEXT NOT NULL DEFAULT 'standard' CHECK(urgency IN ('standard', 'express', 'priority')),
      pickup_location TEXT NOT NULL,
      pickup_lat REAL NOT NULL,
      pickup_lng REAL NOT NULL,
      destination_location TEXT NOT NULL,
      destination_lat REAL NOT NULL,
      destination_lng REAL NOT NULL,
      distance_km REAL NOT NULL,
      eta_minutes INTEGER NOT NULL,
      eta_label TEXT NOT NULL,
      parcel_category TEXT NOT NULL,
      weight_kg REAL NOT NULL,
      length_cm REAL NOT NULL,
      width_cm REAL NOT NULL,
      height_cm REAL NOT NULL,
      declared_contents TEXT NOT NULL,
      declared_value REAL NOT NULL,
      is_fragile INTEGER NOT NULL DEFAULT 0,
      packaging_type TEXT NOT NULL DEFAULT 'Cardboard Box',
      parcel_photo_url TEXT DEFAULT '',
      policy_accepted INTEGER NOT NULL DEFAULT 1,
      guard_classification TEXT NOT NULL DEFAULT 'PERMITTED',
      guard_notes TEXT DEFAULT '',
      pickup_meeting_point TEXT DEFAULT '',
      dropoff_meeting_point TEXT DEFAULT '',
      meeting_agreed_by_sender INTEGER NOT NULL DEFAULT 1,
      meeting_agreed_by_partner INTEGER NOT NULL DEFAULT 0,
      base_fare REAL NOT NULL,
      distance_charge REAL NOT NULL,
      weight_charge REAL NOT NULL,
      dimension_charge REAL NOT NULL,
      model_charge REAL NOT NULL,
      urgency_charge REAL NOT NULL,
      platform_fee REAL NOT NULL,
      total_price REAL NOT NULL,
      partner_earning REAL NOT NULL,
      platform_commission REAL NOT NULL,
      status TEXT NOT NULL DEFAULT 'CREATED',
      pickup_otp TEXT NOT NULL,
      handover_otp TEXT NOT NULL,
      delivery_otp TEXT NOT NULL,
      current_lat REAL,
      current_lng REAL,
      route_deviation_alert INTEGER NOT NULL DEFAULT 0,
      created_at TEXT NOT NULL DEFAULT (datetime('now')),
      updated_at TEXT NOT NULL DEFAULT (datetime('now')),
      FOREIGN KEY (sender_id) REFERENCES users(id),
      FOREIGN KEY (partner_id) REFERENCES users(id),
      FOREIGN KEY (journey_id) REFERENCES journeys(id)
    );

    CREATE TABLE IF NOT EXISTS booking_rejections (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      booking_id INTEGER NOT NULL,
      partner_id INTEGER NOT NULL,
      reason TEXT DEFAULT '',
      created_at TEXT NOT NULL DEFAULT (datetime('now')),
      UNIQUE(booking_id, partner_id),
      FOREIGN KEY (booking_id) REFERENCES bookings(id) ON DELETE CASCADE,
      FOREIGN KEY (partner_id) REFERENCES users(id) ON DELETE CASCADE
    );

    CREATE TABLE IF NOT EXISTS tracking_events (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      booking_id INTEGER NOT NULL,
      status TEXT NOT NULL,
      title TEXT NOT NULL,
      description TEXT NOT NULL,
      location_name TEXT DEFAULT '',
      lat REAL,
      lng REAL,
      actor_name TEXT DEFAULT 'MOVEX System',
      is_simulated_gps INTEGER NOT NULL DEFAULT 0,
      created_at TEXT NOT NULL DEFAULT (datetime('now')),
      FOREIGN KEY (booking_id) REFERENCES bookings(id) ON DELETE CASCADE
    );

    CREATE TABLE IF NOT EXISTS security_alerts (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      booking_id INTEGER NOT NULL,
      user_id INTEGER NOT NULL,
      risk_level TEXT NOT NULL CHECK(risk_level IN ('LOW', 'MEDIUM', 'HIGH', 'CRITICAL')),
      classification TEXT NOT NULL,
      reasons_json TEXT NOT NULL,
      status TEXT NOT NULL DEFAULT 'OPEN' CHECK(status IN ('OPEN', 'APPROVED', 'REJECTED', 'INFO_REQUESTED', 'ESCALATED')),
      admin_decision_note TEXT DEFAULT '',
      reviewed_by INTEGER,
      created_at TEXT NOT NULL DEFAULT (datetime('now')),
      updated_at TEXT NOT NULL DEFAULT (datetime('now')),
      FOREIGN KEY (booking_id) REFERENCES bookings(id) ON DELETE CASCADE,
      FOREIGN KEY (user_id) REFERENCES users(id)
    );

    CREATE TABLE IF NOT EXISTS payments (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      booking_id INTEGER NOT NULL,
      sender_id INTEGER NOT NULL,
      partner_id INTEGER,
      amount REAL NOT NULL,
      platform_commission REAL NOT NULL,
      partner_earning REAL NOT NULL,
      method TEXT NOT NULL DEFAULT 'UPI Demo',
      transaction_ref TEXT NOT NULL,
      status TEXT NOT NULL DEFAULT 'PENDING' CHECK(status IN ('PENDING', 'COMPLETED', 'ON_HOLD', 'REFUNDED', 'PARTIAL_REFUND')),
      is_simulated INTEGER NOT NULL DEFAULT 1,
      created_at TEXT NOT NULL DEFAULT (datetime('now')),
      FOREIGN KEY (booking_id) REFERENCES bookings(id) ON DELETE CASCADE
    );

    CREATE TABLE IF NOT EXISTS disputes (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      booking_id INTEGER NOT NULL,
      raised_by_id INTEGER NOT NULL,
      reason TEXT NOT NULL,
      description TEXT NOT NULL,
      status TEXT NOT NULL DEFAULT 'OPEN' CHECK(status IN ('OPEN', 'UNDER_REVIEW', 'RESOLVED_REFUND', 'RESOLVED_RELEASE')),
      resolution_note TEXT DEFAULT '',
      created_at TEXT NOT NULL DEFAULT (datetime('now')),
      updated_at TEXT NOT NULL DEFAULT (datetime('now')),
      FOREIGN KEY (booking_id) REFERENCES bookings(id) ON DELETE CASCADE,
      FOREIGN KEY (raised_by_id) REFERENCES users(id)
    );

    CREATE TABLE IF NOT EXISTS notifications (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      user_id INTEGER NOT NULL,
      title TEXT NOT NULL,
      message TEXT NOT NULL,
      type TEXT NOT NULL DEFAULT 'info',
      is_read INTEGER NOT NULL DEFAULT 0,
      created_at TEXT NOT NULL DEFAULT (datetime('now')),
      FOREIGN KEY (user_id) REFERENCES users(id) ON DELETE CASCADE
    );
  `);

  seedInitialData();
}

function seedInitialData() {
  const configCount = db.prepare('SELECT COUNT(*) as cnt FROM pricing_configs').get() as { cnt: number };
  if (configCount.cnt === 0) {
    const insertCfg = db.prepare(`
      INSERT INTO pricing_configs (
        mode, display_name, base_fare, per_km_rate, per_kg_rate, volumetric_divisor,
        min_eta_mins, avg_speed_kmh, max_weight_kg, max_length_cm, max_width_cm, max_height_cm,
        integration_status, restrictions_summary, is_active
      ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, 1)
    `);

    insertCfg.run(
      'bike', 'Bike', 30, 3.2, 5.0, 5000,
      25, 32, 5.0, 35, 28, 25,
      'Live Partner Network',
      'Local & short-corridor trips. Fits backpack/top-box up to 5 kg (35×28×25 cm).'
    );
    insertCfg.run(
      'car', 'Car', 50, 4.8, 7.5, 5000,
      30, 42, 15.0, 75, 55, 45,
      'Live Partner Network',
      'Flexible city & regional routes. Trunk capacity up to 15 kg.'
    );
    insertCfg.run(
      'bus', 'Bus', 40, 2.2, 6.0, 5000,
      60, 48, 15.0, 70, 50, 45,
      'Simulated Operator Workflow',
      'Intercity coach luggage bay. Respects state/private operator manifest rules.'
    );
    insertCfg.run(
      'train', 'Train', 60, 1.8, 6.5, 5000,
      75, 62, 15.0, 80, 60, 50,
      'Simulated Railway Parcel Workflow',
      'Station-to-station rail relay. Subject to Indian Railways parcel guidelines.'
    );
    insertCfg.run(
      'flight', 'Flight', 150, 3.8, 22.0, 4000,
      90, 520, 15.0, 60, 45, 40,
      'Simulated Air Cargo Workflow',
      'Strict DGCA/airline screening: no loose lithium batteries, aerosols, or liquids >100 ml.'
    );
    insertCfg.run(
      'freight', 'Commercial Freight', 100, 4.2, 11.0, 4000,
      90, 40, 15.0, 110, 80, 70,
      'Simulated Carrier Dispatch',
      'Commercial van/mini-truck consignment. Uses weight & volumetric volume pricing.'
    );
  }

  const userCount = db.prepare('SELECT COUNT(*) as cnt FROM users').get() as { cnt: number };
  if (userCount.cnt === 0) {
    const hash = bcrypt.hashSync('Movex@123', 10);
    const insertUser = db.prepare(`
      INSERT INTO users (name, email, mobile, password_hash, role, can_deliver, verification_status, rating)
      VALUES (?, ?, ?, ?, ?, ?, ?, ?)
    `);

    const senderRes = insertUser.run('Aarav Naik', 'sender@movex.demo', '+91 98230 11223', hash, 'sender', 1, 'VERIFIED', 4.9);
    const partner1Res = insertUser.run('Rohan Dessai', 'partner@movex.demo', '+91 98231 44556', hash, 'partner', 1, 'VERIFIED', 4.9);
    const partner2Res = insertUser.run('Priya Kamat', 'priya@movex.demo', '+91 98232 77889', hash, 'partner', 1, 'VERIFIED', 4.8);
    const partner3Res = insertUser.run('Vikram Sawant', 'vikram@movex.demo', '+91 98233 99001', hash, 'partner', 1, 'VERIFIED', 4.7);
    const adminRes = insertUser.run('Neha Fernandes', 'admin@movex.demo', '+91 98234 00112', hash, 'admin', 0, 'VERIFIED', 5.0);

    const senderId = Number(senderRes.lastInsertRowid);
    const partner1Id = Number(partner1Res.lastInsertRowid);
    const partner2Id = Number(partner2Res.lastInsertRowid);
    const partner3Id = Number(partner3Res.lastInsertRowid);
    const adminId = Number(adminRes.lastInsertRowid);

    const insertPartner = db.prepare(`
      INSERT INTO partner_profiles (
        user_id, primary_mode, vehicle_number, license_verified, max_weight_kg,
        preferred_corridors, completed_deliveries, on_time_deliveries, cancellations,
        verified_complaints, handover_compliance_rate, reliability_score, is_available
      ) VALUES (?, ?, ?, 1, ?, ?, ?, ?, ?, ?, ?, ?, 1)
    `);

    insertPartner.run(partner1Id, 'bike', 'GA-07-E-4821', 5.0, 'Panaji - Margao, Ponda - Panaji', 46, 44, 1, 0, 99.0, 96.5);
    insertPartner.run(partner2Id, 'car', 'GA-03-K-9104', 15.0, 'Vasco - Mapusa, Panaji - Mapusa', 62, 59, 2, 0, 98.0, 95.0);
    insertPartner.run(partner3Id, 'bus', 'GA-01-T-2209', 15.0, 'Panaji - Margao, Panaji - Mumbai', 34, 31, 1, 0, 96.5, 92.5);
    insertPartner.run(senderId, 'bike', 'GA-07-A-1190', 5.0, 'Panaji - Porvorim', 4, 4, 0, 0, 100.0, 92.0);

    const insertJourney = db.prepare(`
      INSERT INTO journeys (
        partner_id, origin_name, origin_lat, origin_lng, dest_name, dest_lat, dest_lng,
        travel_date, departure_time, expected_arrival, transport_mode,
        available_capacity_count, max_weight_kg, preferred_meeting_points,
        is_recurring, recurrence_rule, status, declaration_confirmed
      ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, 'ACTIVE', 1)
    `);

    const today = new Date().toISOString().slice(0, 10);
    const j1 = insertJourney.run(
      partner1Id,
      'Panaji, Goa', 15.4909, 73.8278,
      'Margao, Goa', 15.2832, 73.9862,
      today, '09:30', '10:45', 'bike',
      2, 5.0, 'Panaji Kadamba Bus Stand, Verna Highway Junction, Margao KTC Stand',
      1, 'Every Weekday (Mon-Fri)'
    );
    const j2 = insertJourney.run(
      partner2Id,
      'Vasco da Gama, Goa', 15.3982, 73.8113,
      'Mapusa, Goa', 15.5937, 73.8142,
      today, '11:00', '12:20', 'car',
      3, 15.0, 'Vasco Railway Station, Cortalim Junction, Panaji Circle, Mapusa Market Gate',
      1, 'Daily'
    );
    const j3 = insertJourney.run(
      partner3Id,
      'Ponda, Goa', 15.4027, 74.0078,
      'Panaji, Goa', 15.4909, 73.8278,
      today, '14:00', '15:00', 'bus',
      4, 15.0, 'Ponda Bus Stand, Old Goa Circle, Panaji Bus Terminus',
      1, 'Daily'
    );
    insertJourney.run(
      partner2Id,
      'Mapusa, Goa', 15.5937, 73.8142,
      'Margao, Goa', 15.2832, 73.9862,
      today, '16:30', '18:00', 'car',
      2, 12.0, 'Mapusa Friday Market, Porvorim Mall Junction, Margao Municipal Garden',
      0, ''
    );
    insertJourney.run(
      partner3Id,
      'Panaji, Goa', 15.4909, 73.8278,
      'Mumbai, Maharashtra', 19.0760, 72.8777,
      today, '20:00', '07:30', 'train',
      5, 15.0, 'Karmali Railway Station, Madgaon Junction, Dadar Terminus',
      1, 'Weekly (Fri & Sun)'
    );

    const insertBooking = db.prepare(`
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
      ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, 1, ?, ?, ?, ?, 1, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, 0)
    `);

    const b1 = insertBooking.run(
      'MVX-2026-1001', senderId, partner1Id, Number(j1.lastInsertRowid),
      'community_relay', 'bike', 'standard',
      'Panaji, Goa', 15.4909, 73.8278, 'Margao, Goa', 15.2832, 73.9862,
      33.4, 72, '1 hr 12 mins', 'S', 1.2, 24, 18, 12,
      'Signed architectural blueprints and paper folder', 1800, 0, 'Cardboard Tube & Paper Wrap', '',
      'PERMITTED', 'Standard paper/document parcel verified under Community Relay policy.',
      'Panaji Kadamba Bus Stand Gate 2', 'Margao KTC Stand Bay 4', 1,
      30, 106.88, 6.0, 2.0, 0, 0, 8, 152.88, 129.95, 22.93, 'IN_TRANSIT',
      '4821', '7319', '9054', 15.3910, 73.9040
    );

    const b2 = insertBooking.run(
      'MVX-2026-1002', senderId, partner2Id, Number(j2.lastInsertRowid),
      'community_relay', 'car', 'express',
      'Vasco da Gama, Goa', 15.3982, 73.8113, 'Mapusa, Goa', 15.5937, 73.8142,
      31.2, 58, '58 mins', 'M', 3.5, 36, 26, 20,
      'Bakery dry snacks & boxed sweets', 1200, 0, 'Cardboard Box', '',
      'PERMITTED', 'Food dry items in standard cardboard box permitted.',
      'Vasco Railway Station East Gate', 'Mapusa Market Circle', 1,
      50, 149.76, 26.25, 8.0, 0, 25, 13, 272.01, 231.21, 40.80, 'DELIVERED',
      '1192', '5531', '6408', 15.5937, 73.8142
    );

    const b3 = insertBooking.run(
      'MVX-2026-1003', senderId, null, null,
      'community_relay', 'bus', 'standard',
      'Ponda, Goa', 15.4027, 74.0078, 'Panaji, Goa', 15.4909, 73.8278,
      28.5, 65, '1 hr 5 mins', 'M', 4.0, 35, 25, 18,
      'Textbooks and study notebooks', 2200, 0, 'Paper-wrapped bundle', '',
      'PERMITTED', 'Educational books permitted across Bus Relay.',
      'Ponda Bus Stand Main Gate', 'Panaji Kadamba Bus Terminus', 0,
      40, 62.70, 24.0, 6.0, 0, 0, 8, 140.70, 119.60, 21.10, 'MATCHING',
      '3290', '8812', '7741', 15.4027, 74.0078
    );

    const b4 = insertBooking.run(
      'MVX-2026-1004', senderId, partner2Id, null,
      'premium_express', 'flight', 'priority',
      'Panaji, Goa', 15.4909, 73.8278, 'Mumbai, Maharashtra', 19.0760, 72.8777,
      430.0, 135, '2 hrs 15 mins', 'S', 1.8, 30, 22, 15,
      'Portable camera gimbal with lithium battery pack', 38000, 1, 'Padded Cardboard Box', '',
      'RESTRICTED', 'Air transport selected with lithium battery electronics & high declared value (>₹25,000). Flagged for MOVEX Guard review.',
      'Doorstep Pickup - Panaji Altinho', 'Doorstep Delivery - Bandra West, Mumbai', 1,
      150, 1634.0, 39.6, 12.0, 180, 60, 95, 2170.60, 1845.01, 325.59, 'DECLARED',
      '6104', '2093', '8472', 15.4909, 73.8278
    );

    const insertTrack = db.prepare(`
      INSERT INTO tracking_events (booking_id, status, title, description, location_name, lat, lng, actor_name, is_simulated_gps)
      VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?)
    `);

    insertTrack.run(Number(b1.lastInsertRowid), 'CREATED', 'Booking Created', 'Parcel MVX-2026-1001 registered by Aarav Naik.', 'Panaji, Goa', 15.4909, 73.8278, 'Aarav Naik', 0);
    insertTrack.run(Number(b1.lastInsertRowid), 'APPROVED', 'MOVEX Guard Cleared', 'Declaration verified as PERMITTED.', 'Panaji, Goa', 15.4909, 73.8278, 'MOVEX Guard', 0);
    insertTrack.run(Number(b1.lastInsertRowid), 'PARTNER_ASSIGNED', 'Partner Matched', 'Rohan Dessai accepted parcel on existing Bike journey.', 'Panaji Kadamba Bus Stand', 15.4922, 73.8350, 'Rohan Dessai', 0);
    insertTrack.run(Number(b1.lastInsertRowid), 'PICKED_UP', 'Pickup OTP Verified', 'Parcel handed over with OTP authentication.', 'Panaji Kadamba Bus Stand', 15.4922, 73.8350, 'Rohan Dessai', 0);
    insertTrack.run(Number(b1.lastInsertRowid), 'IN_TRANSIT', 'In Transit to Margao', 'Simulated GPS telemetry checkpoint near Verna plateau.', 'Verna, Goa', 15.3910, 73.9040, 'Simulated GPS Feed', 1);

    insertTrack.run(Number(b2.lastInsertRowid), 'CREATED', 'Booking Created', 'Parcel MVX-2026-1002 registered.', 'Vasco da Gama, Goa', 15.3982, 73.8113, 'Aarav Naik', 0);
    insertTrack.run(Number(b2.lastInsertRowid), 'PICKED_UP', 'Picked Up', 'Verified at Vasco Railway Station.', 'Vasco da Gama, Goa', 15.3982, 73.8113, 'Priya Kamat', 0);
    insertTrack.run(Number(b2.lastInsertRowid), 'DELIVERED', 'Delivered & Recipient OTP Verified', 'Handed over safely at Mapusa Market Circle.', 'Mapusa, Goa', 15.5937, 73.8142, 'Priya Kamat', 0);

    insertTrack.run(Number(b3.lastInsertRowid), 'MATCHING', 'Open for Relay Partners', 'Awaiting bus/car partner travelling Ponda to Panaji.', 'Ponda, Goa', 15.4027, 74.0078, 'MOVEX Intelligence', 0);

    const insertPay = db.prepare(`
      INSERT INTO payments (booking_id, sender_id, partner_id, amount, platform_commission, partner_earning, method, transaction_ref, status, is_simulated)
      VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, 1)
    `);
    insertPay.run(Number(b1.lastInsertRowid), senderId, partner1Id, 152.88, 22.93, 129.95, 'UPI Demo (Simulated)', 'SIM-TXN-884101', 'COMPLETED');
    insertPay.run(Number(b2.lastInsertRowid), senderId, partner2Id, 272.01, 40.80, 231.21, 'Card Demo (Simulated)', 'SIM-TXN-884092', 'COMPLETED');
    insertPay.run(Number(b3.lastInsertRowid), senderId, null, 140.70, 21.10, 119.60, 'UPI Demo (Simulated)', 'SIM-TXN-884118', 'COMPLETED');

    db.prepare(`
      INSERT INTO security_alerts (booking_id, user_id, risk_level, classification, reasons_json, status, admin_decision_note, reviewed_by)
      VALUES (?, ?, 'HIGH', 'RESTRICTED', ?, 'OPEN', '', NULL)
    `).run(
      Number(b4.lastInsertRowid),
      senderId,
      JSON.stringify([
        'Flight transport mode selected with declared battery/electronic equipment (lithium battery restrictions apply).',
        'Declared parcel value (₹38,000) exceeds standard ₹25,000 threshold and requires additional verification.',
        'Note: Classification is based solely on sender declaration and transport rules.'
      ])
    );

    db.prepare(`
      INSERT INTO notifications (user_id, title, message, type)
      VALUES (?, ?, ?, ?)
    `).run(adminId, 'MOVEX Guard Alert #1', 'Parcel MVX-2026-1004 requires restriction review for air cargo.', 'warning');

    db.prepare(`
      INSERT INTO notifications (user_id, title, message, type)
      VALUES (?, ?, ?, ?)
    `).run(partner3Id, 'New Matching Request', 'Parcel MVX-2026-1003 (Ponda → Panaji, 4 kg) matches your Bus journey.', 'info');
  }
}
