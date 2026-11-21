import { useState } from 'react';
import { ChevronDown } from 'lucide-react';

export interface FaqItem {
  id: string;
  question: string;
  answer: string;
  category?: string;
}

interface FaqAccordionProps {
  items: FaqItem[];
  title?: string;
  subtitle?: string;
}

export default function FaqAccordion({
  items,
  title = 'Frequently Asked Questions',
  subtitle = 'Everything you need to know about Community Relay, multi-modal transport, and parcel safety.',
}: FaqAccordionProps) {
  const [openIds, setOpenIds] = useState<string[]>([items[0]?.id || '']);

  const toggle = (id: string) => {
    setOpenIds((prev) =>
      prev.includes(id) ? prev.filter((item) => item !== id) : [...prev, id]
    );
  };

  return (
    <section className="py-10">
      <div className="mx-auto max-w-4xl px-4 sm:px-6">
        {title && (
          <div className="text-center mb-8">
            <h2 className="font-display text-2xl sm:text-3xl font-extrabold text-[#101114] dark:text-white">
              {title}
            </h2>
            {subtitle && (
              <p className="mt-2 text-sm sm:text-base text-[#777777] dark:text-neutral-400">
                {subtitle}
              </p>
            )}
          </div>
        )}

        <div className="space-y-3">
          {items.map((item) => {
            const isOpen = openIds.includes(item.id);
            return (
              <div
                key={item.id}
                className="rounded-2xl border border-neutral-200 dark:border-neutral-800 bg-white dark:bg-[#181a1f] overflow-hidden transition-colors"
              >
                <button
                  type="button"
                  onClick={() => toggle(item.id)}
                  aria-expanded={isOpen}
                  className="flex w-full items-center justify-between p-5 text-left transition-colors hover:bg-neutral-50 dark:hover:bg-[#1f2227]"
                >
                  <span className="font-display text-base font-bold text-[#101114] dark:text-neutral-100 pr-4">
                    {item.question}
                  </span>
                  <ChevronDown
                    className={`h-5 w-5 shrink-0 text-[#777777] dark:text-neutral-400 transition-transform duration-200 ${
                      isOpen ? 'rotate-180 text-[#101114] dark:text-[#FFD43B]' : ''
                    }`}
                  />
                </button>

                {isOpen && (
                  <div className="px-5 pb-5 pt-1 text-sm leading-relaxed text-[#777777] dark:text-neutral-300 border-t border-neutral-100 dark:border-neutral-800/60">
                    <p>{item.answer}</p>
                  </div>
                )}
              </div>
            );
          })}
        </div>
      </div>
    </section>
  );
}
