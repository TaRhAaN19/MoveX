import { useState } from 'react';
import { useNavigate, useSearchParams } from 'react-router-dom';
import { AlertCircle, CheckCircle2, Lock, Mail, Phone, User as UserIcon, Eye, EyeOff } from 'lucide-react';
import { useAuth } from '../context/AuthContext';
import { getApiError } from '../services/api';
import { usePageMeta } from '../hooks/usePageMeta';
import { useToast } from '../context/ToastContext';
import type { TransportMode } from '../types/movex';

export default function AuthPage() {
  const [searchParams] = useSearchParams();
  const intent = searchParams.get('intent') === 'partner' ? 'partner' : 'sender';

  const { login, register } = useAuth();
  const navigate = useNavigate();
  const { success, error: toastError } = useToast();

  usePageMeta({
    title: 'Sign In & Registration',
    description: 'Log in to your MOVEX Sender or Delivery Partner workspace.',
  });

  const [mode, setMode] = useState<'login' | 'register'>('login');
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [showPassword, setShowPassword] = useState(false);
  const [name, setName] = useState('');
  const [mobile, setMobile] = useState('');
  const [role, setRole] = useState<'sender' | 'partner'>(intent);
  const [primaryMode, setPrimaryMode] = useState<TransportMode>('bike');
  const [vehicleNumber, setVehicleNumber] = useState('');
  const [submitting, setSubmitting] = useState(false);
  const [error, setError] = useState('');

  // Inline validation state
  const [emailError, setEmailError] = useState('');
  const [passwordError, setPasswordError] = useState('');
  const [mobileError, setMobileError] = useState('');

  const validateEmail = (val: string) => {
    const regex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
    if (!val) {
      setEmailError('Email is required');
      return false;
    }
    if (!regex.test(val)) {
      setEmailError('Please enter a valid email address');
      return false;
    }
    setEmailError('');
    return true;
  };

  const validatePassword = (val: string) => {
    if (!val) {
      setPasswordError('Password is required');
      return false;
    }
    if (val.length < 6) {
      setPasswordError('Password must be at least 6 characters');
      return false;
    }
    setPasswordError('');
    return true;
  };

  const validateMobile = (val: string) => {
    if (mode === 'register') {
      const clean = val.replace(/\D/g, '');
      if (!val || clean.length < 10) {
        setMobileError('Please enter a valid 10-digit mobile number');
        return false;
      }
    }
    setMobileError('');
    return true;
  };

  const handleDemoFill = async (demoEmail: string) => {
    setError('');
    setSubmitting(true);
    try {
      const u = await login(demoEmail, 'Movex@123');
      success(`Signed in as ${u.name}!`, 'Welcome to MOVEX');
      if (u.role === 'admin') navigate('/admin');
      else if (u.role === 'partner') navigate('/partner');
      else navigate(intent === 'partner' ? '/partner' : '/sender');
    } catch (err) {
      const msg = getApiError(err);
      setError(msg);
      toastError(msg);
    } finally {
      setSubmitting(false);
    }
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError('');

    const isEmailValid = validateEmail(email);
    const isPasswordValid = validatePassword(password);
    const isMobileValid = validateMobile(mobile);

    if (!isEmailValid || !isPasswordValid || (!isMobileValid && mode === 'register')) {
      return;
    }

    setSubmitting(true);

    try {
      if (mode === 'login') {
        const u = await login(email, password);
        success(`Welcome back, ${u.name}!`);
        if (u.role === 'admin') navigate('/admin');
        else if (u.role === 'partner') navigate('/partner');
        else navigate('/sender');
      } else {
        const u = await register({
          name,
          email,
          mobile,
          password,
          role,
          primaryMode: role === 'partner' ? primaryMode : undefined,
          vehicleNumber: role === 'partner' ? vehicleNumber : undefined
        });
        success(`Account created! Welcome, ${u.name}.`);
        navigate(u.role === 'partner' ? '/partner' : '/sender');
      }
    } catch (err) {
      const msg = getApiError(err);
      setError(msg);
      toastError(msg);
    } finally {
      setSubmitting(false);
    }
  };

  return (
    <main id="main-content" className="mx-auto max-w-5xl px-4 py-10 sm:px-6">
      <div className="grid grid-cols-1 gap-8 lg:grid-cols-12">
        {/* Left Auth Card */}
        <div className="rounded-3xl border border-neutral-200 dark:border-neutral-800 bg-white dark:bg-[#181a1f] p-6 sm:p-8 lg:col-span-7 transition-colors">
          <div className="flex items-center justify-between gap-4">
            <div>
              <h1 className="font-display text-2xl font-extrabold text-[#101114] dark:text-white">
                {mode === 'login' ? 'Sign in to MOVEX' : 'Create your MOVEX account'}
              </h1>
              <p className="mt-1 text-sm text-[#777777] dark:text-neutral-400">
                {mode === 'login'
                  ? 'Access your bookings, journeys, and OTP handovers.'
                  : 'You can switch between sending and delivering anytime.'}
              </p>
            </div>
          </div>

          {/* Mode Tabs */}
          <div className="mt-6 grid grid-cols-2 gap-1 rounded-xl bg-[#F5F5F5] dark:bg-[#25282D] p-1">
            <button
              type="button"
              onClick={() => {
                setMode('login');
                setError('');
              }}
              className={`h-10 rounded-lg text-sm font-semibold transition-colors ${
                mode === 'login'
                  ? 'bg-white dark:bg-[#181a1f] text-[#101114] dark:text-white shadow-xs'
                  : 'text-[#777777] dark:text-neutral-400 hover:text-[#101114] dark:hover:text-white'
              }`}
            >
              Login
            </button>
            <button
              type="button"
              onClick={() => {
                setMode('register');
                setError('');
              }}
              className={`h-10 rounded-lg text-sm font-semibold transition-colors ${
                mode === 'register'
                  ? 'bg-white dark:bg-[#181a1f] text-[#101114] dark:text-white shadow-xs'
                  : 'text-[#777777] dark:text-neutral-400 hover:text-[#101114] dark:hover:text-white'
              }`}
            >
              Register
            </button>
          </div>

          {error && (
            <div className="mt-4 flex items-center gap-2 rounded-xl border border-red-200 dark:border-red-900/60 bg-red-50 dark:bg-red-950/30 px-4 py-3 text-sm font-medium text-red-700 dark:text-red-400">
              <AlertCircle className="h-4 w-4 shrink-0" />
              <span>{error}</span>
            </div>
          )}

          <form onSubmit={handleSubmit} className="mt-5 space-y-4">
            {mode === 'register' && (
              <>
                <div>
                  <label className="mb-1.5 block text-xs font-semibold text-[#101114] dark:text-neutral-200">
                    Primary Activity
                  </label>
                  <div className="grid grid-cols-2 gap-3">
                    <button
                      type="button"
                      onClick={() => setRole('sender')}
                      className={`rounded-xl border p-3 text-left transition-colors ${
                        role === 'sender'
                          ? 'border-[#101114] dark:border-[#FFD43B] bg-[#FFD43B]/25 dark:bg-[#FFD43B]/10'
                          : 'border-neutral-200 dark:border-neutral-700 bg-[#F5F5F5] dark:bg-[#25282D]'
                      }`}
                    >
                      <div className="text-sm font-bold text-[#101114] dark:text-white">Send Parcels</div>
                      <div className="text-xs text-[#777777] dark:text-neutral-400">Customer account</div>
                    </button>
                    <button
                      type="button"
                      onClick={() => setRole('partner')}
                      className={`rounded-xl border p-3 text-left transition-colors ${
                        role === 'partner'
                          ? 'border-[#101114] dark:border-[#FFD43B] bg-[#FFD43B]/25 dark:bg-[#FFD43B]/10'
                          : 'border-neutral-200 dark:border-neutral-700 bg-[#F5F5F5] dark:bg-[#25282D]'
                      }`}
                    >
                      <div className="text-sm font-bold text-[#101114] dark:text-white">Deliver Parcels</div>
                      <div className="text-xs text-[#777777] dark:text-neutral-400">Partner account</div>
                    </button>
                  </div>
                </div>

                <div>
                  <label className="mb-1.5 block text-xs font-semibold text-[#101114] dark:text-neutral-200">
                    Full Name
                  </label>
                  <div className="relative">
                    <UserIcon className="absolute top-1/2 left-3.5 h-4 w-4 -translate-y-1/2 text-[#777777] dark:text-neutral-400" />
                    <input
                      type="text"
                      required
                      value={name}
                      onChange={(e) => setName(e.target.value)}
                      placeholder="e.g. Rohan Dessai"
                      className="h-11 w-full rounded-xl border border-neutral-200 dark:border-neutral-700 bg-[#F5F5F5] dark:bg-[#25282D] pr-4 pl-10 text-sm text-[#101114] dark:text-white focus:border-[#101114] dark:focus:border-[#FFD43B] focus:bg-white dark:focus:bg-[#181a1f] focus:outline-none"
                    />
                  </div>
                </div>

                <div>
                  <label className="mb-1.5 block text-xs font-semibold text-[#101114] dark:text-neutral-200">
                    Mobile Number
                  </label>
                  <div className="relative">
                    <Phone className="absolute top-1/2 left-3.5 h-4 w-4 -translate-y-1/2 text-[#777777] dark:text-neutral-400" />
                    <input
                      type="tel"
                      required
                      value={mobile}
                      onChange={(e) => {
                        setMobile(e.target.value);
                        if (mobileError) validateMobile(e.target.value);
                      }}
                      onBlur={() => validateMobile(mobile)}
                      placeholder="+91 98230 00000"
                      className={`h-11 w-full rounded-xl border ${
                        mobileError
                          ? 'border-red-500'
                          : 'border-neutral-200 dark:border-neutral-700'
                      } bg-[#F5F5F5] dark:bg-[#25282D] pr-4 pl-10 text-sm text-[#101114] dark:text-white focus:border-[#101114] dark:focus:border-[#FFD43B] focus:bg-white dark:focus:bg-[#181a1f] focus:outline-none`}
                    />
                  </div>
                  {mobileError && (
                    <p className="mt-1 text-xs text-red-600 dark:text-red-400">{mobileError}</p>
                  )}
                </div>

                {role === 'partner' && (
                  <div className="grid grid-cols-1 gap-3 sm:grid-cols-2">
                    <div>
                      <label className="mb-1.5 block text-xs font-semibold text-[#101114] dark:text-neutral-200">
                        Primary Transport Mode
                      </label>
                      <select
                        value={primaryMode}
                        onChange={(e) => setPrimaryMode(e.target.value as TransportMode)}
                        className="h-11 w-full rounded-xl border border-neutral-200 dark:border-neutral-700 bg-[#F5F5F5] dark:bg-[#25282D] px-3 text-sm text-[#101114] dark:text-white focus:border-[#101114] dark:focus:border-[#FFD43B] focus:bg-white dark:focus:bg-[#181a1f] focus:outline-none"
                      >
                        <option value="bike">Bike</option>
                        <option value="car">Car</option>
                        <option value="bus">Bus</option>
                        <option value="train">Train</option>
                        <option value="flight">Flight</option>
                        <option value="freight">Commercial Freight</option>
                      </select>
                    </div>
                    <div>
                      <label className="mb-1.5 block text-xs font-semibold text-[#101114] dark:text-neutral-200">
                        Vehicle / Pass Ref
                      </label>
                      <input
                        type="text"
                        value={vehicleNumber}
                        onChange={(e) => setVehicleNumber(e.target.value)}
                        placeholder="GA-07-X-1234"
                        className="h-11 w-full rounded-xl border border-neutral-200 dark:border-neutral-700 bg-[#F5F5F5] dark:bg-[#25282D] px-3 text-sm text-[#101114] dark:text-white focus:border-[#101114] dark:focus:border-[#FFD43B] focus:bg-white dark:focus:bg-[#181a1f] focus:outline-none"
                      />
                    </div>
                  </div>
                )}
              </>
            )}

            <div>
              <label className="mb-1.5 block text-xs font-semibold text-[#101114] dark:text-neutral-200">
                Email Address
              </label>
              <div className="relative">
                <Mail className="absolute top-1/2 left-3.5 h-4 w-4 -translate-y-1/2 text-[#777777] dark:text-neutral-400" />
                <input
                  type="email"
                  required
                  value={email}
                  onChange={(e) => {
                    setEmail(e.target.value);
                    if (emailError) validateEmail(e.target.value);
                  }}
                  onBlur={() => validateEmail(email)}
                  placeholder="you@example.com"
                  className={`h-11 w-full rounded-xl border ${
                    emailError
                      ? 'border-red-500'
                      : 'border-neutral-200 dark:border-neutral-700'
                  } bg-[#F5F5F5] dark:bg-[#25282D] pr-4 pl-10 text-sm text-[#101114] dark:text-white focus:border-[#101114] dark:focus:border-[#FFD43B] focus:bg-white dark:focus:bg-[#181a1f] focus:outline-none`}
                />
              </div>
              {emailError && (
                <p className="mt-1 text-xs text-red-600 dark:text-red-400">{emailError}</p>
              )}
            </div>

            <div>
              <label className="mb-1.5 block text-xs font-semibold text-[#101114] dark:text-neutral-200">
                Password
              </label>
              <div className="relative">
                <Lock className="absolute top-1/2 left-3.5 h-4 w-4 -translate-y-1/2 text-[#777777] dark:text-neutral-400" />
                <input
                  type={showPassword ? 'text' : 'password'}
                  required
                  value={password}
                  onChange={(e) => {
                    setPassword(e.target.value);
                    if (passwordError) validatePassword(e.target.value);
                  }}
                  onBlur={() => validatePassword(password)}
                  placeholder="Minimum 6 characters"
                  className={`h-11 w-full rounded-xl border ${
                    passwordError
                      ? 'border-red-500'
                      : 'border-neutral-200 dark:border-neutral-700'
                  } bg-[#F5F5F5] dark:bg-[#25282D] pr-10 pl-10 text-sm text-[#101114] dark:text-white focus:border-[#101114] dark:focus:border-[#FFD43B] focus:bg-white dark:focus:bg-[#181a1f] focus:outline-none`}
                />
                {/* Feature 28: Password Visibility Toggle */}
                <button
                  type="button"
                  onClick={() => setShowPassword((p) => !p)}
                  aria-label={showPassword ? 'Hide password' : 'Show password'}
                  className="absolute top-1/2 right-3 -translate-y-1/2 text-neutral-400 hover:text-neutral-600 dark:hover:text-neutral-200 p-1"
                >
                  {showPassword ? <EyeOff className="h-4 w-4" /> : <Eye className="h-4 w-4" />}
                </button>
              </div>
              {passwordError && (
                <p className="mt-1 text-xs text-red-600 dark:text-red-400">{passwordError}</p>
              )}
            </div>

            <button
              type="submit"
              disabled={submitting}
              className="mt-2 flex h-12 w-full items-center justify-center rounded-xl bg-[#FFD43B] text-sm font-bold text-[#101114] transition-colors hover:bg-[#F5C419] disabled:opacity-60 shadow-xs"
            >
              {submitting ? 'Please wait...' : mode === 'login' ? 'Sign In' : 'Create Account'}
            </button>
          </form>
        </div>

        {/* Right Demo Accounts Panel */}
        <div className="rounded-3xl border border-neutral-200 dark:border-neutral-800 bg-[#F5F5F5] dark:bg-[#181a1f] p-6 sm:p-8 lg:col-span-5 transition-colors">
          <h2 className="font-display text-lg font-bold text-[#101114] dark:text-white">
            Demo Accounts for Testing
          </h2>
          <p className="mt-1 text-xs leading-relaxed text-[#777777] dark:text-neutral-400">
            Use any verified prototype account below to test end-to-end Sender, Delivery Partner, or Administrator workflows immediately.
          </p>

          <div className="mt-5 space-y-3">
            <button
              type="button"
              disabled={submitting}
              onClick={() => handleDemoFill('sender@movex.demo')}
              className="w-full rounded-2xl border border-neutral-200 dark:border-neutral-700 bg-white dark:bg-[#25282D] p-4 text-left transition-all hover:border-[#101114] dark:hover:border-[#FFD43B]"
            >
              <div className="flex items-center justify-between">
                <span className="text-sm font-bold text-[#101114] dark:text-white">
                  Sender Demo (Aarav Naik)
                </span>
                <span className="rounded-lg bg-[#FFD43B] px-2.5 py-1 text-[11px] font-bold text-[#101114]">
                  1-Click Login
                </span>
              </div>
              <div className="mt-1 font-mono-num text-xs text-[#777777] dark:text-neutral-400">
                sender@movex.demo · Movex@123
              </div>
            </button>

            <button
              type="button"
              disabled={submitting}
              onClick={() => handleDemoFill('partner@movex.demo')}
              className="w-full rounded-2xl border border-neutral-200 dark:border-neutral-700 bg-white dark:bg-[#25282D] p-4 text-left transition-all hover:border-[#101114] dark:hover:border-[#FFD43B]"
            >
              <div className="flex items-center justify-between">
                <span className="text-sm font-bold text-[#101114] dark:text-white">
                  Partner Demo (Rohan Dessai)
                </span>
                <span className="rounded-lg bg-[#101114] dark:bg-white px-2.5 py-1 text-[11px] font-bold text-white dark:text-[#101114]">
                  1-Click Login
                </span>
              </div>
              <div className="mt-1 font-mono-num text-xs text-[#777777] dark:text-neutral-400">
                partner@movex.demo · Movex@123
              </div>
            </button>

            <button
              type="button"
              disabled={submitting}
              onClick={() => handleDemoFill('admin@movex.demo')}
              className="w-full rounded-2xl border border-neutral-200 dark:border-neutral-700 bg-white dark:bg-[#25282D] p-4 text-left transition-all hover:border-[#101114] dark:hover:border-[#FFD43B]"
            >
              <div className="flex items-center justify-between">
                <span className="text-sm font-bold text-[#101114] dark:text-white">
                  Admin Demo (Neha Fernandes)
                </span>
                <span className="rounded-lg border border-neutral-300 dark:border-neutral-600 bg-[#F5F5F5] dark:bg-[#181a1f] px-2.5 py-1 text-[11px] font-bold text-[#101114] dark:text-neutral-200">
                  1-Click Login
                </span>
              </div>
              <div className="mt-1 font-mono-num text-xs text-[#777777] dark:text-neutral-400">
                admin@movex.demo · Movex@123
              </div>
            </button>
          </div>

          <div className="mt-6 space-y-2 border-t border-neutral-200 dark:border-neutral-800 pt-4 text-xs text-[#777777] dark:text-neutral-400">
            <div className="flex items-center gap-2 text-[#101114] dark:text-neutral-200">
              <CheckCircle2 className="h-4 w-4 shrink-0 text-emerald-600 dark:text-emerald-400" />
              <span>Senders can switch to Deliver mode anytime inside their dashboard.</span>
            </div>
            <div className="flex items-center gap-2 text-[#101114] dark:text-neutral-200">
              <CheckCircle2 className="h-4 w-4 shrink-0 text-emerald-600 dark:text-emerald-400" />
              <span>Admin endpoints are strictly isolated by role-based JWT verification.</span>
            </div>
          </div>
        </div>
      </div>
    </main>
  );
}
