import React, { useState, useEffect, useCallback } from 'react';
import type {
  RentalListing,
  DashboardStats,
  UserListingStatus,
  SortBy,
} from '../domain/types';
import { FilterBar } from './components/FilterBar';
import { CorridorFilter, BANGALORE_CORRIDORS } from './components/CorridorFilter';
import { ListingCard } from './components/ListingCard';
import { ListingTable } from './components/ListingTable';
import { ScoreBreakdownModal } from './components/ScoreBreakdownModal';
import { CommandPalette } from './components/CommandPalette';
import { PriceCommuteHistogram } from './components/PriceCommuteHistogram';
import { ListingDrawer } from './components/ListingDrawer';
import { QuickIngestModal } from './components/QuickIngestModal';
import { GroupsDirectoryView } from './components/GroupsDirectoryView';
import { PlacesDirectoryView } from './components/PlacesDirectoryView';
import { ToastStack, toast } from './components/ToastStack';
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
  Search,
  Users,
  MapPin,
} from 'lucide-react';

export type WorkspaceTab = 'listings' | 'groups' | 'places';
type ScrapePhase = 'idle' | 'running' | 'completed' | 'error';

interface AppHeaderProps {
  readonly scrapePhase: ScrapePhase;
  readonly onOpenCommandPalette: () => void;
  readonly onOpenIngestModal: () => void;
  readonly onTriggerScrape: () => void;
}

