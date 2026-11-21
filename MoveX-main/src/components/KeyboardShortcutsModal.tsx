import { X, Keyboard } from 'lucide-react';

interface KeyboardShortcutsModalProps {
  isOpen: boolean;
  onClose: () => void;
}

export default function KeyboardShortcutsModal({ isOpen, onClose }: KeyboardShortcutsModalProps) {
  if (!isOpen) return null;

  const shortcuts = [
    { key: '⌘ K / Ctrl K', desc: 'Open global search palette' },
    { key: '?', desc: 'Show this keyboard shortcuts guide' },
    { key: 'Esc', desc: 'Close modals or active search' },
    { key: 'T', desc: 'Jump to Parcel Tracking' },
    { key: 'H', desc: 'Return to Homepage' },
  ];

  return (
    <div
      role="dialog"
      aria-modal="true"
      aria-label="Keyboard Shortcuts"
      className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/60 backdrop-blur-xs animate-in fade-in duration-150"
      onClick={onClose}
    >
      <div
        className="w-full max-w-md rounded-3xl border border-neutral-200 dark:border-neutral-800 bg-white dark:bg-[#181a1f] p-6 shadow-2xl text-left"
        onClick={(e) => e.stopPropagation()}
      >
        <div className="flex items-center justify-between pb-3 border-b border-neutral-100 dark:border-neutral-800">
          <div className="flex items-center gap-2.5">
            <div className="flex h-9 w-9 items-center justify-center rounded-xl bg-[#FFD43B] text-[#101114]">
              <Keyboard className="h-5 w-5" />
            </div>
            <div>
              <h3 className="font-display text-base font-bold text-[#101114] dark:text-white">
                Keyboard Shortcuts
              </h3>
              <p className="text-xs text-[#777777] dark:text-neutral-400">Power user navigation</p>
            </div>
          </div>
          <button
            type="button"
            onClick={onClose}
            className="text-neutral-400 hover:text-neutral-600 dark:hover:text-neutral-200 p-1"
          >
            <X className="h-5 w-5" />
          </button>
        </div>

        <div className="mt-4 space-y-2.5">
          {shortcuts.map((s) => (
            <div
              key={s.key}
              className="flex items-center justify-between py-2 border-b border-neutral-100 dark:border-neutral-800/60 last:border-0"
            >
              <span className="text-xs text-[#101114] dark:text-neutral-300 font-medium">
                {s.desc}
              </span>
              <kbd className="px-2 py-1 rounded-lg bg-[#F5F5F5] dark:bg-[#25282D] border border-neutral-200 dark:border-neutral-700 font-mono text-xs font-bold text-[#101114] dark:text-[#FFD43B]">
                {s.key}
              </kbd>
            </div>
          ))}
        </div>
      </div>
    </div>
  );
}
