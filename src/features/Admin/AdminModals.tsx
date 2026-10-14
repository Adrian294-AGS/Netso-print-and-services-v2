'use client';

import React, { useState, useEffect } from 'react';
import {
  X,
  AlertTriangle,
  Wallet,
  Paperclip,
  Download,
  Check,
  Phone,
  Mail,
  MapPin,
  MessageSquare,
  Bell,
  Eye,
} from 'lucide-react';
import {
  RequestOrder,
  OrderStatus,
  CustomerRecord,
  FontSizeLevel,
} from '../../types/portal';

const formatBytes = (bytes: number) => {
  if (bytes < 1024) return `${bytes} B`;
  if (bytes < 1024 * 1024) return `${Math.round(bytes / 1024)} KB`;
  return `${(bytes / (1024 * 1024)).toFixed(1)} MB`;
};

const STATUS_OPTIONS: { status: OrderStatus; stage: number; label: string; shortLabel: string }[] = [
  {
    status: 'Unpaid Balance',
    stage: 1,
    label: '1. Awaiting Payment',
    shortLabel: '1. Awaiting Payment',
  },
  {
    status: 'In Pre-Press',
    stage: 2,
    label: '2. Confirmed & Review (Layout Verification)',
    shortLabel: '2. Pre-Press',
  },
  {
    status: 'In Production',
    stage: 3,
    label: '3. In Progress (Service Fulfillment)',
    shortLabel: '3. In Production',
  },
  {
    status: 'Ready for Pickup',
    stage: 4,
    label: '4. Ready for Pickup at Branch',
    shortLabel: '4. Ready for Pickup',
  },
  {
    status: 'Completed',
    stage: 4,
    label: '5. Completed (Released to Customer)',
    shortLabel: '5. Completed',
  },
  {
    status: 'Cancelled',
    stage: 1,
    label: 'Cancelled',
    shortLabel: 'Cancelled',
  },
];

interface RequestDetailsModalProps {
  order: RequestOrder | null;
  pendingPaymentAmount: number;
  onClose: () => void;
  onUpdateStatus: (
    orderId: string,
    newStatus: OrderStatus,
    newStage: number,
    adminNote?: string
  ) => void;
  onRecordPayment: (orderId: string, amount: number) => void;
  onMessageCustomer: (orderId: string) => void;
  highContrastMode: boolean;
  fontSizeLevel: FontSizeLevel;
}

