import React from 'react';
import { Wallet, Receipt, Paperclip } from 'lucide-react';
import { RequestOrder, FontSizeLevel } from '../../types';
import { StatusBadge } from '../../components/StatusBadge';

interface PrintRequestsProps {
  requests: RequestOrder[];
  onPayOrder: (order: RequestOrder) => void;
  onViewReceipt: (order: RequestOrder) => void;
  highContrastMode: boolean;
  fontSizeLevel: FontSizeLevel;
}

export function PrintRequests({
  requests,
  onPayOrder,
  onViewReceipt,
  highContrastMode,
  fontSizeLevel,
}: PrintRequestsProps) {
  return (
    <div className="space-y-3.5">
      {requests.map((req) => (
        <div
          key={req.id}
          className={`p-3.5 sm:p-4.5 rounded-2xl border space-y-3.5 shadow-xs ${
            highContrastMode
              ? 'bg-zinc-900 border-zinc-700 text-white'
              : 'bg-white border-zinc-300 text-zinc-950'
          }`}
        >
          <div className="flex flex-wrap items-center justify-between gap-2.5 border-b border-zinc-200 pb-2.5">
            <div className="flex items-center gap-2.5">
              <span className="font-mono font-black text-xs sm:text-sm text-black bg-amber-100 px-2.5 py-1 border border-[#D4A017] rounded-lg">
                {req.id}
              </span>
              <div>
                <h3
                  className={`font-extrabold ${
                    fontSizeLevel === 'xlarge' ? 'text-base sm:text-lg' : 'text-sm sm:text-base'
                  }`}
                >
                  {req.service}
                </h3>
                <span className="text-xs text-zinc-500 font-semibold">
                  {req.category} · Ordered on {req.date}
                </span>
              </div>
            </div>
            <StatusBadge status={req.status} unpaidAmount={req.unpaidAmount} />
          </div>

          <div className="grid grid-cols-2 sm:grid-cols-4 gap-2.5 p-2.5 rounded-xl border border-amber-300 bg-amber-50/70 text-zinc-950">
            <div>
              <span className="font-extrabold text-[10px] uppercase text-zinc-600 block">
                Total Amount
              </span>
              <span className="font-mono font-black text-sm sm:text-lg">₱{req.amount}</span>
            </div>
            <div>
              <span className="font-extrabold text-[10px] uppercase text-zinc-600 block">
                Amount Paid
              </span>
              <span className="font-mono font-black text-sm sm:text-lg text-emerald-700">
                ₱{req.paidAmount}
              </span>
            </div>
            <div>
              <span className="font-extrabold text-[10px] uppercase text-zinc-600 block">
                Unpaid Balance
              </span>
              <span className="font-mono font-black text-sm sm:text-lg text-red-600">
                ₱{req.unpaidAmount}
              </span>
            </div>
            <div>
              <span className="font-extrabold text-[10px] uppercase text-zinc-600 block">
                Payment Method
              </span>
              <span className="font-extrabold text-xs sm:text-sm">
                {req.paymentMethod || 'Pending GCash'}
              </span>
            </div>
          </div>

          <div className="flex flex-col sm:flex-row justify-between items-stretch sm:items-center gap-2.5">
            <span className="text-xs italic text-zinc-500">{req.notes}</span>
            {req.unpaidAmount > 0 ? (
              <button
                type="button"
                onClick={() => onPayOrder(req)}
                className="px-4 py-2 bg-gradient-to-r from-blue-600 to-blue-700 text-white font-extrabold text-xs sm:text-sm rounded-xl flex items-center justify-center gap-1.5 cursor-pointer"
              >
                <Wallet className="w-4 h-4" />
                <span>Pay Remaining ₱{req.unpaidAmount} via GCash</span>
              </button>
            ) : (
              <button
                type="button"
                onClick={() => onViewReceipt(req)}
                className="px-3.5 py-1.5 border border-zinc-700 hover:bg-zinc-100 text-zinc-950 font-bold text-xs sm:text-sm rounded-lg flex items-center justify-center gap-1.5 cursor-pointer"
              >
                <Receipt className="w-3.5 h-3.5" />
                <span>View Official Receipt</span>
              </button>
            )}
          </div>
        </div>
      ))}
    </div>
  );
}

export default PrintRequests;
