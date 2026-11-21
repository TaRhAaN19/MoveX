import { useCallback, useEffect, useState } from 'react';
import { useNavigate, useParams } from 'react-router-dom';
import {
  AlertTriangle,
  CheckCircle2,
  Clock,
  MapPin,
  RefreshCw,
  Search,
  ShieldAlert,
  ShieldCheck,
  PackageCheck
} from 'lucide-react';
import { QRCodeSVG } from 'qrcode.react';
import { api, getApiError } from '../services/api';
import { useAuth } from '../context/AuthContext';
import { usePageMeta } from '../hooks/usePageMeta';
import { useToast } from '../context/ToastContext';
import type { Booking, RouteResult } from '../types/movex';
import MovexMap from '../components/MovexMap';
import CopyButton from '../components/CopyButton';
import ConfirmModal from '../components/ConfirmModal';
import { formatStatusLabel, formatTransportModeLabel, getStatusToneClass } from '../components/TransportIcon';

const LIFECYCLE_STEPS = [
  'CREATED',
  'DECLARED',
  'APPROVED',
  'MATCHING',
  'PARTNER_ASSIGNED',
  'PICKED_UP',
  'IN_TRANSIT',
  'HANDOVER_PENDING',
  'DELIVERED'
];

export default function TrackParcelPage({ embeddedCode }: { embeddedCode?: string }) {
  const { code: routeCode } = useParams();
  const navigate = useNavigate();
  const { user } = useAuth();
  const { success, error: toastError } = useToast();

  const initialCode = embeddedCode || routeCode || 'MVX-2026-1001';
  const [searchInput, setSearchInput] = useState(initialCode);
  const [booking, setBooking] = useState<Booking | null>(null);
  const [routeCoords, setRouteCoords] = useState<[number, number][]>([]);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');

  // Meeting point & dispute actions
  const [pickupMeetingInput, setPickupMeetingInput] = useState('');
  const [dropoffMeetingInput, setDropoffMeetingInput] = useState('');
  const [disputeReason, setDisputeReason] = useState('');
  const [disputeDesc, setDisputeDesc] = useState('');
  const [actionMessage, setActionMessage] = useState('');

  // Confirmation Modals
  const [showCancelModal, setShowCancelModal] = useState(false);
  const [cancelLoading, setCancelLoading] = useState(false);
  const [showDisputeModal, setShowDisputeModal] = useState(false);
  const [disputeLoading, setDisputeLoading] = useState(false);

  usePageMeta({
    title: booking ? `Track ${booking.parcel_code}` : 'Track Parcel & Live Custody',
    description: 'Track your MOVEX parcel with verified OTP timestamps, live simulated GPS, and mutual meeting points.',
  });

  const fetchParcel = useCallback(async (targetCode: string) => {
    if (!targetCode.trim()) return;
    setLoading(true);
    setError('');
    try {
      const { data } = await api.get<{ booking: Booking }>(`/bookings/${encodeURIComponent(targetCode.trim())}`);
      setBooking(data.booking);
      setPickupMeetingInput(data.booking.pickup_meeting_point || '');
      setDropoffMeetingInput(data.booking.dropoff_meeting_point || '');

      const rRes = await api.post<{ route: RouteResult }>('/geo/route', {
        pickupLat: data.booking.pickup_lat,
        pickupLng: data.booking.pickup_lng,
        destinationLat: data.booking.destination_lat,
        destinationLng: data.booking.destination_lng
      });
      setRouteCoords(rRes.data.route.coordinates);
    } catch (err) {
      setBooking(null);
      setError(getApiError(err, 'Parcel not found.'));
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    const target = embeddedCode || routeCode || 'MVX-2026-1001';
    setSearchInput(target);
    fetchParcel(target);
  }, [embeddedCode, routeCode, fetchParcel]);

  const handleSearch = (e: React.FormEvent) => {
    e.preventDefault();
    if (!searchInput.trim()) return;
    if (!embeddedCode) {
      navigate(`/track/${encodeURIComponent(searchInput.trim())}`);
    } else {
      fetchParcel(searchInput.trim());
    }
  };

  const handleUpdateMeetingPoints = async () => {
    if (!booking) return;
    setActionMessage('');
    try {
      const { data } = await api.post<{ booking: Booking }>(`/bookings/${booking.id}/meeting-point`, {
        pickupMeetingPoint: pickupMeetingInput,
        dropoffMeetingPoint: dropoffMeetingInput
      });
      setBooking(data.booking);
      const msg = 'Meeting point preference updated.';
      setActionMessage(msg);
      success(msg);
    } catch (err) {
      const errM = getApiError(err);
      setError(errM);
      toastError(errM);
    }
  };

  const handleConfirmDispute = async () => {
    if (!booking) return;
    setDisputeLoading(true);
    try {
      const { data } = await api.post<{ booking: Booking }>(`/bookings/${booking.id}/dispute`, {
        reason: disputeReason,
        description: disputeDesc
      });
      setBooking(data.booking);
      setDisputeReason('');
      setDisputeDesc('');
      setShowDisputeModal(false);
      const msg = 'Dispute submitted. Simulated payment placed ON HOLD for review.';
      setActionMessage(msg);
      success(msg, 'Dispute Filed');
    } catch (err) {
      const errM = getApiError(err);
      setError(errM);
      toastError(errM);
    } finally {
      setDisputeLoading(false);
    }
  };

  const handleConfirmCancel = async () => {
    if (!booking) return;
    setCancelLoading(true);
    try {
      const { data } = await api.post<{ booking: Booking; cancellationFee: number }>(`/bookings/${booking.id}/cancel`);
      setBooking(data.booking);
      setShowCancelModal(false);
      const msg = data.cancellationFee > 0
        ? `Booking cancelled. Simulated refund issued minus ₹${data.cancellationFee} fee.`
        : 'Booking cancelled. Full simulated refund issued.';
      setActionMessage(msg);
      success(msg, 'Booking Cancelled');
    } catch (err) {
      const errM = getApiError(err);
      setError(errM);
      toastError(errM);
    } finally {
      setCancelLoading(false);
    }
  };

  const isAuthorizedParty =
    user && booking && (user.id === booking.sender_id || user.id === booking.partner_id || user.role === 'admin');

  return (
    <div id="main-content" className={embeddedCode ? 'space-y-6' : 'mx-auto max-w-6xl px-4 py-8 sm:px-6'}>
      {/* Search Bar */}
      <form
        onSubmit={handleSearch}
        className="flex flex-col gap-3 rounded-2xl border border-neutral-200 dark:border-neutral-800 bg-[#F5F5F5] dark:bg-[#181a1f] p-4 sm:flex-row sm:items-center transition-colors"
      >
        <div className="flex flex-1 items-center gap-2 rounded-xl border border-neutral-200 dark:border-neutral-700 bg-white dark:bg-[#25282D] px-3">
          <Search className="h-4 w-4 text-[#777777] dark:text-neutral-400" />
          <input
            type="text"
            value={searchInput}
            onChange={(e) => setSearchInput(e.target.value)}
            placeholder="Enter Parcel ID (e.g. MVX-2026-1001)"
            className="h-11 w-full font-mono-num text-sm text-[#101114] dark:text-white bg-transparent focus:outline-none"
          />
        </div>
        <button
          type="submit"
          className="h-11 rounded-xl bg-[#101114] dark:bg-white px-5 text-sm font-semibold text-white dark:text-[#101114] hover:bg-[#25282D] dark:hover:bg-neutral-200 transition-colors"
        >
          Track Parcel
        </button>
        {booking && (
          <button
            type="button"
            onClick={() => fetchParcel(booking.parcel_code)}
            aria-label="Refresh tracking data"
            className="inline-flex h-11 items-center justify-center gap-1.5 rounded-xl border border-neutral-200 dark:border-neutral-700 bg-white dark:bg-[#25282D] px-4 text-xs font-semibold text-[#101114] dark:text-white hover:bg-neutral-50 dark:hover:bg-neutral-800 transition-colors"
          >
            <RefreshCw className={`h-4 w-4 ${loading ? 'animate-spin' : ''}`} />
            <span>Refresh</span>
          </button>
        )}
      </form>

      {error && (
        <div className="mt-4 rounded-xl border border-red-200 dark:border-red-900/60 bg-red-50 dark:bg-red-950/30 px-4 py-3 text-sm font-medium text-red-700 dark:text-red-400">
          {error}
        </div>
      )}

      {actionMessage && (
        <div className="mt-4 rounded-xl border border-emerald-200 dark:border-emerald-900/60 bg-emerald-50 dark:bg-emerald-950/30 px-4 py-3 text-sm font-medium text-emerald-700 dark:text-emerald-400">
          {actionMessage}
        </div>
      )}

      {booking && (
        <div className="mt-6 space-y-6">
          {/* Route Deviation Alert */}
          {booking.route_deviation_alert === 1 && (
            <div className="flex items-center gap-3 rounded-2xl border border-amber-300 dark:border-amber-700/60 bg-amber-50 dark:bg-amber-950/30 p-4 text-sm font-semibold text-amber-900 dark:text-amber-200">
              <AlertTriangle className="h-5 w-5 shrink-0 text-amber-700 dark:text-amber-400" />
              <span>
                Route Deviation Alert (Simulated GPS): Parcel telemetry deviated from the expected corridor. Review custody timeline below.
              </span>
            </div>
          )}

          {/* Digital Parcel Identity Header */}
          <div className="grid grid-cols-1 gap-6 rounded-3xl border border-neutral-200 dark:border-neutral-800 bg-white dark:bg-[#181a1f] p-6 lg:grid-cols-12 transition-colors">
            <div className="space-y-4 lg:col-span-8">
              <div className="flex flex-wrap items-center justify-between gap-2">
                <div>
                  <div className="text-xs font-semibold text-[#777777] dark:text-neutral-400">Digital Parcel Identity</div>
                  <div className="flex items-center gap-2 mt-0.5">
                    <h1 className="font-display font-mono-num text-2xl font-extrabold text-[#101114] dark:text-white">
                      {booking.parcel_code}
                    </h1>
                    <CopyButton text={booking.parcel_code} label="Copy ID" size="sm" />
                  </div>
                </div>
                <div className="text-right">
                  <div className={`text-sm font-extrabold ${getStatusToneClass(booking.status)}`}>
                    {formatStatusLabel(booking.status)}
                  </div>
                  <div className="font-mono-num text-xs text-[#777777] dark:text-neutral-400">
                    {new Date(booking.created_at).toLocaleString()}
                  </div>
                </div>
              </div>

              <div className="grid grid-cols-1 gap-3 border-t border-neutral-200 dark:border-neutral-800 pt-4 text-xs sm:grid-cols-3">
                <div>
                  <div className="text-[#777777] dark:text-neutral-400">Route</div>
                  <div className="mt-0.5 font-semibold text-[#101114] dark:text-white">
                    {booking.pickup_location} → {booking.destination_location}
                  </div>
                </div>
                <div>
                  <div className="text-[#777777] dark:text-neutral-400">Mode &amp; Model</div>
                  <div className="mt-0.5 font-semibold text-[#101114] dark:text-white">
                    {formatTransportModeLabel(booking.transport_mode)} ·{' '}
                    {booking.delivery_model === 'community_relay' ? 'Community Relay' : 'Premium Express'}
                  </div>
                </div>
                <div>
                  <div className="text-[#777777] dark:text-neutral-400">Parcel Specs</div>
                  <div className="font-mono-num mt-0.5 font-semibold text-[#101114] dark:text-white">
                    {booking.parcel_category} · {booking.weight_kg} kg · ₹{booking.total_price.toFixed(2)}
                  </div>
                </div>
              </div>

              <div className="grid grid-cols-1 gap-3 border-t border-neutral-200 dark:border-neutral-800 pt-4 text-xs sm:grid-cols-2">
                <div>
                  <div className="text-[#777777] dark:text-neutral-400">Agreed Meeting Points</div>
                  <div className="mt-0.5 font-medium text-[#101114] dark:text-neutral-200">
                    Pickup: {booking.pickup_meeting_point}
                  </div>
                  <div className="font-medium text-[#101114] dark:text-neutral-200">
                    Drop-off: {booking.dropoff_meeting_point}
                  </div>
                </div>
                <div>
                  <div className="text-[#777777] dark:text-neutral-400">MOVEX Guard &amp; Declaration</div>
                  <div className="mt-0.5 flex items-center gap-1.5 font-semibold text-[#101114] dark:text-white">
                    {booking.guard_classification === 'PERMITTED' ? (
                      <ShieldCheck className="h-4 w-4 text-emerald-700 dark:text-emerald-400" />
                    ) : (
                      <ShieldAlert className="h-4 w-4 text-amber-700 dark:text-amber-400" />
                    )}
                    <span>{booking.guard_classification}</span>
                  </div>
                  <div className="text-[#777777] dark:text-neutral-400">{booking.declared_contents}</div>
                </div>
              </div>

              {/* OTPs for Authorized Sender / Partner with Copy Buttons */}
              {isAuthorizedParty && (
                <div className="grid grid-cols-1 sm:grid-cols-3 gap-3 rounded-2xl bg-[#F5F5F5] dark:bg-[#25282D] p-4">
                  <div className="flex items-center justify-between sm:flex-col sm:items-start">
                    <div>
                      <div className="text-[11px] font-medium text-[#777777] dark:text-neutral-400">Pickup OTP</div>
                      <div className="font-mono-num text-lg font-extrabold text-[#101114] dark:text-white">{booking.pickup_otp}</div>
                    </div>
                    <CopyButton text={booking.pickup_otp} label="Copy" size="sm" />
                  </div>
                  <div className="flex items-center justify-between sm:flex-col sm:items-start">
                    <div>
                      <div className="text-[11px] font-medium text-[#777777] dark:text-neutral-400">Handover OTP</div>
                      <div className="font-mono-num text-lg font-extrabold text-[#101114] dark:text-white">{booking.handover_otp}</div>
                    </div>
                    <CopyButton text={booking.handover_otp} label="Copy" size="sm" />
                  </div>
                  <div className="flex items-center justify-between sm:flex-col sm:items-start">
                    <div>
                      <div className="text-[11px] font-medium text-[#777777] dark:text-neutral-400">Delivery OTP</div>
                      <div className="font-mono-num text-lg font-extrabold text-[#101114] dark:text-white">{booking.delivery_otp}</div>
                    </div>
                    <CopyButton text={booking.delivery_otp} label="Copy" size="sm" />
                  </div>
                </div>
              )}
            </div>

            <div className="flex flex-col items-center justify-center gap-3 rounded-2xl border border-neutral-200 dark:border-neutral-800 bg-[#F5F5F5] dark:bg-[#25282D] p-5 lg:col-span-4">
              <div className="rounded-xl bg-white p-3 shadow-xs">
                <QRCodeSVG value={`MOVEX:${booking.parcel_code}`} size={118} />
              </div>
              <div className="text-center text-xs text-[#777777] dark:text-neutral-400">
                Digital QR Identity · Physical sticker not required
              </div>
              {booking.parcel_photo_url && (
                <img
                  src={booking.parcel_photo_url}
                  alt="Uploaded parcel declaration"
                  loading="lazy"
                  className="h-24 w-full rounded-xl object-cover border border-neutral-200 dark:border-neutral-700"
                />
              )}
            </div>
          </div>

          {/* Lifecycle Progress Bar */}
          <div className="rounded-2xl border border-neutral-200 dark:border-neutral-800 bg-white dark:bg-[#181a1f] p-5 transition-colors">
            <h2 className="font-display text-sm font-bold text-[#101114] dark:text-white">Custody Stage</h2>
            <div className="mt-3 flex items-center gap-1.5 overflow-x-auto pb-1">
              {LIFECYCLE_STEPS.map((st) => {
                const idx = LIFECYCLE_STEPS.indexOf(booking.status);
                const curIdx = LIFECYCLE_STEPS.indexOf(st);
                const reached = idx >= curIdx && idx !== -1;
                return (
                  <div
                    key={st}
                    className={`shrink-0 rounded-lg px-2.5 py-1.5 text-[11px] font-semibold whitespace-nowrap ${
                      booking.status === st
                        ? 'bg-[#FFD43B] text-[#101114]'
                        : reached
                        ? 'bg-[#101114] dark:bg-white text-white dark:text-[#101114]'
                        : 'bg-[#F5F5F5] dark:bg-[#25282D] text-[#777777] dark:text-neutral-400'
                    }`}
                  >
                    {formatStatusLabel(st)}
                  </div>
                );
              })}
            </div>
          </div>

          {/* Map & Custody Timeline Split */}
          <div className="grid grid-cols-1 gap-6 lg:grid-cols-12">
            <div className="lg:col-span-7">
              <MovexMap
                pickupLocation={booking.pickup_location}
                pickupLatitude={booking.pickup_lat}
                pickupLongitude={booking.pickup_lng}
                destinationLocation={booking.destination_location}
                destinationLatitude={booking.destination_lat}
                destinationLongitude={booking.destination_lng}
                routeCoordinates={routeCoords}
                liveLat={booking.current_lat}
                liveLng={booking.current_lng}
                heightClass="h-80 md:h-96"
              />
            </div>

            <div className="rounded-3xl border border-neutral-200 dark:border-neutral-800 bg-white dark:bg-[#181a1f] p-5 lg:col-span-5 transition-colors">
              <h2 className="font-display text-base font-bold text-[#101114] dark:text-white">Custody &amp; Tracking Timeline</h2>
              <div className="mt-4 max-h-80 space-y-4 overflow-y-auto pr-1">
                {(booking.trackingEvents || []).map((ev) => (
                  <div key={ev.id} className="flex gap-3 border-b border-neutral-100 dark:border-neutral-800 pb-3 last:border-0">
                    <div className="mt-0.5 flex h-7 w-7 shrink-0 items-center justify-center rounded-full bg-[#F5F5F5] dark:bg-[#25282D] text-[#101114] dark:text-white">
                      {ev.status === 'DELIVERED' ? (
                        <CheckCircle2 className="h-4 w-4 text-emerald-700 dark:text-emerald-400" />
                      ) : (
                        <Clock className="h-4 w-4" />
                      )}
                    </div>
                    <div className="min-w-0 flex-1">
                      <div className="flex items-center justify-between gap-2">
                        <span className="text-xs font-bold text-[#101114] dark:text-white">{ev.title}</span>
                        <span className="font-mono-num text-[10px] text-[#777777] dark:text-neutral-400">
                          {new Date(ev.created_at).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}
                        </span>
                      </div>
                      <p className="mt-0.5 text-xs text-[#777777] dark:text-neutral-400">{ev.description}</p>
                      <div className="mt-1 text-[11px] font-medium text-[#777777] dark:text-neutral-400">
                        {ev.actor_name} · {ev.location_name}
                        {ev.is_simulated_gps === 1 ? ' (Simulated GPS)' : ''}
                      </div>
                    </div>
                  </div>
                ))}
              </div>
            </div>
          </div>

          {/* Authorized Sender / Partner Actions */}
          {isAuthorizedParty && (
            <div className="grid grid-cols-1 gap-6 md:grid-cols-2">
              {/* Mutual Meeting Point Coordination */}
              <div className="rounded-2xl border border-neutral-200 dark:border-neutral-800 bg-white dark:bg-[#181a1f] p-5 transition-colors">
                <div className="flex items-center gap-2">
                  <MapPin className="h-4 w-4 text-[#101114] dark:text-[#FFD43B]" />
                  <h3 className="font-display text-sm font-bold text-[#101114] dark:text-white">
                    Mutual Meeting Point Coordination
                  </h3>
                </div>
                <div className="mt-3 space-y-3">
                  <div>
                    <label className="mb-1 block text-xs font-medium text-[#777777] dark:text-neutral-400">Pickup Point</label>
                    <input
                      type="text"
                      value={pickupMeetingInput}
                      onChange={(e) => setPickupMeetingInput(e.target.value)}
                      className="h-10 w-full rounded-xl border border-neutral-200 dark:border-neutral-700 bg-[#F5F5F5] dark:bg-[#25282D] px-3 text-xs text-[#101114] dark:text-white"
                    />
                  </div>
                  <div>
                    <label className="mb-1 block text-xs font-medium text-[#777777] dark:text-neutral-400">Drop-Off Point</label>
                    <input
                      type="text"
                      value={dropoffMeetingInput}
                      onChange={(e) => setDropoffMeetingInput(e.target.value)}
                      className="h-10 w-full rounded-xl border border-neutral-200 dark:border-neutral-700 bg-[#F5F5F5] dark:bg-[#25282D] px-3 text-xs text-[#101114] dark:text-white"
                    />
                  </div>
                  <div className="flex flex-wrap items-center justify-between gap-2">
                    <span className="text-[11px] text-[#777777] dark:text-neutral-400">
                      Sender agreed: {booking.meeting_agreed_by_sender ? 'Yes' : 'Pending'} · Partner agreed:{' '}
                      {booking.meeting_agreed_by_partner ? 'Yes' : 'Pending'}
                    </span>
                    <button
                      type="button"
                      onClick={handleUpdateMeetingPoints}
                      className="h-9 rounded-xl bg-[#FFD43B] px-4 text-xs font-bold text-[#101114] hover:bg-[#F5C419] transition-colors"
                    >
                      Save &amp; Agree
                    </button>
                  </div>
                </div>
              </div>

              {/* Cancel / Dispute Card */}
              <div className="rounded-2xl border border-neutral-200 dark:border-neutral-800 bg-white dark:bg-[#181a1f] p-5 transition-colors">
                <h3 className="font-display text-sm font-bold text-[#101114] dark:text-white">Booking Actions &amp; Disputes</h3>
                {user?.id === booking.sender_id &&
                  !['PICKED_UP', 'IN_TRANSIT', 'DELIVERED', 'CANCELLED', 'REJECTED'].includes(booking.status) && (
                    <div className="mt-3 border-b border-neutral-200 dark:border-neutral-800 pb-4">
                      <button
                        type="button"
                        onClick={() => setShowCancelModal(true)}
                        className="h-9 rounded-xl border border-red-300 dark:border-red-900 bg-red-50 dark:bg-red-950/30 px-4 text-xs font-bold text-red-700 dark:text-red-400 hover:bg-red-100 dark:hover:bg-red-900/50 transition-colors"
                      >
                        Cancel Booking (Simulated Refund)
                      </button>
                    </div>
                  )}

                <div className="mt-3 space-y-2.5">
                  <input
                    type="text"
                    required
                    value={disputeReason}
                    onChange={(e) => setDisputeReason(e.target.value)}
                    placeholder="Dispute reason (e.g. Late arrival, Damaged packaging)"
                    className="h-10 w-full rounded-xl border border-neutral-200 dark:border-neutral-700 bg-[#F5F5F5] dark:bg-[#25282D] px-3 text-xs text-[#101114] dark:text-white"
                  />
                  <input
                    type="text"
                    required
                    value={disputeDesc}
                    onChange={(e) => setDisputeDesc(e.target.value)}
                    placeholder="Describe the issue for admin review"
                    className="h-10 w-full rounded-xl border border-neutral-200 dark:border-neutral-700 bg-[#F5F5F5] dark:bg-[#25282D] px-3 text-xs text-[#101114] dark:text-white"
                  />
                  <button
                    type="button"
                    onClick={() => {
                      if (!disputeReason.trim() || !disputeDesc.trim()) {
                        setError('Please provide both reason and description for dispute.');
                        return;
                      }
                      setShowDisputeModal(true);
                    }}
                    className="h-9 rounded-xl bg-[#101114] dark:bg-white px-4 text-xs font-semibold text-white dark:text-[#101114] hover:bg-[#25282D] dark:hover:bg-neutral-200 transition-colors"
                  >
                    Raise Dispute (Places Payment On Hold)
                  </button>
                </div>
              </div>
            </div>
          )}
        </div>
      )}

      {/* Confirmation Modals (Feature 30) */}
      <ConfirmModal
        isOpen={showCancelModal}
        title="Cancel This Booking?"
        message="Are you sure you want to cancel this parcel booking? A simulated refund will be processed back to your original payment method according to cancellation rules."
        confirmText="Yes, Cancel Booking"
        isDestructive={true}
        isLoading={cancelLoading}
        onConfirm={handleConfirmCancel}
        onCancel={() => setShowCancelModal(false)}
      />

      <ConfirmModal
        isOpen={showDisputeModal}
        title="Submit Dispute for Administrative Review?"
        message="Filing a formal dispute will immediately place the traveller's payout into escrow hold. A MOVEX operations dispatcher will review the custody timeline."
        confirmText="Confirm & File Dispute"
        isDestructive={false}
        isLoading={disputeLoading}
        onConfirm={handleConfirmDispute}
        onCancel={() => setShowDisputeModal(false)}
      />
    </div>
  );
}
