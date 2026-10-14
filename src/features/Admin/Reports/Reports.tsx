import React, { useEffect, useState } from 'react';
import {
  Activity,
  Check,
  Download,
  FileText,
  Loader2,
  Wallet,
} from 'lucide-react';
import { FontSizeLevel } from '../../../types';

interface FinancialReport {
  month: string;
  orderCount: number;
  cancelledOrderCount: number;
  bookedValue: number;
  receivables: number;
  collected: number;
  paymentCount: number;
  gcashCollected: number;
  gcashCollectionShare: number;
  completedCount: number;
  categories: Array<{ category: string; orderCount: number; bookedValue: number }>;
  paymentMethods: Array<{ method: string; collected: number; paymentCount: number }>;
}

interface ReportsProps {
  highContrastMode: boolean;
  fontSizeLevel: FontSizeLevel;
  refreshRevision: number;
}

function currentMonth(): string {
  const now = new Date();
  return `${now.getFullYear()}-${String(now.getMonth() + 1).padStart(2, '0')}`;
}

function formatPeso(amount: number): string {
  return `₱${amount.toLocaleString('en-PH', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}`;
}

function csvCell(value: string | number): string {
  return `"${String(value).replace(/"/g, '""')}"`;
}

export function Reports({ highContrastMode, fontSizeLevel, refreshRevision }: ReportsProps) {
  const [month, setMonth] = useState(currentMonth);
  const [report, setReport] = useState<FinancialReport | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');
  const [downloaded, setDownloaded] = useState(false);
  const [retryRevision, setRetryRevision] = useState(0);

  useEffect(() => {
    const controller = new AbortController();
    void fetch(`/api/reports/financial?month=${encodeURIComponent(month)}`, {
      credentials: 'same-origin',
      signal: controller.signal,
    })
      .then(async (response) => {
        const result = await response.json();
        if (!response.ok || !result.ok) {
          throw new Error(result.error || 'Unable to load the financial report.');
        }
        setReport(result.report as FinancialReport);
      })
      .catch((loadError: unknown) => {
        if (controller.signal.aborted) return;
        setError(loadError instanceof Error ? loadError.message : 'Unable to load the financial report.');
      })
      .finally(() => {
        if (!controller.signal.aborted) setLoading(false);
      });
    return () => controller.abort();
  }, [month, retryRevision, refreshRevision]);

  const exportReport = () => {
    if (!report || loading || error) return;
    const rows: Array<Array<string | number>> = [
      ['Financial Report', report.month],
      [],
      ['Metric', 'Value'],
      ['Verified payments collected during month', report.collected],
      ['Payments verified during month', report.paymentCount],
      ['GCash share of verified collections (%)', report.gcashCollectionShare.toFixed(2)],
      ['GCash collected during month', report.gcashCollected],
      ['Orders created during month', report.orderCount],
      ['Cancelled orders created during month', report.cancelledOrderCount],
      ['Booked value of non-cancelled orders created during month', report.bookedValue],
      ['Outstanding balance on non-cancelled orders from this month', report.receivables],
      ['Orders marked completed during month', report.completedCount],
      [],
      ['Bookings by service category', 'Orders', 'Booked value'],
      ...report.categories.map((item) => [item.category, item.orderCount, item.bookedValue]),
      [],
      ['Verified collections by payment method', 'Payments', 'Collected'],
      ...report.paymentMethods.map((item) => [item.method, item.paymentCount, item.collected]),
    ];
    const csv = rows.map((row) => row.map(csvCell).join(',')).join('\r\n');
    const url = URL.createObjectURL(new Blob([csv], { type: 'text/csv;charset=utf-8;' }));
    const link = document.createElement('a');
    link.href = url;
    link.download = `netso-financial-report-${report.month}.csv`;
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
    URL.revokeObjectURL(url);
    setDownloaded(true);
    window.setTimeout(() => setDownloaded(false), 1800);
  };

  const panelClass = highContrastMode
    ? 'bg-zinc-900 border-zinc-700 text-white'
    : 'bg-white border-zinc-300 text-zinc-950';
  const titleClass =
    fontSizeLevel === 'xlarge'
      ? 'text-2xl sm:text-3xl'
      : fontSizeLevel === 'reduced'
        ? 'text-lg sm:text-xl'
        : 'text-xl sm:text-2xl';
  const categoryTotal = report?.categories.reduce((sum, item) => sum + item.bookedValue, 0) ?? 0;

  return (
    <div className="space-y-4 sm:space-y-5">
      <div className="flex flex-col items-start justify-between gap-3 border-b border-[#D4A017] pb-3 sm:flex-row sm:items-center">
        <div>
          <h1 className={`font-black ${highContrastMode ? 'text-white' : 'text-zinc-950'} ${titleClass}`}>
            Financial &amp; Production Reports
          </h1>
          <p className={`mt-0.5 text-xs font-medium sm:text-sm ${highContrastMode ? 'text-zinc-300' : 'text-zinc-600'}`}>
            Verified collections, bookings, outstanding balances, completed orders, and service category totals.
          </p>
        </div>
        <div className="flex w-full flex-wrap items-center gap-2 sm:w-auto">
          <label className="flex items-center gap-2 text-xs font-bold">
            Report month
            <input
              type="month"
              value={month}
              onChange={(event) => {
                if (event.target.value) {
                  setLoading(true);
                  setError('');
                  setMonth(event.target.value);
                }
              }}
              className="min-h-10 rounded-lg border border-zinc-300 bg-white px-2 text-sm text-zinc-900"
            />
          </label>
          <button
            type="button"
            onClick={exportReport}
            disabled={!report || loading || Boolean(error)}
            className="flex min-h-10 items-center gap-1.5 rounded-xl border border-[#D4A017] bg-[#121214] px-4 py-2 text-xs font-extrabold uppercase text-[#D4A017] disabled:cursor-not-allowed disabled:opacity-50 sm:text-sm"
          >
            {downloaded ? <Check className="h-4 w-4 text-emerald-400" /> : <Download className="h-4 w-4" />}
            <span>{downloaded ? 'Report Exported' : 'Export CSV'}</span>
          </button>
        </div>
      </div>

      {error && (
        <div role="alert" className="rounded-xl border border-red-300 bg-red-50 p-4 text-sm font-semibold text-red-800">
          <p>{error}</p>
          <button
            type="button"
            onClick={() => {
              setLoading(true);
              setError('');
              setRetryRevision((value) => value + 1);
            }}
            className="mt-2 underline"
          >
            Retry
          </button>
        </div>
      )}

      {loading && (
        <div className={`flex items-center gap-2 rounded-xl border p-4 text-sm font-semibold ${panelClass}`}>
          <Loader2 className="h-4 w-4 animate-spin" /> Loading financial data…
        </div>
      )}

      {report && !error && (
        <>
          <p className={`text-xs ${highContrastMode ? 'text-zinc-300' : 'text-zinc-600'}`}>
            Collections use payments marked verified in the selected month. Booked value and receivables use orders created in that month; receivables are their current remaining balances. Cancelled order value is excluded.
          </p>

          <div className="grid grid-cols-1 gap-3 sm:grid-cols-2 xl:grid-cols-4">
            <MetricCard
              label="VERIFIED COLLECTIONS"
              value={formatPeso(report.collected)}
              detail={`${report.paymentCount} verified payment${report.paymentCount === 1 ? '' : 's'} in ${report.month}`}
              icon={<Wallet className="h-4 w-4 text-emerald-700" />}
              panelClass={panelClass}
              accent="border-t-emerald-600"
            />
            <MetricCard
              label="BOOKED VALUE"
              value={formatPeso(report.bookedValue)}
              detail={`${report.orderCount} orders · ${report.cancelledOrderCount} cancelled`}
              icon={<FileText className="h-4 w-4 text-[#B8860B]" />}
              panelClass={panelClass}
              accent="border-t-[#D4A017]"
            />
            <MetricCard
              label="OUTSTANDING BALANCE"
              value={formatPeso(report.receivables)}
              detail="Current balances on this month's non-cancelled orders"
              icon={<Wallet className="h-4 w-4 text-red-600" />}
              panelClass={panelClass}
              accent="border-t-red-600"
            />
            <MetricCard
              label="ORDERS COMPLETED"
              value={report.completedCount.toLocaleString('en-PH')}
              detail={`Marked completed during ${report.month}`}
              icon={<Activity className="h-4 w-4 text-blue-700" />}
              panelClass={panelClass}
              accent="border-t-blue-600"
            />
          </div>

          <section className={`space-y-3 rounded-2xl border p-4 sm:p-5 ${panelClass}`}>
            <div>
              <h2 className="text-xs font-extrabold uppercase tracking-wider sm:text-sm">
                Bookings by Service Category
              </h2>
              <p className="mt-1 text-xs text-zinc-500">
                Order value for non-cancelled orders created in {report.month}; this is booked value, not cash collected.
              </p>
            </div>
            {report.categories.length === 0 ? (
              <p className="rounded-lg bg-zinc-100 p-4 text-sm text-zinc-600">No orders were created during this month.</p>
            ) : (
              <div className="space-y-4">
                {report.categories.map((item) => {
                  const share = categoryTotal > 0 ? (item.bookedValue / categoryTotal) * 100 : 0;
                  return (
                    <div key={item.category} className="space-y-1">
                      <div className="flex flex-wrap items-center justify-between gap-2 text-xs font-bold">
                        <span>{item.category} · {item.orderCount} orders</span>
                        <span className="font-mono">{formatPeso(item.bookedValue)} ({share.toFixed(1)}%)</span>
                      </div>
                      <div className="h-2.5 w-full overflow-hidden rounded-full bg-zinc-200">
                        <div
                          className="h-full rounded-full bg-gradient-to-r from-[#D4A017] to-[#B8860B]"
                          style={{ width: `${share}%` }}
                        />
                      </div>
                    </div>
                  );
                })}
              </div>
            )}
          </section>

          <section className={`space-y-3 rounded-2xl border p-4 sm:p-5 ${panelClass}`}>
            <div className="flex flex-wrap items-center justify-between gap-2">
              <h2 className="text-xs font-extrabold uppercase tracking-wider sm:text-sm">
                Collections by Payment Method
              </h2>
              <span className="text-xs font-bold">
                GCash share: {report.gcashCollectionShare.toFixed(1)}% ({formatPeso(report.gcashCollected)})
              </span>
            </div>
            {report.paymentMethods.length === 0 ? (
              <p className="rounded-lg bg-zinc-100 p-4 text-sm text-zinc-600">No payments were verified during this month.</p>
            ) : (
              <div className="overflow-x-auto">
                <table className="w-full min-w-[400px] text-left text-sm">
                  <thead>
                    <tr className="border-b border-zinc-300 text-xs uppercase text-zinc-500">
                      <th className="py-2 pr-3">Method</th>
                      <th className="py-2 pr-3">Verified payments</th>
                      <th className="py-2 text-right">Collected</th>
                    </tr>
                  </thead>
                  <tbody>
                    {report.paymentMethods.map((item) => (
                      <tr key={item.method} className="border-b border-zinc-100 last:border-0">
                        <td className="py-2 pr-3 font-bold">{item.method}</td>
                        <td className="py-2 pr-3">{item.paymentCount}</td>
                        <td className="py-2 text-right font-mono font-bold">{formatPeso(item.collected)}</td>
                      </tr>
                    ))}
                    <tr>
                      <th className="py-2 pr-3 text-left">Total</th>
                      <th className="py-2 pr-3 text-left">{report.paymentCount}</th>
                      <th className="py-2 text-right font-mono">{formatPeso(report.collected)}</th>
                    </tr>
                  </tbody>
                </table>
              </div>
            )}
          </section>
        </>
      )}
    </div>
  );
}

function MetricCard({
  label,
  value,
  detail,
  icon,
  panelClass,
  accent,
}: {
  label: string;
  value: string;
  detail: string;
  icon: React.ReactNode;
  panelClass: string;
  accent: string;
}) {
  return (
    <div className={`rounded-xl border border-t-4 p-4 ${accent} ${panelClass}`}>
      <div className="mb-1 flex items-center justify-between">
        <span className="text-[11px] font-extrabold uppercase text-zinc-500">{label}</span>
        {icon}
      </div>
      <span className="mt-1 block font-mono text-xl font-black sm:text-2xl">{value}</span>
      <span className="mt-1 block text-xs font-semibold text-zinc-500">{detail}</span>
    </div>
  );
}

export default Reports;
