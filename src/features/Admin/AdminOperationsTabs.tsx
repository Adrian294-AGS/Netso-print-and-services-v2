
import React, { useState, useMemo } from 'react';
import {
  Search,
  Wallet,
  CheckCircle2,
  AlertTriangle,
  Eye,
  Users,
  MessageSquare,
  Send,
  Phone,
  Mail,
  ShieldCheck,
  MapPin,
  LogOut,
  FileText,
} from 'lucide-react';
import {
  RequestOrder,
  CustomerRecord,
  PaymentTransaction,
  MessageThread,
  FontSizeLevel,
} from '../../types/portal';

interface AdminPaymentsTabProps {
  requests: RequestOrder[];
  payments: PaymentTransaction[];
  onSelectOrder: (order: RequestOrder) => void;
  onReviewPayment: (paymentId: string, status: 'verified' | 'flagged') => void;
  onRecordPayment: (orderId: string, amount: number) => void;
  highContrastMode: boolean;
  fontSizeLevel: FontSizeLevel;
}

export function AdminPaymentsTab({
  requests,
  payments,
  onSelectOrder,
  onReviewPayment,
  onRecordPayment,
  highContrastMode,
  fontSizeLevel,
}: AdminPaymentsTabProps) {
  const [filterMode, setFilterMode] = useState<'all' | 'unpaid' | 'partial' | 'paid'>('all');

  const totalCollected = useMemo(
    () =>
      payments
        .filter((payment) => payment.status === 'Verified')
        .reduce((sum, payment) => sum + payment.amount, 0),
    [payments],
  );

  const totalOutstanding = useMemo(
    () => requests.reduce((sum, r) => sum + r.unpaidAmount, 0),
    [requests],
  );

  const flaggedCount = useMemo(
    () => payments.filter((payment) => payment.status === 'Flagged').length,
    [payments],
  );

  const pendingAmountsByOrder = useMemo(() => {
    const amounts = new Map<string, number>();

    for (const payment of payments) {
      if (payment.status !== 'Pending Review' && payment.status !== 'Pending') continue;

      amounts.set(
        payment.requestId,
        (amounts.get(payment.requestId) ?? 0) + payment.amount,
      );
    }

    return amounts;
  }, [payments]);

  const availableToRecord = (order: RequestOrder) =>
    Math.max(
      0,
      Math.round(order.unpaidAmount * 100) -
        Math.round((pendingAmountsByOrder.get(order.id) ?? 0) * 100),
    ) / 100;

  const filteredRequests = useMemo(() => {
    return requests.filter((r) => {
      if (filterMode === 'unpaid') return r.paidAmount === 0 && r.unpaidAmount > 0;
      if (filterMode === 'partial') return r.paidAmount > 0 && r.unpaidAmount > 0;
      if (filterMode === 'paid') return r.unpaidAmount === 0;
      return true;
    });
  }, [requests, filterMode]);

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
            Payments & Transactions
          </h1>

          <p
            className={`font-medium mt-0.5 ${
              highContrastMode ? 'text-zinc-300' : 'text-zinc-600'
            } ${fontSizeLevel === 'xlarge' ? 'text-base' : 'text-xs sm:text-sm'}`}
          >
            Track verified payments, review manually recorded transactions, and monitor order balances.
          </p>
        </div>
      </div>

      <div className="grid grid-cols-2 sm:grid-cols-4 gap-3">
        <div
          className={`p-3.5 rounded-xl border border-t-4 border-t-[#D4A017] shadow-xs ${
            highContrastMode
              ? 'bg-zinc-900 border-zinc-700 text-white'
              : 'bg-white border-zinc-300 text-zinc-950'
          }`}
        >
          <span className={`text-[10px] sm:text-[11px] font-extrabold uppercase block ${
            highContrastMode ? 'text-zinc-300' : 'text-zinc-600'
          }`}>
            TOTAL COLLECTED
          </span>
          <span className="font-mono font-black text-xl sm:text-2xl text-emerald-700 dark:text-emerald-400 block mt-1">
            ₱{totalCollected.toLocaleString()}
          </span>
          <span className={`text-[11px] font-bold ${
            highContrastMode ? 'text-emerald-300' : 'text-emerald-700'
          }`}>
            Verified transactions
          </span>
        </div>

        <div
          className={`p-3.5 rounded-xl border border-t-4 border-t-red-600 shadow-xs ${
            highContrastMode
              ? 'bg-zinc-900 border-zinc-700 text-white'
              : 'bg-white border-zinc-300 text-zinc-950'
          }`}
        >
          <span className="text-[10px] sm:text-[11px] font-extrabold uppercase text-red-600 block">
            OUTSTANDING BALANCE
          </span>
          <span className={`font-mono font-black text-xl sm:text-2xl block mt-1 ${
            highContrastMode ? 'text-red-400' : 'text-red-600'
          }`}>
            ₱{totalOutstanding.toLocaleString()}
          </span>
          <span className={`text-[11px] font-bold ${
            highContrastMode ? 'text-red-300' : 'text-red-700'
          }`}>
            Collect before release
          </span>
        </div>

        <div
          className={`p-3.5 rounded-xl border border-t-4 border-t-[#D4A017] shadow-xs ${
            highContrastMode
              ? 'bg-zinc-900 border-zinc-700 text-white'
              : 'bg-white border-zinc-300 text-zinc-950'
          }`}
        >
          <span className={`text-[10px] sm:text-[11px] font-extrabold uppercase block ${
            highContrastMode ? 'text-zinc-300' : 'text-zinc-600'
          }`}>
            PAYMENT TXNS
          </span>
          <span className="font-mono font-black text-xl sm:text-2xl block mt-1">
            {payments.length}
          </span>
          <span className={`text-[11px] font-semibold ${
            highContrastMode ? 'text-zinc-300' : 'text-zinc-600'
          }`}>
            All recorded transactions
          </span>
        </div>

        <div
          className={`p-3.5 rounded-xl border border-t-4 border-t-amber-500 shadow-xs ${
            highContrastMode
              ? 'bg-zinc-900 border-zinc-700 text-white'
              : 'bg-white border-zinc-300 text-zinc-950'
          }`}
        >
          <span className="text-[10px] sm:text-[11px] font-extrabold uppercase text-amber-700 block">
            FLAGGED TRANSACTIONS
          </span>
          <span className="font-mono font-black text-xl sm:text-2xl text-[#B8860B] block mt-1">
            {flaggedCount}
          </span>
          <span className={`text-[11px] font-semibold ${
            highContrastMode ? 'text-zinc-300' : 'text-zinc-600'
          }`}>
            Requires follow-up
          </span>
        </div>
      </div>

      <div className="p-3.5 rounded-xl border-l-4 border-l-[#D4A017] border border-amber-300 bg-amber-50/90 text-zinc-950 flex flex-col sm:flex-row items-start sm:items-center justify-between gap-2">
        <div className="text-xs">
          <strong className="font-extrabold uppercase tracking-wide text-[#B8860B] block">
            Payment and order progress are separate
          </strong>
          <span className="font-medium text-zinc-700">
            Only verified transactions count toward the paid total. PayMongo confirms automatically; staff review each manually recorded payment below. GCash orders require full payment before confirmation; Cash on Pickup orders may be confirmed with the balance due at pickup.
          </span>
        </div>

        <div className="flex items-center gap-1.5 shrink-0">
          {(['all', 'partial', 'unpaid', 'paid'] as const).map((m) => (
            <button
              key={m}
              type="button"
              onClick={() => setFilterMode(m)}
              className={`px-2.5 py-1 rounded-lg text-xs font-extrabold uppercase cursor-pointer ${
                filterMode === m
                  ? 'bg-[#121214] text-[#D4A017] border border-black'
                  : 'bg-white text-zinc-900 border border-zinc-300'
              }`}
            >
              {m}
            </button>
          ))}
        </div>
      </div>

      <div className="space-y-2">
        <h2 className={`text-xs sm:text-sm font-extrabold uppercase tracking-wider ${
          highContrastMode ? 'text-white' : 'text-zinc-950'
        }`}>
          Balance per Customer Request (tbl_payment_intents / tbl_payments)
        </h2>

        <div
          className={`hidden md:block rounded-2xl overflow-hidden shadow-xs ${
            highContrastMode ? 'bg-zinc-900' : 'bg-white'
          }`}
        >
          <table className="w-full text-left border-collapse text-[11px] sm:text-xs">
            <thead>
              <tr className="bg-[#121214] text-[#E6B222] uppercase tracking-wider font-extrabold border-b border-zinc-700">
                <th className="py-3 px-3.5 text-left">Request</th>
                <th className="py-3 px-3.5 text-left">Customer</th>
                <th className="py-3 px-3.5 text-left">Service</th>
                <th className="py-3 px-3.5 text-left">Total Amount</th>
                <th className="py-3 px-3.5 text-left">Amount Paid</th>
                <th className="py-3 px-3.5 text-left">Pending</th>
                <th className="py-3 px-3.5 text-left">Balance Due</th>
                <th className="py-3 px-3.5 text-left">Status</th>
                <th className="py-3 px-3.5 text-right">Actions</th>
              </tr>
            </thead>

            <tbody
              className={
                highContrastMode
                  ? 'divide-y divide-zinc-700'
                  : 'divide-y divide-zinc-200'
              }
            >
              {filteredRequests.map((req) => (
                <tr
                  key={req.id}
                  className={
                    highContrastMode
                      ? 'bg-zinc-900 text-white hover:bg-zinc-800'
                      : 'bg-white text-zinc-950 hover:bg-amber-50'
                  }
                >
                  <td className="py-3 px-3.5 font-mono font-black text-amber-800">
                    {req.id}
                  </td>

                  <td className="py-3 px-3.5 font-bold text-sm">
                    {req.customerName}
                  </td>

                  <td className="py-3 px-3.5 font-medium">
                    {req.service}
                  </td>

                  <td className="py-3 px-3.5 font-mono font-bold">
                    ₱{req.amount}
                  </td>

                  <td className={`py-3 px-3.5 font-mono font-bold ${
                    highContrastMode ? 'text-emerald-300' : 'text-emerald-700'
                  }`}>
                    ₱{req.paidAmount}{' '}
                    {req.paidAmount > 0 && req.unpaidAmount > 0 ? '(partial)' : ''}
                  </td>

                  <td className={`py-3 px-3.5 font-mono font-bold ${
                    highContrastMode ? 'text-amber-300' : 'text-amber-800'
                  }`}>
                    ₱{pendingAmountsByOrder.get(req.id) ?? 0}
                  </td>

                  <td
                    className={`py-3 px-3.5 font-mono font-black ${
                      req.unpaidAmount > 0
                        ? highContrastMode
                          ? 'text-red-400'
                          : 'text-red-600'
                        : highContrastMode
                          ? 'text-white'
                          : 'text-zinc-950'
                    }`}
                  >
                    ₱{req.unpaidAmount}
                  </td>

                  <td className="py-3 px-3.5">
                    {req.unpaidAmount === 0 ? (
                      <span className="inline-flex items-center rounded-full px-2 py-0.5 text-[11px] font-extrabold bg-emerald-100 text-emerald-800 border border-emerald-300">
                        ✓ Fully Paid
                      </span>
                    ) : req.paidAmount > 0 ? (
                      <span className="inline-flex items-center rounded-full px-2 py-0.5 text-[11px] font-extrabold bg-amber-100 text-amber-900 border border-amber-300">
                        ◐ Partial — Balance Due
                      </span>
                    ) : (
                      <span className="inline-flex items-center rounded-full px-2 py-0.5 text-[11px] font-extrabold bg-red-100 text-red-800 border border-red-300">
                        ! Unpaid
                      </span>
                    )}
                  </td>

                  <td className="py-3 px-3.5 text-right whitespace-nowrap">
                    <div className="inline-flex items-center justify-end gap-1.5">
                      {availableToRecord(req) > 0 && (
                        <button
                          type="button"
                          onClick={() => onRecordPayment(req.id, availableToRecord(req))}
                          className="px-2.5 py-1 bg-blue-600 hover:bg-blue-700 text-white font-extrabold text-[11px] rounded-lg cursor-pointer transition-colors"
                        >
                          Submit ₱{availableToRecord(req)}
                        </button>
                      )}

                      <button
                        type="button"
                        onClick={() => onSelectOrder(req)}
                        className="px-2.5 py-1 bg-amber-100 hover:bg-[#D4A017] text-black font-extrabold text-[11px] rounded-lg border border-black cursor-pointer transition-colors"
                      >
                        Details
                      </button>
                    </div>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>

        <div className="md:hidden space-y-2.5">
          {filteredRequests.map((req) => (
            <div
              key={req.id}
              className={`p-3.5 rounded-xl border space-y-2 ${
                highContrastMode
                  ? 'bg-zinc-900 border-zinc-700 text-white'
                  : 'bg-white border-zinc-300 text-zinc-950'
              }`}
            >
              <div className="flex justify-between items-center">
                <span className="font-mono font-black text-xs text-amber-800">
                  {req.id}
                </span>

                <span
                  className={`font-mono font-black text-xs ${
                    req.unpaidAmount > 0
                      ? highContrastMode
                        ? 'text-red-400'
                        : 'text-red-600'
                      : highContrastMode
                        ? 'text-emerald-300'
                        : 'text-emerald-700'
                  }`}
                >
                  Balance: ₱{req.unpaidAmount}
                </span>
              </div>

              <div className="flex justify-between text-xs font-bold">
                <span>{req.customerName}</span>
                <span>
                  Paid ₱{req.paidAmount} / ₱{req.amount}
                </span>
              </div>

              <div className={`text-xs font-medium ${
                highContrastMode ? 'text-zinc-300' : 'text-zinc-700'
              }`}>
                {req.service}
              </div>

              {(pendingAmountsByOrder.get(req.id) ?? 0) > 0 && (
                <div className={`text-xs font-bold ${
                  highContrastMode ? 'text-amber-300' : 'text-amber-800'
                }`}>
                  Pending review: ₱{pendingAmountsByOrder.get(req.id)}
                </div>
              )}

              <div className="flex gap-2 pt-1">
                {availableToRecord(req) > 0 && (
                  <button
                    type="button"
                    onClick={() => onRecordPayment(req.id, availableToRecord(req))}
                    className="flex-1 py-1.5 bg-blue-600 text-white font-extrabold text-xs rounded-lg"
                  >
                    Submit ₱{availableToRecord(req)}
                  </button>
                )}

                <button
                  type="button"
                  onClick={() => onSelectOrder(req)}
                  className="flex-1 py-1.5 bg-[#D4A017] text-black font-extrabold text-xs rounded-lg border border-black"
                >
                  View Request
                </button>
              </div>
            </div>
          ))}
        </div>
      </div>

      <div className="space-y-2 pt-2">
        <h2 className={`text-xs sm:text-sm font-extrabold uppercase tracking-wider ${
          highContrastMode ? 'text-white' : 'text-zinc-950'
        }`}>
          Payment Transaction Log (tbl_payments)
        </h2>

        <div className="md:hidden space-y-2">
          {payments.map((txn) => (
            <div
              key={txn.id}
              className={`rounded-xl border p-3 space-y-2 ${
                highContrastMode
                  ? 'bg-zinc-900 border-zinc-700 text-white'
                  : 'bg-white border-zinc-300 text-zinc-950'
              }`}
            >
              <div className="flex items-start justify-between gap-2">
                <div className="min-w-0">
                  <span className="block font-mono font-black text-amber-800">
                    {txn.requestId}
                  </span>
                  <span className="block text-xs font-bold truncate">
                    {txn.customerName}
                  </span>
                </div>

                <span className={`shrink-0 font-mono font-black ${
                  highContrastMode ? 'text-emerald-300' : 'text-emerald-700'
                }`}>
                  ₱{txn.amount}
                </span>
              </div>

              <div className={`text-xs ${
                highContrastMode ? 'text-zinc-300' : 'text-zinc-700'
              }`}>
                {txn.date} · {txn.time} · {txn.method}
              </div>

              <div className={`text-xs break-all ${
                highContrastMode ? 'text-zinc-300' : 'text-zinc-700'
              }`}>
                Reference: {txn.paymongoId || txn.gcashRefNo || txn.id}
              </div>

              <div className="flex items-center justify-between gap-2">
                <span className="text-xs font-extrabold">
                  {txn.status === 'Pending'
                    ? 'Waiting for PayMongo'
                    : txn.status === 'Pending Review'
                      ? 'Pending Review'
                      : txn.status}
                </span>

                {txn.status === 'Pending Review' ? (
                  <div className="flex gap-1.5">
                    <button
                      type="button"
                      onClick={() => onReviewPayment(txn.paymentId, 'verified')}
                      className="px-2.5 py-1 bg-emerald-600 text-white font-extrabold text-[11px] rounded-lg"
                    >
                      Verify
                    </button>

                    <button
                      type="button"
                      onClick={() => onReviewPayment(txn.paymentId, 'flagged')}
                      className="px-2.5 py-1 bg-red-600 text-white font-extrabold text-[11px] rounded-lg"
                    >
                      Flag
                    </button>
                  </div>
                ) : txn.status === 'Pending' ? (
                  <span className={`text-xs ${
                    highContrastMode ? 'text-zinc-300' : 'text-zinc-600'
                  }`}>
                    Automatic
                  </span>
                ) : null}
              </div>
            </div>
          ))}

          {payments.length === 0 && (
            <div className="rounded-xl border border-zinc-300 bg-white px-3.5 py-6 text-center text-sm text-zinc-600">
              No payment transactions have been recorded yet.
            </div>
          )}
        </div>

        <div
          className={`hidden md:block rounded-2xl border overflow-x-auto shadow-xs ${
            highContrastMode
              ? 'bg-zinc-900 border-zinc-700'
              : 'bg-white border-zinc-300'
          }`}
        >
          <table className="w-full text-left border-collapse text-xs">
            <thead>
              <tr className="bg-[#121214] text-[#E6B222] uppercase tracking-wider font-extrabold">
                <th className="py-2.5 px-3.5">Date & Time</th>
                <th className="py-2.5 px-3.5">Request</th>
                <th className="py-2.5 px-3.5">Customer</th>
                <th className="py-2.5 px-3.5">Amount</th>
                <th className="py-2.5 px-3.5">Method / Reference</th>
                <th className="py-2.5 px-3.5 text-right">Status</th>
                <th className="py-2.5 px-3.5 text-right">Review</th>
              </tr>
            </thead>

            <tbody
              className={
                highContrastMode
                  ? 'divide-y divide-zinc-700'
                  : 'divide-y divide-zinc-200'
              }
            >
              {payments.map((txn) => (
                <tr
                  key={txn.id}
                  className={
                    highContrastMode
                      ? 'bg-zinc-900 text-white hover:bg-zinc-800'
                      : 'bg-white text-zinc-950 hover:bg-amber-50'
                  }
                >
                  <td className="py-2.5 px-3.5 whitespace-nowrap font-semibold">
                    {txn.date} · {txn.time}
                  </td>

                  <td className="py-2.5 px-3.5 font-mono font-black text-amber-800">
                    {txn.requestId}
                  </td>

                  <td className="py-2.5 px-3.5 font-bold">
                    {txn.customerName}
                  </td>

                  <td className={`py-2.5 px-3.5 font-mono font-black ${
                    highContrastMode ? 'text-emerald-300' : 'text-emerald-700'
                  }`}>
                    ₱{txn.amount}
                  </td>

                  <td className="py-2.5 px-3.5 text-[11px]">
                    <span className="font-bold block">{txn.method}</span>
                    <span className={highContrastMode ? 'text-zinc-300' : 'text-zinc-600'}>
                      {txn.paymongoId || txn.gcashRefNo || txn.id}
                    </span>
                  </td>

                  <td className="py-2.5 px-3.5 text-right whitespace-nowrap">
                    <span
                      className={`px-2 py-0.5 rounded-full text-[11px] font-extrabold border ${
                        txn.status === 'Verified'
                          ? 'bg-emerald-100 text-emerald-800 border-emerald-300'
                          : txn.status === 'Pending' || txn.status === 'Pending Review'
                            ? 'bg-amber-100 text-amber-900 border-amber-300'
                            : txn.status === 'Flagged'
                              ? 'bg-red-100 text-red-800 border-red-300'
                              : 'bg-zinc-100 text-zinc-800 border-zinc-300'
                      }`}
                    >
                      {txn.status === 'Verified'
                        ? '✓ Paid & Verified'
                        : txn.status === 'Pending'
                          ? 'Waiting for PayMongo'
                          : txn.status === 'Pending Review'
                            ? '⏳ Pending Review'
                            : txn.status}
                    </span>
                  </td>

                  <td className="py-2.5 px-3.5 text-right whitespace-nowrap">
                    {txn.status === 'Pending Review' && (
                      <div className="flex justify-end gap-1.5">
                        <button
                          type="button"
                          onClick={() => onReviewPayment(txn.paymentId, 'verified')}
                          className="px-2.5 py-1 bg-emerald-600 hover:bg-emerald-700 text-white font-extrabold text-[11px] rounded-lg"
                        >
                          Verify
                        </button>

                        <button
                          type="button"
                          onClick={() => onReviewPayment(txn.paymentId, 'flagged')}
                          className="px-2.5 py-1 bg-red-600 hover:bg-red-700 text-white font-extrabold text-[11px] rounded-lg"
                        >
                          Flag
                        </button>
                      </div>
                    )}

                    {txn.status === 'Pending' && (
                      <span className={highContrastMode ? 'text-zinc-300' : 'text-zinc-600'}>
                        Automatic
                      </span>
                    )}
                  </td>
                </tr>
              ))}

              {payments.length === 0 && (
                <tr>
                  <td
                    colSpan={7}
                    className={`px-3.5 py-6 text-center ${
                      highContrastMode ? 'text-zinc-300' : 'text-zinc-600'
                    }`}
                  >
                    No payment transactions have been recorded yet.
                  </td>
                </tr>
              )}
            </tbody>
          </table>
        </div>
      </div>
    </div>
  );
}

interface AdminCustomersAndMessagesProps {
  mode: 'customers' | 'messages' | 'profile';
  customers: CustomerRecord[];
  threads: MessageThread[];
  selectedThreadId: string;
  onSelectThread: (id: string) => void;
  onSendAdminReply: (threadId: string, text: string) => void;
  onSelectCustomer: (customer: CustomerRecord) => void;
  onOpenLogout: () => void;
  highContrastMode: boolean;
  fontSizeLevel: FontSizeLevel;
}

export function AdminCustomersAndMessages({
  mode,
  customers,
  threads,
  selectedThreadId,
  onSelectThread,
  onSendAdminReply,
  onSelectCustomer,
  onOpenLogout,
  highContrastMode,
  fontSizeLevel,
}: AdminCustomersAndMessagesProps) {
  const [custSearch, setCustSearch] = useState('');
  const [replyInput, setReplyInput] = useState('');

  const filteredCustomers = useMemo(() => {
    const q = custSearch.toLowerCase();

    return customers.filter(
      (c) =>
        !q ||
        `${c.firstName} ${c.lastName}`.toLowerCase().includes(q) ||
        c.username.toLowerCase().includes(q) ||
        c.mobileNumber.includes(q) ||
        c.email.toLowerCase().includes(q),
    );
  }, [customers, custSearch]);

  const activeThread = useMemo(
    () => threads.find((t) => t.id === selectedThreadId) || threads[0],
    [threads, selectedThreadId],
  );

  if (mode === 'customers') {
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
              Customer Directory (tbl_user)
            </h1>

            <p
              className={`font-medium mt-0.5 ${
                highContrastMode ? 'text-zinc-300' : 'text-zinc-600'
              } ${fontSizeLevel === 'xlarge' ? 'text-base' : 'text-xs sm:text-sm'}`}
            >
              Manage registered client accounts, inspect order history, and review outstanding balances.
            </p>
          </div>
        </div>

        <div className="relative max-w-md">
          <Search className="w-4 h-4 text-zinc-500 absolute left-3.5 top-3" />

          <input
            type="text"
            placeholder="Search customer by name, @username, mobile, or email..."
            value={custSearch}
            onChange={(e) => setCustSearch(e.target.value)}
            className={`w-full border pl-10 pr-3.5 py-2 rounded-xl font-bold focus:outline-none focus:ring-2 focus:ring-[#D4A017] text-xs sm:text-sm ${
              highContrastMode
                ? 'bg-zinc-900 border-zinc-600 text-white placeholder-zinc-400'
                : 'bg-white border-zinc-300 text-zinc-950 placeholder-zinc-500'
            }`}
          />
        </div>

        <div
          className={`hidden md:block rounded-2xl border overflow-hidden shadow-xs ${
            highContrastMode
              ? 'bg-zinc-900 border-zinc-700'
              : 'bg-white border-zinc-300'
          }`}
        >
          <table className="w-full text-left border-collapse text-xs">
            <thead>
              <tr className="bg-[#121214] text-[#E6B222] uppercase tracking-wider font-extrabold">
                <th className="py-3 px-3.5">Customer Name</th>
                <th className="py-3 px-3.5">Contact & Email</th>
                <th className="py-3 px-3.5">Location</th>
                <th className="py-3 px-3.5">Total Requests</th>
                <th className="py-3 px-3.5">Total Spent</th>
                <th className="py-3 px-3.5">Outstanding Balance</th>
                <th className="py-3 px-3.5">Status</th>
                <th className="py-3 px-3.5 text-right">Action</th>
              </tr>
            </thead>

            <tbody
              className={
                highContrastMode
                  ? 'divide-y divide-zinc-700'
                  : 'divide-y divide-zinc-200'
              }
            >
              {filteredCustomers.map((c) => (
                <tr
                  key={c.id}
                  className={
                    highContrastMode
                      ? 'bg-zinc-900 text-white hover:bg-zinc-800'
                      : 'bg-white text-zinc-950 hover:bg-amber-50'
                  }
                >
                  <td className="py-3 px-3.5">
                    <div className="font-extrabold text-xs sm:text-sm">
                      {c.firstName} {c.lastName}
                    </div>

                    <span className={`font-mono text-[11px] ${
                      highContrastMode ? 'text-zinc-300' : 'text-zinc-600'
                    }`}>
                      @{c.username} · #{c.id}
                    </span>
                  </td>

                  <td className="py-3 px-3.5">
                    <span className="font-mono font-bold block">
                      {c.mobileNumber}
                    </span>

                    <span className={`text-[11px] ${
                      highContrastMode ? 'text-zinc-300' : 'text-zinc-600'
                    }`}>
                      {c.email}
                    </span>
                  </td>

                  <td className="py-3 px-3.5 font-medium">
                    Brgy. {c.barangay}, {c.municipality}
                  </td>

                  <td className="py-3 px-3.5 font-mono font-bold">
                    {c.totalRequests}
                  </td>

                  <td className={`py-3 px-3.5 font-mono font-bold ${
                    highContrastMode ? 'text-emerald-300' : 'text-emerald-700'
                  }`}>
                    ₱{c.totalSpent.toLocaleString()}
                  </td>

                  <td
                    className={`py-3 px-3.5 font-mono font-black ${
                      c.outstandingBalance > 0
                        ? highContrastMode
                          ? 'text-red-400'
                          : 'text-red-600'
                        : highContrastMode
                          ? 'text-zinc-300'
                          : 'text-zinc-600'
                    }`}
                  >
                    ₱{c.outstandingBalance.toLocaleString()}
                  </td>

                  <td className="py-3 px-3.5">
                    <span className="px-2 py-0.5 rounded-full text-[10px] font-black uppercase bg-emerald-100 text-emerald-800 border border-emerald-300">
                      {c.status}
                    </span>
                  </td>

                  <td className="py-3 px-3.5 text-right">
                    <button
                      type="button"
                      onClick={() => onSelectCustomer(c)}
                      className="px-3 py-1 bg-amber-100 hover:bg-[#D4A017] text-black font-extrabold text-xs rounded-lg border border-black cursor-pointer"
                    >
                      View
                    </button>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>

        <div className="md:hidden space-y-2.5">
          {filteredCustomers.map((c) => (
            <div
              key={c.id}
              className={`p-3.5 rounded-xl border space-y-2 ${
                highContrastMode
                  ? 'bg-zinc-900 border-zinc-700 text-white'
                  : 'bg-white border-zinc-300 text-zinc-950'
              }`}
            >
              <div className="flex justify-between items-center">
                <strong className="font-extrabold text-sm">
                  {c.firstName} {c.lastName}
                </strong>

                <span className="px-2 py-0.5 rounded-full text-[10px] font-black bg-emerald-100 text-emerald-800 border border-emerald-300">
                  {c.status}
                </span>
              </div>

              <div className={`text-xs font-mono ${
                highContrastMode ? 'text-zinc-300' : 'text-zinc-600'
              }`}>
                {c.mobileNumber} · {c.totalRequests} requests · Spent ₱{c.totalSpent.toLocaleString()}
              </div>

              <div className="flex justify-between items-center pt-1">
                <span className={`text-xs font-bold ${
                  highContrastMode ? 'text-red-400' : 'text-red-600'
                }`}>
                  Balance Due: ₱{c.outstandingBalance}
                </span>

                <button
                  type="button"
                  onClick={() => onSelectCustomer(c)}
                  className="px-3.5 py-1.5 bg-[#D4A017] text-black font-extrabold text-xs rounded-lg border border-black"
                >
                  VIEW CUSTOMER
                </button>
              </div>
            </div>
          ))}
        </div>
      </div>
    );
  }

  if (mode === 'messages') {
    const handleSend = () => {
      if (!replyInput.trim() || !activeThread) return;

      onSendAdminReply(activeThread.id, replyInput.trim());
      setReplyInput('');
    };

    return (
      <div className="space-y-4 sm:space-y-5">
        <div className="border-b border-[#D4A017] pb-3">
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
            Admin Messages Inbox
          </h1>

          <p
            className={`font-medium mt-0.5 ${
              highContrastMode ? 'text-zinc-300' : 'text-zinc-600'
            } ${fontSizeLevel === 'xlarge' ? 'text-base' : 'text-xs sm:text-sm'}`}
          >
            Respond to customer quote inquiries, confirm GCash receipts, and send pre-press layout proofs.
          </p>
        </div>

        <div className="grid grid-cols-1 lg:grid-cols-12 gap-3.5">
          <div className="lg:col-span-5 space-y-2">
            {threads.map((thr) => {
              const isSelected = activeThread?.id === thr.id;
              const lastMsg = thr.messages[thr.messages.length - 1];

              return (
                <div
                  key={thr.id}
                  onClick={() => onSelectThread(thr.id)}
                  className={`p-3.5 rounded-xl border-l-4 border cursor-pointer transition-all ${
                    isSelected
                      ? 'border-l-[#D4A017] border-[#D4A017] bg-amber-50/90 text-zinc-950 shadow-sm'
                      : highContrastMode
                        ? 'border-l-zinc-600 border-zinc-700 bg-zinc-900 text-white hover:border-amber-400'
                        : 'border-l-zinc-400 border-zinc-300 bg-white text-zinc-950 hover:border-[#D4A017]'
                  }`}
                >
                  <div className="flex items-center justify-between gap-2">
                    <span className="font-mono font-black text-xs text-amber-800">
                      {thr.requestId} · {thr.customerName}
                    </span>

                    <span
                      className={`px-2 py-0.5 rounded text-[10px] font-black uppercase border ${
                        thr.status === 'UNREAD'
                          ? 'bg-[#D4A017] text-black border-black'
                          : 'bg-zinc-100 text-zinc-700 border-zinc-300'
                      }`}
                    >
                      {thr.status}
                    </span>
                  </div>

                  <p className="text-xs font-bold mt-1 truncate">
                    "{lastMsg?.text}"
                  </p>

                  <span className={`text-[10px] font-semibold block mt-1 ${
                    highContrastMode && !isSelected ? 'text-zinc-300' : 'text-zinc-600'
                  }`}>
                    {thr.serviceName} · Updated {thr.lastUpdated}
                  </span>
                </div>
              );
            })}
          </div>

          {activeThread && (
            <div
              className={`lg:col-span-7 border rounded-2xl p-4 flex flex-col justify-between h-[460px] shadow-xs ${
                highContrastMode
                  ? 'bg-zinc-900 border-zinc-700 text-white'
                  : 'bg-white border-zinc-300 text-zinc-950'
              }`}
            >
              <div className="border-b border-zinc-200 pb-2.5 flex items-center justify-between">
                <div>
                  <span className="font-mono font-black text-xs bg-amber-100 text-black px-2 py-0.5 rounded border border-[#D4A017]">
                    {activeThread.requestId}
                  </span>

                  <h3 className="font-extrabold text-sm mt-1">
                    {activeThread.customerName} — {activeThread.serviceName}
                  </h3>
                </div>

                <span className={`text-xs font-bold ${
                  highContrastMode ? 'text-emerald-300' : 'text-emerald-700'
                }`}>
                  ● Direct Thread
                </span>
              </div>

              <div className="space-y-2.5 overflow-y-auto py-3 pr-1 flex-1">
                {activeThread.messages.map((m) => (
                  <div
                    key={m.id}
                    className={`flex flex-col max-w-[85%] ${
                      m.isStaff ? 'ml-auto items-end' : 'mr-auto items-start'
                    }`}
                  >
                    <span className={`text-[10px] font-semibold mb-0.5 ${
                      highContrastMode ? 'text-zinc-300' : 'text-zinc-600'
                    }`}>
                      {m.sender} · {m.time}
                    </span>

                    <div
                      className={`p-2.5 rounded-xl text-xs sm:text-sm leading-relaxed ${
                        m.isStaff
                          ? 'bg-[#D4A017] text-black font-bold border border-[#B8860B]'
                          : 'bg-zinc-800 text-white border border-zinc-600'
                      }`}
                    >
                      {m.text}
                    </div>
                  </div>
                ))}
              </div>

              <div className="space-y-2 pt-2 border-t border-zinc-200">
                <div className="flex items-center gap-1.5 overflow-x-auto no-scrollbar pb-1">
                  {[
                    'GCash payment verified! Moving to printing now.',
                    'Your order is Ready for Pickup at Malvar St., Victory Norte.',
                    'Yes! Updated quote has been applied to your request.',
                  ].map((quick, i) => (
                    <button
                      key={i}
                      type="button"
                      onClick={() => onSendAdminReply(activeThread.id, quick)}
                      className="px-2.5 py-1 rounded-lg bg-amber-50 hover:bg-amber-100 text-amber-950 border border-amber-300 text-[11px] font-bold whitespace-nowrap shrink-0 cursor-pointer"
                    >
                      + "{quick}"
                    </button>
                  ))}
                </div>

                <div className="flex gap-2">
                  <input
                    type="text"
                    placeholder={`Reply to ${activeThread.customerName} as NETSO Admin...`}
                    value={replyInput}
                    onChange={(e) => setReplyInput(e.target.value)}
                    onKeyDown={(e) => e.key === 'Enter' && handleSend()}
                    className={`flex-1 border rounded-xl px-3.5 py-2 font-semibold text-xs sm:text-sm focus:outline-none focus:ring-2 focus:ring-[#D4A017] ${
                      highContrastMode
                        ? 'bg-black border-zinc-700 text-white placeholder-zinc-400'
                        : 'bg-zinc-100 border-zinc-300 text-zinc-950 placeholder-zinc-500'
                    }`}
                  />

                  <button
                    type="button"
                    onClick={handleSend}
                    className="px-4 py-2 bg-[#D4A017] hover:bg-[#B8860B] text-black font-extrabold uppercase rounded-xl border border-black flex items-center gap-1.5 text-xs sm:text-sm shrink-0 cursor-pointer"
                  >
                    <Send className="w-4 h-4" />
                    <span>Send</span>
                  </button>
                </div>
              </div>
            </div>
          )}
        </div>
      </div>
    );
  }

  return (
    <div className="space-y-4 sm:space-y-5">
      <div className="border-b border-[#D4A017] pb-3 flex flex-col sm:flex-row sm:items-center sm:justify-between gap-3">
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
            Admin Operator Profile & Store Info
          </h1>

          <p
            className={`font-medium mt-0.5 ${
              highContrastMode ? 'text-zinc-300' : 'text-zinc-600'
            } ${fontSizeLevel === 'xlarge' ? 'text-base' : 'text-xs sm:text-sm'}`}
          >
            Lead operator credentials, official GCash merchant account, and Santiago City branch settings.
          </p>
        </div>

        <button
          type="button"
          onClick={onOpenLogout}
          className="w-full sm:w-auto px-4 py-2 bg-red-600/10 hover:bg-red-600 text-red-600 hover:text-white border border-red-500/40 rounded-xl font-extrabold flex items-center justify-center gap-2 text-xs sm:text-sm transition-all cursor-pointer"
        >
          <LogOut className="w-4 h-4" />
          <span>Log Out of Admin Portal</span>
        </button>
      </div>

      <div
        className={`p-4 sm:p-5 rounded-2xl border space-y-4 shadow-xs ${
          highContrastMode
            ? 'bg-zinc-900 border-zinc-700 text-white'
            : 'bg-white border-zinc-300 text-zinc-950'
        }`}
      >
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3.5 border-b border-zinc-200 pb-3.5">
          <div className="flex items-center gap-3.5">
            <div className="w-12 h-12 bg-gradient-to-tr from-[#D4A017] to-amber-200 text-black rounded-xl font-black text-lg flex items-center justify-center border border-black shrink-0">
              RC
            </div>

            <div>
              <div className="flex items-center gap-2">
                <h2 className="font-extrabold text-base sm:text-lg">
                  Ron Castillo (Lead Admin)
                </h2>

                <span className="inline-flex items-center gap-1 text-[11px] font-bold px-2 py-0.5 bg-emerald-100 text-emerald-800 border border-emerald-300 rounded-full">
                  ● Super Admin Session
                </span>
              </div>

              <span className={`text-xs font-semibold ${
                highContrastMode ? 'text-zinc-300' : 'text-zinc-600'
              }`}>
                NETSO Prints & Ads Operations · Workstation #1
              </span>
            </div>
          </div>
        </div>

        <div className="grid grid-cols-1 sm:grid-cols-2 gap-3.5 text-xs">
          <div className="p-3.5 rounded-xl border-l-4 border-l-[#D4A017] border border-zinc-200 bg-zinc-50 text-zinc-900 space-y-1">
            <span className="text-[10px] font-extrabold uppercase text-amber-800 block">
              📍 Store Location (screen-contact)
            </span>

            <p className="font-extrabold text-sm">
              Malvar St., Victory Norte, Santiago City
            </p>

            <p className="text-zinc-700 font-medium">
              Back of JIMCO Bldg. & New Dunkin' Donuts, near Puregold Hwy, beside James Pandesal
            </p>
          </div>

          <div className="p-3.5 rounded-xl border-l-4 border-l-[#D4A017] border border-zinc-200 bg-zinc-50 text-zinc-900 space-y-1">
            <span className="text-[10px] font-extrabold uppercase text-amber-800 block">
              💳 Official GCash Merchant Account
            </span>

            <p className="font-mono font-black text-sm text-blue-900">
              0961-775-1907 (Smart) · 0935-596-4485 (TM)
            </p>

            <p className="text-zinc-700 font-semibold">
              Account Name: R*****o Jr. C. · facebook.com/netsoprints
            </p>
          </div>
        </div>
      </div>
    </div>
  );
}
