'use client';

import React, { useState } from 'react';
import { AlertCircle, ArrowRight, Building, Eye, EyeOff, Lock, Mail } from 'lucide-react';

export type UserRole = 'customer' | 'staff' | 'admin';

export interface LoginFormData {
  email: string;
  idNumber: string;
  password: string;
}

interface LoginProps {
  role: UserRole;
  isSubmitting: boolean;
  onSubmit: (data: LoginFormData) => void;
}

export function Login({ role, isSubmitting, onSubmit }: LoginProps) {
  const [email, setEmail] = useState('alexandrieabon@gmail.com');
  const [idNumber, setIdNumber] = useState(role === 'admin' ? 'ADM-8001' : 'STF-1024');
  const [password, setPassword] = useState('••••••••');
  const [showPassword, setShowPassword] = useState(false);
  const [errors, setErrors] = useState<{ email?: string; idNumber?: string; password?: string }>({});

  const submit = (event: React.FormEvent<HTMLFormElement>) => {
    event.preventDefault();

    const nextErrors: typeof errors = {};

    if (role === 'customer') {
      if (!email.trim()) {
        nextErrors.email = 'Email address is required.';
      } else if (!/\S+@\S+\.\S+/.test(email)) {
        nextErrors.email = 'Please enter a valid email address.';
      }
    } else if (!idNumber.trim()) {
      nextErrors.idNumber = `${role === 'admin' ? 'Admin' : 'Staff'} ID number is required (e.g. ${
        role === 'admin' ? 'ADM-8001' : 'STF-1024'
      }).`;
    }

    if (!password) {
      nextErrors.password = 'Password is required.';
    }

    setErrors(nextErrors);

    if (Object.keys(nextErrors).length === 0) {
      onSubmit({ email, idNumber, password });
    }
  };

  return (
    <form onSubmit={submit} className="space-y-4" noValidate>
      {role === 'customer' ? (
        <div>
          <label className="block text-sm font-bold text-neutral-200 mb-1.5">Email Address</label>
          <div className="relative rounded-xl bg-neutral-950 border border-neutral-800 focus-within:border-amber-500 transition-colors">
            <span className="absolute inset-y-0 left-0 pl-3.5 flex items-center pointer-events-none text-neutral-400">
              <Mail className="w-5 h-5" />
            </span>
            <input
              type="email"
              value={email}
              onChange={(event) => {
                setEmail(event.target.value);
                setErrors((current) => ({ ...current, email: '' }));
              }}
              placeholder="name@company.com"
              className="w-full pl-11 pr-4 py-3 bg-transparent text-sm sm:text-base text-white placeholder-neutral-500 rounded-xl focus:outline-none"
            />
          </div>
          {errors.email && <ErrorMessage message={errors.email} />}
        </div>
      ) : (
        <div>
          <label className="block text-sm font-bold text-neutral-200 mb-1.5">
            {role === 'admin' ? 'Admin ID Number' : 'Staff Employee ID Number'}
          </label>
          <div className="relative rounded-xl bg-neutral-950 border border-neutral-800 focus-within:border-amber-500 transition-colors">
            <span className="absolute inset-y-0 left-0 pl-3.5 flex items-center pointer-events-none text-neutral-400">
              <Building className="w-5 h-5" />
            </span>
            <input
              type="text"
              value={idNumber}
              onChange={(event) => {
                setIdNumber(event.target.value);
                setErrors((current) => ({ ...current, idNumber: '' }));
              }}
              placeholder={role === 'admin' ? 'e.g. ADM-8001' : 'e.g. STF-1024'}
              className="w-full pl-11 pr-4 py-3 bg-transparent text-sm sm:text-base text-white placeholder-neutral-500 font-mono rounded-xl focus:outline-none"
            />
          </div>
          {errors.idNumber && <ErrorMessage message={errors.idNumber} />}
        </div>
      )}

      <div>
        <label className="block text-sm font-bold text-neutral-200 mb-1.5">Password</label>
        <div className="relative rounded-xl bg-neutral-950 border border-neutral-800 focus-within:border-amber-500 transition-colors">
          <span className="absolute inset-y-0 left-0 pl-3.5 flex items-center pointer-events-none text-neutral-400">
            <Lock className="w-5 h-5" />
          </span>
          <input
            type={showPassword ? 'text' : 'password'}
            value={password}
            onChange={(event) => {
              setPassword(event.target.value);
              setErrors((current) => ({ ...current, password: '' }));
            }}
            placeholder="••••••••"
            className="w-full pl-11 pr-11 py-3 bg-transparent text-sm sm:text-base text-white placeholder-neutral-500 rounded-xl focus:outline-none"
          />
          <button
            type="button"
            onClick={() => setShowPassword((current) => !current)}
            className="absolute inset-y-0 right-0 pr-3.5 flex items-center text-neutral-400 hover:text-amber-400 transition-colors cursor-pointer"
            aria-label={showPassword ? 'Hide password' : 'Show password'}
          >
            {showPassword ? <EyeOff className="w-5 h-5" /> : <Eye className="w-5 h-5" />}
          </button>
        </div>
        {errors.password && <ErrorMessage message={errors.password} />}
      </div>

      <button
        type="submit"
        disabled={isSubmitting}
        className="w-full py-3.5 px-5 rounded-xl text-sm sm:text-base font-black uppercase tracking-wider text-neutral-950 bg-gradient-to-r from-amber-500 via-amber-400 to-yellow-300 hover:brightness-110 shadow-[0_0_20px_rgba(212,175,55,0.3)] transition-all flex items-center justify-center gap-2 active:scale-[0.99] mt-4 disabled:opacity-50 disabled:cursor-not-allowed cursor-pointer"
      >
        {isSubmitting ? 'Processing Request...' : `Log In as ${role.toUpperCase()}`}
        {!isSubmitting && <ArrowRight className="w-5 h-5" />}
      </button>
    </form>
  );
}

function ErrorMessage({ message }: { message: string }) {
  return (
    <p className="text-xs sm:text-sm text-red-400 mt-1.5 flex items-center gap-1.5 font-medium">
      <AlertCircle className="w-4 h-4 shrink-0" />
      {message}
    </p>
  );
}

export default Login;
