import React from 'react';
import type { DashboardStats } from '../../domain/types';
import {
  RefreshCw,
  Search,
  PlusCircle,
  Activity,
  CheckCircle2,
  Loader2,
} from 'lucide-react';

const IST_SHORT_FORMATTER = new Intl.DateTimeFormat('en-IN', {
  day: '2-digit',
  month: 'short',
  hour: '2-digit',
  minute: '2-digit',
  hour12: true,
  timeZone: 'Asia/Kolkata',
});

function formatScrapeTimeIST(rawTimestamp: string | null | undefined): string {
  if (!rawTimestamp) return 'Synced';
  const normalized = rawTimestamp.includes('T')
    ? rawTimestamp
    : `${rawTimestamp.replace(' ', 'T')}Z`;
  const parsed = new Date(normalized);
  if (Number.isNaN(parsed.getTime())) return rawTimestamp;
  return `${IST_SHORT_FORMATTER.format(parsed)} IST`;
}

export interface HeaderStatsProps {
  readonly stats: DashboardStats | null;
  readonly onTriggerScrape: () => void;
  readonly isScraping: boolean;
  readonly scrapePhase?: 'idle' | 'running' | 'completed' | 'error' | undefined;
  readonly onOpenCommandPalette?: (() => void) | undefined;
  readonly onOpenIngestModal?: (() => void) | undefined;
  readonly showMarketPulse?: boolean | undefined;
  readonly onToggleMarketPulse?: (() => void) | undefined;
}

const CompactMetricBar: React.FC<{ readonly stats: DashboardStats }> = ({ stats }) => {
  const items: readonly {
    readonly label: string;
    readonly value: string;
    readonly accent?: boolean | undefined;
  }[] = [
    {
      label: 'Total Posts',
      value: String(stats.totalListings),
    },
    {
      label: 'Unicorn Deals ≥90',
      value: String(stats.unicornMatches),
      accent: true,
    },
    {
      label: 'Avg Rent',
      value: stats.avgRent > 0 ? `₹${stats.avgRent.toLocaleString('en-IN')}` : '—',
    },
    {
      label: 'Avg Commute',
      value: stats.avgPeakCommuteMins > 0 ? `${stats.avgPeakCommuteMins}m` : '—',
    },
    {
      label: 'Gated Societies',
      value: String(stats.gatedCount),
    },
    {
      label: 'Direct Owner',
      value: String(stats.directOwnerCount),
    },
  ];

  return (
    <div className="mt-2.5 pt-2.5 border-t border-white/[0.06] grid grid-cols-3 sm:grid-cols-6 gap-2">
      {items.map((item) => (
        <div
          key={item.label}
          className="flex items-baseline justify-between sm:justify-start gap-2 px-2.5 py-1 rounded-lg bg-[#111114] border border-white/[0.05]"
        >
          <span className="text-[11px] text-zinc-400 truncate">{item.label}</span>
          <span
            className={`text-xs font-mono font-semibold tabular-nums ${
              item.accent ? 'text-emerald-400' : 'text-zinc-100'
            }`}
          >
            {item.value}
          </span>
        </div>
      ))}
    </div>
  );
};

/**
 * Rauno Freiberg / Linear-inspired monochrome top command header with compact telemetry strip.
 */
