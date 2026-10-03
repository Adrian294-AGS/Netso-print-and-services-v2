import React from 'react';
import { LogOut, ShieldCheck } from 'lucide-react';
import { RequestOrder, FontSizeLevel } from '../../types';

interface CustomerProfileProps {
  requests: RequestOrder[];
  totalPaid: number;
  unpaidBalance: number;
  onOpenLogout: () => void;
  highContrastMode: boolean;
  fontSizeLevel: FontSizeLevel;
}

export function CustomerProfile({
  requests,
  totalPaid,
  unpaidBalance,
  onOpenLogout,
  highContrastMode,
  fontSizeLevel,
}: CustomerProfileProps) {
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
            Client Account Profile
          </h1>
          <p className="text-xs sm:text-sm text-zinc-500 font-medium mt-0.5">
            Account credentials, phone notifications, and store pickup branch details.
          </p>
        </div>

        <button
          type="button"
          onClick={onOpenLogout}
          className="px-4 py-2 bg-red-600 hover:bg-red-700 text-white rounded-xl font-extrabold flex items-center gap-2 text-xs sm:text-sm cursor-pointer"
        >
          <LogOut className="w-4 h-4" />
          <span>Log Out of Profile</span>
        </button>
      </div>

      <div
        className={`p-4 sm:p-5 rounded-2xl border space-y-4 shadow-xs ${
          highContrastMode
            ? 'bg-zinc-900 border-zinc-700 text-white'
            : 'bg-white border-zinc-300 text-zinc-950'
        }`}
      >
        <div className="flex items-center gap-3.5 border-b border-zinc-200 pb-3.5">
          <div className="w-12 h-12 bg-gradient-to-tr from-[#D4A017] to-amber-200 text-black rounded-xl font-black text-lg flex items-center justify-center border border-black shrink-0">
            AA
          </div>
          <div>
            <div className="flex items-center gap-2">
              <h2 className="font-extrabold text-base sm:text-lg">Alexandrie Abon</h2>
              <span className="inline-flex items-center gap-1 text-[11px] font-bold px-2 py-0.5 bg-emerald-100 text-emerald-800 border border-emerald-300 rounded-full">
                ● Active Session
              </span>
            </div>
            <span className="text-xs text-zinc-500 font-semibold">
              Verified Commercial Client · ID: #NET-9081
            </span>
          </div>
        </div>

        <div className="grid grid-cols-3 gap-3 p-3 rounded-xl border border-zinc-200 bg-zinc-50 text-zinc-900">
          <div>
            <span className="text-[11px] font-bold text-zinc-500 uppercase block">Total Orders</span>
            <span className="font-mono font-black text-sm sm:text-base">{requests.length} Orders</span>
          </div>
          <div>
            <span className="text-[11px] font-bold text-zinc-500 uppercase block">Total Settled</span>
            <span className="font-mono font-black text-sm sm:text-base text-emerald-700">
              ₱{totalPaid.toLocaleString()}
            </span>
          </div>
          <div>
            <span className="text-[11px] font-bold text-zinc-500 uppercase block">Pending Balance</span>
            <span className="font-mono font-black text-sm sm:text-base text-red-600">
              ₱{unpaidBalance.toLocaleString()}
            </span>
          </div>
        </div>
      </div>
    </div>
  );
}

export default CustomerProfile;
