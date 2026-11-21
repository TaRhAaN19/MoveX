import { useEffect, useRef } from 'react';
import L from 'leaflet';
import type { MeetingPointSuggestion } from '../types/movex';

interface MovexMapProps {
  pickupLocation: string;
  pickupLatitude: number | null;
  pickupLongitude: number | null;
  destinationLocation: string;
  destinationLatitude: number | null;
  destinationLongitude: number | null;
  routeCoordinates?: [number, number][];
  liveLat?: number | null;
  liveLng?: number | null;
  meetingPoints?: MeetingPointSuggestion[];
  selectionMode?: 'none' | 'pickup' | 'destination';
  onMapClick?: (lat: number, lng: number) => void;
  heightClass?: string;
}

function createPinIcon(label: string, bg: string, textColor: string, borderColor: string) {
  return L.divIcon({
    className: 'movex-custom-pin',
    iconSize: [34, 42],
    iconAnchor: [17, 40],
    popupAnchor: [0, -36],
    html: `
      <div style="display:flex;flex-direction:column;align-items:center;">
        <div style="width:30px;height:30px;border-radius:9999px;background:${bg};color:${textColor};border:2.5px solid ${borderColor};display:flex;align-items:center;justify-content:center;font-weight:800;font-size:12px;font-family:'Plus Jakarta Sans',sans-serif;box-shadow:0 4px 12px rgba(16,17,20,0.28);">
          ${label}
        </div>
        <div style="width:2.5px;height:10px;background:${borderColor};margin-top:-1px;"></div>
      </div>
    `
  });
}

function createMeetingPinIcon() {
  return L.divIcon({
    className: 'movex-custom-pin',
    iconSize: [20, 20],
    iconAnchor: [10, 10],
    html: `<div style="width:14px;height:14px;border-radius:9999px;background:#FFFFFF;border:3px solid #101114;box-shadow:0 2px 6px rgba(0,0,0,0.25);"></div>`
  });
}

function createLiveGpsIcon() {
  return L.divIcon({
    className: 'movex-custom-pin',
    iconSize: [26, 26],
    iconAnchor: [13, 13],
    html: `<div style="width:22px;height:22px;border-radius:9999px;background:#FFD43B;border:3px solid #101114;display:flex;align-items:center;justify-content:center;font-size:10px;font-weight:800;box-shadow:0 3px 10px rgba(0,0,0,0.35);">●</div>`
  });
}

