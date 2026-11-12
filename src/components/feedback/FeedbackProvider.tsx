'use client';

import React, {
  createContext,
  useCallback,
  useContext,
  useEffect,
  useRef,
  useState,
} from 'react';
import { AlertCircle, CheckCircle2, Info, X } from 'lucide-react';

type ToastVariant = 'success' | 'error' | 'info';

interface ToastMessage {
  id: string;
  message: string;
  variant: ToastVariant;
}

export interface ConfirmationOptions {
  title: string;
  message: string;
  confirmLabel?: string;
  cancelLabel?: string;
  destructive?: boolean;
}

interface ConfirmationRequest extends ConfirmationOptions {
  resolve: (accepted: boolean) => void;
}

interface FeedbackContextValue {
  notify: (message: string, variant?: ToastVariant) => void;
  confirm: (options: ConfirmationOptions) => Promise<boolean>;
}

const FeedbackContext = createContext<FeedbackContextValue | null>(null);

export function FeedbackProvider({ children }: { children: React.ReactNode }) {
  const [toasts, setToasts] = useState<ToastMessage[]>([]);
  const [confirmation, setConfirmation] = useState<ConfirmationRequest | null>(null);
  const activeConfirmation = useRef<ConfirmationRequest | null>(null);
  const queuedConfirmations = useRef<ConfirmationRequest[]>([]);
  const toastTimers = useRef(new Map<string, ReturnType<typeof setTimeout>>());
  const nextToastId = useRef(0);

  const dismissToast = useCallback((id: string) => {
    const timer = toastTimers.current.get(id);
    if (timer) clearTimeout(timer);
    toastTimers.current.delete(id);
    setToasts((current) => current.filter((toast) => toast.id !== id));
  }, []);

  const notify = useCallback(
    (message: string, variant: ToastVariant = 'info') => {
      const id = `${Date.now()}-${nextToastId.current++}`;
      setToasts((current) => [...current, { id, message, variant }].slice(-4));
      toastTimers.current.set(
        id,
        setTimeout(() => dismissToast(id), 5000),
      );
    },
    [dismissToast],
  );

  const confirm = useCallback((options: ConfirmationOptions) => {
    return new Promise<boolean>((resolve) => {
      const request = { ...options, resolve };
      if (activeConfirmation.current) {
        queuedConfirmations.current.push(request);
        return;
      }
      activeConfirmation.current = request;
      setConfirmation(request);
    });
  }, []);

  const settleConfirmation = useCallback((accepted: boolean) => {
    const current = activeConfirmation.current;
    if (!current) return;
    current.resolve(accepted);
    const next = queuedConfirmations.current.shift() ?? null;
    activeConfirmation.current = next;
    setConfirmation(next);
  }, []);

  useEffect(() => {
    if (!confirmation) return;
    const handleKeyDown = (event: KeyboardEvent) => {
      if (event.key === 'Escape') settleConfirmation(false);
    };
    window.addEventListener('keydown', handleKeyDown);
    return () => window.removeEventListener('keydown', handleKeyDown);
  }, [confirmation, settleConfirmation]);

  useEffect(
    () => () => {
      toastTimers.current.forEach((timer) => clearTimeout(timer));
      toastTimers.current.clear();
    },
    [],
  );

  const contextValue = React.useMemo(() => ({ notify, confirm }), [notify, confirm]);

  return (
    <FeedbackContext.Provider value={contextValue}>
      {children}
      <div className="fixed right-4 top-4 z-[200] flex w-[min(24rem,calc(100vw-2rem))] flex-col gap-2">
        {toasts.map((toast) => {
          const Icon =
            toast.variant === 'error'
              ? AlertCircle
              : toast.variant === 'success'
                ? CheckCircle2
                : Info;
          const color =
            toast.variant === 'error'
              ? 'border-red-500 text-red-200'
              : toast.variant === 'success'
                ? 'border-emerald-500 text-emerald-200'
                : 'border-[#D4A017] text-amber-200';
          return (
            <div
              key={toast.id}
              role={toast.variant === 'error' ? 'alert' : 'status'}
              className={`flex items-start gap-3 rounded-xl border bg-neutral-950 px-4 py-3 text-sm font-semibold text-white shadow-2xl ${color}`}
            >
              <Icon className="mt-0.5 h-4 w-4 shrink-0" />
              <span className="min-w-0 flex-1">{toast.message}</span>
              <button
                type="button"
                onClick={() => dismissToast(toast.id)}
                className="shrink-0 text-zinc-400 hover:text-white"
                aria-label="Dismiss notification"
              >
                <X className="h-4 w-4" />
              </button>
            </div>
          );
        })}
      </div>
      {confirmation && (
        <div
          className="fixed inset-0 z-[210] flex items-end justify-center bg-black/75 p-0 backdrop-blur-sm sm:items-center sm:p-4"
          role="presentation"
        >
          <section
            role="alertdialog"
            aria-modal="true"
            aria-labelledby="feedback-confirm-title"
            aria-describedby="feedback-confirm-message"
            className="w-full max-w-md space-y-4 rounded-t-2xl border border-[#D4A017] bg-white p-5 text-zinc-950 shadow-2xl sm:rounded-2xl"
          >
            <div>
              <h2 id="feedback-confirm-title" className="text-lg font-black">
                {confirmation.title}
              </h2>
              <p id="feedback-confirm-message" className="mt-2 text-sm leading-relaxed text-zinc-700">
                {confirmation.message}
              </p>
            </div>
            <div className="flex justify-end gap-2">
              <button
                type="button"
                onClick={() => settleConfirmation(false)}
                className="rounded-lg border border-zinc-300 px-4 py-2 text-sm font-bold text-zinc-700 hover:bg-zinc-100"
              >
                {confirmation.cancelLabel ?? 'Cancel'}
              </button>
              <button
                type="button"
                autoFocus
                onClick={() => settleConfirmation(true)}
                className={`rounded-lg px-4 py-2 text-sm font-extrabold text-white ${
                  confirmation.destructive
                    ? 'bg-red-600 hover:bg-red-700'
                    : 'bg-[#121214] hover:bg-zinc-800'
                }`}
              >
                {confirmation.confirmLabel ?? 'Confirm'}
              </button>
            </div>
          </section>
        </div>
      )}
    </FeedbackContext.Provider>
  );
}

export function useFeedback(): FeedbackContextValue {
  const context = useContext(FeedbackContext);
  if (!context) throw new Error('useFeedback must be used within FeedbackProvider.');
  return context;
}
