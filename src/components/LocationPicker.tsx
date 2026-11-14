import { useEffect, useRef, useState } from 'react';
import { Crosshair, Loader2, MapPin, Search, AlertCircle } from 'lucide-react';
import { api, getApiError } from '../services/api';
import type { GeoPoint } from '../types/movex';

interface LocationPickerProps {
  label: string;
  placeholder: string;
  value: string;
  latitude: number | null;
  longitude: number | null;
  isSelectingOnMap: boolean;
  onToggleMapSelect: () => void;
  onSelectLocation: (name: string, lat: number, lng: number) => void;
  accentColor?: 'yellow' | 'black';
}

const QUICK_HUBS: Array<{ name: string; lat: number; lng: number }> = [
  { name: 'Panaji, Goa', lat: 15.4909, lng: 73.8278 },
  { name: 'Margao, Goa', lat: 15.2832, lng: 73.9862 },
  { name: 'Vasco da Gama, Goa', lat: 15.3982, lng: 73.8113 },
  { name: 'Mapusa, Goa', lat: 15.5937, lng: 73.8142 },
  { name: 'Ponda, Goa', lat: 15.4027, lng: 74.0078 },
  { name: 'Mumbai, Maharashtra', lat: 19.0760, lng: 72.8777 },
  { name: 'Pune, Maharashtra', lat: 18.5204, lng: 73.8567 }
];

