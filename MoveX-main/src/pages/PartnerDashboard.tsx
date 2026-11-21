import { useCallback, useEffect, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import {
  ArrowRightLeft,
  CheckCircle2,
  ClipboardList,
  History,
  Home,
  IndianRupee,
  LogOut,
  MapPin,
  Navigation,
  Pause,
  Play,
  PlusCircle,
  Trash2,
  Truck,
  User as UserIcon
} from 'lucide-react';
import { Bar, BarChart, CartesianGrid, ResponsiveContainer, Tooltip, XAxis, YAxis } from 'recharts';
import { api, getApiError } from '../services/api';
import { useAuth } from '../context/AuthContext';
import type { Booking, Journey, Payment, PartnerProfile, RouteResult, TransportMode } from '../types/movex';
import LocationPicker from '../components/LocationPicker';
import MovexMap from '../components/MovexMap';
import { formatStatusLabel, formatTransportModeLabel, getStatusToneClass } from '../components/TransportIcon';

type PartnerTab = 'overview' | 'publish' | 'requests' | 'deliveries' | 'earnings' | 'history' | 'profile';

interface PartnerRequestItem extends Booking {
  matchedJourneyId: number | null;
  matchedJourneyLabel: string;
  compatibilityScore: number;
  suggestedPickup: string;
  suggestedDropoff: string;
}

export default function PartnerDashboard() {
  const { user, partnerProfile, logout, switchActivity, refreshMe } = useAuth();
  const navigate = useNavigate();

  const [tab, setTab] = useState<PartnerTab>('overview');
  const [stats, setStats] = useState({
    totalEarnings: 0,
    weeklyEarnings: 0,
    monthlyEarnings: 0,
    pendingEarnings: 0,
    activeDeliveries: 0,
    completedDeliveries: 0,
    availableRequestsCount: 0,
    rating: 4.8,
    verificationStatus: 'VERIFIED'
  });
  const [profile, setProfile] = useState<PartnerProfile | null>(partnerProfile);
  const [dailyEarnings, setDailyEarnings] = useState<Array<{ day: string; earnings: number }>>([]);
  const [transactions, setTransactions] = useState<Payment[]>([]);
  const [journeys, setJourneys] = useState<Journey[]>([]);
  const [requests, setRequests] = useState<PartnerRequestItem[]>([]);
  const [deliveries, setDeliveries] = useState<Booking[]>([]);
  const [feedback, setFeedback] = useState('');
  const [errorMsg, setErrorMsg] = useState('');

  // Publish Journey ("SHARE YOUR JOURNEY") state
  const [originName, setOriginName] = useState('Panaji, Goa');
  const [originLat, setOriginLat] = useState<number | null>(15.4909);
  const [originLng, setOriginLng] = useState<number | null>(73.8278);
  const [destName, setDestName] = useState('Margao, Goa');
  const [destLat, setDestLat] = useState<number | null>(15.2832);
  const [destLng, setDestLng] = useState<number | null>(73.9862);
  const [mapSelectMode, setMapSelectMode] = useState<'none' | 'pickup' | 'destination'>('none');
  const [journeyRoute, setJourneyRoute] = useState<[number, number][]>([]);
  const [travelDate, setTravelDate] = useState(new Date().toISOString().slice(0, 10));
  const [departureTime, setDepartureTime] = useState('09:30');
  const [expectedArrival, setExpectedArrival] = useState('10:45');
  const [transportMode, setTransportMode] = useState<TransportMode>(partnerProfile?.primary_mode || 'bike');
  const [capacityCount, setCapacityCount] = useState(2);
  const [maxWeightKg, setMaxWeightKg] = useState(5);
  const [meetingPointsText, setMeetingPointsText] = useState('Panaji Kadamba Bus Stand, Verna Junction, Margao KTC Stand');
  const [isRecurring, setIsRecurring] = useState(false);
  const [recurrenceRule, setRecurrenceRule] = useState('Every Weekday (Mon-Fri)');
  const [declarationConfirmed, setDeclarationConfirmed] = useState(false);
  const [publishing, setPublishing] = useState(false);

  // OTP inputs per delivery ID
  const [otpInputs, setOtpInputs] = useState<Record<number, string>>({});
  const [selectedRequestDetail, setSelectedRequestDetail] = useState<PartnerRequestItem | null>(null);

  // Partner Profile form
  const [vehNumber, setVehNumber] = useState(partnerProfile?.vehicle_number || '');
  const [prefCorridors, setPrefCorridors] = useState(partnerProfile?.preferred_corridors || '');
  const [isAvailable, setIsAvailable] = useState(partnerProfile ? partnerProfile.is_available === 1 : true);

  const loadAll = useCallback(async () => {
    try {
      const [ovRes, jRes, rRes, dRes] = await Promise.all([
        api.get('/partner/overview'),
        api.get('/partner/journeys'),
        api.get('/partner/requests'),
        api.get('/partner/deliveries')
      ]);
      setStats(ovRes.data.stats);
      setProfile(ovRes.data.profile);
      setDailyEarnings(ovRes.data.dailyEarnings || []);
      setTransactions(ovRes.data.transactions || []);
      setJourneys(jRes.data.journeys || []);
      setRequests(rRes.data.requests || []);
      setDeliveries(dRes.data.deliveries || []);
      if (ovRes.data.profile) {
        setVehNumber(ovRes.data.profile.vehicle_number || '');
        setPrefCorridors(ovRes.data.profile.preferred_corridors || '');
        setIsAvailable(ovRes.data.profile.is_available === 1);
      }
    } catch {
      // handled cleanly
    }
  }, []);

  useEffect(() => {
    loadAll();
  }, [loadAll]);

  useEffect(() => {
    if (originLat === null || originLng === null || destLat === null || destLng === null) return;
    api
      .post<{ route: RouteResult }>('/geo/route', {
        pickupLat: originLat,
        pickupLng: originLng,
        destinationLat: destLat,
        destinationLng: destLng
      })
      .then(({ data }) => setJourneyRoute(data.route.coordinates))
      .catch(() => {});
  }, [originLat, originLng, destLat, destLng]);

  const handleMapClick = async (lat: number, lng: number) => {
    const mode = mapSelectMode;
    if (mode === 'none') return;
    setMapSelectMode('none');
    try {
      const { data } = await api.get<{ name: string }>('/geo/reverse', { params: { lat, lng } });
      if (mode === 'pickup') {
        setOriginName(data.name);
        setOriginLat(lat);
        setOriginLng(lng);
      } else {
        setDestName(data.name);
        setDestLat(lat);
        setDestLng(lng);
      }
    } catch {
      // ignore
    }
  };

  const handlePublishJourney = async (e: React.FormEvent) => {
    e.preventDefault();
    setErrorMsg('');
    setFeedback('');
    if (!declarationConfirmed) {
      setErrorMsg('You must confirm the mandatory existing-journey declaration before publishing.');
      return;
    }
    setPublishing(true);
    try {
      await api.post('/partner/journeys', {
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
        availableCapacityCount: capacityCount,
        maxWeightKg,
        preferredMeetingPoints: meetingPointsText,
        isRecurring,
        recurrenceRule: isRecurring ? recurrenceRule : '',
        declarationConfirmed
      });
      setFeedback('Existing journey published! Matching parcel requests updated.');
      setDeclarationConfirmed(false);
      await loadAll();
    } catch (err) {
      setErrorMsg(getApiError(err));
    } finally {
      setPublishing(false);
    }
  };

  const handleJourneyStatus = async (journeyId: number, status: 'ACTIVE' | 'PAUSED') => {
    try {
      await api.patch(`/partner/journeys/${journeyId}`, { status });
      await loadAll();
    } catch (err) {
      setErrorMsg(getApiError(err));
    }
  };

  const handleDeleteJourney = async (journeyId: number) => {
    try {
      await api.delete(`/partner/journeys/${journeyId}`);
      await loadAll();
    } catch (err) {
      setErrorMsg(getApiError(err));
    }
  };

  const handleAcceptRequest = async (reqItem: PartnerRequestItem) => {
    setErrorMsg('');
    setFeedback('');
    try {
      await api.post(`/partner/requests/${reqItem.id}/accept`, {
        journeyId: reqItem.matchedJourneyId,
        agreedPickupPoint: reqItem.suggestedPickup,
        agreedDropoffPoint: reqItem.suggestedDropoff
      });
      setFeedback(`Accepted ${reqItem.parcel_code}! Proceed to Active Deliveries for Pickup OTP verification.`);
      setSelectedRequestDetail(null);
      await loadAll();
      setTab('deliveries');
    } catch (err) {
      setErrorMsg(getApiError(err));
      await loadAll();
    }
  };

  const handleRejectRequest = async (reqId: number) => {
    try {
      await api.post(`/partner/requests/${reqId}/reject`, { reason: 'Not feasible for current schedule' });
      await loadAll();
    } catch (err) {
      setErrorMsg(getApiError(err));
    }
  };

  const handlePickupOtp = async (bookingId: number) => {
    setErrorMsg('');
    setFeedback('');
    try {
      await api.post(`/partner/deliveries/${bookingId}/pickup-otp`, { otp: otpInputs[bookingId] || '' });
      setFeedback('Pickup OTP verified! Parcel is now IN TRANSIT.');
      setOtpInputs((prev) => ({ ...prev, [bookingId]: '' }));
      await loadAll();
    } catch (err) {
      setErrorMsg(getApiError(err));
    }
  };

  const handleSimulateGps = async (bookingId: number, progress: number, simulateDeviation = false) => {
    setErrorMsg('');
    setFeedback('');
    try {
      await api.post(`/partner/deliveries/${bookingId}/simulate-gps`, { progress, simulateDeviation });
      setFeedback(
        simulateDeviation
          ? 'Simulated GPS deviation alert triggered for tracking verification.'
          : `Simulated GPS checkpoint updated (${Math.round(progress * 100)}%).`
      );
      await loadAll();
    } catch (err) {
      setErrorMsg(getApiError(err));
    }
  };

  const handleRelayHandover = async (bookingId: number, action: 'initiate' | 'complete') => {
    setErrorMsg('');
    setFeedback('');
    try {
      await api.post(`/partner/deliveries/${bookingId}/handover`, {
        action,
        otp: otpInputs[bookingId] || ''
      });
      setFeedback(action === 'initiate' ? 'Relay handover pending OTP.' : 'Relay handover authenticated!');
      await loadAll();
    } catch (err) {
      setErrorMsg(getApiError(err));
    }
  };

  const handleDeliverOtp = async (bookingId: number) => {
    setErrorMsg('');
    setFeedback('');
    try {
      await api.post(`/partner/deliveries/${bookingId}/deliver-otp`, { otp: otpInputs[bookingId] || '' });
      setFeedback('Recipient Delivery OTP verified! Parcel marked DELIVERED and earnings credited.');
      setOtpInputs((prev) => ({ ...prev, [bookingId]: '' }));
      await loadAll();
    } catch (err) {
      setErrorMsg(getApiError(err));
    }
  };

  const handleSavePartnerProfile = async (e: React.FormEvent) => {
    e.preventDefault();
    setFeedback('');
    try {
      await api.put('/auth/profile', {
        vehicleNumber: vehNumber,
        preferredCorridors: prefCorridors,
        isAvailable
      });
      await refreshMe();
      await loadAll();
      setFeedback('Partner availability & vehicle settings saved.');
    } catch (err) {
      setErrorMsg(getApiError(err));
    }
  };

  const handleSwitchToSender = async () => {
    await switchActivity('sender');
    navigate('/sender');
  };

  const activeList = deliveries.filter((d) =>
    ['PARTNER_ASSIGNED', 'PICKED_UP', 'IN_TRANSIT', 'HANDOVER_PENDING'].includes(d.status)
  );
  const historyList = deliveries.filter((d) => ['DELIVERED', 'CANCELLED', 'DISPUTED'].includes(d.status));

  const NAV_ITEMS: Array<{ id: PartnerTab; label: string; icon: React.ReactNode }> = [
    { id: 'overview', label: 'Overview', icon: <Home className="h-4 w-4" /> },
    { id: 'publish', label: 'Publish Journey', icon: <PlusCircle className="h-4 w-4" /> },
    { id: 'requests', label: `Requests (${requests.length})`, icon: <ClipboardList className="h-4 w-4" /> },
    { id: 'deliveries', label: `Active (${activeList.length})`, icon: <Truck className="h-4 w-4" /> },
    { id: 'earnings', label: 'Earnings', icon: <IndianRupee className="h-4 w-4" /> },
    { id: 'history', label: 'History', icon: <History className="h-4 w-4" /> },
    { id: 'profile', label: 'Profile', icon: <UserIcon className="h-4 w-4" /> }
  ];

  return (
    <div className="mx-auto max-w-7xl px-4 py-6 pb-24 sm:px-6 md:pb-10">
      <div className="grid grid-cols-1 gap-6 lg:grid-cols-12">
        {/* Sidebar */}
        <aside className="hidden lg:col-span-3 lg:block">
          <div className="sticky top-20 rounded-3xl border border-neutral-200 bg-[#101114] p-4 text-white">
            <div className="border-b border-white/15 pb-4">
              <div className="text-xs font-semibold text-[#FFD43B]">Delivery Partner Hub</div>
              <div className="font-display mt-0.5 text-lg font-extrabold">{user?.name}</div>
              <div className="text-xs text-neutral-300">
                {stats.verificationStatus} · Reliability {profile?.reliability_score ?? 94}/100
              </div>
            </div>

            <nav className="mt-3 space-y-1">
              {NAV_ITEMS.map((item) => (
                <button
                  key={item.id}
                  type="button"
                  onClick={() => setTab(item.id)}
                  className={`flex h-11 w-full items-center gap-3 rounded-xl px-3.5 text-sm font-semibold transition-colors ${
                    tab === item.id
                      ? 'bg-[#FFD43B] text-[#101114]'
                      : 'text-neutral-200 hover:bg-[#25282D]'
                  }`}
                >
                  {item.icon}
                  <span>{item.label}</span>
                </button>
              ))}
            </nav>

            <div className="mt-5 space-y-2 border-t border-white/15 pt-4">
              <button
                type="button"
                onClick={handleSwitchToSender}
                className="flex h-11 w-full items-center justify-center gap-2 rounded-xl border border-white/25 bg-[#25282D] px-3 text-xs font-bold text-white hover:bg-white hover:text-[#101114]"
              >
                <ArrowRightLeft className="h-4 w-4" />
                <span>Switch to Send a Parcel</span>
              </button>
              <button
                type="button"
                onClick={() => {
                  logout();
                  navigate('/');
                }}
                className="flex h-10 w-full items-center justify-center gap-2 rounded-xl text-xs font-semibold text-neutral-400 hover:text-red-400"
              >
                <LogOut className="h-3.5 w-3.5" />
                <span>Logout</span>
              </button>
            </div>
          </div>
        </aside>

        {/* Main Panel */}
        <section className="space-y-5 lg:col-span-9">
          <div className="flex items-center justify-between gap-2 lg:hidden">
            <div className="text-sm font-bold text-[#101114]">Partner Hub · {user?.name}</div>
            <button
              type="button"
              onClick={handleSwitchToSender}
              className="inline-flex h-9 items-center gap-1.5 rounded-xl bg-[#101114] px-3 text-xs font-bold text-white"
            >
              <ArrowRightLeft className="h-3.5 w-3.5" />
              <span>Send Mode</span>
            </button>
          </div>

          {feedback && (
            <div className="rounded-xl border border-emerald-200 bg-emerald-50 px-4 py-3 text-sm font-medium text-emerald-800">
              {feedback}
            </div>
          )}
          {errorMsg && (
            <div className="rounded-xl border border-red-200 bg-red-50 px-4 py-3 text-sm font-medium text-red-700">
              {errorMsg}
            </div>
          )}

          {/* OVERVIEW */}
          {tab === 'overview' && (
            <div className="space-y-6">
              <div className="flex flex-col justify-between gap-4 rounded-3xl border border-neutral-200 bg-[#F5F5F5] p-6 sm:flex-row sm:items-center">
                <div>
                  <h1 className="font-display text-2xl font-extrabold text-[#101114]">
                    Earn while you&apos;re on the move
                  </h1>
                  <p className="mt-1 text-sm text-[#777777]">
                    Publish your existing commute or intercity journey to carry matched Community Relay parcels.
                  </p>
                </div>
                <button
                  type="button"
                  onClick={() => setTab('publish')}
                  className="inline-flex h-12 shrink-0 items-center justify-center gap-2 rounded-xl bg-[#FFD43B] px-5 text-sm font-extrabold text-[#101114] hover:bg-[#F5C419]"
                >
                  <Navigation className="h-4 w-4" />
                  <span>Share Your Journey</span>
                </button>
              </div>

              <div className="grid grid-cols-2 gap-4 sm:grid-cols-3">
                <div className="rounded-2xl border border-neutral-200 bg-white p-4">
                  <div className="text-xs text-[#777777]">Total Earnings (Demo)</div>
                  <div className="font-mono-num mt-1 text-2xl font-extrabold text-[#101114]">
                    ₹{stats.totalEarnings.toFixed(0)}
                  </div>
                </div>
                <div className="rounded-2xl border border-neutral-200 bg-white p-4">
                  <div className="text-xs text-[#777777]">Active Deliveries</div>
                  <div className="font-mono-num mt-1 text-2xl font-extrabold text-[#101114]">
                    {stats.activeDeliveries}
                  </div>
                </div>
                <div className="rounded-2xl border border-neutral-200 bg-white p-4">
                  <div className="text-xs text-[#777777]">Completed Deliveries</div>
                  <div className="font-mono-num mt-1 text-2xl font-extrabold text-[#101114]">
                    {stats.completedDeliveries}
                  </div>
                </div>
                <div className="rounded-2xl border border-neutral-200 bg-white p-4">
                  <div className="text-xs text-[#777777]">Matching Requests</div>
                  <div className="font-mono-num mt-1 text-2xl font-extrabold text-[#101114]">
                    {stats.availableRequestsCount}
                  </div>
                </div>
                <div className="rounded-2xl border border-neutral-200 bg-white p-4">
                  <div className="text-xs text-[#777777]">Partner Rating</div>
                  <div className="font-mono-num mt-1 text-2xl font-extrabold text-[#101114]">
                    {stats.rating.toFixed(1)} / 5
                  </div>
                </div>
                <div className="rounded-2xl border border-neutral-200 bg-white p-4">
                  <div className="text-xs text-[#777777]">Verification Status</div>
                  <div className="mt-1 text-lg font-extrabold text-emerald-700">{stats.verificationStatus}</div>
                </div>
              </div>
            </div>
          )}

          {/* PUBLISH JOURNEY ("SHARE YOUR JOURNEY") */}
          {tab === 'publish' && (
            <div className="space-y-6">
              <form onSubmit={handlePublishJourney} className="rounded-3xl border border-neutral-200 bg-white p-6 space-y-5">
                <div>
                  <h2 className="font-display text-xl font-extrabold text-[#101114]">SHARE YOUR JOURNEY</h2>
                  <p className="text-xs text-[#777777]">
                    Community Relay accepts existing journeys only—share a trip you are already making.
                  </p>
                </div>

                <div className="grid grid-cols-1 gap-4 md:grid-cols-2">
                  <LocationPicker
                    label="Starting Location"
                    placeholder="Where are you departing from?"
                    value={originName}
                    latitude={originLat}
                    longitude={originLng}
                    isSelectingOnMap={mapSelectMode === 'pickup'}
                    onToggleMapSelect={() => setMapSelectMode((m) => (m === 'pickup' ? 'none' : 'pickup'))}
                    onSelectLocation={(name, lat, lng) => {
                      setOriginName(name);
                      setOriginLat(lat);
                      setOriginLng(lng);
                    }}
                    accentColor="yellow"
                  />

                  <LocationPicker
                    label="Destination"
                    placeholder="Where are you travelling to?"
                    value={destName}
                    latitude={destLat}
                    longitude={destLng}
                    isSelectingOnMap={mapSelectMode === 'destination'}
                    onToggleMapSelect={() => setMapSelectMode((m) => (m === 'destination' ? 'none' : 'destination'))}
                    onSelectLocation={(name, lat, lng) => {
                      setDestName(name);
                      setDestLat(lat);
                      setDestLng(lng);
                    }}
                    accentColor="black"
                  />
                </div>

                <MovexMap
                  pickupLocation={originName}
                  pickupLatitude={originLat}
                  pickupLongitude={originLng}
                  destinationLocation={destName}
                  destinationLatitude={destLat}
                  destinationLongitude={destLng}
                  routeCoordinates={journeyRoute}
                  selectionMode={mapSelectMode}
                  onMapClick={handleMapClick}
                  heightClass="h-64"
                />

                <div className="grid grid-cols-2 gap-3 sm:grid-cols-4">
                  <div>
                    <label className="mb-1 block text-xs font-semibold text-[#101114]">Travel Date</label>
                    <input
                      type="date"
                      value={travelDate}
                      onChange={(e) => setTravelDate(e.target.value)}
                      className="h-11 w-full rounded-xl border border-neutral-200 bg-[#F5F5F5] px-3 text-xs text-[#101114] focus:outline-none focus:border-[#101114] focus:bg-white"
                    />
                  </div>
                  <div>
                    <label className="mb-1 block text-xs font-semibold text-[#101114]">Departure</label>
                    <input
                      type="time"
                      value={departureTime}
                      onChange={(e) => setDepartureTime(e.target.value)}
                      className="h-11 w-full rounded-xl border border-neutral-200 bg-[#F5F5F5] px-3 text-xs text-[#101114] focus:outline-none focus:border-[#101114] focus:bg-white"
                    />
                  </div>
                  <div>
                    <label className="mb-1 block text-xs font-semibold text-[#101114]">Expected Arrival</label>
                    <input
                      type="time"
                      value={expectedArrival}
                      onChange={(e) => setExpectedArrival(e.target.value)}
                      className="h-11 w-full rounded-xl border border-neutral-200 bg-[#F5F5F5] px-3 text-xs text-[#101114] focus:outline-none focus:border-[#101114] focus:bg-white"
                    />
                  </div>
                  <div>
                    <label className="mb-1 block text-xs font-semibold text-[#101114]">Transport Mode</label>
                    <select
                      value={transportMode}
                      onChange={(e) => setTransportMode(e.target.value as TransportMode)}
                      className="h-11 w-full rounded-xl border border-neutral-200 bg-[#F5F5F5] px-3 text-xs font-semibold text-[#101114] focus:outline-none focus:border-[#101114] focus:bg-white"
                    >
                      <option value="bike" className="text-[#101114] bg-white">Bike</option>
                      <option value="car" className="text-[#101114] bg-white">Car</option>
                      <option value="bus" className="text-[#101114] bg-white">Bus</option>
                      <option value="train" className="text-[#101114] bg-white">Train</option>
                      <option value="flight" className="text-[#101114] bg-white">Flight</option>
                      <option value="freight" className="text-[#101114] bg-white">Commercial Freight</option>
                    </select>
                  </div>
                </div>

                <div className="grid grid-cols-1 gap-3 sm:grid-cols-3">
                  <div>
                    <label className="mb-1 block text-xs font-semibold text-[#101114]">Available Parcel Slots</label>
                    <input
                      type="number"
                      min="1"
                      max="10"
                      value={capacityCount}
                      onChange={(e) => setCapacityCount(Number(e.target.value))}
                      className="h-11 w-full rounded-xl border border-neutral-200 bg-[#F5F5F5] px-3 font-mono-num text-sm text-[#101114] focus:outline-none focus:border-[#101114] focus:bg-white"
                    />
                  </div>
                  <div>
                    <label className="mb-1 block text-xs font-semibold text-[#101114]">Max Weight (kg, up to 15)</label>
                    <input
                      type="number"
                      min="0.5"
                      max="15"
                      step="0.5"
                      value={maxWeightKg}
                      onChange={(e) => setMaxWeightKg(Number(e.target.value))}
                      className="h-11 w-full rounded-xl border border-neutral-200 bg-[#F5F5F5] px-3 font-mono-num text-sm text-[#101114] focus:outline-none focus:border-[#101114] focus:bg-white"
                    />
                  </div>
                  <div>
                    <label className="mb-1 block text-xs font-semibold text-[#101114]">Preferred Meeting Points</label>
                    <input
                      type="text"
                      value={meetingPointsText}
                      onChange={(e) => setMeetingPointsText(e.target.value)}
                      className="h-11 w-full rounded-xl border border-neutral-200 bg-[#F5F5F5] px-3 text-xs text-[#101114] focus:outline-none focus:border-[#101114] focus:bg-white"
                    />
                  </div>
                </div>

                {/* Recurring Journey Controls */}
                <div className="rounded-2xl border border-neutral-200 bg-[#F5F5F5] p-4">
                  <label className="flex cursor-pointer items-center gap-2.5 text-sm font-semibold text-[#101114]">
                    <input
                      type="checkbox"
                      checked={isRecurring}
                      onChange={(e) => setIsRecurring(e.target.checked)}
                      className="h-4 w-4 accent-[#101114]"
                    />
                    <span>Publish as Recurring Journey</span>
                  </label>
                  {isRecurring && (
                    <div className="mt-3">
                      <select
                        value={recurrenceRule}
                        onChange={(e) => setRecurrenceRule(e.target.value)}
                        className="h-10 w-full rounded-xl border border-neutral-200 bg-white px-3 text-xs font-medium text-[#101114] focus:outline-none focus:border-[#101114]"
                      >
                        <option value="Daily" className="text-[#101114] bg-white">Daily</option>
                        <option value="Every Weekday (Mon-Fri)" className="text-[#101114] bg-white">Every Weekday (Mon-Fri)</option>
                        <option value="Weekly (Fri & Sun)" className="text-[#101114] bg-white">Weekly (Fri &amp; Sun)</option>
                        <option value="Weekends Only" className="text-[#101114] bg-white">Weekends Only</option>
                      </select>
                    </div>
                  )}
                </div>

                {/* Mandatory Declaration */}
                <label className="flex cursor-pointer items-start gap-2.5 rounded-2xl border border-[#FFD43B] bg-[#FFD43B]/15 p-4 text-xs font-semibold text-[#101114]">
                  <input
                    type="checkbox"
                    checked={declarationConfirmed}
                    onChange={(e) => setDeclarationConfirmed(e.target.checked)}
                    className="mt-0.5 h-4 w-4 accent-[#101114]"
                  />
                  <span>
                    I am already travelling on this route and am not creating a dedicated journey solely for parcel delivery.
                  </span>
                </label>

                <button
                  type="submit"
                  disabled={publishing}
                  className="h-12 rounded-xl bg-[#FFD43B] px-6 text-sm font-extrabold text-[#101114] hover:bg-[#F5C419] disabled:opacity-60"
                >
                  {publishing ? 'Publishing...' : 'Publish Existing Journey'}
                </button>
              </form>

              {/* Published & Recurring Journeys List */}
              <div className="rounded-3xl border border-neutral-200 bg-white p-6">
                <h3 className="font-display text-lg font-bold text-[#101114]">My Published Journeys</h3>
                <div className="mt-4 space-y-3">
                  {journeys.length === 0 ? (
                    <p className="text-sm text-[#777777]">No journeys published yet.</p>
                  ) : (
                    journeys.map((j) => (
                      <div
                        key={j.id}
                        className="flex flex-wrap items-center justify-between gap-3 rounded-2xl border border-neutral-200 bg-[#F5F5F5] p-4"
                      >
                        <div>
                          <div className="flex items-center gap-2">
                            <span className="font-display text-sm font-bold text-[#101114]">
                              {j.origin_name} → {j.dest_name}
                            </span>
                            <span className="text-xs font-bold text-[#777777]">· {j.status}</span>
                          </div>
                          <div className="mt-0.5 text-xs text-[#777777]">
                            {formatTransportModeLabel(j.transport_mode)} · {j.departure_time}–{j.expected_arrival} ·{' '}
                            {j.available_capacity_count} slot(s) · Max {j.max_weight_kg} kg
                            {j.is_recurring === 1 ? ` · Recurring: ${j.recurrence_rule}` : ''}
                          </div>
                        </div>
                        <div className="flex items-center gap-2">
                          <button
                            type="button"
                            onClick={() => handleJourneyStatus(j.id, j.status === 'ACTIVE' ? 'PAUSED' : 'ACTIVE')}
                            className="inline-flex h-9 items-center gap-1 rounded-xl border border-neutral-200 bg-white px-3 text-xs font-semibold text-[#101114]"
                          >
                            {j.status === 'ACTIVE' ? <Pause className="h-3.5 w-3.5" /> : <Play className="h-3.5 w-3.5" />}
                            <span>{j.status === 'ACTIVE' ? 'Pause' : 'Resume'}</span>
                          </button>
                          <button
                            type="button"
                            onClick={() => handleDeleteJourney(j.id)}
                            className="inline-flex h-9 items-center gap-1 rounded-xl border border-red-200 bg-white px-3 text-xs font-semibold text-red-600"
                          >
                            <Trash2 className="h-3.5 w-3.5" />
                          </button>
                        </div>
                      </div>
                    ))
                  )}
                </div>
              </div>
            </div>
          )}

          {/* PARCEL REQUESTS */}
          {tab === 'requests' && (
            <div className="rounded-3xl border border-neutral-200 bg-white p-6">
              <h2 className="font-display text-xl font-bold text-[#101114]">Matching Parcel Requests</h2>
              <p className="mt-1 text-xs text-[#777777]">
                First eligible partner to accept a broadcast parcel wins the booking via atomic database lock.
              </p>

              {requests.length === 0 ? (
                <div className="mt-5 rounded-2xl bg-[#F5F5F5] p-6 text-sm text-[#777777]">
                  No open parcel requests currently match your active journeys. Publish a journey matching sender routes to see requests.
                </div>
              ) : (
                <div className="mt-5 space-y-4">
                  {requests.map((r) => (
                    <div key={r.id} className="rounded-2xl border border-neutral-200 bg-[#F5F5F5] p-5">
                      <div className="flex flex-wrap items-start justify-between gap-3">
                        <div>
                          <div className="flex items-center gap-2">
                            <span className="font-mono-num text-sm font-extrabold text-[#101114]">{r.parcel_code}</span>
                            <span className="font-mono-num text-xs font-bold text-emerald-700">
                              · {r.compatibilityScore}/100 Match
                            </span>
                          </div>
                          <div className="mt-1 text-sm font-bold text-[#101114]">
                            {r.pickup_location} → {r.destination_location}
                          </div>
                          <div className="mt-1 text-xs text-[#777777]">
                            {formatTransportModeLabel(r.transport_mode)} · {r.weight_kg} kg ({r.length_cm}×{r.width_cm}×{r.height_cm} cm) · {r.distance_km} km
                          </div>
                          <div className="mt-1 text-xs text-[#777777]">
                            <MapPin className="mr-1 inline h-3 w-3" />
                            Pickup: {r.suggestedPickup} · Drop-off: {r.suggestedDropoff}
                          </div>
                        </div>

                        <div className="text-right">
                          <div className="text-[11px] text-[#777777]">Your Expected Earning</div>
                          <div className="font-mono-num text-2xl font-extrabold text-[#101114]">
                            ₹{r.partner_earning.toFixed(2)}
                          </div>
                        </div>
                      </div>

                      <div className="mt-4 flex flex-wrap gap-2">
                        <button
                          type="button"
                          onClick={() => handleAcceptRequest(r)}
                          className="h-10 rounded-xl bg-[#FFD43B] px-5 text-xs font-extrabold text-[#101114] hover:bg-[#F5C419]"
                        >
                          Accept Request
                        </button>
                        <button
                          type="button"
                          onClick={() => handleRejectRequest(r.id)}
                          className="h-10 rounded-xl border border-neutral-300 bg-white px-4 text-xs font-semibold text-[#101114]"
                        >
                          Reject
                        </button>
                        <button
                          type="button"
                          onClick={() => setSelectedRequestDetail(selectedRequestDetail?.id === r.id ? null : r)}
                          className="h-10 rounded-xl border border-neutral-300 bg-white px-4 text-xs font-semibold text-[#777777]"
                        >
                          {selectedRequestDetail?.id === r.id ? 'Hide Details' : 'View Details'}
                        </button>
                      </div>

                      {selectedRequestDetail?.id === r.id && (
                        <div className="mt-3 border-t border-neutral-200 pt-3 text-xs text-[#777777]">
                          <div>Contents: <strong className="text-[#101114]">{r.declared_contents}</strong></div>
                          <div>Matched Journey: <strong className="text-[#101114]">{r.matchedJourneyLabel}</strong></div>
                          <div>Packaging: <strong className="text-[#101114]">{r.packaging_type}</strong></div>
                        </div>
                      )}
                    </div>
                  ))}
                </div>
              )}
            </div>
          )}

          {/* ACTIVE DELIVERIES */}
          {tab === 'deliveries' && (
            <div className="space-y-4">
              <div className="rounded-3xl border border-neutral-200 bg-white p-6">
                <h2 className="font-display text-xl font-bold text-[#101114]">Active Deliveries &amp; OTP Handovers</h2>
                {activeList.length === 0 ? (
                  <p className="mt-4 text-sm text-[#777777]">No active deliveries assigned right now.</p>
                ) : (
                  <div className="mt-4 space-y-4">
                    {activeList.map((d) => (
                      <div key={d.id} className="rounded-2xl border border-neutral-200 bg-[#F5F5F5] p-5">
                        <div className="flex flex-wrap items-start justify-between gap-3">
                          <div>
                            <div className="flex items-center gap-2">
                              <span className="font-mono-num text-base font-extrabold text-[#101114]">{d.parcel_code}</span>
                              <span className={`text-xs font-bold ${getStatusToneClass(d.status)}`}>
                                · {formatStatusLabel(d.status)}
                              </span>
                            </div>
                            <div className="mt-1 text-xs font-medium text-[#101114]">
                              {d.pickup_location} → {d.destination_location} ({d.weight_kg} kg)
                            </div>
                            <div className="mt-0.5 text-xs text-[#777777]">
                              Sender: {d.sender_name} ({d.sender_mobile}) · Earning: ₹{d.partner_earning.toFixed(2)}
                            </div>
                            <div className="mt-1 text-xs text-[#777777]">
                              Demo OTP Hints — Pickup: <span className="font-mono-num font-bold text-[#101114]">{d.pickup_otp}</span> · Handover:{' '}
                              <span className="font-mono-num font-bold text-[#101114]">{d.handover_otp}</span> · Delivery:{' '}
                              <span className="font-mono-num font-bold text-[#101114]">{d.delivery_otp}</span>
                            </div>
                          </div>
                        </div>

                        {/* OTP & Simulated GPS Controls */}
                        <div className="mt-4 flex flex-wrap items-center gap-2 border-t border-neutral-200 pt-4">
                          <input
                            type="text"
                            placeholder="Enter 4-digit OTP"
                            value={otpInputs[d.id] || ''}
                            onChange={(e) => setOtpInputs((prev) => ({ ...prev, [d.id]: e.target.value }))}
                            className="h-10 w-36 rounded-xl border border-neutral-200 bg-white px-3 font-mono-num text-sm"
                          />

                          {d.status === 'PARTNER_ASSIGNED' && (
                            <button
                              type="button"
                              onClick={() => handlePickupOtp(d.id)}
                              className="h-10 rounded-xl bg-[#FFD43B] px-4 text-xs font-extrabold text-[#101114]"
                            >
                              Verify Pickup OTP
                            </button>
                          )}

                          {(d.status === 'IN_TRANSIT' || d.status === 'PICKED_UP') && (
                            <>
                              <button
                                type="button"
                                onClick={() => handleSimulateGps(d.id, 0.55, false)}
                                className="h-10 rounded-xl border border-neutral-300 bg-white px-3 text-xs font-semibold text-[#101114]"
                              >
                                Update Simulated GPS (55%)
                              </button>
                              <button
                                type="button"
                                onClick={() => handleSimulateGps(d.id, 0.7, true)}
                                className="h-10 rounded-xl border border-amber-300 bg-amber-50 px-3 text-xs font-semibold text-amber-800"
                              >
                                Test Deviation Alert
                              </button>
                              <button
                                type="button"
                                onClick={() => handleRelayHandover(d.id, 'initiate')}
                                className="h-10 rounded-xl border border-neutral-300 bg-white px-3 text-xs font-semibold text-[#101114]"
                              >
                                Initiate Relay Handover
                              </button>
                              <button
                                type="button"
                                onClick={() => handleDeliverOtp(d.id)}
                                className="h-10 rounded-xl bg-[#101114] px-4 text-xs font-bold text-[#FFD43B]"
                              >
                                Complete Delivery (Recipient OTP)
                              </button>
                            </>
                          )}

                          {d.status === 'HANDOVER_PENDING' && (
                            <button
                              type="button"
                              onClick={() => handleRelayHandover(d.id, 'complete')}
                              className="h-10 rounded-xl bg-[#FFD43B] px-4 text-xs font-extrabold text-[#101114]"
                            >
                              Verify Relay Handover OTP
                            </button>
                          )}
                        </div>
                      </div>
                    ))}
                  </div>
                )}
              </div>
            </div>
          )}

          {/* EARNINGS */}
          {tab === 'earnings' && (
            <div className="space-y-6">
              <div className="grid grid-cols-2 gap-4 sm:grid-cols-4">
                <div className="rounded-2xl border border-neutral-200 bg-white p-4">
                  <div className="text-xs text-[#777777]">Total Completed</div>
                  <div className="font-mono-num mt-1 text-xl font-extrabold text-[#101114]">
                    ₹{stats.totalEarnings.toFixed(2)}
                  </div>
                </div>
                <div className="rounded-2xl border border-neutral-200 bg-white p-4">
                  <div className="text-xs text-[#777777]">Weekly Estimate</div>
                  <div className="font-mono-num mt-1 text-xl font-extrabold text-[#101114]">
                    ₹{stats.weeklyEarnings.toFixed(2)}
                  </div>
                </div>
                <div className="rounded-2xl border border-neutral-200 bg-white p-4">
                  <div className="text-xs text-[#777777]">Monthly Estimate</div>
                  <div className="font-mono-num mt-1 text-xl font-extrabold text-[#101114]">
                    ₹{stats.monthlyEarnings.toFixed(2)}
                  </div>
                </div>
                <div className="rounded-2xl border border-neutral-200 bg-white p-4">
                  <div className="text-xs text-[#777777]">Pending In-Transit</div>
                  <div className="font-mono-num mt-1 text-xl font-extrabold text-amber-700">
                    ₹{stats.pendingEarnings.toFixed(2)}
                  </div>
                </div>
              </div>

              <div className="rounded-3xl border border-neutral-200 bg-white p-6">
                <h3 className="font-display text-lg font-bold text-[#101114]">Weekly Earnings Analytics (Simulated INR)</h3>
                <div className="mt-4 h-64 w-full">
                  <ResponsiveContainer width="100%" height="100%">
                    <BarChart data={dailyEarnings}>
                      <CartesianGrid strokeDasharray="3 3" stroke="#E5E5E5" />
                      <XAxis dataKey="day" tick={{ fontSize: 12, fill: '#777777' }} />
                      <YAxis tick={{ fontSize: 12, fill: '#777777' }} />
                      <Tooltip />
                      <Bar dataKey="earnings" fill="#101114" radius={[6, 6, 0, 0]} />
                    </BarChart>
                  </ResponsiveContainer>
                </div>
              </div>

              <div className="rounded-3xl border border-neutral-200 bg-white p-6">
                <h3 className="font-display text-lg font-bold text-[#101114]">Payout Ledger (Simulated)</h3>
                <div className="mt-3 overflow-x-auto">
                  <table className="w-full text-left text-xs">
                    <thead>
                      <tr className="border-b border-neutral-200 text-[#777777]">
                        <th className="py-2 pr-4">Parcel</th>
                        <th className="py-2 pr-4">Route</th>
                        <th className="py-2 pr-4">Earning</th>
                        <th className="py-2">Status</th>
                      </tr>
                    </thead>
                    <tbody className="divide-y divide-neutral-100">
                      {transactions.map((t) => (
                        <tr key={t.id}>
                          <td className="font-mono-num py-2.5 pr-4 font-bold text-[#101114]">{t.parcel_code}</td>
                          <td className="py-2.5 pr-4 text-[#777777]">
                            {t.pickup_location} → {t.destination_location}
                          </td>
                          <td className="font-mono-num py-2.5 pr-4 font-bold text-[#101114]">
                            ₹{t.partner_earning.toFixed(2)}
                          </td>
                          <td className="py-2.5 font-semibold text-emerald-700">{t.status}</td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>
              </div>
            </div>
          )}

          {/* HISTORY */}
          {tab === 'history' && (
            <div className="rounded-3xl border border-neutral-200 bg-white p-6">
              <h2 className="font-display text-xl font-bold text-[#101114]">Delivery History</h2>
              <div className="mt-4 space-y-3">
                {historyList.length === 0 ? (
                  <p className="text-sm text-[#777777]">No completed deliveries yet.</p>
                ) : (
                  historyList.map((h) => (
                    <div key={h.id} className="flex flex-wrap items-center justify-between gap-3 rounded-2xl bg-[#F5F5F5] p-4">
                      <div>
                        <div className="flex items-center gap-2">
                          <CheckCircle2 className="h-4 w-4 text-emerald-700" />
                          <span className="font-mono-num text-sm font-bold text-[#101114]">{h.parcel_code}</span>
                          <span className="text-xs text-[#777777]">· {formatStatusLabel(h.status)}</span>
                        </div>
                        <div className="mt-0.5 text-xs text-[#777777]">
                          {h.pickup_location} → {h.destination_location}
                        </div>
                      </div>
                      <span className="font-mono-num text-sm font-extrabold text-[#101114]">
                        +₹{h.partner_earning.toFixed(2)}
                      </span>
                    </div>
                  ))
                )}
              </div>
            </div>
          )}

          {/* PARTNER PROFILE */}
          {tab === 'profile' && (
            <div className="rounded-3xl border border-neutral-200 bg-white p-6">
              <h2 className="font-display text-xl font-bold text-[#101114]">Partner Vehicle &amp; Availability</h2>
              <form onSubmit={handleSavePartnerProfile} className="mt-4 max-w-md space-y-4">
                <div>
                  <label className="mb-1 block text-xs font-semibold text-[#101114]">Vehicle / Pass Number</label>
                  <input
                    type="text"
                    value={vehNumber}
                    onChange={(e) => setVehNumber(e.target.value)}
                    className="h-11 w-full rounded-xl border border-neutral-200 bg-[#F5F5F5] px-3 text-sm"
                  />
                </div>
                <div>
                  <label className="mb-1 block text-xs font-semibold text-[#101114]">Preferred Corridors</label>
                  <input
                    type="text"
                    value={prefCorridors}
                    onChange={(e) => setPrefCorridors(e.target.value)}
                    className="h-11 w-full rounded-xl border border-neutral-200 bg-[#F5F5F5] px-3 text-sm"
                  />
                </div>
                <label className="flex cursor-pointer items-center gap-2.5 text-sm font-semibold text-[#101114]">
                  <input
                    type="checkbox"
                    checked={isAvailable}
                    onChange={(e) => setIsAvailable(e.target.checked)}
                    className="h-4 w-4 accent-[#101114]"
                  />
                  <span>Available for Express &amp; Relay Assignments</span>
                </label>
                <button
                  type="submit"
                  className="h-11 rounded-xl bg-[#FFD43B] px-5 text-sm font-bold text-[#101114]"
                >
                  Save Partner Settings
                </button>
              </form>
            </div>
          )}
        </section>
      </div>

      {/* Mobile Bottom Nav */}
      <nav className="fixed right-0 bottom-0 left-0 z-40 grid grid-cols-5 border-t border-neutral-200 bg-white/95 backdrop-blur-md lg:hidden">
        {[
          { id: 'overview' as PartnerTab, label: 'Overview', icon: <Home className="h-5 w-5" /> },
          { id: 'publish' as PartnerTab, label: 'Publish', icon: <PlusCircle className="h-5 w-5" /> },
          { id: 'requests' as PartnerTab, label: 'Requests', icon: <ClipboardList className="h-5 w-5" /> },
          { id: 'deliveries' as PartnerTab, label: 'Active', icon: <Truck className="h-5 w-5" /> },
          { id: 'earnings' as PartnerTab, label: 'Earnings', icon: <IndianRupee className="h-5 w-5" /> }
        ].map((item) => (
          <button
            key={item.id}
            type="button"
            onClick={() => setTab(item.id)}
            className={`flex h-14 flex-col items-center justify-center gap-0.5 text-[10px] font-semibold ${
              tab === item.id ? 'text-[#101114]' : 'text-[#777777]'
            }`}
          >
            <span className={tab === item.id ? 'rounded-lg bg-[#FFD43B] px-2.5 py-0.5' : ''}>{item.icon}</span>
            <span>{item.label}</span>
          </button>
        ))}
      </nav>
    </div>
  );
}