export default function MovexMap({
  pickupLocation,
  pickupLatitude,
  pickupLongitude,
  destinationLocation,
  destinationLatitude,
  destinationLongitude,
  routeCoordinates = [],
  liveLat,
  liveLng,
  meetingPoints = [],
  selectionMode = 'none',
  onMapClick,
  heightClass = 'h-72 md:h-80'
}: MovexMapProps) {
  const containerRef = useRef<HTMLDivElement | null>(null);
  const mapRef = useRef<L.Map | null>(null);
  const pickupMarkerRef = useRef<L.Marker | null>(null);
  const destMarkerRef = useRef<L.Marker | null>(null);
  const liveMarkerRef = useRef<L.Marker | null>(null);
  const polylineRef = useRef<L.Polyline | null>(null);
  const meetingLayerRef = useRef<L.LayerGroup | null>(null);
  const onMapClickRef = useRef(onMapClick);
  const selectionModeRef = useRef(selectionMode);

  onMapClickRef.current = onMapClick;
  selectionModeRef.current = selectionMode;

  // Initialize Leaflet map once
  useEffect(() => {
    if (!containerRef.current || mapRef.current) return;

    const initialCenter: [number, number] =
      pickupLatitude !== null && pickupLongitude !== null
        ? [pickupLatitude, pickupLongitude]
        : [15.4909, 73.8278];

    const map = L.map(containerRef.current, {
      center: initialCenter,
      zoom: 11,
      zoomControl: true
    });

    L.tileLayer('https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png', {
      attribution: '&copy; OpenStreetMap contributors',
      maxZoom: 19
    }).addTo(map);

    meetingLayerRef.current = L.layerGroup().addTo(map);

    map.on('click', (e: L.LeafletMouseEvent) => {
      if (selectionModeRef.current !== 'none' && onMapClickRef.current) {
        onMapClickRef.current(e.latlng.lat, e.latlng.lng);
      }
    });

    mapRef.current = map;

    // Ensure proper sizing after mount
    setTimeout(() => map.invalidateSize(), 120);

    return () => {
      map.remove();
      mapRef.current = null;
      pickupMarkerRef.current = null;
      destMarkerRef.current = null;
      liveMarkerRef.current = null;
      polylineRef.current = null;
      meetingLayerRef.current = null;
    };
  }, []);

  // Update cursor hint for manual pin selection
  useEffect(() => {
    const el = containerRef.current;
    if (!el) return;
    el.style.cursor = selectionMode !== 'none' ? 'crosshair' : 'grab';
  }, [selectionMode]);

  // Synchronize pickup & destination markers, route polyline, and map viewport immediately when coordinates change
  useEffect(() => {
    const map = mapRef.current;
    if (!map) return;

    const hasPickup = pickupLatitude !== null && pickupLongitude !== null && Number.isFinite(pickupLatitude) && Number.isFinite(pickupLongitude);
    const hasDest = destinationLatitude !== null && destinationLongitude !== null && Number.isFinite(destinationLatitude) && Number.isFinite(destinationLongitude);

    if (hasPickup) {
      const pos: [number, number] = [pickupLatitude!, pickupLongitude!];
      if (!pickupMarkerRef.current) {
        pickupMarkerRef.current = L.marker(pos, {
          icon: createPinIcon('P', '#FFD43B', '#101114', '#101114')
        }).addTo(map);
      } else {
        pickupMarkerRef.current.setLatLng(pos);
      }
      pickupMarkerRef.current.bindPopup(
        `<strong>Pickup</strong><br/>${pickupLocation || 'Selected Pickup'}<br/><span style="font-size:11px;color:#555">${pickupLatitude!.toFixed(4)}, ${pickupLongitude!.toFixed(4)}</span>`
      );
    } else if (pickupMarkerRef.current) {
      pickupMarkerRef.current.remove();
      pickupMarkerRef.current = null;
    }

    if (hasDest) {
      const pos: [number, number] = [destinationLatitude!, destinationLongitude!];
      if (!destMarkerRef.current) {
        destMarkerRef.current = L.marker(pos, {
          icon: createPinIcon('D', '#101114', '#FFFFFF', '#FFD43B')
        }).addTo(map);
      } else {
        destMarkerRef.current.setLatLng(pos);
      }
      destMarkerRef.current.bindPopup(
        `<strong>Destination</strong><br/>${destinationLocation || 'Selected Destination'}<br/><span style="font-size:11px;color:#555">${destinationLatitude!.toFixed(4)}, ${destinationLongitude!.toFixed(4)}</span>`
      );
    } else if (destMarkerRef.current) {
      destMarkerRef.current.remove();
      destMarkerRef.current = null;
    }

    // Update polyline
    if (polylineRef.current) {
      polylineRef.current.remove();
      polylineRef.current = null;
    }

    if (hasPickup && hasDest) {
      const lineCoords: [number, number][] =
        routeCoordinates.length >= 2
          ? routeCoordinates
          : [
              [pickupLatitude!, pickupLongitude!],
              [destinationLatitude!, destinationLongitude!]
            ];

      polylineRef.current = L.polyline(lineCoords, {
        color: '#101114',
        weight: 4,
        opacity: 0.85,
        dashArray: routeCoordinates.length >= 2 ? undefined : '8 8'
      }).addTo(map);

      const bounds = L.latLngBounds(lineCoords);
      map.fitBounds(bounds, { padding: [44, 44], maxZoom: 14, animate: true });
    } else if (hasPickup) {
      map.setView([pickupLatitude!, pickupLongitude!], 13, { animate: true });
    } else if (hasDest) {
      map.setView([destinationLatitude!, destinationLongitude!], 13, { animate: true });
    }
  }, [
    pickupLocation,
    pickupLatitude,
    pickupLongitude,
    destinationLocation,
    destinationLatitude,
    destinationLongitude,
    routeCoordinates
  ]);

  // Update simulated/live GPS marker
  useEffect(() => {
    const map = mapRef.current;
    if (!map) return;

    if (liveLat !== null && liveLat !== undefined && liveLng !== null && liveLng !== undefined) {
      const pos: [number, number] = [liveLat, liveLng];
      if (!liveMarkerRef.current) {
        liveMarkerRef.current = L.marker(pos, { icon: createLiveGpsIcon() }).addTo(map);
      } else {
        liveMarkerRef.current.setLatLng(pos);
      }
      liveMarkerRef.current.bindPopup('<strong>Parcel Position</strong><br/>Simulated Prototype GPS Feed');
    } else if (liveMarkerRef.current) {
      liveMarkerRef.current.remove();
      liveMarkerRef.current = null;
    }
  }, [liveLat, liveLng]);

  // Update suggested meeting point pins
  useEffect(() => {
    const group = meetingLayerRef.current;
    if (!group) return;
    group.clearLayers();
    for (const mp of meetingPoints) {
      const marker = L.marker([mp.lat, mp.lng], { icon: createMeetingPinIcon() });
      marker.bindPopup(`<strong>${mp.name}</strong><br/>${mp.landmarkType}`);
      group.addLayer(marker);
    }
  }, [meetingPoints]);

  return (
    <div className="relative w-full overflow-hidden rounded-2xl border border-neutral-200 bg-[#F5F5F5]">
      <div ref={containerRef} className={`w-full ${heightClass}`} />
      {selectionMode !== 'none' && (
        <div className="pointer-events-none absolute top-3 left-1/2 z-[400] -translate-x-1/2 rounded-xl bg-[#101114] px-3.5 py-2 text-xs font-medium text-white shadow-lg">
          Tap anywhere on the map to set {selectionMode === 'pickup' ? 'Pickup' : 'Destination'} pin
        </div>
      )}
      <div className="flex flex-wrap items-center justify-between gap-3 border-t border-neutral-200 bg-white px-4 py-2 text-xs text-[#777777]">
        <div className="flex items-center gap-4">
          <span className="inline-flex items-center gap-1.5 font-medium text-[#101114]">
            <span className="inline-block h-3 w-3 rounded-full border border-[#101114] bg-[#FFD43B]" />
            Pickup
          </span>
          <span className="inline-flex items-center gap-1.5 font-medium text-[#101114]">
            <span className="inline-block h-3 w-3 rounded-full border border-[#FFD43B] bg-[#101114]" />
            Destination
          </span>
          {liveLat !== null && liveLat !== undefined && (
            <span className="inline-flex items-center gap-1.5 font-medium text-[#101114]">
              <span className="inline-block h-2.5 w-2.5 rounded-full bg-[#FFD43B] ring-2 ring-[#101114]" />
              Simulated GPS
            </span>
          )}
        </div>
        <span className="font-mono-num">
          {pickupLatitude !== null && pickupLongitude !== null
            ? `P: ${pickupLatitude.toFixed(3)}, ${pickupLongitude.toFixed(3)}`
            : 'P: Unset'}
          {' · '}
          {destinationLatitude !== null && destinationLongitude !== null
            ? `D: ${destinationLatitude.toFixed(3)}, ${destinationLongitude.toFixed(3)}`
            : 'D: Unset'}
        </span>
      </div>
    </div>
  );
}
