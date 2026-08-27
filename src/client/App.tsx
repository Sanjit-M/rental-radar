import React, { useState, useEffect, useCallback } from 'react';
import { RentalListing, DashboardStats, UserListingStatus, SortBy } from '../domain/types';
import { FilterBar } from './components/FilterBar';
import { ListingCard } from './components/ListingCard';
import { ListingTable } from './components/ListingTable';
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
  CheckCircle2,
  Loader2,
  PlusCircle,
  X,
  Send,
  Image as ImageIcon,
} from 'lucide-react';

export const App: React.FC = () => {
  // Listings & Pagination State
  const [listings, setListings] = useState<RentalListing[]>([]);
  const [stats, setStats] = useState<DashboardStats | null>(null);
  const [loading, setLoading] = useState(true);
  const [scrapePhase, setScrapePhase] = useState<'idle' | 'running' | 'completed' | 'error'>('idle');
  const [error, setError] = useState<string | null>(null);
  const [scrapeNotice, setScrapeNotice] = useState<string | null>(null);

  // Quick Ingest Modal State
  const [isIngestModalOpen, setIsIngestModalOpen] = useState(false);
  const [ingestText, setIngestText] = useState('');
  const [ingestUrl, setIngestUrl] = useState('');
  const [ingestImages, setIngestImages] = useState('');
  const [ingestLoading, setIngestLoading] = useState(false);
  const [ingestResult, setIngestResult] = useState<{ success: boolean; message: string; listing?: any } | null>(null);

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
  const [sortBy, setSortBy] = useState<SortBy>('score_desc');
  const [limit, setLimit] = useState<number>(12);
  const [viewMode, setViewMode] = useState<'grid' | 'table'>('grid');

  // Modal State
  const [selectedScoreListing, setSelectedScoreListing] = useState<RentalListing | null>(null);

  const fetchListings = useCallback(
    async (targetPage = 1, append = false, requestedLimit = limit) => {
      setLoading(true);
      setError(null);

      const result = await api.getListings({
        page: targetPage,
        limit: requestedLimit,
        minScore,
        maxRent,
        sortBy,
        ...(bhkType !== 'all' ? { bhkType } : {}),
        ...(furnishing !== 'all' ? { furnishing } : {}),
        ...(userStatus !== 'all' ? { userStatus } : {}),
        ...(recency !== 'all' ? { recency } : {}),
        ...(search.trim() ? { search: search.trim() } : {}),
      });

      if (result._tag === 'err') {
        console.error('Failed to fetch listings:', result.error);
        setError(result.error.message);
        setLoading(false);
        return;
      }

      const data = result.value;
      if (append) {
        setListings((prev) => [...prev, ...data.listings]);
      } else {
        setListings(data.listings);
      }
      setPage(data.page || 1);
      setTotalCount(data.totalCount || data.listings.length);
      setTotalPages(data.totalPages || 1);
      setHasMore(Boolean(data.hasMore));
      setLoading(false);
    },
    [limit, minScore, maxRent, bhkType, furnishing, userStatus, recency, search, sortBy]
  );

  const fetchStats = useCallback(async () => {
    const result = await api.getStats();
    if (result._tag === 'ok') {
      setStats(result.value);
    }
    // Non-critical: silently ignore stats fetch failures
  }, []);

  useEffect(() => {
    fetchListings(1, false, limit);
    fetchStats();
  }, [fetchListings, fetchStats, limit]);

  const handleStatusChange = async (id: number, status: UserListingStatus) => {
    // Optimistic update
    setListings((prev) =>
      prev.map((l) => (l.id === id ? { ...l, userStatus: status } : l))
    );
    const result = await api.updateListingStatus(id, status);
    if (result._tag === 'err') {
      console.error('Status update failed:', result.error.message);
      // Revert optimistic update on failure
      fetchListings(page, false, limit);
      return;
    }
    fetchStats();
  };

  const handleTriggerScrape = async () => {
    if (scrapePhase === 'running') return;
    setScrapePhase('running');
    setScrapeNotice('⚡ Dispatching live scraper workflow in GitHub Actions...');

    const result = await api.triggerScrape();
    if (result._tag === 'err') {
      setScrapePhase('error');
      setScrapeNotice(`Scrape failed: ${result.error.message}`);
      return;
    }

    setScrapeNotice('⚡ GitHub Actions scraper is running... Scanning Facebook groups & syncing listings.');

    // Poll for workflow run completion
    let attempts = 0;
    const maxAttempts = 60; // Up to ~3.5 minutes (60 * 3.5s)

    const interval = setInterval(async () => {
      attempts++;
      const statusRes = await api.getScrapeStatus();

      if (statusRes._tag === 'ok') {
        const statusData = statusRes.value;

        if (statusData.status === 'in_progress' || statusData.status === 'queued') {
          setScrapeNotice(
            `⚡ Scraper running (${attempts * 3}s elapsed)... Scraping groups and computing commute scores.`
          );
        } else if (statusData.status === 'completed') {
          clearInterval(interval);

          if (statusData.conclusion === 'success') {
            setScrapePhase('completed');
            setScrapeNotice('✓ Scrape complete! All new listings have been processed and synced to Turso.');
            fetchListings(1, false, limit);
            fetchStats();

            setTimeout(() => {
              setScrapePhase('idle');
            }, 8000);
          } else {
            setScrapePhase('error');
            setScrapeNotice(
              `Scraper finished with status: ${statusData.conclusion || 'failed'}. Check GitHub Actions for details.`
            );
          }
          return;
        }
      }

      if (attempts >= maxAttempts) {
        clearInterval(interval);
        setScrapePhase('completed');
        setScrapeNotice('✓ Scrape cycle window completed. Refreshing listings.');
        fetchListings(1, false, limit);
        fetchStats();
        setTimeout(() => {
          setScrapePhase('idle');
        }, 8000);
      }
    }, 3500);
  };

  const handleQuickIngest = async () => {
    if (!ingestText.trim() || ingestLoading) return;
    setIngestLoading(true);
    setIngestResult(null);

    const imageUrlsList = ingestImages
      .split(',')
      .map((s) => s.trim())
      .filter((s) => s.startsWith('http'));

    const res = await api.parseSinglePost(
      ingestText.trim(),
      ingestUrl.trim() || undefined,
      imageUrlsList.length > 0 ? imageUrlsList : undefined
    );

    setIngestLoading(false);
    if (res._tag === 'err') {
      setIngestResult({ success: false, message: `Error: ${res.error.message}` });
      return;
    }

    const data = res.value;
    if (data.filtered) {
      setIngestResult({
        success: false,
        message: `Filter Rejection: ${data.reason || 'Post did not match location/criteria'}`,
      });
      return;
    }

    if (data.success && data.listing) {
      setIngestResult({
        success: true,
        message: `✨ Ingested & Ranked! Score: ${data.listing.score} pts (${data.listing.tier})`,
        listing: data.listing,
      });
      // Refresh feed
      fetchListings(1, false, limit);
      fetchStats();
    } else {
      setIngestResult({
        success: false,
        message: data.error || 'Failed to parse post details',
      });
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
    setLimit(12);
  };

  const handleLimitChange = (newLimit: number) => {
    setLimit(newLimit);
    setPage(1);
    fetchListings(1, false, newLimit);
  };

  const handlePageChange = (newPage: number) => {
    if (newPage >= 1 && newPage <= totalPages && newPage !== page && !loading) {
      fetchListings(newPage, false, limit);
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

          <div className="flex items-center gap-2.5 w-full md:w-auto justify-end flex-wrap">
            <button
              onClick={() => {
                setIsIngestModalOpen(true);
                setIngestResult(null);
              }}
              className="flex items-center justify-center gap-2 px-3.5 py-2 rounded-xl font-bold text-xs bg-slate-900 hover:bg-slate-800 text-cyan-400 border border-cyan-500/30 shadow-lg shadow-cyan-500/10 transition-all"
            >
              <PlusCircle className="w-3.5 h-3.5" />
              <span>Test / Ingest Post</span>
            </button>

            <button
              onClick={handleTriggerScrape}
              disabled={scrapePhase === 'running'}
              className={`flex items-center justify-center gap-2 px-4 py-2 rounded-xl font-bold text-xs shadow-lg transition-all ${
                scrapePhase === 'completed'
                  ? 'bg-emerald-600 text-white shadow-emerald-500/20'
                  : scrapePhase === 'running'
                  ? 'bg-amber-400 text-slate-950 shadow-amber-500/20'
                  : 'bg-emerald-500 hover:bg-emerald-400 text-slate-950 shadow-emerald-500/20'
              } disabled:cursor-not-allowed`}
            >
              {scrapePhase === 'running' ? (
                <>
                  <Loader2 className="w-3.5 h-3.5 animate-spin" />
                  <span>Scraping Groups (Live)...</span>
                </>
              ) : scrapePhase === 'completed' ? (
                <>
                  <CheckCircle2 className="w-4 h-4 text-emerald-200" />
                  <span>Scrape Complete ✓</span>
                </>
              ) : (
                <>
                  <RefreshCw className="w-3.5 h-3.5" />
                  <span>Check Groups Now</span>
                </>
              )}
            </button>
          </div>
        </header>

        {/* Live Notification Bar */}
        {scrapeNotice && (
          <div
            className={`glass-panel p-3.5 rounded-2xl text-xs flex items-center justify-between shadow-lg ${
              scrapePhase === 'error'
                ? 'border-rose-500/40 bg-rose-950/40 text-rose-300'
                : scrapePhase === 'running'
                ? 'border-amber-500/40 bg-amber-950/40 text-amber-300 animate-pulse'
                : 'border-emerald-500/40 bg-emerald-950/40 text-emerald-300'
            }`}
          >
            <div className="flex items-center gap-2">
              {scrapePhase === 'running' && <Loader2 className="w-3.5 h-3.5 animate-spin shrink-0 text-amber-400" />}
              {scrapePhase === 'completed' && <CheckCircle2 className="w-4 h-4 shrink-0 text-emerald-400" />}
              <span>{scrapeNotice}</span>
            </div>
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
          limit={limit}
          onLimitChange={handleLimitChange}
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
                  />
                ))}
              </div>
            )}
          </div>
        )}

        {/* Server-Side Pagination Controls */}
        {totalCount > 0 && (
          <div className="glass-panel p-4 rounded-2xl border border-slate-800 flex flex-col sm:flex-row items-center justify-between gap-4 text-xs shadow-xl">
            {/* Range / Total Count Info */}
            <div className="text-slate-400 font-medium text-center sm:text-left">
              Showing{' '}
              <span className="text-white font-bold font-mono">
                {totalCount === 0 ? 0 : (page - 1) * limit + 1}–{Math.min(page * limit, totalCount)}
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

        {/* Quick Ingest & Test Post Modal */}
        {isIngestModalOpen && (
          <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-950/80 backdrop-blur-md animate-fade-in">
            <div className="glass-panel w-full max-w-xl p-6 rounded-3xl border border-slate-700/80 shadow-2xl space-y-4">
              <div className="flex items-center justify-between pb-3 border-b border-slate-800">
                <div className="flex items-center gap-2.5">
                  <div className="p-2 rounded-xl bg-cyan-950/80 border border-cyan-500/40 text-cyan-400">
                    <Sparkles className="w-5 h-5" />
                  </div>
                  <div>
                    <h3 className="text-base font-bold text-white">Test / Ingest Rental Post</h3>
                    <p className="text-xs text-slate-400">
                      Paste raw Facebook / Telegram text to test the location extraction & commute engine
                    </p>
                  </div>
                </div>
                <button
                  onClick={() => setIsIngestModalOpen(false)}
                  className="p-1.5 rounded-xl hover:bg-slate-800 text-slate-400 hover:text-white transition-colors"
                >
                  <X className="w-5 h-5" />
                </button>
              </div>

              {/* Input Form */}
              <div className="space-y-3 text-xs">
                <div>
                  <label className="block text-slate-300 font-semibold mb-1">
                    Raw Post Text <span className="text-rose-400">*</span>
                  </label>
                  <textarea
                    value={ingestText}
                    onChange={(e) => setIngestText(e.target.value)}
                    placeholder="e.g. 1 Room available in 3BHK flat in Kadubeesanahalli near Cessna. Rent ₹22,000, deposit ₹45,000. Attached washroom, swimming pool, power backup. Contact: 9845012345"
                    rows={5}
                    className="w-full bg-slate-900 border border-slate-700/80 rounded-xl p-3 text-slate-200 focus:outline-none focus:border-cyan-500 font-sans leading-relaxed"
                  />
                </div>

                <div>
                  <label className="block text-slate-300 font-semibold mb-1">
                    Original Post URL <span className="text-slate-500">(Optional)</span>
                  </label>
                  <input
                    type="text"
                    value={ingestUrl}
                    onChange={(e) => setIngestUrl(e.target.value)}
                    placeholder="https://www.facebook.com/groups/... or https://t.me/..."
                    className="w-full bg-slate-900 border border-slate-700/80 rounded-xl px-3 py-2 text-slate-200 focus:outline-none focus:border-cyan-500 font-mono text-[11px]"
                  />
                </div>

                <div>
                  <label className="block text-slate-300 font-semibold mb-1">
                    Image URLs <span className="text-slate-500">(Optional, comma separated)</span>
                  </label>
                  <input
                    type="text"
                    value={ingestImages}
                    onChange={(e) => setIngestImages(e.target.value)}
                    placeholder="https://...image1.jpg, https://...image2.jpg"
                    className="w-full bg-slate-900 border border-slate-700/80 rounded-xl px-3 py-2 text-slate-200 focus:outline-none focus:border-cyan-500 font-mono text-[11px]"
                  />
                </div>
              </div>

              {/* Feedback Banner */}
              {ingestResult && (
                <div
                  className={`p-3.5 rounded-xl text-xs flex items-center justify-between border ${
                    ingestResult.success
                      ? 'bg-emerald-950/40 border-emerald-500/40 text-emerald-300'
                      : 'bg-rose-950/40 border-rose-500/40 text-rose-300'
                  }`}
                >
                  <div className="flex items-center gap-2">
                    {ingestResult.success ? (
                      <CheckCircle2 className="w-4 h-4 text-emerald-400 shrink-0" />
                    ) : (
                      <X className="w-4 h-4 text-rose-400 shrink-0" />
                    )}
                    <span>{ingestResult.message}</span>
                  </div>
                </div>
              )}

              {/* Modal Actions */}
              <div className="flex items-center justify-end gap-2.5 pt-2">
                <button
                  type="button"
                  onClick={() => setIsIngestModalOpen(false)}
                  className="px-4 py-2 rounded-xl bg-slate-800 hover:bg-slate-700 text-slate-300 font-semibold text-xs transition-colors"
                >
                  Close
                </button>

                <button
                  type="button"
                  onClick={handleQuickIngest}
                  disabled={!ingestText.trim() || ingestLoading}
                  className="flex items-center gap-2 px-5 py-2 rounded-xl bg-gradient-to-r from-emerald-500 to-teal-500 hover:from-emerald-400 hover:to-teal-400 text-slate-950 font-bold text-xs shadow-lg shadow-emerald-500/20 disabled:opacity-50 disabled:cursor-not-allowed transition-all"
                >
                  {ingestLoading ? (
                    <>
                      <Loader2 className="w-3.5 h-3.5 animate-spin" />
                      <span>Parsing & Scoring...</span>
                    </>
                  ) : (
                    <>
                      <Send className="w-3.5 h-3.5" />
                      <span>Parse & Ingest</span>
                    </>
                  )}
                </button>
              </div>
            </div>
          </div>
        )}
      </div>
    </div>
  );
};

export default App;

