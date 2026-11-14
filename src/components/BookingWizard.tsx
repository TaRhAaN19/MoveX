import { useEffect, useMemo, useRef, useState } from 'react';
import {
  AlertCircle,
  ArrowLeftRight,
  CheckCircle2,
  ChevronLeft,
  ChevronRight,
  CreditCard,
  Loader2,
  MapPin,
  ShieldAlert,
  ShieldCheck,
  Sparkles,
  Upload
} from 'lucide-react';
import { QRCodeSVG } from 'qrcode.react';
import { api, getApiError } from '../services/api';
import type {
  Booking,
  DeliveryModel,
  GuardEvaluation,
  MeetingPointSuggestion,
  PartnerMatchResult,
  PricingQuote,
  RouteResult,
  TransportMode,
  UrgencyLevel
} from '../types/movex';
import LocationPicker from './LocationPicker';
import MovexMap from './MovexMap';
import { TransportModeIcon, formatTransportModeLabel } from './TransportIcon';

interface BookingWizardProps {
  onBookingComplete: (booking: Booking) => void;
}

const STEPS = [
  'Locations',
  'Model',
  'Transport',
  'Parcel Info',
  'Match & Meet',
  'Confirm & Pay'
];

export default function BookingWizard({ onBookingComplete }: BookingWizardProps) {
  const [step, setStep] = useState(1);

  // Explicit, independent location & coordinate state (Fixes critical map update bug)
  const [pickupLocation, setPickupLocation] = useState('Panaji, Goa');
  const [pickupLatitude, setPickupLatitude] = useState<number | null>(15.4909);
  const [pickupLongitude, setPickupLongitude] = useState<number | null>(73.8278);

  const [destinationLocation, setDestinationLocation] = useState('Margao, Goa');
  const [destinationLatitude, setDestinationLatitude] = useState<number | null>(15.2832);
  const [destinationLongitude, setDestinationLongitude] = useState<number | null>(73.9862);

  const [mapSelectMode, setMapSelectMode] = useState<'none' | 'pickup' | 'destination'>('none');
  const [route, setRoute] = useState<RouteResult>({
    distanceKm: 33.4,
    durationMins: 52,
    coordinates: [
      [15.4909, 73.8278],
      [15.2832, 73.9862]
    ],
    source: 'haversine_fallback'
  });
  const [routeLoading, setRouteLoading] = useState(false);
  const routeSeqRef = useRef(0);

  // Delivery Model & Transport Mode & Urgency
  const [deliveryModel, setDeliveryModel] = useState<DeliveryModel>('community_relay');
  const [transportMode, setTransportMode] = useState<TransportMode>('bike');
  const [urgency, setUrgency] = useState<UrgencyLevel>('standard');

  // Parcel Info
  const [weightKg, setWeightKg] = useState<number>(1.0);
  const [lengthCm, setLengthCm] = useState<number>(24);
  const [widthCm, setWidthCm] = useState<number>(18);
  const [heightCm, setHeightCm] = useState<number>(12);
  const [declaredContents, setDeclaredContents] = useState('Books and signed documents');
  const [declaredValue, setDeclaredValue] = useState<number>(1500);
  const [isFragile, setIsFragile] = useState(false);
  const [packagingType, setPackagingType] = useState('Cardboard Box');
  const [parcelPhotoUrl, setParcelPhotoUrl] = useState('');
  const [uploadingPhoto, setUploadingPhoto] = useState(false);
  const [policyAccepted, setPolicyAccepted] = useState(true);

  // Backend Quotes & Intelligence
  const [allQuotes, setAllQuotes] = useState<PricingQuote[]>([]);
  const [selectedQuote, setSelectedQuote] = useState<PricingQuote | null>(null);
  const [pricingLoading, setPricingLoading] = useState(false);

  const [guardResult, setGuardResult] = useState<GuardEvaluation | null>(null);
  const [matches, setMatches] = useState<PartnerMatchResult[]>([]);
  const [pickupSuggestions, setPickupSuggestions] = useState<MeetingPointSuggestion[]>([]);
  const [dropoffSuggestions, setDropoffSuggestions] = useState<MeetingPointSuggestion[]>([]);
  const [selectedMatch, setSelectedMatch] = useState<PartnerMatchResult | null>(null);
  const [pickupMeetingPoint, setPickupMeetingPoint] = useState('');
  const [dropoffMeetingPoint, setDropoffMeetingPoint] = useState('');
  const [matchingLoading, setMatchingLoading] = useState(false);

  // Confirmation & Simulated Payment
  const [paymentMethod, setPaymentMethod] = useState('UPI Demo (Simulated)');
  const [submitting, setSubmitting] = useState(false);
  const [errorMsg, setErrorMsg] = useState('');
  const [confirmedBooking, setConfirmedBooking] = useState<Booking | null>(null);

  const parcelCategory = useMemo(() => {
    if (weightKg <= 0.5) return 'XS (Up to 500 g)';
    if (weightKg <= 2) return 'S (500 g – 2 kg)';
    if (weightKg <= 5) return 'M (2 – 5 kg)';
    if (weightKg <= 10) return 'L (5 – 10 kg)';
    return 'XL (10 – 15 kg)';
  }, [weightKg]);

  // Recalculate route whenever pickup or destination coordinates change
  useEffect(() => {
    if (
      pickupLatitude === null ||
      pickupLongitude === null ||
      destinationLatitude === null ||
      destinationLongitude === null
    ) {
      return;
    }

    const seq = ++routeSeqRef.current;
    setRouteLoading(true);
    api
      .post<{ route: RouteResult }>('/geo/route', {
        pickupLat: pickupLatitude,
        pickupLng: pickupLongitude,
        destinationLat: destinationLatitude,
        destinationLng: destinationLongitude
      })
      .then(({ data }) => {
        if (seq !== routeSeqRef.current) return;
        setRoute(data.route);
      })
      .catch(() => {
        // Keep current fallback if transient network issue
      })
      .finally(() => {
        if (seq === routeSeqRef.current) setRouteLoading(false);
      });
  }, [pickupLatitude, pickupLongitude, destinationLatitude, destinationLongitude]);

  // Live backend pricing calculation whenever any pricing factor changes
  useEffect(() => {
    if (weightKg <= 0 || weightKg > 15) return;

    const timer = setTimeout(() => {
      setPricingLoading(true);
      api
        .post<{ selectedQuote: PricingQuote; allQuotes: PricingQuote[] }>('/pricing/calculate', {
          mode: transportMode,
          deliveryModel,
          urgency,
          distanceKm: route.distanceKm,
          weightKg,
          lengthCm,
          widthCm,
          heightCm
        })
        .then(({ data }) => {
          setSelectedQuote(data.selectedQuote);
          setAllQuotes(data.allQuotes);
        })
        .catch(() => {
          // handled silently during typing
        })
        .finally(() => setPricingLoading(false));
    }, 120);

    return () => clearTimeout(timer);
  }, [transportMode, deliveryModel, urgency, route.distanceKm, weightKg, lengthCm, widthCm, heightCm]);

  // Live MOVEX Guard check when parcel info changes
  useEffect(() => {
    if (!declaredContents.trim()) {
      setGuardResult(null);
      return;
    }
    const timer = setTimeout(() => {
      api
        .post<GuardEvaluation>('/intelligence/guard-check', {
          declaredContents,
          declaredValue,
          weightKg,
          transportMode,
          isFragile,
          policyAccepted
        })
        .then(({ data }) => setGuardResult(data))
        .catch(() => {});
    }, 200);
    return () => clearTimeout(timer);
  }, [declaredContents, declaredValue, weightKg, transportMode, isFragile, policyAccepted]);

  const handleSwapLocations = () => {
    const oldPName = pickupLocation;
    const oldPLat = pickupLatitude;
    const oldPLng = pickupLongitude;

    setPickupLocation(destinationLocation);
    setPickupLatitude(destinationLatitude);
    setPickupLongitude(destinationLongitude);

    setDestinationLocation(oldPName);
    setDestinationLatitude(oldPLat);
    setDestinationLongitude(oldPLng);
  };

  const handleMapClick = async (lat: number, lng: number) => {
    const mode = mapSelectMode;
    if (mode === 'none') return;
    setMapSelectMode('none');
    try {
      const { data } = await api.get<{ name: string }>('/geo/reverse', { params: { lat, lng } });
      if (mode === 'pickup') {
        setPickupLocation(data.name);
        setPickupLatitude(lat);
        setPickupLongitude(lng);
      } else {
        setDestinationLocation(data.name);
        setDestinationLatitude(lat);
        setDestinationLongitude(lng);
      }
    } catch {
      const label = `Pinned (${lat.toFixed(4)}, ${lng.toFixed(4)})`;
      if (mode === 'pickup') {
        setPickupLocation(label);
        setPickupLatitude(lat);
        setPickupLongitude(lng);
      } else {
        setDestinationLocation(label);
        setDestinationLatitude(lat);
        setDestinationLongitude(lng);
      }
    }
  };

  const handleAutoSelectMode = () => {
    const compatible = allQuotes.filter((q) => q.compatible);
    if (compatible.length === 0) {
      setErrorMsg('No transportation mode supports these parcel dimensions/weight.');
      return;
    }
    const sorted =
      urgency === 'priority'
        ? [...compatible].sort((a, b) => a.etaMinutes - b.etaMinutes)
        : [...compatible].sort((a, b) => a.totalPrice - b.totalPrice);
    setTransportMode(sorted[0].mode);
    setErrorMsg('');
  };

  const handlePhotoUpload = async (file: File) => {
    setUploadingPhoto(true);
    try {
      const form = new FormData();
      form.append('photo', file);
      const { data } = await api.post<{ url: string }>('/uploads/parcel-photo', form, {
        headers: { 'Content-Type': 'multipart/form-data' }
      });
      setParcelPhotoUrl(data.url);
    } catch (err) {
      setErrorMsg(getApiError(err, 'Failed to upload parcel photo.'));
    } finally {
      setUploadingPhoto(false);
    }
  };

  const loadPartnerMatches = async () => {
    if (pickupLatitude === null || pickupLongitude === null || destinationLatitude === null || destinationLongitude === null) {
      return;
    }
    setMatchingLoading(true);
    try {
      const { data } = await api.post<{
        matches: PartnerMatchResult[];
        meetingPoints: { pickupSuggestions: MeetingPointSuggestion[]; dropoffSuggestions: MeetingPointSuggestion[] };
      }>('/intelligence/match', {
        pickupLocation,
        pickupLat: pickupLatitude,
        pickupLng: pickupLongitude,
        destinationLocation,
        destinationLat: destinationLatitude,
        destinationLng: destinationLongitude,
        distanceKm: route.distanceKm,
        deliveryModel,
        transportMode,
        weightKg,
        lengthCm,
        widthCm,
        heightCm,
        urgency
      });
      setMatches(data.matches || []);
      setPickupSuggestions(data.meetingPoints?.pickupSuggestions || []);
      setDropoffSuggestions(data.meetingPoints?.dropoffSuggestions || []);
      if (data.matches && data.matches.length > 0) {
        setSelectedMatch(data.matches[0]);
      } else {
        setSelectedMatch(null);
      }
      if (data.meetingPoints?.pickupSuggestions?.[0]) {
        setPickupMeetingPoint(data.meetingPoints.pickupSuggestions[0].name);
      }
      if (data.meetingPoints?.dropoffSuggestions?.[0]) {
        setDropoffMeetingPoint(data.meetingPoints.dropoffSuggestions[0].name);
      }
    } catch (err) {
      setErrorMsg(getApiError(err));
    } finally {
      setMatchingLoading(false);
    }
  };

  const goNextStep = async () => {
    setErrorMsg('');
    if (step === 1) {
      if (!pickupLocation || pickupLatitude === null || pickupLongitude === null) {
        setErrorMsg('Please select a valid pickup location.');
        return;
      }
      if (!destinationLocation || destinationLatitude === null || destinationLongitude === null) {
        setErrorMsg('Please select a valid destination location.');
        return;
      }
      if (pickupLocation === destinationLocation && Math.abs(pickupLatitude - destinationLatitude) < 0.001) {
        setErrorMsg('Pickup and destination cannot be identical.');
        return;
      }
    }
    if (step === 3 && selectedQuote && !selectedQuote.compatible) {
      setErrorMsg(selectedQuote.incompatibilityReasons.join(' '));
      return;
    }
    if (step === 4) {
      if (weightKg <= 0 || weightKg > 15) {
        setErrorMsg('Parcel weight must be between 0.1 kg and 15 kg.');
        return;
      }
      if (!declaredContents.trim()) {
        setErrorMsg('Please declare the contents of your parcel.');
        return;
      }
      if (!policyAccepted) {
        setErrorMsg('Please accept the MOVEX parcel safety policy.');
        return;
      }
      if (guardResult && !guardResult.allowBooking) {
        setErrorMsg(guardResult.reasons[0] || 'This parcel cannot be booked due to safety rules.');
        return;
      }
      if (selectedQuote && !selectedQuote.compatible) {
        setErrorMsg(selectedQuote.incompatibilityReasons.join(' '));
        return;
      }
      await loadPartnerMatches();
    }
    setStep((s) => Math.min(6, s + 1));
  };

  const handleConfirmBooking = async () => {
    setErrorMsg('');
    setSubmitting(true);
    try {
      const { data } = await api.post<{ booking: Booking }>('/bookings', {
        deliveryModel,
        transportMode,
        urgency,
        pickupLocation,
        pickupLat: pickupLatitude,
        pickupLng: pickupLongitude,
        destinationLocation,
        destinationLat: destinationLatitude,
        destinationLng: destinationLongitude,
        weightKg,
        lengthCm,
        widthCm,
        heightCm,
        declaredContents,
        declaredValue,
        isFragile,
        packagingType,
        parcelPhotoUrl,
        policyAccepted,
        selectedPartnerId: selectedMatch?.partnerId || null,
        selectedJourneyId: selectedMatch?.journeyId || null,
        pickupMeetingPoint: pickupMeetingPoint || pickupLocation,
        dropoffMeetingPoint: dropoffMeetingPoint || destinationLocation,
        paymentMethod,
        payNow: true
      });
      setConfirmedBooking(data.booking);
      onBookingComplete(data.booking);
    } catch (err) {
      setErrorMsg(getApiError(err));
    } finally {
      setSubmitting(false);
    }
  };

  if (confirmedBooking) {
    return (
      <div className="rounded-3xl border border-neutral-200 bg-white p-6 sm:p-8">
        <div className="flex flex-wrap items-start justify-between gap-4 border-b border-neutral-200 pb-6">
          <div>
            <div className="flex items-center gap-2 text-emerald-700">
              <CheckCircle2 className="h-5 w-5" />
              <span className="text-sm font-bold">Booking &amp; Simulated Payment Confirmed</span>
            </div>
            <h2 className="font-display mt-1 text-2xl font-extrabold text-[#101114]">
              Parcel {confirmedBooking.parcel_code}
            </h2>
            <p className="mt-1 text-sm text-[#777777]">
              Status: <strong className="text-[#101114]">{confirmedBooking.status.replace(/_/g, ' ')}</strong>
              {' · '}
              {confirmedBooking.pickup_location} → {confirmedBooking.destination_location}
            </p>
          </div>
          <div className="rounded-2xl border border-neutral-200 bg-[#F5F5F5] p-3">
            <QRCodeSVG value={`MOVEX:${confirmedBooking.parcel_code}`} size={88} />
          </div>
        </div>

        <div className="mt-6 grid grid-cols-1 gap-4 sm:grid-cols-3">
          <div className="rounded-2xl border border-neutral-200 bg-[#F5F5F5] p-4">
            <div className="text-xs font-medium text-[#777777]">Pickup OTP (Share with Partner)</div>
            <div className="font-mono-num mt-1 text-2xl font-extrabold text-[#101114]">
              {confirmedBooking.pickup_otp}
            </div>
          </div>
          <div className="rounded-2xl border border-neutral-200 bg-[#F5F5F5] p-4">
            <div className="text-xs font-medium text-[#777777]">Recipient Delivery OTP</div>
            <div className="font-mono-num mt-1 text-2xl font-extrabold text-[#101114]">
              {confirmedBooking.delivery_otp}
            </div>
          </div>
          <div className="rounded-2xl border border-neutral-200 bg-[#F5F5F5] p-4">
            <div className="text-xs font-medium text-[#777777]">Simulated Payment Total</div>
            <div className="font-mono-num mt-1 text-2xl font-extrabold text-[#101114]">
              ₹{confirmedBooking.total_price.toFixed(2)}
            </div>
          </div>
        </div>

        <div className="mt-6 flex flex-wrap gap-3">
          <button
            type="button"
            onClick={() => {
              setConfirmedBooking(null);
              setStep(1);
            }}
            className="h-11 rounded-xl bg-[#FFD43B] px-5 text-sm font-bold text-[#101114] hover:bg-[#F5C419]"
          >
            Book Another Parcel
          </button>
        </div>
      </div>
    );
  }

  return (
    <div className="grid grid-cols-1 gap-6 lg:grid-cols-12">
      {/* Main Multi-Step Booking Form */}
      <div className="rounded-3xl border border-neutral-200 bg-white p-5 sm:p-7 lg:col-span-8">
        {/* Progress Steps */}
        <div className="mb-6 flex items-center gap-1.5 overflow-x-auto pb-2">
          {STEPS.map((label, idx) => {
            const num = idx + 1;
            const active = num === step;
            const done = num < step;
            return (
              <button
                key={label}
                type="button"
                onClick={() => {
                  if (num < step) setStep(num);
                }}
                disabled={num > step}
                className={`flex shrink-0 items-center gap-2 rounded-xl px-3 py-2 text-xs font-semibold transition-colors whitespace-nowrap ${
                  active
                    ? 'bg-[#101114] text-white'
                    : done
                    ? 'bg-[#FFD43B]/35 text-[#101114]'
                    : 'bg-[#F5F5F5] text-[#777777]'
                }`}
              >
                <span className="font-mono-num">{num}.</span>
                <span>{label}</span>
              </button>
            );
          })}
        </div>

        {errorMsg && (
          <div className="mb-5 flex items-center gap-2 rounded-xl border border-red-200 bg-red-50 px-4 py-3 text-sm font-medium text-red-700">
            <AlertCircle className="h-4 w-4 shrink-0" />
            <span>{errorMsg}</span>
          </div>
        )}

        {/* STEP 1: PICKUP & DESTINATION */}
        {step === 1 && (
          <div className="space-y-4">
            <div className="flex items-center justify-between">
              <h2 className="font-display text-xl font-bold text-[#101114]">
                Pickup &amp; Destination
              </h2>
              <button
                type="button"
                onClick={handleSwapLocations}
                className="inline-flex h-9 items-center gap-1.5 rounded-xl border border-neutral-200 bg-[#F5F5F5] px-3 text-xs font-semibold text-[#101114] hover:bg-neutral-200"
              >
                <ArrowLeftRight className="h-3.5 w-3.5" />
                <span>Swap</span>
              </button>
            </div>

            <LocationPicker
              label="Pickup Location"
              placeholder="Where should we collect your parcel?"
              value={pickupLocation}
              latitude={pickupLatitude}
              longitude={pickupLongitude}
              isSelectingOnMap={mapSelectMode === 'pickup'}
              onToggleMapSelect={() => setMapSelectMode((m) => (m === 'pickup' ? 'none' : 'pickup'))}
              onSelectLocation={(name, lat, lng) => {
                setPickupLocation(name);
                setPickupLatitude(lat);
                setPickupLongitude(lng);
              }}
              accentColor="yellow"
            />

            <LocationPicker
              label="Destination Location"
              placeholder="Where should your parcel go?"
              value={destinationLocation}
              latitude={destinationLatitude}
              longitude={destinationLongitude}
              isSelectingOnMap={mapSelectMode === 'destination'}
              onToggleMapSelect={() => setMapSelectMode((m) => (m === 'destination' ? 'none' : 'destination'))}
              onSelectLocation={(name, lat, lng) => {
                setDestinationLocation(name);
                setDestinationLatitude(lat);
                setDestinationLongitude(lng);
              }}
              accentColor="black"
            />

            {/* Quick Goa Test Presets */}
            <div className="flex flex-wrap items-center gap-2 pt-1">
              <span className="text-xs font-medium text-[#777777]">Quick Test Routes:</span>
              {[
                { p: 'Panaji, Goa', pLat: 15.4909, pLng: 73.8278, d: 'Margao, Goa', dLat: 15.2832, dLng: 73.9862 },
                { p: 'Vasco da Gama, Goa', pLat: 15.3982, pLng: 73.8113, d: 'Mapusa, Goa', dLat: 15.5937, dLng: 73.8142 },
                { p: 'Ponda, Goa', pLat: 15.4027, pLng: 74.0078, d: 'Panaji, Goa', dLat: 15.4909, dLng: 73.8278 },
                { p: 'Mapusa, Goa', pLat: 15.5937, pLng: 73.8142, d: 'Margao, Goa', dLat: 15.2832, dLng: 73.9862 }
              ].map((preset) => (
                <button
                  key={`${preset.p}-${preset.d}`}
                  type="button"
                  onClick={() => {
                    setPickupLocation(preset.p);
                    setPickupLatitude(preset.pLat);
                    setPickupLongitude(preset.pLng);
                    setDestinationLocation(preset.d);
                    setDestinationLatitude(preset.dLat);
                    setDestinationLongitude(preset.dLng);
                  }}
                  className="rounded-lg border border-neutral-200 bg-[#F5F5F5] px-2.5 py-1 text-xs font-medium text-[#101114] hover:border-[#101114]"
                >
                  {preset.p.split(',')[0]} → {preset.d.split(',')[0]}
                </button>
              ))}
            </div>

            <MovexMap
              pickupLocation={pickupLocation}
              pickupLatitude={pickupLatitude}
              pickupLongitude={pickupLongitude}
              destinationLocation={destinationLocation}
              destinationLatitude={destinationLatitude}
              destinationLongitude={destinationLongitude}
              routeCoordinates={route.coordinates}
              selectionMode={mapSelectMode}
              onMapClick={handleMapClick}
            />
          </div>
        )}

        {/* STEP 2: DELIVERY MODEL */}
        {step === 2 && (
          <div className="space-y-5">
            <h2 className="font-display text-xl font-bold text-[#101114]">Choose Delivery Model</h2>

            <div className="grid grid-cols-1 gap-4 md:grid-cols-2">
              <button
                type="button"
                onClick={() => setDeliveryModel('community_relay')}
                className={`rounded-2xl border p-5 text-left transition-all ${
                  deliveryModel === 'community_relay'
                    ? 'border-[#101114] bg-[#FFD43B]/20 ring-1 ring-[#101114]'
                    : 'border-neutral-200 bg-[#F5F5F5] hover:border-[#101114]'
                }`}
              >
                <div className="flex items-center justify-between">
                  <span className="font-display text-lg font-bold text-[#101114]">Community Relay</span>
                  <span className="text-xs font-bold text-emerald-700">Most Affordable</span>
                </div>
                <ul className="mt-3 space-y-1.5 text-xs text-[#777777]">
                  <li>• Uses existing partner journeys only (no dedicated trips)</li>
                  <li>• AI route matching &amp; public meeting points</li>
                  <li>• Mutual pickup &amp; drop-off point agreement</li>
                </ul>
              </button>

              <button
                type="button"
                onClick={() => setDeliveryModel('premium_express')}
                className={`rounded-2xl border p-5 text-left transition-all ${
                  deliveryModel === 'premium_express'
                    ? 'border-[#101114] bg-[#FFD43B]/20 ring-1 ring-[#101114]'
                    : 'border-neutral-200 bg-[#F5F5F5] hover:border-[#101114]'
                }`}
              >
                <div className="flex items-center justify-between">
                  <span className="font-display text-lg font-bold text-[#101114]">Premium Express</span>
                  <span className="text-xs font-bold text-[#101114]">Doorstep Direct</span>
                </div>
                <ul className="mt-3 space-y-1.5 text-xs text-[#777777]">
                  <li>• Dedicated delivery partner handles full route</li>
                  <li>• Doorstep pickup and doorstep delivery</li>
                  <li>• Faster direct service with priority ETA</li>
                </ul>
              </button>
            </div>

            <div>
              <label className="mb-2 block text-xs font-semibold text-[#101114]">Delivery Urgency</label>
              <div className="grid grid-cols-3 gap-2">
                {(['standard', 'express', 'priority'] as UrgencyLevel[]).map((u) => (
                  <button
                    key={u}
                    type="button"
                    onClick={() => setUrgency(u)}
                    className={`h-11 rounded-xl border text-xs font-semibold capitalize transition-colors ${
                      urgency === u
                        ? 'border-[#101114] bg-[#101114] text-white'
                        : 'border-neutral-200 bg-[#F5F5F5] text-[#101114] hover:border-[#101114]'
                    }`}
                  >
                    {u}
                  </button>
                ))}
              </div>
            </div>
          </div>
        )}

        {/* STEP 3: TRANSPORTATION MODE */}
        {step === 3 && (
          <div className="space-y-4">
            <div className="flex flex-wrap items-center justify-between gap-2">
              <div>
                <h2 className="font-display text-xl font-bold text-[#101114]">Select Transportation Mode</h2>
                <p className="text-xs text-[#777777]">
                  Prices update dynamically from the backend based on route distance ({route.distanceKm} km) and parcel dimensions.
                </p>
              </div>
              <button
                type="button"
                onClick={handleAutoSelectMode}
                className="inline-flex h-10 items-center gap-1.5 rounded-xl bg-[#FFD43B] px-3.5 text-xs font-bold text-[#101114] hover:bg-[#F5C419]"
              >
                <Sparkles className="h-4 w-4" />
                <span>Auto-Find Suitable Mode</span>
              </button>
            </div>

            <div className="grid grid-cols-1 gap-3 sm:grid-cols-2">
              {allQuotes.map((q) => {
                const selected = transportMode === q.mode;
                return (
                  <button
                    key={q.mode}
                    type="button"
                    onClick={() => setTransportMode(q.mode)}
                    className={`flex flex-col justify-between rounded-2xl border p-4 text-left transition-all ${
                      selected
                        ? 'border-[#101114] bg-[#FFD43B]/20 ring-1 ring-[#101114]'
                        : q.compatible
                        ? 'border-neutral-200 bg-white hover:border-[#101114]'
                        : 'border-neutral-200 bg-[#F5F5F5] opacity-75'
                    }`}
                  >
                    <div className="flex items-start justify-between gap-3">
                      <div className="flex items-center gap-3">
                        <div className="flex h-10 w-10 items-center justify-center rounded-xl bg-[#101114] text-[#FFD43B]">
                          <TransportModeIcon mode={q.mode} />
                        </div>
                        <div>
                          <div className="font-display text-base font-bold text-[#101114]">{q.displayName}</div>
                          <div className="text-[11px] text-[#777777]">
                            Base ₹{q.startingPrice} · ETA {q.etaLabel}
                          </div>
                        </div>
                      </div>
                      <div className="text-right">
                        <div className="font-mono-num text-lg font-extrabold text-[#101114]">
                          ₹{Math.round(q.totalPrice)}
                        </div>
                        <div className={`text-[11px] font-semibold ${q.compatible ? 'text-emerald-700' : 'text-red-600'}`}>
                          {q.compatible ? 'Compatible' : 'Incompatible'}
                        </div>
                      </div>
                    </div>

                    <div className="mt-3 border-t border-neutral-200/80 pt-2 text-[11px] text-[#777777]">
                      <div className="font-medium text-[#101114]">{q.integrationStatus}</div>
                      {!q.compatible && (
                        <div className="mt-0.5 text-red-600">{q.incompatibilityReasons[0]}</div>
                      )}
                    </div>
                  </button>
                );
              })}
            </div>
          </div>
        )}

        {/* STEP 4: PARCEL INFORMATION */}
        {step === 4 && (
          <div className="space-y-4">
            <div className="flex items-center justify-between">
              <h2 className="font-display text-xl font-bold text-[#101114]">Parcel Information &amp; Declaration</h2>
              <span className="font-mono-num text-xs font-bold text-[#101114]">Category: {parcelCategory}</span>
            </div>

            <div className="grid grid-cols-2 gap-3 sm:grid-cols-4">
              <div>
                <label className="mb-1 block text-xs font-semibold text-[#101114]">Weight (kg, max 15)</label>
                <input
                  type="number"
                  step="0.1"
                  min="0.1"
                  max="15"
                  value={weightKg}
                  onChange={(e) => setWeightKg(Number(e.target.value))}
                  className="h-11 w-full rounded-xl border border-neutral-200 bg-[#F5F5F5] px-3 font-mono-num text-sm font-semibold text-[#101114] focus:border-[#101114] focus:bg-white focus:outline-none"
                />
              </div>
              <div>
                <label className="mb-1 block text-xs font-semibold text-[#101114]">Length (cm)</label>
                <input
                  type="number"
                  min="1"
                  value={lengthCm}
                  onChange={(e) => setLengthCm(Number(e.target.value))}
                  className="h-11 w-full rounded-xl border border-neutral-200 bg-[#F5F5F5] px-3 font-mono-num text-sm text-[#101114] focus:border-[#101114] focus:bg-white focus:outline-none"
                />
              </div>
              <div>
                <label className="mb-1 block text-xs font-semibold text-[#101114]">Width (cm)</label>
                <input
                  type="number"
                  min="1"
                  value={widthCm}
                  onChange={(e) => setWidthCm(Number(e.target.value))}
                  className="h-11 w-full rounded-xl border border-neutral-200 bg-[#F5F5F5] px-3 font-mono-num text-sm text-[#101114] focus:border-[#101114] focus:bg-white focus:outline-none"
                />
              </div>
              <div>
                <label className="mb-1 block text-xs font-semibold text-[#101114]">Height (cm)</label>
                <input
                  type="number"
                  min="1"
                  value={heightCm}
                  onChange={(e) => setHeightCm(Number(e.target.value))}
                  className="h-11 w-full rounded-xl border border-neutral-200 bg-[#F5F5F5] px-3 font-mono-num text-sm text-[#101114] focus:border-[#101114] focus:bg-white focus:outline-none"
                />
              </div>
            </div>

            {weightKg > 15 && (
              <div className="rounded-xl border border-red-200 bg-red-50 px-4 py-2.5 text-xs font-semibold text-red-700">
                Parcels above 15 kg exceed the prototype maximum weight limit.
              </div>
            )}

            <div>
              <label className="mb-1 block text-xs font-semibold text-[#101114]">Declared Contents</label>
              <input
                type="text"
                value={declaredContents}
                onChange={(e) => setDeclaredContents(e.target.value)}
                placeholder="Describe contents honestly (e.g. Books, Clothing, Dry Bakery Box)"
                className="h-11 w-full rounded-xl border border-neutral-200 bg-[#F5F5F5] px-3 text-sm text-[#101114] focus:border-[#101114] focus:bg-white focus:outline-none"
              />
            </div>

            <div className="grid grid-cols-1 gap-3 sm:grid-cols-2">
              <div>
                <label className="mb-1 block text-xs font-semibold text-[#101114]">Declared Value (₹)</label>
                <input
                  type="number"
                  min="0"
                  value={declaredValue}
                  onChange={(e) => setDeclaredValue(Number(e.target.value))}
                  className="h-11 w-full rounded-xl border border-neutral-200 bg-[#F5F5F5] px-3 font-mono-num text-sm text-[#101114] focus:border-[#101114] focus:bg-white focus:outline-none"
                />
              </div>
              <div>
                <label className="mb-1 block text-xs font-semibold text-[#101114]">Packaging (Ordinary Supported)</label>
                <select
                  value={packagingType}
                  onChange={(e) => setPackagingType(e.target.value)}
                  className="h-11 w-full rounded-xl border border-neutral-200 bg-[#F5F5F5] px-3 text-sm text-[#101114] focus:border-[#101114] focus:bg-white focus:outline-none"
                >
                  <option value="Cardboard Box">Cardboard Box</option>
                  <option value="Paper Envelope">Ordinary Envelope / Folder</option>
                  <option value="Paper Wrap">Brown Paper Wrapping</option>
                  <option value="Padded Mailer">Padded Bubble Mailer</option>
                </select>
              </div>
            </div>

            <div className="flex flex-wrap items-center justify-between gap-4 rounded-2xl border border-neutral-200 bg-[#F5F5F5] p-4">
              <label className="flex cursor-pointer items-center gap-2.5 text-sm font-medium text-[#101114]">
                <input
                  type="checkbox"
                  checked={isFragile}
                  onChange={(e) => setIsFragile(e.target.checked)}
                  className="h-4 w-4 rounded accent-[#101114]"
                />
                <span>Mark parcel as Fragile Item</span>
              </label>

              <label className="inline-flex cursor-pointer items-center gap-2 rounded-xl border border-neutral-300 bg-white px-3.5 py-2 text-xs font-semibold text-[#101114] hover:bg-neutral-50">
                <Upload className="h-4 w-4" />
                <span>{uploadingPhoto ? 'Uploading...' : parcelPhotoUrl ? 'Photo Attached ✓' : 'Upload Parcel Photo'}</span>
                <input
                  type="file"
                  accept="image/*"
                  className="hidden"
                  onChange={(e) => {
                    const f = e.target.files?.[0];
                    if (f) handlePhotoUpload(f);
                  }}
                />
              </label>
            </div>

            {/* MOVEX Guard Live Eligibility Banner */}
            {guardResult && (
              <div
                className={`rounded-2xl border p-4 ${
                  guardResult.classification === 'PERMITTED'
                    ? 'border-emerald-200 bg-emerald-50/70'
                    : guardResult.classification === 'RESTRICTED'
                    ? 'border-amber-200 bg-amber-50/70'
                    : 'border-red-200 bg-red-50'
                }`}
              >
                <div className="flex items-center gap-2 text-sm font-bold text-[#101114]">
                  {guardResult.classification === 'PERMITTED' ? (
                    <ShieldCheck className="h-5 w-5 text-emerald-700" />
                  ) : (
                    <ShieldAlert className="h-5 w-5 text-amber-700" />
                  )}
                  <span>MOVEX Guard Status: {guardResult.classification}</span>
                </div>
                <ul className="mt-2 space-y-1 text-xs text-[#101114]/80">
                  {guardResult.reasons.map((r, i) => (
                    <li key={i}>• {r}</li>
                  ))}
                </ul>
              </div>
            )}

            <label className="flex cursor-pointer items-start gap-2.5 text-xs text-[#777777]">
              <input
                type="checkbox"
                checked={policyAccepted}
                onChange={(e) => setPolicyAccepted(e.target.checked)}
                className="mt-0.5 h-4 w-4 rounded accent-[#101114]"
              />
              <span>
                I confirm the parcel contains no prohibited or hazardous items and my contents declaration is accurate.
              </span>
            </label>
          </div>
        )}

        {/* STEP 5: PARTNER MATCHING & SMART MEETING POINTS */}
        {step === 5 && (
          <div className="space-y-5">
            <div>
              <h2 className="font-display text-xl font-bold text-[#101114]">
                AI Partner Matching &amp; Meeting Points
              </h2>
              <p className="text-xs text-[#777777]">
                {deliveryModel === 'community_relay'
                  ? 'Ranked against active, existing partner journeys matching your corridor.'
                  : 'Dedicated Premium Express partners available for doorstep pickup.'}
              </p>
            </div>

            {matchingLoading ? (
              <div className="flex items-center justify-center gap-2 py-10 text-sm text-[#777777]">
                <Loader2 className="h-5 w-5 animate-spin" />
                <span>Calculating route compatibility scores...</span>
              </div>
            ) : matches.length === 0 ? (
              <div className="rounded-2xl border border-neutral-200 bg-[#F5F5F5] p-5 text-sm text-[#777777]">
                No pre-published journey matches this exact corridor right now. You can still confirm to broadcast your parcel request to verified partners!
              </div>
            ) : (
              <div className="space-y-3">
                {matches.map((m, idx) => {
                  const isSelected = selectedMatch?.partnerId === m.partnerId && selectedMatch?.journeyId === m.journeyId;
                  return (
                    <button
                      key={`${m.partnerId}-${m.journeyId ?? idx}`}
                      type="button"
                      onClick={() => setSelectedMatch(m)}
                      className={`w-full rounded-2xl border p-4 text-left transition-all ${
                        isSelected
                          ? 'border-[#101114] bg-[#FFD43B]/20 ring-1 ring-[#101114]'
                          : 'border-neutral-200 bg-white hover:border-[#101114]'
                      }`}
                    >
                      <div className="flex flex-wrap items-start justify-between gap-3">
                        <div>
                          <div className="flex items-center gap-2">
                            <span className="font-display text-base font-bold text-[#101114]">{m.partnerName}</span>
                            <span className="text-xs text-[#777777]">
                              · {formatTransportModeLabel(m.transportMode)} · {m.vehicleNumber}
                            </span>
                          </div>
                          <div className="mt-1 text-xs font-medium text-[#101114]">
                            {m.journeyOrigin} → {m.journeyDest} ({m.departureTime})
                          </div>
                        </div>
                        <div className="text-right">
                          <div className="font-mono-num text-sm font-extrabold text-[#101114]">
                            Match {m.compatibilityScore}/100
                          </div>
                          <div className="font-mono-num text-xs text-[#777777]">
                            Reliability {m.reliabilityScore}% · ETA {m.etaLabel}
                          </div>
                        </div>
                      </div>
                      <div className="mt-2.5 flex flex-wrap gap-x-4 gap-y-1 text-xs text-[#777777]">
                        {m.matchReasons.map((r, i) => (
                          <span key={i}>• {r}</span>
                        ))}
                      </div>
                    </button>
                  );
                })}
              </div>
            )}

            {/* AI Smart Meeting Point Selection */}
            <div className="grid grid-cols-1 gap-4 rounded-2xl border border-neutral-200 bg-[#F5F5F5] p-4 sm:grid-cols-2">
              <div>
                <label className="mb-1.5 flex items-center gap-1.5 text-xs font-bold text-[#101114]">
                  <MapPin className="h-3.5 w-3.5" />
                  <span>Suggested Pickup Meeting Point</span>
                </label>
                <select
                  value={pickupMeetingPoint}
                  onChange={(e) => setPickupMeetingPoint(e.target.value)}
                  className="h-11 w-full rounded-xl border border-neutral-200 bg-white px-3 text-xs font-medium text-[#101114]"
                >
                  {pickupSuggestions.map((s) => (
                    <option key={s.id} value={s.name}>
                      {s.name} ({s.landmarkType})
                    </option>
                  ))}
                  <option value={pickupLocation}>{pickupLocation} (Original Address)</option>
                </select>
              </div>

              <div>
                <label className="mb-1.5 flex items-center gap-1.5 text-xs font-bold text-[#101114]">
                  <MapPin className="h-3.5 w-3.5" />
                  <span>Suggested Drop-Off Meeting Point</span>
                </label>
                <select
                  value={dropoffMeetingPoint}
                  onChange={(e) => setDropoffMeetingPoint(e.target.value)}
                  className="h-11 w-full rounded-xl border border-neutral-200 bg-white px-3 text-xs font-medium text-[#101114]"
                >
                  {dropoffSuggestions.map((s) => (
                    <option key={s.id} value={s.name}>
                      {s.name} ({s.landmarkType})
                    </option>
                  ))}
                  <option value={destinationLocation}>{destinationLocation} (Original Address)</option>
                </select>
              </div>
            </div>
          </div>
        )}

        {/* STEP 6: BOOKING CONFIRMATION & SIMULATED PAYMENT */}
        {step === 6 && (
          <div className="space-y-5">
            <h2 className="font-display text-xl font-bold text-[#101114]">
              Confirm Booking &amp; Simulated Payment
            </h2>

            <div className="grid grid-cols-1 gap-4 rounded-2xl border border-neutral-200 bg-[#F5F5F5] p-5 sm:grid-cols-2">
              <div className="space-y-2 text-xs">
                <div className="font-bold text-[#101114]">Route &amp; Meeting Points</div>
                <div className="text-[#777777]">
                  Pickup: <strong className="text-[#101114]">{pickupMeetingPoint || pickupLocation}</strong>
                </div>
                <div className="text-[#777777]">
                  Drop-off: <strong className="text-[#101114]">{dropoffMeetingPoint || destinationLocation}</strong>
                </div>
                <div className="text-[#777777]">
                  Distance &amp; ETA: <strong className="text-[#101114]">{route.distanceKm} km · {selectedQuote?.etaLabel}</strong>
                </div>
              </div>

              <div className="space-y-2 text-xs">
                <div className="font-bold text-[#101114]">Parcel &amp; Safety</div>
                <div className="text-[#777777]">
                  Contents: <strong className="text-[#101114]">{declaredContents}</strong>
                </div>
                <div className="text-[#777777]">
                  Weight &amp; Size: <strong className="text-[#101114]">{weightKg} kg ({lengthCm}×{widthCm}×{heightCm} cm)</strong>
                </div>
                <div className="text-[#777777]">
                  MOVEX Guard: <strong className="text-[#101114]">{guardResult?.classification || 'PERMITTED'}</strong>
                </div>
              </div>
            </div>

            <div>
              <label className="mb-2 flex items-center gap-2 text-xs font-bold text-[#101114]">
                <CreditCard className="h-4 w-4" />
                <span>Simulated INR Payment Method (Hackathon Demo Only)</span>
              </label>
              <div className="grid grid-cols-1 gap-2 sm:grid-cols-3">
                {['UPI Demo (Simulated)', 'Card Demo (Simulated)', 'MOVEX Wallet Demo'].map((pm) => (
                  <button
                    key={pm}
                    type="button"
                    onClick={() => setPaymentMethod(pm)}
                    className={`h-11 rounded-xl border px-3 text-xs font-semibold transition-colors ${
                      paymentMethod === pm
                        ? 'border-[#101114] bg-[#FFD43B] text-[#101114]'
                        : 'border-neutral-200 bg-white text-[#101114]'
                    }`}
                  >
                    {pm}
                  </button>
                ))}
              </div>
            </div>
          </div>
        )}

        {/* Step Navigation Buttons */}
        <div className="mt-8 flex items-center justify-between border-t border-neutral-200 pt-5">
          <button
            type="button"
            onClick={() => setStep((s) => Math.max(1, s - 1))}
            disabled={step === 1}
            className="inline-flex h-11 items-center gap-1.5 rounded-xl border border-neutral-200 bg-white px-4 text-sm font-semibold text-[#101114] hover:bg-[#F5F5F5] disabled:opacity-40"
          >
            <ChevronLeft className="h-4 w-4" />
            <span>Back</span>
          </button>

          {step < 6 ? (
            <button
              type="button"
              onClick={goNextStep}
              className="inline-flex h-11 items-center gap-1.5 rounded-xl bg-[#FFD43B] px-6 text-sm font-bold text-[#101114] hover:bg-[#F5C419]"
            >
              <span>Continue</span>
              <ChevronRight className="h-4 w-4" />
            </button>
          ) : (
            <button
              type="button"
              disabled={submitting}
              onClick={handleConfirmBooking}
              className="inline-flex h-11 items-center gap-2 rounded-xl bg-[#101114] px-6 text-sm font-bold text-[#FFD43B] hover:bg-[#25282D] disabled:opacity-60"
            >
              {submitting ? <Loader2 className="h-4 w-4 animate-spin" /> : <CheckCircle2 className="h-4 w-4" />}
              <span>
                {submitting
                  ? 'Processing Demo Payment...'
                  : `Confirm & Pay ₹${selectedQuote ? selectedQuote.totalPrice.toFixed(2) : '0.00'}`}
              </span>
            </button>
          )}
        </div>
      </div>

      {/* Prominent Live Fare Summary Card (Backend-Synchronized) */}
      <aside className="lg:col-span-4">
        <div className="sticky top-20 rounded-3xl border border-neutral-200 bg-[#101114] p-6 text-white">
          <div className="flex items-center justify-between">
            <span className="text-xs font-bold tracking-wider text-[#FFD43B] uppercase">
              MOVEX Estimated Fare
            </span>
            {(pricingLoading || routeLoading) && <Loader2 className="h-4 w-4 animate-spin text-[#FFD43B]" />}
          </div>

          <div className="mt-4 flex items-baseline justify-between border-b border-white/15 pb-4">
            <div className="flex items-center gap-2.5">
              <div className="flex h-10 w-10 items-center justify-center rounded-xl bg-[#FFD43B] text-[#101114]">
                <TransportModeIcon mode={transportMode} />
              </div>
              <div>
                <div className="font-display text-base font-bold">
                  {formatTransportModeLabel(transportMode)}
                </div>
                <div className="text-xs text-neutral-300">
                  {deliveryModel === 'community_relay' ? 'Community Relay' : 'Premium Express'}
                </div>
              </div>
            </div>
            <div className="font-mono-num text-3xl font-extrabold text-[#FFD43B]">
              ₹{selectedQuote ? selectedQuote.totalPrice.toFixed(0) : '—'}
            </div>
          </div>

          <div className="mt-4 flex items-center justify-between text-xs text-neutral-300">
            <span>Distance: <strong className="font-mono-num text-white">{route.distanceKm} km</strong></span>
            <span>ETA: <strong className="text-white">{selectedQuote?.etaLabel || '—'}</strong></span>
          </div>

          {selectedQuote && (
            <div className="mt-5 space-y-2 border-t border-white/15 pt-4 text-xs">
              <div className="flex justify-between text-neutral-300">
                <span>Base fare</span>
                <span className="font-mono-num text-white">₹{selectedQuote.baseFare.toFixed(2)}</span>
              </div>
              <div className="flex justify-between text-neutral-300">
                <span>Distance charge</span>
                <span className="font-mono-num text-white">₹{selectedQuote.distanceCharge.toFixed(2)}</span>
              </div>
              <div className="flex justify-between text-neutral-300">
                <span>Weight charge ({weightKg} kg)</span>
                <span className="font-mono-num text-white">₹{selectedQuote.weightCharge.toFixed(2)}</span>
              </div>
              <div className="flex justify-between text-neutral-300">
                <span>Dimension / volume charge</span>
                <span className="font-mono-num text-white">₹{selectedQuote.dimensionCharge.toFixed(2)}</span>
              </div>
              {selectedQuote.modelCharge > 0 && (
                <div className="flex justify-between text-neutral-300">
                  <span>Premium Express doorstep</span>
                  <span className="font-mono-num text-white">₹{selectedQuote.modelCharge.toFixed(2)}</span>
                </div>
              )}
              {selectedQuote.urgencyCharge > 0 && (
                <div className="flex justify-between text-neutral-300">
                  <span>Urgency ({urgency})</span>
                  <span className="font-mono-num text-white">₹{selectedQuote.urgencyCharge.toFixed(2)}</span>
                </div>
              )}
              <div className="flex justify-between text-neutral-300">
                <span>Platform fee</span>
                <span className="font-mono-num text-white">₹{selectedQuote.platformFee.toFixed(2)}</span>
              </div>
              <div className="flex justify-between border-t border-white/15 pt-2.5 text-sm font-bold text-[#FFD43B]">
                <span>Total (Simulated INR)</span>
                <span className="font-mono-num">₹{selectedQuote.totalPrice.toFixed(2)}</span>
              </div>
            </div>
          )}

          {selectedQuote && !selectedQuote.compatible && (
            <div className="mt-4 rounded-xl bg-red-950/60 p-3 text-xs text-red-200">
              {selectedQuote.incompatibilityReasons.join(' ')}
            </div>
          )}
        </div>
      </aside>
    </div>
  );
}
