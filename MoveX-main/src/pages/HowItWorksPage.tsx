import { Link } from 'react-router-dom';
import { ArrowRight, CheckCircle2, MapPin, ShieldCheck, Smartphone, Users } from 'lucide-react';
import FaqAccordion from '../components/FaqAccordion';
import { usePageMeta } from '../hooks/usePageMeta';

const HOW_IT_WORKS_FAQS = [
  {
    id: '1',
    question: 'How does Community Relay differ from traditional courier services?',
    answer: 'Traditional couriers run dedicated trucks, sort packages in centralized regional hubs, and create separate delivery trips. Community Relay utilizes individuals already traveling between those cities or transit hubs, eliminating dedicated journeys and reducing transportation costs.'
  },
  {
    id: '2',
    question: 'Do I need special tamper-evident boxes or proprietary MOVEX packaging?',
    answer: 'No. MOVEX is designed for everyday accessibility. You can send items in normal cardboard boxes, envelopes, cloth bags, or wrapped packages. You simply declare the contents honestly during the 6-step booking flow.'
  },
  {
    id: '3',
    question: 'How do meeting points work for Community Relay parcels?',
    answer: 'When matching a parcel with a traveler, MOVEX Intelligence suggests safe, well-lit public transit points (such as bus stations, metro gates, or recognizable public landmarks). Both the sender and traveler mutually confirm and agree upon the exact handover spot.'
  },
  {
    id: '4',
    question: 'How is parcel custody secured during transit?',
    answer: 'Custody is enforced via three timestamped one-time passwords: Pickup OTP (shared from sender to partner), Handover OTP (for multi-modal relay between travelers), and Delivery OTP (given by the recipient upon final inspection).'
  }
];

