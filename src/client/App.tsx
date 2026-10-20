import React, { useState, useEffect, useCallback, useMemo } from 'react';
import type {
  RentalListing,
  UserListingStatus,
  SortBy,
} from '../domain/types';
import { HeaderStats } from './components/HeaderStats';
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
import { api, type DashboardStatsWithLogs, type ScrapeLogEntry } from './services/api';
import {
  Sparkles,
  Clock,
  Layers,
  ChevronLeft,
  ChevronRight,
  CheckCircle2,
  Loader2,
  Users,
  MapPin,
  Activity,
  Calendar,
} from 'lucide-react';

export type WorkspaceTab = 'listings' | 'groups' | 'places';
type ScrapePhase = 'idle' | 'running' | 'completed' | 'error';

const IST_DATE_BUCKET_FORMATTER = new Intl.DateTimeFormat('en-GB', {
  day: '2-digit',
  month: 'short',
  year: 'numeric',
  timeZone: 'Asia/Kolkata',
});

const IST_EXACT_TIME_FORMATTER = new Intl.DateTimeFormat('en-IN', {
  day: '2-digit',
  month: 'short',
  hour: '2-digit',
  minute: '2-digit',
  hour12: true,
  timeZone: 'Asia/Kolkata',
});

/**
 * Parses a listing's `createdAt` timestamp into IST day-bucket and exact time labels.
 */
function formatListingDayBucket(
  createdAt: string,
  postedTime: string,
): {
  readonly bucketLabel: string;
  readonly exactTimeIST: string;
  readonly relativeLabel: string;
} {
  const normalized = createdAt.includes('T')
    ? createdAt
    : `${createdAt.replace(' ', 'T')}Z`;
  const parsed = new Date(normalized);

  if (Number.isNaN(parsed.getTime())) {
    return {
      bucketLabel: 'Recent Posts',
      exactTimeIST: createdAt,
      relativeLabel: postedTime,
    };
  }

  const dateStr = IST_DATE_BUCKET_FORMATTER.format(parsed);
  const now = new Date();
  const todayStr = IST_DATE_BUCKET_FORMATTER.format(now);
  const yesterdayStr = IST_DATE_BUCKET_FORMATTER.format(
    new Date(now.getTime() - 86_400_000),
  );

  let bucketLabel = dateStr;
  if (dateStr === todayStr) {
    bucketLabel = `Today — ${dateStr}`;
  } else if (dateStr === yesterdayStr) {
    bucketLabel = `Yesterday — ${dateStr}`;
  }

  return {
    bucketLabel,
    exactTimeIST: `${IST_EXACT_TIME_FORMATTER.format(parsed)} IST`,
    relativeLabel: postedTime,
  };
}

