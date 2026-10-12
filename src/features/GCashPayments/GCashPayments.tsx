'use client';

import React, { useState, useRef } from 'react';
import {
  Wallet,
  X,
  ArrowRight,
  Loader2,
  Upload,
  FileText,
  Trash2,
} from 'lucide-react';
import { RequestOrder, UploadedFile, FontSizeLevel } from '../../types';

const ACCEPTED_EXTENSIONS = ['pdf', 'png', 'jpg', 'jpeg', 'ai', 'psd'];
const IMAGE_EXTENSIONS = ['png', 'jpg', 'jpeg'];
const MAX_FILE_SIZE_MB = 100;

const getExtension = (fileName: string) => (fileName.split('.').pop() || '').toLowerCase();

const formatBytes = (bytes: number) => {
  if (bytes < 1024) return `${bytes} B`;
  if (bytes < 1024 * 1024) return `${Math.round(bytes / 1024)} KB`;
  return `${(bytes / (1024 * 1024)).toFixed(1)} MB`;
};

interface GCashPaymentsProps {
  order: RequestOrder | null;
  isOpen: boolean;
  onClose: () => void;
  onUpdateOrderFiles?: (orderId: string, files: UploadedFile[]) => void;
  fontSizeLevel?: FontSizeLevel;
}