const AppHeader: React.FC<AppHeaderProps> = ({
  scrapePhase,
  onOpenCommandPalette,
  onOpenIngestModal,
  onTriggerScrape,
}) => {
  return (
    <header className="bg-[#11131A]/95 p-6 rounded-3xl flex flex-col md:flex-row items-start md:items-center justify-between gap-4 border border-white/[0.08] shadow-2xl">
      <div className="flex items-center gap-4">
        <div className="w-12 h-12 rounded-2xl bg-gradient-to-tr from-emerald-500 to-teal-400 flex items-center justify-center shadow-lg shadow-emerald-500/20 shrink-0">
          <Compass className="w-7 h-7 text-slate-950" />
        </div>
        <div>
          <div className="flex items-center gap-2 flex-wrap">
            <h1 className="text-xl md:text-2xl font-black text-white tracking-tight">
              Bangalore Rental Radar
            </h1>
            <span className="text-[10px] font-bold uppercase tracking-wider bg-emerald-500/10 text-emerald-400 border border-emerald-500/30 px-2 py-0.5 rounded-full">
              City-Wide v3
            </span>
          </div>
          <p className="text-xs text-slate-400 mt-0.5">
            Daily Facebook group scraper, Google Maps place resolver & Peak PTP Scooter Commute ranker
          </p>
        </div>
      </div>

      <div className="flex items-center gap-2.5 w-full md:w-auto justify-end flex-wrap">
        <button
          type="button"
          onClick={onOpenCommandPalette}
          className="flex items-center justify-center gap-2 px-3.5 py-2 rounded-xl font-bold text-xs bg-[#090A0F] hover:bg-white/[0.06] text-slate-300 hover:text-white border border-white/[0.08] hover:border-emerald-500/50 shadow-lg transition-[background-color,border-color,color,transform] duration-140 ease-[var(--ease-out)] active:scale-[0.97]"
          title="Open Command Palette (Cmd+K / Ctrl+K)"
        >
          <Search className="w-3.5 h-3.5 text-emerald-400" />
          <span>Commands</span>
          <kbd className="hidden sm:inline px-1.5 py-0.5 text-[10px] font-mono bg-slate-950 text-slate-400 rounded border border-slate-800">
            ⌘K
          </kbd>
        </button>

        <button
          type="button"
          onClick={onOpenIngestModal}
          className="flex items-center justify-center gap-2 px-3.5 py-2 rounded-xl font-bold text-xs bg-[#090A0F] hover:bg-white/[0.06] text-cyan-400 border border-cyan-500/30 shadow-lg shadow-cyan-500/10 transition-[background-color,border-color,color,transform] duration-140 ease-[var(--ease-out)] active:scale-[0.97]"
        >
          <PlusCircle className="w-3.5 h-3.5" />
          <span>Test / Ingest Post</span>
        </button>

        <button
          type="button"
          onClick={onTriggerScrape}
          disabled={scrapePhase === 'running'}
          className={`flex items-center justify-center gap-2 px-4 py-2 rounded-xl font-bold text-xs shadow-lg transition-[background-color,box-shadow,transform] duration-140 ease-[var(--ease-out)] active:scale-[0.97] ${
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
  );
};

const ScrapeNoticeBanner: React.FC<{
  readonly scrapeNotice: string | null;
  readonly scrapePhase: ScrapePhase;
  readonly onDismiss: () => void;
}> = ({ scrapeNotice, scrapePhase, onDismiss }) => {
  if (!scrapeNotice) return null;

  return (
    <div
      className={`bg-[#11131A] p-3.5 rounded-2xl text-xs flex items-center justify-between border shadow-lg ${
        scrapePhase === 'error'
          ? 'border-rose-500/40 bg-rose-950/40 text-rose-300'
          : scrapePhase === 'running'
            ? 'border-amber-500/40 bg-amber-950/40 text-amber-300'
            : 'border-emerald-500/40 bg-emerald-950/40 text-emerald-300'
      }`}
    >
      <div className="flex items-center gap-2">
        {scrapePhase === 'running' && (
          <Loader2 className="w-3.5 h-3.5 animate-spin shrink-0 text-amber-400" />
        )}
        {scrapePhase === 'completed' && (
          <CheckCircle2 className="w-4 h-4 shrink-0 text-emerald-400" />
        )}
        <span>{scrapeNotice}</span>
      </div>
      <button
        type="button"
        aria-label="Dismiss scrape notification"
        onClick={onDismiss}
        className="text-slate-400 hover:text-white font-bold ml-4"
      >
        ✕
      </button>
    </div>
  );
};

interface WorkspaceTabsBarProps {
  readonly activeTab: WorkspaceTab;
  readonly onSelectTab: (tab: WorkspaceTab) => void;
  readonly totalListingsCount: number;
}

const WorkspaceTabsBar: React.FC<WorkspaceTabsBarProps> = ({
  activeTab,
  onSelectTab,
  totalListingsCount,
}) => {
  const tabs: readonly {
    readonly id: WorkspaceTab;
    readonly label: string;
    readonly icon: React.ReactNode;
    readonly badge?: string | undefined;
  }[] = [
    {
      id: 'listings',
      label: 'Listings Feed',
      icon: <Layers className="w-4 h-4" />,
      badge: totalListingsCount > 0 ? String(totalListingsCount) : undefined,
    },
    {
      id: 'groups',
      label: 'Joined FB Groups',
      icon: <Users className="w-4 h-4" />,
    },
    {
      id: 'places',
      label: 'Bangalore Places',
      icon: <MapPin className="w-4 h-4" />,
    },
  ];

  return (
    <nav
      aria-label="Rental Radar Workspace Tabs"
      className="bg-[#11131A]/90 p-1.5 rounded-2xl border border-white/[0.08] flex items-center gap-1.5 overflow-x-auto no-scrollbar shadow-lg"
    >
      {tabs.map((tab) => {
        const isActive = activeTab === tab.id;
        return (
          <button
            key={tab.id}
            type="button"
            onClick={() => onSelectTab(tab.id)}
            className={`flex items-center gap-2 px-4 py-2 rounded-xl text-xs font-bold transition-[background-color,color,transform] duration-140 ease-[var(--ease-out)] active:scale-[0.97] shrink-0 ${
              isActive
                ? 'bg-emerald-500 text-slate-950 shadow-md shadow-emerald-500/20'
                : 'text-slate-300 hover:text-white hover:bg-white/[0.05]'
            }`}
          >
            {tab.icon}
            <span>{tab.label}</span>
            {tab.badge && (
              <span
                className={`px-1.5 py-0.5 rounded-full text-[10px] font-mono tabular-nums ${
                  isActive
                    ? 'bg-slate-950/20 text-slate-950 font-black'
                    : 'bg-[#090A0F] text-emerald-400 border border-white/[0.08]'
                }`}
              >
                {tab.badge}
              </span>
            )}
          </button>
        );
      })}
    </nav>
  );
};

interface StatsMetricsGridProps {
  readonly stats: DashboardStats;
  readonly totalCount: number;
}

const StatsMetricsGrid: React.FC<StatsMetricsGridProps> = ({ stats, totalCount }) => {
  return (
    <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-6 gap-3">
      <div className="bg-[#11131A]/90 p-3.5 rounded-2xl border border-white/[0.08] flex items-center gap-3">
        <div className="p-2 rounded-xl bg-emerald-950/60 border border-emerald-500/30 text-emerald-400">
          <Sparkles className="w-4 h-4" />
        </div>
        <div>
          <div className="text-[11px] text-slate-400 font-medium">Unicorn Matches</div>
          <div className="text-lg font-black text-white font-mono tabular-nums">
            {stats.unicornMatches}
          </div>
        </div>
      </div>

      <div className="bg-[#11131A]/90 p-3.5 rounded-2xl border border-white/[0.08] flex items-center gap-3">
        <div className="p-2 rounded-xl bg-blue-950/60 border border-blue-500/30 text-blue-400">
          <IndianRupee className="w-4 h-4" />
        </div>
        <div>
          <div className="text-[11px] text-slate-400 font-medium">Average Rent</div>
          <div className="text-lg font-black text-white font-mono tabular-nums">
            {stats.avgRent ? `₹${stats.avgRent.toLocaleString('en-IN')}` : '—'}
          </div>
        </div>
      </div>

      <div className="bg-[#11131A]/90 p-3.5 rounded-2xl border border-white/[0.08] flex items-center gap-3">
        <div className="p-2 rounded-xl bg-cyan-950/60 border border-cyan-500/30 text-cyan-400">
          <Clock className="w-4 h-4" />
        </div>
        <div>
          <div className="text-[11px] text-slate-400 font-medium">Avg Peak Commute</div>
          <div className="text-lg font-black text-white font-mono tabular-nums">
            {stats.avgPeakCommuteMins} mins
          </div>
        </div>
      </div>

      <div className="bg-[#11131A]/90 p-3.5 rounded-2xl border border-white/[0.08] flex items-center gap-3">
        <div className="p-2 rounded-xl bg-indigo-950/60 border border-indigo-500/30 text-indigo-400">
          <Building className="w-4 h-4" />
        </div>
        <div>
          <div className="text-[11px] text-slate-400 font-medium">Gated Societies</div>
          <div className="text-lg font-black text-white font-mono tabular-nums">
            {stats.gatedCount}
          </div>
        </div>
      </div>

      <div className="bg-[#11131A]/90 p-3.5 rounded-2xl border border-white/[0.08] flex items-center gap-3">
        <div className="p-2 rounded-xl bg-teal-950/60 border border-teal-500/30 text-teal-400">
          <Waves className="w-4 h-4" />
        </div>
        <div>
          <div className="text-[11px] text-slate-400 font-medium">Pool Access</div>
          <div className="text-lg font-black text-white font-mono tabular-nums">
            {stats.poolCount}
          </div>
        </div>
      </div>

      <div className="bg-[#11131A]/90 p-3.5 rounded-2xl border border-white/[0.08] flex items-center gap-3">
        <div className="p-2 rounded-xl bg-purple-950/60 border border-purple-500/30 text-purple-400">
          <Layers className="w-4 h-4" />
        </div>
        <div>
          <div className="text-[11px] text-slate-400 font-medium">Total Listings</div>
          <div className="text-lg font-black text-white font-mono tabular-nums">
            {totalCount || stats.totalListings}
          </div>
        </div>
      </div>
    </div>
  );
};

interface PaginationBarProps {
  readonly page: number;
  readonly limit: number;
  readonly totalCount: number;
  readonly totalPages: number;
  readonly hasMore: boolean;
  readonly loading: boolean;
  readonly onPageChange: (page: number) => void;
}

function buildPageTokens(
  page: number,
  totalPages: number,
): (number | { readonly ellipsisAfter: number })[] {
  const visiblePages: number[] = [];
  for (let p = 1; p <= totalPages; p += 1) {
    if (totalPages <= 7 || p === 1 || p === totalPages || Math.abs(p - page) <= 1) {
      visiblePages.push(p);
    }
  }

  const tokens: (number | { readonly ellipsisAfter: number })[] = [];
  for (let idx = 0; idx < visiblePages.length; idx += 1) {
    const current = visiblePages[idx];
    const prev = idx > 0 ? visiblePages[idx - 1] : undefined;
    if (typeof current === 'number') {
      if (typeof prev === 'number' && current - prev > 1) {
        tokens.push({ ellipsisAfter: prev });
      }
      tokens.push(current);
    }
  }
  return tokens;
}

const PaginationBar: React.FC<PaginationBarProps> = ({
  page,
  limit,
  totalCount,
  totalPages,
  hasMore,
  loading,
  onPageChange,
}) => {
  if (totalCount <= 0) return null;

  const pageTokens = buildPageTokens(page, totalPages);

  return (
    <div className="bg-[#11131A]/90 p-4 rounded-2xl border border-white/[0.08] flex flex-col sm:flex-row items-center justify-between gap-4 text-xs shadow-xl">
      <div className="text-slate-400 font-medium text-center sm:text-left">
        Showing{' '}
        <span className="text-white font-bold font-mono tabular-nums">
          {totalCount === 0 ? 0 : (page - 1) * limit + 1}–{Math.min(page * limit, totalCount)}
        </span>{' '}
        of <span className="text-white font-bold font-mono tabular-nums">{totalCount}</span>{' '}
        listings
        <span className="mx-2 text-slate-600">•</span>
        Page <span className="text-emerald-400 font-bold font-mono tabular-nums">{page}</span> of{' '}
        <span className="text-slate-200 font-bold font-mono tabular-nums">{totalPages}</span>
      </div>

      <div className="flex items-center gap-1.5 flex-wrap justify-center">
        <button
          type="button"
          onClick={() => onPageChange(page - 1)}
          disabled={page <= 1 || loading}
          className="flex items-center gap-1 px-3 py-1.5 rounded-xl bg-[#090A0F] hover:bg-white/[0.06] border border-white/[0.08] text-slate-300 disabled:opacity-40 disabled:cursor-not-allowed transition-[background-color,border-color,color,transform] duration-140 ease-[var(--ease-out)] active:scale-[0.97] font-semibold"
          title="Previous Page"
        >
          <ChevronLeft className="w-3.5 h-3.5" />
          <span>Previous</span>
        </button>

        <div className="flex items-center gap-1">
          {pageTokens.map((item) =>
            typeof item === 'object' ? (
              <span
                key={`ellipsis-${item.ellipsisAfter}`}
                className="px-1.5 py-1 text-slate-500 font-mono"
              >
                …
              </span>
            ) : (
              <button
                key={item}
                type="button"
                onClick={() => onPageChange(item)}
                disabled={loading}
                className={`w-8 h-8 rounded-xl text-xs font-bold font-mono tabular-nums transition-[background-color,color,transform] duration-140 ease-[var(--ease-out)] active:scale-[0.97] ${
                  page === item
                    ? 'bg-emerald-500 text-slate-950 shadow-md shadow-emerald-500/20'
                    : 'bg-[#090A0F] hover:bg-white/[0.06] text-slate-300 border border-white/[0.08]'
                }`}
              >
                {item}
              </button>
            ),
          )}
        </div>

        <button
          type="button"
          onClick={() => onPageChange(page + 1)}
          disabled={page >= totalPages || !hasMore || loading}
          className="flex items-center gap-1 px-3 py-1.5 rounded-xl bg-[#090A0F] hover:bg-white/[0.06] border border-white/[0.08] text-slate-300 disabled:opacity-40 disabled:cursor-not-allowed transition-[background-color,border-color,color,transform] duration-140 ease-[var(--ease-out)] active:scale-[0.97] font-semibold"
          title="Next Page"
        >
          <span>Next</span>
          <ChevronRight className="w-3.5 h-3.5" />
        </button>
      </div>
    </div>
  );
};

interface ListingsResultsSectionProps {
  readonly error: string | null;
  readonly loading: boolean;
  readonly viewMode: 'grid' | 'table';
  readonly displayedListings: RentalListing[];
  readonly onRetry: () => void;
  readonly onResetFilters: () => void;
  readonly onStatusChange: (id: number, status: UserListingStatus) => void;
  readonly onOpenScoreModal: (listing: RentalListing) => void;
  readonly onOpenDrawer: (listing: RentalListing) => void;
}

const ListingsResultsSection: React.FC<ListingsResultsSectionProps> = ({
  error,
  loading,
  viewMode,
  displayedListings,
  onRetry,
  onResetFilters,
  onStatusChange,
  onOpenScoreModal,
  onOpenDrawer,
}) => {
  if (error) {
    return (
      <div className="bg-rose-950/30 border border-rose-500/40 p-5 rounded-2xl text-rose-300 flex items-center justify-between text-xs">
        <span>{error}</span>
        <button
          type="button"
          onClick={onRetry}
          className="px-3 py-1.5 rounded-lg bg-rose-600 hover:bg-rose-500 text-white font-bold"
        >
          Retry
        </button>
      </div>
    );
  }

  if (displayedListings.length === 0 && !loading && viewMode !== 'table') {
    return (
      <div className="bg-[#11131A]/90 p-12 rounded-3xl text-center space-y-4 border border-white/[0.08]">
        <div className="w-12 h-12 mx-auto rounded-2xl bg-[#090A0F] flex items-center justify-center text-slate-500">
          <Sparkles className="w-6 h-6" />
        </div>
        <h3 className="text-base font-bold text-white">No Matching Listings Found</h3>
        <p className="text-xs text-slate-400 max-w-sm mx-auto">
          Try adjusting your rent slider, lowering the minimum score threshold, or widening the recency window.
        </p>
        <button
          type="button"
          onClick={onResetFilters}
          className="px-4 py-2 rounded-xl bg-emerald-500 hover:bg-emerald-400 text-slate-950 font-bold text-xs"
        >
          Reset All Filters
        </button>
      </div>
    );
  }

  return viewMode === 'table' ? (
    <ListingTable
      listings={displayedListings}
      onStatusChange={onStatusChange}
      onOpenScoreModal={onOpenScoreModal}
      onOpenDrawer={onOpenDrawer}
    />
  ) : (
    <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-5">
      {displayedListings.map((listing) => (
        <ListingCard
          key={listing.id}
          listing={listing}
          onStatusChange={onStatusChange}
          onOpenScoreModal={onOpenScoreModal}
          onOpenDrawer={onOpenDrawer}
        />
      ))}
    </div>
  );
};

function filterDisplayedListings(
  listings: readonly RentalListing[],
  zeroBrokerageOnly: boolean,
  bachelorFriendlyOnly: boolean,
  selectedCorridor: string,
  search: string,
): RentalListing[] {
  return listings.filter((l) => {
    if (zeroBrokerageOnly && l.entities.isBrokerage) return false;
    if (bachelorFriendlyOnly && (l.entities.isFemaleOnly || !l.entities.isMaleBachelorAllowed)) {
      return false;
    }
    if (selectedCorridor !== 'all' && search.trim()) {
      const text =
        `${l.location} ${l.landmark ?? ''} ${l.entities.societyName ?? ''} ${l.rawText}`.toLowerCase();
      if (!text.includes(selectedCorridor.toLowerCase())) return false;
    }
    return true;
  });
}

function useScrapePoller(
  scrapePhase: ScrapePhase,
  setScrapePhase: React.Dispatch<React.SetStateAction<ScrapePhase>>,
  setScrapeNotice: React.Dispatch<React.SetStateAction<string | null>>,
  onCompleteRefresh: () => void,
) {
  useEffect(() => {
    if (scrapePhase !== 'running') return;

    let attempts = 0;
    const maxAttempts = 60;

    const interval = setInterval(async () => {
      attempts += 1;
      const statusRes = await api.getScrapeStatus();

      if (statusRes._tag === 'ok') {
        const statusData = statusRes.value;
        if (statusData.status === 'in_progress' || statusData.status === 'queued') {
          setScrapeNotice(
            `Scraper running (${attempts * 3}s elapsed)... Scanning groups and computing commute scores.`,
          );
        } else if (statusData.status === 'completed') {
          clearInterval(interval);
          if (statusData.conclusion === 'success') {
            setScrapePhase('completed');
            setScrapeNotice(
              'Scrape complete! All new listings have been processed and synced to Turso.',
            );
            onCompleteRefresh();
          } else {
            setScrapePhase('error');
            setScrapeNotice(
              `Scraper finished with status: ${statusData.conclusion || 'failed'}. Check GitHub Actions for details.`,
            );
          }
          return;
        }
      }

      if (attempts >= maxAttempts) {
        clearInterval(interval);
        setScrapePhase('completed');
        setScrapeNotice('Scrape cycle window completed. Refreshing listings.');
        onCompleteRefresh();
      }
    }, 3500);

    return () => clearInterval(interval);
  }, [scrapePhase, setScrapePhase, setScrapeNotice, onCompleteRefresh]);

  useEffect(() => {
    if (scrapePhase !== 'completed') return;
    const timer = setTimeout(() => {
      setScrapePhase('idle');
    }, 8000);
    return () => clearTimeout(timer);
  }, [scrapePhase, setScrapePhase]);
}

/**
 * Root Rental Radar v3 workbench application.
 */
export const App: React.FC = () => {
  const [activeTab, setActiveTab] = useState<WorkspaceTab>('listings');
  const [listings, setListings] = useState<RentalListing[]>([]);
  const [stats, setStats] = useState<DashboardStats | null>(null);
  const [loading, setLoading] = useState(true);
  const [scrapePhase, setScrapePhase] = useState<ScrapePhase>('idle');
  const [error, setError] = useState<string | null>(null);
  const [scrapeNotice, setScrapeNotice] = useState<string | null>(null);

  const [isIngestModalOpen, setIsIngestModalOpen] = useState(false);
  const [isCommandPaletteOpen, setIsCommandPaletteOpen] = useState(false);
  const [drawerListing, setDrawerListing] = useState<RentalListing | null>(null);
  const [selectedScoreListing, setSelectedScoreListing] = useState<RentalListing | null>(null);

  const [page, setPage] = useState(1);
  const [totalCount, setTotalCount] = useState(0);
  const [totalPages, setTotalPages] = useState(1);
  const [hasMore, setHasMore] = useState(false);

  const [selectedCorridor, setSelectedCorridor] = useState<string>('all');
  const [selectedZone, setSelectedZone] = useState<string>('all');
  const [zeroBrokerageOnly, setZeroBrokerageOnly] = useState<boolean>(false);
  const [bachelorFriendlyOnly, setBachelorFriendlyOnly] = useState<boolean>(false);
  const [search, setSearch] = useState('');
  const [minScore, setMinScore] = useState(40);
  const [maxRent, setMaxRent] = useState(45000);
  const [bhkType, setBhkType] = useState('all');
  const [furnishing, setFurnishing] = useState('all');
  const [userStatus, setUserStatus] = useState('all');
  const [recency, setRecency] = useState('7d');
  const [sortBy, setSortBy] = useState<SortBy>('score_desc');
  const [limit, setLimit] = useState<number>(12);
  const [viewMode, setViewMode] = useState<'grid' | 'table'>('grid');

  const fetchListings = useCallback(
    async (targetPage = 1, append = false, requestedLimit = limit) => {
      setLoading(true);
      setError(null);

      try {
        const querySearch =
          search.trim() || (selectedCorridor !== 'all' ? selectedCorridor : undefined);

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
          ...(selectedZone !== 'all' ? { zone: selectedZone } : {}),
          ...(querySearch ? { search: querySearch } : {}),
        });

        if (result._tag === 'err') {
          setError(result.error.message);
          return;
        }

        const data = result.value;
        setListings((prev) => (append ? [...prev, ...data.listings] : data.listings));
        setPage(data.page || 1);
        setTotalCount(data.totalCount || data.listings.length);
        setTotalPages(data.totalPages || 1);
        setHasMore(Boolean(data.hasMore));
      } finally {
        setLoading(false);
      }
    },
    [
      limit,
      minScore,
      maxRent,
      bhkType,
      furnishing,
      userStatus,
      recency,
      search,
      sortBy,
      selectedCorridor,
      selectedZone,
    ],
  );

  const fetchStats = useCallback(async () => {
    const result = await api.getStats();
    if (result._tag === 'ok') {
      setStats(result.value);
    }
  }, []);

  const refreshAll = useCallback(() => {
    fetchListings(1, false, limit);
    fetchStats();
  }, [fetchListings, fetchStats, limit]);

  useEffect(() => {
    refreshAll();
  }, [refreshAll]);

  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      if ((e.metaKey || e.ctrlKey) && e.key.toLowerCase() === 'k') {
        e.preventDefault();
        setIsCommandPaletteOpen((prev) => !prev);
      }
    };

    window.addEventListener('keydown', handleKeyDown);
    return () => window.removeEventListener('keydown', handleKeyDown);
  }, []);

  useScrapePoller(scrapePhase, setScrapePhase, setScrapeNotice, refreshAll);

  const handleStatusChange = async (id: number, status: UserListingStatus) => {
    setListings((prev) => prev.map((l) => (l.id === id ? { ...l, userStatus: status } : l)));
    toast.success(`Pipeline updated: listing marked as ${status}`);
    const result = await api.updateListingStatus(id, status);
    if (result._tag === 'err') {
      toast.error(`Failed to update listing: ${result.error.message}`);
      fetchListings(page, false, limit);
      return;
    }
    fetchStats();
  };

  const handleTriggerScrape = async () => {
    if (scrapePhase === 'running') return;
    setScrapePhase('running');
    setScrapeNotice('Dispatching live scraper workflow in GitHub Actions...');

    const result = await api.triggerScrape();
    if (result._tag === 'err') {
      setScrapePhase('error');
      setScrapeNotice(`Scrape failed: ${result.error.message}`);
      return;
    }

    setScrapeNotice(
      'GitHub Actions scraper is running... Scanning Facebook groups & syncing listings.',
    );
  };

  const handleIngestSuccess = (newListing: RentalListing) => {
    setListings((prev) => [
      newListing,
      ...prev.filter((l) => l.fbPostId !== newListing.fbPostId && l.id !== newListing.id),
    ]);
    setTotalCount((prev) => prev + 1);
    fetchStats();
  };

  const displayedListings = filterDisplayedListings(
    listings,
    zeroBrokerageOnly,
    bachelorFriendlyOnly,
    selectedCorridor,
    search,
  );

  const handleResetFilters = () => {
    setSelectedCorridor('all');
    setSelectedZone('all');
    setZeroBrokerageOnly(false);
    setBachelorFriendlyOnly(false);
    setSearch('');
    setMinScore(40);
    setMaxRent(45000);
    setBhkType('all');
    setFurnishing('all');
    setUserStatus('all');
    setRecency('7d');
    setSortBy('score_desc');
    setLimit(12);
    toast.info('All filters reset to defaults');
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
    <div className="min-h-screen bg-[#090A0F] text-slate-100 p-4 md:p-8 font-sans selection:bg-emerald-500 selection:text-slate-950">
      <div className="max-w-7xl mx-auto space-y-6">
        <AppHeader
          scrapePhase={scrapePhase}
          onOpenCommandPalette={() => setIsCommandPaletteOpen(true)}
          onOpenIngestModal={() => setIsIngestModalOpen(true)}
          onTriggerScrape={handleTriggerScrape}
        />

        <ScrapeNoticeBanner
          scrapeNotice={scrapeNotice}
          scrapePhase={scrapePhase}
          onDismiss={() => setScrapeNotice(null)}
        />

        <WorkspaceTabsBar
          activeTab={activeTab}
          onSelectTab={setActiveTab}
          totalListingsCount={totalCount || stats?.totalListings || 0}
        />

        {activeTab === 'groups' ? (
          <GroupsDirectoryView />
        ) : activeTab === 'places' ? (
          <PlacesDirectoryView
            onSelectLocality={(localityOrSociety) => {
              setSearch(localityOrSociety);
              setSelectedCorridor('all');
              setSelectedZone('all');
              setPage(1);
              setActiveTab('listings');
              toast.info(`Filtered listings to ${localityOrSociety}`);
            }}
          />
        ) : (
          <>
            {stats && <StatsMetricsGrid stats={stats} totalCount={totalCount} />}

            <PriceCommuteHistogram
              listings={listings}
              maxRent={maxRent}
              onMaxRentChange={(rent) => {
                setMaxRent(rent);
                setPage(1);
              }}
              selectedCorridor={selectedCorridor}
              onSelectCorridor={(id) => {
                setSelectedCorridor(id);
                setPage(1);
              }}
            />

            <CorridorFilter
              selectedCorridor={selectedCorridor}
              onSelectCorridor={(id) => {
                setSelectedCorridor(id);
                setPage(1);
              }}
              selectedZone={selectedZone}
              onSelectZone={(zone) => {
                setSelectedZone(zone);
                setPage(1);
              }}
              zeroBrokerageOnly={zeroBrokerageOnly}
              onToggleZeroBrokerage={() => setZeroBrokerageOnly((prev) => !prev)}
              bachelorFriendlyOnly={bachelorFriendlyOnly}
              onToggleBachelorFriendly={() => setBachelorFriendlyOnly((prev) => !prev)}
            />

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

            <ListingsResultsSection
              error={error}
              loading={loading}
              viewMode={viewMode}
              displayedListings={displayedListings}
              onRetry={() => fetchListings(1, false)}
              onResetFilters={handleResetFilters}
              onStatusChange={handleStatusChange}
              onOpenScoreModal={setSelectedScoreListing}
              onOpenDrawer={setDrawerListing}
            />

            {totalCount > 0 && (
              <PaginationBar
                page={page}
                limit={limit}
                totalCount={totalCount}
                totalPages={totalPages}
                hasMore={hasMore}
                loading={loading}
                onPageChange={handlePageChange}
              />
            )}
          </>
        )}

        <ScoreBreakdownModal
          listing={selectedScoreListing}
          onClose={() => setSelectedScoreListing(null)}
        />

        <QuickIngestModal
          isOpen={isIngestModalOpen}
          onClose={() => setIsIngestModalOpen(false)}
          onIngestSuccess={handleIngestSuccess}
        />

        <CommandPalette
          isOpen={isCommandPaletteOpen}
          onClose={() => setIsCommandPaletteOpen(false)}
          corridors={BANGALORE_CORRIDORS}
          selectedCorridor={selectedCorridor}
          onSelectCorridor={(id) => {
            setSelectedCorridor(id);
            setPage(1);
          }}
          bhkType={bhkType}
          onSelectBhkType={(bhk) => {
            setBhkType(bhk);
            setPage(1);
          }}
          sortBy={sortBy}
          onSelectSortBy={(sort) => {
            setSortBy(sort);
            setPage(1);
          }}
          zeroBrokerageOnly={zeroBrokerageOnly}
          onToggleZeroBrokerage={() => setZeroBrokerageOnly((prev) => !prev)}
          bachelorFriendlyOnly={bachelorFriendlyOnly}
          onToggleBachelorFriendly={() => setBachelorFriendlyOnly((prev) => !prev)}
          listings={listings}
          onSelectListing={setDrawerListing}
        />

        <ListingDrawer
          listing={drawerListing}
          isOpen={Boolean(drawerListing)}
          onClose={() => setDrawerListing(null)}
          onStatusChange={handleStatusChange}
          onOpenScoreModal={setSelectedScoreListing}
        />

        <ToastStack />
      </div>
    </div>
  );
};

export default App;
