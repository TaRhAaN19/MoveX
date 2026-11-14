import { useLocation, Link, useNavigate } from 'react-router-dom';
import { CheckCircle2, ArrowRight, Package, MapPin, Search } from 'lucide-react';
import { QRCodeSVG } from 'qrcode.react';
import CopyButton from '../components/CopyButton';
import { usePageMeta } from '../hooks/usePageMeta';

export default function ThankYouPage() {
  const location = useLocation();
  const navigate = useNavigate();
  const state = location.state as {
    parcelCode?: string;
    pickupOtp?: string;
    deliveryOtp?: string;
    totalPrice?: number;
    pickup?: string;
    destination?: string;
    mode?: string;
  } | null;

  usePageMeta({
    title: 'Booking Confirmed',
    description: 'Your parcel delivery has been scheduled on MOVEX.',
  });

  const parcelCode = state?.parcelCode || 'MVX-2026-1001';
  const pickupOtp = state?.pickupOtp || '418290';
  const deliveryOtp = state?.deliveryOtp || '892144';
  const totalPrice = state?.totalPrice || 148;
  const pickup = state?.pickup || 'Panaji, Goa';
  const destination = state?.destination || 'Margao, Goa';

  return (
    <div id="main-content" className="mx-auto max-w-3xl px-4 py-12 sm:px-6">
      <div className="rounded-3xl border border-neutral-200 dark:border-neutral-800 bg-white dark:bg-[#181a1f] p-6 sm:p-10 shadow-sm text-center">
        {/* Animated Success Badge */}
        <div className="inline-flex h-16 w-16 items-center justify-center rounded-2xl bg-emerald-50 dark:bg-emerald-950/40 text-emerald-600 dark:text-emerald-400 mb-6">
          <CheckCircle2 className="h-9 w-9 stroke-[2]" />
        </div>

        <h1 className="font-display text-2xl sm:text-4xl font-extrabold text-[#101114] dark:text-white">
          Parcel Booked Successfully!
        </h1>
        <p className="mt-2 text-sm sm:text-base text-[#777777] dark:text-neutral-400 max-w-md mx-auto">
          Your delivery request is matched and active. Share your Pickup OTP with the traveller when handing over the package.
        </p>

        {/* Digital ID Card */}
        <div className="mt-8 rounded-2xl border border-neutral-200 dark:border-neutral-800 bg-[#F5F5F5] dark:bg-[#25282D] p-6 text-left">
          <div className="flex flex-wrap items-center justify-between gap-4 pb-4 border-b border-neutral-200 dark:border-neutral-700">
            <div>
              <span className="text-[11px] font-bold text-[#777777] dark:text-neutral-400 uppercase tracking-wider">
                Digital Tracking ID
              </span>
              <div className="flex items-center gap-2 mt-1">
                <span className="font-mono-num text-xl sm:text-2xl font-black text-[#101114] dark:text-white">
                  {parcelCode}
                </span>
                <CopyButton text={parcelCode} label="Copy ID" />
              </div>
            </div>
            <div className="p-2 rounded-xl bg-white dark:bg-[#181a1f] shadow-xs">
              <QRCodeSVG value={`MOVEX:${parcelCode}`} size={64} />
            </div>
          </div>

          <div className="mt-4 grid grid-cols-1 sm:grid-cols-2 gap-4 text-xs">
            <div>
              <span className="text-[#777777] dark:text-neutral-400">Route:</span>
              <p className="font-bold text-[#101114] dark:text-neutral-200 mt-0.5">
                {pickup} → {destination}
              </p>
            </div>
            <div>
              <span className="text-[#777777] dark:text-neutral-400">Simulated Payment Total:</span>
              <p className="font-mono-num font-bold text-[#101114] dark:text-neutral-200 mt-0.5">
                ₹{totalPrice.toFixed(2)} (Paid via Prototype UPI)
              </p>
            </div>
          </div>

          {/* OTP Handoff Boxes */}
          <div className="mt-5 grid grid-cols-2 gap-3 pt-4 border-t border-neutral-200 dark:border-neutral-700">
            <div className="p-3 rounded-xl bg-white dark:bg-[#181a1f]">
              <span className="text-[10px] font-bold text-[#777777] dark:text-neutral-400 uppercase">
                Pickup OTP (For Traveller)
              </span>
              <div className="font-mono-num text-xl font-black text-[#101114] dark:text-[#FFD43B] mt-1">
                {pickupOtp}
              </div>
            </div>
            <div className="p-3 rounded-xl bg-white dark:bg-[#181a1f]">
              <span className="text-[10px] font-bold text-[#777777] dark:text-neutral-400 uppercase">
                Delivery OTP (For Recipient)
              </span>
              <div className="font-mono-num text-xl font-black text-[#101114] dark:text-[#FFD43B] mt-1">
                {deliveryOtp}
              </div>
            </div>
          </div>
        </div>

        {/* Action Buttons */}
        <div className="mt-8 flex flex-wrap items-center justify-center gap-3">
          <Link
            to={`/track/${encodeURIComponent(parcelCode)}`}
            className="inline-flex h-11 items-center gap-2 rounded-xl bg-[#FFD43B] px-6 text-sm font-bold text-[#101114] hover:bg-[#F5C419] transition-all shadow-sm"
          >
            <Search className="h-4 w-4" />
            <span>Track Live Status</span>
          </Link>
          <Link
            to="/sender"
            className="inline-flex h-11 items-center gap-2 rounded-xl border border-neutral-200 dark:border-neutral-700 bg-white dark:bg-[#25282D] px-5 text-sm font-semibold text-[#101114] dark:text-white hover:border-[#101114] dark:hover:border-neutral-500 transition-colors"
          >
            <span>Sender Dashboard</span>
            <ArrowRight className="h-4 w-4" />
          </Link>
        </div>
      </div>
    </div>
  );
}
