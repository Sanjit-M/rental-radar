import React, { useState, useEffect, useCallback, useMemo } from 'react';
import {
  type BangalorePlaceSummary,
  type BangaloreZone,
  BANGALORE_ZONES,
} from '../../domain/types';
import { api } from '../services/api';
import {
  MapPin,
  Search,
  ExternalLink,
  Building2,
  IndianRupee,
  Sparkles,
  Layers,
  Loader2,
  ArrowRight,
  Compass,
} from 'lucide-react';

export interface PlacesDirectoryViewProps {
  readonly onSelectLocality?: ((localityOrSociety: string) => void) | undefined;
}

interface PlaceCardProps {
  readonly place: BangalorePlaceSummary;
  readonly onSelectLocality?: ((localityOrSociety: string) => void) | undefined;
}

const PlaceCard: React.FC<PlaceCardProps> = ({ place, onSelectLocality }) => {
  const displayName = place.societyName ?? place.locality;
  const subLabel = place.societyName ? place.locality : 'Neighborhood Hub';

  return (
    <div className="bg-[#11131A]/90 p-4 rounded-2xl border border-white/[0.08] hover:border-emerald-500/40 transition-[border-color,background-color] duration-140 ease-[var(--ease-out)] flex flex-col justify-between gap-4 shadow-lg">
      <div className="space-y-2">
        <div className="flex items-start justify-between gap-2">
          <span className="inline-flex items-center gap-1 text-[10px] font-bold uppercase tracking-wider px-2 py-0.5 rounded-md bg-cyan-950/60 text-cyan-300 border border-cyan-500/30">
            <Compass className="w-2.5 h-2.5" />
            {place.zone}
          </span>
          <span className="inline-flex items-center gap-1 text-[11px] font-mono tabular-nums font-bold px-2 py-0.5 rounded-full bg-emerald-950/70 text-emerald-300 border border-emerald-500/40">
            <Sparkles className="w-3 h-3 text-emerald-400" />
            Top {place.topScore} pts
          </span>
        </div>

        <div>
          <h3 className="text-base font-bold text-white leading-snug flex items-center gap-1.5">
            {place.societyName ? (
              <Building2 className="w-4 h-4 text-indigo-400 shrink-0" />
            ) : (
              <MapPin className="w-4 h-4 text-emerald-400 shrink-0" />
            )}
            <span className="truncate">{displayName}</span>
          </h3>
          <p className="text-xs text-slate-400 mt-0.5">{subLabel}</p>
        </div>

        <div className="grid grid-cols-2 gap-2 pt-2">
          <div className="p-2.5 rounded-xl bg-[#090A0F] border border-white/[0.06]">
            <div className="text-[10px] text-slate-400 font-medium flex items-center gap-1">
              <Layers className="w-3 h-3 text-indigo-400" /> Active Listings
            </div>
            <div className="text-sm font-black text-white font-mono tabular-nums mt-0.5">
              {place.listingCount}
            </div>
          </div>

          <div className="p-2.5 rounded-xl bg-[#090A0F] border border-white/[0.06]">
            <div className="text-[10px] text-slate-400 font-medium flex items-center gap-1">
              <IndianRupee className="w-3 h-3 text-emerald-400" /> Median Rent
            </div>
            <div className="text-sm font-black text-emerald-400 font-mono tabular-nums mt-0.5">
              {place.medianRent ? `₹${place.medianRent.toLocaleString('en-IN')}` : '—'}
            </div>
          </div>
        </div>
      </div>

      <div className="pt-3 border-t border-white/[0.06] flex items-center justify-between gap-2">
        <a
          href={place.mapsUrl}
          target="_blank"
          rel="noreferrer"
          className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-xl bg-[#090A0F] hover:bg-white/[0.06] text-cyan-300 border border-cyan-500/30 text-xs font-semibold transition-[background-color,border-color,transform] duration-140 ease-[var(--ease-out)] active:scale-[0.97]"
          title={`Open ${displayName} in Google Maps`}
        >
          <MapPin className="w-3.5 h-3.5 text-cyan-400" />
          <span>Open in Google Maps</span>
          <ExternalLink className="w-3 h-3" />
        </a>

        {onSelectLocality && (
          <button
            type="button"
            onClick={() => onSelectLocality(displayName)}
            className="inline-flex items-center gap-1 px-3 py-1.5 rounded-xl bg-emerald-500/20 hover:bg-emerald-500/30 text-emerald-300 border border-emerald-500/40 text-xs font-bold transition-[background-color,border-color,transform] duration-140 ease-[var(--ease-out)] active:scale-[0.97]"
          >
            <span>View Listings</span>
            <ArrowRight className="w-3.5 h-3.5" />
          </button>
        )}
      </div>
    </div>
  );
};

/**
 * Aggregated Bangalore Places & Gated Societies index with 1-click Google Maps deep links.
 */
export const PlacesDirectoryView: React.FC<PlacesDirectoryViewProps> = ({
  onSelectLocality,
}) => {
  const [places, setPlaces] = useState<BangalorePlaceSummary[]>([]);
  const [selectedZone, setSelectedZone] = useState<BangaloreZone | 'all'>('all');
  const [search, setSearch] = useState('');
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  const fetchPlaces = useCallback(async (zone: BangaloreZone | 'all') => {
    setLoading(true);
    setError(null);
    try {
      const res = await api.getPlaces(zone);
      if (res._tag === 'err') {
        setError(res.error.message);
        return;
      }
      setPlaces(res.value.places);
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    fetchPlaces(selectedZone);
  }, [fetchPlaces, selectedZone]);

  const filteredPlaces = useMemo(() => {
    const q = search.trim().toLowerCase();
    if (!q) return places;
    return places.filter(
      (p) =>
        p.locality.toLowerCase().includes(q) ||
        p.zone.toLowerCase().includes(q) ||
        (p.societyName && p.societyName.toLowerCase().includes(q)),
    );
  }, [places, search]);

  return (
    <div className="space-y-5">
      {/* Zone Filter & Search Controls */}
      <div className="bg-[#11131A]/90 p-4 rounded-2xl border border-white/[0.08] space-y-3.5 shadow-lg">
        <div className="flex flex-col md:flex-row items-stretch md:items-end justify-between gap-3">
          <div className="flex-1 space-y-1">
            <label
              htmlFor="places-search-input"
              className="block text-[11px] font-semibold text-slate-400"
            >
              Search Bangalore Neighborhoods & Societies
            </label>
            <div className="relative">
              <Search className="w-4 h-4 absolute left-3.5 top-1/2 -translate-y-1/2 text-slate-400" />
              <input
                id="places-search-input"
                type="text"
                value={search}
                onChange={(e) => setSearch(e.target.value)}
                placeholder="Filter by locality (e.g. Indiranagar, HSR, Whitefield) or gated society..."
                className="w-full bg-[#090A0F] border border-white/[0.08] hover:border-white/[0.16] rounded-xl pl-10 pr-4 py-2 text-xs text-white placeholder-slate-500 focus:outline-none focus:border-emerald-500 transition-[border-color,background-color] duration-140 ease-[var(--ease-out)]"
              />
            </div>
          </div>

          <div className="text-xs text-slate-400 font-mono tabular-nums shrink-0">
            Showing <span className="text-white font-bold">{filteredPlaces.length}</span> indexed places
          </div>
        </div>

        {/* Bangalore Zone Selector Strip */}
        <div className="flex items-center gap-1.5 overflow-x-auto pb-1 no-scrollbar">
          <button
            type="button"
            onClick={() => setSelectedZone('all')}
            className={`shrink-0 px-3 py-1.5 rounded-xl text-xs font-bold border transition-[background-color,color,border-color,transform] duration-140 ease-[var(--ease-out)] active:scale-[0.97] ${
              selectedZone === 'all'
                ? 'bg-emerald-500 text-slate-950 border-emerald-400'
                : 'bg-[#090A0F] text-slate-300 border-white/[0.08] hover:border-white/[0.16]'
            }`}
          >
            All Zones
          </button>
          {BANGALORE_ZONES.map((zone) => (
            <button
              key={zone}
              type="button"
              onClick={() => setSelectedZone(zone)}
              className={`shrink-0 px-3 py-1.5 rounded-xl text-xs font-semibold border transition-[background-color,color,border-color,transform] duration-140 ease-[var(--ease-out)] active:scale-[0.97] ${
                selectedZone === zone
                  ? 'bg-emerald-500 text-slate-950 border-emerald-400 font-bold'
                  : 'bg-[#090A0F] text-slate-300 border-white/[0.08] hover:border-white/[0.16]'
              }`}
            >
              {zone}
            </button>
          ))}
        </div>
      </div>

      {/* Places Grid */}
      {error ? (
        <div className="bg-rose-950/30 border border-rose-500/40 p-5 rounded-2xl text-rose-300 flex items-center justify-between text-xs">
          <span>{error}</span>
          <button
            type="button"
            onClick={() => fetchPlaces(selectedZone)}
            className="px-3 py-1.5 rounded-lg bg-rose-600 hover:bg-rose-500 text-white font-bold"
          >
            Retry
          </button>
        </div>
      ) : loading ? (
        <div className="bg-[#11131A]/90 p-12 rounded-2xl border border-white/[0.08] flex flex-col items-center justify-center gap-3 text-slate-400 text-xs">
          <Loader2 className="w-6 h-6 animate-spin text-emerald-400" />
          <span>Indexing Bangalore neighborhoods & gated societies...</span>
        </div>
      ) : filteredPlaces.length === 0 ? (
        <div className="bg-[#11131A]/90 p-10 rounded-2xl border border-white/[0.08] text-center space-y-2 text-xs text-slate-400">
          <p className="text-sm font-bold text-white">No matching Bangalore places found</p>
          <p>Try selecting "All Zones" or clearing your search query.</p>
        </div>
      ) : (
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
          {filteredPlaces.map((place) => (
            <PlaceCard
              key={`${place.zone}-${place.locality}-${place.societyName ?? 'general'}`}
              place={place}
              onSelectLocality={onSelectLocality}
            />
          ))}
        </div>
      )}
    </div>
  );
};
