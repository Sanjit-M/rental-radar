import React, { useState, useEffect, useCallback, useMemo } from 'react';
import type { FbGroup } from '../../domain/types';
import { api } from '../services/api';
import { toast } from './ToastStack';
import {
  Users,
  Search,
  RefreshCw,
  ExternalLink,
  CheckCircle2,
  XCircle,
  Layers,
  Clock,
  Sparkles,
  Loader2,
} from 'lucide-react';

interface GroupCardProps {
  readonly group: FbGroup;
  readonly isToggling: boolean;
  readonly onToggle: (group: FbGroup) => void;
}

const GroupCard: React.FC<GroupCardProps> = ({ group, isToggling, onToggle }) => {
  const formattedLastScraped = group.lastScrapedAt
    ? new Date(group.lastScrapedAt).toLocaleString('en-IN', {
        day: '2-digit',
        month: 'short',
        hour: '2-digit',
        minute: '2-digit',
      })
    : 'Never scraped';

  return (
    <div
      className={`bg-[#11131A]/90 p-4 rounded-2xl border transition-[border-color,background-color] duration-140 ease-[var(--ease-out)] flex flex-col justify-between gap-4 shadow-lg ${
        group.enabled
          ? 'border-white/[0.08] hover:border-emerald-500/40'
          : 'border-white/[0.04] opacity-70 hover:opacity-100'
      }`}
    >
      <div className="space-y-2.5">
        <div className="flex items-start justify-between gap-3">
          <div className="min-w-0">
            <div className="flex items-center gap-2 flex-wrap mb-1">
              <span className="text-[10px] font-bold uppercase tracking-wider px-2 py-0.5 rounded-md bg-indigo-950/60 text-indigo-300 border border-indigo-500/30">
                {group.category}
              </span>
              <span className="text-[11px] font-mono tabular-nums text-slate-400">
                {group.memberCount} members
              </span>
            </div>
            <h3 className="text-sm font-bold text-white leading-snug truncate" title={group.name}>
              {group.name}
            </h3>
          </div>

          <button
            type="button"
            disabled={isToggling}
            aria-label={`Toggle scraping for ${group.name}`}
            aria-pressed={group.enabled}
            onClick={() => onToggle(group)}
            className={`shrink-0 inline-flex items-center gap-1.5 px-3 py-1.5 rounded-xl text-xs font-bold border transition-[background-color,color,border-color,transform] duration-140 ease-[var(--ease-out)] active:scale-[0.97] disabled:opacity-50 ${
              group.enabled
                ? 'bg-emerald-500/20 text-emerald-300 border-emerald-500/50 hover:bg-emerald-500/30'
                : 'bg-[#090A0F] text-slate-400 border-white/[0.08] hover:text-slate-200 hover:border-white/[0.16]'
            }`}
          >
            {group.enabled ? (
              <>
                <CheckCircle2 className="w-3.5 h-3.5 text-emerald-400" />
                <span>Enabled</span>
              </>
            ) : (
              <>
                <XCircle className="w-3.5 h-3.5 text-slate-500" />
                <span>Paused</span>
              </>
            )}
          </button>
        </div>
      </div>

      <div className="pt-3 border-t border-white/[0.06] flex items-center justify-between gap-2 text-xs">
        <div className="flex items-center gap-3 text-slate-400">
          <span className="inline-flex items-center gap-1 font-mono tabular-nums text-emerald-400 font-bold">
            <Layers className="w-3.5 h-3.5" />
            {group.listingsCount} listings
          </span>
          <span className="inline-flex items-center gap-1 text-[11px] font-mono tabular-nums text-slate-400">
            <Clock className="w-3 h-3 text-cyan-400" />
            {formattedLastScraped}
          </span>
        </div>

        <a
          href={group.url}
          target="_blank"
          rel="noreferrer"
          className="inline-flex items-center gap-1 px-2.5 py-1 rounded-lg bg-[#090A0F] hover:bg-white/[0.06] text-cyan-300 border border-white/[0.08] font-semibold text-[11px] transition-[background-color,border-color,transform] duration-140 ease-[var(--ease-out)] active:scale-[0.97]"
          title={`Open ${group.name} on Facebook`}
        >
          <span>Open Group</span>
          <ExternalLink className="w-3 h-3" />
        </a>
      </div>
    </div>
  );
};

