import { Link } from 'react-router-dom';
import { Home, Search, AlertCircle, ArrowLeft, Package, MapPin, Shield } from 'lucide-react';
import { usePageMeta } from '../hooks/usePageMeta';

export default function NotFoundPage() {
  usePageMeta({
    title: '404 - Page Not Found',
    description: 'The parcel route or page you are looking for does not exist on MOVEX.',
  });

  return (
    <main id="main-content" className="min-h-[75vh] flex items-center justify-center px-4 py-16 bg-white dark:bg-[#101114] text-[#101114] dark:text-white transition-colors">
      <div className="max-w-xl w-full text-center">
        {/* Animated 404 badge */}
        <div className="inline-flex items-center justify-center p-3 mb-6 rounded-2xl bg-[#FFD43B]/20 text-[#101114] dark:text-[#FFD43B]">
          <AlertCircle className="w-12 h-12 stroke-[1.75]" />
        </div>

        <h1 className="font-display text-4xl sm:text-6xl font-extrabold tracking-tight">
          404
        </h1>
        <p className="mt-2 text-xl sm:text-2xl font-bold font-display">
          Off-Route! Page Not Found
        </p>
        <p className="mt-3 text-sm sm:text-base text-[#777777] dark:text-neutral-400 max-w-md mx-auto">
          We couldn't find the delivery route, dashboard link, or page you were trying to access. It might have been moved, completed, or retired.
        </p>

        {/* Primary Action Button */}
        <div className="mt-8 flex flex-wrap items-center justify-center gap-3">
          <Link
            to="/"
            className="inline-flex h-11 items-center gap-2 rounded-xl bg-[#FFD43B] px-6 text-sm font-bold text-[#101114] hover:bg-[#F5C419] transition-all hover:scale-[1.02] shadow-sm"
          >
            <Home className="w-4 h-4" />
            <span>Return to Homepage</span>
          </Link>

          <Link
            to="/track"
            className="inline-flex h-11 items-center gap-2 rounded-xl border border-neutral-200 dark:border-neutral-700 bg-[#F5F5F5] dark:bg-[#25282D] px-5 text-sm font-semibold text-[#101114] dark:text-neutral-100 hover:border-[#101114] dark:hover:border-neutral-500 transition-colors"
          >
            <Search className="w-4 h-4" />
            <span>Track a Parcel</span>
          </Link>
        </div>

        {/* Helpful Quick Navigation Links */}
        <div className="mt-12 pt-8 border-t border-neutral-200 dark:border-neutral-800">
          <p className="text-xs font-semibold text-[#777777] dark:text-neutral-400 uppercase tracking-wider mb-4">
            Popular MOVEX Destinations
          </p>
          <div className="grid grid-cols-2 sm:grid-cols-4 gap-3 text-left">
            <Link
              to="/sender?tab=book"
              className="p-3 rounded-xl border border-neutral-100 dark:border-neutral-800 bg-[#F5F5F5] dark:bg-[#1a1d21] hover:border-[#FFD43B] dark:hover:border-[#FFD43B] transition-colors group"
            >
              <Package className="w-4 h-4 mb-1.5 text-[#101114] dark:text-[#FFD43B]" />
              <div className="text-xs font-bold text-[#101114] dark:text-neutral-200 group-hover:underline">
                Send Parcel
              </div>
              <div className="text-[10px] text-[#777777] dark:text-neutral-400">Book in 6 steps</div>
            </Link>

            <Link
              to="/partner"
              className="p-3 rounded-xl border border-neutral-100 dark:border-neutral-800 bg-[#F5F5F5] dark:bg-[#1a1d21] hover:border-[#FFD43B] dark:hover:border-[#FFD43B] transition-colors group"
            >
              <MapPin className="w-4 h-4 mb-1.5 text-[#101114] dark:text-[#FFD43B]" />
              <div className="text-xs font-bold text-[#101114] dark:text-neutral-200 group-hover:underline">
                Deliver
              </div>
              <div className="text-[10px] text-[#777777] dark:text-neutral-400">Share your journey</div>
            </Link>

            <Link
              to="/how-it-works"
              className="p-3 rounded-xl border border-neutral-100 dark:border-neutral-800 bg-[#F5F5F5] dark:bg-[#1a1d21] hover:border-[#FFD43B] dark:hover:border-[#FFD43B] transition-colors group"
            >
              <ArrowLeft className="w-4 h-4 mb-1.5 text-[#101114] dark:text-[#FFD43B]" />
              <div className="text-xs font-bold text-[#101114] dark:text-neutral-200 group-hover:underline">
                How It Works
              </div>
              <div className="text-[10px] text-[#777777] dark:text-neutral-400">Community Relay</div>
            </Link>

            <Link
              to="/safety"
              className="p-3 rounded-xl border border-neutral-100 dark:border-neutral-800 bg-[#F5F5F5] dark:bg-[#1a1d21] hover:border-[#FFD43B] dark:hover:border-[#FFD43B] transition-colors group"
            >
              <Shield className="w-4 h-4 mb-1.5 text-[#101114] dark:text-[#FFD43B]" />
              <div className="text-xs font-bold text-[#101114] dark:text-neutral-200 group-hover:underline">
                Safety &amp; Guard
              </div>
              <div className="text-[10px] text-[#777777] dark:text-neutral-400">OTP custody</div>
            </Link>
          </div>
        </div>
      </div>
    </main>
  );
}
