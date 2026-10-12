
'use client';

import React, { useState } from 'react';
import {
  AlertCircle,
  ArrowRight,
  Eye,
  EyeOff,
  KeyRound,
  Lock,
  Mail,
  Phone,
  User,
} from 'lucide-react';
import TurnstileCaptcha from './turnstileCaptcha';

export interface SignupFormData {
  fullName: string;
  email: string;
  phone: string;
  password: string;
  confirmPassword: string;
  captchaToken: string;
}

interface SignupProps {
  isSubmitting: boolean;
  onSubmit: (data: SignupFormData) => void;
}

type SignupErrors = Partial<Record<keyof SignupFormData, string>>;

export function Signup({ isSubmitting, onSubmit }: SignupProps) {
  const [formData, setFormData] = useState<SignupFormData>({
    fullName: '',
    email: '',
    phone: '',
    password: '',
    confirmPassword: '',
    captchaToken: '',
  });

  const [showPassword, setShowPassword] = useState(false);
  const [showConfirmPassword, setShowConfirmPassword] = useState(false);
  const [resetCaptchaKey, setResetCaptchaKey] = useState(0);
  const [errors, setErrors] = useState<SignupErrors>({});

  const updateField = (field: keyof SignupFormData, value: string) => {
    setFormData((current) => ({
      ...current,
      [field]: value,
    }));

    setErrors((current) => ({
      ...current,
      [field]: '',
    }));
  };

  const submit = (event: React.FormEvent<HTMLFormElement>) => {
    event.preventDefault();

    const nextErrors: SignupErrors = {};

    if (!formData.fullName.trim()) {
      nextErrors.fullName = 'Full name is required.';
    }

    if (!formData.email.trim()) {
      nextErrors.email = 'Email address is required.';
    } else if (!/^\S+@\S+\.\S+$/.test(formData.email.trim())) {
      nextErrors.email = 'Please enter a valid email address.';
    }

    if (!formData.phone.trim()) {
      nextErrors.phone = 'Mobile phone number is required.';
    }

    if (!formData.password) {
      nextErrors.password = 'Password is required.';
    } else if (formData.password.length < 12) {
      nextErrors.password = 'Password must be at least 12 characters long.';
    }

    if (!formData.confirmPassword) {
      nextErrors.confirmPassword = 'Please confirm your password.';
    } else if (formData.password !== formData.confirmPassword) {
      nextErrors.confirmPassword = 'Passwords do not match.';
    }

    if (!formData.captchaToken) {
      nextErrors.captchaToken = 'Please complete the CAPTCHA verification.';
    }

    setErrors(nextErrors);

    if (Object.keys(nextErrors).length > 0 || isSubmitting) {
      return;
    }

    const submittedData: SignupFormData = {
      ...formData,
      fullName: formData.fullName.trim(),
      email: formData.email.trim(),
    };

    onSubmit(submittedData);

    setFormData((current) => ({
      ...current,
      captchaToken: '',
    }));

    setResetCaptchaKey((current) => current + 1);
  };

  return (
    <form onSubmit={submit} className="space-y-4" noValidate>
      <Field
        label="Full Name"
        icon={<User className="w-5 h-5" />}
        value={formData.fullName}
        placeholder="e.g. Alexandrie Abon"
        error={errors.fullName}
        onChange={(value) => updateField('fullName', value)}
      />

      <Field
        label="Email Address"
        icon={<Mail className="w-5 h-5" />}
        type="email"
        value={formData.email}
        placeholder="name@company.com"
        error={errors.email}
        onChange={(value) => updateField('email', value)}
      />

      <Field
        label="Mobile Number"
        icon={<Phone className="w-5 h-5" />}
        type="tel"
        value={formData.phone}
        placeholder="+63 912 345 6789"
        error={errors.phone}
        onChange={(value) => updateField('phone', value)}
      />

      <PasswordField
        label="Password"
        value={formData.password}
        showPassword={showPassword}
        error={errors.password}
        onToggle={() => setShowPassword((current) => !current)}
        onChange={(value) => updateField('password', value)}
      />

      <PasswordField
        label="Confirm Password"
        icon={<KeyRound className="w-5 h-5" />}
        value={formData.confirmPassword}
        showPassword={showConfirmPassword}
        error={errors.confirmPassword}
        onToggle={() => setShowConfirmPassword((current) => !current)}
        onChange={(value) => updateField('confirmPassword', value)}
      />

      <div className="space-y-2 pt-2">
        <label className="block text-sm font-bold text-neutral-200">
          Security Verification
        </label>

        <TurnstileCaptcha
          onTokenChange={(token) => updateField('captchaToken', token)}
          resetKey={resetCaptchaKey}
        />

        {errors.captchaToken && (
          <ErrorMessage message={errors.captchaToken} />
        )}
      </div>

      <button
        type="submit"
        disabled={isSubmitting}
        className="w-full py-3.5 px-5 rounded-xl text-sm sm:text-base font-black uppercase tracking-wider text-neutral-950 bg-gradient-to-r from-amber-500 via-amber-400 to-yellow-300 hover:brightness-110 shadow-[0_0_20px_rgba(212,175,55,0.3)] transition-all flex items-center justify-center gap-2 active:scale-[0.99] mt-4 disabled:opacity-50 disabled:cursor-not-allowed cursor-pointer"
      >
        {isSubmitting ? 'Processing Request...' : 'Create Customer Account'}
        {!isSubmitting && <ArrowRight className="w-5 h-5" />}
      </button>
    </form>
  );
}

