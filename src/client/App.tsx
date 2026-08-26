import React, { useState, useEffect, useCallback } from 'react';
import { api } from './services/api';
import { RentalListing, DashboardStats, UserListingStatus } from '../domain/types';
import { HeaderStats } from './components/HeaderStats';
import { FilterBar } from './components/FilterBar';
import { ListingCard } from './components/ListingCard';
import { ListingTable } from './components/ListingTable';
import { ScoreBreakdownModal } from './components/ScoreBreakdownModal';
import { PasscodeModal } from './components/PasscodeModal';
import { Sparkles, AlertCircle, RefreshCw } from 'lucide-react';

export const App: React.FC = () => {
  const [listings, setListings] = useState<RentalListing[]>([]);
  const [stats, setStats] = useState<DashboardStats | null>(null);
  const [loading, setLoading] = useState<boolean>(true);
  const [isScraping, setIsScraping] = useState<boolean>(false);
  const [error, setError] = useState<string | null>(null);
  const [isAuthModalOpen, setIsAuthModalOpen] = useState<boolean>(false);

  // Filters State
  const [search, setSearch] = useState<string>('');
  const [minScore, setMinScore] = useState<number>(50);
  const [maxRent, setMaxRent] = useState<number>(35000);
  const [bhkType, setBhkType] = useState<string>('all');
  const [furnishing, setFurnishing] = useState<string>('all');
  const [userStatus, setUserStatus] = useState<string>('all');
  const [sortBy, setSortBy] = useState<string>('score_desc');
  const [viewMode, setViewMode] = useState<'grid' | 'table'>('grid');

  // Modal State
  const [inspectListing, setInspectListing] = useState<RentalListing | null>(null);

  const fetchStats = useCallback(async () => {
    try {
      const data = await api.getStats();
      setStats(data);
    } catch (err: any) {
      if (err.message === 'AUTH_REQUIRED') {
        setIsAuthModalOpen(true);
      }
    }
  }, []);

  const fetchListings = useCallback(async () => {
    setLoading(true);
    setError(null);
    try {
      const params = {
        search: search || undefined,
        minScore,
        maxRent: maxRent >= 40000 ? undefined : maxRent,
        bhkType: bhkType !== 'all' ? bhkType : undefined,
        furnishing: furnishing !== 'all' ? furnishing : undefined,
        userStatus: userStatus !== 'all' ? userStatus : undefined,
        sortBy,
      };
      const data = await api.getListings(params);
      setListings(data.listings);
    } catch (err: any) {
      if (err.message === 'AUTH_REQUIRED') {
        setIsAuthModalOpen(true);
      } else {
        setError(err.message || 'Failed to load listings');
      }
    } finally {
      setLoading(false);
    }
  }, [search, minScore, maxRent, bhkType, furnishing, userStatus, sortBy]);

  useEffect(() => {
    fetchStats();
    fetchListings();
  }, [fetchStats, fetchListings]);

  const handleStatusChange = async (id: number, newStatus: UserListingStatus) => {
    try {
      const result = await api.updateListingStatus(id, newStatus);
      if (result.success) {
        setListings((prev) =>
          prev.map((item) => (item.id === id ? { ...item, userStatus: newStatus } : item))
        );
        fetchStats();
      }
    } catch (err: any) {
      if (err.message === 'AUTH_REQUIRED') {
        setIsAuthModalOpen(true);
      } else {
        alert('Failed to update status: ' + err.message);
      }
    }
  };

  const handleTriggerScrape = async () => {
    setIsScraping(true);
    try {
      const res = await api.triggerScrape();
      alert(`Scraper triggered: ${res.message}`);
      await fetchStats();
      await fetchListings();
    } catch (err: any) {
      if (err.message === 'AUTH_REQUIRED') {
        setIsAuthModalOpen(true);
      } else {
        alert('Scrape failed: ' + err.message);
      }
    } finally {
      setIsScraping(false);
    }
  };

  const handleReseed = async () => {
    try {
      const res = await api.reseedData();
      alert(`Loaded ${res.count} realistic Kadubeesanahalli listings.`);
      await fetchStats();
      await fetchListings();
    } catch (err: any) {
      if (err.message === 'AUTH_REQUIRED') {
        setIsAuthModalOpen(true);
      } else {
        alert('Reseed failed: ' + err.message);
      }
    }
  };

  return (
    <div className="min-h-screen bg-slate-950 text-slate-100 flex flex-col selection:bg-indigo-500 selection:text-white">
      {/* Top Banner / Header */}
      <HeaderStats
        stats={stats}
        onTriggerScrape={handleTriggerScrape}
        onReseed={handleReseed}
        isScraping={isScraping}
      />

      {/* Main Content Area */}
      <main className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8 w-full flex-1 flex flex-col gap-6">
        {/* Controls Toolbar */}
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

        {/* Status / Loading / Error */}
        {error && (
          <div className="p-4 bg-rose-500/10 border border-rose-500/30 rounded-2xl flex items-center justify-between text-rose-300 text-sm">
            <div className="flex items-center gap-2">
              <AlertCircle className="w-5 h-5 text-rose-400" />
              <span>{error}</span>
            </div>
            <button
              onClick={() => fetchListings()}
              className="px-3 py-1 bg-rose-500/20 hover:bg-rose-500/30 rounded-lg text-xs font-semibold"
            >
              Retry
            </button>
          </div>
        )}

        {/* Listings Content */}
        {loading ? (
          <div className="flex-1 flex flex-col items-center justify-center py-24 text-slate-400 gap-3">
            <RefreshCw className="w-8 h-8 animate-spin text-indigo-400" />
            <p className="text-sm font-medium">Scanning live rental leads near PTP...</p>
          </div>
        ) : listings.length === 0 ? (
          <div className="flex-1 flex flex-col items-center justify-center py-20 text-center bg-slate-900/40 border border-slate-800 rounded-3xl p-8">
            <div className="p-4 bg-slate-800/80 rounded-2xl text-slate-400 mb-3">
              <Sparkles className="w-8 h-8 text-amber-400" />
            </div>
            <h3 className="text-lg font-bold text-white mb-1">No Matching Listings Found</h3>
            <p className="text-sm text-slate-400 max-w-md mb-6">
              Try adjusting your rent slider, lowering the minimum score threshold, or widening the BHK type.
            </p>
            <button
              onClick={() => {
                setMinScore(40);
                setMaxRent(40000);
                setBhkType('all');
                setUserStatus('all');
                setSearch('');
              }}
              className="px-4 py-2 bg-indigo-600 hover:bg-indigo-500 text-white rounded-xl text-xs font-semibold shadow-lg shadow-indigo-500/20"
            >
              Reset All Filters
            </button>
          </div>
        ) : viewMode === 'grid' ? (
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
            {listings.map((listing) => (
              <ListingCard
                key={listing.id}
                listing={listing}
                onStatusChange={handleStatusChange}
                onOpenScoreModal={setInspectListing}
              />
            ))}
          </div>
        ) : (
          <ListingTable
            listings={listings}
            onStatusChange={handleStatusChange}
            onOpenScoreModal={setInspectListing}
          />
        )}
      </main>

      {/* Score Breakdown Audit Modal */}
      {inspectListing && (
        <ScoreBreakdownModal
          listing={inspectListing}
          onClose={() => setInspectListing(null)}
        />
      )}

      {/* Passcode Security Modal */}
      <PasscodeModal
        isOpen={isAuthModalOpen}
        onSuccess={() => {
          setIsAuthModalOpen(false);
          fetchStats();
          fetchListings();
        }}
      />
    </div>
  );
};
