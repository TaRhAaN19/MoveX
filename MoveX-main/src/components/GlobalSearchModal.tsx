import React, { useState, useEffect, useRef } from 'react';
import { useNavigate } from 'react-router-dom';
import { Search, Package, MapPin, Shield, FileText, ArrowRight, CornerDownLeft, X } from 'lucide-react';

interface SearchItem {
  id: string;
  title: string;
  category: 'Pages' | 'Actions' | 'Help' | 'Demo Parcels';
  href: string;
  description: string;
}

const SEARCH_ITEMS: SearchItem[] = [
  { id: '1', title: 'Send a Parcel', category: 'Actions', href: '/sender?tab=book', description: 'Book a parcel delivery via Community Relay or Premium Express' },
  { id: '2', title: 'Deliver a Parcel', category: 'Actions', href: '/partner', description: 'Publish an existing journey to earn money carrying parcels' },
  { id: '3', title: 'Track a Parcel', category: 'Actions', href: '/track', description: 'Look up live status, simulated GPS, and OTP timeline' },
  { id: '4', title: 'Demo Parcel MVX-2026-1001', category: 'Demo Parcels', href: '/track/MVX-2026-1001', description: 'Panaji to Margao live transit example' },
  { id: '5', title: 'Demo Parcel MVX-2026-1002', category: 'Demo Parcels', href: '/track/MVX-2026-1002', description: 'Vasco to Mapusa delivered example' },
  { id: '6', title: 'How MOVEX Works', category: 'Pages', href: '/how-it-works', description: 'Community Relay rules, simulated scope, and handovers' },
  { id: '7', title: 'MOVEX Guard & Safety', category: 'Pages', href: '/safety', description: 'Permitted, Restricted, Prohibited items and packaging rules' },
  { id: '8', title: 'Sign In / Register', category: 'Pages', href: '/auth', description: 'Access sender or partner dashboard' },
  { id: '9', title: 'Privacy Policy', category: 'Help', href: '/privacy', description: 'Data protection, telemetry, and OTP security terms' },
  { id: '10', title: 'Terms & Conditions', category: 'Help', href: '/terms', description: 'Relay liability, prohibited item declarations, and disputes' },
];

interface GlobalSearchModalProps {
  isOpen: boolean;
  onClose: () => void;
}