const ScrapeNoticeBanner: React.FC<{
  readonly scrapeNotice: string | null;
  readonly scrapePhase: ScrapePhase;
  readonly onDismiss: () => void;
}> = ({ scrapeNotice, scrapePhase, onDismiss }) => {
  if (!scrapeNotice) return null;

  return (
    <div
      className={`bg-[#111114] px-3.5 py-2.5 rounded-xl text-xs flex items-center justify-between border ${
        scrapePhase === 'error'
          ? 'border-rose-500/40 bg-rose-950/30 text-rose-300'
          : scrapePhase === 'running'
            ? 'border-amber-500/40 bg-amber-950/30 text-amber-300'
            : 'border-emerald-500/40 bg-emerald-950/30 text-emerald-300'
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
        className="text-zinc-400 hover:text-zinc-100 font-semibold ml-4"
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
  readonly sortBy: SortBy;
  readonly onSortByChange: (sort: SortBy) => void;
  readonly minScore: number;
  readonly onMinScoreChange: (score: number) => void;
  readonly zeroBrokerageOnly: boolean;
  readonly onToggleZeroBrokerage: () => void;
  readonly bhkType: string;
  readonly onBhkTypeChange: (bhk: string) => void;
}

const WorkspaceTabsBar: React.FC<WorkspaceTabsBarProps> = ({
  activeTab,
  onSelectTab,
  totalListingsCount,
  sortBy,
  onSortByChange,
  minScore,
  onMinScoreChange,
  zeroBrokerageOnly,
  onToggleZeroBrokerage,
  bhkType,
  onBhkTypeChange,
}) => {
  const tabs: readonly {
    readonly id: WorkspaceTab;
    readonly label: string;
    readonly icon: React.ReactNode;
    readonly badge?: string | undefined;
  }[] = [
    {
      id: 'listings',
      label: 'Feed & History',
      icon: <Layers className="w-3.5 h-3.5" />,
      badge: totalListingsCount > 0 ? String(totalListingsCount) : undefined,
    },
    {
      id: 'groups',
      label: '34 FB Groups',
      icon: <Users className="w-3.5 h-3.5" />,
    },
    {
      id: 'places',
      label: 'Bangalore Places',
      icon: <MapPin className="w-3.5 h-3.5" />,
    },
  ];

  return (
    <div className="flex flex-col lg:flex-row lg:items-center justify-between gap-2.5 bg-[#111114] p-2 rounded-xl border border-white/[0.07]">
      <nav
        aria-label="Rental Radar Workspace Tabs"
        className="flex items-center gap-1 overflow-x-auto no-scrollbar"
      >
        {tabs.map((tab) => {
          const isActive = activeTab === tab.id;
          return (
            <button
              key={tab.id}
              type="button"
              onClick={() => onSelectTab(tab.id)}
              className={`flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-xs font-medium transition-[background-color,color,transform] duration-140 ease-[var(--ease-out)] active:scale-[0.97] shrink-0 ${
                isActive
                  ? 'bg-zinc-100 text-zinc-950 font-semibold'
                  : 'text-zinc-400 hover:text-zinc-100 hover:bg-white/[0.04]'
              }`}
            >
              {tab.icon}
              <span>{tab.label}</span>
              {tab.badge && (
                <span
                  className={`px-1.5 py-0.2 rounded text-[10px] font-mono tabular-nums ${
                    isActive
                      ? 'bg-zinc-950/15 text-zinc-950 font-bold'
                      : 'bg-[#09090B] text-zinc-300 border border-white/[0.07]'
                  }`}
                >
                  {tab.badge}
                </span>
              )}
            </button>
          );
        })}
      </nav>

      {activeTab === 'listings' && (
        <div className="flex items-center gap-1.5 overflow-x-auto no-scrollbar text-[11px]">
          <button
            type="button"
            onClick={() => onSortByChange(sortBy === 'newest' ? 'score_desc' : 'newest')}
            className={`shrink-0 inline-flex items-center gap-1 px-2.5 py-1 rounded-lg border font-medium transition-[background-color,border-color,color,transform] duration-140 ease-[var(--ease-out)] active:scale-[0.97] ${
              sortBy === 'newest'
                ? 'bg-emerald-950/40 text-emerald-300 border-emerald-500/35'
                : 'bg-[#09090B] text-zinc-300 border-white/[0.07]'
            }`}
          >
            <Clock className="w-3 h-3 text-emerald-400" />
            <span>{sortBy === 'newest' ? 'Latest Posts First' : 'Sorted by Score'}</span>
          </button>

          <button
            type="button"
            onClick={() => onMinScoreChange(0)}
            className={`shrink-0 px-2.5 py-1 rounded-lg border font-medium transition-[background-color,border-color,color,transform] duration-140 ease-[var(--ease-out)] active:scale-[0.97] ${
              minScore === 0
                ? 'bg-zinc-100 text-zinc-950 border-zinc-200 font-semibold'
                : 'bg-[#09090B] text-zinc-400 border-white/[0.07] hover:text-zinc-200'
            }`}
          >
            All Posts
          </button>

          <button
            type="button"
            onClick={() => onMinScoreChange(minScore === 70 ? 0 : 70)}
            className={`shrink-0 px-2.5 py-1 rounded-lg border font-medium transition-[background-color,border-color,color,transform] duration-140 ease-[var(--ease-out)] active:scale-[0.97] ${
              minScore === 70
                ? 'bg-zinc-100 text-zinc-950 border-zinc-200 font-semibold'
                : 'bg-[#09090B] text-zinc-400 border-white/[0.07] hover:text-zinc-200'
            }`}
          >
            High Match ≥70
          </button>

          <button
            type="button"
            onClick={() => onMinScoreChange(minScore === 90 ? 0 : 90)}
            className={`shrink-0 px-2.5 py-1 rounded-lg border font-medium transition-[background-color,border-color,color,transform] duration-140 ease-[var(--ease-out)] active:scale-[0.97] ${
              minScore === 90
                ? 'bg-emerald-400 text-zinc-950 border-emerald-300 font-semibold'
                : 'bg-[#09090B] text-zinc-400 border-white/[0.07] hover:text-zinc-200'
            }`}
          >
            Unicorns ≥90
          </button>

          <button
            type="button"
            onClick={onToggleZeroBrokerage}
            className={`shrink-0 px-2.5 py-1 rounded-lg border font-medium transition-[background-color,border-color,color,transform] duration-140 ease-[var(--ease-out)] active:scale-[0.97] ${
              zeroBrokerageOnly
                ? 'bg-zinc-100 text-zinc-950 border-zinc-200 font-semibold'
                : 'bg-[#09090B] text-zinc-400 border-white/[0.07] hover:text-zinc-200'
            }`}
          >
            Direct Owner
          </button>

          {(['1 BHK', '2 BHK', '3 BHK'] as const).map((bhk) => (
            <button
              key={bhk}
              type="button"
              onClick={() => onBhkTypeChange(bhkType === bhk ? 'all' : bhk)}
              className={`shrink-0 px-2.5 py-1 rounded-lg border font-medium transition-[background-color,border-color,color,transform] duration-140 ease-[var(--ease-out)] active:scale-[0.97] ${
                bhkType === bhk
                  ? 'bg-zinc-100 text-zinc-950 border-zinc-200 font-semibold'
                  : 'bg-[#09090B] text-zinc-400 border-white/[0.07] hover:text-zinc-200'
              }`}
            >
              {bhk}
            </button>
          ))}
        </div>
      )}
    </div>
  );
};

const ScrapeRunHistoryLogTable: React.FC<{
  readonly logs: readonly ScrapeLogEntry[];
}> = ({ logs }) => {
  if (logs.length === 0) return null;

  return (
    <div className="bg-[#111114] border border-white/[0.07] rounded-xl p-4 space-y-2.5">
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-2 text-xs font-semibold text-zinc-200">
          <Activity className="w-3.5 h-3.5 text-emerald-400" />
          <span>Recent Scrape Run History</span>
        </div>
        <span className="text-[11px] font-mono tabular-nums text-zinc-400">
          Last {logs.length} runs
        </span>
      </div>

      <div className="overflow-x-auto">
        <table className="w-full text-left text-xs font-mono tabular-nums">
          <thead className="text-[11px] text-zinc-400 border-b border-white/[0.07]">
            <tr>
              <th className="py-1.5 px-2">Run Timestamp (IST)</th>
              <th className="py-1.5 px-2">Status</th>
              <th className="py-1.5 px-2">Groups</th>
              <th className="py-1.5 px-2">Scanned</th>
              <th className="py-1.5 px-2">Matched</th>
              <th className="py-1.5 px-2 text-right">Duration</th>
            </tr>
          </thead>
          <tbody className="divide-y divide-white/[0.05] text-zinc-300">
            {logs.map((entry) => {
              const bucketInfo = formatListingDayBucket(entry.runAt, '');
              return (
                <tr key={entry.id} className="hover:bg-[#141418]">
                  <td className="py-1.5 px-2 text-zinc-200">{bucketInfo.exactTimeIST}</td>
                  <td className="py-1.5 px-2">
                    <span
                      className={`px-1.5 py-0.5 rounded text-[10px] font-sans font-medium ${
                        entry.status === 'success'
                          ? 'bg-emerald-950/50 text-emerald-300 border border-emerald-500/30'
                          : 'bg-amber-950/50 text-amber-300 border border-amber-500/30'
                      }`}
                    >
                      {entry.status}
                    </span>
                  </td>
                  <td className="py-1.5 px-2">{entry.groupsScanned}</td>
                  <td className="py-1.5 px-2">{entry.itemsScanned}</td>
                  <td className="py-1.5 px-2 text-emerald-400 font-semibold">
                    +{entry.itemsMatched}
                  </td>
                  <td className="py-1.5 px-2 text-right text-zinc-400">
                    {(entry.durationMs / 1000).toFixed(1)}s
                  </td>
                </tr>
              );
            })}
          </tbody>
        </table>
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
    <div className="bg-[#111114] p-3.5 rounded-xl border border-white/[0.07] flex flex-col sm:flex-row items-center justify-between gap-3 text-xs">
      <div className="text-zinc-400 font-medium text-center sm:text-left">
        Showing{' '}
        <span className="text-zinc-100 font-semibold font-mono tabular-nums">
          {totalCount === 0 ? 0 : (page - 1) * limit + 1}–{Math.min(page * limit, totalCount)}
        </span>{' '}
        of <span className="text-zinc-100 font-semibold font-mono tabular-nums">{totalCount}</span>{' '}
        listings
        <span className="mx-2 text-zinc-600">•</span>
        Page <span className="text-emerald-400 font-semibold font-mono tabular-nums">{page}</span> of{' '}
        <span className="text-zinc-200 font-semibold font-mono tabular-nums">{totalPages}</span>
      </div>

      <div className="flex items-center gap-1.5 flex-wrap justify-center">
        <button
          type="button"
          onClick={() => onPageChange(page - 1)}
          disabled={page <= 1 || loading}
          className="flex items-center gap-1 px-2.5 py-1.5 rounded-lg bg-[#09090B] hover:bg-white/[0.06] border border-white/[0.07] text-zinc-300 disabled:opacity-40 disabled:cursor-not-allowed transition-[background-color,border-color,color,transform] duration-140 ease-[var(--ease-out)] active:scale-[0.97] font-medium"
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
                className="px-1.5 py-1 text-zinc-500 font-mono"
              >
                …
              </span>
            ) : (
              <button
                key={item}
                type="button"
                onClick={() => onPageChange(item)}
                disabled={loading}
                className={`w-7 h-7 rounded-lg text-xs font-semibold font-mono tabular-nums transition-[background-color,color,transform] duration-140 ease-[var(--ease-out)] active:scale-[0.97] ${
                  page === item
                    ? 'bg-zinc-100 text-zinc-950'
                    : 'bg-[#09090B] hover:bg-white/[0.06] text-zinc-300 border border-white/[0.07]'
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
          className="flex items-center gap-1 px-2.5 py-1.5 rounded-lg bg-[#09090B] hover:bg-white/[0.06] border border-white/[0.07] text-zinc-300 disabled:opacity-40 disabled:cursor-not-allowed transition-[background-color,border-color,color,transform] duration-140 ease-[var(--ease-out)] active:scale-[0.97] font-medium"
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
  readonly sortBy: SortBy;
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
  sortBy,
  displayedListings,
  onRetry,
  onResetFilters,
  onStatusChange,
  onOpenScoreModal,
  onOpenDrawer,
}) => {
  const dayBucketCounts = useMemo(() => {
    const counts = new Map<string, number>();
    for (const item of displayedListings) {
      const { bucketLabel } = formatListingDayBucket(item.createdAt, item.postedTime);
      counts.set(bucketLabel, (counts.get(bucketLabel) ?? 0) + 1);
    }
    return Array.from(counts.entries());
  }, [displayedListings]);

  if (error) {
    return (
      <div className="bg-rose-950/30 border border-rose-500/40 p-4 rounded-xl text-rose-300 flex items-center justify-between text-xs">
        <span>{error}</span>
        <button
          type="button"
          onClick={onRetry}
          className="px-3 py-1.5 rounded-lg bg-rose-600 hover:bg-rose-500 text-white font-semibold"
        >
          Retry
        </button>
      </div>
    );
  }

  if (displayedListings.length === 0 && !loading && viewMode !== 'table') {
    return (
      <div className="bg-[#111114] p-10 rounded-xl text-center space-y-3 border border-white/[0.07]">
        <div className="w-10 h-10 mx-auto rounded-xl bg-[#09090B] border border-white/[0.07] flex items-center justify-center text-zinc-400">
          <Sparkles className="w-5 h-5" />
        </div>
        <h3 className="text-sm font-semibold text-zinc-100">No Matching Listings Found</h3>
        <p className="text-xs text-zinc-400 max-w-sm mx-auto">
          Try lowering the minimum score threshold, widening the rent ceiling, or resetting filters.
        </p>
        <button
          type="button"
          onClick={onResetFilters}
          className="px-3.5 py-1.5 rounded-lg bg-zinc-100 hover:bg-white text-zinc-950 font-semibold text-xs"
        >
          Reset All Filters
        </button>
      </div>
    );
  }

  return (
    <div className="space-y-3">
      {dayBucketCounts.length > 0 && (
        <div className="flex items-center justify-between gap-2 flex-wrap px-1 text-[11px] text-zinc-400">
          <div className="flex items-center gap-1.5 flex-wrap">
            <Calendar className="w-3.5 h-3.5 text-emerald-400" />
            <span className="font-medium text-zinc-300">Post History on Page:</span>
            {dayBucketCounts.map(([bucket, count]) => (
              <span
                key={bucket}
                className="inline-flex items-center gap-1 px-2 py-0.5 rounded bg-[#111114] border border-white/[0.07] text-zinc-300 font-mono tabular-nums"
              >
                <span>{bucket}</span>
                <span className="text-emerald-400 font-semibold">({count})</span>
              </span>
            ))}
          </div>
          <span className="font-mono tabular-nums text-zinc-500">
            Showing {displayedListings.length} posts in current view
          </span>
        </div>
      )}

      {viewMode === 'table' ? (
        <ListingTable
          listings={displayedListings}
          onStatusChange={onStatusChange}
          onOpenScoreModal={onOpenScoreModal}
          onOpenDrawer={onOpenDrawer}
        />
      ) : (
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-5">
          {displayedListings.map((listing, idx) => {
            const currentBucket = formatListingDayBucket(
              listing.createdAt,
              listing.postedTime,
            ).bucketLabel;
            const prevListing = idx > 0 ? displayedListings[idx - 1] : undefined;
            const prevBucket = prevListing
              ? formatListingDayBucket(prevListing.createdAt, prevListing.postedTime).bucketLabel
              : null;
            const showDayDivider = sortBy === 'newest' && currentBucket !== prevBucket;

            return (
              <React.Fragment key={listing.id}>
                {showDayDivider && (
                  <div className="col-span-full flex items-center gap-3 pt-2 pb-0.5">
                    <span className="inline-flex items-center gap-1.5 px-2.5 py-1 rounded-md bg-[#111114] border border-white/[0.08] text-xs font-semibold text-zinc-200 font-mono tabular-nums">
                      <Calendar className="w-3 h-3 text-emerald-400" />
                      {currentBucket}
                    </span>
                    <div className="flex-1 h-px bg-white/[0.06]" />
                  </div>
                )}
                <ListingCard
                  listing={listing}
                  onStatusChange={onStatusChange}
                  onOpenScoreModal={onOpenScoreModal}
                  onOpenDrawer={onOpenDrawer}
                />
              </React.Fragment>
            );
          })}
        </div>
      )}
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

const MarketPulseExpandablePanel: React.FC<{
  readonly showMarketPulse: boolean;
  readonly stats: DashboardStatsWithLogs | null;
  readonly listings: RentalListing[];
  readonly maxRent: number;
  readonly onMaxRentChange: (rent: number) => void;
  readonly selectedCorridor: string;
  readonly onSelectCorridor: (id: string) => void;
  readonly selectedZone: string;
  readonly onSelectZone: (zone: string) => void;
  readonly zeroBrokerageOnly: boolean;
  readonly onToggleZeroBrokerage: () => void;
  readonly bachelorFriendlyOnly: boolean;
  readonly onToggleBachelorFriendly: () => void;
}> = ({
  showMarketPulse,
  stats,
  listings,
  maxRent,
  onMaxRentChange,
  selectedCorridor,
  onSelectCorridor,
  selectedZone,
  onSelectZone,
  zeroBrokerageOnly,
  onToggleZeroBrokerage,
  bachelorFriendlyOnly,
  onToggleBachelorFriendly,
}) => {
  if (!showMarketPulse) return null;

  return (
    <div className="space-y-3.5">
      {stats?.scrapeLogs && stats.scrapeLogs.length > 0 && (
        <ScrapeRunHistoryLogTable logs={stats.scrapeLogs} />
      )}

      <PriceCommuteHistogram
        listings={listings}
        maxRent={maxRent}
        onMaxRentChange={onMaxRentChange}
        selectedCorridor={selectedCorridor}
        onSelectCorridor={onSelectCorridor}
      />

      <CorridorFilter
        selectedCorridor={selectedCorridor}
        onSelectCorridor={onSelectCorridor}
        selectedZone={selectedZone}
        onSelectZone={onSelectZone}
        zeroBrokerageOnly={zeroBrokerageOnly}
        onToggleZeroBrokerage={onToggleZeroBrokerage}
        bachelorFriendlyOnly={bachelorFriendlyOnly}
        onToggleBachelorFriendly={onToggleBachelorFriendly}
      />
    </div>
  );
};

const AppOverlays: React.FC<{
  readonly selectedScoreListing: RentalListing | null;
  readonly onCloseScoreModal: () => void;
  readonly isIngestModalOpen: boolean;
  readonly onCloseIngestModal: () => void;
  readonly onIngestSuccess: (newListing: RentalListing) => void;
  readonly isCommandPaletteOpen: boolean;
  readonly onCloseCommandPalette: () => void;
  readonly selectedCorridor: string;
  readonly onSelectCorridor: (id: string) => void;
  readonly bhkType: string;
  readonly onSelectBhkType: (bhk: string) => void;
  readonly sortBy: SortBy;
  readonly onSelectSortBy: (sort: SortBy) => void;
  readonly zeroBrokerageOnly: boolean;
  readonly onToggleZeroBrokerage: () => void;
  readonly bachelorFriendlyOnly: boolean;
  readonly onToggleBachelorFriendly: () => void;
  readonly listings: RentalListing[];
  readonly drawerListing: RentalListing | null;
  readonly onSelectListing: (listing: RentalListing | null) => void;
  readonly onStatusChange: (id: number, status: UserListingStatus) => void;
  readonly onOpenScoreModal: (listing: RentalListing) => void;
}> = ({
  selectedScoreListing,
  onCloseScoreModal,
  isIngestModalOpen,
  onCloseIngestModal,
  onIngestSuccess,
  isCommandPaletteOpen,
  onCloseCommandPalette,
  selectedCorridor,
  onSelectCorridor,
  bhkType,
  onSelectBhkType,
  sortBy,
  onSelectSortBy,
  zeroBrokerageOnly,
  onToggleZeroBrokerage,
  bachelorFriendlyOnly,
  onToggleBachelorFriendly,
  listings,
  drawerListing,
  onSelectListing,
  onStatusChange,
  onOpenScoreModal,
}) => {
  return (
    <>
      <ScoreBreakdownModal
        listing={selectedScoreListing}
        onClose={onCloseScoreModal}
      />

      <QuickIngestModal
        isOpen={isIngestModalOpen}
        onClose={onCloseIngestModal}
        onIngestSuccess={onIngestSuccess}
      />

      <CommandPalette
        isOpen={isCommandPaletteOpen}
        onClose={onCloseCommandPalette}
        corridors={BANGALORE_CORRIDORS}
        selectedCorridor={selectedCorridor}
        onSelectCorridor={onSelectCorridor}
        bhkType={bhkType}
        onSelectBhkType={onSelectBhkType}
        sortBy={sortBy}
        onSelectSortBy={onSelectSortBy}
        zeroBrokerageOnly={zeroBrokerageOnly}
        onToggleZeroBrokerage={onToggleZeroBrokerage}
        bachelorFriendlyOnly={bachelorFriendlyOnly}
        onToggleBachelorFriendly={onToggleBachelorFriendly}
        listings={listings}
        onSelectListing={onSelectListing}
      />

      <ListingDrawer
        listing={drawerListing}
        isOpen={Boolean(drawerListing)}
        onClose={() => onSelectListing(null)}
        onStatusChange={onStatusChange}
        onOpenScoreModal={onOpenScoreModal}
      />

      <ToastStack />
    </>
  );
};

function useFilterControls() {
  const [selectedCorridor, setSelectedCorridor] = useState<string>('all');
  const [selectedZone, setSelectedZone] = useState<string>('all');
  const [zeroBrokerageOnly, setZeroBrokerageOnly] = useState<boolean>(false);
  const [bachelorFriendlyOnly, setBachelorFriendlyOnly] = useState<boolean>(false);
  const [search, setSearch] = useState('');
  const [minScore, setMinScore] = useState<number>(0);
  const [maxRent, setMaxRent] = useState<number>(45000);
  const [bhkType, setBhkType] = useState('all');
  const [furnishing, setFurnishing] = useState('all');
  const [userStatus, setUserStatus] = useState('all');
  const [recency, setRecency] = useState<string>('all');
  const [sortBy, setSortBy] = useState<SortBy>('newest');
  const [limit, setLimit] = useState<number>(24);
  const [viewMode, setViewMode] = useState<'grid' | 'table'>('grid');

  const resetAllFilters = useCallback(() => {
    setSelectedCorridor('all');
    setSelectedZone('all');
    setZeroBrokerageOnly(false);
    setBachelorFriendlyOnly(false);
    setSearch('');
    setMinScore(0);
    setMaxRent(45000);
    setBhkType('all');
    setFurnishing('all');
    setUserStatus('all');
    setRecency('all');
    setSortBy('newest');
    setLimit(24);
    toast.info('All filters reset to chronological feed defaults');
  }, []);

  return {
    selectedCorridor,
    setSelectedCorridor,
    selectedZone,
    setSelectedZone,
    zeroBrokerageOnly,
    setZeroBrokerageOnly,
    bachelorFriendlyOnly,
    setBachelorFriendlyOnly,
    search,
    setSearch,
    minScore,
    setMinScore,
    maxRent,
    setMaxRent,
    bhkType,
    setBhkType,
    furnishing,
    setFurnishing,
    userStatus,
    setUserStatus,
    recency,
    setRecency,
    sortBy,
    setSortBy,
    limit,
    setLimit,
    viewMode,
    setViewMode,
    resetAllFilters,
  };
}

function useCommandPaletteShortcut(onToggle: () => void) {
  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      if ((e.metaKey || e.ctrlKey) && e.key.toLowerCase() === 'k') {
        e.preventDefault();
        onToggle();
      }
    };
    window.addEventListener('keydown', handleKeyDown);
    return () => window.removeEventListener('keydown', handleKeyDown);
  }, [onToggle]);
}

function useListingsData(filters: ReturnType<typeof useFilterControls>) {
  const [listings, setListings] = useState<RentalListing[]>([]);
  const [stats, setStats] = useState<DashboardStatsWithLogs | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [page, setPage] = useState(1);
  const [totalCount, setTotalCount] = useState(0);
  const [totalPages, setTotalPages] = useState(1);
  const [hasMore, setHasMore] = useState(false);

  const {
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
  } = filters;

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
    if (result._tag === 'ok') setStats(result.value);
  }, []);

  const refreshAll = useCallback(() => {
    fetchListings(1, false, limit);
    fetchStats();
  }, [fetchListings, fetchStats, limit]);

  useEffect(() => {
    refreshAll();
  }, [refreshAll]);

  return {
    listings,
    setListings,
    stats,
    loading,
    error,
    page,
    setPage,
    totalCount,
    setTotalCount,
    totalPages,
    hasMore,
    fetchListings,
    fetchStats,
    refreshAll,
  };
}