/**
 * Directory of joined Bangalore Facebook rental groups with live toggle controls.
 */
export const GroupsDirectoryView: React.FC = () => {
  const [groups, setGroups] = useState<FbGroup[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [search, setSearch] = useState('');
  const [categoryFilter, setCategoryFilter] = useState<string>('all');
  const [togglingIds, setTogglingIds] = useState<ReadonlySet<string>>(new Set());

  const fetchGroups = useCallback(async () => {
    setLoading(true);
    setError(null);
    try {
      const res = await api.getGroups();
      if (res._tag === 'err') {
        setError(res.error.message);
        return;
      }
      setGroups(res.value.groups);
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    fetchGroups();
  }, [fetchGroups]);

  const handleToggleGroup = async (group: FbGroup) => {
    const nextEnabled = !group.enabled;
    setTogglingIds((prev) => new Set(prev).add(group.id));
    setGroups((prev) =>
      prev.map((g) => (g.id === group.id ? { ...g, enabled: nextEnabled } : g)),
    );

    try {
      const res = await api.toggleGroup(group.id, nextEnabled);
      if (res._tag === 'err') {
        setGroups((prev) =>
          prev.map((g) => (g.id === group.id ? { ...g, enabled: group.enabled } : g)),
        );
        toast.error(`Failed to update group: ${res.error.message}`);
        return;
      }
      toast.success(
        `${group.name} ${nextEnabled ? 'enabled for daily scraping' : 'paused'}`,
      );
    } finally {
      setTogglingIds((prev) => {
        const next = new Set(prev);
        next.delete(group.id);
        return next;
      });
    }
  };

  const categories = useMemo(() => {
    const unique = Array.from(new Set(groups.map((g) => g.category).filter(Boolean)));
    return ['all', ...unique];
  }, [groups]);

  const filteredGroups = useMemo(() => {
    const q = search.trim().toLowerCase();
    return groups.filter((g) => {
      if (categoryFilter !== 'all' && g.category !== categoryFilter) return false;
      if (!q) return true;
      return (
        g.name.toLowerCase().includes(q) ||
        g.category.toLowerCase().includes(q) ||
        g.id.toLowerCase().includes(q)
      );
    });
  }, [groups, search, categoryFilter]);

  const enabledCount = useMemo(
    () => groups.filter((g) => g.enabled).length,
    [groups],
  );
  const totalYieldedListings = useMemo(
    () => groups.reduce((acc, g) => acc + (g.listingsCount || 0), 0),
    [groups],
  );

  return (
    <div className="space-y-5">
      {/* Summary Metrics */}
      <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
        <div className="bg-[#11131A]/90 p-4 rounded-2xl border border-white/[0.08] flex items-center gap-3.5 shadow-lg">
          <div className="p-2.5 rounded-xl bg-indigo-950/60 border border-indigo-500/30 text-indigo-400">
            <Users className="w-5 h-5" />
          </div>
          <div>
            <div className="text-xs text-slate-400 font-medium">Total Joined Groups</div>
            <div className="text-xl font-black text-white font-mono tabular-nums">
              {groups.length}
            </div>
          </div>
        </div>

        <div className="bg-[#11131A]/90 p-4 rounded-2xl border border-white/[0.08] flex items-center gap-3.5 shadow-lg">
          <div className="p-2.5 rounded-xl bg-emerald-950/60 border border-emerald-500/30 text-emerald-400">
            <CheckCircle2 className="w-5 h-5" />
          </div>
          <div>
            <div className="text-xs text-slate-400 font-medium">Enabled for Daily Scrape</div>
            <div className="text-xl font-black text-emerald-400 font-mono tabular-nums">
              {enabledCount} / {groups.length}
            </div>
          </div>
        </div>

        <div className="bg-[#11131A]/90 p-4 rounded-2xl border border-white/[0.08] flex items-center gap-3.5 shadow-lg">
          <div className="p-2.5 rounded-xl bg-cyan-950/60 border border-cyan-500/30 text-cyan-400">
            <Sparkles className="w-5 h-5" />
          </div>
          <div>
            <div className="text-xs text-slate-400 font-medium">Total Matched Listings Yielded</div>
            <div className="text-xl font-black text-white font-mono tabular-nums">
              {totalYieldedListings}
            </div>
          </div>
        </div>
      </div>

      {/* Filter & Search Bar */}
      <div className="bg-[#11131A]/90 p-4 rounded-2xl border border-white/[0.08] flex flex-col md:flex-row items-stretch md:items-end justify-between gap-3 shadow-lg">
        <div className="flex-1 space-y-1">
          <label
            htmlFor="groups-search-input"
            className="block text-[11px] font-semibold text-slate-400"
          >
            Search Joined Facebook Groups
          </label>
          <div className="relative">
            <Search className="w-4 h-4 absolute left-3.5 top-1/2 -translate-y-1/2 text-slate-400" />
            <input
              id="groups-search-input"
              type="text"
              value={search}
              onChange={(e) => setSearch(e.target.value)}
              placeholder="Search by group name, corridor, or category..."
              className="w-full bg-[#090A0F] border border-white/[0.08] hover:border-white/[0.16] rounded-xl pl-10 pr-4 py-2 text-xs text-white placeholder-slate-500 focus:outline-none focus:border-emerald-500 transition-[border-color,background-color] duration-140 ease-[var(--ease-out)]"
            />
          </div>
        </div>

        <div className="flex items-center gap-2 flex-wrap">
          {categories.map((cat) => (
            <button
              key={cat}
              type="button"
              onClick={() => setCategoryFilter(cat)}
              className={`px-3 py-2 rounded-xl text-xs font-semibold border transition-[background-color,color,border-color,transform] duration-140 ease-[var(--ease-out)] active:scale-[0.97] ${
                categoryFilter === cat
                  ? 'bg-emerald-500 text-slate-950 border-emerald-400 font-bold'
                  : 'bg-[#090A0F] text-slate-300 border-white/[0.08] hover:border-white/[0.16]'
              }`}
            >
              {cat === 'all' ? 'All Categories' : cat}
            </button>
          ))}

          <button
            type="button"
            onClick={fetchGroups}
            disabled={loading}
            className="inline-flex items-center gap-1.5 px-3.5 py-2 rounded-xl text-xs font-bold bg-[#090A0F] hover:bg-white/[0.06] text-slate-200 border border-white/[0.08] transition-[background-color,border-color,transform] duration-140 ease-[var(--ease-out)] active:scale-[0.97] disabled:opacity-50"
          >
            <RefreshCw className={`w-3.5 h-3.5 ${loading ? 'animate-spin text-emerald-400' : ''}`} />
            <span>Refresh Groups</span>
          </button>
        </div>
      </div>

      {/* Groups Grid */}
      {error ? (
        <div className="bg-rose-950/30 border border-rose-500/40 p-5 rounded-2xl text-rose-300 flex items-center justify-between text-xs">
          <span>{error}</span>
          <button
            type="button"
            onClick={fetchGroups}
            className="px-3 py-1.5 rounded-lg bg-rose-600 hover:bg-rose-500 text-white font-bold"
          >
            Retry
          </button>
        </div>
      ) : loading ? (
        <div className="bg-[#11131A]/90 p-12 rounded-2xl border border-white/[0.08] flex flex-col items-center justify-center gap-3 text-slate-400 text-xs">
          <Loader2 className="w-6 h-6 animate-spin text-emerald-400" />
          <span>Loading joined Facebook groups...</span>
        </div>
      ) : filteredGroups.length === 0 ? (
        <div className="bg-[#11131A]/90 p-10 rounded-2xl border border-white/[0.08] text-center space-y-2 text-xs text-slate-400">
          <p className="text-sm font-bold text-white">No matching Facebook groups found</p>
          <p>Try clearing your search filter or category selection.</p>
        </div>
      ) : (
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
          {filteredGroups.map((group) => (
            <GroupCard
              key={group.id}
              group={group}
              isToggling={togglingIds.has(group.id)}
              onToggle={handleToggleGroup}
            />
          ))}
        </div>
      )}
    </div>
  );
};
