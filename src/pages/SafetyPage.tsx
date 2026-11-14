import { AlertTriangle, CheckCircle2, Lock, PackageCheck, ShieldAlert, ShieldCheck } from 'lucide-react';
import FaqAccordion from '../components/FaqAccordion';
import { usePageMeta } from '../hooks/usePageMeta';

const SAFETY_FAQS = [
  {
    id: 's1',
    question: 'How does MOVEX Guard screen parcels without opening packages?',
    answer: 'MOVEX Guard evaluates the sender\'s declared contents, items category, weight-to-dimension ratio, declared valuation, and transport mode rules. For instance, lithium batteries on air routes or chemicals are flagged for operator restriction without invading personal parcel privacy.'
  },
  {
    id: 's2',
    question: 'What happens if a parcel is classified as RESTRICTED?',
    answer: 'Restricted parcels (such as high-value electronics above ₹25,000 or fragile items) require brief manual confirmation by a MOVEX dispatcher before a traveler can accept the journey handover.'
  },
  {
    id: 's3',
    question: 'What if a package is damaged or delayed during transit?',
    answer: 'Either the sender or receiver can trigger the "Raise Dispute" button directly from the live tracking screen. This immediately freezes the partner payout into escrow until operations reviews the handover logs.'
  }
];

export default function SafetyPage() {
  usePageMeta({
    title: 'Safety, Screening & MOVEX Guard',
    description: 'Learn how MOVEX protects parcel integrity with AI classification, OTP custody handovers, and normal packaging support.',
  });

  return (
    <main id="main-content" className="mx-auto max-w-6xl px-4 py-10 sm:px-6">
      <div className="max-w-3xl">
        <p className="text-xs font-bold tracking-widest text-[#777777] dark:text-neutral-400 uppercase">
          Custody &amp; Risk Protection
        </p>
        <h1 className="font-display text-3xl font-extrabold text-[#101114] dark:text-white sm:text-4xl mt-2">
          MOVEX Guard &amp; Parcel Safety
        </h1>
        <p className="mt-3 text-base text-[#777777] dark:text-neutral-400 leading-relaxed">
          Every parcel passes through transparent declaration screening, mode-specific operator checks, and OTP-verified handovers—without requiring special seals, branded boxes, or inspection centres.
        </p>
        <p className="mt-2 text-xs text-[#777777] dark:text-neutral-400">
          Last Updated: <strong className="text-[#101114] dark:text-neutral-200">November 14, 2026</strong>
        </p>
      </div>

      <div className="mt-8 grid grid-cols-1 gap-5 md:grid-cols-3">
        <div className="rounded-2xl border border-neutral-200 dark:border-neutral-800 bg-white dark:bg-[#181a1f] p-6 transition-colors">
          <div className="flex items-center gap-2.5 text-emerald-700 dark:text-emerald-400">
            <CheckCircle2 className="h-5 w-5" />
            <h2 className="font-display text-lg font-bold text-[#101114] dark:text-white">PERMITTED</h2>
          </div>
          <p className="mt-2 text-sm text-[#777777] dark:text-neutral-400 leading-relaxed">
            Ordinary documents, books, apparel, packaged dry food, gifts, and household goods under 15 kg. Cleared immediately after sender declaration.
          </p>
        </div>

        <div className="rounded-2xl border border-neutral-200 dark:border-neutral-800 bg-white dark:bg-[#181a1f] p-6 transition-colors">
          <div className="flex items-center gap-2.5 text-amber-700 dark:text-amber-400">
            <AlertTriangle className="h-5 w-5" />
            <h2 className="font-display text-lg font-bold text-[#101114] dark:text-white">RESTRICTED</h2>
          </div>
          <p className="mt-2 text-sm text-[#777777] dark:text-neutral-400 leading-relaxed">
            High-value electronics (&gt;₹25,000), lithium batteries on air routes, fragile glass, or liquids. Routed to MOVEX Guard manual admin verification.
          </p>
        </div>

        <div className="rounded-2xl border border-neutral-200 dark:border-neutral-800 bg-white dark:bg-[#181a1f] p-6 transition-colors">
          <div className="flex items-center gap-2.5 text-red-700 dark:text-red-400">
            <ShieldAlert className="h-5 w-5" />
            <h2 className="font-display text-lg font-bold text-[#101114] dark:text-white">PROHIBITED</h2>
          </div>
          <p className="mt-2 text-sm text-[#777777] dark:text-neutral-400 leading-relaxed">
            Explosives, weapons, narcotics, flammable fuels, corrosive chemicals, and items forbidden by law or transport operators. Blocked automatically.
          </p>
        </div>
      </div>

      <div className="mt-8 grid grid-cols-1 gap-6 md:grid-cols-2">
        <div className="rounded-3xl border border-neutral-200 dark:border-neutral-800 bg-[#F5F5F5] dark:bg-[#181a1f] p-6 transition-colors">
          <div className="flex items-center gap-2.5">
            <PackageCheck className="h-5 w-5 text-[#101114] dark:text-[#FFD43B]" />
            <h3 className="font-display text-lg font-bold text-[#101114] dark:text-white">Normal Packaging Supported</h3>
          </div>
          <p className="mt-2 text-sm leading-relaxed text-[#777777] dark:text-neutral-400">
            Senders can use ordinary envelopes, paper wrapping, cloth bags, or standard cardboard boxes. MOVEX never forces proprietary packaging, physical QR stickers, special tamper seals, or mandatory central inspection hubs.
          </p>
        </div>

        <div className="rounded-3xl border border-neutral-200 dark:border-neutral-800 bg-[#F5F5F5] dark:bg-[#181a1f] p-6 transition-colors">
          <div className="flex items-center gap-2.5">
            <ShieldCheck className="h-5 w-5 text-[#101114] dark:text-[#FFD43B]" />
            <h3 className="font-display text-lg font-bold text-[#101114] dark:text-white">Transparent AI &amp; Risk Flags</h3>
          </div>
          <p className="mt-2 text-sm leading-relaxed text-[#777777] dark:text-neutral-400">
            MOVEX Guard analyses declared contents, mode regulations, and unusual booking patterns (such as rapid repeat bookings or prior rejections) for human review. It never claims AI can inspect the contents of an unopened parcel and never accuses users automatically.
          </p>
        </div>
      </div>

      <div className="mt-6 flex items-center gap-3 rounded-2xl border border-neutral-200 dark:border-neutral-800 bg-white dark:bg-[#181a1f] p-5 transition-colors">
        <Lock className="h-5 w-5 shrink-0 text-[#101114] dark:text-[#FFD43B]" />
        <p className="text-sm text-[#777777] dark:text-neutral-400">
          Every active delivery uses three distinct OTPs—<strong className="text-[#101114] dark:text-white">Pickup OTP</strong>, <strong className="text-[#101114] dark:text-white">Relay Handover OTP</strong>, and <strong className="text-[#101114] dark:text-white">Recipient Delivery OTP</strong>—recorded in a timestamped custody ledger.
        </p>
      </div>

      {/* Feature 22: Expandable FAQs */}
      <div className="mt-12 border-t border-neutral-200 dark:border-neutral-800 pt-8">
        <FaqAccordion items={SAFETY_FAQS} title="Safety & Screening Questions" subtitle="Details on non-invasive AI screening and dispute escrow protections." />
      </div>
    </main>
  );
}
