import React from 'react';
import { OrderStatus } from '../types';

interface StatusBadgeProps {
  status: OrderStatus | string;
  unpaidAmount?: number;
  className?: string;
}

export function StatusBadge({ status, unpaidAmount = 0, className = '' }: StatusBadgeProps) {
  const isAlert = status === 'Flagged' || status === 'UNREAD';
  const isWarning =
    unpaidAmount > 0 || status === 'In Pre-Press' || status === 'Pending Review';
  const displayStatus =
    status === 'Unpaid Balance'
      ? unpaidAmount === 0
        ? 'Paid — Awaiting Confirmation'
        : 'Awaiting Payment'
      : status;

  const badgeStyle = isAlert
    ? 'bg-red-100 text-red-800 border-red-300'
    : isWarning
    ? 'bg-amber-100 text-amber-900 border-amber-300'
    : 'bg-emerald-100 text-emerald-800 border-emerald-300';

  return (
    <span
      className={`px-3 py-1 text-xs sm:text-sm font-extrabold rounded-full border inline-flex items-center gap-1.5 shrink-0 ${badgeStyle} ${className}`}
    >
      {displayStatus}
    </span>
  );
}

export default StatusBadge;