export default function HowItWorksPage() {
  usePageMeta({
    title: 'How It Works — Multi-Modal Community Parcel Relay',
    description: 'Learn how MOVEX matches existing travel journeys with parcel delivery across bike, car, bus, train, and flight.',
  });

  return (
    <main id="main-content" className="mx-auto max-w-6xl px-4 py-10 sm:px-6">
      <div className="max-w-3xl">
        <p className="text-xs font-bold tracking-widest text-[#777777] dark:text-neutral-400 uppercase">
          Operating Model &amp; Architecture
        </p>
        <h1 className="font-display text-3xl font-extrabold text-[#101114] dark:text-white sm:text-4xl mt-2">
          How MOVEX Works
        </h1>
        <p className="mt-3 text-base text-[#777777] dark:text-neutral-400 leading-relaxed">
          MOVEX connects senders with verified travellers and multi-modal transport partners using existing journeys, smart meeting points, and OTP-authenticated handovers.
        </p>
      </div>

      <div className="mt-10 grid grid-cols-1 gap-6 sm:grid-cols-2 md:grid-cols-4">
        <div className="rounded-2xl border border-neutral-200 dark:border-neutral-800 bg-[#F5F5F5] dark:bg-[#181a1f] p-5 transition-colors">
          <div className="flex h-10 w-10 items-center justify-center rounded-xl bg-[#FFD43B] font-display text-base font-extrabold text-[#101114]">
            01
          </div>
          <h2 className="font-display mt-4 text-base font-bold text-[#101114] dark:text-white">Set Route &amp; Model</h2>
          <p className="mt-1.5 text-xs leading-relaxed text-[#777777] dark:text-neutral-400">
            Choose pickup and destination on the interactive OpenStreetMap. Pick affordable Community Relay or doorstep Premium Express.
          </p>
        </div>

        <div className="rounded-2xl border border-neutral-200 dark:border-neutral-800 bg-[#F5F5F5] dark:bg-[#181a1f] p-5 transition-colors">
          <div className="flex h-10 w-10 items-center justify-center rounded-xl bg-[#FFD43B] font-display text-base font-extrabold text-[#101114]">
            02
          </div>
          <h2 className="font-display mt-4 text-base font-bold text-[#101114] dark:text-white">Mode &amp; Declaration</h2>
          <p className="mt-1.5 text-xs leading-relaxed text-[#777777] dark:text-neutral-400">
            Compare live backend pricing across Bike, Car, Bus, Train, Flight, and Commercial Freight. Declare contents honestly—no special seals needed.
          </p>
        </div>

        <div className="rounded-2xl border border-neutral-200 dark:border-neutral-800 bg-[#F5F5F5] dark:bg-[#181a1f] p-5 transition-colors">
          <div className="flex h-10 w-10 items-center justify-center rounded-xl bg-[#FFD43B] font-display text-base font-extrabold text-[#101114]">
            03
          </div>
          <h2 className="font-display mt-4 text-base font-bold text-[#101114] dark:text-white">AI Route Match</h2>
          <p className="mt-1.5 text-xs leading-relaxed text-[#777777] dark:text-neutral-400">
            MOVEX Intelligence scores existing journeys out of 100 and suggests safe public meeting hubs where both parties agree to meet.
          </p>
        </div>

        <div className="rounded-2xl border border-neutral-200 dark:border-neutral-800 bg-[#F5F5F5] dark:bg-[#181a1f] p-5 transition-colors">
          <div className="flex h-10 w-10 items-center justify-center rounded-xl bg-[#FFD43B] font-display text-base font-extrabold text-[#101114]">
            04
          </div>
          <h2 className="font-display mt-4 text-base font-bold text-[#101114] dark:text-white">OTP Custody &amp; Track</h2>
          <p className="mt-1.5 text-xs leading-relaxed text-[#777777] dark:text-neutral-400">
            Every parcel receives a Digital QR Identity plus Pickup, Handover, and Recipient Delivery OTPs for verified end-to-end custody.
          </p>
        </div>
      </div>

      <div className="mt-10 grid grid-cols-1 gap-6 md:grid-cols-2">
        <div className="rounded-3xl border border-neutral-200 dark:border-neutral-800 bg-white dark:bg-[#181a1f] p-6 transition-colors">
          <div className="flex items-center gap-3">
            <Users className="h-6 w-6 text-[#101114] dark:text-[#FFD43B]" />
            <h2 className="font-display text-xl font-bold text-[#101114] dark:text-white">Community Relay Rules</h2>
          </div>
          <ul className="mt-4 space-y-2.5 text-sm text-[#777777] dark:text-neutral-300">
            <li className="flex items-start gap-2">
              <CheckCircle2 className="mt-0.5 h-4 w-4 shrink-0 text-[#101114] dark:text-[#FFD43B]" />
              <span>Uses existing journeys only—partners must confirm they are already travelling on the route.</span>
            </li>
            <li className="flex items-start gap-2">
              <CheckCircle2 className="mt-0.5 h-4 w-4 shrink-0 text-[#101114] dark:text-[#FFD43B]" />
              <span>No dedicated journey is ever created solely for a Community Relay parcel.</span>
            </li>
            <li className="flex items-start gap-2">
              <CheckCircle2 className="mt-0.5 h-4 w-4 shrink-0 text-[#101114] dark:text-[#FFD43B]" />
              <span>AI suggests public transit stands &amp; landmarks so sender and partner mutually agree on handoff points.</span>
            </li>
          </ul>
        </div>

        <div className="rounded-3xl border border-neutral-200 dark:border-neutral-800 bg-white dark:bg-[#181a1f] p-6 transition-colors">
          <div className="flex items-center gap-3">
            <Smartphone className="h-6 w-6 text-[#101114] dark:text-[#FFD43B]" />
            <h2 className="font-display text-xl font-bold text-[#101114] dark:text-white">Simulated vs Live Scope</h2>
          </div>
          <ul className="mt-4 space-y-2.5 text-sm text-[#777777] dark:text-neutral-300">
            <li className="flex items-start gap-2">
              <MapPin className="mt-0.5 h-4 w-4 shrink-0 text-[#101114] dark:text-[#FFD43B]" />
              <span>OpenStreetMap Nominatim &amp; OSRM provide real geocoding and route geometry; GPS progress updates are clearly marked as simulated prototype feeds.</span>
            </li>
            <li className="flex items-start gap-2">
              <ShieldCheck className="mt-0.5 h-4 w-4 shrink-0 text-[#101114] dark:text-[#FFD43B]" />
              <span>Bus, Train, Flight, and Commercial Freight carrier dispatches are clearly labeled as simulated operator workflows.</span>
            </li>
            <li className="flex items-start gap-2">
              <CheckCircle2 className="mt-0.5 h-4 w-4 shrink-0 text-[#101114] dark:text-[#FFD43B]" />
              <span>Payments and partner payouts are simulated INR ledger transactions for prototype demonstration.</span>
            </li>
          </ul>
        </div>
      </div>

      {/* Feature 22: Expandable FAQs */}
      <div className="mt-12 border-t border-neutral-200 dark:border-neutral-800 pt-8">
        <FaqAccordion items={HOW_IT_WORKS_FAQS} />
      </div>

      <div className="mt-10 flex flex-wrap gap-3">
        <Link
          to="/sender?tab=book"
          className="inline-flex h-12 items-center gap-2 rounded-xl bg-[#FFD43B] px-6 text-sm font-bold text-[#101114] hover:bg-[#F5C419] transition-all hover:scale-[1.02] shadow-sm"
        >
          <span>Send a Parcel</span>
          <ArrowRight className="h-4 w-4" />
        </Link>
        <Link
          to="/partner"
          className="inline-flex h-12 items-center gap-2 rounded-xl bg-[#101114] dark:bg-white px-6 text-sm font-semibold text-white dark:text-[#101114] hover:bg-[#25282D] dark:hover:bg-neutral-200 transition-colors"
        >
          <span>Deliver a Parcel</span>
        </Link>
      </div>
    </main>
  );
}
