import React, { useState, useEffect } from 'react';
import { ShieldCheck, Cookie, Settings } from 'lucide-react';

export interface CookiePreferences {
  essential: boolean;
  analytics: boolean;
  marketing: boolean;
}

const STORAGE_KEY = 'movex_cookie_consent';

export default function CookieConsent() {
  const [visible, setVisible] = useState(false);
  const [showPreferences, setShowPreferences] = useState(false);
  const [analytics, setAnalytics] = useState(true);
  const [marketing, setMarketing] = useState(false);

  useEffect(() => {
    const saved = localStorage.getItem(STORAGE_KEY);
    if (!saved) {
      // Show banner after short delay for smooth page entrance
      const timer = setTimeout(() => setVisible(true), 800);
      return () => clearTimeout(timer);
    }
  }, []);

  const savePreferences = (prefs: CookiePreferences) => {
    localStorage.setItem(STORAGE_KEY, JSON.stringify(prefs));
    setVisible(false);

    // Trigger synthetic event so analytics listener can initialize if allowed
    window.dispatchEvent(new CustomEvent('cookie_consent_updated', { detail: prefs }));
  };

  const handleAcceptAll = () => {
    savePreferences({ essential: true, analytics: true, marketing: true });
  };

  const handleRejectNonEssential = () => {
    savePreferences({ essential: true, analytics: false, marketing: false });
  };

  const handleSaveCustom = () => {
    savePreferences({ essential: true, analytics, marketing });
  };

  if (!visible) return null;

  return (
    <div
      role="region"
      aria-label="Cookie consent banner"
      className="fixed bottom-4 left-4 right-4 sm:left-auto sm:right-6 sm:max-w-md z-50 rounded-3xl border border-neutral-200 dark:border-neutral-800 bg-white dark:bg-[#181a1f] p-5 shadow-2xl animate-in slide-in-from-bottom-5 duration-300"
    >
      <div className="flex items-start gap-3">
        <div className="flex h-10 w-10 shrink-0 items-center justify-center rounded-2xl bg-[#FFD43B] text-[#101114]">
          <Cookie className="h-5 w-5" />
        </div>
        <div className="flex-1">
          <h4 className="font-display text-sm font-bold text-[#101114] dark:text-white">
            Your Privacy on MOVEX
          </h4>
          <p className="mt-1 text-xs text-[#777777] dark:text-neutral-400 leading-relaxed">
            We use essential cookies to maintain your login session and OTP handovers, plus optional telemetry to improve routing accuracy.
          </p>
        </div>
      </div>

      {showPreferences && (
        <div className="mt-4 pt-4 border-t border-neutral-100 dark:border-neutral-800 space-y-3 text-xs">
          <div className="flex items-center justify-between">
            <div>
              <span className="font-bold text-[#101114] dark:text-white">Essential Cookies</span>
              <p className="text-[10px] text-[#777777] dark:text-neutral-400">Required for authentication &amp; route verification</p>
            </div>
            <span className="text-[10px] font-bold text-emerald-600 dark:text-emerald-400 bg-emerald-50 dark:bg-emerald-950/40 px-2 py-0.5 rounded-md">Always Active</span>
          </div>

          <div className="flex items-center justify-between">
            <div>
              <span className="font-bold text-[#101114] dark:text-white">Analytics Cookies</span>
              <p className="text-[10px] text-[#777777] dark:text-neutral-400">Helps us evaluate corridor speeds and ETA accuracy</p>
            </div>
            <input
              type="checkbox"
              checked={analytics}
              onChange={(e) => setAnalytics(e.target.checked)}
              className="h-4 w-4 rounded border-neutral-300 accent-[#FFD43B]"
            />
          </div>

          <div className="flex items-center justify-between">
            <div>
              <span className="font-bold text-[#101114] dark:text-white">Marketing Cookies</span>
              <p className="text-[10px] text-[#777777] dark:text-neutral-400">Corridor announcements &amp; partner invitations</p>
            </div>
            <input
              type="checkbox"
              checked={marketing}
              onChange={(e) => setMarketing(e.target.checked)}
              className="h-4 w-4 rounded border-neutral-300 accent-[#FFD43B]"
            />
          </div>
        </div>
      )}

      <div className="mt-4 flex flex-wrap items-center gap-2">
        {showPreferences ? (
          <button
            type="button"
            onClick={handleSaveCustom}
            className="flex-1 h-9 rounded-xl bg-[#101114] dark:bg-[#FFD43B] text-xs font-bold text-white dark:text-[#101114] hover:bg-[#25282D] transition-colors"
          >
            Save Preferences
          </button>
        ) : (
          <>
            <button
              type="button"
              onClick={handleAcceptAll}
              className="flex-1 h-9 rounded-xl bg-[#FFD43B] text-xs font-bold text-[#101114] hover:bg-[#F5C419] transition-colors"
            >
              Accept All
            </button>
            <button
              type="button"
              onClick={handleRejectNonEssential}
              className="h-9 rounded-xl border border-neutral-200 dark:border-neutral-700 bg-transparent px-3 text-xs font-semibold text-[#101114] dark:text-neutral-300 hover:bg-neutral-50 dark:hover:bg-neutral-800 transition-colors"
            >
              Essential Only
            </button>
          </>
        )}
        <button
          type="button"
          onClick={() => setShowPreferences((p) => !p)}
          className="p-2 text-neutral-400 hover:text-neutral-600 dark:hover:text-neutral-200"
          title="Customize Cookies"
        >
          <Settings className="h-4 w-4" />
        </button>
      </div>
    </div>
  );
}
