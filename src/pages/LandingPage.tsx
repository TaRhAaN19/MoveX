import { useState } from 'react';
import { useNavigate, Link } from 'react-router-dom';
import { ArrowRight, Package, Navigation, Search, ShieldCheck, Route, Clock, Zap, MapPin } from 'lucide-react';
import { useAuth } from '../context/AuthContext';
import { TransportModeIcon } from '../components/TransportIcon';
import { usePageMeta } from '../hooks/usePageMeta';

const MODES = [
  { mode: 'bike', name: 'Bike', start: '₹30', desc: 'Fast local & short corridors up to 5 kg' },
  { mode: 'car', name: 'Car', start: '₹50', desc: 'Flexible regional trips up to 15 kg' },
  { mode: 'bus', name: 'Bus', start: '₹40', desc: 'Intercity coach luggage relay' },
  { mode: 'train', name: 'Train', start: '₹60', desc: 'Station-to-station rail corridors' },
  { mode: 'flight', name: 'Flight', start: '₹150', desc: 'Priority intercity air cargo workflow' },
  { mode: 'freight', name: 'Commercial Freight', start: '₹100', desc: 'Volumetric & heavier consignments' }
] as const;

export default function LandingPage() {
  const { user, switchActivity } = useAuth();
  const navigate = useNavigate();
  const [trackCode, setTrackCode] = useState('');

  usePageMeta({
    title: 'MOVEX — Moving Things Together | Multi-Modal Community Parcel Delivery',
    description: 'Send parcels affordably with verified travellers already travelling on your route across bike, car, bus, train, and flight.',
  });

  const handleSelectSend = async () => {
    if (user) {
      if (user.role === 'admin') {
        navigate('/admin');
        return;
      }
      await switchActivity('sender');
      navigate('/sender?tab=book');
    } else {
      navigate('/auth?intent=sender');
    }
  };

  const handleSelectDeliver = async () => {
    if (user) {
      if (user.role === 'admin') {
        navigate('/admin');
        return;
      }
      await switchActivity('partner');
      navigate('/partner');
    } else {
      navigate('/auth?intent=partner');
    }
  };

  const handleTrackSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    const cleaned = trackCode.trim();
    if (!cleaned) return;
    navigate(`/track/${encodeURIComponent(cleaned)}`);
  };

  return (
    <main id="main-content" className="bg-white dark:bg-[#101114] text-[#101114] dark:text-neutral-100 transition-colors">
      {/* Feature 2: Above-the-Fold Hero Section & Immediate CTAs */}
      <section className="mx-auto max-w-6xl px-4 pt-10 pb-12 sm:px-6 md:pt-14 md:pb-16">
        <div className="max-w-3xl">
          <div className="inline-flex items-center gap-2 px-3 py-1 rounded-full bg-[#FFD43B]/20 text-[#101114] dark:text-[#FFD43B] text-xs font-bold tracking-wider uppercase mb-3">
            <Zap className="h-3.5 w-3.5 fill-[#FFD43B]" />
            <span>Community Logistics Redefined</span>
          </div>
          <h1 className="font-display text-3xl font-extrabold tracking-tight text-[#101114] dark:text-white text-balance sm:text-5xl">
            What would you like to do today?
          </h1>
          <p className="mt-3 text-base sm:text-lg text-[#777777] dark:text-neutral-400 leading-relaxed">
            Choose to send a parcel with travellers already heading your way, or share your existing journey to earn.
          </p>
        </div>

        {/* Two Large Selectable Cards with Enhanced Accessibility */}
        <div className="mt-8 grid grid-cols-1 gap-5 md:grid-cols-2">
          {/* Card 1: Send a Parcel */}
          <button
            type="button"
            onClick={handleSelectSend}
            aria-label="Send a parcel with travellers or doorstep express"
            className="group flex flex-col justify-between rounded-3xl border border-neutral-200 dark:border-neutral-800 bg-[#F5F5F5] dark:bg-[#181a1f] p-6 text-left transition-all duration-200 hover:border-[#101114] dark:hover:border-[#FFD43B] hover:bg-white dark:hover:bg-[#202329] hover:shadow-xl sm:p-8 hover:-translate-y-0.5"
          >
            <div>
              <div className="flex items-center justify-between">
                <div className="flex h-14 w-14 items-center justify-center rounded-2xl bg-[#FFD43B] text-[#101114] shadow-xs">
                  <Package className="h-7 w-7 stroke-[2]" />
                </div>
                <span className="inline-flex h-10 w-10 items-center justify-center rounded-full bg-white dark:bg-[#25282D] text-[#101114] dark:text-white shadow-xs transition-transform group-hover:translate-x-1">
                  <ArrowRight className="h-5 w-5" />
                </span>
              </div>
              <h2 className="font-display mt-6 text-2xl font-extrabold text-[#101114] dark:text-white">
                Send a Parcel
              </h2>
              <p className="mt-1 text-sm font-bold text-[#101114] dark:text-[#FFD43B]">
                Send anything, anywhere.
              </p>
              <p className="mt-2 text-sm leading-relaxed text-[#777777] dark:text-neutral-400">
                Book a convenient and affordable parcel delivery via Community Relay or doorstep Premium Express.
              </p>
            </div>
            <div className="mt-6 flex items-center justify-between border-t border-neutral-200/80 dark:border-neutral-800 pt-4">
              <span className="text-xs font-semibold text-[#777777] dark:text-neutral-400">
                6 Transport Modes · Dynamic INR Pricing
              </span>
              <span className="rounded-xl bg-[#FFD43B] px-4 py-2 text-xs font-bold text-[#101114] group-hover:bg-[#F5C419] transition-colors">
                Book Delivery
              </span>
            </div>
          </button>

          {/* Card 2: Deliver a Parcel */}
          <button
            type="button"
            onClick={handleSelectDeliver}
            aria-label="Share your travel route and earn money carrying parcels"
            className="group flex flex-col justify-between rounded-3xl border border-[#101114] dark:border-neutral-700 bg-[#101114] dark:bg-[#181a1f] p-6 text-left text-white transition-all duration-200 hover:bg-[#25282D] dark:hover:bg-[#202329] hover:shadow-xl sm:p-8 hover:-translate-y-0.5"
          >
            <div>
              <div className="flex items-center justify-between">
                <div className="flex h-14 w-14 items-center justify-center rounded-2xl bg-[#FFD43B] text-[#101114] shadow-xs">
                  <Navigation className="h-7 w-7 stroke-[2]" />
                </div>
                <span className="inline-flex h-10 w-10 items-center justify-center rounded-full bg-[#25282D] text-white transition-transform group-hover:translate-x-1">
                  <ArrowRight className="h-5 w-5" />
                </span>
              </div>
              <h2 className="font-display mt-6 text-2xl font-extrabold text-white">
                Deliver a Parcel
              </h2>
              <p className="mt-1 text-sm font-bold text-[#FFD43B]">
                Earn while you&apos;re on the move.
              </p>
              <p className="mt-2 text-sm leading-relaxed text-neutral-300 dark:text-neutral-400">
                Share your existing journey and earn money carrying parcels along routes you already travel.
              </p>
            </div>
            <div className="mt-6 flex items-center justify-between border-t border-white/15 dark:border-neutral-800 pt-4">
              <span className="text-xs font-semibold text-neutral-300 dark:text-neutral-400">
                Existing Journeys · Verified OTP Handovers
              </span>
              <span className="rounded-xl bg-[#FFD43B] px-4 py-2 text-xs font-bold text-[#101114] group-hover:bg-[#F5C419] transition-colors">
                Share Journey
              </span>
            </div>
          </button>
        </div>

        {/* Instant Parcel Tracking Bar */}
        <form
          onSubmit={handleTrackSubmit}
          className="mt-8 flex flex-col gap-3 rounded-2xl border border-neutral-200 dark:border-neutral-800 bg-[#F5F5F5] dark:bg-[#181a1f] p-4 sm:flex-row sm:items-center sm:p-5 transition-colors"
        >
          <div className="flex items-center gap-3 sm:min-w-[220px]">
            <Search className="h-5 w-5 shrink-0 text-[#101114] dark:text-[#FFD43B]" />
            <div>
              <div className="text-sm font-bold text-[#101114] dark:text-white">Track a Parcel</div>
              <div className="text-xs text-[#777777] dark:text-neutral-400">Try MVX-2026-1001 or MVX-2026-1002</div>
            </div>
          </div>
          <div className="flex flex-1 gap-2">
            <input
              type="text"
              value={trackCode}
              onChange={(e) => setTrackCode(e.target.value)}
              placeholder="Enter Parcel ID (e.g. MVX-2026-1001)"
              className="h-11 flex-1 rounded-xl border border-neutral-200 dark:border-neutral-700 bg-white dark:bg-[#25282D] px-4 font-mono-num text-sm text-[#101114] dark:text-white placeholder-[#777777] focus:border-[#101114] dark:focus:border-[#FFD43B] focus:outline-none"
            />
            <button
              type="submit"
              className="h-11 rounded-xl bg-[#101114] dark:bg-white px-5 text-sm font-semibold text-white dark:text-[#101114] transition-colors hover:bg-[#25282D] dark:hover:bg-neutral-200 whitespace-nowrap shrink-0"
            >
              Track Now
            </button>
          </div>
        </form>
      </section>

      {/* Two Delivery Models Comparison */}
      <section className="border-t border-neutral-200 dark:border-neutral-800 bg-[#F5F5F5] dark:bg-[#14161a] py-12 transition-colors">
        <div className="mx-auto max-w-6xl px-4 sm:px-6">
          <div className="flex flex-col justify-between gap-4 md:flex-row md:items-end">
            <div>
              <h2 className="font-display text-2xl font-bold text-[#101114] dark:text-white">
                Two Flexible Delivery Models
              </h2>
              <p className="mt-1 text-sm text-[#777777] dark:text-neutral-400">
                Switch seamlessly between affordable route-matched relays and dedicated doorstep express.
              </p>
            </div>
          </div>

          <div className="mt-6 grid grid-cols-1 gap-5 md:grid-cols-2">
            <div className="rounded-2xl border border-neutral-200 dark:border-neutral-800 bg-white dark:bg-[#181a1f] p-6 transition-colors">
              <div className="flex items-center justify-between">
                <h3 className="font-display text-lg font-bold text-[#101114] dark:text-white">Community Relay</h3>
                <span className="font-mono-num text-xs font-bold text-emerald-700 dark:text-emerald-400 bg-emerald-50 dark:bg-emerald-950/40 px-2 py-0.5 rounded-md">
                  Zero Dedicated Trips
                </span>
              </div>
              <p className="mt-2 text-sm text-[#777777] dark:text-neutral-400 leading-relaxed">
                Matches your parcel with verified individuals already travelling on that route. AI suggests safe public meeting points for sender and partner agreement.
              </p>
              <div className="mt-4 flex flex-wrap gap-x-4 gap-y-1 text-xs font-medium text-[#101114] dark:text-neutral-200">
                <span>Lowest delivery charges</span>
                <span aria-hidden="true">·</span>
                <span>AI route compatibility</span>
                <span aria-hidden="true">·</span>
                <span>Existing journeys only</span>
              </div>
            </div>

            <div className="rounded-2xl border border-neutral-200 dark:border-neutral-800 bg-white dark:bg-[#181a1f] p-6 transition-colors">
              <div className="flex items-center justify-between">
                <h3 className="font-display text-lg font-bold text-[#101114] dark:text-white">Premium Express</h3>
                <span className="font-mono-num text-xs font-bold text-[#101114] dark:text-[#FFD43B] bg-[#FFD43B]/20 px-2 py-0.5 rounded-md">
                  Doorstep to Doorstep
                </span>
              </div>
              <p className="mt-2 text-sm text-[#777777] dark:text-neutral-400 leading-relaxed">
                Assigns a dedicated verified delivery partner for direct collection from your doorstep and fast delivery to the recipient&apos;s door.
              </p>
              <div className="mt-4 flex flex-wrap gap-x-4 gap-y-1 text-xs font-medium text-[#101114] dark:text-neutral-200">
                <span>Direct dispatch</span>
                <span aria-hidden="true">·</span>
                <span>Priority ETAs</span>
                <span aria-hidden="true">·</span>
                <span>OTP verified custody</span>
              </div>
            </div>
          </div>
        </div>
      </section>

      {/* Six Transportation Modes */}
      <section className="py-12">
        <div className="mx-auto max-w-6xl px-4 sm:px-6">
          <h2 className="font-display text-2xl font-bold text-[#101114] dark:text-white">
            Six Transportation Modes
          </h2>
          <p className="mt-1 text-sm text-[#777777] dark:text-neutral-400">
            Real-time compatibility and dynamic pricing across local, regional, and intercity modes.
          </p>

          <div className="mt-6 grid grid-cols-1 gap-4 sm:grid-cols-2 lg:grid-cols-3">
            {MODES.map((m) => (
              <div
                key={m.mode}
                className="flex items-start gap-4 rounded-2xl border border-neutral-200 dark:border-neutral-800 bg-white dark:bg-[#181a1f] p-5 transition-all hover:border-[#101114] dark:hover:border-[#FFD43B]"
              >
                <div className="flex h-11 w-11 shrink-0 items-center justify-center rounded-xl bg-[#F5F5F5] dark:bg-[#25282D] text-[#101114] dark:text-[#FFD43B]">
                  <TransportModeIcon mode={m.mode} />
                </div>
                <div className="min-w-0 flex-1">
                  <div className="flex items-center justify-between gap-2">
                    <h3 className="font-display text-base font-bold text-[#101114] dark:text-white">{m.name}</h3>
                    <span className="font-mono-num text-xs font-bold text-[#101114] dark:text-[#FFD43B]">From {m.start}</span>
                  </div>
                  <p className="mt-1 text-xs leading-relaxed text-[#777777] dark:text-neutral-400">{m.desc}</p>
                </div>
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* Trust & Intelligence Strip */}
      <section className="border-t border-neutral-200 dark:border-neutral-800 bg-[#F5F5F5] dark:bg-[#14161a] py-10 transition-colors">
        <div className="mx-auto grid max-w-6xl grid-cols-1 gap-6 px-4 sm:px-6 md:grid-cols-3">
          <div className="flex items-start gap-3">
            <Route className="mt-0.5 h-5 w-5 shrink-0 text-[#101114] dark:text-[#FFD43B]" />
            <div>
              <h3 className="text-sm font-bold text-[#101114] dark:text-white">MOVEX Intelligence</h3>
              <p className="mt-1 text-xs text-[#777777] dark:text-neutral-400 leading-relaxed">
                Scores existing journeys out of 100, predicts ETAs, and suggests public meeting hubs.
              </p>
            </div>
          </div>
          <div className="flex items-start gap-3">
            <ShieldCheck className="mt-0.5 h-5 w-5 shrink-0 text-[#101114] dark:text-[#FFD43B]" />
            <div>
              <h3 className="text-sm font-bold text-[#101114] dark:text-white">MOVEX Guard</h3>
              <p className="mt-1 text-xs text-[#777777] dark:text-neutral-400 leading-relaxed">
                Screens declarations against transport regulations while supporting normal paper and cardboard packaging.
              </p>
            </div>
          </div>
          <div className="flex items-start gap-3">
            <Clock className="mt-0.5 h-5 w-5 shrink-0 text-[#101114] dark:text-[#FFD43B]" />
            <div>
              <h3 className="text-sm font-bold text-[#101114] dark:text-white">OTP Custody Timeline</h3>
              <p className="mt-1 text-xs text-[#777777] dark:text-neutral-400 leading-relaxed">
                Digital parcel QR identity with Pickup, Relay Handover, and Recipient Delivery OTP verification.
              </p>
            </div>
          </div>
        </div>
      </section>

      {/* Feature 15: Sticky Mobile Quick Action Bar */}
      <div className="fixed bottom-0 left-0 right-0 z-30 flex items-center justify-between gap-3 border-t border-neutral-200 dark:border-neutral-800 bg-white/95 dark:bg-[#101114]/95 p-3 backdrop-blur-md md:hidden">
        <button
          type="button"
          onClick={handleSelectSend}
          className="flex-1 h-11 rounded-xl bg-[#FFD43B] text-[#101114] font-bold text-xs flex items-center justify-center gap-1.5 shadow-sm"
        >
          <Package className="h-4 w-4" />
          <span>Send Parcel</span>
        </button>
        <button
          type="button"
          onClick={handleSelectDeliver}
          className="flex-1 h-11 rounded-xl bg-[#101114] dark:bg-white text-white dark:text-[#101114] font-bold text-xs flex items-center justify-center gap-1.5 shadow-sm"
        >
          <Navigation className="h-4 w-4" />
          <span>Deliver Parcel</span>
        </button>
      </div>
    </main>
  );
}
