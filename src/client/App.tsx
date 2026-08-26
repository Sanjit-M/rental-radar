import React, { useState, useEffect, useCallback } from 'react';
import { RentalListing, DashboardStats, UserListingStatus } from '../domain/types';
import { api } from './services/api';
import { HeaderStats } from './components/HeaderStats';
import { FilterBar } from './components/FilterBar';
import { ListingCard } from './components/ListingCard';
import { ListingTable } from './components/ListingTable';
import { ScoreBreakdownModal } from './components/ScoreBreakdownModal';
import { Sparkles, Compass, AlertCircle } from 'lucide-react';

export const App: React.FC = () => {
  const [listings, setListings] = useState<RentalListing[]>([]);
  const [stats, setStats] = useState<DashboardStats | null>(null);
  const [isLoading, setIsLoading] = useState<boolean>(true);
  const [isScraping, setIsScraping] = useState<boolean>(false);
  const [error, setError] = useState<string | null>(null);

  // Filters
  const [search, setSearch] = useState<string>('');
  const [minScore, setMinScore] = useState<number>(0);
  const [maxRent, setMaxRent] = useState<number>(50000);
  const [bhkType, setBhkType] = useState<string>('all');
  const [furnishing, setFurnishing] = useState<string>('all');
  const [userStatus, setUserStatus] = useState<string>('all');
  const [sortBy, setSortBy] = useState<string>('score_desc');
  const [viewMode, setViewMode] = useState<'grid' | 'table'>('grid');

  // Modal
  const [selectedListing, setSelectedListing] = useState<RentalListing | null>(null);

  const fetchStats = async () => {
    try {
      const s = await api.getStats();
      setStats(s);
    } catch {
      // ignore
    }
  };

  const fetchListings = useCallback(async () => {
    try {
      setIsLoading(true);
      setError(null);
      const res = await api.getListings({
        minScore: minScore > 0 ? minScore : undefined,
        maxRent: maxRent < 50000 ? maxRent : undefined,
        bhkType: bhkType !== 'all' ? bhkType : undefined,
        furnishing: furnishing !== 'all' ? furnishing : undefined,
        userStatus: userStatus !== 'all' ? userStatus : undefined,
        search: search.trim() || undefined,
        sortBy,
      });
      setListings(res.listings);
      fetchStats();
    } catch (err: any) {
      setError(err.message || 'Failed to fetch listings');
    } finally {
      setIsLoading(false);
    }
  }, [minScore, maxRent, bhkType, furnishing, userStatus, search, sortBy]);

  useEffect(() => {
    fetchListings();
  }, [fetchListings]);

  const handleStatusChange = async (id: number, status: UserListingStatus) => {
    try {
      // Optimistic update
      setListings((prev) =>
        prev.map((l) => (l.id === id ? { ...l, userStatus: status } : l))
      );
      await api.updateListingStatus(id, status);
      fetchStats();
    } catch (err: any) {
      console.error('Failed to update status:', err);
      fetchListings();
    }
  };

  const handleTriggerScrape = async () => {
    try {
      setIsScraping(true);
      await api.triggerScrape();
      setTimeout(() => {
        setIsScraping(false);
        fetchListings();
      }, 3500);
    } catch (err: any) {
      setIsScraping(false);
      alert('Error triggering scrape: ' + err.message);
    }
  };

  const handleReseed = async () => {
    try {
      setIsLoading(true);
      await api.reseedData();
      await fetchListings();
    } catch (err: any) {
      alert('Error loading sample data: ' + err.message);
      setIsLoading(false);
    }
  };

  return (
    <div className="min-h-screen flex flex-col bg-[#030712] text-slate-100 pb-16">
      {/* Header & Stats Banner */}
      <HeaderStats
        stats={stats}
        onTriggerScrape={handleTriggerScrape}
        onReseed={handleReseed}
        isScraping={isScraping}
      />

      {/* Main Content */}
      <main className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-6 w-full flex-1">
        {/* Filters */}
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
          sortBy={sortBy}
          onSortByChange={setSortBy}
          viewMode={viewMode}
          onViewModeChange={setViewMode}
        />

        {/* Error State */}
        {error && (
          <div className="p-4 rounded-xl bg-rose-950/30 border border-rose-500/40 text-rose-300 text-sm flex items-center gap-2 mb-6">
            <AlertCircle className="w-4 h-4 shrink-0" />
            <span>{error}</span>
          </div>
        )}

        {/* Listings Display */}
        {isLoading ? (
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-5">
            {[1, 2, 3, 4, 5, 6].map((i) => (
              <div
                key={i}
                className="glass-panel p-5 rounded-2xl h-64 animate-pulse space-y-4"
              >
                <div className="h-4 bg-slate-800 rounded w-1/3"></div>
                <div className="h-6 bg-slate-800 rounded w-3/4"></div>
                <div className="h-10 bg-slate-800 rounded"></div>
                <div className="h-4 bg-slate-800 rounded w-1/2"></div>
              </div>
            ))}
          </div>
        ) : listings.length === 0 ? (
          <div className="glass-panel p-12 rounded-2xl text-center flex flex-col items-center justify-center max-w-lg mx-auto mt-8">
            <div className="p-3 bg-slate-900 border border-slate-800 rounded-2xl mb-4 text-emerald-400">
              <Compass className="w-8 h-8" />
            </div>
            <h3 className="text-base font-bold text-white mb-1">
              No matching flats found
            </h3>
            <p className="text-xs text-slate-400 mb-5">
              Try relaxing your rent or score filters, or load the realistic Kadubeesanahalli sample data.
            </p>
            <button
              onClick={handleReseed}
              className="px-4 py-2 rounded-lg bg-emerald-600 hover:bg-emerald-500 text-xs font-semibold text-white transition-colors"
            >
              Load Sample Kadubeesanahalli Listings
            </button>
          </div>
        ) : viewMode === 'grid' ? (
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-5">
            {listings.map((listing) => (
              <ListingCard
                key={listing.id}
                listing={listing}
                onStatusChange={handleStatusChange}
                onOpenScoreModal={setSelectedListing}
              />
            ))}
          </div>
        ) : (
          <ListingTable
            listings={listings}
            onStatusChange={handleStatusChange}
            onOpenScoreModal={setSelectedListing}
          />
        )}
      </main>

      {/* Point-by-Point Score Breakdown Modal */}
      <ScoreBreakdownModal
        listing={selectedListing}
        onClose={() => setSelectedListing(null)}
      />
    </div>
  );
};