export default function GlobalSearchModal({ isOpen, onClose }: GlobalSearchModalProps) {
  const [query, setQuery] = useState('');
  const [selectedIndex, setSelectedIndex] = useState(0);
  const inputRef = useRef<HTMLInputElement>(null);
  const navigate = useNavigate();

  useEffect(() => {
    if (isOpen) {
      setTimeout(() => inputRef.current?.focus(), 50);
      setQuery('');
      setSelectedIndex(0);
    }
  }, [isOpen]);

  const filteredItems = SEARCH_ITEMS.filter((item) => {
    const q = query.toLowerCase().trim();
    if (!q) return true;
    return (
      item.title.toLowerCase().includes(q) ||
      item.description.toLowerCase().includes(q) ||
      item.category.toLowerCase().includes(q)
    );
  });

  const handleSelect = (item: SearchItem) => {
    onClose();
    navigate(item.href);
  };

  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      if (!isOpen) return;
      if (e.key === 'ArrowDown') {
        e.preventDefault();
        setSelectedIndex((prev) => (prev + 1) % (filteredItems.length || 1));
      } else if (e.key === 'ArrowUp') {
        e.preventDefault();
        setSelectedIndex((prev) => (prev - 1 + filteredItems.length) % (filteredItems.length || 1));
      } else if (e.key === 'Enter') {
        e.preventDefault();
        if (filteredItems[selectedIndex]) {
          handleSelect(filteredItems[selectedIndex]);
        }
      } else if (e.key === 'Escape') {
        onClose();
      }
    };

    window.addEventListener('keydown', handleKeyDown);
    return () => window.removeEventListener('keydown', handleKeyDown);
  }, [isOpen, filteredItems, selectedIndex]);

  if (!isOpen) return null;

  return (
    <div
      role="dialog"
      aria-modal="true"
      aria-label="Global Search"
      className="fixed inset-0 z-50 flex items-start justify-center p-4 pt-16 sm:pt-24 bg-black/60 backdrop-blur-xs animate-in fade-in duration-150"
      onClick={onClose}
    >
      <div
        className="w-full max-w-xl rounded-3xl border border-neutral-200 dark:border-neutral-800 bg-white dark:bg-[#181a1f] shadow-2xl overflow-hidden"
        onClick={(e) => e.stopPropagation()}
      >
        {/* Search Input Box */}
        <div className="relative flex items-center border-b border-neutral-200 dark:border-neutral-800 px-4 py-3">
          <Search className="h-5 w-5 text-[#777777] dark:text-neutral-400 shrink-0 mr-3" />
          <input
            ref={inputRef}
            type="text"
            value={query}
            onChange={(e) => {
              setQuery(e.target.value);
              setSelectedIndex(0);
            }}
            placeholder="Type to search destinations, parcel IDs, or pages..."
            className="w-full bg-transparent text-sm sm:text-base text-[#101114] dark:text-white placeholder-[#777777] focus:outline-none"
          />
          {query && (
            <button
              type="button"
              onClick={() => setQuery('')}
              className="text-neutral-400 hover:text-neutral-600 dark:hover:text-neutral-200 p-1"
            >
              <X className="h-4 w-4" />
            </button>
          )}
        </div>

        {/* Results List */}
        <div className="max-h-80 overflow-y-auto p-2">
          {filteredItems.length === 0 ? (
            <div className="py-10 text-center">
              <p className="text-sm font-semibold text-[#101114] dark:text-neutral-200">
                No matching results found
              </p>
              <p className="text-xs text-[#777777] dark:text-neutral-400 mt-1">
                Try searching for "Panaji", "Track", "Safety", or "MVX-2026-1001"
              </p>
            </div>
          ) : (
            filteredItems.map((item, index) => {
              const isSelected = index === selectedIndex;
              return (
                <div
                  key={item.id}
                  onClick={() => handleSelect(item)}
                  onMouseEnter={() => setSelectedIndex(index)}
                  className={`flex items-center justify-between p-3 rounded-2xl cursor-pointer transition-colors ${
                    isSelected
                      ? 'bg-[#F5F5F5] dark:bg-[#25282D] text-[#101114] dark:text-white'
                      : 'text-[#101114] dark:text-neutral-300'
                  }`}
                >
                  <div className="flex items-center gap-3 min-w-0">
                    <div
                      className={`flex h-9 w-9 shrink-0 items-center justify-center rounded-xl ${
                        isSelected
                          ? 'bg-[#FFD43B] text-[#101114]'
                          : 'bg-[#F5F5F5] dark:bg-[#1f2227] text-[#777777] dark:text-neutral-400'
                      }`}
                    >
                      {item.category === 'Actions' && <Package className="h-4 w-4" />}
                      {item.category === 'Demo Parcels' && <MapPin className="h-4 w-4" />}
                      {item.category === 'Pages' && <FileText className="h-4 w-4" />}
                      {item.category === 'Help' && <Shield className="h-4 w-4" />}
                    </div>
                    <div className="min-w-0">
                      <div className="flex items-center gap-2">
                        <span className="font-display text-sm font-bold truncate">
                          {item.title}
                        </span>
                        <span className="text-[10px] uppercase font-bold tracking-wider px-2 py-0.5 rounded-md bg-neutral-200 dark:bg-neutral-800 text-[#777777] dark:text-neutral-400">
                          {item.category}
                        </span>
                      </div>
                      <p className="text-xs text-[#777777] dark:text-neutral-400 truncate mt-0.5">
                        {item.description}
                      </p>
                    </div>
                  </div>
                  {isSelected && (
                    <CornerDownLeft className="h-4 w-4 text-[#777777] dark:text-neutral-400 shrink-0 ml-2" />
                  )}
                </div>
              );
            })
          )}
        </div>

        {/* Footer Shortcut Hints */}
        <div className="flex items-center justify-between border-t border-neutral-100 dark:border-neutral-800/80 px-4 py-2.5 text-[11px] text-[#777777] dark:text-neutral-400 bg-neutral-50 dark:bg-[#14161a]">
          <div className="flex items-center gap-2">
            <span>Use <kbd className="px-1.5 py-0.5 rounded bg-white dark:bg-neutral-800 border border-neutral-300 dark:border-neutral-700 font-mono">↑</kbd> <kbd className="px-1.5 py-0.5 rounded bg-white dark:bg-neutral-800 border border-neutral-300 dark:border-neutral-700 font-mono">↓</kbd> to navigate</span>
            <span><kbd className="px-1.5 py-0.5 rounded bg-white dark:bg-neutral-800 border border-neutral-300 dark:border-neutral-700 font-mono">↵</kbd> to select</span>
          </div>
          <div>
            <span><kbd className="px-1.5 py-0.5 rounded bg-white dark:bg-neutral-800 border border-neutral-300 dark:border-neutral-700 font-mono">Esc</kbd> to close</span>
          </div>
        </div>
      </div>
    </div>
  );
}
