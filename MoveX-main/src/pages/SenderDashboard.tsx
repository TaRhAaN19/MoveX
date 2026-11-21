import { useCallback, useEffect, useState } from 'react';
import { useNavigate, useSearchParams } from 'react-router-dom';
import {
  AlertTriangle,
  ArrowRightLeft,
  CreditCard,
  Home,
  LogOut,
  MapPin,
  Package,
  PlusCircle,
  User as UserIcon
} from 'lucide-react';
import { api, getApiError } from '../services/api';
import { useAuth } from '../context/AuthContext';
import type { Booking, Dispute, Payment } from '../types/movex';
import BookingWizard from '../components/BookingWizard';
import TrackParcelPage from './TrackParcelPage';
import { formatStatusLabel, formatTransportModeLabel, getStatusToneClass } from '../components/TransportIcon';

type SenderTab = 'overview' | 'book' | 'parcels' | 'track' | 'payments' | 'disputes' | 'profile';

export default function SenderDashboard() {
  const { user, logout, switchActivity, refreshMe } = useAuth();
  const navigate = useNavigate();
  const [searchParams, setSearchParams] = useSearchParams();

  const initialTab = (searchParams.get('tab') as SenderTab) || 'overview';
  const [tab, setTab] = useState<SenderTab>(initialTab);
  const [bookings, setBookings] = useState<Booking[]>([]);
  const [payments, setPayments] = useState<Payment[]>([]);
  const [disputes, setDisputes] = useState<Dispute[]>([]);
  const [selectedTrackCode, setSelectedTrackCode] = useState<string>('');
  const [loading, setLoading] = useState(true);

  // Profile form
  const [profileName, setProfileName] = useState(user?.name || '');
  const [profileMobile, setProfileMobile] = useState(user?.mobile || '');
  const [profileMsg, setProfileMsg] = useState('');

  const loadData = useCallback(async () => {
    setLoading(true);
    try {
      const { data } = await api.get<{ bookings: Booking[]; payments: Payment[]; disputes: Dispute[] }>('/bookings');
      setBookings(data.bookings || []);
      setPayments(data.payments || []);
      setDisputes(data.disputes || []);
      if (data.bookings?.[0] && !selectedTrackCode) {
        setSelectedTrackCode(data.bookings[0].parcel_code);
      }
    } catch {
      // handled cleanly
    } finally {
      setLoading(false);
    }
  }, [selectedTrackCode]);

  useEffect(() => {
    loadData();
  }, [loadData]);

  useEffect(() => {
    const t = searchParams.get('tab') as SenderTab | null;
    if (t) setTab(t);
  }, [searchParams]);

  const changeTab = (next: SenderTab) => {
    setTab(next);
    setSearchParams({ tab: next });
  };

  const activeParcels = bookings.filter((b) =>
    ['CREATED', 'DECLARED', 'APPROVED', 'MATCHING', 'PARTNER_ASSIGNED', 'PICKED_UP', 'IN_TRANSIT', 'HANDOVER_PENDING'].includes(
      b.status
    )
  );
  const completedParcels = bookings.filter((b) => b.status === 'DELIVERED');

  const handleSwitchToPartner = async () => {
    await switchActivity('partner');
    navigate('/partner');
  };

  const handleSaveProfile = async (e: React.FormEvent) => {
    e.preventDefault();
    setProfileMsg('');
    try {
      await api.put('/auth/profile', { name: profileName, mobile: profileMobile });
      await refreshMe();
      setProfileMsg('Profile updated successfully.');
    } catch (err) {
      setProfileMsg(getApiError(err));
    }
  };

  const NAV_ITEMS: Array<{ id: SenderTab; label: string; icon: React.ReactNode }> = [
    { id: 'overview', label: 'Home', icon: <Home className="h-4 w-4" /> },
    { id: 'book', label: 'Send Parcel', icon: <PlusCircle className="h-4 w-4" /> },
    { id: 'parcels', label: 'My Parcels', icon: <Package className="h-4 w-4" /> },
    { id: 'track', label: 'Track Parcel', icon: <MapPin className="h-4 w-4" /> },
    { id: 'payments', label: 'Payments', icon: <CreditCard className="h-4 w-4" /> },
    { id: 'disputes', label: 'Disputes', icon: <AlertTriangle className="h-4 w-4" /> },
    { id: 'profile', label: 'Profile', icon: <UserIcon className="h-4 w-4" /> }
  ];

  return (
    <div className="mx-auto max-w-7xl px-4 py-6 pb-24 sm:px-6 md:pb-10">
      <div className="grid grid-cols-1 gap-6 lg:grid-cols-12">
        {/* Desktop Sidebar */}
        <aside className="hidden lg:col-span-3 lg:block">
          <div className="sticky top-20 rounded-3xl border border-neutral-200 bg-[#F5F5F5] p-4">
            <div className="border-b border-neutral-200 pb-4">
              <div className="text-xs font-semibold text-[#777777]">Sender Workspace</div>
              <div className="font-display mt-0.5 text-lg font-extrabold text-[#101114]">{user?.name}</div>
              <div className="text-xs text-[#777777]">{user?.verification_status} · Rating {user?.rating}</div>
            </div>

            <nav className="mt-3 space-y-1">
              {NAV_ITEMS.map((item) => (
                <button
                  key={item.id}
                  type="button"
                  onClick={() => changeTab(item.id)}
                  className={`flex h-11 w-full items-center gap-3 rounded-xl px-3.5 text-sm font-semibold transition-colors ${
                    tab === item.id
                      ? 'bg-[#101114] text-[#FFD43B]'
                      : 'text-[#101114] hover:bg-white'
                  }`}
                >
                  {item.icon}
                  <span>{item.label}</span>
                </button>
              ))}
            </nav>

            <div className="mt-5 space-y-2 border-t border-neutral-200 pt-4">
              <button
                type="button"
                onClick={handleSwitchToPartner}
                className="flex h-11 w-full items-center justify-center gap-2 rounded-xl bg-[#FFD43B] px-3 text-xs font-bold text-[#101114] hover:bg-[#F5C419]"
              >
                <ArrowRightLeft className="h-4 w-4" />
                <span>Switch to Deliver a Parcel</span>
              </button>
              <button
                type="button"
                onClick={() => {
                  logout();
                  navigate('/');
                }}
                className="flex h-10 w-full items-center justify-center gap-2 rounded-xl border border-neutral-200 bg-white text-xs font-semibold text-[#777777] hover:text-red-600"
              >
                <LogOut className="h-3.5 w-3.5" />
                <span>Logout</span>
              </button>
            </div>
          </div>
        </aside>

        {/* Main Content Area */}
        <section className="lg:col-span-9">
          {/* Mobile Activity Switch Header */}
          <div className="mb-4 flex items-center justify-between gap-2 lg:hidden">
            <div className="text-sm font-bold text-[#101114]">Sender Hub · {user?.name}</div>
            <button
              type="button"
              onClick={handleSwitchToPartner}
              className="inline-flex h-9 items-center gap-1.5 rounded-xl bg-[#FFD43B] px-3 text-xs font-bold text-[#101114]"
            >
              <ArrowRightLeft className="h-3.5 w-3.5" />
              <span>Deliver Mode</span>
            </button>
          </div>

          {tab === 'overview' && (
            <div className="space-y-6">
              <div className="flex flex-col justify-between gap-4 rounded-3xl border border-neutral-200 bg-[#101114] p-6 text-white sm:flex-row sm:items-center">
                <div>
                  <h1 className="font-display text-2xl font-extrabold">
                    Welcome back, {user?.name?.split(' ')[0]}
                  </h1>
                  <p className="mt-1 text-sm text-neutral-300">
                    Send parcels affordably with Community Relay or direct with Premium Express.
                  </p>
                </div>
                <button
                  type="button"
                  onClick={() => changeTab('book')}
                  className="inline-flex h-12 shrink-0 items-center justify-center gap-2 rounded-xl bg-[#FFD43B] px-6 text-sm font-extrabold text-[#101114] hover:bg-[#F5C419]"
                >
                  <PlusCircle className="h-5 w-5" />
                  <span>Send a Parcel</span>
                </button>
              </div>

              <div className="grid grid-cols-2 gap-4 sm:grid-cols-4">
                <div className="rounded-2xl border border-neutral-200 bg-[#F5F5F5] p-4">
                  <div className="text-xs font-medium text-[#777777]">Active Parcels</div>
                  <div className="font-mono-num mt-1 text-2xl font-extrabold text-[#101114]">
                    {activeParcels.length}
                  </div>
                </div>
                <div className="rounded-2xl border border-neutral-200 bg-[#F5F5F5] p-4">
                  <div className="text-xs font-medium text-[#777777]">Completed</div>
                  <div className="font-mono-num mt-1 text-2xl font-extrabold text-[#101114]">
                    {completedParcels.length}
                  </div>
                </div>
                <div className="rounded-2xl border border-neutral-200 bg-[#F5F5F5] p-4">
                  <div className="text-xs font-medium text-[#777777]">Total Bookings</div>
                  <div className="font-mono-num mt-1 text-2xl font-extrabold text-[#101114]">
                    {bookings.length}
                  </div>
                </div>
                <div className="rounded-2xl border border-neutral-200 bg-[#F5F5F5] p-4">
                  <div className="text-xs font-medium text-[#777777]">Total Spent (Demo)</div>
                  <div className="font-mono-num mt-1 text-2xl font-extrabold text-[#101114]">
                    ₹{payments.reduce((acc, p) => acc + (p.status !== 'REFUNDED' ? p.amount : 0), 0).toFixed(0)}
                  </div>
                </div>
              </div>

              {/* Recent Bookings */}
              <div className="rounded-3xl border border-neutral-200 bg-white p-6">
                <div className="flex items-center justify-between">
                  <h2 className="font-display text-lg font-bold text-[#101114]">Recent Bookings</h2>
                  <button
                    type="button"
                    onClick={() => changeTab('parcels')}
                    className="text-xs font-semibold text-[#101114] underline"
                  >
                    View all
                  </button>
                </div>

                {loading ? (
                  <p className="mt-4 text-sm text-[#777777]">Loading bookings...</p>
                ) : bookings.length === 0 ? (
                  <p className="mt-4 text-sm text-[#777777]">No parcels booked yet. Click Send a Parcel to get started.</p>
                ) : (
                  <div className="mt-4 divide-y divide-neutral-100">
                    {bookings.slice(0, 4).map((b) => (
                      <div key={b.id} className="flex flex-wrap items-center justify-between gap-3 py-3.5">
                        <div>
                          <div className="flex items-center gap-2">
                            <span className="font-mono-num text-sm font-bold text-[#101114]">{b.parcel_code}</span>
                            <span className={`text-xs font-bold ${getStatusToneClass(b.status)}`}>
                              · {formatStatusLabel(b.status)}
                            </span>
                          </div>
                          <div className="mt-0.5 text-xs text-[#777777]">
                            {b.pickup_location} → {b.destination_location} · {formatTransportModeLabel(b.transport_mode)} · {b.weight_kg} kg
                          </div>
                        </div>
                        <div className="flex items-center gap-3">
                          <span className="font-mono-num text-sm font-bold text-[#101114]">
                            ₹{b.total_price.toFixed(2)}
                          </span>
                          <button
                            type="button"
                            onClick={() => {
                              setSelectedTrackCode(b.parcel_code);
                              changeTab('track');
                            }}
                            className="h-9 rounded-xl border border-neutral-200 bg-[#F5F5F5] px-3 text-xs font-semibold text-[#101114] hover:border-[#101114]"
                          >
                            Track
                          </button>
                        </div>
                      </div>
                    ))}
                  </div>
                )}
              </div>
            </div>
          )}

          {tab === 'book' && (
            <BookingWizard
              onBookingComplete={(created) => {
                setSelectedTrackCode(created.parcel_code);
                loadData();
              }}
            />
          )}

          {tab === 'parcels' && (
            <div className="rounded-3xl border border-neutral-200 bg-white p-6">
              <div className="flex items-center justify-between">
                <h2 className="font-display text-xl font-bold text-[#101114]">My Parcels</h2>
                <button
                  type="button"
                  onClick={() => changeTab('book')}
                  className="h-10 rounded-xl bg-[#FFD43B] px-4 text-xs font-bold text-[#101114]"
                >
                  + New Booking
                </button>
              </div>
              <div className="mt-4 space-y-3">
                {bookings.map((b) => (
                  <div
                    key={b.id}
                    className="flex flex-col justify-between gap-3 rounded-2xl border border-neutral-200 bg-[#F5F5F5] p-4 sm:flex-row sm:items-center"
                  >
                    <div>
                      <div className="flex flex-wrap items-center gap-2">
                        <span className="font-mono-num text-sm font-extrabold text-[#101114]">{b.parcel_code}</span>
                        <span className={`text-xs font-bold ${getStatusToneClass(b.status)}`}>
                          {formatStatusLabel(b.status)}
                        </span>
                        <span className="text-xs text-[#777777]">
                          · Guard: {b.guard_classification}
                        </span>
                      </div>
                      <div className="mt-1 text-xs font-medium text-[#101114]">
                        {b.pickup_location} → {b.destination_location}
                      </div>
                      <div className="mt-0.5 text-xs text-[#777777]">
                        {formatTransportModeLabel(b.transport_mode)} · {b.weight_kg} kg · Pickup OTP:{' '}
                        <span className="font-mono-num font-bold text-[#101114]">{b.pickup_otp}</span> · Delivery OTP:{' '}
                        <span className="font-mono-num font-bold text-[#101114]">{b.delivery_otp}</span>
                      </div>
                    </div>
                    <div className="flex items-center gap-3">
                      <span className="font-mono-num text-base font-extrabold text-[#101114]">
                        ₹{b.total_price.toFixed(2)}
                      </span>
                      <button
                        type="button"
                        onClick={() => {
                          setSelectedTrackCode(b.parcel_code);
                          changeTab('track');
                        }}
                        className="h-10 rounded-xl bg-[#101114] px-4 text-xs font-semibold text-white"
                      >
                        Track &amp; QR
                      </button>
                    </div>
                  </div>
                ))}
              </div>
            </div>
          )}

          {tab === 'track' && <TrackParcelPage embeddedCode={selectedTrackCode || 'MVX-2026-1001'} />}

          {tab === 'payments' && (
            <div className="rounded-3xl border border-neutral-200 bg-white p-6">
              <h2 className="font-display text-xl font-bold text-[#101114]">Simulated Payment History (INR)</h2>
              <p className="mt-1 text-xs text-[#777777]">
                All payments below are simulated prototype transactions for hackathon demonstration.
              </p>
              <div className="mt-4 overflow-x-auto">
                <table className="w-full text-left text-xs">
                  <thead>
                    <tr className="border-b border-neutral-200 text-[#777777]">
                      <th className="py-2.5 pr-4">Ref</th>
                      <th className="py-2.5 pr-4">Method</th>
                      <th className="py-2.5 pr-4">Amount</th>
                      <th className="py-2.5 pr-4">Status</th>
                      <th className="py-2.5">Date</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-neutral-100">
                    {payments.map((p) => (
                      <tr key={p.id}>
                        <td className="font-mono-num py-3 pr-4 font-semibold text-[#101114]">{p.transaction_ref}</td>
                        <td className="py-3 pr-4 text-[#777777]">{p.method}</td>
                        <td className="font-mono-num py-3 pr-4 font-bold text-[#101114]">₹{p.amount.toFixed(2)}</td>
                        <td className={`py-3 pr-4 font-bold ${getStatusToneClass(p.status)}`}>{p.status}</td>
                        <td className="font-mono-num py-3 text-[#777777]">{new Date(p.created_at).toLocaleDateString()}</td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            </div>
          )}

          {tab === 'disputes' && (
            <div className="rounded-3xl border border-neutral-200 bg-white p-6">
              <h2 className="font-display text-xl font-bold text-[#101114]">Disputes &amp; Payment Holds</h2>
              <p className="mt-1 text-xs text-[#777777]">
                To file a dispute on an active or delivered parcel, open the parcel in Track Parcel.
              </p>
              {disputes.length === 0 ? (
                <p className="mt-4 text-sm text-[#777777]">No disputes raised.</p>
              ) : (
                <div className="mt-4 space-y-3">
                  {disputes.map((d) => (
                    <div key={d.id} className="rounded-2xl border border-neutral-200 bg-[#F5F5F5] p-4">
                      <div className="flex items-center justify-between">
                        <span className="text-sm font-bold text-[#101114]">{d.reason}</span>
                        <span className="text-xs font-bold text-amber-700">{d.status}</span>
                      </div>
                      <p className="mt-1 text-xs text-[#777777]">{d.description}</p>
                      {d.resolution_note && (
                        <p className="mt-1 text-xs font-semibold text-[#101114]">Admin Note: {d.resolution_note}</p>
                      )}
                    </div>
                  ))}
                </div>
              )}
            </div>
          )}

          {tab === 'profile' && (
            <div className="rounded-3xl border border-neutral-200 bg-white p-6">
              <h2 className="font-display text-xl font-bold text-[#101114]">Account &amp; Profile</h2>
              <form onSubmit={handleSaveProfile} className="mt-4 max-w-md space-y-4">
                <div>
                  <label className="mb-1 block text-xs font-semibold text-[#101114]">Full Name</label>
                  <input
                    type="text"
                    value={profileName}
                    onChange={(e) => setProfileName(e.target.value)}
                    className="h-11 w-full rounded-xl border border-neutral-200 bg-[#F5F5F5] px-3 text-sm"
                  />
                </div>
                <div>
                  <label className="mb-1 block text-xs font-semibold text-[#101114]">Email</label>
                  <input
                    type="text"
                    disabled
                    value={user?.email || ''}
                    className="h-11 w-full rounded-xl border border-neutral-200 bg-neutral-100 px-3 text-sm text-[#777777]"
                  />
                </div>
                <div>
                  <label className="mb-1 block text-xs font-semibold text-[#101114]">Mobile</label>
                  <input
                    type="text"
                    value={profileMobile}
                    onChange={(e) => setProfileMobile(e.target.value)}
                    className="h-11 w-full rounded-xl border border-neutral-200 bg-[#F5F5F5] px-3 text-sm"
                  />
                </div>
                {profileMsg && <p className="text-xs font-semibold text-emerald-700">{profileMsg}</p>}
                <button
                  type="submit"
                  className="h-11 rounded-xl bg-[#FFD43B] px-5 text-sm font-bold text-[#101114]"
                >
                  Save Profile
                </button>
              </form>
            </div>
          )}
        </section>
      </div>

      {/* Mobile Fixed Bottom Navigation (<= 15% viewport height) */}
      <nav className="fixed right-0 bottom-0 left-0 z-40 grid grid-cols-5 border-t border-neutral-200 bg-white/95 backdrop-blur-md lg:hidden">
        {[
          { id: 'overview' as SenderTab, label: 'Home', icon: <Home className="h-5 w-5" /> },
          { id: 'book' as SenderTab, label: 'Send', icon: <PlusCircle className="h-5 w-5" /> },
          { id: 'parcels' as SenderTab, label: 'Parcels', icon: <Package className="h-5 w-5" /> },
          { id: 'track' as SenderTab, label: 'Track', icon: <MapPin className="h-5 w-5" /> },
          { id: 'profile' as SenderTab, label: 'Profile', icon: <UserIcon className="h-5 w-5" /> }
        ].map((item) => (
          <button
            key={item.id}
            type="button"
            onClick={() => changeTab(item.id)}
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
