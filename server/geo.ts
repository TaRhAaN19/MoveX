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

const KNOWN_LOCATIONS: Array<{ keys: string[]; name: string; displayName: string; lat: number; lng: number }> = [
  { keys: ['panaji', 'panjim', 'panaji goa'], name: 'Panaji, Goa', displayName: 'Panaji, North Goa, Goa, India', lat: 15.4909, lng: 73.8278 },
  { keys: ['margao', 'madgaon', 'margao goa'], name: 'Margao, Goa', displayName: 'Margao, South Goa, Goa, India', lat: 15.2832, lng: 73.9862 },
  { keys: ['vasco', 'vasco da gama', 'mormugao'], name: 'Vasco da Gama, Goa', displayName: 'Vasco da Gama, South Goa, Goa, India', lat: 15.3982, lng: 73.8113 },
  { keys: ['mapusa', 'mapuca', 'mapusa goa'], name: 'Mapusa, Goa', displayName: 'Mapusa, North Goa, Goa, India', lat: 15.5937, lng: 73.8142 },
  { keys: ['ponda', 'ponda goa'], name: 'Ponda, Goa', displayName: 'Ponda, North Goa, Goa, India', lat: 15.4027, lng: 74.0078 },
  { keys: ['porvorim', 'alto porvorim'], name: 'Porvorim, Goa', displayName: 'Porvorim, North Goa, Goa, India', lat: 15.5349, lng: 73.8315 },
  { keys: ['calangute'], name: 'Calangute, Goa', displayName: 'Calangute, North Goa, Goa, India', lat: 15.5440, lng: 73.7553 },
  { keys: ['candolim'], name: 'Candolim, Goa', displayName: 'Candolim, North Goa, Goa, India', lat: 15.5180, lng: 73.7626 },
  { keys: ['old goa', 'velha goa'], name: 'Old Goa, Goa', displayName: 'Old Goa, North Goa, Goa, India', lat: 15.5009, lng: 73.9116 },
  { keys: ['verna', 'verna industrial'], name: 'Verna, Goa', displayName: 'Verna, South Goa, Goa, India', lat: 15.3676, lng: 73.9306 },
  { keys: ['dabolim', 'goa airport', 'dabolim airport'], name: 'Dabolim Airport, Goa', displayName: 'Goa International Airport, Dabolim, Goa', lat: 15.3808, lng: 73.8314 },
  { keys: ['mopa', 'manohar airport', 'mopa airport'], name: 'Mopa Airport, Goa', displayName: 'Manohar International Airport, Mopa, Goa', lat: 15.7311, lng: 73.8689 },
  { keys: ['bicholim'], name: 'Bicholim, Goa', displayName: 'Bicholim, North Goa, Goa, India', lat: 15.5983, lng: 73.9491 },
  { keys: ['curchorem'], name: 'Curchorem, Goa', displayName: 'Curchorem, South Goa, Goa, India', lat: 15.2615, lng: 74.1095 },
  { keys: ['canacona', 'chaudi'], name: 'Canacona, Goa', displayName: 'Canacona, South Goa, Goa, India', lat: 15.0172, lng: 74.0279 },
  { keys: ['pernem'], name: 'Pernem, Goa', displayName: 'Pernem, North Goa, Goa, India', lat: 15.7224, lng: 73.7979 },
  { keys: ['mumbai', 'bombay'], name: 'Mumbai, Maharashtra', displayName: 'Mumbai, Maharashtra, India', lat: 19.0760, lng: 72.8777 },
  { keys: ['pune'], name: 'Pune, Maharashtra', displayName: 'Pune, Maharashtra, India', lat: 18.5204, lng: 73.8567 },
  { keys: ['bengaluru', 'bangalore'], name: 'Bengaluru, Karnataka', displayName: 'Bengaluru, Karnataka, India', lat: 12.9716, lng: 77.5946 },
  { keys: ['belagavi', 'belgaum'], name: 'Belagavi, Karnataka', displayName: 'Belagavi, Karnataka, India', lat: 15.8497, lng: 74.4977 },
  { keys: ['karwar'], name: 'Karwar, Karnataka', displayName: 'Karwar, Uttara Kannada, Karnataka, India', lat: 14.8185, lng: 74.1416 },
  { keys: ['mangalore', 'mangaluru'], name: 'Mangaluru, Karnataka', displayName: 'Mangaluru, Karnataka, India', lat: 12.9141, lng: 74.8560 },
  { keys: ['hyderabad'], name: 'Hyderabad, Telangana', displayName: 'Hyderabad, Telangana, India', lat: 17.3850, lng: 78.4867 },
  { keys: ['delhi', 'new delhi'], name: 'New Delhi, Delhi', displayName: 'New Delhi, Delhi, India', lat: 28.6139, lng: 77.2090 },
  { keys: ['chennai'], name: 'Chennai, Tamil Nadu', displayName: 'Chennai, Tamil Nadu, India', lat: 13.0827, lng: 80.2707 }
];

export function haversineKm(lat1: number, lng1: number, lat2: number, lng2: number): number {
  const R = 6371;
  const dLat = ((lat2 - lat1) * Math.PI) / 180;
  const dLng = ((lng2 - lng1) * Math.PI) / 180;
  const a =
    Math.sin(dLat / 2) * Math.sin(dLat / 2) +
    Math.cos((lat1 * Math.PI) / 180) *
      Math.cos((lat2 * Math.PI) / 180) *
      Math.sin(dLng / 2) *
      Math.sin(dLng / 2);
  const c = 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1 - a));
  return R * c;
}

