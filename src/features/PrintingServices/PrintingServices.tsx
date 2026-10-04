import React from 'react';
import { ChevronRight } from 'lucide-react';
import { CatalogServiceItem } from '../../data/services';
import { FontSizeLevel } from '../../types';

interface PrintingServicesProps {
  services: CatalogServiceItem[];
  onSelectService: (service: CatalogServiceItem) => void;
  highContrastMode: boolean;
  fontSizeLevel: FontSizeLevel;
}

export function PrintingServices({
  services,
  onSelectService,
  highContrastMode,
  fontSizeLevel,
}: PrintingServicesProps) {
  return (
    <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-2 xl:grid-cols-3 gap-3.5">
      {services.map((srv) => {
        const Icon = srv.icon;
        return (
          <div
            key={srv.id}
            className={`p-4 rounded-2xl border space-y-3 flex flex-col justify-between transition-all hover:shadow-md ${
              highContrastMode
                ? 'bg-zinc-900 border-zinc-600 hover:border-amber-400 text-white'
                : 'bg-white border-zinc-300 hover:border-[#D4A017] text-zinc-950'
            }`}
          >
            <div className="space-y-2.5">
              <div className="flex items-center justify-between gap-2.5">
                <div className="flex items-center gap-2.5">
                  <div className="w-11 h-11 rounded-xl border bg-amber-50 border-amber-300 text-[#B8860B] flex items-center justify-center shrink-0">
                    <Icon className="w-5 h-5" />
                  </div>
                  <div>
                    <h3
                      className={`font-black leading-tight ${
                        fontSizeLevel === 'xlarge' ? 'text-lg' : 'text-base font-extrabold'
                      }`}
                    >
                      {srv.name}
                    </h3>
                    <span className="font-semibold text-xs text-zinc-500">{srv.category}</span>
                  </div>
                </div>

                <span className="bg-zinc-950 text-[#D4A017] font-mono font-black px-2.5 py-1 rounded-lg border border-zinc-800 text-sm shrink-0">
                  ₱{srv.basePrice} <span className="font-sans text-[11px] text-white">{srv.unit}</span>
                </span>
              </div>

              <p className="text-xs leading-relaxed text-zinc-600 dark:text-zinc-300">
                {srv.description}
              </p>
            </div>

            <button
              type="button"
              onClick={() => onSelectService(srv)}
              className="w-full py-2.5 bg-[#D4A017] hover:bg-[#B8860B] border border-black text-black font-extrabold uppercase rounded-xl flex items-center justify-center gap-1.5 text-xs sm:text-sm cursor-pointer"
            >
              <span>Calculate Quote & Order</span>
              <ChevronRight className="w-4 h-4" />
            </button>
          </div>
        );
      })}
    </div>
  );
}

export default PrintingServices;
