import React from 'react';
import { Search } from 'lucide-react';
import { FontSizeLevel } from '../../types';

interface ServiceSearchProps {
  searchQuery: string;
  onSearchChange: (q: string) => void;
  selectedCategory: string;
  onCategoryChange: (cat: string) => void;
  highContrastMode: boolean;
  fontSizeLevel: FontSizeLevel;
}

export function ServiceSearch({
  searchQuery,
  onSearchChange,
  selectedCategory,
  onCategoryChange,
  highContrastMode,
  fontSizeLevel,
}: ServiceSearchProps) {
  const categories = [
    'All',
    'Large Format',
    'Photo & ID',
    'Signage',
    'Document',
    'Merch & Gifts',
    'Marketing',
  ];

  return (
    <div className="space-y-2.5">
      <div className="relative">
        <Search className="w-4 h-4 text-zinc-500 absolute left-3.5 top-3" />
        <input
          type="text"
          placeholder="Search printing services (e.g., Tarpaulin, Rush ID, Stickers, Sintra, Mugs)..."
          value={searchQuery}
          onChange={(e) => onSearchChange(e.target.value)}
          className={`w-full border pl-10 pr-3.5 py-2.5 rounded-xl font-bold focus:outline-none focus:ring-2 focus:ring-[#D4A017] min-h-[42px] ${
            fontSizeLevel === 'xlarge' ? 'text-base' : 'text-xs sm:text-sm'
          } ${
            highContrastMode
              ? 'bg-zinc-900 border-zinc-600 text-white placeholder-zinc-400'
              : 'bg-white border-zinc-300 text-zinc-950 placeholder-zinc-500'
          }`}
        />
      </div>

      <div className="flex items-center gap-1.5 overflow-x-auto no-scrollbar pb-1">
        {categories.map((cat) => (
          <button
            key={cat}
            type="button"
            onClick={() => onCategoryChange(cat)}
            className={`px-3 py-1.5 rounded-lg font-bold whitespace-nowrap transition-all min-h-[34px] text-xs sm:text-sm shrink-0 cursor-pointer ${
              selectedCategory === cat
                ? 'bg-zinc-950 text-[#D4A017] border border-zinc-950 shadow ring-1 ring-amber-400'
                : highContrastMode
                ? 'bg-zinc-900 text-white border border-zinc-700'
                : 'bg-white text-zinc-700 border border-zinc-300 hover:border-zinc-400'
            }`}
          >
            {cat}
          </button>
        ))}
      </div>
    </div>
  );
}

export default ServiceSearch;
