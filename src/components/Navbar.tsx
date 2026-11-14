import { useState, useEffect } from 'react';
import { Link, useLocation, useNavigate } from 'react-router-dom';
import { Menu, X, Sun, Moon, Search, Keyboard } from 'lucide-react';
import { useAuth } from '../context/AuthContext';
import { useTheme } from '../context/ThemeContext';
import GlobalSearchModal from './GlobalSearchModal';
import KeyboardShortcutsModal from './KeyboardShortcutsModal';

export default function Navbar() {
  const { user, activeActivity, logout } = useAuth();
  const { theme, toggleTheme } = useTheme();
  const location = useLocation();
  const navigate = useNavigate();
  const [mobileMenuOpen, setMobileMenuOpen] = useState(false);
  const [searchOpen, setSearchOpen] = useState(false);
  const [shortcutsOpen, setShortcutsOpen] = useState(false);
  const [isScrolled, setIsScrolled] = useState(false);

  useEffect(() => {
    const handleScroll = () => {
      setIsScrolled(window.scrollY > 15);
    };
    window.addEventListener('scroll', handleScroll, { passive: true });
    return () => window.removeEventListener('scroll', handleScroll);
  }, []);

  // Global Keyboard listener for Cmd+K and ?
  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      if ((e.metaKey || e.ctrlKey) && e.key.toLowerCase() === 'k') {
        e.preventDefault();
        setSearchOpen((prev) => !prev);
      } else if (e.key === '?' && !['INPUT', 'TEXTAREA'].includes((e.target as HTMLElement).tagName)) {
        e.preventDefault();
        setShortcutsOpen((prev) => !prev);
      }
    };
    window.addEventListener('keydown', handleKeyDown);
    return () => window.removeEventListener('keydown', handleKeyDown);
  }, []);

  const dashboardHref =
    user?.role === 'admin' ? '/admin' : activeActivity === 'partner' ? '/partner' : '/sender';

  const isActive = (path: string) => location.pathname === path;

  return (
    <>
      <header
        className={`sticky top-0 z-40 transition-all duration-200 ${
          isScrolled
            ? 'border-b border-neutral-200 dark:border-neutral-800 bg-white/95 dark:bg-[#101114]/95 backdrop-blur-md shadow-xs'
            : 'border-b border-neutral-200/80 dark:border-neutral-800/80 bg-white dark:bg-[#101114]'
        }`}
      >
        <div className="mx-auto flex h-14 max-w-7xl items-center justify-between gap-4 px-4 sm:px-6">
          {/* Zone 1: Brand Wordmark */}
          <Link
            to="/"
            className="flex items-center gap-2 font-display text-xl font-extrabold tracking-tight text-[#101114] dark:text-white whitespace-nowrap shrink-0 group"
          >
            <div className="flex h-7 w-7 items-center justify-center rounded-lg bg-[#FFD43B] text-[#101114] transition-transform group-hover:scale-105">
              <span className="font-display font-black text-xs leading-none">M</span>
            </div>
            <span>MOVEX</span>
          </Link>

          {/* Zone 2: Navigation Links */}
          <nav className="hidden md:flex items-center gap-5 text-sm font-medium text-[#777777] dark:text-neutral-400">
            <Link
              to="/"
              className={`transition-colors whitespace-nowrap shrink-0 hover:text-[#101114] dark:hover:text-white ${
                isActive('/') ? 'font-semibold text-[#101114] dark:text-white underline decoration-[#FFD43B] decoration-2 underline-offset-8' : ''
              }`}
            >
              Home
            </Link>
            <Link
              to="/how-it-works"
              className={`transition-colors whitespace-nowrap shrink-0 hover:text-[#101114] dark:hover:text-white ${
                isActive('/how-it-works') ? 'font-semibold text-[#101114] dark:text-white underline decoration-[#FFD43B] decoration-2 underline-offset-8' : ''
              }`}
            >
              How It Works
            </Link>
            <Link
              to={user ? '/sender?tab=book' : '/auth?intent=sender'}
              className={`transition-colors whitespace-nowrap shrink-0 hover:text-[#101114] dark:hover:text-white ${
                isActive('/sender') ? 'font-semibold text-[#101114] dark:text-white underline decoration-[#FFD43B] decoration-2 underline-offset-8' : ''
              }`}
            >
              Send a Parcel
            </Link>
            <Link
              to={user ? '/partner' : '/auth?intent=partner'}
              className={`transition-colors whitespace-nowrap shrink-0 hover:text-[#101114] dark:hover:text-white ${
                isActive('/partner') ? 'font-semibold text-[#101114] dark:text-white underline decoration-[#FFD43B] decoration-2 underline-offset-8' : ''
              }`}
            >
              Deliver a Parcel
            </Link>
            <Link
              to="/safety"
              className={`transition-colors whitespace-nowrap shrink-0 hover:text-[#101114] dark:hover:text-white ${
                isActive('/safety') ? 'font-semibold text-[#101114] dark:text-white underline decoration-[#FFD43B] decoration-2 underline-offset-8' : ''
              }`}
            >
              Safety
            </Link>
            <Link
              to="/track"
              className={`transition-colors whitespace-nowrap shrink-0 hover:text-[#101114] dark:hover:text-white ${
                isActive('/track') ? 'font-semibold text-[#101114] dark:text-white underline decoration-[#FFD43B] decoration-2 underline-offset-8' : ''
              }`}
            >
              Track
            </Link>
          </nav>

          {/* Zone 3: Actions (Search, Dark Mode, Auth & Mobile Menu) */}
          <div className="flex items-center gap-2 sm:gap-2.5 shrink-0">
            {/* Search Trigger Button */}
            <button
              type="button"
              onClick={() => setSearchOpen(true)}
              aria-label="Open search dialog"
              className="flex h-9 items-center gap-2 rounded-xl border border-neutral-200 dark:border-neutral-800 bg-[#F5F5F5] dark:bg-[#1f2227] px-2.5 text-xs text-[#777777] dark:text-neutral-400 hover:border-[#101114] dark:hover:border-neutral-600 transition-colors"
            >
              <Search className="h-4 w-4" />
              <span className="hidden lg:inline text-[11px]">Search...</span>
              <kbd className="hidden lg:inline-flex items-center px-1.5 py-0.5 rounded bg-white dark:bg-neutral-800 text-[10px] font-mono border border-neutral-200 dark:border-neutral-700">
                ⌘K
              </kbd>
            </button>

            {/* Dark Mode Toggle */}
            <button
              type="button"
              onClick={toggleTheme}
              aria-label={theme === 'dark' ? 'Switch to light theme' : 'Switch to dark theme'}
              className="flex h-9 w-9 items-center justify-center rounded-xl border border-neutral-200 dark:border-neutral-800 bg-[#F5F5F5] dark:bg-[#1f2227] text-[#101114] dark:text-[#FFD43B] hover:border-[#101114] dark:hover:border-neutral-600 transition-colors"
            >
              {theme === 'dark' ? <Sun className="h-4 w-4" /> : <Moon className="h-4 w-4" />}
            </button>

            {/* Shortcuts Guide Toggle */}
            <button
              type="button"
              onClick={() => setShortcutsOpen(true)}
              aria-label="Keyboard shortcuts"
              className="hidden sm:flex h-9 w-9 items-center justify-center rounded-xl border border-neutral-200 dark:border-neutral-800 bg-[#F5F5F5] dark:bg-[#1f2227] text-[#777777] dark:text-neutral-400 hover:text-[#101114] dark:hover:text-white transition-colors"
            >
              <Keyboard className="h-4 w-4" />
            </button>

            {/* Login or Dashboard Hub Button */}
            {user ? (
              <button
                type="button"
                onClick={() => navigate(dashboardHref)}
                className="inline-flex h-9 items-center justify-center rounded-xl bg-[#FFD43B] px-3.5 text-xs font-bold text-[#101114] transition-colors hover:bg-[#F5C419] whitespace-nowrap shrink-0 shadow-xs"
              >
                {user.role === 'admin' ? 'Admin' : activeActivity === 'partner' ? 'Partner' : 'Sender'}
              </button>
            ) : (
              <Link
                to="/auth"
                className="inline-flex h-9 items-center justify-center rounded-xl bg-[#101114] dark:bg-white px-3.5 text-xs font-semibold text-white dark:text-[#101114] transition-colors hover:bg-[#25282D] dark:hover:bg-neutral-200 whitespace-nowrap shrink-0 shadow-xs"
              >
                Login
              </Link>
            )}

            {/* Mobile Hamburger Menu Toggle */}
            <button
              type="button"
              onClick={() => setMobileMenuOpen((v) => !v)}
              aria-label="Toggle navigation menu"
              aria-expanded={mobileMenuOpen}
              className="flex h-9 w-9 items-center justify-center rounded-xl border border-neutral-200 dark:border-neutral-800 text-[#101114] dark:text-white md:hidden"
            >
              {mobileMenuOpen ? <X className="h-4 w-4" /> : <Menu className="h-4 w-4" />}
            </button>
          </div>
        </div>

        {/* Mobile Dropdown Drawer */}
        {mobileMenuOpen && (
          <div className="border-t border-neutral-200 dark:border-neutral-800 bg-white dark:bg-[#101114] px-4 py-3 md:hidden animate-in slide-in-from-top-2 duration-150">
            <div className="flex flex-col gap-1">
              <Link
                to="/"
                onClick={() => setMobileMenuOpen(false)}
                className="rounded-lg px-3 py-2 text-sm font-medium text-[#101114] dark:text-neutral-100 hover:bg-[#F5F5F5] dark:hover:bg-[#1f2227]"
              >
                Home
              </Link>
              <Link
                to="/how-it-works"
                onClick={() => setMobileMenuOpen(false)}
                className="rounded-lg px-3 py-2 text-sm font-medium text-[#101114] dark:text-neutral-100 hover:bg-[#F5F5F5] dark:hover:bg-[#1f2227]"
              >
                How It Works
              </Link>
              <Link
                to={user ? '/sender?tab=book' : '/auth?intent=sender'}
                onClick={() => setMobileMenuOpen(false)}
                className="rounded-lg px-3 py-2 text-sm font-medium text-[#101114] dark:text-neutral-100 hover:bg-[#F5F5F5] dark:hover:bg-[#1f2227]"
              >
                Send a Parcel
              </Link>
              <Link
                to={user ? '/partner' : '/auth?intent=partner'}
                onClick={() => setMobileMenuOpen(false)}
                className="rounded-lg px-3 py-2 text-sm font-medium text-[#101114] dark:text-neutral-100 hover:bg-[#F5F5F5] dark:hover:bg-[#1f2227]"
              >
                Deliver a Parcel
              </Link>
              <Link
                to="/safety"
                onClick={() => setMobileMenuOpen(false)}
                className="rounded-lg px-3 py-2 text-sm font-medium text-[#101114] dark:text-neutral-100 hover:bg-[#F5F5F5] dark:hover:bg-[#1f2227]"
              >
                Safety
              </Link>
              <Link
                to="/track"
                onClick={() => setMobileMenuOpen(false)}
                className="rounded-lg px-3 py-2 text-sm font-medium text-[#101114] dark:text-neutral-100 hover:bg-[#F5F5F5] dark:hover:bg-[#1f2227]"
              >
                Track Parcel
              </Link>
              {user && (
                <button
                  type="button"
                  onClick={() => {
                    logout();
                    setMobileMenuOpen(false);
                    navigate('/');
                  }}
                  className="mt-2 rounded-lg px-3 py-2 text-left text-sm font-semibold text-red-600 dark:text-red-400 hover:bg-red-50 dark:hover:bg-red-950/30"
                >
                  Logout ({user.name})
                </button>
              )}
            </div>
          </div>
        )}
      </header>

      {/* Global Command Palette Search Modal */}
      <GlobalSearchModal isOpen={searchOpen} onClose={() => setSearchOpen(false)} />

      {/* Keyboard Shortcuts Dialog */}
      <KeyboardShortcutsModal isOpen={shortcutsOpen} onClose={() => setShortcutsOpen(false)} />
    </>
  );
}
