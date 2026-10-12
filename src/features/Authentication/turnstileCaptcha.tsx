'use client';

import React, { useEffect, useRef, useState } from 'react';
import Script from 'next/script';
import { AlertCircle } from 'lucide-react';

declare global {
  interface Window {
    turnstile?: {
      render: (
        container: HTMLElement,
        options: {
          sitekey: string;
          callback: (token: string) => void;
          'expired-callback'?: () => void;
          'error-callback'?: () => void;
          theme?: 'light' | 'dark' | 'auto';
        }
      ) => string;
      remove: (widgetId: string) => void;
      reset: (widgetId: string) => void;
    };
  }
}

interface TurnstileCaptchaProps {
  onTokenChange: (token: string) => void;
  resetKey: number;
}

export default function TurnstileCaptcha({
  onTokenChange,
  resetKey,
}: TurnstileCaptchaProps) {
  const containerRef = useRef<HTMLDivElement>(null);
  const widgetIdRef = useRef<string | null>(null);
  const callbackRef = useRef(onTokenChange);
  // Initialise from window so a remount with the script already loaded works
  const [scriptLoaded, setScriptLoaded] = useState(false);
  const [error, setError] = useState('');

  useEffect(() => {
    callbackRef.current = onTokenChange;
  }, [onTokenChange]);

  // If the script was already loaded earlier, mark ready immediately.
  // Otherwise poll briefly in case it finishes loading after mount.
  useEffect(() => {
    if (window.turnstile) {
      setScriptLoaded(true);
      return;
    }

    const interval = setInterval(() => {
      if (window.turnstile) {
        setScriptLoaded(true);
        clearInterval(interval);
      }
    }, 100);

    return () => clearInterval(interval);
  }, []);

  // Render the widget
  useEffect(() => {
    if (!scriptLoaded || !window.turnstile || !containerRef.current) return;
    if (widgetIdRef.current) return;

    const siteKey = process.env.NEXT_PUBLIC_TURNSTILE_SITE_KEY;

    if (!siteKey) {
      setError('CAPTCHA configuration is missing.');
      return;
    }

    try {
      widgetIdRef.current = window.turnstile.render(containerRef.current, {
        sitekey: siteKey,
        theme: 'dark',

        callback: (token) => {
          callbackRef.current(token);
          setError('');
        },

        'expired-callback': () => {
          callbackRef.current('');
          setError('CAPTCHA expired. Please verify again.');
        },

        'error-callback': () => {
          callbackRef.current('');
          setError('CAPTCHA failed to load. Please try again.');
        },
      });
    } catch {
      setError('Unable to initialize CAPTCHA. Please refresh the page.');
    }

    return () => {
      if (widgetIdRef.current && window.turnstile) {
        try {
          window.turnstile.remove(widgetIdRef.current);
        } catch {
          /* widget already gone */
        }
      }
      widgetIdRef.current = null;
    };
  }, [scriptLoaded]);

  // Reset after submit
  useEffect(() => {
    if (resetKey > 0 && widgetIdRef.current && window.turnstile) {
      callbackRef.current('');
      setError('');
      window.turnstile.reset(widgetIdRef.current);
    }
  }, [resetKey]);

  return (
    <div className="space-y-2">
      <Script
        id="cloudflare-turnstile-script"
        src="https://challenges.cloudflare.com/turnstile/v0/api.js?render=explicit"
        strategy="afterInteractive"
        onLoad={() => setScriptLoaded(true)}
        onReady={() => setScriptLoaded(true)}
        onError={() => {
          callbackRef.current('');
          setError('Unable to load CAPTCHA. Check your connection.');
        }}
      />

      <div ref={containerRef} className="min-h-[65px] overflow-x-auto" />

      {error && (
        <p
          role="alert"
          className="text-xs sm:text-sm text-red-400 flex items-center gap-1.5"
        >
          <AlertCircle className="w-4 h-4 shrink-0" />
          {error}
        </p>
      )}
    </div>
  );
}