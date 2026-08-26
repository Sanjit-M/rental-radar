import React from 'react';
import { LayoutGrid, List, Map, Search, RotateCcw, Clock } from 'lucide-react';
import { SortBy } from '../../domain/types';

interface FilterBarProps {
  search: string;
  onSearchChange: (value: string) => void;
  minScore: number;
  onMinScoreChange: (value: number) => void;
  maxRent: number;
  onMaxRentChange: (value: number) => void;
  bhkType: string;
  onBhkTypeChange: (value: string) => void;
  furnishing: string;
  onFurnishingChange: (value: string) => void;
  userStatus: string;
  onUserStatusChange: (value: string) => void;
  recency: string;
  onRecencyChange: (value: string) => void;
  sortBy: SortBy;
  onSortByChange: (value: SortBy) => void;
  viewMode: 'grid' | 'table' | 'map';
  onViewModeChange: (mode: 'grid' | 'table' | 'map') => void;
  onResetFilters: () => void;
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
  recency,
  onRecencyChange,
  sortBy,
  onSortByChange,
  viewMode,
  onViewModeChange,
  onResetFilters,
}) => {
  return (
    <div className="glass-panel rounded-2xl p-5 mb-6 border border-slate-800 space-y-4 shadow-xl">
      {/* Top Controls Row */}
      <div className="flex flex-col md:flex-row gap-3 items-stretch md:items-center justify-between">
        {/* Search Input */}
        <div className="relative flex-1">
          <Search className="w-4 h-4 absolute left-3.5 top-1/2 -translate-y-1/2 text-slate-400" />
          <input
            type="text"
            placeholder="Search by society (Sobha, Assetz...), keywords, phone..."
            value={search}
            onChange={(e) => onSearchChange(e.target.value)}
            className="w-full bg-slate-900/90 border border-slate-700/80 rounded-xl pl-10 pr-4 py-2 text-xs text-white placeholder-slate-500 focus:outline-none focus:border-emerald-500 transition-colors"
          />
        </div>

        {/* View Mode & Sort Controls */}
        <div className="flex items-center gap-2.5 shrink-0">
          <div className="flex items-center gap-1.5 text-xs text-slate-400">
            <span>Sort by:</span>
            <select
              value={sortBy}
              onChange={(e) => onSortByChange(e.target.value as SortBy)}
              className="bg-slate-900/90 border border-slate-700/80 rounded-xl px-3 py-2 text-xs text-white focus:outline-none focus:border-emerald-500 cursor-pointer"
            >
              <option value="score_desc">Rating Score (High to Low)</option>
              <option value="rent_asc">Rent (Lowest First)</option>
              <option value="commute_asc">Peak Commute (Shortest)</option>
              <option value="newest">Recently Posted</option>
            </select>
          </div>

          {/* View Mode Toggle: Grid / Table / Map */}
          <div className="flex items-center bg-slate-900/90 p-1 rounded-xl border border-slate-700/80">
            <button
              onClick={() => onViewModeChange('grid')}
              className={`p-1.5 rounded-lg transition-colors ${
                viewMode === 'grid'
                  ? 'bg-emerald-500 text-slate-950 font-bold'
                  : 'text-slate-400 hover:text-white'
              }`}
              title="Card Grid View"
            >
              <LayoutGrid className="w-4 h-4" />
            </button>
            <button
              onClick={() => onViewModeChange('table')}
              className={`p-1.5 rounded-lg transition-colors ${
                viewMode === 'table'
                  ? 'bg-emerald-500 text-slate-950 font-bold'
                  : 'text-slate-400 hover:text-white'
              }`}
              title="High-Density Table View"
            >
              <List className="w-4 h-4" />
            </button>
            <button
              onClick={() => onViewModeChange('map')}
              className={`p-1.5 rounded-lg transition-colors ${
                viewMode === 'map'
                  ? 'bg-emerald-500 text-slate-950 font-bold'
                  : 'text-slate-400 hover:text-white'
              }`}
              title="OpenStreetMap View"
            >
              <Map className="w-4 h-4" />
            </button>
          </div>
        </div>
      </div>

      {/* Filter Rows */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-6 gap-4 pt-3 border-t border-slate-800/80 text-xs">
        {/* Min Score Slider */}
        <div className="space-y-1">
          <div className="flex justify-between text-slate-400 font-medium">
            <span>Min Score</span>
            <span className="text-emerald-400 font-mono font-bold">{minScore} pts</span>
          </div>
          <input
            type="range"
            min="0"
            max="100"
            step="5"
            value={minScore}
            onChange={(e) => onMinScoreChange(Number(e.target.value))}
            className="w-full accent-emerald-500 cursor-pointer"
          />
        </div>

        {/* Max Rent Slider */}
        <div className="space-y-1">
          <div className="flex justify-between text-slate-400 font-medium">
            <span>Max Rent</span>
            <span className="text-emerald-400 font-mono font-bold">₹{maxRent.toLocaleString('en-IN')}</span>
          </div>
          <input
            type="range"
            min="15000"
            max="60000"
            step="2000"
            value={maxRent}
            onChange={(e) => onMaxRentChange(Number(e.target.value))}
            className="w-full accent-emerald-500 cursor-pointer"
          />
        </div>

        {/* Recency Time Filter */}
        <div className="space-y-1">
          <label className="text-slate-400 font-medium flex items-center gap-1">
            <Clock className="w-3 h-3 text-cyan-400" /> Recency
          </label>
          <select
            value={recency}
            onChange={(e) => onRecencyChange(e.target.value)}
            className="w-full bg-slate-900 border border-slate-700/80 rounded-xl px-2.5 py-1.5 text-white focus:outline-none focus:border-emerald-500 cursor-pointer"
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

        {/* BHK Type Selector */}
        <div className="space-y-1">
          <label className="text-slate-400 font-medium">BHK / Type</label>
          <select
            value={bhkType}
            onChange={(e) => onBhkTypeChange(e.target.value)}
            className="w-full bg-slate-900 border border-slate-700/80 rounded-xl px-2.5 py-1.5 text-white focus:outline-none focus:border-emerald-500 cursor-pointer"
          >
            <option value="all">All BHK Types</option>
            <option value="1 BHK">1 BHK</option>
            <option value="2 BHK">2 BHK (Shared/Full)</option>
            <option value="3 BHK">3 BHK (Shared/Full)</option>
            <option value="Private Room">Private Room / Flatmate</option>
          </select>
        </div>

        {/* Furnishing */}
        <div className="space-y-1">
          <label className="text-slate-400 font-medium">Furnishing</label>
          <select
            value={furnishing}
            onChange={(e) => onFurnishingChange(e.target.value)}
            className="w-full bg-slate-900 border border-slate-700/80 rounded-xl px-2.5 py-1.5 text-white focus:outline-none focus:border-emerald-500 cursor-pointer"
          >
            <option value="all">Any Furnishing</option>
            <option value="Fully Furnished">Fully Furnished</option>
            <option value="Semi-Furnished">Semi-Furnished</option>
            <option value="Unfurnished">Unfurnished</option>
          </select>
        </div>

        {/* Pipeline Status */}
        <div className="space-y-1">
          <label className="text-slate-400 font-medium">My Pipeline Status</label>
          <select
            value={userStatus}
            onChange={(e) => onUserStatusChange(e.target.value)}
            className="w-full bg-slate-900 border border-slate-700/80 rounded-xl px-2.5 py-1.5 text-white focus:outline-none focus:border-emerald-500 cursor-pointer"
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
