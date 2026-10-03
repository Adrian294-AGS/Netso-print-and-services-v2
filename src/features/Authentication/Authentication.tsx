'use client';

import React, { useState } from 'react';
import { Package, Printer, ShieldAlert, ShieldCheck } from 'lucide-react';
import Login, { type LoginFormData, type UserRole } from './Login';
import Signup, { type SignupFormData } from './Signup';

export interface AuthenticatedUser {
  name: string;
  identifier: string;
  role: UserRole;
}

interface AuthenticationProps {
  onAuthenticated: (user: AuthenticatedUser) => void;
}

type AuthMode = 'login' | 'signup';

export function Authentication({ onAuthenticated }: AuthenticationProps) {
  const [mode, setMode] = useState<AuthMode>('login');
  const [role, setRole] = useState<UserRole>('customer');
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [logoError, setLogoError] = useState(false);

  const switchMode = (nextMode: AuthMode) => {
    setMode(nextMode);
    if (nextMode === 'signup') setRole('customer');
  };

  const selectRole = (nextRole: UserRole) => {
    setRole(nextRole);
    if (nextRole !== 'customer') setMode('login');
  };

  const completeAuthentication = (user: AuthenticatedUser, delay: number) => {
    setIsSubmitting(true);
    window.setTimeout(() => {
      setIsSubmitting(false);
      onAuthenticated(user);
    }, delay);
  };

  const handleLogin = (data: LoginFormData) => {
    const identifier = role === 'customer' ? data.email : data.idNumber;
    const name =
      role === 'customer'
        ? data.email.toLowerCase().includes('alexandrie')
          ? 'Alexandrie Abon'
          : data.email.split('@')[0] || 'Customer'
        : role === 'staff'
        ? 'Marco Villanueva'
        : 'Ron Castillo';
    completeAuthentication({ name, identifier, role }, 500);
  };

  const handleSignup = (data: SignupFormData) => {
    completeAuthentication({ name: data.fullName, identifier: data.email, role: 'customer' }, 500);
  };

  const handleGoogleAuth = () => {
    completeAuthentication(
      { name: 'Alexandrie Abon', identifier: 'alexandrieabon@gmail.com', role: 'customer' },
      500
    );
  };

  return (
    <div className="min-h-screen bg-neutral-950 text-neutral-100 font-clarity-modern antialiased selection:bg-amber-400 selection:text-neutral-950 flex flex-col justify-between relative overflow-x-hidden">
      <div className="fixed inset-0 bg-[linear-gradient(to_right,#1f1f23_1px,transparent_1px),linear-gradient(to_bottom,#1f1f23_1px,transparent_1px)] bg-[size:3.5rem_3.5rem] [mask-image:radial-gradient(ellipse_60%_50%_at_50%_0%,#000_70%,transparent_100%)] opacity-30 pointer-events-none" />

      <main className="w-full max-w-6xl mx-auto px-4 sm:px-6 py-8 sm:py-12 my-auto relative z-10">
        <div className="grid grid-cols-1 lg:grid-cols-12 gap-8 items-stretch">
          <section className="lg:col-span-5 bg-neutral-900/90 rounded-3xl border border-neutral-800 p-8 sm:p-9 flex flex-col justify-between relative overflow-hidden shadow-2xl">
            <div className="absolute top-0 left-0 right-0 h-1.5 bg-gradient-to-r from-amber-600 via-amber-400 to-yellow-200" />

            <div className="space-y-6">
              <div className="flex items-center gap-4">
                {!logoError ? (
                  <img
                    src="/logo/netso-logo.jpg"
                    alt="NETSO Prints & Ads Logo"
                    className="w-20 h-20 sm:w-24 sm:h-24 object-contain rounded-2xl shadow-xl border-2 border-amber-500/50 bg-neutral-950 p-1"
                    onError={() => setLogoError(true)}
                  />
                ) : (
                  <div className="w-20 h-20 sm:w-24 sm:h-24 rounded-2xl bg-gradient-to-tr from-amber-600 via-amber-400 to-yellow-200 flex items-center justify-center text-neutral-950 font-black text-3xl">
                    N
                  </div>
                )}

                <div>
                  <div className="inline-flex items-center gap-1.5 px-2.5 py-0.5 rounded-full bg-amber-500/15 border border-amber-500/40 text-amber-300 text-xs font-extrabold uppercase tracking-wider mb-1">
                    Since 2018
                  </div>
                  <span className="text-2xl sm:text-3xl font-black tracking-tight text-white block leading-none">
                    NETSO
                  </span>
                  <h2 className="text-sm sm:text-base font-bold text-amber-400 tracking-wide uppercase mt-1">
                    Prints &amp; Advertising Services
                  </h2>
                  <p className="text-xs text-neutral-300 font-semibold mt-0.5">
                    With Photo &amp; Video Services
                  </p>
                </div>
              </div>

              <div className="space-y-3 pt-5 border-t border-neutral-800">
                <h1 className="text-2xl sm:text-3xl font-extrabold text-white tracking-tight leading-snug">
                  Centralized Order &amp; Service Management Portal
                </h1>
                <p className="text-sm sm:text-base text-neutral-300 leading-relaxed">
                  Log in to manage custom print requests, track 4-stage service queues, verify GCash payments, or coordinate customer orders.
                </p>
              </div>

              <div className="space-y-3.5 pt-2">
                <Feature icon={<Package className="w-4 h-4" />}>
                  Instant Commercial Print Calculator &amp; Proofing
                </Feature>
                <Feature icon={<Printer className="w-4 h-4" />}>
                  Real-Time Order Status &amp; GCash Ledger Tracking
                </Feature>
                <Feature icon={<ShieldCheck className="w-4 h-4" />}>
                  Role-Based Access for Customers, Staff &amp; Admins
                </Feature>
              </div>
            </div>

            <div className="pt-8 mt-8 flex items-center justify-between text-xs sm:text-sm text-neutral-400 border-t border-neutral-800">
              <span>© NETSO Prints &amp; Ads</span>
              <span className="font-mono text-amber-400 font-bold">Service Portal</span>
            </div>
          </section>

          <section className="lg:col-span-7 bg-neutral-900/95 rounded-3xl border border-neutral-800 p-6 sm:p-9 shadow-2xl flex flex-col justify-between">
            <div className="space-y-6">
              <div className="space-y-5">
                <div className="flex flex-wrap items-center justify-between gap-3 border-b border-neutral-800 pb-4">
                  <div className="flex items-center gap-2 bg-neutral-950 p-1.5 rounded-xl border border-neutral-800">
                    <button
                      type="button"
                      onClick={() => switchMode('login')}
                      className={`px-5 py-2 text-sm font-bold rounded-lg transition-all cursor-pointer ${
                        mode === 'login'
                          ? 'bg-amber-500 text-neutral-950 shadow-md'
                          : 'text-neutral-300 hover:text-white'
                      }`}
                    >
                      Log In
                    </button>
                    <button
                      type="button"
                      disabled={role !== 'customer'}
                      onClick={() => switchMode('signup')}
                      className={`px-5 py-2 text-sm font-bold rounded-lg transition-all ${
                        mode === 'signup'
                          ? 'bg-amber-500 text-neutral-950 shadow-md cursor-pointer'
                          : role === 'customer'
                          ? 'text-neutral-300 hover:text-white cursor-pointer'
                          : 'text-neutral-600 cursor-not-allowed opacity-50'
                      }`}
                    >
                      Sign Up
                    </button>
                  </div>

                  {role === 'customer' && (
                    <span className="text-sm text-neutral-300">
                      {mode === 'login' ? 'New customer?' : 'Already registered?'}{' '}
                      <button
                        type="button"
                        onClick={() => switchMode(mode === 'login' ? 'signup' : 'login')}
                        className="text-amber-400 font-bold hover:underline ml-1 cursor-pointer"
                      >
                        {mode === 'login' ? 'Create Account' : 'Log In'}
                      </button>
                    </span>
                  )}
                </div>

                <div className="space-y-2">
                  <label className="text-xs sm:text-sm font-bold text-amber-400 uppercase tracking-wider block">
                    Select Portal Account Type
                  </label>
                  <div className="grid grid-cols-3 gap-2.5">
                    {(['customer', 'staff', 'admin'] as UserRole[]).map((selectedRole) => (
                      <button
                        key={selectedRole}
                        type="button"
                        onClick={() => selectRole(selectedRole)}
                        className={`py-2.5 px-3.5 text-sm font-bold rounded-xl border capitalize transition-all text-center cursor-pointer ${
                          role === selectedRole
                            ? 'bg-amber-500/15 border-amber-500 text-amber-300 shadow-sm'
                            : 'bg-neutral-950 border-neutral-800 text-neutral-300 hover:border-neutral-700 hover:text-white'
                        }`}
                      >
                        {selectedRole === 'staff'
                          ? 'Print Staff'
                          : selectedRole === 'admin'
                          ? 'Shop Admin'
                          : 'Customer'}
                      </button>
                    ))}
                  </div>
                </div>

                {role !== 'customer' && (
                  <div className="p-3.5 bg-neutral-950 rounded-xl border border-amber-500/30 text-xs sm:text-sm text-neutral-200 flex items-start gap-3">
                    <ShieldAlert className="w-5 h-5 text-amber-400 shrink-0 mt-0.5" />
                    <span>
                      Internal <strong className="text-amber-300">{role.toUpperCase()}</strong> access
                      requires a registered <strong className="text-amber-300">ID Number</strong> (e.g.
                      STF-1024 / ADM-8001) and password pre-provisioned by shop management.
                    </span>
                  </div>
                )}
              </div>

              {role === 'customer' && (
                <GoogleLoginButton
                  isSubmitting={isSubmitting}
                  mode={mode}
                  onClick={handleGoogleAuth}
                />
              )}

              {mode === 'login' ? (
                <Login role={role} isSubmitting={isSubmitting} onSubmit={handleLogin} />
              ) : (
                <Signup isSubmitting={isSubmitting} onSubmit={handleSignup} />
              )}
            </div>
          </section>
        </div>
      </main>

      <footer className="w-full py-4 px-6 text-center text-xs sm:text-sm text-neutral-400 border-t border-neutral-900 bg-neutral-950/90 relative z-10">
        <p>
          &copy; {new Date().getFullYear()} NETSO Prints &amp; Ads Studio. Commercial Printing &amp;
          Service Management System.
        </p>
      </footer>
    </div>
  );
}

