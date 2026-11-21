import { useState, useEffect } from 'react';
import { MessageSquare, X, Send, Phone, Mail, HelpCircle } from 'lucide-react';
import { useToast } from '../context/ToastContext';

export default function FloatingContact() {
  const [isOpen, setIsOpen] = useState(false);
  const [name, setName] = useState('');
  const [email, setEmail] = useState('');
  const [message, setMessage] = useState('');
  const [sent, setSent] = useState(false);
  const { success } = useToast();

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    setSent(true);
    success('Support request submitted! We will respond shortly.', 'Support Ticket');
    setTimeout(() => {
      setIsOpen(false);
      setSent(false);
      setName('');
      setEmail('');
      setMessage('');
    }, 2000);
  };

  return (
    <>
      {/* Floating Action Pill */}
      <div className="fixed bottom-6 left-6 z-40">
        <button
          type="button"
          onClick={() => setIsOpen((prev) => !prev)}
          aria-expanded={isOpen}
          aria-label="Contact MOVEX Support"
          className="flex items-center gap-2.5 rounded-full bg-[#101114] dark:bg-white text-white dark:text-[#101114] px-4 py-2.5 shadow-xl hover:bg-[#25282D] dark:hover:bg-neutral-200 transition-all hover:scale-105 active:scale-95"
        >
          {isOpen ? (
            <X className="h-5 w-5" />
          ) : (
            <MessageSquare className="h-5 w-5 text-[#FFD43B] dark:text-[#101114]" />
          )}
          <span className="text-xs font-bold font-display hidden sm:inline">
            {isOpen ? 'Close' : 'Support & Help'}
          </span>
        </button>
      </div>

      {/* Contact Drawer / Modal */}
      {isOpen && (
        <div
          role="dialog"
          aria-label="Contact Support"
          className="fixed bottom-20 left-6 z-40 w-80 sm:w-96 rounded-3xl border border-neutral-200 dark:border-neutral-800 bg-white dark:bg-[#181a1f] p-5 shadow-2xl animate-in slide-in-from-bottom-5 duration-200"
        >
          <div className="flex items-center justify-between pb-3 border-b border-neutral-100 dark:border-neutral-800">
            <div className="flex items-center gap-2">
              <div className="flex h-8 w-8 items-center justify-center rounded-xl bg-[#FFD43B] text-[#101114]">
                <HelpCircle className="h-4 w-4" />
              </div>
              <div>
                <h4 className="font-display text-sm font-bold text-[#101114] dark:text-white">
                  MOVEX Dispatch Desk
                </h4>
                <p className="text-[10px] text-[#777777] dark:text-neutral-400">
                  Quick help for active routes &amp; handovers
                </p>
              </div>
            </div>
            <button
              type="button"
              onClick={() => setIsOpen(false)}
              className="text-neutral-400 hover:text-neutral-600 dark:hover:text-neutral-200"
            >
              <X className="h-4 w-4" />
            </button>
          </div>

          <div className="mt-3 grid grid-cols-2 gap-2 text-[11px]">
            <div className="flex items-center gap-1.5 p-2 rounded-xl bg-[#F5F5F5] dark:bg-[#25282D] text-[#777777] dark:text-neutral-300">
              <Phone className="h-3.5 w-3.5 text-[#101114] dark:text-[#FFD43B]" />
              <span className="font-mono-num font-semibold">1800-MOVEX-GOA</span>
            </div>
            <div className="flex items-center gap-1.5 p-2 rounded-xl bg-[#F5F5F5] dark:bg-[#25282D] text-[#777777] dark:text-neutral-300">
              <Mail className="h-3.5 w-3.5 text-[#101114] dark:text-[#FFD43B]" />
              <span className="truncate">support@movex.app</span>
            </div>
          </div>

          {sent ? (
            <div className="py-8 text-center space-y-2">
              <div className="inline-flex h-10 w-10 items-center justify-center rounded-full bg-emerald-100 text-emerald-600 dark:bg-emerald-950/40 dark:text-emerald-400">
                <Send className="h-5 w-5" />
              </div>
              <p className="text-sm font-bold text-[#101114] dark:text-white">Request Dispatched!</p>
              <p className="text-xs text-[#777777] dark:text-neutral-400">Our operations team is on it.</p>
            </div>
          ) : (
            <form onSubmit={handleSubmit} className="mt-4 space-y-3">
              <div>
                <label className="block text-[11px] font-semibold text-[#101114] dark:text-neutral-300 mb-1">
                  Name
                </label>
                <input
                  type="text"
                  required
                  value={name}
                  onChange={(e) => setName(e.target.value)}
                  placeholder="Your Name"
                  className="h-9 w-full rounded-xl border border-neutral-200 dark:border-neutral-700 bg-[#F5F5F5] dark:bg-[#25282D] px-3 text-xs text-[#101114] dark:text-white focus:outline-none focus:border-[#101114] dark:focus:border-[#FFD43B]"
                />
              </div>

              <div>
                <label className="block text-[11px] font-semibold text-[#101114] dark:text-neutral-300 mb-1">
                  Email or Parcel ID
                </label>
                <input
                  type="text"
                  required
                  value={email}
                  onChange={(e) => setEmail(e.target.value)}
                  placeholder="you@email.com or MVX-2026-..."
                  className="h-9 w-full rounded-xl border border-neutral-200 dark:border-neutral-700 bg-[#F5F5F5] dark:bg-[#25282D] px-3 text-xs text-[#101114] dark:text-white focus:outline-none focus:border-[#101114] dark:focus:border-[#FFD43B]"
                />
              </div>

              <div>
                <label className="block text-[11px] font-semibold text-[#101114] dark:text-neutral-300 mb-1">
                  Message
                </label>
                <textarea
                  required
                  rows={2}
                  value={message}
                  onChange={(e) => setMessage(e.target.value)}
                  placeholder="Need help with handover, meeting point, or dispute?"
                  className="w-full rounded-xl border border-neutral-200 dark:border-neutral-700 bg-[#F5F5F5] dark:bg-[#25282D] p-2.5 text-xs text-[#101114] dark:text-white focus:outline-none focus:border-[#101114] dark:focus:border-[#FFD43B]"
                />
              </div>

              <button
                type="submit"
                className="w-full h-10 rounded-xl bg-[#FFD43B] text-[#101114] text-xs font-bold hover:bg-[#F5C419] transition-colors flex items-center justify-center gap-1.5 shadow-sm"
              >
                <Send className="h-3.5 w-3.5" />
                <span>Send to Dispatch Desk</span>
              </button>
            </form>
          )}
        </div>
      )}
    </>
  );
}