export async function searchLocations(query: string): Promise<GeoPoint[]> {
  const cleaned = query.trim().toLowerCase();
  if (!cleaned) return [];

  // Exact or prefix match in local high-reliability index first
  const localMatches: GeoPoint[] = KNOWN_LOCATIONS.filter(
    (loc) =>
      loc.keys.some((k) => k.includes(cleaned) || cleaned.includes(k)) ||
      loc.name.toLowerCase().includes(cleaned)
  ).map((loc) => ({
    name: loc.name,
    displayName: loc.displayName,
    lat: loc.lat,
    lng: loc.lng,
    source: 'local_index'
  }));

  // Also query OpenStreetMap Nominatim for broader or street-level addresses
  try {
    const controller = new AbortController();
    const timer = setTimeout(() => controller.abort(), 3500);
    const url = `https://nominatim.openstreetmap.org/search?format=json&limit=5&countrycodes=in&q=${encodeURIComponent(query)}`;
    const res = await fetch(url, {
      signal: controller.signal,
      headers: { 'User-Agent': 'MOVEX-Parcel-Platform/1.0' }
    });
    clearTimeout(timer);

    if (res.ok) {
      const items = (await res.json()) as Array<{ display_name: string; lat: string; lon: string }>;
      const osmMatches: GeoPoint[] = items.map((it) => {
        const shortName = it.display_name.split(',').slice(0, 2).join(',').trim();
        return {
          name: shortName || it.display_name,
          displayName: it.display_name,
          lat: parseFloat(it.lat),
          lng: parseFloat(it.lon),
          source: 'nominatim'
        };
      });

      // Deduplicate keeping local matches first if same area
      const combined = [...localMatches];
      for (const om of osmMatches) {
        const duplicate = combined.some((cm) => haversineKm(cm.lat, cm.lng, om.lat, om.lng) < 2.0);
        if (!duplicate) combined.push(om);
      }
      return combined.slice(0, 6);
    }
  } catch {
    // Graceful fallback to local index if Nominatim times out or offline
  }

  return localMatches.slice(0, 6);
}

export async function geocodeSingle(query: string): Promise<GeoPoint | null> {
  const results = await searchLocations(query);
  return results.length > 0 ? results[0] : null;
}

export async function reverseGeocode(lat: number, lng: number): Promise<string> {
  // Check nearest known location within 3km first
  let closestName = '';
  let minKm = 99999;
  for (const loc of KNOWN_LOCATIONS) {
    const d = haversineKm(lat, lng, loc.lat, loc.lng);
    if (d < minKm) {
      minKm = d;
      closestName = loc.name;
    }
  }

  try {
    const controller = new AbortController();
    const timer = setTimeout(() => controller.abort(), 3000);
    const url = `https://nominatim.openstreetmap.org/reverse?format=json&lat=${lat}&lon=${lng}`;
    const res = await fetch(url, {
      signal: controller.signal,
      headers: { 'User-Agent': 'MOVEX-Parcel-Platform/1.0' }
    });
    clearTimeout(timer);
    if (res.ok) {
      const data = (await res.json()) as { display_name?: string; address?: Record<string, string> };
      if (data.address) {
        const area = data.address.suburb || data.address.town || data.address.city || data.address.village || data.address.county;
        const state = data.address.state;
        if (area && state) return `${area}, ${state}`;
        if (area) return area;
      }
      if (data.display_name) {
        return data.display_name.split(',').slice(0, 2).join(',').trim();
      }
    }
  } catch {
    // Fall back to nearest known hub or coordinates
  }

  if (minKm < 8 && closestName) return `Near ${closestName}`;
  return `Pin (${lat.toFixed(4)}, ${lng.toFixed(4)})`;
}

export async function calculateRoute(
  pickupLat: number,
  pickupLng: number,
  destLat: number,
  destLng: number
): Promise<RouteResult> {
  try {
    const controller = new AbortController();
    const timer = setTimeout(() => controller.abort(), 4000);
    const url = `https://router.project-osrm.org/route/v1/driving/${pickupLng},${pickupLat};${destLng},${destLat}?overview=full&geometries=geojson`;
    const res = await fetch(url, { signal: controller.signal });
    clearTimeout(timer);

    if (res.ok) {
      const data = (await res.json()) as {
        code: string;
        routes?: Array<{
          distance: number;
          duration: number;
          geometry?: { coordinates: [number, number][] };
        }>;
      };
      if (data.code === 'Ok' && data.routes && data.routes.length > 0) {
        const route = data.routes[0];
        const coords: [number, number][] = (route.geometry?.coordinates || []).map(([lng, lat]) => [lat, lng]);
        return {
          distanceKm: Math.max(1, Math.round((route.distance / 1000) * 10) / 10),
          durationMins: Math.max(8, Math.round(route.duration / 60)),
          coordinates: coords.length >= 2 ? coords : [[pickupLat, pickupLng], [destLat, destLng]],
          source: 'osrm'
        };
      }
    }
  } catch {
    // OSRM fallback below
  }

  const straightKm = haversineKm(pickupLat, pickupLng, destLat, destLng);
  const roadKm = Math.max(1, Math.round(straightKm * 1.28 * 10) / 10);
  const durationMins = Math.max(10, Math.round((roadKm / 36) * 60));

  // Generate clean interpolated waypoints for fallback polyline
  const midLat = (pickupLat + destLat) / 2 + (destLng - pickupLng) * 0.03;
  const midLng = (pickupLng + destLng) / 2 - (destLat - pickupLat) * 0.03;

  return {
    distanceKm: roadKm,
    durationMins,
    coordinates: [
      [pickupLat, pickupLng],
      [midLat, midLng],
      [destLat, destLng]
    ],
    source: 'haversine_fallback'
  };
}