function Field({
  label,
  icon,
  type = 'text',
  value,
  placeholder,
  error,
  onChange,
}: {
  label: string;
  icon: React.ReactNode;
  type?: string;
  value: string;
  placeholder: string;
  error?: string;
  onChange: (value: string) => void;
}) {
  return (
    <div>
      <label className="block text-sm font-bold text-neutral-200 mb-1.5">
        {label}
      </label>

      <div className="relative rounded-xl bg-neutral-950 border border-neutral-800 focus-within:border-amber-500 transition-colors">
        <span className="absolute inset-y-0 left-0 pl-3.5 flex items-center pointer-events-none text-neutral-400">
          {icon}
        </span>

        <input
          type={type}
          autoComplete={
            type === 'email' ? 'email' : type === 'tel' ? 'tel' : 'name'
          }
          value={value}
          onChange={(event) => onChange(event.target.value)}
          placeholder={placeholder}
          className="w-full pl-11 pr-4 py-3 bg-transparent text-sm sm:text-base text-white placeholder-neutral-500 rounded-xl focus:outline-none"
        />
      </div>

      {error && <ErrorMessage message={error} />}
    </div>
  );
}

function PasswordField({
  label,
  icon = <Lock className="w-5 h-5" />,
  value,
  showPassword,
  error,
  onToggle,
  onChange,
}: {
  label: string;
  icon?: React.ReactNode;
  value: string;
  showPassword: boolean;
  error?: string;
  onToggle: () => void;
  onChange: (value: string) => void;
}) {
  return (
    <div>
      <label className="block text-sm font-bold text-neutral-200 mb-1.5">
        {label}
      </label>

      <div className="relative rounded-xl bg-neutral-950 border border-neutral-800 focus-within:border-amber-500 transition-colors">
        <span className="absolute inset-y-0 left-0 pl-3.5 flex items-center pointer-events-none text-neutral-400">
          {icon}
        </span>

        <input
          type={showPassword ? 'text' : 'password'}
          autoComplete="new-password"
          value={value}
          onChange={(event) => onChange(event.target.value)}
          placeholder="••••••••"
          className="w-full pl-11 pr-11 py-3 bg-transparent text-sm sm:text-base text-white placeholder-neutral-500 rounded-xl focus:outline-none"
        />

        <button
          type="button"
          onClick={onToggle}
          className="absolute inset-y-0 right-0 pr-3.5 flex items-center text-neutral-400 hover:text-amber-400 transition-colors cursor-pointer"
          aria-label={showPassword ? `Hide ${label.toLowerCase()}` : `Show ${label.toLowerCase()}`}
        >
          {showPassword ? (
            <EyeOff className="w-5 h-5" />
          ) : (
            <Eye className="w-5 h-5" />
          )}
        </button>
      </div>

      {error && <ErrorMessage message={error} />}
    </div>
  );
}

function ErrorMessage({ message }: { message: string }) {
  return (
    <p
      role="alert"
      className="text-xs sm:text-sm text-red-400 mt-1.5 flex items-center gap-1.5 font-medium"
    >
      <AlertCircle className="w-4 h-4 shrink-0" />
      {message}
    </p>
  );
}

export default Signup;
