import { useCallback, useEffect, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import {
  AlertTriangle,
  BarChart3,
  CreditCard,
  LayoutDashboard,
  LogOut,
  Package,
  ShieldAlert,
  Truck,
  Users
} from 'lucide-react';
import { Bar, BarChart, CartesianGrid, Cell, Pie, PieChart, ResponsiveContainer, Tooltip, XAxis, YAxis } from 'recharts';
import { api, getApiError } from '../services/api';
import { useAuth } from '../context/AuthContext';
import type { Booking, Dispute, Payment, SecurityAlert } from '../types/movex';
import { formatStatusLabel, formatTransportModeLabel, getStatusToneClass } from '../components/TransportIcon';

type AdminTab =
  | 'overview'
  | 'users'
  | 'partners'
  | 'parcels'
  | 'deliveries'
  | 'guard'
  | 'payments'
  | 'disputes'
  | 'analytics';

interface AdminUserRow {
  id: number;
  name: string;
  email: string;
  mobile: string;
  role: string;
  can_deliver: number;
  verification_status: 'VERIFIED' | 'PENDING' | 'SUSPENDED';
  rating: number;
  primary_mode?: string;
  vehicle_number?: string;
  reliability_score?: number;
  completed_deliveries?: number;
}

const PIE_COLORS = ['#101114', '#FFD43B', '#777777', '#25282D', '#D97706', '#059669'];

export default function AdminDashboard() {
  const { user, logout } = useAuth();
  const navigate = useNavigate();

  const [tab, setTab] = useState<AdminTab>('overview');
  const [stats, setStats] = useState({
    totalUsers: 0,
    totalPartners: 0,
    totalParcels: 0,
    activeDeliveries: 0,
    completedDeliveries: 0,
    grossRevenue: 0,
    platformRevenue: 0,
    partnerEarnings: 0,
    securityAlertsOpen: 0,
    pendingDisputes: 0,
    successRate: 100
  });
  const [modeDistribution, setModeDistribution] = useState<Array<{ mode: string; count: number; revenue: number }>>([]);
  const [modelDistribution, setModelDistribution] = useState<Array<{ model: string; count: number; revenue: number }>>([]);
  const [users, setUsers] = useState<AdminUserRow[]>([]);
  const [parcels, setParcels] = useState<Booking[]>([]);
  const [alerts, setAlerts] = useState<SecurityAlert[]>([]);
  const [payments, setPayments] = useState<Payment[]>([]);
  const [disputes, setDisputes] = useState<Dispute[]>([]);
  const [decisionNotes, setDecisionNotes] = useState<Record<number, string>>({});
  const [feedback, setFeedback] = useState('');
  const [errorMsg, setErrorMsg] = useState('');

  const loadAll = useCallback(async () => {
    try {
      const [ov, us, pa, al, py, di] = await Promise.all([
        api.get('/admin/overview'),
        api.get('/admin/users'),
        api.get('/admin/parcels'),
        api.get('/admin/guard-alerts'),
        api.get('/admin/payments'),
        api.get('/admin/disputes')
      ]);
      setStats(ov.data.stats);
      setModeDistribution(ov.data.analytics.modeDistribution || []);
      setModelDistribution(ov.data.analytics.modelDistribution || []);
      setUsers(us.data.users || []);
      setParcels(pa.data.parcels || []);
      setAlerts(al.data.alerts || []);
      setPayments(py.data.payments || []);
      setDisputes(di.data.disputes || []);
    } catch (err) {
      setErrorMsg(getApiError(err));
    }
  }, []);

  useEffect(() => {
    loadAll();
  }, [loadAll]);

  const handleUserStatus = async (userId: number, verificationStatus: 'VERIFIED' | 'PENDING' | 'SUSPENDED') => {
    setFeedback('');
    try {
      await api.patch(`/admin/users/${userId}/status`, { verificationStatus });
      setFeedback(`Updated account #${userId} status to ${verificationStatus}.`);
      await loadAll();
    } catch (err) {
      setErrorMsg(getApiError(err));
    }
  };

  const handleGuardDecision = async (
    alertId: number,
    decision: 'APPROVED' | 'REJECTED' | 'INFO_REQUESTED' | 'ESCALATED'
  ) => {
    setFeedback('');
    try {
      await api.post(`/admin/guard-alerts/${alertId}/decision`, {
        decision,
        note: decisionNotes[alertId] || `Admin action: ${decision}`
      });
      setFeedback(`Recorded MOVEX Guard decision (${decision}) in audit history.`);
      await loadAll();
    } catch (err) {
      setErrorMsg(getApiError(err));
    }
  };

  const handleRefundPayment = async (paymentId: number) => {
    setFeedback('');
    try {
      await api.post(`/admin/payments/${paymentId}/refund`);
      setFeedback(`Simulated refund processed for payment #${paymentId}.`);
      await loadAll();
    } catch (err) {
      setErrorMsg(getApiError(err));
    }
  };

  const handleResolveDispute = async (disputeId: number, resolution: 'RESOLVED_REFUND' | 'RESOLVED_RELEASE') => {
    setFeedback('');
    try {
      await api.post(`/admin/disputes/${disputeId}/resolve`, {
        resolution,
        note: `Resolved by ${user?.name}`
      });
      setFeedback(`Dispute #${disputeId} resolved (${resolution}).`);
      await loadAll();
    } catch (err) {
      setErrorMsg(getApiError(err));
    }
  };

  const NAV_ITEMS: Array<{ id: AdminTab; label: string; icon: React.ReactNode }> = [
    { id: 'overview', label: 'Overview', icon: <LayoutDashboard className="h-4 w-4" /> },
    { id: 'users', label: 'Users', icon: <Users className="h-4 w-4" /> },
    { id: 'partners', label: 'Partners', icon: <Truck className="h-4 w-4" /> },
    { id: 'parcels', label: 'Parcels', icon: <Package className="h-4 w-4" /> },
    { id: 'deliveries', label: 'Deliveries', icon: <Truck className="h-4 w-4" /> },
    { id: 'guard', label: `MOVEX Guard (${stats.securityAlertsOpen})`, icon: <ShieldAlert className="h-4 w-4" /> },
    { id: 'payments', label: 'Payments', icon: <CreditCard className="h-4 w-4" /> },
    { id: 'disputes', label: `Disputes (${stats.pendingDisputes})`, icon: <AlertTriangle className="h-4 w-4" /> },
    { id: 'analytics', label: 'Analytics', icon: <BarChart3 className="h-4 w-4" /> }
  ];

  const partnerRows = users.filter((u) => u.role === 'partner' || u.can_deliver === 1);
  const activeDeliveries = parcels.filter((p) =>
    ['PARTNER_ASSIGNED', 'PICKED_UP', 'IN_TRANSIT', 'HANDOVER_PENDING'].includes(p.status)
  );

  return (
    <div className="mx-auto max-w-7xl px-4 py-6 sm:px-6">
      <div className="grid grid-cols-1 gap-6 lg:grid-cols-12">
        {/* Sidebar */}
        <aside className="lg:col-span-3">
          <div className="sticky top-20 rounded-3xl border border-neutral-200 bg-[#101114] p-4 text-white">
            <div className="border-b border-white/15 pb-4">
              <div className="text-xs font-semibold text-[#FFD43B]">Administrator Console</div>
              <div className="font-display mt-0.5 text-lg font-extrabold">{user?.name}</div>
              <div className="text-xs text-neutral-400">Restricted Role Access</div>
            </div>

            <nav className="mt-3 grid grid-cols-2 gap-1 lg:grid-cols-1">
              {NAV_ITEMS.map((item) => (
                <button
                  key={item.id}
                  type="button"
                  onClick={() => setTab(item.id)}
                  className={`flex h-10 items-center gap-2.5 rounded-xl px-3 text-xs font-semibold transition-colors ${
                    tab === item.id ? 'bg-[#FFD43B] text-[#101114]' : 'text-neutral-200 hover:bg-[#25282D]'
                  }`}
                >
                  {item.icon}
                  <span className="truncate">{item.label}</span>
                </button>
              ))}
            </nav>

            <button
              type="button"
              onClick={() => {
                logout();
                navigate('/');
              }}
              className="mt-4 flex h-10 w-full items-center justify-center gap-2 rounded-xl border border-white/15 text-xs font-semibold text-neutral-300 hover:text-red-400"
            >
              <LogOut className="h-3.5 w-3.5" />
              <span>Logout</span>
            </button>
          </div>
        </aside>

        {/* Main Content */}
        <section className="space-y-5 lg:col-span-9">
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
              <div className="grid grid-cols-2 gap-4 sm:grid-cols-3 lg:grid-cols-5">
                {[
                  { label: 'Total Users', val: stats.totalUsers },
                  { label: 'Delivery Partners', val: stats.totalPartners },
                  { label: 'Total Parcels', val: stats.totalParcels },
                  { label: 'Active Deliveries', val: stats.activeDeliveries },
                  { label: 'Completed', val: stats.completedDeliveries },
                  { label: 'Gross Revenue', val: `₹${stats.grossRevenue.toFixed(0)}` },
                  { label: 'Partner Earnings', val: `₹${stats.partnerEarnings.toFixed(0)}` },
                  { label: 'Platform Fee', val: `₹${stats.platformRevenue.toFixed(0)}` },
                  { label: 'Open Guard Alerts', val: stats.securityAlertsOpen },
                  { label: 'Pending Disputes', val: stats.pendingDisputes }
                ].map((k) => (
                  <div key={k.label} className="rounded-2xl border border-neutral-200 bg-[#F5F5F5] p-4">
                    <div className="text-[11px] font-medium text-[#777777]">{k.label}</div>
                    <div className="font-mono-num mt-1 text-xl font-extrabold text-[#101114]">{k.val}</div>
                  </div>
                ))}
              </div>

              {/* Quick Guard Alerts Preview */}
              <div className="rounded-3xl border border-neutral-200 bg-white p-6">
                <div className="flex items-center justify-between">
                  <h2 className="font-display text-lg font-bold text-[#101114]">MOVEX Guard Queue</h2>
                  <button type="button" onClick={() => setTab('guard')} className="text-xs font-bold underline">
                    Review All
                  </button>
                </div>
                <div className="mt-3 space-y-2">
                  {alerts.slice(0, 3).map((a) => (
                    <div key={a.id} className="flex flex-wrap items-center justify-between gap-2 rounded-xl bg-[#F5F5F5] p-3.5 text-xs">
                      <div>
                        <span className="font-mono-num font-bold text-[#101114]">{a.parcel_code}</span>
                        <span className="text-[#777777]"> · {a.declared_contents} · Risk {a.risk_level}</span>
                      </div>
                      <span className={`font-bold ${getStatusToneClass(a.status)}`}>{a.status}</span>
                    </div>
                  ))}
                </div>
              </div>
            </div>
          )}

          {/* USERS & PARTNERS */}
          {(tab === 'users' || tab === 'partners') && (
            <div className="rounded-3xl border border-neutral-200 bg-white p-6">
              <h2 className="font-display text-xl font-bold text-[#101114]">
                {tab === 'users' ? 'User Management' : 'Delivery Partner Management'}
              </h2>
              <div className="mt-4 overflow-x-auto">
                <table className="w-full text-left text-xs">
                  <thead>
                    <tr className="border-b border-neutral-200 text-[#777777]">
                      <th className="py-2.5 pr-3">Name</th>
                      <th className="py-2.5 pr-3">Role</th>
                      <th className="py-2.5 pr-3">Contact</th>
                      <th className="py-2.5 pr-3">Status</th>
                      <th className="py-2.5">Actions</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-neutral-100">
                    {(tab === 'users' ? users : partnerRows).map((u) => (
                      <tr key={u.id}>
                        <td className="py-3 pr-3 font-semibold text-[#101114]">
                          {u.name}
                          {u.vehicle_number ? <div className="text-[11px] text-[#777777]">{u.vehicle_number}</div> : null}
                        </td>
                        <td className="py-3 pr-3 uppercase text-[#777777]">{u.role}</td>
                        <td className="py-3 pr-3 text-[#777777]">
                          {u.email} · {u.mobile}
                        </td>
                        <td className={`py-3 pr-3 font-bold ${getStatusToneClass(u.verification_status)}`}>
                          {u.verification_status}
                        </td>
                        <td className="py-3">
                          {u.role !== 'admin' && (
                            <div className="flex gap-1.5">
                              <button
                                type="button"
                                onClick={() => handleUserStatus(u.id, 'VERIFIED')}
                                className="rounded-lg bg-emerald-50 px-2.5 py-1 text-[11px] font-bold text-emerald-700"
                              >
                                Verify
                              </button>
                              <button
                                type="button"
                                onClick={() => handleUserStatus(u.id, 'SUSPENDED')}
                                className="rounded-lg bg-red-50 px-2.5 py-1 text-[11px] font-bold text-red-700"
                              >
                                Suspend
                              </button>
                            </div>
                          )}
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            </div>
          )}

          {/* PARCELS & DELIVERIES */}
          {(tab === 'parcels' || tab === 'deliveries') && (
            <div className="rounded-3xl border border-neutral-200 bg-white p-6">
              <h2 className="font-display text-xl font-bold text-[#101114]">
                {tab === 'parcels' ? 'All Parcels & Declarations' : 'Active Deliveries Monitor'}
              </h2>
              <div className="mt-4 space-y-3">
                {(tab === 'parcels' ? parcels : activeDeliveries).map((p) => (
                  <div key={p.id} className="rounded-2xl border border-neutral-200 bg-[#F5F5F5] p-4 text-xs">
                    <div className="flex flex-wrap items-center justify-between gap-2">
                      <span className="font-mono-num text-sm font-extrabold text-[#101114]">
                        {p.parcel_code} · {p.pickup_location} → {p.destination_location}
                      </span>
                      <span className={`font-bold ${getStatusToneClass(p.status)}`}>{formatStatusLabel(p.status)}</span>
                    </div>
                    <div className="mt-1 text-[#777777]">
                      Sender: {p.sender_name} · Partner: {p.partner_name || 'Unassigned'} ·{' '}
                      {formatTransportModeLabel(p.transport_mode)} · {p.weight_kg} kg · ₹{p.total_price.toFixed(2)}
                    </div>
                    <div className="mt-1 text-[#101114]">
                      Declaration ({p.guard_classification}): {p.declared_contents} (Value ₹{p.declared_value})
                    </div>
                  </div>
                ))}
              </div>
            </div>
          )}

          {/* MOVEX GUARD */}
          {tab === 'guard' && (
            <div className="rounded-3xl border border-neutral-200 bg-white p-6">
              <h2 className="font-display text-xl font-bold text-[#101114]">MOVEX Guard Security Reviews</h2>
              <p className="mt-1 text-xs text-[#777777]">
                Manual review queue for restricted declarations and anomaly flags. Decisions are logged in audit history.
              </p>

              <div className="mt-4 space-y-4">
                {alerts.map((a) => {
                  let reasons: string[] = [];
                  try {
                    reasons = JSON.parse(a.reasons_json);
                  } catch {
                    reasons = [a.reasons_json];
                  }
                  return (
                    <div key={a.id} className="rounded-2xl border border-neutral-200 bg-[#F5F5F5] p-5">
                      <div className="flex flex-wrap items-start justify-between gap-3">
                        <div>
                          <div className="flex items-center gap-2">
                            <span className="font-mono-num text-sm font-extrabold text-[#101114]">{a.parcel_code}</span>
                            <span className="text-xs font-bold text-amber-700">
                              Risk: {a.risk_level} · {a.classification}
                            </span>
                          </div>
                          <div className="mt-1 text-xs text-[#777777]">
                            Sender: {a.sender_name} ({a.sender_email}) · {a.pickup_location} → {a.destination_location}
                          </div>
                          <div className="mt-1 text-xs font-semibold text-[#101114]">
                            Declared: {a.declared_contents} (₹{a.declared_value})
                          </div>
                          <ul className="mt-2 space-y-0.5 text-xs text-[#777777]">
                            {reasons.map((r, i) => (
                              <li key={i}>• {r}</li>
                            ))}
                          </ul>
                        </div>
                        <span className="font-mono-num text-xs font-bold text-[#101114]">Status: {a.status}</span>
                      </div>

                      <div className="mt-4 flex flex-wrap items-center gap-2 border-t border-neutral-200 pt-3">
                        <input
                          type="text"
                          placeholder="Audit decision note..."
                          value={decisionNotes[a.id] ?? a.admin_decision_note ?? ''}
                          onChange={(e) => setDecisionNotes((prev) => ({ ...prev, [a.id]: e.target.value }))}
                          className="h-9 min-w-[200px] flex-1 rounded-xl border border-neutral-200 bg-white px-3 text-xs"
                        />
                        <button
                          type="button"
                          onClick={() => handleGuardDecision(a.id, 'APPROVED')}
                          className="h-9 rounded-xl bg-emerald-600 px-3 text-xs font-bold text-white"
                        >
                          Approve
                        </button>
                        <button
                          type="button"
                          onClick={() => handleGuardDecision(a.id, 'REJECTED')}
                          className="h-9 rounded-xl bg-red-600 px-3 text-xs font-bold text-white"
                        >
                          Reject
                        </button>
                        <button
                          type="button"
                          onClick={() => handleGuardDecision(a.id, 'INFO_REQUESTED')}
                          className="h-9 rounded-xl border border-neutral-300 bg-white px-3 text-xs font-semibold text-[#101114]"
                        >
                          Request Info
                        </button>
                        <button
                          type="button"
                          onClick={() => handleGuardDecision(a.id, 'ESCALATED')}
                          className="h-9 rounded-xl bg-[#101114] px-3 text-xs font-semibold text-[#FFD43B]"
                        >
                          Escalate
                        </button>
                      </div>
                    </div>
                  );
                })}
              </div>
            </div>
          )}

          {/* PAYMENTS */}
          {tab === 'payments' && (
            <div className="rounded-3xl border border-neutral-200 bg-white p-6">
              <h2 className="font-display text-xl font-bold text-[#101114]">Simulated FinTech Ledger</h2>
              <div className="mt-4 overflow-x-auto">
                <table className="w-full text-left text-xs">
                  <thead>
                    <tr className="border-b border-neutral-200 text-[#777777]">
                      <th className="py-2 pr-3">Parcel</th>
                      <th className="py-2 pr-3">Amount</th>
                      <th className="py-2 pr-3">Commission</th>
                      <th className="py-2 pr-3">Partner</th>
                      <th className="py-2 pr-3">Status</th>
                      <th className="py-2">Action</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-neutral-100">
                    {payments.map((p) => (
                      <tr key={p.id}>
                        <td className="font-mono-num py-2.5 pr-3 font-bold text-[#101114]">{p.parcel_code}</td>
                        <td className="font-mono-num py-2.5 pr-3">₹{p.amount.toFixed(2)}</td>
                        <td className="font-mono-num py-2.5 pr-3">₹{p.platform_commission.toFixed(2)}</td>
                        <td className="font-mono-num py-2.5 pr-3">₹{p.partner_earning.toFixed(2)}</td>
                        <td className={`py-2.5 pr-3 font-bold ${getStatusToneClass(p.status)}`}>{p.status}</td>
                        <td className="py-2.5">
                          {p.status !== 'REFUNDED' && (
                            <button
                              type="button"
                              onClick={() => handleRefundPayment(p.id)}
                              className="rounded-lg border border-neutral-300 bg-[#F5F5F5] px-2.5 py-1 text-[11px] font-semibold"
                            >
                              Simulate Refund
                            </button>
                          )}
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            </div>
          )}

          {/* DISPUTES */}
          {tab === 'disputes' && (
            <div className="rounded-3xl border border-neutral-200 bg-white p-6">
              <h2 className="font-display text-xl font-bold text-[#101114]">Dispute Resolution</h2>
              <div className="mt-4 space-y-3">
                {disputes.length === 0 ? (
                  <p className="text-sm text-[#777777]">No disputes pending.</p>
                ) : (
                  disputes.map((d) => (
                    <div key={d.id} className="rounded-2xl border border-neutral-200 bg-[#F5F5F5] p-4 text-xs">
                      <div className="flex items-center justify-between">
                        <span className="font-bold text-[#101114]">
                          {d.parcel_code} · {d.reason}
                        </span>
                        <span className="font-bold text-amber-700">{d.status}</span>
                      </div>
                      <p className="mt-1 text-[#777777]">{d.description}</p>
                      {d.status === 'OPEN' && (
                        <div className="mt-3 flex gap-2">
                          <button
                            type="button"
                            onClick={() => handleResolveDispute(d.id, 'RESOLVED_REFUND')}
                            className="h-8 rounded-lg bg-red-600 px-3 font-bold text-white"
                          >
                            Refund Sender
                          </button>
                          <button
                            type="button"
                            onClick={() => handleResolveDispute(d.id, 'RESOLVED_RELEASE')}
                            className="h-8 rounded-lg bg-emerald-600 px-3 font-bold text-white"
                          >
                            Release to Partner
                          </button>
                        </div>
                      )}
                    </div>
                  ))
                )}
              </div>
            </div>
          )}

          {/* ANALYTICS */}
          {tab === 'analytics' && (
            <div className="grid grid-cols-1 gap-6 md:grid-cols-2">
              <div className="rounded-3xl border border-neutral-200 bg-white p-6">
                <h3 className="font-display text-base font-bold text-[#101114]">Transportation Mode Distribution</h3>
                <div className="mt-4 h-64">
                  <ResponsiveContainer width="100%" height="100%">
                    <BarChart data={modeDistribution}>
                      <CartesianGrid strokeDasharray="3 3" stroke="#E5E5E5" />
                      <XAxis dataKey="mode" tick={{ fontSize: 12 }} />
                      <YAxis tick={{ fontSize: 12 }} />
                      <Tooltip />
                      <Bar dataKey="count" fill="#101114" radius={[6, 6, 0, 0]} />
                    </BarChart>
                  </ResponsiveContainer>
                </div>
              </div>

              <div className="rounded-3xl border border-neutral-200 bg-white p-6">
                <h3 className="font-display text-base font-bold text-[#101114]">
                  Community Relay vs Premium Express (Success Rate: {stats.successRate}%)
                </h3>
                <div className="mt-4 h-64">
                  <ResponsiveContainer width="100%" height="100%">
                    <PieChart>
                      <Pie
                        data={modelDistribution}
                        dataKey="count"
                        nameKey="model"
                        cx="50%"
                        cy="50%"
                        outerRadius={80}
                        label
                      >
                        {modelDistribution.map((_entry, index) => (
                          <Cell key={index} fill={PIE_COLORS[index % PIE_COLORS.length]} />
                        ))}
                      </Pie>
                      <Tooltip />
                    </PieChart>
                  </ResponsiveContainer>
                </div>
              </div>
            </div>
          )}
        </section>
      </div>
    </div>
  );
}
