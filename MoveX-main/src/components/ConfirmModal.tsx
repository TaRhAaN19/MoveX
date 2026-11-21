import React from 'react';
import { AlertTriangle, X } from 'lucide-react';

interface ConfirmModalProps {
  isOpen: boolean;
  title: string;
  message: string;
  confirmText?: string;
  cancelText?: string;
  isDestructive?: boolean;
  onConfirm: () => void;
  onCancel: () => void;
  isLoading?: boolean;
}

export default function ConfirmModal({
  isOpen,
  title,
  message,
  confirmText = 'Confirm',
  cancelText = 'Cancel',
  isDestructive = false,
  onConfirm,
  onCancel,
  isLoading = false,
}: ConfirmModalProps) {
  if (!isOpen) return null;

  return (
    <div
      role="dialog"
      aria-modal="true"
      className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/60 backdrop-blur-xs animate-in fade-in duration-150"
    >
      <div
        className="w-full max-w-md rounded-3xl border border-neutral-200 dark:border-neutral-800 bg-white dark:bg-[#181a1f] p-6 shadow-2xl text-left"
        onClick={(e) => e.stopPropagation()}
      >
        <div className="flex items-start justify-between">
          <div className="flex items-center gap-3">
            <div
              className={`flex h-10 w-10 shrink-0 items-center justify-center rounded-2xl ${
                isDestructive
                  ? 'bg-red-100 text-red-600 dark:bg-red-950/40 dark:text-red-400'
                  : 'bg-[#FFD43B]/20 text-[#101114] dark:text-[#FFD43B]'
              }`}
            >
              <AlertTriangle className="h-5 w-5" />
            </div>
            <h3 className="font-display text-lg font-bold text-[#101114] dark:text-white">
              {title}
            </h3>
          </div>
          <button
            type="button"
            onClick={onCancel}
            disabled={isLoading}
            className="text-neutral-400 hover:text-neutral-600 dark:hover:text-neutral-200 p-1 rounded-lg"
          >
            <X className="h-5 w-5" />
          </button>
        </div>

        <p className="mt-3 text-sm text-[#777777] dark:text-neutral-400 leading-relaxed">
          {message}
        </p>

        <div className="mt-6 flex items-center justify-end gap-3">
          <button
            type="button"
            onClick={onCancel}
            disabled={isLoading}
            className="h-10 rounded-xl border border-neutral-200 dark:border-neutral-700 bg-white dark:bg-transparent px-4 text-xs font-semibold text-[#101114] dark:text-neutral-200 hover:bg-neutral-50 dark:hover:bg-neutral-800 transition-colors"
          >
            {cancelText}
          </button>
          <button
            type="button"
            onClick={onConfirm}
            disabled={isLoading}
            className={`h-10 rounded-xl px-5 text-xs font-bold transition-all shadow-sm ${
              isDestructive
                ? 'bg-red-600 text-white hover:bg-red-700'
                : 'bg-[#FFD43B] text-[#101114] hover:bg-[#F5C419]'
            } disabled:opacity-60`}
          >
            {isLoading ? 'Processing...' : confirmText}
          </button>
        </div>
      </div>
    </div>
  );
}
