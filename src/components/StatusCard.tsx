import React from 'react';
import { LucideIcon } from 'lucide-react';

interface StatusCardProps {
  label: string;
  value: string | number;
  subtitle?: string;
  icon?: LucideIcon;
  accentColor?: string;
  isAlert?: boolean;
  highContrastMode?: boolean;
  onClick?: () => void;
}

export function StatusCard({
  label,
  value,
  subtitle,
  icon: Icon,
  accentColor = 'border-t-[#D4A017]',
  isAlert = false,
  highContrastMode = false,
  onClick,
}: StatusCardProps) {
  return (
    <div
      onClick={onClick}
      role={onClick ? 'button' : undefined}
      tabIndex={onClick ? 0 : undefined}
      onKeyDown={(e) => onClick && (e.key === 'Enter' || e.key === ' ') && onClick()}
      className={`p-4 rounded-xl border border-t-4 ${accentColor} shadow-xs transition-all ${
        onClick ? 'cursor-pointer hover:shadow-md' : ''
      } ${
        highContrastMode
          ? 'bg-zinc-900 border-zinc-700 text-white'
          : 'bg-white border-zinc-300 text-zinc-950'
      }`}
    >
      <div className="flex items-start justify-between gap-2 mb-1.5">
        <span
          className={`text-xs font-extrabold uppercase tracking-wider block ${
            isAlert ? 'text-red-600' : 'text-zinc-600'
          }`}
        >
          {label}
        </span>
        {Icon && (
          <span
            className={`p-1.5 rounded-lg shrink-0 ${
              isAlert
                ? 'bg-red-100 text-red-700'
                : 'bg-amber-100 text-[#B8860B]'
            }`}
          >
            <Icon className="w-4 h-4" />
          </span>
        )}
      </div>

      <span
        className={`font-mono font-black text-2xl sm:text-3xl block tabular-nums ${
          isAlert ? 'text-red-600' : ''
        }`}
      >
        {value}
      </span>

      {subtitle && (
        <span className="text-xs sm:text-sm font-semibold text-zinc-600 block mt-1 truncate">
          {subtitle}
        </span>
      )}
    </div>
  );
}

export default StatusCard;
