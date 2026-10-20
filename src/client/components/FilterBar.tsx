import React from 'react';
import { LayoutGrid, List, Search, Clock, RotateCcw } from 'lucide-react';
import type { SortBy } from '../../domain/types';

export interface FilterBarProps {
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

const SecondaryFilterRow: React.FC<{
  readonly minScore: number;
  readonly onMinScoreChange: (value: number) => void;
  readonly maxRent: number;
  readonly onMaxRentChange: (value: number) => void;
  readonly recency: string;
  readonly onRecencyChange: (value: string) => void;
  readonly bhkType: string;
  readonly onBhkTypeChange: (value: string) => void;
  readonly furnishing: string;
  readonly onFurnishingChange: (value: string) => void;
  readonly userStatus: string;
  readonly onUserStatusChange: (value: string) => void;
}> = ({
  minScore,
  onMinScoreChange,
  maxRent,
  onMaxRentChange,
  recency,
  onRecencyChange,
  bhkType,
  onBhkTypeChange,
  furnishing,
  onFurnishingChange,
  userStatus,
  onUserStatusChange,
}) => {
  return (
    <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-6 gap-2.5 pt-2.5 border-t border-white/[0.06] text-xs">
      <div className="space-y-1">
        <label htmlFor="filter-bhk-select" className="text-[11px] text-zinc-400 font-medium block">
          BHK / Type
        </label>
        <select
          id="filter-bhk-select"
          value={bhkType}
          onChange={(e) => onBhkTypeChange(e.target.value)}
          className="w-full bg-[#09090B] border border-white/[0.07] hover:border-white/[0.15] rounded-lg px-2 py-1.5 text-xs text-zinc-100 focus:outline-none focus:border-zinc-500 cursor-pointer transition-[border-color,background-color] duration-140 ease-[var(--ease-out)]"
        >
          <option value="all">All BHK Types</option>
          <option value="1 BHK">1 BHK</option>
          <option value="2 BHK">2 BHK (Shared/Full)</option>
          <option value="3 BHK">3 BHK (Shared/Full)</option>
          <option value="Private Room">Private Room / Flatmate</option>
        </select>
      </div>

      <div className="space-y-1">
        <label htmlFor="filter-furnishing-select" className="text-[11px] text-zinc-400 font-medium block">
          Furnishing
        </label>
        <select
          id="filter-furnishing-select"
          value={furnishing}
          onChange={(e) => onFurnishingChange(e.target.value)}
          className="w-full bg-[#09090B] border border-white/[0.07] hover:border-white/[0.15] rounded-lg px-2 py-1.5 text-xs text-zinc-100 focus:outline-none focus:border-zinc-500 cursor-pointer transition-[border-color,background-color] duration-140 ease-[var(--ease-out)]"
        >
          <option value="all">Any Furnishing</option>
          <option value="Fully Furnished">Fully Furnished</option>
          <option value="Semi-Furnished">Semi-Furnished</option>
          <option value="Unfurnished">Unfurnished</option>
        </select>
      </div>

      <div className="space-y-1">
        <label
          htmlFor="filter-recency-select"
          className="text-[11px] text-zinc-400 font-medium flex items-center gap-1"
        >
          <Clock className="w-3 h-3 text-zinc-400" /> Posted Recency
        </label>
        <select
          id="filter-recency-select"
          value={recency}
          onChange={(e) => onRecencyChange(e.target.value)}
          className="w-full bg-[#09090B] border border-white/[0.07] hover:border-white/[0.15] rounded-lg px-2 py-1.5 text-xs text-zinc-100 focus:outline-none focus:border-zinc-500 cursor-pointer transition-[border-color,background-color] duration-140 ease-[var(--ease-out)]"
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
        <div className="flex justify-between text-[11px] text-zinc-400 font-medium">
          <label htmlFor="filter-min-score-range">Min Score</label>
          <span className="text-zinc-200 font-mono tabular-nums font-semibold">
            {minScore === 0 ? 'All (0+)' : `${minScore}+ pts`}
          </span>
        </div>
        <input
          id="filter-min-score-range"
          type="range"
          min="0"
          max="100"
          step="5"
          value={minScore}
          onChange={(e) => onMinScoreChange(Number(e.target.value))}
          className="w-full accent-emerald-400 cursor-pointer h-1.5 bg-zinc-800 rounded-lg"
        />
      </div>

      <div className="space-y-1">
        <div className="flex justify-between text-[11px] text-zinc-400 font-medium">
          <label htmlFor="filter-max-rent-range">Max Rent</label>
          <span className="text-zinc-200 font-mono tabular-nums font-semibold">
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
          className="w-full accent-emerald-400 cursor-pointer h-1.5 bg-zinc-800 rounded-lg"
        />
      </div>

      <div className="space-y-1">
        <label htmlFor="filter-status-select" className="text-[11px] text-zinc-400 font-medium block">
          Pipeline Status
        </label>
        <select
          id="filter-status-select"
          value={userStatus}
          onChange={(e) => onUserStatusChange(e.target.value)}
          className="w-full bg-[#09090B] border border-white/[0.07] hover:border-white/[0.15] rounded-lg px-2 py-1.5 text-xs text-zinc-100 focus:outline-none focus:border-zinc-500 cursor-pointer transition-[border-color,background-color] duration-140 ease-[var(--ease-out)]"
        >
          <option value="all">All Statuses</option>
          <option value="new">New</option>
          <option value="interested">Interested</option>
          <option value="called">Called</option>
          <option value="applied">Applied</option>
          <option value="rejected">Rejected</option>
        </select>
      </div>
    </div>
  );
};

/**
 * Compact command-bar filter strip and 2-way view switcher for rental listings.
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
    <div className="bg-[#111114] border border-white/[0.07] rounded-xl p-3.5 space-y-2.5">
      <div className="flex flex-col md:flex-row gap-2.5 items-stretch md:items-end justify-between">
        <div className="flex-1">
          <label
            htmlFor="listings-search-input"
            className="block text-[11px] font-medium text-zinc-400 mb-1"
          >
            Search Listings
          </label>
          <div className="relative">
            <Search className="w-3.5 h-3.5 absolute left-3 top-1/2 -translate-y-1/2 text-zinc-500" />
            <input
              id="listings-search-input"
              type="text"
              placeholder="Search locality, society, author, landmark, or keywords..."
              value={search}
              onChange={(e) => onSearchChange(e.target.value)}
              className="w-full bg-[#09090B] border border-white/[0.07] hover:border-white/[0.15] rounded-lg pl-9 pr-3 py-1.5 text-xs text-zinc-100 placeholder-zinc-500 focus:outline-none focus:border-zinc-400 transition-[border-color,background-color] duration-140 ease-[var(--ease-out)]"
            />
          </div>
        </div>

        <div className="flex flex-wrap items-end gap-2 shrink-0">
          <div>
            <label
              htmlFor="filter-sort-select"
              className="block text-[11px] text-zinc-400 font-medium mb-1"
            >
              Sort order
            </label>
            <select
              id="filter-sort-select"
              value={sortBy}
              onChange={(e) => onSortByChange(e.target.value as SortBy)}
              className="bg-[#09090B] border border-white/[0.07] hover:border-white/[0.15] rounded-lg px-2.5 py-1.5 text-xs text-zinc-100 focus:outline-none focus:border-zinc-400 cursor-pointer transition-[border-color,background-color] duration-140 ease-[var(--ease-out)]"
            >
              <option value="newest">Recently Posted (Latest First)</option>
              <option value="score_desc">Rating Score (High to Low)</option>
              <option value="rent_asc">Rent (Lowest First)</option>
              <option value="commute_asc">Peak Commute (Shortest)</option>
            </select>
          </div>

          <div>
            <label
              htmlFor="filter-limit-select"
              className="block text-[11px] text-zinc-400 font-medium mb-1"
            >
              Per page
            </label>
            <select
              id="filter-limit-select"
              value={limit}
              onChange={(e) => onLimitChange(Number(e.target.value))}
              className="bg-[#09090B] border border-white/[0.07] hover:border-white/[0.15] rounded-lg px-2.5 py-1.5 text-xs text-zinc-100 font-mono tabular-nums focus:outline-none focus:border-zinc-400 cursor-pointer transition-[border-color,background-color] duration-140 ease-[var(--ease-out)]"
            >
              <option value={12}>12 / page</option>
              <option value={24}>24 / page</option>
              <option value={48}>48 / page</option>
              <option value={100}>100 / page</option>
            </select>
          </div>

          <button
            type="button"
            onClick={onResetFilters}
            aria-label="Reset filters"
            className="inline-flex items-center gap-1.5 px-2.5 py-1.5 rounded-lg text-xs font-medium bg-[#09090B] hover:bg-white/[0.05] text-zinc-300 border border-white/[0.07] hover:border-white/[0.15] transition-[background-color,border-color,color,transform] duration-140 ease-[var(--ease-out)] active:scale-[0.97]"
            title="Reset all filters"
          >
            <RotateCcw className="w-3.5 h-3.5 text-zinc-400" />
            <span>Reset</span>
          </button>

          <div className="flex items-center bg-[#09090B] p-0.5 rounded-lg border border-white/[0.07]">
            <button
              type="button"
              onClick={() => onViewModeChange('grid')}
              aria-label="Card Grid View"
              className={`p-1.5 rounded-md transition-[background-color,color,transform] duration-140 ease-[var(--ease-out)] active:scale-[0.97] ${
                viewMode === 'grid'
                  ? 'bg-zinc-100 text-zinc-950 font-semibold'
                  : 'text-zinc-400 hover:text-zinc-100'
              }`}
              title="Card Grid View"
            >
              <LayoutGrid className="w-3.5 h-3.5" />
            </button>
            <button
              type="button"
              onClick={() => onViewModeChange('table')}
              aria-label="High-Density Table View"
              className={`p-1.5 rounded-md transition-[background-color,color,transform] duration-140 ease-[var(--ease-out)] active:scale-[0.97] ${
                viewMode === 'table'
                  ? 'bg-zinc-100 text-zinc-950 font-semibold'
                  : 'text-zinc-400 hover:text-zinc-100'
              }`}
              title="High-Density Table View"
            >
              <List className="w-3.5 h-3.5" />
            </button>
          </div>
        </div>
      </div>

      <SecondaryFilterRow
        minScore={minScore}
        onMinScoreChange={onMinScoreChange}
        maxRent={maxRent}
        onMaxRentChange={onMaxRentChange}
        recency={recency}
        onRecencyChange={onRecencyChange}
        bhkType={bhkType}
        onBhkTypeChange={onBhkTypeChange}
        furnishing={furnishing}
        onFurnishingChange={onFurnishingChange}
        userStatus={userStatus}
        onUserStatusChange={onUserStatusChange}
      />
    </div>
  );
};
