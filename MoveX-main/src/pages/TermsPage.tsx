import { Link } from 'react-router-dom';
import { FileText, AlertTriangle, CheckCircle2 } from 'lucide-react';
import { usePageMeta } from '../hooks/usePageMeta';

export default function TermsPage() {
  usePageMeta({
    title: 'Terms & Conditions',
    description: 'Operating guidelines, Community Relay rules, and user agreement for MOVEX.',
  });

  return (
    <div id="main-content" className="mx-auto max-w-4xl px-4 py-12 sm:px-6">
      <div className="border-b border-neutral-200 dark:border-neutral-800 pb-6 mb-8">
        <div className="flex items-center gap-2 text-xs font-bold text-[#FFD43B] dark:text-[#FFD43B] uppercase tracking-wider mb-2">
          <FileText className="h-4 w-4" />
          <span>User Agreement</span>
        </div>
        <h1 className="font-display text-3xl sm:text-4xl font-extrabold text-[#101114] dark:text-white">
          Terms &amp; Conditions
        </h1>
        <p className="mt-2 text-sm text-[#777777] dark:text-neutral-400">
          Last Updated: <strong className="text-[#101114] dark:text-neutral-200">November 14, 2026</strong>
        </p>
      </div>

      <div className="space-y-8 text-sm leading-relaxed text-[#101114] dark:text-neutral-300">
        <section>
          <h2 className="font-display text-xl font-bold text-[#101114] dark:text-white mb-3">
            1. Acceptance of Terms
          </h2>
          <p>
            By accessing or using the MOVEX platform, web portal, or mobile client, you agree to be bound by these Terms and Conditions. If you do not agree to these terms, do not create an account or book deliveries.
          </p>
        </section>

        <section>
          <h2 className="font-display text-xl font-bold text-[#101114] dark:text-white mb-3">
            2. Community Relay Foundation Rules
          </h2>
          <p>
            Community Relay operates on existing journeys. Delivery partners acknowledge that they are already intending to travel between the origin and destination corridors. Under no circumstances should partners initiate dedicated journeys exclusively for Community Relay compensation unless opted into the Premium Express program.
          </p>
        </section>

        <section>
          <h2 className="font-display text-xl font-bold text-[#101114] dark:text-white mb-3">
            3. MOVEX Guard &amp; Prohibited Declarations
          </h2>
          <p>
            Senders are strictly prohibited from booking hazardous, flammable, narcotic, illicit, or explosive substances. Violations are automatically flagged by MOVEX Guard intelligence, resulting in immediate account suspension and notification of appropriate civil authorities.
          </p>
        </section>

        <section>
          <h2 className="font-display text-xl font-bold text-[#101114] dark:text-white mb-3">
            4. Verified OTP Custody Protocol
          </h2>
          <p>
            Legal custody of a parcel transfers solely upon submission of the corresponding one-time password:
          </p>
          <ul className="list-disc pl-5 mt-2 space-y-1 text-[#777777] dark:text-neutral-400">
            <li><strong>Pickup OTP:</strong> Confirms transfer from Sender to Partner.</li>
            <li><strong>Handover OTP:</strong> Confirms transfer between multi-modal transit partners.</li>
            <li><strong>Delivery OTP:</strong> Confirms successful handover to the recipient and releases partner compensation.</li>
          </ul>
        </section>

        <section>
          <h2 className="font-display text-xl font-bold text-[#101114] dark:text-white mb-3">
            5. Dispute Resolution &amp; Escrow
          </h2>
          <p>
            In the event of lost, delayed, or damaged items, either party may file a dispute through the parcel tracking interface. Upon dispute creation, partner earnings are placed on administrative hold until our review team concludes the inquiry.
          </p>
        </section>
      </div>

      <div className="mt-12 pt-6 border-t border-neutral-200 dark:border-neutral-800 flex items-center justify-between">
        <Link to="/privacy" className="text-xs font-bold text-[#101114] dark:text-[#FFD43B] hover:underline">
          View Privacy Policy →
        </Link>
        <Link to="/" className="text-xs font-semibold text-[#777777] dark:text-neutral-400 hover:underline">
          Return to MOVEX Home
        </Link>
      </div>
    </div>
  );
}
