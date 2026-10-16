import React from 'react';
import { LayoutGrid, List, Search, Clock, RotateCcw } from 'lucide-react';
import type { SortBy } from '../../domain/types';

interface FilterBarProps {
  readonly search: string;
  readonly onSearchChange: (value: string) => void;
  readonly minScore: number;
  readonly onMinScoreChange: (value: number) => void;
  readonly maxRent: number;
  readonly onMaxRentChange: (value: number) => void;
  readonly bhkType: string;
  readonly onBhkTypeChange: (value: string) => void;
  readonly furnishing: string;
  readonly onFurnishingChange: (value: string) => void;
  readonly userStatus: string;
  readonly onUserStatusChange: (value: string) => void;
  readonly recency: string;
  readonly onRecencyChange: (value: string) => void;
  readonly sortBy: SortBy;
  readonly onSortByChange: (value: SortBy) => void;
  readonly limit: number;
  readonly onLimitChange: (limit: number) => void;
  readonly viewMode: 'grid' | 'table';
  readonly onViewModeChange: (mode: 'grid' | 'table') => void;
  readonly onResetFilters: () => void;
}

/**
 * Multi-criteria filter and 2-way view switcher bar for rental listings.
 */
export const FilterBar: React.FC<FilterBarProps> = ({
  search,
  onSearchChange,
  minScore,
  onMinScoreChange,
  maxRent,
  onMaxRentChange,
  bhkType,
  onBhkTypeChange,
  furnishing,
  onFurnishingChange,
  userStatus,
  onUserStatusChange,
  recency,
  onRecencyChange,
  sortBy,
  onSortByChange,
  limit,
  onLimitChange,
  viewMode,
  onViewModeChange,
  onResetFilters,
}) => {
  return (
    <div className="bg-[#11131A]/90 rounded-2xl p-5 border border-white/[0.08] space-y-4 shadow-xl">
      <div className="flex flex-col md:flex-row gap-3 items-stretch md:items-end justify-between">
        <div className="flex-1 space-y-1">
          <label
            htmlFor="listings-search-input"
            className="block text-[11px] font-semibold text-slate-400"
          >
            Search Listings
          </label>
          <div className="relative">
            <Search className="w-4 h-4 absolute left-3.5 top-1/2 -translate-y-1/2 text-slate-400" />
            <input
              id="listings-search-input"
              type="text"
              placeholder="Locality, society, landmark, rent, phone..."
              value={search}
              onChange={(e) => onSearchChange(e.target.value)}
              className="w-full bg-[#090A0F] border border-white/[0.08] hover:border-white/[0.16] rounded-xl pl-10 pr-4 py-2 text-xs text-white placeholder-slate-500 focus:outline-none focus:border-emerald-500 transition-[border-color,background-color] duration-140 ease-[var(--ease-out)]"
            />
          </div>
        </div>

        <div className="flex flex-wrap items-end gap-2.5 shrink-0">
          <div className="space-y-1">
            <label
              htmlFor="filter-limit-select"
              className="block text-[11px] text-slate-400 font-medium"
            >
              Per page
            </label>
            <select
              id="filter-limit-select"
              value={limit}
              onChange={(e) => onLimitChange(Number(e.target.value))}
              className="bg-[#090A0F] border border-white/[0.08] hover:border-white/[0.16] rounded-xl px-2.5 py-2 text-xs text-white font-mono tabular-nums focus:outline-none focus:border-emerald-500 cursor-pointer transition-[border-color,background-color] duration-140 ease-[var(--ease-out)]"
            >
              <option value={12}>12 listings</option>
              <option value={24}>24 listings</option>
              <option value={48}>48 listings</option>
              <option value={100}>All (100)</option>
            </select>
          </div>

          <div className="space-y-1">
            <label
              htmlFor="filter-sort-select"
              className="block text-[11px] text-slate-400 font-medium"
            >
              Sort order
            </label>
            <select
              id="filter-sort-select"
              value={sortBy}
              onChange={(e) => onSortByChange(e.target.value as SortBy)}
              className="bg-[#090A0F] border border-white/[0.08] hover:border-white/[0.16] rounded-xl px-3 py-2 text-xs text-white focus:outline-none focus:border-emerald-500 cursor-pointer transition-[border-color,background-color] duration-140 ease-[var(--ease-out)]"
            >
              <option value="score_desc">Rating Score (High to Low)</option>
              <option value="rent_asc">Rent (Lowest First)</option>
              <option value="commute_asc">Peak Commute (Shortest)</option>
              <option value="newest">Recently Posted</option>
            </select>
          </div>

          <button
            type="button"
            onClick={onResetFilters}
            aria-label="Reset filters"
            className="inline-flex items-center gap-1.5 px-3 py-2 rounded-xl text-xs font-semibold bg-[#090A0F] hover:bg-white/[0.05] text-slate-300 border border-white/[0.08] hover:border-white/[0.16] transition-[background-color,border-color,color,transform] duration-140 ease-[var(--ease-out)] active:scale-[0.97]"
            title="Reset all filters"
          >
            <RotateCcw className="w-3.5 h-3.5 text-slate-400" />
            <span>Reset</span>
          </button>

          <div className="flex items-center bg-[#090A0F] p-1 rounded-xl border border-white/[0.08]">
            <button
              type="button"
              onClick={() => onViewModeChange('grid')}
              aria-label="Card Grid View"
              className={`p-1.5 rounded-lg transition-[background-color,color,transform] duration-140 ease-[var(--ease-out)] active:scale-[0.97] ${
                viewMode === 'grid'
                  ? 'bg-emerald-500 text-slate-950 font-bold'
                  : 'text-slate-400 hover:text-white'
              }`}
              title="Card Grid View"
            >
              <LayoutGrid className="w-4 h-4" />
            </button>
            <button
              type="button"
              onClick={() => onViewModeChange('table')}
              aria-label="High-Density Table View"
              className={`p-1.5 rounded-lg transition-[background-color,color,transform] duration-140 ease-[var(--ease-out)] active:scale-[0.97] ${
                viewMode === 'table'
                  ? 'bg-emerald-500 text-slate-950 font-bold'
                  : 'text-slate-400 hover:text-white'
              }`}
              title="High-Density Table View"
            >
              <List className="w-4 h-4" />
            </button>
          </div>
        </div>
      </div>

      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-6 gap-4 pt-3 border-t border-white/[0.08] text-xs">
        <div className="space-y-1">
          <div className="flex justify-between text-slate-400 font-medium">
            <label htmlFor="filter-min-score-range">Min Score</label>
            <span className="text-emerald-400 font-mono tabular-nums font-bold">{minScore} pts</span>
          </div>
          <input
            id="filter-min-score-range"
            type="range"
            min="0"
            max="100"
            step="5"
            value={minScore}
            onChange={(e) => onMinScoreChange(Number(e.target.value))}
            className="w-full accent-emerald-500 cursor-pointer"
          />
        </div>

        <div className="space-y-1">
          <div className="flex justify-between text-slate-400 font-medium">
            <label htmlFor="filter-max-rent-range">Max Rent</label>
            <span className="text-emerald-400 font-mono tabular-nums font-bold">
              ₹{maxRent.toLocaleString('en-IN')}
            </span>
          </div>
          <input
            id="filter-max-rent-range"
            type="range"
            min="15000"
            max="60000"
            step="2000"
            value={maxRent}
            onChange={(e) => onMaxRentChange(Number(e.target.value))}
            className="w-full accent-emerald-500 cursor-pointer"
          />
        </div>

        <div className="space-y-1">
          <label
            htmlFor="filter-recency-select"
            className="text-slate-400 font-medium flex items-center gap-1"
          >
            <Clock className="w-3 h-3 text-cyan-400" /> Recency
          </label>
          <select
            id="filter-recency-select"
            value={recency}
            onChange={(e) => onRecencyChange(e.target.value)}
            className="w-full bg-[#090A0F] border border-white/[0.08] hover:border-white/[0.16] rounded-xl px-2.5 py-1.5 text-white focus:outline-none focus:border-emerald-500 cursor-pointer transition-[border-color,background-color] duration-140 ease-[var(--ease-out)]"
          >
            <option value="all">All Time</option>
            <option value="1h">Past 1 Hour</option>
            <option value="3h">Past 3 Hours</option>
            <option value="6h">Past 6 Hours</option>
            <option value="12h">Past 12 Hours</option>
            <option value="24h">Past 24 Hours</option>
            <option value="7d">Past 7 Days</option>
          </select>
        </div>

        <div className="space-y-1">
          <label htmlFor="filter-bhk-select" className="text-slate-400 font-medium block">
            BHK / Type
          </label>
          <select
            id="filter-bhk-select"
            value={bhkType}
            onChange={(e) => onBhkTypeChange(e.target.value)}
            className="w-full bg-[#090A0F] border border-white/[0.08] hover:border-white/[0.16] rounded-xl px-2.5 py-1.5 text-white focus:outline-none focus:border-emerald-500 cursor-pointer transition-[border-color,background-color] duration-140 ease-[var(--ease-out)]"
          >
            <option value="all">All BHK Types</option>
            <option value="1 BHK">1 BHK</option>
            <option value="2 BHK">2 BHK (Shared/Full)</option>
            <option value="3 BHK">3 BHK (Shared/Full)</option>
            <option value="Private Room">Private Room / Flatmate</option>
          </select>
        </div>

        <div className="space-y-1">
          <label htmlFor="filter-furnishing-select" className="text-slate-400 font-medium block">
            Furnishing
          </label>
          <select
            id="filter-furnishing-select"
            value={furnishing}
            onChange={(e) => onFurnishingChange(e.target.value)}
            className="w-full bg-[#090A0F] border border-white/[0.08] hover:border-white/[0.16] rounded-xl px-2.5 py-1.5 text-white focus:outline-none focus:border-emerald-500 cursor-pointer transition-[border-color,background-color] duration-140 ease-[var(--ease-out)]"
          >
            <option value="all">Any Furnishing</option>
            <option value="Fully Furnished">Fully Furnished</option>
            <option value="Semi-Furnished">Semi-Furnished</option>
            <option value="Unfurnished">Unfurnished</option>
          </select>
        </div>

        <div className="space-y-1">
          <label htmlFor="filter-status-select" className="text-slate-400 font-medium block">
            My Pipeline Status
          </label>
          <select
            id="filter-status-select"
            value={userStatus}
            onChange={(e) => onUserStatusChange(e.target.value)}
            className="w-full bg-[#090A0F] border border-white/[0.08] hover:border-white/[0.16] rounded-xl px-2.5 py-1.5 text-white focus:outline-none focus:border-emerald-500 cursor-pointer transition-[border-color,background-color] duration-140 ease-[var(--ease-out)]"
          >
            <option value="all">All Listings</option>
            <option value="new">New</option>
            <option value="interested">⭐ Interested</option>
            <option value="called">📞 Called</option>
            <option value="applied">📝 Applied</option>
            <option value="rejected">❌ Rejected</option>
          </select>
        </div>
      </div>
    </div>
  );
};
