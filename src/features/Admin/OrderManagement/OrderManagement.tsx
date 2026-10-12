'use client';

import React, { useState, useMemo } from 'react';
import {
  Search,
  PlusCircle,
  Paperclip,
  CheckCircle2,
} from 'lucide-react';
import {
  RequestOrder,
  OrderStatus,
  FontSizeLevel,
} from '../../../types';

interface OrderManagementProps {
  requests: RequestOrder[];
  initialStatusFilter?: string;
  onOpenWalkInModal: () => void;
  onUpdateOrderStatus: (orderId: string, newStatus: OrderStatus, newStage: number) => void;
  onSelectOrder: (order: RequestOrder) => void;
  highContrastMode: boolean;
  fontSizeLevel: FontSizeLevel;
}

export function OrderManagement({
  requests,
  initialStatusFilter = 'All',
  onOpenWalkInModal,
  onUpdateOrderStatus,
  onSelectOrder,
  highContrastMode,
  fontSizeLevel,
}: OrderManagementProps) {
  const [reqSearch, setReqSearch] = useState('');
  const [reqStatusFilter, setReqStatusFilter] = useState<string>(initialStatusFilter);

  React.useEffect(() => {
    setReqStatusFilter(initialStatusFilter);
  }, [initialStatusFilter]);

  const filteredRequests = useMemo(() => {
    const q = reqSearch.toLowerCase();
    return requests.filter((r) => {
      const matchesStatus =
        reqStatusFilter === 'All' ||
        (reqStatusFilter === 'Pending'
          ? r.status === 'Unpaid Balance' || r.status === 'In Pre-Press'
          : reqStatusFilter === 'Awaiting Payment'
            ? r.status === 'Unpaid Balance'
            : r.status === reqStatusFilter);
      const matchesSearch =
        !q ||
        r.id.toLowerCase().includes(q) ||
        r.customerName.toLowerCase().includes(q) ||
        r.service.toLowerCase().includes(q) ||
        r.category.toLowerCase().includes(q);
      return matchesStatus && matchesSearch;
    });
  }, [requests, reqSearch, reqStatusFilter]);

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
            Order Management (tbl_print_order)
          </h1>
          <p
            className={`font-medium mt-0.5 ${
              highContrastMode ? 'text-zinc-300' : 'text-zinc-600'
            } ${fontSizeLevel === 'xlarge' ? 'text-base' : 'text-xs sm:text-sm'}`}
          >
            Search orders, inspect uploaded files, and update production status after payment is verified.
          </p>
        </div>

        <button
          type="button"
          onClick={onOpenWalkInModal}
          className="w-full sm:w-auto px-4 py-2 bg-[#D4A017] hover:bg-[#B8860B] text-black font-extrabold uppercase rounded-xl border border-black flex items-center justify-center gap-1.5 shadow-xs min-h-[38px] text-xs sm:text-sm shrink-0 cursor-pointer"
        >
          <PlusCircle className="w-4 h-4 shrink-0" />
          <span>+ Add Walk-In Order</span>
        </button>
      </div>

      {/* Search & Status Pills */}
      <div className="space-y-2.5">
        <div className="relative">
          <Search className="w-4 h-4 text-zinc-500 absolute left-3.5 top-3" />
          <input
            type="text"
            placeholder="Search order ID (e.g., NETSO-90103), customer name, or service..."
            value={reqSearch}
            onChange={(e) => setReqSearch(e.target.value)}
            className={`w-full border pl-10 pr-3.5 py-2.5 rounded-xl font-bold focus:outline-none focus:ring-2 focus:ring-[#D4A017] min-h-[42px] text-xs sm:text-sm ${
              highContrastMode
                ? 'bg-zinc-900 border-zinc-600 text-white placeholder-zinc-400'
                : 'bg-white border-zinc-300 text-zinc-950 placeholder-zinc-500'
            }`}
          />
        </div>

        <div className="flex items-center gap-1.5 overflow-x-auto no-scrollbar pb-1">
          {[
            'All',
            'Awaiting Payment',
            'In Pre-Press',
            'In Production',
            'Ready for Pickup',
            'Completed',
          ].map((st) => (
            <button
              key={st}
              type="button"
              onClick={() => setReqStatusFilter(st)}
              className={`px-3 py-1.5 rounded-lg font-bold whitespace-nowrap transition-all text-xs sm:text-sm shrink-0 cursor-pointer ${
                reqStatusFilter === st
                  ? 'bg-zinc-950 text-[#D4A017] border border-zinc-950 shadow ring-1 ring-amber-400'
                  : highContrastMode
                  ? 'bg-zinc-900 text-white border border-zinc-700'
                  : 'bg-white text-zinc-700 border border-zinc-300 hover:border-zinc-400'
              }`}
            >
              {st}
            </button>
          ))}
        </div>
      </div>

      {/* Desktop Request Table */}
      <div
        className={`hidden md:block rounded-2xl border overflow-hidden shadow-xs ${
          highContrastMode ? 'bg-zinc-900 border-zinc-700' : 'bg-white border-zinc-300'
        }`}
      >
        <table className="w-full text-left border-collapse text-xs">
          <thead>
            <tr className="bg-[#121214] text-[#E6B222] uppercase tracking-wider font-extrabold">
              <th className="py-3 px-3.5">Order ID</th>
              <th className="py-3 px-3.5">Customer</th>
              <th className="py-3 px-3.5">Service & Files</th>
              <th className="py-3 px-3.5">Price</th>
              <th className="py-3 px-3.5">Payment</th>
              <th className="py-3 px-3.5">Status</th>
              <th className="py-3 px-3.5 text-right">Action</th>
            </tr>
          </thead>
          <tbody className="divide-y divide-zinc-200 dark:divide-zinc-800">
            {filteredRequests.map((req) => (
              <tr
                key={req.id}
                className={
                  highContrastMode
                    ? 'hover:bg-zinc-800 text-white'
                    : 'hover:bg-amber-50/40 text-zinc-900'
                }
              >
                <td className="py-3 px-3.5 font-mono font-black text-[#B8860B]">
                  {req.id}
                  <span className="block text-[10px] text-zinc-500 font-sans font-semibold">
                    {req.date}
                  </span>
                </td>
                <td className="py-3 px-3.5">
                  <strong className="font-extrabold block">{req.customerName}</strong>
                  <span className="text-[11px] text-zinc-500 font-mono">{req.customerPhone}</span>
                </td>
                <td className="py-3 px-3.5">
                  <span className="font-bold block">{req.service}</span>
                  <span className="text-[11px] text-zinc-500 flex items-center gap-1 mt-0.5">
                    <Paperclip className="w-3 h-3 text-[#B8860B]" />
                    {req.files.length > 0
                      ? `${req.files[0].name}${
                          req.files.length > 1 ? ` +${req.files.length - 1}` : ''
                        }`
                      : 'No file attached'}
                  </span>
                </td>
                <td className="py-3 px-3.5 font-mono font-black text-sm">₱{req.amount}</td>
                <td className="py-3 px-3.5">
                  {req.unpaidAmount === 0 ? (
                    <span className="text-emerald-700 font-extrabold flex items-center gap-1">
                      <CheckCircle2 className="w-3.5 h-3.5" />✓ Paid (₱{req.paidAmount})
                    </span>
                  ) : req.paidAmount > 0 ? (
                    <span className="text-amber-800 font-extrabold">
                      ◐ Partial (Due ₱{req.unpaidAmount})
                    </span>
                  ) : (
                    <span className="text-red-600 font-extrabold">
                      ! Awaiting Payment (₱{req.unpaidAmount})
                    </span>
                  )}
                </td>
                <td className="py-3 px-3.5">
                  <select
                    value={req.status}
                    title={
                      req.progressStage === 1 && req.unpaidAmount > 0
                        ? 'Verify the full payment before confirming this order.'
                        : undefined
                    }
                    onChange={(e) => {
                      const newSt = e.target.value as OrderStatus;
                      const stMap: Partial<Record<OrderStatus, number>> = {
                        'Unpaid Balance': 1,
                        'In Pre-Press': 2,
                        'In Production': 3,
                        'Ready for Pickup': 4,
                        Completed: 4,
                      };
                      onUpdateOrderStatus(req.id, newSt, stMap[newSt] ?? req.progressStage);
                    }}
                    className="border border-zinc-300 dark:border-zinc-700 bg-amber-50/70 dark:bg-zinc-800 text-zinc-900 dark:text-white font-extrabold text-xs rounded-lg px-2 py-1 focus:outline-none focus:border-[#D4A017] cursor-pointer"
                  >
                    <option value="Unpaid Balance">● Awaiting Payment</option>
                    <option
                      value="In Pre-Press"
                      disabled={req.progressStage === 1 && req.unpaidAmount > 0}
                    >
                      ● In Pre-Press
                    </option>
                    <option
                      value="In Production"
                      disabled={req.progressStage === 1 && req.unpaidAmount > 0}
                    >
                      ● In Production
                    </option>
                    <option
                      value="Ready for Pickup"
                      disabled={req.progressStage === 1 && req.unpaidAmount > 0}
                    >
                      ✓ Ready for Pickup
                    </option>
                    <option
                      value="Completed"
                      disabled={req.progressStage === 1 && req.unpaidAmount > 0}
                    >
                      ✓ Completed
                    </option>
                    <option value="Cancelled">× Cancelled</option>
                  </select>
                </td>
                <td className="py-3 px-3.5 text-right">
                  <button
                    type="button"
                    onClick={() => onSelectOrder(req)}
                    className="px-3 py-1 bg-[#D4A017] hover:bg-[#B8860B] text-black font-extrabold text-xs rounded-lg border border-black cursor-pointer"
                  >
                    View
                  </button>
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>

      {/* Mobile Cards */}
      <div className="md:hidden space-y-2.5">
        {filteredRequests.map((req) => (
          <div
            key={req.id}
            className={`p-3.5 rounded-xl border space-y-2 shadow-xs ${
              highContrastMode
                ? 'bg-zinc-900 border-zinc-700 text-white'
                : 'bg-white border-zinc-300 text-zinc-950'
            }`}
          >
            <div className="flex justify-between items-center">
              <span className="font-mono font-black text-xs bg-amber-100 text-black px-2 py-0.5 rounded border border-[#D4A017]">
                {req.id}
              </span>
              <span className="text-xs font-extrabold text-[#B8860B]">
                {req.status === 'Unpaid Balance'
                  ? req.unpaidAmount === 0
                    ? 'Paid — Awaiting Confirmation'
                    : 'Awaiting Payment'
                  : req.status}
              </span>
            </div>
            <div className="text-xs font-bold">{req.customerName}</div>
            <div className="flex justify-between text-xs">
              <span>{req.service}</span>
              <span className="font-mono font-black">₱{req.amount}</span>
            </div>
            <button
              type="button"
              onClick={() => onSelectOrder(req)}
              className="w-full py-2 bg-[#D4A017] text-black font-extrabold text-xs uppercase rounded-xl border border-black"
            >
              VIEW REQUEST DETAILS
            </button>
          </div>
        ))}
      </div>
    </div>
  );
}

export default OrderManagement;
