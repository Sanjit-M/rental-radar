import React from 'react';
import { Search, SlidersHorizontal, LayoutGrid, List } from 'lucide-react';

interface FilterBarProps {
  search: string;
  onSearchChange: (val: string) => void;
  minScore: number;
  onMinScoreChange: (val: number) => void;
  maxRent: number;
  onMaxRentChange: (val: number) => void;
  bhkType: string;
  onBhkTypeChange: (val: string) => void;
  furnishing: string;
  onFurnishingChange: (val: string) => void;
  userStatus: string;
  onUserStatusChange: (val: string) => void;
  sortBy: string;
  onSortByChange: (val: string) => void;
  viewMode: 'grid' | 'table';
  onViewModeChange: (val: 'grid' | 'table') => void;
}

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
  sortBy,
  onSortByChange,
  viewMode,
  onViewModeChange,
}) => {
  return (
    <div className="glass-panel p-4 rounded-2xl mb-6 space-y-4">
      {/* Top row: Search, Sort & View Mode */}
      <div className="flex flex-col sm:flex-row items-center justify-between gap-3">
        {/* Search Bar */}
        <div className="relative w-full sm:max-w-md">
          <Search className="w-4 h-4 absolute left-3 top-1/2 -translate-y-1/2 text-slate-400" />
          <input
            type="text"
            value={search}
            onChange={(e) => onSearchChange(e.target.value)}
            placeholder="Search by society (Sobha, Assetz...), keywords, phone..."
            className="w-full pl-9 pr-4 py-2 bg-slate-900/90 border border-slate-700/60 rounded-xl text-xs text-white placeholder-slate-400 focus:outline-none focus:border-emerald-500 transition-colors"
          />
        </div>

        {/* Sort and View Toggle */}
        <div className="flex items-center gap-3 w-full sm:w-auto justify-between sm:justify-end">
          <div className="flex items-center gap-1.5 text-xs text-slate-400">
            <span>Sort by:</span>
            <select
              value={sortBy}
              onChange={(e) => onSortByChange(e.target.value)}
              className="bg-slate-900 border border-slate-700/60 rounded-lg px-2.5 py-1.5 text-xs text-white focus:outline-none focus:border-emerald-500"
            >
              <option value="score_desc">Rating Score (High to Low)</option>
              <option value="rent_asc">Rent (Lowest first)</option>
              <option value="commute_asc">Peak Commute (Shortest first)</option>
              <option value="newest">Recently Discovered</option>
            </select>
          </div>

          <div className="flex items-center p-1 bg-slate-900 border border-slate-800 rounded-lg">
            <button
              onClick={() => onViewModeChange('grid')}
              className={`p-1.5 rounded ${viewMode === 'grid' ? 'bg-emerald-600 text-white' : 'text-slate-400 hover:text-slate-200'}`}
              title="Card Grid View"
            >
              <LayoutGrid className="w-3.5 h-3.5" />
            </button>
            <button
              onClick={() => onViewModeChange('table')}
              className={`p-1.5 rounded ${viewMode === 'table' ? 'bg-emerald-600 text-white' : 'text-slate-400 hover:text-slate-200'}`}
              title="Table View"
            >
              <List className="w-3.5 h-3.5" />
            </button>
          </div>
        </div>
      </div>

      {/* Filter Pills & Sliders */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-5 gap-4 pt-3 border-t border-slate-800/80">
        {/* Min Score Slider */}
        <div className="space-y-1.5">
          <div className="flex justify-between text-xs">
            <span className="text-slate-400 font-medium">Min Score</span>
            <span className="text-emerald-400 font-mono font-bold">{minScore} pts</span>
          </div>
          <input
            type="range"
            min="0"
            max="90"
            step="5"
            value={minScore}
            onChange={(e) => onMinScoreChange(Number(e.target.value))}
            className="w-full h-1.5 bg-slate-800 rounded-lg appearance-none cursor-pointer accent-emerald-500"
          />
        </div>

        {/* Max Rent Slider */}
        <div className="space-y-1.5">
          <div className="flex justify-between text-xs">
            <span className="text-slate-400 font-medium">Max Rent</span>
            <span className="text-emerald-400 font-mono font-bold">
              {maxRent >= 50000 ? 'Any' : `₹${maxRent.toLocaleString('en-IN')}`}
            </span>
          </div>
          <input
            type="range"
            min="15000"
            max="50000"
            step="2500"
            value={maxRent}
            onChange={(e) => onMaxRentChange(Number(e.target.value))}
            className="w-full h-1.5 bg-slate-800 rounded-lg appearance-none cursor-pointer accent-emerald-500"
          />
        </div>

        {/* BHK Filter */}
        <div className="space-y-1.5">
          <span className="text-xs text-slate-400 font-medium block">BHK / Type</span>
          <select
            value={bhkType}
            onChange={(e) => onBhkTypeChange(e.target.value)}
            className="w-full bg-slate-900 border border-slate-700/60 rounded-lg px-2.5 py-1.5 text-xs text-white focus:outline-none focus:border-emerald-500"
          >
            <option value="all">All BHK Types</option>
            <option value="1 BHK">1 BHK / Single Room</option>
            <option value="2 BHK">2 BHK (Shared / Full)</option>
            <option value="3 BHK">3 BHK (Shared / Full)</option>
            <option value="Flatmate">Flatmate / Room</option>
          </select>
        </div>

        {/* Furnishing */}
        <div className="space-y-1.5">
          <span className="text-xs text-slate-400 font-medium block">Furnishing</span>
          <select
            value={furnishing}
            onChange={(e) => onFurnishingChange(e.target.value)}
            className="w-full bg-slate-900 border border-slate-700/60 rounded-lg px-2.5 py-1.5 text-xs text-white focus:outline-none focus:border-emerald-500"
          >
            <option value="all">Any Furnishing</option>
            <option value="Fully Furnished">Fully Furnished</option>
            <option value="Semi-Furnished">Semi-Furnished</option>
            <option value="Unfurnished">Unfurnished</option>
          </select>
        </div>

        {/* Status Filter */}
        <div className="space-y-1.5">
          <span className="text-xs text-slate-400 font-medium block">My Pipeline Status</span>
          <select
            value={userStatus}
            onChange={(e) => onUserStatusChange(e.target.value)}
            className="w-full bg-slate-900 border border-slate-700/60 rounded-lg px-2.5 py-1.5 text-xs text-white focus:outline-none focus:border-emerald-500"
          >
            <option value="all">All Listings</option>
            <option value="new">New (Unreviewed)</option>
            <option value="interested">⭐ Interested</option>
            <option value="called">📞 Called Owner</option>
            <option value="applied">📝 Applied / Visited</option>
            <option value="rejected">❌ Rejected</option>
          </select>
        </div>
      </div>
    </div>
  );
};