/**
 * Root Rental Radar v3 workbench application.
 */
export const App: React.FC = () => {
  const [activeTab, setActiveTab] = useState<WorkspaceTab>('listings');
  const [scrapePhase, setScrapePhase] = useState<ScrapePhase>('idle');
  const [scrapeNotice, setScrapeNotice] = useState<string | null>(null);
  const [showMarketPulse, setShowMarketPulse] = useState(false);
  const [isIngestModalOpen, setIsIngestModalOpen] = useState(false);
  const [isCommandPaletteOpen, setIsCommandPaletteOpen] = useState(false);
  const [drawerListing, setDrawerListing] = useState<RentalListing | null>(null);
  const [selectedScoreListing, setSelectedScoreListing] = useState<RentalListing | null>(null);

  const filters = useFilterControls();
  const data = useListingsData(filters);
  const {
    listings,
    setListings,
    stats,
    loading,
    error,
    page,
    setPage,
    totalCount,
    setTotalCount,
    totalPages,
    hasMore,
    fetchListings,
    fetchStats,
    refreshAll,
  } = data;

  useCommandPaletteShortcut(useCallback(() => setIsCommandPaletteOpen((p) => !p), []));
  useScrapePoller(scrapePhase, setScrapePhase, setScrapeNotice, refreshAll);

  const handleStatusChange = async (id: number, status: UserListingStatus) => {
    setListings((prev) => prev.map((l) => (l.id === id ? { ...l, userStatus: status } : l)));
    toast.success(`Pipeline updated: listing marked as ${status}`);
    const result = await api.updateListingStatus(id, status);
    if (result._tag === 'err') {
      toast.error(`Failed to update listing: ${result.error.message}`);
      fetchListings(page, false, filters.limit);
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
    filters.zeroBrokerageOnly,
    filters.bachelorFriendlyOnly,
    filters.selectedCorridor,
    filters.search,
  );

  const handleLimitChange = (newLimit: number) => {
    filters.setLimit(newLimit);
    setPage(1);
    fetchListings(1, false, newLimit);
  };

  const handlePageChange = (newPage: number) => {
    if (newPage >= 1 && newPage <= totalPages && newPage !== page && !loading) {
      fetchListings(newPage, false, filters.limit);
      window.scrollTo({ top: 0, behavior: 'smooth' });
    }
  };

  return (
    <div className="min-h-screen bg-[#09090B] text-zinc-100 p-3 md:p-6 font-sans selection:bg-emerald-500 selection:text-zinc-950">
      <div className="max-w-7xl mx-auto space-y-3.5">
        <HeaderStats
          stats={stats}
          onTriggerScrape={handleTriggerScrape}
          isScraping={scrapePhase === 'running'}
          scrapePhase={scrapePhase}
          onOpenCommandPalette={() => setIsCommandPaletteOpen(true)}
          onOpenIngestModal={() => setIsIngestModalOpen(true)}
          showMarketPulse={showMarketPulse}
          onToggleMarketPulse={() => setShowMarketPulse((prev) => !prev)}
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
          sortBy={filters.sortBy}
          onSortByChange={(nextSort) => {
            filters.setSortBy(nextSort);
            setPage(1);
          }}
          minScore={filters.minScore}
          onMinScoreChange={(nextScore) => {
            filters.setMinScore(nextScore);
            setPage(1);
          }}
          zeroBrokerageOnly={filters.zeroBrokerageOnly}
          onToggleZeroBrokerage={() => filters.setZeroBrokerageOnly((prev) => !prev)}
          bhkType={filters.bhkType}
          onBhkTypeChange={(nextBhk) => {
            filters.setBhkType(nextBhk);
            setPage(1);
          }}
        />

        {activeTab === 'groups' ? (
          <GroupsDirectoryView />
        ) : activeTab === 'places' ? (
          <PlacesDirectoryView
            onSelectLocality={(localityOrSociety) => {
              filters.setSearch(localityOrSociety);
              filters.setSelectedCorridor('all');
              filters.setSelectedZone('all');
              setPage(1);
              setActiveTab('listings');
              toast.info(`Filtered listings to ${localityOrSociety}`);
            }}
          />
        ) : (
          <>
            <MarketPulseExpandablePanel
              showMarketPulse={showMarketPulse}
              stats={stats}
              listings={listings}
              maxRent={filters.maxRent}
              onMaxRentChange={(rent) => {
                filters.setMaxRent(rent);
                setPage(1);
              }}
              selectedCorridor={filters.selectedCorridor}
              onSelectCorridor={(id) => {
                filters.setSelectedCorridor(id);
                setPage(1);
              }}
              selectedZone={filters.selectedZone}
              onSelectZone={(zone) => {
                filters.setSelectedZone(zone);
                setPage(1);
              }}
              zeroBrokerageOnly={filters.zeroBrokerageOnly}
              onToggleZeroBrokerage={() => filters.setZeroBrokerageOnly((prev) => !prev)}
              bachelorFriendlyOnly={filters.bachelorFriendlyOnly}
              onToggleBachelorFriendly={() => filters.setBachelorFriendlyOnly((prev) => !prev)}
            />

            <FilterBar
              search={filters.search}
              onSearchChange={filters.setSearch}
              minScore={filters.minScore}
              onMinScoreChange={filters.setMinScore}
              maxRent={filters.maxRent}
              onMaxRentChange={filters.setMaxRent}
              bhkType={filters.bhkType}
              onBhkTypeChange={filters.setBhkType}
              furnishing={filters.furnishing}
              onFurnishingChange={filters.setFurnishing}
              userStatus={filters.userStatus}
              onUserStatusChange={filters.setUserStatus}
              recency={filters.recency}
              onRecencyChange={filters.setRecency}
              sortBy={filters.sortBy}
              onSortByChange={filters.setSortBy}
              limit={filters.limit}
              onLimitChange={handleLimitChange}
              viewMode={filters.viewMode}
              onViewModeChange={filters.setViewMode}
              onResetFilters={filters.resetAllFilters}
            />

            <ListingsResultsSection
              error={error}
              loading={loading}
              viewMode={filters.viewMode}
              sortBy={filters.sortBy}
              displayedListings={displayedListings}
              onRetry={() => fetchListings(1, false)}
              onResetFilters={filters.resetAllFilters}
              onStatusChange={handleStatusChange}
              onOpenScoreModal={setSelectedScoreListing}
              onOpenDrawer={setDrawerListing}
            />

            {totalCount > 0 && (
              <PaginationBar
                page={page}
                limit={filters.limit}
                totalCount={totalCount}
                totalPages={totalPages}
                hasMore={hasMore}
                loading={loading}
                onPageChange={handlePageChange}
              />
            )}
          </>
        )}

        <AppOverlays
          selectedScoreListing={selectedScoreListing}
          onCloseScoreModal={() => setSelectedScoreListing(null)}
          isIngestModalOpen={isIngestModalOpen}
          onCloseIngestModal={() => setIsIngestModalOpen(false)}
          onIngestSuccess={handleIngestSuccess}
          isCommandPaletteOpen={isCommandPaletteOpen}
          onCloseCommandPalette={() => setIsCommandPaletteOpen(false)}
          selectedCorridor={filters.selectedCorridor}
          onSelectCorridor={(id) => {
            filters.setSelectedCorridor(id);
            setPage(1);
          }}
          bhkType={filters.bhkType}
          onSelectBhkType={(bhk) => {
            filters.setBhkType(bhk);
            setPage(1);
          }}
          sortBy={filters.sortBy}
          onSelectSortBy={(sort) => {
            filters.setSortBy(sort);
            setPage(1);
          }}
          zeroBrokerageOnly={filters.zeroBrokerageOnly}
          onToggleZeroBrokerage={() => filters.setZeroBrokerageOnly((prev) => !prev)}
          bachelorFriendlyOnly={filters.bachelorFriendlyOnly}
          onToggleBachelorFriendly={() => filters.setBachelorFriendlyOnly((prev) => !prev)}
          listings={listings}
          drawerListing={drawerListing}
          onSelectListing={setDrawerListing}
          onStatusChange={handleStatusChange}
          onOpenScoreModal={setSelectedScoreListing}
        />
      </div>
    </div>
  );
};

export default App;
