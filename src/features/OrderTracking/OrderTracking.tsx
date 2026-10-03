import React from 'react';
import { CheckCircle2, Wallet } from 'lucide-react';
import { RequestOrder, FontSizeLevel } from '../../types';
import { StatusBadge } from '../../components/StatusBadge';

interface OrderTrackingProps {
  requests: RequestOrder[];
  onPayOrder: (order: RequestOrder) => void;
  highContrastMode: boolean;
  fontSizeLevel: FontSizeLevel;
}

export function OrderTracking({
  requests,
  onPayOrder,
  highContrastMode,
  fontSizeLevel,
}: OrderTrackingProps) {
  return (
    <div className="space-y-2.5">
      {requests.map((req) => (
        <div
          key={req.id}
          className={`p-3.5 sm:p-4 rounded-xl border space-y-3 shadow-xs ${
            highContrastMode
              ? 'bg-zinc-900 border-zinc-700 text-white'
              : 'bg-white border-zinc-300 text-zinc-950'
          }`}
        >
          <div className="flex flex-wrap items-center justify-between gap-2 border-b border-zinc-200 pb-2.5">
            <div className="flex items-center gap-2">
              <span className="font-mono font-bold text-xs text-zinc-950 bg-amber-100 px-2 py-0.5 border border-[#D4A017] rounded-lg">
                {req.id}
              </span>
              <span
                className={`font-extrabold ${
                  fontSizeLevel === 'xlarge' ? 'text-base' : 'text-sm'
                }`}
              >
                {req.service}
              </span>
            </div>
            <StatusBadge status={req.status} unpaidAmount={req.unpaidAmount} />
          </div>

          <div className="space-y-1.5">
            <div className="grid grid-cols-2 sm:grid-cols-4 gap-1 font-bold text-[10px] sm:text-[11px] text-zinc-600 dark:text-zinc-300">
              <span className={req.progressStage >= 1 ? 'text-[#B8860B] font-extrabold' : ''}>
                1. Order Placed
              </span>
              <span className={req.progressStage >= 2 ? 'text-[#B8860B] font-extrabold' : ''}>
                2. Pre-Press & Layout
              </span>
              <span className={req.progressStage >= 3 ? 'text-[#B8860B] font-extrabold' : ''}>
                3. Printing Stage
              </span>
              <span className={req.progressStage >= 4 ? 'text-emerald-700 font-extrabold' : ''}>
                4. Ready for Pickup
              </span>
            </div>
            <div className="w-full bg-zinc-200 h-2 rounded-full overflow-hidden">
              <div
                className="bg-gradient-to-r from-[#D4A017] via-amber-500 to-emerald-500 h-full transition-all duration-500"
                style={{ width: `${(req.progressStage / 4) * 100}%` }}
              />
            </div>
          </div>

          <div className="flex flex-col sm:flex-row justify-between items-stretch sm:items-center gap-2 pt-1">
            <span className="font-mono font-bold text-xs sm:text-sm">
              Total: ₱{req.amount} · Unpaid:{' '}
              <strong className="text-red-600 font-extrabold">₱{req.unpaidAmount}</strong>
            </span>

            {req.unpaidAmount > 0 ? (
              <button
                type="button"
                onClick={() => onPayOrder(req)}
                className="px-3.5 py-1.5 bg-blue-600 hover:bg-blue-700 text-white font-extrabold text-xs rounded-lg flex items-center justify-center gap-1.5 cursor-pointer"
              >
                <Wallet className="w-3.5 h-3.5" />
                <span>GCash Pay (₱{req.unpaidAmount})</span>
              </button>
            ) : (
              <span className="text-xs font-bold text-emerald-700 flex items-center gap-1">
                <CheckCircle2 className="w-4 h-4 text-emerald-600" />
                <span>Fully Settled ({req.gcashRefNo || 'Cash'})</span>
              </span>
            )}
          </div>
        </div>
      ))}
    </div>
  );
}

export default OrderTracking;
