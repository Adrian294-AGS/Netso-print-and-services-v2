import React from 'react';
import {
  Layers,
  ArrowRight,
  Paperclip,
  AlertTriangle,
} from 'lucide-react';
import {
  RequestOrder,
  OrderStatus,
  FontSizeLevel,
} from '../../../types';

interface ProductionQueueProps {
  requests: RequestOrder[];
  onUpdateOrderStatus: (orderId: string, newStatus: OrderStatus, newStage: number) => void;
  onSelectOrder: (order: RequestOrder) => void;
  highContrastMode: boolean;
  fontSizeLevel: FontSizeLevel;
}

export function ProductionQueue({
  requests,
  onUpdateOrderStatus,
  onSelectOrder,
  highContrastMode,
  fontSizeLevel,
}: ProductionQueueProps) {
  const columns: {
    title: string;
    subtitle: string;
    status: OrderStatus;
    nextStatus: OrderStatus;
    nextStage: number;
    nextLabel: string;
  }[] = [
    {
      title: '1. Awaiting Payment',
      subtitle: 'GCash requires payment; Cash on Pickup may be confirmed unpaid',
      status: 'Unpaid Balance',
      nextStatus: 'In Pre-Press',
      nextStage: 2,
      nextLabel: 'Confirm Order',
    },
    {
      title: '2. Confirmed & Review',
      subtitle: 'File & Specs Verification',
      status: 'In Pre-Press',
      nextStatus: 'In Production',
      nextStage: 3,
      nextLabel: 'Mark In Progress',
    },
    {
      title: '3. In Progress (Processing)',
      subtitle: 'Service Request Fulfillment',
      status: 'In Production',
      nextStatus: 'Ready for Pickup',
      nextStage: 4,
      nextLabel: 'Mark Ready for Pickup',
    },
    {
      title: '4. Ready for Pickup',
      subtitle: 'Waiting for Client Pickup',
      status: 'Ready for Pickup',
      nextStatus: 'Completed',
      nextStage: 4,
      nextLabel: 'Release & Complete',
    },
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
            Service Request Status & Workflow Board
          </h1>
          <p
            className={`font-medium mt-0.5 ${
              highContrastMode ? 'text-zinc-300' : 'text-zinc-600'
            } ${fontSizeLevel === 'xlarge' ? 'text-base' : 'text-xs sm:text-sm'}`}
          >
            4-Stage service management board synchronized with the Customer Order Tracker.
          </p>
        </div>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-2 xl:grid-cols-4 gap-3.5">
        {columns.map((col) => {
          const items = requests.filter((r) => r.status === col.status);
          return (
            <div
              key={col.status}
              className={`rounded-2xl border p-3 space-y-3 flex flex-col ${
                highContrastMode
                  ? 'bg-zinc-900 border-zinc-700 text-white'
                  : 'bg-zinc-100/90 border-zinc-300 text-zinc-950'
              }`}
            >
              <div className="border-b border-zinc-300 dark:border-zinc-700 pb-2 flex items-center justify-between">
                <div>
                  <h3 className="font-extrabold text-xs sm:text-sm">{col.title}</h3>
                  <span className="text-[10px] font-semibold text-zinc-500 block">
                    {col.subtitle}
                  </span>
                </div>
                <span className="px-2 py-0.5 rounded-full text-xs font-black bg-[#121214] text-[#D4A017]">
                  {items.length}
                </span>
              </div>

              <div className="space-y-2.5 flex-1">
                {items.map((req) => (
                  <div
                    key={req.id}
                    className={`p-3 rounded-xl border space-y-2 shadow-xs ${
                      highContrastMode
                        ? 'bg-black border-zinc-700 text-white'
                        : 'bg-white border-zinc-300 text-zinc-950'
                    }`}
                  >
                    <div className="flex items-center justify-between gap-1">
                      <span className="font-mono font-black text-xs bg-amber-100 text-black px-2 py-0.5 rounded border border-[#D4A017]">
                        {req.id}
                      </span>
                      <span
                        className={`font-mono font-bold text-xs ${
                          req.unpaidAmount > 0 ? 'text-red-600' : 'text-emerald-700'
                        }`}
                      >
                        {req.unpaidAmount > 0 ? `Due ₱${req.unpaidAmount}` : '✓ Paid'}
                      </span>
                    </div>

                    <div>
                      <p className="font-extrabold text-xs sm:text-sm leading-snug">
                        {req.service}
                      </p>
                      <span className="text-[11px] text-zinc-500 font-semibold block">
                        {req.customerName} · {req.specs?.paperSize || req.category}
                      </span>
                    </div>

                    {req.files.length > 0 ? (
                      <div className="text-[11px] font-bold text-[#B8860B] flex items-center gap-1 truncate">
                        <Paperclip className="w-3 h-3 shrink-0" />
                        <span className="truncate">{req.files[0].name}</span>
                      </div>
                    ) : (
                      <div className="text-[10px] font-bold text-red-600 flex items-center gap-1">
                        <AlertTriangle className="w-3 h-3 shrink-0" />
                        <span>No file attached</span>
                      </div>
                    )}

                    <div className="pt-1 flex items-center gap-1.5">
                      <button
                        type="button"
                        onClick={() => onSelectOrder(req)}
                        className="px-2.5 py-1.5 rounded-lg border border-zinc-300 dark:border-zinc-700 text-[11px] font-bold hover:bg-zinc-100 dark:hover:bg-zinc-800 cursor-pointer"
                      >
                        Details
                      </button>
                      <button
                        type="button"
                        disabled={
                          col.nextStatus === 'In Pre-Press' &&
                          req.unpaidAmount > 0 &&
                          req.paymentMethod !== 'Cash on Pickup'
                        }
                        title={
                          col.nextStatus === 'In Pre-Press' &&
                          req.unpaidAmount > 0 &&
                          req.paymentMethod !== 'Cash on Pickup'
                            ? 'Verify the full payment before confirming this GCash order.'
                            : undefined
                        }
                        onClick={() =>
                          onUpdateOrderStatus(req.id, col.nextStatus, col.nextStage)
                        }
                        className="flex-1 py-1.5 px-2.5 bg-[#D4A017] hover:bg-[#B8860B] text-black font-extrabold text-[11px] rounded-lg border border-black flex items-center justify-center gap-1 cursor-pointer disabled:cursor-not-allowed disabled:opacity-50"
                      >
                        <span>{col.nextLabel}</span>
                        <ArrowRight className="w-3 h-3" />
                      </button>
                    </div>
                  </div>
                ))}

                {items.length === 0 && (
                  <div className="py-8 text-center text-xs text-zinc-400 font-semibold border border-dashed border-zinc-300 rounded-xl">
                    No requests in this stage
                  </div>
                )}
              </div>
            </div>
          );
        })}
      </div>
    </div>
  );
}

export default ProductionQueue;
