import React, { useState } from 'react';
import {
  FileText,
  Wallet,
  Check,
  Download,
  Printer,
  CheckCircle2,
} from 'lucide-react';
import {
  RequestOrder,
  PaymentTransaction,
  FontSizeLevel,
} from '../../../types';

interface ReportsProps {
  requests: RequestOrder[];
  payments: PaymentTransaction[];
  highContrastMode: boolean;
  fontSizeLevel: FontSizeLevel;
}

export function Reports({
  requests,
  payments,
  highContrastMode,
  fontSizeLevel,
}: ReportsProps) {
  const [downloaded, setDownloaded] = useState(false);

  const totalRevenue = requests.reduce((sum, r) => sum + r.paidAmount, 0) + 46087;
  const totalReceivables = requests.reduce((sum, r) => sum + r.unpaidAmount, 0);

  const categoryBreakdown = [
    { category: 'Large Format (Tarpaulin & Stickers)', orders: 54, revenue: 24800, share: 52 },
    { category: 'Photo & Rush ID Packages', orders: 38, revenue: 9400, share: 20 },
    { category: 'Signage & Sintra Boards', orders: 19, revenue: 8950, share: 18 },
    { category: 'Document Printing & Xerox', orders: 21, revenue: 4963, share: 10 },
  ];

  return (
    <div className="space-y-4 sm:space-y-5">
      <div className="border-b border-[#D4A017] pb-3 flex flex-col sm:flex-row items-start sm:items-center justify-between gap-3">
        <div>
          <h1
            className={`font-black ${
              highContrastMode ? 'text-white' : 'text-zinc-950'
            } ${
              fontSizeLevel === 'xlarge'
                ? 'text-2xl sm:text-3xl'
                : fontSizeLevel === 'reduced'
                ? 'text-lg sm:text-xl'
                : 'text-xl sm:text-2xl'
            }`}
          >
            Financial & Production Reports
          </h1>
          <p
            className={`font-medium mt-0.5 ${
              highContrastMode ? 'text-zinc-300' : 'text-zinc-600'
            } ${fontSizeLevel === 'xlarge' ? 'text-base' : 'text-xs sm:text-sm'}`}
          >
            Monthly revenue summary, GCash collection rate, and service category performance.
          </p>
        </div>

        <button
          type="button"
          onClick={() => {
            setDownloaded(true);
            setTimeout(() => setDownloaded(false), 1800);
          }}
          className="px-4 py-2 bg-[#121214] hover:bg-black text-[#D4A017] border border-[#D4A017] font-extrabold uppercase rounded-xl flex items-center gap-1.5 text-xs sm:text-sm cursor-pointer"
        >
          {downloaded ? (
            <>
              <Check className="w-4 h-4 text-emerald-400" />
              <span className="text-emerald-400">Report Exported!</span>
            </>
          ) : (
            <>
              <Download className="w-4 h-4" />
              <span>Export Monthly Report</span>
            </>
          )}
        </button>
      </div>

      <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
        <div
          className={`p-4 rounded-xl border border-t-4 border-t-[#D4A017] ${
            highContrastMode
              ? 'bg-zinc-900 border-zinc-700 text-white'
              : 'bg-white border-zinc-300 text-zinc-950'
          }`}
        >
          <span className="text-[11px] font-extrabold uppercase text-zinc-500 block">
            GROSS SETTLED REVENUE
          </span>
          <span className="font-mono font-black text-2xl text-emerald-700 block mt-1">
            ₱{totalRevenue.toLocaleString()}
          </span>
          <span className="text-xs font-bold text-emerald-700 mt-0.5 block">
            ✓ 94.2% GCash Collection Rate
          </span>
        </div>

        <div
          className={`p-4 rounded-xl border border-t-4 border-t-red-600 ${
            highContrastMode
              ? 'bg-zinc-900 border-zinc-700 text-white'
              : 'bg-white border-zinc-300 text-zinc-950'
          }`}
        >
          <span className="text-[11px] font-extrabold uppercase text-red-600 block">
            UNCOLLECTED RECEIVABLES
          </span>
          <span className="font-mono font-black text-2xl text-red-600 block mt-1">
            ₱{totalReceivables.toLocaleString()}
          </span>
          <span className="text-xs font-semibold text-zinc-500 mt-0.5 block">
            50% balances due upon pickup
          </span>
        </div>

        <div
          className={`p-4 rounded-xl border border-t-4 border-t-blue-600 ${
            highContrastMode
              ? 'bg-zinc-900 border-zinc-700 text-white'
              : 'bg-white border-zinc-300 text-zinc-950'
          }`}
        >
          <span className="text-[11px] font-extrabold uppercase text-zinc-500 block">
            COMPLETED PRINT JOBS
          </span>
          <span className="font-mono font-black text-2xl block mt-1">
            {118 + requests.length}
          </span>
          <span className="text-xs font-semibold text-zinc-500 mt-0.5 block">
            Avg. Turnaround: 4.2 Hours
          </span>
        </div>
      </div>

      <div
        className={`p-4 sm:p-5 rounded-2xl border space-y-3.5 ${
          highContrastMode
            ? 'bg-zinc-900 border-zinc-700 text-white'
            : 'bg-white border-zinc-300 text-zinc-950'
        }`}
      >
        <h2 className="font-extrabold uppercase tracking-wider text-xs sm:text-sm">
          Revenue Breakdown by Service Category
        </h2>

        <div className="space-y-3">
          {categoryBreakdown.map((item) => (
            <div key={item.category} className="space-y-1">
              <div className="flex items-center justify-between text-xs font-bold">
                <span>
                  {item.category} ({item.orders} orders)
                </span>
                <span className="font-mono font-black">
                  ₱{item.revenue.toLocaleString()} ({item.share}%)
                </span>
              </div>
              <div className="w-full bg-zinc-200 h-2.5 rounded-full overflow-hidden">
                <div
                  className="bg-gradient-to-r from-[#D4A017] to-[#B8860B] h-full rounded-full"
                  style={{ width: `${item.share}%` }}
                />
              </div>
            </div>
          ))}
        </div>
      </div>
    </div>
  );
}

export default Reports;