export const HeaderStats: React.FC<HeaderStatsProps> = ({
  stats,
  onTriggerScrape,
  isScraping,
  scrapePhase = 'idle',
  onOpenCommandPalette,
  onOpenIngestModal,
  showMarketPulse = false,
  onToggleMarketPulse,
}) => {
  const running = isScraping || scrapePhase === 'running';
  const lastSyncLabel = formatScrapeTimeIST(stats?.lastScrapeTime);

  return (
    <header className="bg-[#0C0C0F]/95 backdrop-blur-md border border-white/[0.07] rounded-2xl px-4 py-3">
      <div className="flex flex-col md:flex-row md:items-center md:justify-between gap-3">
        <div className="flex items-center gap-3 min-w-0">
          <div className="w-8 h-8 rounded-lg bg-[#141418] border border-white/[0.09] flex items-center justify-center shrink-0">
            <span className="w-2.5 h-2.5 rounded-full bg-emerald-400 shadow-[0_0_8px_rgba(16,185,129,0.7)]" />
          </div>
          <div className="min-w-0">
            <div className="flex items-center gap-2 flex-wrap">
              <h1 className="text-base font-semibold tracking-[-0.02em] text-zinc-50">
                Rental Radar
              </h1>
              <span className="text-[11px] text-zinc-400 hidden sm:inline">
                Bangalore Tech Corridors · Prestige Tech Park
              </span>
              {stats && (
                <span className="inline-flex items-center gap-1.5 text-[11px] font-mono tabular-nums px-2 py-0.5 rounded-md bg-[#141418] text-zinc-300 border border-white/[0.07]">
                  <span className="w-1.5 h-1.5 rounded-full bg-emerald-400" />
                  <span>{stats.totalListings} posts</span>
                  <span className="text-zinc-600">·</span>
                  <span className="text-zinc-400">{lastSyncLabel}</span>
                </span>
              )}
            </div>
          </div>
        </div>

        <div className="flex items-center gap-2 flex-wrap justify-end">
          {onToggleMarketPulse && (
            <button
              type="button"
              onClick={onToggleMarketPulse}
              aria-expanded={showMarketPulse}
              className={`inline-flex items-center gap-1.5 px-2.5 py-1.5 rounded-lg text-xs font-medium border transition-[background-color,border-color,color,transform] duration-140 ease-[var(--ease-out)] active:scale-[0.97] ${
                showMarketPulse
                  ? 'bg-zinc-100 text-zinc-950 border-zinc-200 font-semibold'
                  : 'bg-[#111114] hover:bg-[#18181C] text-zinc-300 border-white/[0.08]'
              }`}
            >
              <Activity className="w-3.5 h-3.5 text-emerald-400" />
              <span>Market Pulse & Scrape Log</span>
            </button>
          )}

          {onOpenCommandPalette && (
            <button
              type="button"
              onClick={onOpenCommandPalette}
              className="inline-flex items-center gap-1.5 px-2.5 py-1.5 rounded-lg text-xs font-medium bg-[#111114] hover:bg-[#18181C] text-zinc-300 hover:text-zinc-100 border border-white/[0.08] transition-[background-color,border-color,color,transform] duration-140 ease-[var(--ease-out)] active:scale-[0.97]"
              title="Open Command Palette (Cmd+K / Ctrl+K)"
            >
              <Search className="w-3.5 h-3.5 text-zinc-400" />
              <span className="hidden sm:inline">Commands</span>
              <kbd className="px-1 py-0.5 text-[10px] font-mono bg-[#09090B] text-zinc-400 rounded border border-white/[0.07]">
                ⌘K
              </kbd>
            </button>
          )}

          {onOpenIngestModal && (
            <button
              type="button"
              onClick={onOpenIngestModal}
              className="inline-flex items-center gap-1.5 px-2.5 py-1.5 rounded-lg text-xs font-medium bg-[#111114] hover:bg-[#18181C] text-zinc-300 hover:text-zinc-100 border border-white/[0.08] transition-[background-color,border-color,color,transform] duration-140 ease-[var(--ease-out)] active:scale-[0.97]"
            >
              <PlusCircle className="w-3.5 h-3.5 text-zinc-400" />
              <span>Ingest Post</span>
            </button>
          )}

          <button
            type="button"
            onClick={onTriggerScrape}
            disabled={running}
            className="inline-flex items-center gap-1.5 px-3 py-1.5 text-xs font-semibold text-zinc-950 bg-emerald-400 hover:bg-emerald-300 disabled:opacity-50 disabled:cursor-not-allowed rounded-lg transition-[background-color,transform] duration-140 ease-[var(--ease-out)] active:scale-[0.97]"
          >
            {running ? (
              <>
                <Loader2 className="w-3.5 h-3.5 animate-spin" />
                <span>Scraping FB Groups...</span>
              </>
            ) : scrapePhase === 'completed' ? (
              <>
                <CheckCircle2 className="w-3.5 h-3.5" />
                <span>Scrape Complete</span>
              </>
            ) : (
              <>
                <RefreshCw className="w-3.5 h-3.5" />
                <span>Check Groups Now</span>
              </>
            )}
          </button>
        </div>
      </div>

      {stats && <CompactMetricBar stats={stats} />}
    </header>
  );
};
