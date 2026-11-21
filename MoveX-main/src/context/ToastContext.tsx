import React, { createContext, useContext, useState, useCallback } from 'react';
import { CheckCircle2, AlertCircle, Info, AlertTriangle, X } from 'lucide-react';

export type ToastType = 'success' | 'error' | 'warning' | 'info';

export interface Toast {
  id: string;
  type: ToastType;
  title?: string;
  message: string;
  duration?: number;
}

interface ToastContextType {
  toasts: Toast[];
  showToast: (type: ToastType, message: string, title?: string, duration?: number) => void;
  dismissToast: (id: string) => void;
  success: (message: string, title?: string) => void;
  error: (message: string, title?: string) => void;
  warning: (message: string, title?: string) => void;
  info: (message: string, title?: string) => void;
}

const ToastContext = createContext<ToastContextType | undefined>(undefined);

export function ToastProvider({ children }: { children: React.ReactNode }) {
  const [toasts, setToasts] = useState<Toast[]>([]);

  const dismissToast = useCallback((id: string) => {
    setToasts((prev) => prev.filter((t) => t.id !== id));
  }, []);

  const showToast = useCallback(
    (type: ToastType, message: string, title?: string, duration = 4000) => {
      const id = Math.random().toString(36).substring(2, 9);
      const newToast: Toast = { id, type, title, message, duration };

      setToasts((prev) => [...prev, newToast]);

      if (duration > 0) {
        setTimeout(() => {
          dismissToast(id);
        }, duration);
      }
    },
    [dismissToast]
  );

  const success = useCallback(
    (message: string, title?: string) => showToast('success', message, title),
    [showToast]
  );
  const error = useCallback(
    (message: string, title?: string) => showToast('error', message, title, 5000),
    [showToast]
  );
  const warning = useCallback(
    (message: string, title?: string) => showToast('warning', message, title),
    [showToast]
  );
  const info = useCallback(
    (message: string, title?: string) => showToast('info', message, title),
    [showToast]
  );

  return (
    <ToastContext.Provider
      value={{ toasts, showToast, dismissToast, success, error, warning, info }}
    >
      {children}
      {/* Toast Notification Container */}
      <div
        aria-live="polite"
        className="fixed bottom-5 right-5 z-50 flex flex-col gap-2 max-w-sm w-full pointer-events-none px-4 sm:px-0"
      >
        {toasts.map((toast) => {
          let bgClass = 'bg-white dark:bg-[#1f2227] border-neutral-200 dark:border-neutral-700 text-[#101114] dark:text-neutral-100';
          let icon = <Info className="h-5 w-5 text-blue-500 shrink-0" />;

          if (toast.type === 'success') {
            icon = <CheckCircle2 className="h-5 w-5 text-emerald-500 shrink-0" />;
          } else if (toast.type === 'error') {
            icon = <AlertCircle className="h-5 w-5 text-red-500 shrink-0" />;
          } else if (toast.type === 'warning') {
            icon = <AlertTriangle className="h-5 w-5 text-[#FFD43B] shrink-0" />;
          }

          return (
            <div
              key={toast.id}
              role="status"
              className={`pointer-events-auto flex items-start gap-3 rounded-2xl border p-4 shadow-lg transition-all animate-in slide-in-from-bottom-3 duration-200 ${bgClass}`}
            >
              <div className="mt-0.5">{icon}</div>
              <div className="flex-1 min-w-0">
                {toast.title && (
                  <p className="text-xs font-bold font-display uppercase tracking-wider mb-0.5 opacity-90">
                    {toast.title}
                  </p>
                )}
                <p className="text-xs font-medium leading-relaxed">{toast.message}</p>
              </div>
              <button
                type="button"
                onClick={() => dismissToast(toast.id)}
                aria-label="Dismiss notification"
                className="text-neutral-400 hover:text-neutral-600 dark:hover:text-neutral-200 transition-colors"
              >
                <X className="h-4 w-4" />
              </button>
            </div>
          );
        })}
      </div>
    </ToastContext.Provider>
  );
}

export function useToast() {
  const context = useContext(ToastContext);
  if (!context) {
    throw new Error('useToast must be used within a ToastProvider');
  }
  return context;
}
