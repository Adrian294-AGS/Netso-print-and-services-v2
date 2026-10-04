'use client';

import React, { useState, useRef } from 'react';
import {
  Wallet,
  X,
  Phone,
  ArrowRight,
  Loader2,
  RefreshCw,
  Check,
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
  onPaymentComplete: (orderId: string, paidAmount: number, refNo: string) => void;
  onUpdateOrderFiles?: (orderId: string, files: UploadedFile[]) => void;
  fontSizeLevel?: FontSizeLevel;
}

export function GCashPayments({
  order,
  isOpen,
  onClose,
  onPaymentComplete,
  onUpdateOrderFiles,
}: GCashPaymentsProps) {
  const [step, setStep] = useState<'upload' | 'select' | 'redirecting' | 'processing' | 'success'>(
    order && order.files.length === 0 ? 'upload' : 'select'
  );
  const [amountType, setAmountType] = useState<'full' | 'downpayment'>('full');
  const [mobileNumber, setMobileNumber] = useState('09171234567');
  const [txnRef, setTxnRef] = useState('');
  const [lastPaid, setLastPaid] = useState(0);
  const [isDragging, setIsDragging] = useState(false);
  const inputRef = useRef<HTMLInputElement>(null);

  if (!isOpen || !order) return null;

  const baseUnpaid = order.unpaidAmount > 0 ? order.unpaidAmount : order.amount;
  const payAmount = amountType === 'full' ? baseUnpaid : Math.ceil(baseUnpaid / 2);

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

  const handleAuthorize = () => {
    setLastPaid(payAmount);
    setStep('redirecting');
    setTimeout(() => {
      setStep('processing');
      setTimeout(() => {
        const ref = `GC-${Math.floor(1000 + Math.random() * 8999)}-${Math.floor(
          1000 + Math.random() * 8999
        )}-${Math.floor(10 + Math.random() * 89)}`;
        setTxnRef(ref);
        onPaymentComplete(order.id, payAmount, ref);
        setStep('success');
      }, 900);
    }, 800);
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

            <div>
              <label className="font-extrabold text-white block mb-1.5 text-xs sm:text-sm">
                Registered GCash Mobile Number
              </label>
              <div className="relative">
                <Phone className="w-4 h-4 text-zinc-400 absolute left-3.5 top-3.5" />
                <input
                  type="text"
                  value={mobileNumber}
                  onChange={(e) => setMobileNumber(e.target.value)}
                  className="w-full bg-[#050C1A] border border-blue-600/80 pl-10 pr-4 py-2.5 rounded-xl font-mono text-sm sm:text-base text-yellow-400 font-bold focus:outline-none focus:ring-2 focus:ring-blue-400"
                />
              </div>
            </div>

            <button
              type="button"
              onClick={handleAuthorize}
              className="w-full py-3.5 bg-blue-600 hover:bg-blue-500 text-white font-extrabold uppercase rounded-xl flex items-center justify-center gap-2 text-xs sm:text-sm shadow-lg cursor-pointer transition-all"
            >
              <span>AUTHORIZE GCASH PAYMENT</span>
              <ArrowRight className="w-4 h-4" />
            </button>
          </div>
        )}

        {step === 'redirecting' && (
          <div className="py-8 text-center space-y-3">
            <Loader2 className="w-10 h-10 text-blue-400 animate-spin mx-auto" />
            <h4 className="font-extrabold text-base sm:text-lg">Opening GCash Gateway...</h4>
          </div>
        )}

        {step === 'processing' && (
          <div className="py-8 text-center space-y-3">
            <RefreshCw className="w-10 h-10 text-yellow-400 animate-spin mx-auto" />
            <h4 className="font-extrabold text-base sm:text-lg">Verifying Transaction...</h4>
          </div>
        )}

        {step === 'success' && (
          <div className="space-y-4 text-center pt-2">
            <div className="flex items-center justify-center gap-2.5">
              <img
                src="/logo/netso-logo.jpg"
                alt="NETSO Prints & Ads Logo"
                className="w-14 h-14 rounded-2xl object-contain border border-[#D4A017]/60 bg-[#0A0A0C] p-0.5 shadow-md"
              />
              <div className="w-14 h-14 bg-emerald-500/15 text-emerald-400 border-2 border-emerald-400 rounded-full flex items-center justify-center">
                <Check className="w-7 h-7" />
              </div>
            </div>
            <div>
              <h3 className="font-black text-xl sm:text-2xl text-white">Payment Successful!</h3>
              <p className="text-xs sm:text-sm text-blue-200 mt-1">
                Your GCash transaction with NETSO Prints &amp; Ads has been officially recorded.
              </p>
            </div>
            <div className="bg-[#050C1A] border border-blue-800/80 rounded-xl p-4 space-y-2.5 text-xs sm:text-sm text-left">
              <div className="flex items-center justify-between">
                <span className="text-zinc-300 font-medium">GCash Ref No:</span>
                <span className="font-mono font-bold text-yellow-400">{txnRef}</span>
              </div>
              <div className="border-t border-blue-900/70 pt-2.5 flex items-center justify-between">
                <span className="text-zinc-300 font-medium">Order ID:</span>
                <span className="font-mono font-bold text-white">{order.id}</span>
              </div>
              <div className="border-t border-blue-900/70 pt-2.5 flex items-center justify-between">
                <span className="text-zinc-300 font-medium">Amount Paid:</span>
                <span className="font-mono font-bold text-emerald-400">
                  ₱{lastPaid.toLocaleString()}
                </span>
              </div>
            </div>
            <button
              type="button"
              onClick={() => {
                setStep('select');
                onClose();
              }}
              className="w-full py-3.5 bg-[#D4A017] hover:bg-[#E6B222] text-black font-extrabold uppercase rounded-xl text-xs sm:text-sm shadow-md cursor-pointer transition-all"
            >
              DONE &amp; RETURN TO DASHBOARD
            </button>
          </div>
        )}
      </div>
    </div>
  );
}

export default GCashPayments;
