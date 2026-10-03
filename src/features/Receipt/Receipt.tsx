import React, { useState } from 'react';
import { X, Check, Download } from 'lucide-react';
import { RequestOrder } from '../../types';

interface ReceiptProps {
  order: RequestOrder | null;
  onClose: () => void;
}

export function Receipt({ order, onClose }: ReceiptProps) {
  const [downloaded, setDownloaded] = useState(false);

  if (!order) return null;

  return (
    <div
      className="fixed inset-0 z-50 bg-black/80 backdrop-blur-xs flex items-end sm:items-center justify-center p-0 sm:p-4"
      role="dialog"
      aria-modal="true"
    >
      <div className="bg-white border border-black rounded-t-2xl sm:rounded-2xl max-w-sm sm:max-w-md w-full p-5 space-y-4 shadow-2xl text-zinc-950 relative">
        <button
          type="button"
          onClick={onClose}
          aria-label="Close receipt"
          className="absolute top-4 right-4 text-zinc-500 hover:text-black"
        >
          <X className="w-5 h-5" />
        </button>

        <div className="text-center border-b pb-3 flex flex-col items-center">
          <img
            src="/logo/netso-logo.jpg"
            alt="NETSO Prints Logo"
            className="w-10 h-10 rounded-lg object-contain mb-1.5 border border-zinc-300 shadow-xs"
          />
          <h3 className="font-black text-lg text-zinc-950">NETSO PRINTS & ADS</h3>
          <p className="text-xs text-zinc-600 font-semibold">Official Digital Service Receipt</p>
        </div>

        <div className="space-y-2 font-mono text-xs sm:text-sm">
          <div className="flex justify-between border-b pb-1">
            <span className="text-zinc-600">Receipt Ref:</span>
            <strong className="text-black">{order.id}</strong>
          </div>
          <div className="flex justify-between border-b pb-1">
            <span className="text-zinc-600">Customer:</span>
            <span className="font-bold">{order.customerName}</span>
          </div>
          <div className="flex justify-between border-b pb-1">
            <span className="text-zinc-600">Print Item:</span>
            <span className="text-right font-bold">{order.service}</span>
          </div>
          <div className="flex justify-between border-b pb-1">
            <span className="text-zinc-600">Amount Paid:</span>
            <strong className="text-emerald-700 text-base">₱{order.paidAmount}</strong>
          </div>
          <div className="flex justify-between">
            <span className="text-zinc-600">Payment Reference:</span>
            <span className="text-blue-800 font-bold">
              {order.gcashRefNo || 'Cash Settlement'}
            </span>
          </div>
        </div>

        <button
          type="button"
          onClick={() => {
            setDownloaded(true);
            setTimeout(() => {
              setDownloaded(false);
              onClose();
            }, 1200);
          }}
          className="w-full py-2.5 bg-black text-white font-extrabold uppercase rounded-xl flex items-center justify-center gap-2 min-h-[42px] text-xs sm:text-sm cursor-pointer"
        >
          {downloaded ? (
            <>
              <Check className="w-4 h-4 text-emerald-400" />
              <span className="text-emerald-400">Receipt Saved Successfully!</span>
            </>
          ) : (
            <>
              <Download className="w-4 h-4 text-[#D4A017]" />
              <span>Download Official Receipt</span>
            </>
          )}
        </button>
      </div>
    </div>
  );
}

export default Receipt;