export function AdminRequestDetailsModal({
  order,
  pendingPaymentAmount,
  onClose,
  onUpdateStatus,
  onRecordPayment,
  onMessageCustomer,
  highContrastMode,
  fontSizeLevel,
}: RequestDetailsModalProps) {
  const [selectedStatus, setSelectedStatus] = useState<OrderStatus>(
    order?.status || 'In Production'
  );
  const [adminNote, setAdminNote] = useState('');
  const [statusSaved, setStatusSaved] = useState(false);

  useEffect(() => {
    if (order) {
      setSelectedStatus(order.status);
      setAdminNote('');
      setStatusSaved(false);
    }
  }, [order]);

  if (!order) return null;
  const requiresFullPayment =
    order.progressStage < 2 &&
    order.unpaidAmount > 0 &&
    order.paymentMethod !== 'Cash on Pickup';
  const paymentBlocksSelectedStatus =
    requiresFullPayment &&
    selectedStatus !== 'Unpaid Balance' &&
    selectedStatus !== 'Cancelled';
  const availableToRecord = Math.max(
    0,
    Math.round(order.unpaidAmount * 100) - Math.round(pendingPaymentAmount * 100),
  ) / 100;

  const handleSaveStatus = () => {
    if (paymentBlocksSelectedStatus) return;
    const matched = STATUS_OPTIONS.find((s) => s.status === selectedStatus);
    onUpdateStatus(
      order.id,
      selectedStatus,
      selectedStatus === 'Cancelled' ? order.progressStage : matched ? matched.stage : order.progressStage,
      adminNote.trim() || undefined
    );
    setStatusSaved(true);
    setAdminNote('');
    setTimeout(() => setStatusSaved(false), 1800);
  };

  return (
    <div
      className="fixed inset-0 z-50 bg-black/85 backdrop-blur-sm flex items-end sm:items-center justify-center p-0 sm:p-4 overflow-y-auto"
      role="dialog"
      aria-modal="true"
      aria-labelledby="req-details-title"
    >
      <div
        className={`w-full max-w-2xl rounded-t-2xl sm:rounded-2xl border shadow-2xl p-4 sm:p-6 space-y-4 max-h-[92vh] overflow-y-auto overflow-x-hidden relative ${
          highContrastMode
            ? 'bg-zinc-950 border-amber-400 text-white'
            : 'bg-white border-zinc-300 text-zinc-950'
        }`}
      >
        <button
          type="button"
          onClick={onClose}
          aria-label="Close request details"
          className="absolute top-4 right-4 p-1.5 rounded-lg text-zinc-400 hover:text-zinc-900 dark:hover:text-white cursor-pointer"
        >
          <X className="w-5 h-5" />
        </button>

        {/* Header */}
        <div className="border-b-2 border-[#D4A017] pb-3.5 pr-8 flex flex-wrap items-center justify-between gap-3">
          <div className="flex items-center gap-3 min-w-0">
            <img
              src="/logo/netso-logo.jpg"
              alt="NETSO Prints & Ads Logo"
              className="w-11 h-11 rounded-xl object-contain shrink-0 border border-[#D4A017] bg-[#0A0A0C] p-0.5 shadow-xs"
            />
            <div className="min-w-0">
              <div className="flex flex-wrap items-center gap-2">
                <span className="font-mono font-black text-xs sm:text-sm bg-amber-100 text-black px-2.5 py-1 rounded-lg border border-[#D4A017] shrink-0">
                  {order.id}
                </span>
                <h3
                  id="req-details-title"
                  className={`font-black truncate ${
                    fontSizeLevel === 'xlarge' ? 'text-xl' : 'text-base sm:text-lg'
                  }`}
                >
                  Request Details &amp; Management
                </h3>
              </div>
              <p className="text-xs text-zinc-500 font-semibold mt-1">
                Submitted on {order.date} · Mapped to <strong>print order</strong> &amp;{' '}
                <strong>customer account</strong>
              </p>
            </div>
          </div>

          <span
            className={`px-3 py-1 text-xs font-extrabold rounded-full border shrink-0 ${
              order.unpaidAmount > 0
                ? 'bg-red-100 text-red-800 border-red-300'
                : 'bg-emerald-100 text-emerald-800 border-emerald-300'
            }`}
          >
            {order.status === 'Unpaid Balance'
              ? order.unpaidAmount === 0
                ? 'Paid — Awaiting Confirmation'
                : 'Awaiting Payment'
              : order.status}
          </span>
        </div>

        {/* 1. Customer Information (tbl_user) */}
        <div
          className={`p-3.5 rounded-xl border-l-4 border-l-[#D4A017] border space-y-2.5 ${
            highContrastMode ? 'bg-zinc-900 border-zinc-700' : 'bg-zinc-50 border-zinc-200'
          }`}
        >
          <div className="flex flex-wrap items-center justify-between gap-2">
            <span className="text-xs font-extrabold uppercase tracking-wider text-[#B8860B]">
              Customer Information
            </span>
            <button
              type="button"
              onClick={() => {
                onClose();
                onMessageCustomer(order.id);
              }}
              className="px-3 py-1.5 rounded-lg bg-amber-100 hover:bg-[#D4A017] text-black border border-[#D4A017] text-xs font-extrabold flex items-center gap-1.5 transition-colors cursor-pointer shrink-0"
            >
              <MessageSquare className="w-3.5 h-3.5" />
              <span>Message Customer</span>
            </button>
          </div>
          <div className="grid grid-cols-1 sm:grid-cols-3 gap-3 text-xs sm:text-sm">
            <div className="min-w-0">
              <span className="text-zinc-500 font-bold text-xs block">Full Name</span>
              <strong className="font-extrabold block truncate">{order.customerName}</strong>
            </div>
            <div className="min-w-0">
              <span className="text-zinc-500 font-bold text-xs block">Username</span>
              <span className="font-mono font-bold block truncate">@{order.customerUsername}</span>
            </div>
            <div className="min-w-0">
              <span className="text-zinc-500 font-bold text-xs block">Contact Number</span>
              <span className="font-mono font-bold block">{order.customerPhone}</span>
            </div>
          </div>
        </div>

        {/* 2. Service Information (tbl_print_order) */}
        <div
          className={`p-3.5 rounded-xl border-l-4 border-l-[#D4A017] border space-y-2.5 ${
            highContrastMode ? 'bg-zinc-900 border-zinc-700' : 'bg-zinc-50 border-zinc-200'
          }`}
        >
          <span className="text-xs font-extrabold uppercase tracking-wider text-[#B8860B] block">
            Service Information
          </span>
          <div className="grid grid-cols-2 sm:grid-cols-4 gap-3 text-xs sm:text-sm">
            <div className="min-w-0">
              <span className="text-zinc-500 font-bold text-xs block">Service</span>
              <strong className="font-extrabold block">{order.service}</strong>
            </div>
            <div className="min-w-0">
              <span className="text-zinc-500 font-bold text-xs block">Paper / Size</span>
              <strong className="font-bold block">{order.specs?.paperSize || 'Standard Spec'}</strong>
            </div>
            <div>
              <span className="text-zinc-500 font-bold text-xs block">Pages</span>
              <strong className="font-mono font-bold block">{order.specs?.pages ?? 1}</strong>
            </div>
            <div>
              <span className="text-zinc-500 font-bold text-xs block">Copies</span>
              <strong className="font-mono font-bold block">{order.specs?.copies ?? 1}</strong>
            </div>
          </div>
          <div className="pt-2 border-t border-zinc-200/70 dark:border-zinc-800 text-xs sm:text-sm">
            <span className="text-zinc-500 font-bold text-xs block">
              Special Instructions &amp; Notes:
            </span>
            <p className="font-semibold italic mt-0.5 break-words">&ldquo;{order.notes}&rdquo;</p>
          </div>
        </div>

        {/* 3. Uploaded File (file_name / file_url) */}
        <div className="space-y-2">
          <span className="text-xs font-extrabold uppercase tracking-wider text-zinc-500 block">
            Uploaded Design Files (file_name / file_url)
          </span>
          {order.files.length > 0 ? (
            <div className="space-y-2">
              {order.files.map((f) => (
                <div key={f.id} className="space-y-2">
                  <div
                    className={`flex flex-wrap items-center justify-between gap-2 p-3 rounded-xl border ${
                      highContrastMode ? 'bg-zinc-900 border-zinc-700' : 'bg-white border-zinc-300'
                    }`}
                  >
                    <div className="flex items-center gap-2.5 min-w-0 flex-1">
                      <div className="w-9 h-9 rounded-lg bg-amber-100 text-[#B8860B] border border-amber-300 flex items-center justify-center shrink-0">
                        <Paperclip className="w-4 h-4" />
                      </div>
                      <div className="min-w-0">
                        <p className="font-bold text-xs sm:text-sm truncate">{f.name}</p>
                        <span className="text-xs text-zinc-500 font-semibold">
                          {f.ext.toUpperCase()} · {formatBytes(f.size)}
                        </span>
                      </div>
                    </div>
                    <div className="flex items-center gap-2 shrink-0">
                      {['pdf', 'png', 'jpg', 'jpeg'].includes(f.ext.toLowerCase()) && (
                        <a
                          href={`/api/uploads/${encodeURIComponent(f.id)}?view=1`}
                          target="_blank"
                          rel="noopener noreferrer"
                          className="px-3 py-1.5 bg-zinc-100 hover:bg-zinc-200 text-zinc-900 font-extrabold text-xs rounded-lg border border-zinc-300 flex items-center gap-1.5 cursor-pointer"
                        >
                          <Eye className="w-3.5 h-3.5" />
                          <span>VIEW FILE</span>
                        </a>
                      )}
                      <a
                        href={`/api/uploads/${encodeURIComponent(f.id)}`}
                        target="_blank"
                        rel="noopener noreferrer"
                        className="px-3.5 py-1.5 bg-zinc-900 hover:bg-black text-[#D4A017] font-extrabold text-xs rounded-lg border border-[#D4A017] flex items-center gap-1.5 shrink-0 cursor-pointer"
                      >
                        <Download className="w-3.5 h-3.5" />
                        <span>DOWNLOAD</span>
                      </a>
                    </div>
                  </div>
                </div>
              ))}
            </div>
          ) : (
            <div className="p-3 rounded-xl border border-amber-300 bg-amber-50 text-amber-900 text-xs font-bold flex items-center gap-2">
              <AlertTriangle className="w-4 h-4 text-[#B8860B] shrink-0" />
              <span>No design file attached yet by the customer.</span>
            </div>
          )}
        </div>

        {/* 4. Payment Details (tbl_payment_intents / tbl_payments) */}
        <div className="p-3.5 rounded-xl border border-amber-300 bg-amber-50/80 text-zinc-950 space-y-2.5">
          <div className="flex flex-wrap items-center justify-between gap-2">
            <span className="text-xs font-extrabold uppercase tracking-wider text-[#B8860B]">
              Payment Ledger
            </span>
            <span className="font-mono text-xs font-bold text-blue-900 bg-blue-100 px-2.5 py-0.5 rounded border border-blue-300">
              {order.paymongoId ? `Paymongo: ${order.paymongoId}` : 'Awaiting GCash Intent'}
            </span>
          </div>

          <div className="grid grid-cols-2 sm:grid-cols-4 gap-3 text-xs">
            <div>
              <span className="text-zinc-600 font-bold block">Total Amount</span>
              <span className="font-mono font-black text-base text-zinc-950">
                ₱{order.amount.toLocaleString()}
              </span>
            </div>
            <div>
              <span className="text-zinc-600 font-bold block">Amount Paid</span>
              <span className="font-mono font-black text-base text-emerald-700">
                ₱{order.paidAmount.toLocaleString()}
              </span>
            </div>
            <div>
              <span className="text-zinc-600 font-bold block">Balance Due</span>
              <span className="font-mono font-black text-base text-red-600">
                ₱{order.unpaidAmount.toLocaleString()}
              </span>
            </div>
            <div className="min-w-0">
              <span className="text-zinc-600 font-bold block">GCash Ref No.</span>
              <span className="font-mono font-bold text-xs text-blue-900 block truncate">
                {order.gcashRefNo || '—'}
              </span>
            </div>
          </div>

          <div className="flex flex-wrap items-center justify-between gap-2 pt-2 border-t border-amber-200">
            <span className="text-xs font-bold text-zinc-700">
              {order.unpaidAmount === 0
                ? '✓ Full payment verified'
                : order.paidAmount > 0
                  ? '✓ Partial payment verified'
                  : '! Awaiting payment'}
            </span>
            {pendingPaymentAmount > 0 && (
              <span className="text-xs font-bold text-amber-700">
                ₱{pendingPaymentAmount.toLocaleString()} pending verification
              </span>
            )}
            <div className="flex flex-wrap items-center gap-2">
              {availableToRecord > 0 && (
                <button
                  type="button"
                  onClick={() => onRecordPayment(order.id, availableToRecord)}
                  className="px-3 py-1.5 bg-blue-600 hover:bg-blue-700 text-white font-extrabold text-xs rounded-lg flex items-center gap-1.5 shadow-xs cursor-pointer"
                >
                  <Wallet className="w-4 h-4" />
                  <span>Submit ₱{availableToRecord} Payment for Review</span>
                </button>
              )}
            </div>
          </div>
        </div>

        {/* 5. Request Status Updater (status) - Fixed layout so controls never overflow horizontally */}
        <div
          className={`p-4 rounded-xl border space-y-3 ${
            highContrastMode ? 'bg-zinc-900 border-amber-400' : 'bg-zinc-100 border-zinc-300'
          }`}
        >
          <label className="block text-xs font-extrabold uppercase tracking-wider">
            Update Request Status &amp; Production Stage (status)
          </label>

          {/* Quick Stage Selector Pills */}
          <div className="grid grid-cols-2 sm:grid-cols-5 gap-1.5">
            {STATUS_OPTIONS.map((opt) => {
              const isSelected = selectedStatus === opt.status;
              return (
                <button
                  key={opt.status}
                  type="button"
                  disabled={
                    requiresFullPayment &&
                    opt.status !== 'Unpaid Balance' &&
                    opt.status !== 'Cancelled'
                  }
                  onClick={() => setSelectedStatus(opt.status)}
                  className={`py-1.5 px-2 rounded-lg font-extrabold text-xs text-center border transition-all truncate ${
                    requiresFullPayment &&
                    opt.status !== 'Unpaid Balance' &&
                    opt.status !== 'Cancelled'
                      ? 'opacity-50 cursor-not-allowed'
                      : 'cursor-pointer'
                  } ${
                    isSelected
                      ? 'bg-[#121214] text-[#D4A017] border-[#D4A017] shadow-xs'
                      : highContrastMode
                      ? 'bg-black text-zinc-300 border-zinc-700 hover:border-amber-400'
                      : 'bg-white text-zinc-700 border-zinc-300 hover:border-[#D4A017]'
                  }`}
                >
                  {opt.shortLabel}
                </button>
              );
            })}
          </div>

          <div className="space-y-2.5">
            <select
              value={selectedStatus}
              onChange={(e) => setSelectedStatus(e.target.value as OrderStatus)}
              className={`w-full min-w-0 border rounded-xl px-3.5 py-2.5 font-bold text-xs sm:text-sm focus:outline-none focus:ring-2 focus:ring-[#D4A017] ${
                highContrastMode
                  ? 'bg-black border-zinc-700 text-white'
                  : 'bg-white border-zinc-400 text-zinc-950'
              }`}
            >
              {STATUS_OPTIONS.map((opt) => (
                <option
                  key={opt.status}
                  value={opt.status}
                  disabled={
                    requiresFullPayment &&
                    opt.status !== 'Unpaid Balance' &&
                    opt.status !== 'Cancelled'
                  }
                >
                  {opt.label}
                </option>
              ))}
            </select>
            {requiresFullPayment && (
              <p className="text-xs font-bold text-amber-800">
                Verify the full payment before confirming this GCash order.
              </p>
            )}

            <div className="flex flex-col sm:flex-row items-stretch sm:items-center gap-2.5">
              <input
                type="text"
                placeholder="Optional operator log note..."
                value={adminNote}
                onChange={(e) => setAdminNote(e.target.value)}
                className={`w-full sm:flex-1 min-w-0 border rounded-xl px-3.5 py-2.5 font-medium text-xs sm:text-sm focus:outline-none focus:ring-2 focus:ring-[#D4A017] ${
                  highContrastMode
                    ? 'bg-black border-zinc-700 text-white'
                    : 'bg-white border-zinc-400 text-zinc-950'
                }`}
              />
              <button
                type="button"
                onClick={handleSaveStatus}
                disabled={paymentBlocksSelectedStatus}
                title={
                  paymentBlocksSelectedStatus
                    ? 'Verify the full payment before confirming this GCash order.'
                    : undefined
                }
                className={`w-full sm:w-auto px-5 py-2.5 bg-[#D4A017] hover:bg-[#B8860B] text-black font-extrabold uppercase text-xs sm:text-sm rounded-xl border border-black flex items-center justify-center gap-1.5 shadow-xs shrink-0 transition-colors ${
                  paymentBlocksSelectedStatus ? 'opacity-50 cursor-not-allowed' : 'cursor-pointer'
                }`}
              >
                {statusSaved ? (
                  <>
                    <Check className="w-4 h-4 text-emerald-950" />
                    <span>STATUS UPDATED!</span>
                  </>
                ) : (
                  <span>UPDATE STATUS</span>
                )}
              </button>
              <button
                type="button"
                onClick={onClose}
                className="w-full sm:w-auto px-4 py-2.5 bg-white hover:bg-zinc-200 text-zinc-900 font-extrabold uppercase text-xs sm:text-sm rounded-xl border border-zinc-400 shrink-0 cursor-pointer transition-colors"
              >
                CLOSE
              </button>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}

interface CustomerDetailModalProps {
  customer: CustomerRecord | null;
  orders: RequestOrder[];
  onClose: () => void;
  onSelectOrder: (order: RequestOrder) => void;
  highContrastMode: boolean;
}

export function AdminCustomerDetailModal({
  customer,
  orders,
  onClose,
  onSelectOrder,
  highContrastMode,
}: CustomerDetailModalProps) {
  if (!customer) return null;

  const customerOrders = orders.filter(
    (o) =>
      o.customerUsername === customer.username ||
      o.customerName === `${customer.firstName} ${customer.lastName}`
  );

  return (
    <div
      className="fixed inset-0 z-50 bg-black/85 backdrop-blur-sm flex items-end sm:items-center justify-center p-0 sm:p-4 overflow-y-auto"
      role="dialog"
      aria-modal="true"
    >
      <div
        className={`w-full max-w-xl rounded-t-2xl sm:rounded-2xl border shadow-2xl p-5 space-y-4 max-h-[90vh] overflow-y-auto overflow-x-hidden relative ${
          highContrastMode
            ? 'bg-zinc-950 border-amber-400 text-white'
            : 'bg-white border-zinc-300 text-zinc-950'
        }`}
      >
        <button
          type="button"
          onClick={onClose}
          className="absolute top-4 right-4 p-1.5 rounded-lg text-zinc-400 hover:text-zinc-900 dark:hover:text-white cursor-pointer"
        >
          <X className="w-5 h-5" />
        </button>

        <div className="flex items-center gap-3.5 border-b border-[#D4A017] pb-3 pr-8">
          <div className="w-12 h-12 rounded-xl bg-gradient-to-tr from-[#D4A017] to-amber-200 text-black font-black text-base flex items-center justify-center border border-black shrink-0">
            {customer.firstName[0]}
            {customer.lastName[0]}
          </div>
          <div className="min-w-0">
            <div className="flex flex-wrap items-center gap-2">
              <h3 className="font-black text-base sm:text-lg truncate">
                {customer.firstName} {customer.middleName ? `${customer.middleName} ` : ''}
                {customer.lastName}
              </h3>
              <span className="px-2 py-0.5 text-[10px] font-black uppercase rounded-full bg-amber-100 text-amber-900 border border-amber-300">
                {customer.status}
              </span>
            </div>
            <p className="text-xs text-zinc-500 font-mono truncate">
              @{customer.username} · ID: #{customer.id} · Last active: {customer.lastActive}
            </p>
          </div>
        </div>

        <div className="grid grid-cols-1 sm:grid-cols-2 gap-3 text-xs">
          <div className="p-3 rounded-xl border border-zinc-200 bg-zinc-50 text-zinc-900 space-y-1 min-w-0">
            <span className="text-[10px] font-extrabold uppercase text-zinc-500 block">
              Contact Info
            </span>
            <p className="font-bold flex items-center gap-1.5">
              <Phone className="w-3.5 h-3.5 text-[#B8860B] shrink-0" />
              <span className="font-mono">{customer.mobileNumber}</span>
            </p>
            <p className="font-bold flex items-center gap-1.5 min-w-0">
              <Mail className="w-3.5 h-3.5 text-[#B8860B] shrink-0" />
              <span className="truncate">{customer.email}</span>
            </p>
          </div>
          <div className="p-3 rounded-xl border border-zinc-200 bg-zinc-50 text-zinc-900 space-y-1">
            <span className="text-[10px] font-extrabold uppercase text-zinc-500 block">
              Registered Address
            </span>
            <p className="font-bold flex items-start gap-1.5">
              <MapPin className="w-3.5 h-3.5 text-[#B8860B] shrink-0 mt-0.5" />
              <span>
                {customer.street}, Brgy. {customer.barangay}, {customer.municipality},{' '}
                {customer.province} {customer.zipCode}
              </span>
            </p>
          </div>
        </div>

        <div className="grid grid-cols-3 gap-2.5 p-3 rounded-xl border border-amber-300 bg-amber-50/70 text-zinc-950 text-center">
          <div>
            <span className="text-[10px] font-extrabold uppercase text-zinc-500 block">
              Total Requests
            </span>
            <span className="font-mono font-black text-base">{customer.totalRequests}</span>
          </div>
          <div>
            <span className="text-[10px] font-extrabold uppercase text-zinc-500 block">
              Total Spent
            </span>
            <span className="font-mono font-black text-base text-emerald-700">
              ₱{customer.totalSpent.toLocaleString()}
            </span>
          </div>
          <div>
            <span className="text-[10px] font-extrabold uppercase text-zinc-500 block">
              Balance Due
            </span>
            <span className="font-mono font-black text-base text-red-600">
              ₱{customer.outstandingBalance.toLocaleString()}
            </span>
          </div>
        </div>

        <div className="space-y-2">
          <h4 className="text-xs font-extrabold uppercase tracking-wider text-zinc-500">
            Active &amp; Recent Requests ({customerOrders.length})
          </h4>
          <div className="space-y-2">
            {customerOrders.map((ord) => (
              <div
                key={ord.id}
                onClick={() => {
                  onClose();
                  onSelectOrder(ord);
                }}
                className="p-3 rounded-xl border border-zinc-300 hover:border-[#D4A017] bg-white text-zinc-950 flex items-center justify-between cursor-pointer transition-all"
              >
                <div>
                  <span className="font-mono font-black text-xs text-[#B8860B]">{ord.id}</span>
                  <p className="font-bold text-xs sm:text-sm">{ord.service}</p>
                </div>
                <div className="text-right">
                  <span className="font-mono font-bold text-xs sm:text-sm block">
                    ₱{ord.amount.toLocaleString()}
                  </span>
                  <span className="text-[10px] font-extrabold px-2 py-0.5 rounded-full bg-zinc-100 border border-zinc-300">
                    {ord.status}
                  </span>
                </div>
              </div>
            ))}
          </div>
        </div>

        <div className="pt-2 flex justify-end">
          <button
            type="button"
            onClick={onClose}
            className="px-5 py-2 bg-[#121214] hover:bg-black text-[#D4A017] font-extrabold uppercase text-xs rounded-xl border border-[#D4A017] cursor-pointer"
          >
            Close Profile
          </button>
        </div>
      </div>
    </div>
  );
}

interface NotificationDrawerProps {
  isOpen: boolean;
  onClose: () => void;
  notifications: { id: string; time: string; text: string; unread: boolean }[];
  onMarkAllRead: () => void;
}

export function AdminNotificationDrawer({
  isOpen,
  onClose,
  notifications,
  onMarkAllRead,
}: NotificationDrawerProps) {
  if (!isOpen) return null;

  return (
    <div className="fixed inset-0 z-50 flex justify-end bg-black/60 backdrop-blur-xs">
      <div className="w-full max-w-sm bg-white text-zinc-950 h-full border-l-4 border-[#D4A017] shadow-2xl flex flex-col justify-between">
        <div>
          <div className="bg-[#121214] text-white p-4 border-b-2 border-[#D4A017] flex items-center justify-between">
            <div className="flex items-center gap-2">
              <Bell className="w-4 h-4 text-[#D4A017]" />
              <span className="font-extrabold text-sm">Admin Live Notifications</span>
            </div>
            <button
              type="button"
              onClick={onClose}
              className="p-1 rounded-lg border border-[#D4A017] text-[#E6B222] hover:bg-zinc-800 cursor-pointer"
            >
              <X className="w-4 h-4" />
            </button>
          </div>

          <div className="p-4 space-y-2.5 overflow-y-auto max-h-[calc(100vh-130px)]">
            {notifications.map((n) => (
              <div
                key={n.id}
                className={`p-3 rounded-xl border-l-4 border ${
                  n.unread
                    ? 'border-l-[#D4A017] border-amber-300 bg-amber-50/70'
                    : 'border-l-zinc-400 border-zinc-200 bg-zinc-50'
                }`}
              >
                <span className="text-[10px] font-bold text-zinc-500 block">{n.time}</span>
                <p className="text-xs font-extrabold text-zinc-900 mt-0.5">{n.text}</p>
              </div>
            ))}
          </div>
        </div>

        <div className="p-4 border-t border-zinc-200 bg-zinc-50">
          <button
            type="button"
            onClick={onMarkAllRead}
            className="w-full py-2.5 bg-[#121214] hover:bg-black text-[#D4A017] font-extrabold text-xs uppercase rounded-xl border border-[#D4A017] cursor-pointer"
          >
            Mark All Notifications as Read
          </button>
        </div>
      </div>
    </div>
  );
}