export function GCashPayments({
  order,
  isOpen,
  onClose,
  onUpdateOrderFiles,
}: GCashPaymentsProps) {
  const [step, setStep] = useState<'upload' | 'select' | 'redirecting'>(
    order && order.files.length === 0 ? 'upload' : 'select',
  );
  const [amountType, setAmountType] = useState<'full' | 'downpayment'>('full');
  const [isDragging, setIsDragging] = useState(false);
  const inputRef = useRef<HTMLInputElement>(null);

  if (!isOpen || !order) return null;

  const baseUnpaid = order.unpaidAmount > 0 ? order.unpaidAmount : order.amount;

  const addFiles = (incoming: File[]) => {
    if (!onUpdateOrderFiles) return;
    const accepted: UploadedFile[] = [];
    incoming.forEach((file) => {
      const ext = getExtension(file.name);
      if (ACCEPTED_EXTENSIONS.includes(ext) && file.size <= MAX_FILE_SIZE_MB * 1024 * 1024) {
        accepted.push({
          id: `${Date.now()}-${Math.random().toString(36).slice(2, 8)}`,
          name: file.name,
          size: file.size,
          ext,
          file,
          previewUrl: IMAGE_EXTENSIONS.includes(ext) ? URL.createObjectURL(file) : undefined,
        });
      }
    });
    if (accepted.length > 0) {
      onUpdateOrderFiles(order.id, [...order.files, ...accepted]);
    }
  };

  const handleAuthorize = async () => {
    setStep('redirecting');
    try {
      const response = await fetch('/api/payments/checkout', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          requestId: order.id,
          paymentType: amountType === 'full' ? 'Full Payment' : '50% Down Payment',
        }),
      });
      const result = await response.json();
      if (!response.ok) throw new Error(result.error || 'Unable to start GCash checkout.');
      if (typeof result.checkoutUrl !== 'string') {
        throw new Error('PayMongo did not return a checkout link. Please try again.');
      }
      const selectedPaymentType =
        amountType === 'full' ? 'Full Payment' : '50% Down Payment';
      if (
        result.reused &&
        result.payment &&
        result.payment.paymentType !== selectedPaymentType &&
        !window.confirm(
          `An existing ${result.payment.paymentType} checkout for ₱${Number(
            result.payment.amount,
          ).toLocaleString()} is still open. Continue with that checkout?`,
        )
      ) {
        setStep('select');
        return;
      }
      window.location.assign(result.checkoutUrl);
    } catch (error) {
      console.error('Unable to start PayMongo GCash checkout:', error);
      setStep('select');
      window.alert(error instanceof Error ? error.message : 'Unable to start GCash checkout.');
    }
  };

  return (
    <div
      className="fixed inset-0 z-50 bg-black/85 backdrop-blur-sm flex items-center justify-center p-4 overflow-y-auto"
      role="dialog"
      aria-modal="true"
    >
      <div className="bg-[#071126] border border-blue-500/80 rounded-2xl max-w-md w-full p-5 sm:p-6 space-y-4 text-white shadow-[0_0_40px_rgba(37,99,235,0.25)]">
        <div className="flex items-center justify-between border-b border-blue-800/80 pb-3.5">
          <div className="flex items-center gap-3">
            <img
              src="/logo/netso-logo.jpg"
              alt="NETSO Prints & Ads Logo"
              className="w-11 h-11 rounded-xl object-contain shrink-0 border border-[#D4A017]/60 bg-[#0A0A0C] p-0.5 shadow-md"
            />
            <div className="w-10 h-10 rounded-xl bg-blue-600 flex items-center justify-center shrink-0 shadow-md">
              <Wallet className="w-5 h-5 text-white" />
            </div>
            <div>
              <h3 className="font-extrabold text-base sm:text-lg text-white leading-tight">
                GCash Instant Checkout
              </h3>
              <span className="text-xs text-blue-300 font-mono block mt-0.5">
                NETSO Prints &amp; Ads · 256-Bit SSL Encrypted
              </span>
            </div>
          </div>
          <button
            type="button"
            onClick={onClose}
            className="p-1 text-zinc-400 hover:text-white rounded-lg cursor-pointer"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        {step === 'upload' && (
          <div className="space-y-4">
            <div className="bg-[#0B1D3A] border border-blue-500/50 rounded-xl p-4 space-y-1">
              <span className="text-[11px] sm:text-xs font-extrabold uppercase tracking-wider text-blue-300 block">
                ORDER TO BE PAID:
              </span>
              <p className="font-extrabold text-base sm:text-lg text-white">{order.service}</p>
              <p className="text-xs sm:text-sm text-zinc-300">
                Order Reference:{' '}
                <span className="font-mono font-bold text-yellow-400">{order.id}</span>
              </p>
            </div>

            <p className="text-xs sm:text-sm text-zinc-200 leading-relaxed">
              Please attach your design files (PDF, PNG, JPG) before paying so our operator can
              begin pre-press immediately upon confirmation.
            </p>

            <div
              role="button"
              tabIndex={0}
              onClick={() => inputRef.current?.click()}
              onKeyDown={(e) => {
                if (e.key === 'Enter' || e.key === ' ') {
                  e.preventDefault();
                  inputRef.current?.click();
                }
              }}
              onDragOver={(e) => {
                e.preventDefault();
                setIsDragging(true);
              }}
              onDragLeave={() => setIsDragging(false)}
              onDrop={(e) => {
                e.preventDefault();
                setIsDragging(false);
                addFiles(Array.from(e.dataTransfer.files));
              }}
              className={`cursor-pointer rounded-2xl border-2 border-dashed px-4 py-6 text-center transition-all min-h-[140px] flex flex-col items-center justify-center ${
                isDragging
                  ? 'border-yellow-400 bg-yellow-400/15'
                  : 'border-[#D4A017]/80 bg-[#050C1A] hover:border-yellow-400 hover:bg-[#09152B]'
              }`}
            >
              <div className="w-11 h-11 rounded-full bg-amber-500/20 text-yellow-400 flex items-center justify-center mb-2">
                <Upload className="w-5 h-5" />
              </div>
              <p className="font-extrabold text-sm sm:text-base text-white">
                Drag &amp; drop design files or tap to browse
              </p>
              <span className="font-bold underline text-xs sm:text-sm text-yellow-400 mt-0.5">
                Choose from device
              </span>
              <p className="mt-1.5 text-xs font-medium text-zinc-300">
                PDF, PNG, JPG, AI, PSD · Up to {MAX_FILE_SIZE_MB} MB · Multiple files
              </p>
            </div>

            <input
              ref={inputRef}
              type="file"
              multiple
              accept={ACCEPTED_EXTENSIONS.map((ext) => `.${ext}`).join(',')}
              className="hidden"
              onChange={(e) => {
                addFiles(Array.from(e.target.files || []));
                e.target.value = '';
              }}
            />

            {order.files.length > 0 && (
              <ul className="space-y-2">
                {order.files.map((f) => (
                  <li
                    key={f.id}
                    className="flex items-center gap-3 rounded-xl border border-blue-600/80 bg-[#0B1A33] p-3 text-white"
                  >
                    <FileText className="w-5 h-5 text-[#D4A017] shrink-0" />
                    <div className="min-w-0 flex-1 text-left">
                      <p className="font-bold truncate text-sm">{f.name}</p>
                      <p className="text-xs opacity-75">
                        {f.ext.toUpperCase()} · {formatBytes(f.size)}
                      </p>
                    </div>
                    {onUpdateOrderFiles && (
                      <button
                        type="button"
                        onClick={() =>
                          onUpdateOrderFiles(
                            order.id,
                            order.files.filter((item) => item.id !== f.id)
                          )
                        }
                        className="p-1.5 text-red-400 hover:bg-red-500/10 rounded-lg cursor-pointer"
                      >
                        <Trash2 className="w-4 h-4" />
                      </button>
                    )}
                  </li>
                ))}
              </ul>
            )}

            <button
              type="button"
              onClick={() => setStep('select')}
              className={`w-full py-3.5 font-extrabold uppercase rounded-xl text-xs sm:text-sm flex items-center justify-center gap-2 transition-all cursor-pointer ${
                order.files.length > 0
                  ? 'bg-blue-600 hover:bg-blue-500 text-white shadow-lg'
                  : 'bg-zinc-700/80 hover:bg-zinc-600 text-zinc-200'
              }`}
            >
              <span>CONTINUE TO PAYMENT SELECTION</span>
              <ArrowRight className="w-4 h-4" />
            </button>
          </div>
        )}

        {step === 'select' && (
          <div className="space-y-4">
            <div className="bg-[#0B1D3A] border border-blue-500/50 rounded-xl p-4 space-y-1">
              <span className="text-[11px] sm:text-xs font-extrabold uppercase tracking-wider text-blue-300 block">
                CONFIRMING ORDER:
              </span>
              <p className="font-extrabold text-base sm:text-lg text-white">{order.service}</p>
              <p className="text-xs sm:text-sm text-zinc-300">
                Order ID: <span className="font-mono font-bold text-yellow-400">{order.id}</span>
              </p>
            </div>

            <div>
              <label className="font-extrabold text-xs sm:text-sm text-white block mb-2">
                Choose Payment Option:
              </label>
              <div className="grid grid-cols-2 gap-3">
                <button
                  type="button"
                  onClick={() => setAmountType('full')}
                  className={`p-3.5 rounded-xl text-left transition-all cursor-pointer ${
                    amountType === 'full'
                      ? 'border-2 border-[#E6B222] bg-[#D4A017]/25 text-yellow-300 shadow-md'
                      : 'border border-blue-700/80 bg-[#0B1A33] text-white hover:border-blue-500'
                  }`}
                >
                  <span
                    className={`block text-[10px] sm:text-xs uppercase font-extrabold tracking-wider ${
                      amountType === 'full' ? 'text-yellow-300' : 'text-zinc-300'
                    }`}
                  >
                    FULL SETTLEMENT
                  </span>
                  <span className="text-lg sm:text-xl font-mono font-black mt-1 block">
                    ₱{baseUnpaid.toLocaleString()}
                  </span>
                </button>

                <button
                  type="button"
                  onClick={() => setAmountType('downpayment')}
                  className={`p-3.5 rounded-xl text-left transition-all cursor-pointer ${
                    amountType === 'downpayment'
                      ? 'border-2 border-[#E6B222] bg-[#D4A017]/25 text-yellow-300 shadow-md'
                      : 'border border-blue-700/80 bg-[#0B1A33] text-white hover:border-blue-500'
                  }`}
                >
                  <span
                    className={`block text-[10px] sm:text-xs uppercase font-extrabold tracking-wider ${
                      amountType === 'downpayment' ? 'text-yellow-300' : 'text-zinc-300'
                    }`}
                  >
                    50% DEPOSIT
                  </span>
                  <span className="text-lg sm:text-xl font-mono font-black mt-1 block">
                    ₱{Math.ceil(baseUnpaid / 2).toLocaleString()}
                  </span>
                </button>
              </div>
            </div>

            <p className="text-xs sm:text-sm text-blue-200">
              You will be redirected to PayMongo to securely complete your GCash payment.
            </p>
            <button
              type="button"
              onClick={handleAuthorize}
              className="w-full py-3.5 bg-blue-600 hover:bg-blue-500 text-white font-extrabold uppercase rounded-xl flex items-center justify-center gap-2 text-xs sm:text-sm shadow-lg cursor-pointer transition-all"
            >
              <span>CONTINUE TO GCASH CHECKOUT</span>
              <ArrowRight className="w-4 h-4" />
            </button>
          </div>
        )}

        {step === 'redirecting' && (
          <div className="py-8 text-center space-y-3">
            <Loader2 className="w-10 h-10 text-blue-400 animate-spin mx-auto" />
            <h4 className="font-extrabold text-base sm:text-lg">Opening PayMongo Checkout...</h4>
          </div>
        )}
      </div>
    </div>
  );
}

export default GCashPayments;
