import React, { useState, useEffect, useCallback } from 'react';
import { RentalListing, DashboardStats, UserListingStatus } from '../domain/types';
import { FilterBar } from './components/FilterBar';
import { ListingCard } from './components/ListingCard';
import { ListingTable } from './components/ListingTable';
import { MapView } from './components/MapView';
import { ScoreBreakdownModal } from './components/ScoreBreakdownModal';
import { api } from './services/api';
import {
  Compass,
  RefreshCw,
  Sparkles,
  Building,
  Clock,
  Waves,
  IndianRupee,
  Layers,
  ChevronLeft,
  ChevronRight,
} from 'lucide-react';

export const App: React.FC = () => {
  // Listings & Pagination State
  const [listings, setListings] = useState<RentalListing[]>([]);
  const [stats, setStats] = useState<DashboardStats | null>(null);
  const [loading, setLoading] = useState(true);
  const [scraping, setScraping] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [scrapeNotice, setScrapeNotice] = useState<string | null>(null);

  // Pagination Controls
  const [page, setPage] = useState(1);
  const [totalCount, setTotalCount] = useState(0);
  const [totalPages, setTotalPages] = useState(1);
  const [hasMore, setHasMore] = useState(false);

  // Filter & View State
  const [search, setSearch] = useState('');
  const [minScore, setMinScore] = useState(40);
  const [maxRent, setMaxRent] = useState(45000);
  const [bhkType, setBhkType] = useState('all');
  const [furnishing, setFurnishing] = useState('all');
  const [userStatus, setUserStatus] = useState('all');
  const [recency, setRecency] = useState('all');
  const [sortBy, setSortBy] = useState('score_desc');
  const [viewMode, setViewMode] = useState<'grid' | 'table' | 'map'>('grid');

  // Modal State
  const [selectedScoreListing, setSelectedScoreListing] = useState<RentalListing | null>(null);

  const fetchListings = useCallback(
    async (targetPage = 1, append = false) => {
      setLoading(true);
      setError(null);
      try {
        const data = await api.getListings({
          page: targetPage,
          limit: 12,
          minScore,
          maxRent,
          sortBy,
          ...(bhkType !== 'all' ? { bhkType } : {}),
          ...(furnishing !== 'all' ? { furnishing } : {}),
          ...(userStatus !== 'all' ? { userStatus } : {}),
          ...(recency !== 'all' ? { recency } : {}),
          ...(search.trim() ? { search: search.trim() } : {}),
        });

        if (append) {
          setListings((prev) => [...prev, ...data.listings]);
        } else {
          setListings(data.listings);
        }

        setPage(data.page || 1);
        setTotalCount(data.totalCount || data.listings.length);
        setTotalPages(data.totalPages || 1);
        setHasMore(Boolean(data.hasMore));
      } catch (err: any) {
        console.error('Failed to fetch listings:', err);
        setError(err.message || 'Failed to fetch listings');
      } finally {
        setLoading(false);
      }
    },
    [minScore, maxRent, bhkType, furnishing, userStatus, recency, search, sortBy]
  );

  const fetchStats = async () => {
    try {
      const data = await api.getStats();
      setStats(data);
    } catch {
      // Non-critical stats error
    }
  };

  useEffect(() => {
    fetchListings(1, false);
    fetchStats();
  }, [fetchListings]);

  const handleStatusChange = async (id: number, status: UserListingStatus) => {
    try {
      setListings((prev) =>
        prev.map((l) => (l.id === id ? { ...l, userStatus: status } : l))
      );

      await api.updateListingStatus(id, status);
      fetchStats();
    } catch (err) {
      console.error('Status update failed:', err);
    }
  };

  const handleTriggerScrape = async () => {
    setScraping(true);
    setScrapeNotice(null);
    try {
      const data = await api.triggerScrape();
      setScrapeNotice(data.message || 'Scrape cycle complete!');
      fetchListings(1, false);
      fetchStats();
    } catch {
      setScrapeNotice('Scrape trigger failed. Please check internet connection.');
    } finally {
      setScraping(false);
    }
  };

  const handleResetFilters = () => {
    setSearch('');
    setMinScore(40);
    setMaxRent(45000);
    setBhkType('all');
    setFurnishing('all');
    setUserStatus('all');
    setRecency('all');
    setSortBy('score_desc');
  };

  const handlePageChange = (newPage: number) => {
    if (newPage >= 1 && newPage <= totalPages && newPage !== page && !loading) {
      fetchListings(newPage, false);
      window.scrollTo({ top: 0, behavior: 'smooth' });
    }
  };

  return (
    <div className="min-h-screen bg-slate-950 text-slate-100 p-4 md:p-8 font-sans selection:bg-emerald-500 selection:text-slate-950">
      <div className="max-w-7xl mx-auto space-y-6">
        {/* Header Banner */}
        <header className="glass-panel p-6 rounded-3xl flex flex-col md:flex-row items-start md:items-center justify-between gap-4 border border-slate-800 shadow-2xl">
          <div className="flex items-center gap-4">
            <div className="w-12 h-12 rounded-2xl bg-gradient-to-tr from-emerald-500 to-teal-400 flex items-center justify-center shadow-lg shadow-emerald-500/20 shrink-0">
              <Compass className="w-7 h-7 text-slate-950 animate-pulse" />
            </div>
            <div>
              <div className="flex items-center gap-2">
                <h1 className="text-xl md:text-2xl font-black text-white tracking-tight">
                  PTP & Kadubeesanahalli Rental Radar
                </h1>
                <span className="text-[10px] font-bold uppercase tracking-wider bg-emerald-500/10 text-emerald-400 border border-emerald-500/30 px-2 py-0.5 rounded-full">
                  Live v2
                </span>
              </div>
              <p className="text-xs text-slate-400 mt-0.5">
                Automated Facebook group scraper & Peak Scooter Commute ranker for Prestige Tech Park
              </p>
            </div>
          </div>

          <div className="flex items-center gap-2.5 w-full md:w-auto justify-end">
            <button
              onClick={handleTriggerScrape}
              disabled={scraping}
              className="flex items-center justify-center gap-2 px-4 py-2 rounded-xl bg-emerald-500 hover:bg-emerald-400 text-slate-950 font-bold text-xs shadow-lg shadow-emerald-500/20 transition-all disabled:opacity-50"
            >
              <RefreshCw className={`w-3.5 h-3.5 ${scraping ? 'animate-spin' : ''}`} />
              <span>{scraping ? 'Scanning Groups...' : 'Check Groups Now'}</span>
            </button>
          </div>
        </header>

        {/* Live Notification Bar */}
        {scrapeNotice && (
          <div className="glass-panel border-emerald-500/40 bg-emerald-950/40 text-emerald-300 p-3.5 rounded-2xl text-xs flex items-center justify-between shadow-lg">
            <span>✨ {scrapeNotice}</span>
            <button
              onClick={() => setScrapeNotice(null)}
              className="text-slate-400 hover:text-white font-bold ml-4"
            >
              ✕
            </button>
          </div>
        )}

        {/* Stat Metric Cards */}
        {stats && (
          <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-6 gap-3">
            <div className="glass-panel p-3.5 rounded-2xl border border-slate-800/80 flex items-center gap-3">
              <div className="p-2 rounded-xl bg-emerald-950/60 border border-emerald-500/30 text-emerald-400">
                <Sparkles className="w-4 h-4" />
              </div>
              <div>
                <div className="text-[11px] text-slate-400 font-medium">Unicorn Matches</div>
                <div className="text-lg font-black text-white font-mono">{stats.unicornMatches}</div>
              </div>
            </div>

            <div className="glass-panel p-3.5 rounded-2xl border border-slate-800/80 flex items-center gap-3">
              <div className="p-2 rounded-xl bg-blue-950/60 border border-blue-500/30 text-blue-400">
                <IndianRupee className="w-4 h-4" />
              </div>
              <div>
                <div className="text-[11px] text-slate-400 font-medium">Average Rent</div>
                <div className="text-lg font-black text-white font-mono">
                  {stats.avgRent ? `₹${stats.avgRent.toLocaleString('en-IN')}` : '—'}
                </div>
              </div>
            </div>

            <div className="glass-panel p-3.5 rounded-2xl border border-slate-800/80 flex items-center gap-3">
              <div className="p-2 rounded-xl bg-cyan-950/60 border border-cyan-500/30 text-cyan-400">
                <Clock className="w-4 h-4" />
              </div>
              <div>
                <div className="text-[11px] text-slate-400 font-medium">Avg Peak Commute</div>
                <div className="text-lg font-black text-white font-mono">{stats.avgPeakCommuteMins} mins</div>
              </div>
            </div>

            <div className="glass-panel p-3.5 rounded-2xl border border-slate-800/80 flex items-center gap-3">
              <div className="p-2 rounded-xl bg-indigo-950/60 border border-indigo-500/30 text-indigo-400">
                <Building className="w-4 h-4" />
              </div>
              <div>
                <div className="text-[11px] text-slate-400 font-medium">Gated Societies</div>
                <div className="text-lg font-black text-white font-mono">{stats.gatedCount}</div>
              </div>
            </div>

            <div className="glass-panel p-3.5 rounded-2xl border border-slate-800/80 flex items-center gap-3">
              <div className="p-2 rounded-xl bg-teal-950/60 border border-teal-500/30 text-teal-400">
                <Waves className="w-4 h-4" />
              </div>
              <div>
                <div className="text-[11px] text-slate-400 font-medium">Pool Access</div>
                <div className="text-lg font-black text-white font-mono">{stats.poolCount}</div>
              </div>
            </div>

            <div className="glass-panel p-3.5 rounded-2xl border border-slate-800/80 flex items-center gap-3">
              <div className="p-2 rounded-xl bg-purple-950/60 border border-purple-500/30 text-purple-400">
                <Layers className="w-4 h-4" />
              </div>
              <div>
                <div className="text-[11px] text-slate-400 font-medium">Total Listings</div>
                <div className="text-lg font-black text-white font-mono">{totalCount || stats.totalListings}</div>
              </div>
            </div>
          </div>
        )}

        {/* Filter & View Bar */}
        <FilterBar
          search={search}
          onSearchChange={setSearch}
          minScore={minScore}
          onMinScoreChange={setMinScore}
          maxRent={maxRent}
          onMaxRentChange={setMaxRent}
          bhkType={bhkType}
          onBhkTypeChange={setBhkType}
          furnishing={furnishing}
          onFurnishingChange={setFurnishing}
          userStatus={userStatus}
          onUserStatusChange={setUserStatus}
          recency={recency}
          onRecencyChange={setRecency}
          sortBy={sortBy}
          onSortByChange={setSortBy}
          viewMode={viewMode}
          onViewModeChange={setViewMode}
          onResetFilters={handleResetFilters}
        />

        {/* Main Content Area */}
        {error ? (
          <div className="glass-panel border-rose-500/40 bg-rose-950/30 p-5 rounded-2xl text-rose-300 flex items-center justify-between text-xs">
            <span>{error}</span>
            <button
              onClick={() => fetchListings(1, false)}
              className="px-3 py-1.5 rounded-lg bg-rose-600 hover:bg-rose-500 text-white font-bold"
            >
              Retry
            </button>
          </div>
        ) : viewMode === 'map' ? (
          <MapView
            listings={listings}
            onSelectListing={(l) => setSelectedScoreListing(l)}
            onStatusChange={handleStatusChange}
          />
        ) : viewMode === 'table' ? (
          <ListingTable
            listings={listings}
            onStatusChange={handleStatusChange}
            onOpenScoreModal={setSelectedScoreListing}
          />
        ) : (
          <div>
            {listings.length === 0 && !loading ? (
              <div className="glass-panel p-12 rounded-3xl text-center space-y-4 border border-slate-800">
                <div className="w-12 h-12 mx-auto rounded-2xl bg-slate-900 flex items-center justify-center text-slate-500">
                  <Sparkles className="w-6 h-6" />
                </div>
                <h3 className="text-base font-bold text-white">No Matching Listings Found</h3>
                <p className="text-xs text-slate-400 max-w-sm mx-auto">
                  Try adjusting your rent slider, lowering the minimum score threshold, or widening the recency window.
                </p>
                <button
                  onClick={handleResetFilters}
                  className="px-4 py-2 rounded-xl bg-emerald-500 hover:bg-emerald-400 text-slate-950 font-bold text-xs"
                >
                  Reset All Filters
                </button>
              </div>
            ) : (
              <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-5">
                {listings.map((listing) => (
                  <ListingCard
                    key={listing.id}
                    listing={listing}
                    onStatusChange={handleStatusChange}
                    onOpenScoreModal={setSelectedScoreListing}
                    onFocusMap={() => setViewMode('map')}
                  />
                ))}
              </div>
            )}
          </div>
        )}

        {/* Server-Side Pagination Controls */}
        {totalCount > 0 && viewMode !== 'map' && (
          <div className="glass-panel p-4 rounded-2xl border border-slate-800 flex flex-col sm:flex-row items-center justify-between gap-4 text-xs shadow-xl">
            {/* Range / Total Count Info */}
            <div className="text-slate-400 font-medium text-center sm:text-left">
              Showing{' '}
              <span className="text-white font-bold font-mono">
                {(page - 1) * 12 + 1}–{Math.min(page * 12, totalCount)}
              </span>{' '}
              of <span className="text-white font-bold font-mono">{totalCount}</span> listings
              <span className="mx-2 text-slate-600">•</span>
              Page <span className="text-emerald-400 font-bold font-mono">{page}</span> of{' '}
              <span className="text-slate-200 font-bold font-mono">{totalPages}</span>
            </div>

            {/* Navigation Buttons */}
            <div className="flex items-center gap-1.5 flex-wrap justify-center">
              {/* Previous Button */}
              <button
                onClick={() => handlePageChange(page - 1)}
                disabled={page <= 1 || loading}
                className="flex items-center gap-1 px-3 py-1.5 rounded-xl bg-slate-900 hover:bg-slate-800 border border-slate-700/80 text-slate-300 disabled:opacity-40 disabled:cursor-not-allowed transition-colors font-semibold"
                title="Previous Page"
              >
                <ChevronLeft className="w-3.5 h-3.5" />
                <span>Previous</span>
              </button>

              {/* Page Numbers */}
              <div className="flex items-center gap-1">
                {Array.from({ length: totalPages }, (_, i) => i + 1)
                  .filter((p) => {
                    if (totalPages <= 7) return true;
                    if (p === 1 || p === totalPages) return true;
                    return Math.abs(p - page) <= 1;
                  })
                  .reduce<(number | string)[]>((acc, p, idx, arr) => {
                    if (idx > 0 && typeof p === 'number' && typeof arr[idx - 1] === 'number') {
                      if ((p as number) - (arr[idx - 1] as number) > 1) {
                        acc.push('...');
                      }
                    }
                    acc.push(p);
                    return acc;
                  }, [])
                  .map((item, idx) =>
                    typeof item === 'string' ? (
                      <span key={`ellipsis-${idx}`} className="px-1.5 py-1 text-slate-500 font-mono">
                        …
                      </span>
                    ) : (
                      <button
                        key={item}
                        onClick={() => handlePageChange(item)}
                        disabled={loading}
                        className={`w-8 h-8 rounded-xl text-xs font-bold font-mono transition-colors ${
                          page === item
                            ? 'bg-emerald-500 text-slate-950 shadow-md shadow-emerald-500/20'
                            : 'bg-slate-900 hover:bg-slate-800 text-slate-300 border border-slate-700/80'
                        }`}
                      >
                        {item}
                      </button>
                    )
                  )}
              </div>

              {/* Next Button */}
              <button
                onClick={() => handlePageChange(page + 1)}
                disabled={page >= totalPages || !hasMore || loading}
                className="flex items-center gap-1 px-3 py-1.5 rounded-xl bg-slate-900 hover:bg-slate-800 border border-slate-700/80 text-slate-300 disabled:opacity-40 disabled:cursor-not-allowed transition-colors font-semibold"
                title="Next Page"
              >
                <span>Next</span>
                <ChevronRight className="w-3.5 h-3.5" />
              </button>
            </div>
          </div>
        )}

        {/* Score Breakdown Modal */}
        {selectedScoreListing && (
          <ScoreBreakdownModal
            listing={selectedScoreListing}
            onClose={() => setSelectedScoreListing(null)}
          />
        )}
      </div>
    </div>
  );
};