function Feature({ icon, children }: { icon: React.ReactNode; children: React.ReactNode }) {
  return (
    <div className="flex items-center gap-3.5 text-sm sm:text-base text-neutral-200 font-medium">
      <div className="w-8 h-8 rounded-lg bg-amber-500/15 border border-amber-500/30 flex items-center justify-center text-amber-400 shrink-0">
        {icon}
      </div>
      <span>{children}</span>
    </div>
  );
}

function GoogleLoginButton({
  isSubmitting,
  mode,
  onClick,
}: {
  isSubmitting: boolean;
  mode: AuthMode;
  onClick: () => void;
}) {
  return (
    <div className="space-y-4">
      <button
        type="button"
        onClick={onClick}
        disabled={isSubmitting}
        className="w-full flex items-center justify-center gap-3 bg-neutral-950 hover:bg-neutral-800 text-neutral-100 text-sm font-bold py-3 px-4 rounded-xl border border-neutral-800 hover:border-neutral-700 transition-all shadow-sm disabled:opacity-50 disabled:cursor-not-allowed cursor-pointer"
      >
        <svg className="w-5 h-5" viewBox="0 0 24 24" aria-hidden="true">
          <path
            fill="#EA4335"
            d="M12 5c1.6 0 3 .6 4.1 1.6l3.1-3.1C17.3 1.7 14.8 1 12 1 7.5 1 3.7 3.6 1.9 7.3l3.7 2.9C6.5 7.2 9 5 12 5z"
          />
          <path
            fill="#4285F4"
            d="M23.5 12.3c0-.8-.1-1.6-.2-2.3H12v4.5h6.5c-.3 1.5-1.1 2.8-2.4 3.7l3.7 2.9c2.2-2 3.7-5 3.7-8.8z"
          />
          <path
            fill="#FBBC05"
            d="M5.6 14.8c-.2-.7-.4-1.5-.4-2.3s.2-1.6.4-2.3L1.9 7.3C.7 9.7 0 10.8 0 12.3s.7 2.6 1.9 5l3.7-2.5z"
          />
          <path
            fill="#34A853"
            d="M12 23c3.2 0 6-1.1 8-3l-3.7-2.9c-1.1.7-2.5 1.2-4.3 1.2-3 0-5.5-2.2-6.4-5.2L1.9 16c1.8 3.7 5.6 7 10.1 7z"
          />
        </svg>
        <span>Continue with Google ({mode === 'login' ? 'Log In' : 'Sign Up'})</span>
      </button>
      <div className="relative my-4">
        <div className="absolute inset-0 flex items-center">
          <div className="w-full border-t border-neutral-800" />
        </div>
        <div className="relative flex justify-center text-xs uppercase">
          <span className="bg-neutral-900 px-3 text-neutral-400 font-semibold tracking-wider">
            or continue with password
          </span>
        </div>
      </div>
    </div>
  );
}

export default Authentication;
