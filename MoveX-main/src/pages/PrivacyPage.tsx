import { Link } from 'react-router-dom';
import { Shield, Lock, Eye, Server, RefreshCw } from 'lucide-react';
import { usePageMeta } from '../hooks/usePageMeta';

export default function PrivacyPage() {
  usePageMeta({
    title: 'Privacy Policy',
    description: 'Learn how MOVEX protects user telemetry, parcel declaration data, and identity records.',
  });

  return (
    <div id="main-content" className="mx-auto max-w-4xl px-4 py-12 sm:px-6">
      <div className="border-b border-neutral-200 dark:border-neutral-800 pb-6 mb-8">
        <div className="flex items-center gap-2 text-xs font-bold text-[#FFD43B] dark:text-[#FFD43B] uppercase tracking-wider mb-2">
          <Shield className="h-4 w-4" />
          <span>Legal &amp; Compliance</span>
        </div>
        <h1 className="font-display text-3xl sm:text-4xl font-extrabold text-[#101114] dark:text-white">
          Privacy Policy
        </h1>
        <p className="mt-2 text-sm text-[#777777] dark:text-neutral-400">
          Last Updated: <strong className="text-[#101114] dark:text-neutral-200">November 14, 2026</strong>
        </p>
      </div>

      <div className="space-y-8 text-sm leading-relaxed text-[#101114] dark:text-neutral-300">
        <section>
          <h2 className="font-display text-xl font-bold text-[#101114] dark:text-white mb-3">
            1. Overview &amp; Commitment
          </h2>
          <p>
            MOVEX ("we", "our", or "platform") operates as a decentralized, community-first parcel relay and express courier service. We take your privacy, route confidentiality, and parcel declaration security seriously. This Privacy Policy details what information we collect, why we need it, and how your data is protected during every stage of parcel custody.
          </p>
        </section>

        <section>
          <h2 className="font-display text-xl font-bold text-[#101114] dark:text-white mb-3">
            2. Information We Collect
          </h2>
          <ul className="list-disc pl-5 space-y-2 text-[#777777] dark:text-neutral-400">
            <li><strong className="text-[#101114] dark:text-neutral-200">Account Credentials:</strong> Full name, verified mobile number, email address, and role credentials (sender or delivery partner).</li>
            <li><strong className="text-[#101114] dark:text-neutral-200">Parcel Declarations:</strong> Declared contents, weight, dimensions, and approximate valuation for MOVEX Guard regulatory screening.</li>
            <li><strong className="text-[#101114] dark:text-neutral-200">Telemetry &amp; Geolocation:</strong> Pickup, destination, and mutually agreed transit meeting points. Real-time GPS pings are used strictly during active parcel transit.</li>
            <li><strong className="text-[#101114] dark:text-neutral-200">OTP Custody Ledgers:</strong> Timestamped cryptographic verification of Pickup, Handover, and Recipient Delivery tokens.</li>
          </ul>
        </section>

        <section>
          <h2 className="font-display text-xl font-bold text-[#101114] dark:text-white mb-3">
            3. Community Relay Mutual Privacy
          </h2>
          <p>
            In Community Relay mode, senders and travel partners do not need to share private residential addresses. MOVEX Intelligence recommends safe public transit hubs (bus stands, railway stations, prominent landmarks) to preserve mutual residential privacy.
          </p>
        </section>

        <section>
          <h2 className="font-display text-xl font-bold text-[#101114] dark:text-white mb-3">
            4. Simulated Environment &amp; Payment Security
          </h2>
          <p>
            As a prototype platform, all payment transactions, UPI IDs, and bank settlement transfers are simulated INR ledger events. No real credit card or debit card numbers are processed or retained on our database servers.
          </p>
        </section>

        <section>
          <h2 className="font-display text-xl font-bold text-[#101114] dark:text-white mb-3">
            5. Your Data Rights &amp; Retention
          </h2>
          <p>
            You may request deletion or export of your parcel history and profile records at any time by contacting our dispatch team at <a href="mailto:support@movex.app" className="underline text-[#101114] dark:text-[#FFD43B]">support@movex.app</a>.
          </p>
        </section>
      </div>

      <div className="mt-12 pt-6 border-t border-neutral-200 dark:border-neutral-800 flex items-center justify-between">
        <Link to="/terms" className="text-xs font-bold text-[#101114] dark:text-[#FFD43B] hover:underline">
          View Terms &amp; Conditions →
        </Link>
        <Link to="/" className="text-xs font-semibold text-[#777777] dark:text-neutral-400 hover:underline">
          Return to MOVEX Home
        </Link>
      </div>
    </div>
  );
}