export default function LocationPicker({
  label,
  placeholder,
  value,
  latitude,
  longitude,
  isSelectingOnMap,
  onToggleMapSelect,
  onSelectLocation,
  accentColor = 'yellow'
}: LocationPickerProps) {
  const [query, setQuery] = useState(value);
  const [suggestions, setSuggestions] = useState<GeoPoint[]>([]);
  const [openDropdown, setOpenDropdown] = useState(false);
  const [resolving, setResolving] = useState(false);
  const [errorMsg, setErrorMsg] = useState('');
  const requestSeqRef = useRef(0);
  const abortRef = useRef<AbortController | null>(null);
  const wrapperRef = useRef<HTMLDivElement | null>(null);

  // Sync external value updates (e.g. Swap button or Map click)
  useEffect(() => {
    setQuery(value);
  }, [value]);

  // Close suggestions on outside click
  useEffect(() => {
    const handler = (e: MouseEvent) => {
      if (wrapperRef.current && !wrapperRef.current.contains(e.target as Node)) {
        setOpenDropdown(false);
      }
    };
    document.addEventListener('mousedown', handler);
    return () => document.removeEventListener('mousedown', handler);
  }, []);

  const runSearch = async (text: string) => {
    const trimmed = text.trim();
    if (trimmed.length < 2) {
      setSuggestions([]);
      return;
    }

    const seq = ++requestSeqRef.current;
    if (abortRef.current) abortRef.current.abort();
    const controller = new AbortController();
    abortRef.current = controller;

    setResolving(true);
    setErrorMsg('');

    try {
      const { data } = await api.get<{ results: GeoPoint[] }>('/geo/search', {
        params: { q: trimmed },
        signal: controller.signal
      });
      // Ignore stale responses from earlier keystrokes
      if (seq !== requestSeqRef.current) return;
      setSuggestions(data.results || []);
      setOpenDropdown(true);
      if ((data.results || []).length === 0) {
        setErrorMsg(`No matching place found for "${trimmed}". Try a nearby town or drop a pin on the map.`);
      }
    } catch (err) {
      if ((err as { name?: string }).name === 'CanceledError' || (err as { code?: string }).code === 'ERR_CANCELED') {
        return;
      }
      if (seq !== requestSeqRef.current) return;
      setErrorMsg(getApiError(err, 'Unable to search location right now.'));
    } finally {
      if (seq === requestSeqRef.current) {
        setResolving(false);
      }
    }
  };

  const handleInputChange = (nextVal: string) => {
    setQuery(nextVal);
    setErrorMsg('');
    if (nextVal.trim().length >= 2) {
      const timer = setTimeout(() => {
        runSearch(nextVal);
      }, 240);
      return () => clearTimeout(timer);
    } else {
      setSuggestions([]);
    }
  };

  const handleGeocodeSubmit = async () => {
    const trimmed = query.trim();
    if (!trimmed) return;
    const seq = ++requestSeqRef.current;
    setResolving(true);
    setErrorMsg('');
    try {
      const { data } = await api.get<{ point: GeoPoint }>('/geo/geocode', { params: { q: trimmed } });
      if (seq !== requestSeqRef.current) return;
      onSelectLocation(data.point.name, data.point.lat, data.point.lng);
      setQuery(data.point.name);
      setOpenDropdown(false);
    } catch (err) {
      if (seq !== requestSeqRef.current) return;
      setErrorMsg(getApiError(err, `Location "${trimmed}" could not be found.`));
    } finally {
      if (seq === requestSeqRef.current) setResolving(false);
    }
  };

  const handleUseCurrentLocation = () => {
    if (!navigator.geolocation) {
      setErrorMsg('Geolocation is not supported by your browser.');
      return;
    }
    const seq = ++requestSeqRef.current;
    setResolving(true);
    setErrorMsg('');
    navigator.geolocation.getCurrentPosition(
      async (pos) => {
        try {
          const { lat, lng } = { lat: pos.coords.latitude, lng: pos.coords.longitude };
          const { data } = await api.get<{ name: string }>('/geo/reverse', { params: { lat, lng } });
          if (seq !== requestSeqRef.current) return;
          onSelectLocation(data.name, lat, lng);
          setQuery(data.name);
          setOpenDropdown(false);
        } catch {
          if (seq !== requestSeqRef.current) return;
          onSelectLocation(
            `Current Pin (${pos.coords.latitude.toFixed(3)}, ${pos.coords.longitude.toFixed(3)})`,
            pos.coords.latitude,
            pos.coords.longitude
          );
        } finally {
          if (seq === requestSeqRef.current) setResolving(false);
        }
      },
      (geoErr) => {
        if (seq !== requestSeqRef.current) return;
        setResolving(false);
        setErrorMsg(
          geoErr.code === 1
            ? 'Location permission denied. Search by city name or select directly on the map.'
            : 'Unable to determine current GPS position.'
        );
      },
      { enableHighAccuracy: true, timeout: 8000 }
    );
  };

  return (
    <div ref={wrapperRef} className="relative">
      <div className="mb-1.5 flex items-center justify-between gap-2">
        <label className="text-xs font-semibold text-[#101114]">{label}</label>
        {latitude !== null && longitude !== null && (
          <span className="font-mono-num text-[11px] text-[#777777]">
            {latitude.toFixed(4)}, {longitude.toFixed(4)}
          </span>
        )}
      </div>

      <div className="flex items-stretch gap-2">
        <div className="relative flex-1">
          <span
            className={`absolute top-1/2 left-3.5 h-3 w-3 -translate-y-1/2 rounded-full border-2 ${
              accentColor === 'yellow' ? 'border-[#101114] bg-[#FFD43B]' : 'border-[#FFD43B] bg-[#101114]'
            }`}
          />
          <input
            type="text"
            value={query}
            onChange={(e) => handleInputChange(e.target.value)}
            onFocus={() => setOpenDropdown(true)}
            onKeyDown={(e) => {
              if (e.key === 'Enter') {
                e.preventDefault();
                handleGeocodeSubmit();
              }
            }}
            placeholder={placeholder}
            className="h-12 w-full rounded-xl border border-neutral-200 bg-[#F5F5F5] pr-10 pl-9 text-sm font-medium text-[#101114] placeholder-[#777777] transition-colors focus:border-[#101114] focus:bg-white focus:outline-none"
          />
          <button
            type="button"
            onClick={handleGeocodeSubmit}
            title="Search location"
            className="absolute top-1/2 right-2 flex h-8 w-8 -translate-y-1/2 items-center justify-center rounded-lg text-[#777777] hover:bg-neutral-200 hover:text-[#101114]"
          >
            {resolving ? <Loader2 className="h-4 w-4 animate-spin" /> : <Search className="h-4 w-4" />}
          </button>
        </div>

        <button
          type="button"
          onClick={handleUseCurrentLocation}
          title="Use Current Location"
          className="flex h-12 min-w-[44px] items-center justify-center gap-1.5 rounded-xl border border-neutral-200 bg-white px-3 text-xs font-semibold text-[#101114] transition-colors hover:bg-[#F5F5F5] whitespace-nowrap shrink-0"
        >
          <Crosshair className="h-4 w-4" />
          <span className="hidden sm:inline">GPS</span>
        </button>

        <button
          type="button"
          onClick={onToggleMapSelect}
          title="Select manually on map"
          className={`flex h-12 min-w-[44px] items-center justify-center gap-1.5 rounded-xl border px-3 text-xs font-semibold transition-colors whitespace-nowrap shrink-0 ${
            isSelectingOnMap
              ? 'border-[#101114] bg-[#FFD43B] text-[#101114]'
              : 'border-neutral-200 bg-white text-[#101114] hover:bg-[#F5F5F5]'
          }`}
        >
          <MapPin className="h-4 w-4" />
          <span className="hidden sm:inline">{isSelectingOnMap ? 'Tap Map' : 'Map Pin'}</span>
        </button>
      </div>

      {errorMsg && (
        <div className="mt-1.5 flex items-center gap-1.5 text-xs font-medium text-red-600">
          <AlertCircle className="h-3.5 w-3.5 shrink-0" />
          <span>{errorMsg}</span>
        </div>
      )}

      {openDropdown && (
        <div className="absolute right-0 left-0 z-50 mt-1.5 max-h-64 overflow-y-auto rounded-xl border border-neutral-200 bg-white shadow-xl">
          {suggestions.length > 0 ? (
            <div className="py-1">
              <div className="px-3 py-1 text-[11px] font-semibold text-[#777777]">Search Results</div>
              {suggestions.map((item, idx) => (
                <button
                  key={`${item.name}-${idx}`}
                  type="button"
                  onClick={() => {
                    onSelectLocation(item.name, item.lat, item.lng);
                    setQuery(item.name);
                    setOpenDropdown(false);
                    setErrorMsg('');
                  }}
                  className="flex w-full items-start gap-2.5 px-3 py-2.5 text-left text-sm transition-colors hover:bg-[#F5F5F5]"
                >
                  <MapPin className="mt-0.5 h-4 w-4 shrink-0 text-[#101114]" />
                  <div className="min-w-0 flex-1">
                    <div className="truncate font-semibold text-[#101114]">{item.name}</div>
                    <div className="truncate text-xs text-[#777777]">{item.displayName}</div>
                  </div>
                </button>
              ))}
            </div>
          ) : (
            <div className="py-1.5">
              <div className="px-3 py-1 text-[11px] font-semibold text-[#777777]">Popular Corridors & Hubs</div>
              <div className="grid grid-cols-1 sm:grid-cols-2">
                {QUICK_HUBS.map((hub) => (
                  <button
                    key={hub.name}
                    type="button"
                    onClick={() => {
                      onSelectLocation(hub.name, hub.lat, hub.lng);
                      setQuery(hub.name);
                      setOpenDropdown(false);
                      setErrorMsg('');
                    }}
                    className="flex items-center gap-2 px-3 py-2 text-left text-sm font-medium text-[#101114] hover:bg-[#F5F5F5]"
                  >
                    <MapPin className="h-3.5 w-3.5 shrink-0 text-[#777777]" />
                    <span className="truncate">{hub.name}</span>
                  </button>
                ))}
              </div>
            </div>
          )}
        </div>
      )}
    </div>
  );
}
