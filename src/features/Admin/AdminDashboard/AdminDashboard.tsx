'use client';

import React from 'react';
import {
  LayoutGrid,
  PlusCircle,
  Sparkles,
  Wallet,
  ChevronRight,
  Activity,
} from 'lucide-react';
import {
  RequestOrder,
  OrderStatus,
  UserLogEntry,
  FontSizeLevel,
} from '../../../types';
import { StatusBadge } from '../../../components/StatusBadge';
import { StatusCard } from '../../../components/StatusCard';

interface AdminDashboardProps {
  requests: RequestOrder[];
  userLogs: UserLogEntry[];
  stats: {
    totalRequests: number;
    pending: number;
    processing: number;
    ready: number;
    completed: number;
    unpaid: number;
    totalUnpaidAmount: number;
  };
  onOpenWalkInModal: () => void;
  onNavigateTab: (tab: any, filter?: string) => void;
  onUpdateOrderStatus: (orderId: string, newStatus: OrderStatus, newStage: number) => void;
  onSelectOrder: (order: RequestOrder) => void;
  highContrastMode: boolean;
  fontSizeLevel: FontSizeLevel;
}

export function AdminDashboard({
  requests,
  userLogs,
  stats,
  onOpenWalkInModal,
  onNavigateTab,
  onUpdateOrderStatus,
  onSelectOrder,
  highContrastMode,
}: AdminDashboardProps) {
  return (
    <div className="space-y-5 sm:space-y-6">
      {/* Hero Banner */}
      <div className="bg-[#111113] text-white p-5 sm:p-6 rounded-2xl border border-zinc-800 shadow-lg relative overflow-hidden flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4">
        <div className="flex items-start sm:items-center gap-4 max-w-2xl">
          <img
            src="/logo/netso-logo.jpg"
            alt="NETSO Prints & Ads Logo"
            className="w-16 h-16 sm:w-20 sm:h-20 rounded-2xl object-contain shrink-0 border-2 border-[#D4A017]/70 bg-[#0A0A0C] p-1 shadow-lg"
          />
          <div className="space-y-2">
            <div className="inline-flex items-center gap-2 bg-[#D4A017]/20 border border-[#D4A017]/50 px-3 py-1 rounded-full text-xs sm:text-sm font-extrabold text-[#E6B222]">
              <Sparkles className="w-4 h-4 shrink-0" />
              <span>NETSO Service Management &amp; Admin Operations Portal</span>
            </div>

            <h1 className="font-extrabold text-white tracking-tight text-xl sm:text-2xl lg:text-3xl">
              Admin Service Overview — Welcome, Ron!
            </h1>

            <p className="text-zinc-200 leading-relaxed font-medium text-sm sm:text-base">
              Manage customer service requests, update 4-stage order statuses, verify{' '}
              <strong>GCash</strong> payment references, coordinate{' '}
              <strong>Admin Operators</strong>, and audit real-time{' '}
              <strong>User Logs</strong>.
            </p>
          </div>
        </div>

        <button
          type="button"
          onClick={onOpenWalkInModal}
          className="px-5 py-3 bg-gradient-to-r from-[#D4A017] to-[#B8860B] hover:from-[#E6B222] hover:to-[#C99718] text-black font-extrabold uppercase tracking-wide rounded-xl shadow-lg transition-transform active:scale-95 flex items-center justify-center gap-2 text-sm sm:text-base border border-amber-300 cursor-pointer shrink-0"
        >
          <PlusCircle className="w-5 h-5 shrink-0" />
          <span>+ Walk-In Request</span>
        </button>
      </div>

      {/* 6 Summary Stat Cards */}
      <div className="space-y-3">
        <div className="flex items-center justify-between">
          <h2
            className={`font-extrabold uppercase tracking-wider flex items-center gap-2 text-sm sm:text-base ${
              highContrastMode ? 'text-yellow-300' : 'text-zinc-900'
            }`}
          >
            <LayoutGrid className="w-5 h-5 text-[#B8860B]" />
            <span>Service Management Summary (6 Key Metrics)</span>
          </h2>
          <span className="text-xs sm:text-sm font-bold text-zinc-600">
            Click any metric to filter requests
          </span>
        </div>

        <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-6 gap-3.5">
          <StatusCard
            label="TOTAL REQUESTS"
            value={stats.totalRequests}
            subtitle="All service orders"
            accentColor="border-t-[#D4A017]"
            highContrastMode={highContrastMode}
            onClick={() => onNavigateTab('orders', 'All')}
          />
          <StatusCard
            label="PENDING"
            value={stats.pending}
            subtitle="Awaiting confirmation"
            accentColor="border-t-amber-500"
            highContrastMode={highContrastMode}
            onClick={() => onNavigateTab('orders', 'In Pre-Press')}
          />
          <StatusCard
            label="IN PROGRESS"
            value={stats.processing}
            subtitle="Confirmed & processing"
            accentColor="border-t-blue-600"
            highContrastMode={highContrastMode}
            onClick={() => onNavigateTab('production')}
          />
          <StatusCard
            label="READY FOR PICKUP"
            value={stats.ready}
            subtitle="Main Branch desk"
            accentColor="border-t-emerald-600"
            highContrastMode={highContrastMode}
            onClick={() => onNavigateTab('orders', 'Ready for Pickup')}
          />
          <StatusCard
            label="COMPLETED"
            value={stats.completed}
            subtitle="Released to clients"
            accentColor="border-t-emerald-700"
            highContrastMode={highContrastMode}
            onClick={() => onNavigateTab('orders', 'Completed')}
          />
          <StatusCard
            label="UNPAID BALANCE"
            value={stats.unpaid}
            subtitle={`₱${stats.totalUnpaidAmount} due`}
            accentColor="border-t-red-600"
            isAlert
            highContrastMode={highContrastMode}
            onClick={() => onNavigateTab('payments')}
          />
        </div>
      </div>

      {/* GCash Verification Alert Banner */}
      <div
        className={`p-5 rounded-2xl border shadow-md flex flex-col sm:flex-row items-stretch sm:items-center justify-between gap-4 ${
          highContrastMode
            ? 'bg-blue-950 border-amber-300 text-white'
            : 'bg-gradient-to-r from-blue-950 via-blue-900 to-indigo-950 border-blue-400 text-white'
        }`}
      >
        <div className="flex items-start gap-3.5 max-w-2xl">
          <div className="w-12 h-12 rounded-xl bg-blue-600 border border-blue-300 flex items-center justify-center shrink-0 shadow">
            <Wallet className="w-6 h-6 text-white" />
          </div>
          <div>
            <h3 className="font-extrabold text-white text-base sm:text-lg">
              GCash Payment Verification &amp; Balance Desk
            </h3>
            <p className="text-blue-100 mt-1 font-medium leading-relaxed text-sm sm:text-base">
              There is currently{' '}
              <strong className="text-yellow-300 font-mono font-bold">
                ₱{stats.totalUnpaidAmount.toLocaleString()}
              </strong>{' '}
              in unpaid customer balances across {stats.unpaid} service orders. Enforce NETSO&apos;s
              Payment First policy before releasing completed orders.
            </p>
          </div>
        </div>

        <button
          type="button"
          onClick={() => onNavigateTab('payments')}
          className="w-full sm:w-auto px-5 py-3 bg-[#E6B222] hover:bg-[#D4A017] text-black font-extrabold uppercase rounded-xl border border-black shadow-md transition-transform active:scale-95 flex items-center justify-center gap-2 text-sm sm:text-base shrink-0 cursor-pointer"
        >
          <Wallet className="w-5 h-5 shrink-0" />
          <span>VERIFY GCASH PAYMENTS</span>
        </button>
      </div>

      {/* Active Service Requests + User Activity Logs Split */}
      <div className="grid grid-cols-1 lg:grid-cols-12 gap-5">
        <div className="lg:col-span-7 space-y-3">
          <div className="flex items-center justify-between">
            <h2
              className={`font-extrabold uppercase tracking-wider text-sm sm:text-base ${
                highContrastMode ? 'text-yellow-300' : 'text-zinc-950'
              }`}
            >
              Active Service Requests (1-Click Status Control)
            </h2>
            <button
              type="button"
              onClick={() => onNavigateTab('production')}
              className="font-bold text-[#B8860B] hover:text-amber-700 flex items-center gap-1 text-xs sm:text-sm cursor-pointer"
            >
              <span>Open Status Board ({requests.length})</span>
              <ChevronRight className="w-4 h-4" />
            </button>
          </div>

          <div className="space-y-3">
            {requests.slice(0, 4).map((req) => (
              <div
                key={req.id}
                className={`p-4 sm:p-5 rounded-xl border space-y-3 shadow-xs ${
                  highContrastMode
                    ? 'bg-zinc-900 border-zinc-700 text-white'
                    : 'bg-white border-zinc-300 text-zinc-950'
                }`}
              >
                <div className="flex flex-wrap items-center justify-between gap-2.5 border-b border-zinc-200 pb-2.5">
                  <div className="flex items-center gap-2.5">
                    <span className="font-mono font-bold text-xs sm:text-sm text-zinc-950 bg-amber-100 px-2.5 py-1 border border-[#D4A017] rounded-lg">
                      {req.id}
                    </span>
                    <div>
                      <span className="font-extrabold text-sm sm:text-base block leading-snug">
                        {req.service}
                      </span>
                      <span className="text-xs sm:text-sm text-zinc-600 font-semibold">
                        Client: <strong>{req.customerName}</strong> ({req.customerPhone})
                      </span>
                    </div>
                  </div>
                  <StatusBadge status={req.status} unpaidAmount={req.unpaidAmount} />
                </div>

                <div className="space-y-2">
                  <div className="grid grid-cols-2 sm:grid-cols-4 gap-1.5 text-xs font-bold">
                    {[
                      { stage: 1, label: '1. Awaiting Payment', status: 'Unpaid Balance' as OrderStatus },
                      { stage: 2, label: '2. Confirmed', status: 'In Pre-Press' as OrderStatus },
                      { stage: 3, label: '3. In Progress', status: 'In Production' as OrderStatus },
                      { stage: 4, label: '4. Ready', status: 'Ready for Pickup' as OrderStatus },
                    ].map((st) => {
                      const isCurrent = req.progressStage === st.stage && req.status !== 'Completed';
                      const isReached = req.progressStage >= st.stage;
                      const confirmationBlocked =
                        req.progressStage === 1 && req.unpaidAmount > 0 && st.stage > 1;
                      return (
                        <button
                          key={st.stage}
                          type="button"
                          disabled={confirmationBlocked}
                          title={
                            confirmationBlocked
                              ? 'Verify the full payment before confirming this order.'
                              : undefined
                          }
                          onClick={() => onUpdateOrderStatus(req.id, st.status, st.stage)}
                          className={`truncate py-1.5 px-2.5 rounded-lg border text-center transition-all ${
                            confirmationBlocked ? 'cursor-not-allowed opacity-50' : 'cursor-pointer'
                          } ${
                            isCurrent
                              ? 'bg-[#121214] text-[#D4A017] border-[#D4A017] font-extrabold shadow-xs'
                              : isReached
                              ? 'bg-amber-50 text-[#B8860B] border-amber-300 font-extrabold hover:bg-amber-100'
                              : 'bg-zinc-50 text-zinc-500 border-zinc-200 hover:bg-zinc-100 hover:text-zinc-800'
                          }`}
                        >
                          {st.label}
                        </button>
                      );
                    })}
                  </div>
                  <div className="w-full bg-zinc-200 h-2.5 rounded-full overflow-hidden">
                    <div
                      className="bg-gradient-to-r from-[#D4A017] via-amber-500 to-emerald-500 h-full transition-all duration-500"
                      style={{ width: `${(req.progressStage / 4) * 100}%` }}
                    />
                  </div>
                </div>

                <div className="flex flex-wrap items-center justify-between gap-2 pt-1 text-xs sm:text-sm">
                  <span className="font-mono font-bold text-zinc-700 dark:text-zinc-300">
                    Total: ₱{req.amount} · Paid: ₱{req.paidAmount} ·{' '}
                    <strong className={req.unpaidAmount > 0 ? 'text-red-600' : 'text-emerald-700'}>
                      Due: ₱{req.unpaidAmount}
                    </strong>
                  </span>
                  <div className="flex items-center gap-2">
                    {req.status !== 'Completed' && (
                      <button
                        type="button"
                        onClick={() => onUpdateOrderStatus(req.id, 'Completed', 4)}
                        className="px-3 py-1.5 bg-emerald-600 hover:bg-emerald-700 text-white font-extrabold text-xs rounded-lg cursor-pointer transition-colors"
                      >
                        ✓ Complete
                      </button>
                    )}
                    <button
                      type="button"
                      onClick={() => onSelectOrder(req)}
                      className="px-3.5 py-1.5 bg-[#121214] hover:bg-black text-[#D4A017] font-extrabold text-xs sm:text-sm rounded-lg border border-[#D4A017] cursor-pointer transition-colors"
                    >
                      Manage Request
                    </button>
                  </div>
                </div>
              </div>
            ))}
          </div>
        </div>

        {/* Right 5 cols: Recent User Activity Logs */}
        <div className="lg:col-span-5 space-y-3">
          <div className="flex items-center justify-between">
            <h2
              className={`font-extrabold uppercase tracking-wider flex items-center gap-2 text-sm sm:text-base ${
                highContrastMode ? 'text-yellow-300' : 'text-zinc-950'
              }`}
            >
              <Activity className="w-5 h-5 text-[#B8860B]" />
              <span>Recent User Activity Logs</span>
            </h2>
            <button
              type="button"
              onClick={() => onNavigateTab('logs')}
              className="font-bold text-[#B8860B] hover:text-amber-700 flex items-center gap-1 text-xs sm:text-sm cursor-pointer"
            >
              <span>Full Audit Log</span>
              <ChevronRight className="w-4 h-4" />
            </button>
          </div>

          <div
            className={`p-4 rounded-2xl border space-y-3 shadow-xs ${
              highContrastMode
                ? 'bg-zinc-900 border-zinc-700 text-white'
                : 'bg-white border-zinc-300 text-zinc-950'
            }`}
          >
            {userLogs.slice(0, 5).map((log) => (
              <div
                key={log.id}
                className="p-3 rounded-xl border border-zinc-200 dark:border-zinc-800 bg-zinc-50/70 dark:bg-zinc-950/50 space-y-1.5 text-xs sm:text-sm"
              >
                <div className="flex items-center justify-between">
                  <div className="flex items-center gap-2">
                    <span
                      className={`px-2 py-0.5 text-xs font-black uppercase rounded ${
                        log.actorRole === 'Admin'
                          ? 'bg-[#121214] text-[#D4A017]'
                          : log.actorRole === 'Operator'
                          ? 'bg-blue-100 text-blue-900'
                          : 'bg-amber-100 text-amber-900 border border-amber-300'
                      }`}
                    >
                      {log.actorRole}
                    </span>
                    <strong className="font-extrabold text-zinc-900 dark:text-white">
                      {log.actorName}
                    </strong>
                  </div>
                  <span className="text-xs text-zinc-500 font-mono">{log.timestamp}</span>
                </div>
                <p className="font-bold text-[#B8860B]">{log.action}</p>
                <p className="text-xs sm:text-sm text-zinc-600 dark:text-zinc-300 line-clamp-2">
                  {log.details}
                </p>
              </div>
            ))}

            <button
              type="button"
              onClick={() => onNavigateTab('logs')}
              className="w-full py-2.5 bg-amber-50 hover:bg-amber-100 text-amber-950 font-extrabold text-xs sm:text-sm uppercase rounded-xl border border-amber-300 cursor-pointer"
            >
              View All {userLogs.length} User Log Entries →
            </button>
          </div>
        </div>
      </div>
    </div>
  );
}

export default AdminDashboard;
