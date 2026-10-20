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
    <div className="bg-[#111114] p-4 rounded-xl border border-white/[0.07] hover:border-white/[0.15] transition-[border-color,background-color] duration-140 ease-[var(--ease-out)] flex flex-col justify-between gap-3.5">
      <div className="space-y-2">
        <div className="flex items-start justify-between gap-2">
          <span className="inline-flex items-center gap-1 text-[10px] font-medium uppercase tracking-wider px-2 py-0.5 rounded bg-[#18181C] text-zinc-300 border border-white/[0.07]">
            <Compass className="w-2.5 h-2.5 text-zinc-400" />
            {place.zone}
          </span>
          <span className="inline-flex items-center gap-1 text-[11px] font-mono tabular-nums font-semibold px-2 py-0.5 rounded bg-emerald-950/40 text-emerald-300 border border-emerald-500/30">
            <Sparkles className="w-3 h-3 text-emerald-400" />
            Top {place.topScore} pts
          </span>
        </div>

        <div>
          <h3 className="text-[15px] font-semibold text-zinc-50 leading-snug flex items-center gap-1.5">
            {place.societyName ? (
              <Building2 className="w-4 h-4 text-zinc-400 shrink-0" />
            ) : (
              <MapPin className="w-4 h-4 text-emerald-400 shrink-0" />
            )}
            <span className="truncate">{displayName}</span>
          </h3>
          <p className="text-xs text-zinc-400 mt-0.5">{subLabel}</p>
        </div>

        <div className="grid grid-cols-2 gap-2 pt-1.5">
          <div className="p-2.5 rounded-lg bg-[#09090B] border border-white/[0.06]">
            <div className="text-[10px] text-zinc-400 font-medium flex items-center gap-1">
              <Layers className="w-3 h-3 text-zinc-500" /> Active Posts
            </div>
            <div className="text-sm font-semibold text-zinc-100 font-mono tabular-nums mt-0.5">
              {place.listingCount}
            </div>
          </div>

          <div className="p-2.5 rounded-lg bg-[#09090B] border border-white/[0.06]">
            <div className="text-[10px] text-zinc-400 font-medium flex items-center gap-1">
              <IndianRupee className="w-3 h-3 text-zinc-500" /> Median Rent
            </div>
            <div className="text-sm font-semibold text-zinc-100 font-mono tabular-nums mt-0.5">
              {place.medianRent ? `₹${place.medianRent.toLocaleString('en-IN')}` : '—'}
            </div>
          </div>
        </div>
      </div>

      <div className="pt-2.5 border-t border-white/[0.06] flex items-center justify-between gap-2">
        <a
          href={place.mapsUrl}
          target="_blank"
          rel="noreferrer"
          className="inline-flex items-center gap-1.5 px-2.5 py-1.5 rounded-lg bg-[#09090B] hover:bg-[#18181C] text-zinc-300 border border-white/[0.08] text-xs font-medium transition-[background-color,border-color,transform] duration-140 ease-[var(--ease-out)] active:scale-[0.97]"
          title={`Open ${displayName} in Google Maps`}
        >
          <MapPin className="w-3.5 h-3.5 text-emerald-400" />
          <span>Google Maps</span>
          <ExternalLink className="w-3 h-3 text-zinc-500" />
        </a>

        {onSelectLocality && (
          <button
            type="button"
            onClick={() => onSelectLocality(displayName)}
            className="inline-flex items-center gap-1 px-2.5 py-1.5 rounded-lg bg-zinc-100 hover:bg-white text-zinc-950 text-xs font-semibold transition-[background-color,transform] duration-140 ease-[var(--ease-out)] active:scale-[0.97]"
          >
            <span>Filter Posts</span>
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
    <div className="space-y-4">
      <div className="bg-[#111114] p-3.5 rounded-xl border border-white/[0.07] space-y-3">
        <div className="flex flex-col md:flex-row items-stretch md:items-end justify-between gap-3">
          <div className="flex-1 space-y-1">
            <label
              htmlFor="places-search-input"
              className="block text-[11px] font-medium text-zinc-400"
            >
              Search Bangalore Neighborhoods & Societies
            </label>
            <div className="relative">
              <Search className="w-3.5 h-3.5 absolute left-3 top-1/2 -translate-y-1/2 text-zinc-500" />
              <input
                id="places-search-input"
                type="text"
                value={search}
                onChange={(e) => setSearch(e.target.value)}
                placeholder="Filter by locality (e.g. Indiranagar, HSR, Whitefield) or gated society..."
                className="w-full bg-[#09090B] border border-white/[0.07] hover:border-white/[0.15] rounded-lg pl-9 pr-3 py-1.5 text-xs text-zinc-100 placeholder-zinc-500 focus:outline-none focus:border-zinc-400 transition-[border-color,background-color] duration-140 ease-[var(--ease-out)]"
              />
            </div>
          </div>

          <div className="text-xs text-zinc-400 font-mono tabular-nums shrink-0">
            Showing <span className="text-zinc-100 font-semibold">{filteredPlaces.length}</span> indexed places
          </div>
        </div>

        <div className="flex items-center gap-1.5 overflow-x-auto pb-0.5 no-scrollbar">
          <button
            type="button"
            onClick={() => setSelectedZone('all')}
            className={`shrink-0 px-2.5 py-1 rounded-lg text-xs font-medium border transition-[background-color,color,border-color,transform] duration-140 ease-[var(--ease-out)] active:scale-[0.97] ${
              selectedZone === 'all'
                ? 'bg-zinc-100 text-zinc-950 border-zinc-200 font-semibold'
                : 'bg-[#09090B] text-zinc-300 border-white/[0.07] hover:border-white/[0.15]'
            }`}
          >
            All Zones
          </button>
          {BANGALORE_ZONES.map((zone) => (
            <button
              key={zone}
              type="button"
              onClick={() => setSelectedZone(zone)}
              className={`shrink-0 px-2.5 py-1 rounded-lg text-xs font-medium border transition-[background-color,color,border-color,transform] duration-140 ease-[var(--ease-out)] active:scale-[0.97] ${
                selectedZone === zone
                  ? 'bg-zinc-100 text-zinc-950 border-zinc-200 font-semibold'
                  : 'bg-[#09090B] text-zinc-300 border-white/[0.07] hover:border-white/[0.15]'
              }`}
            >
              {zone}
            </button>
          ))}
        </div>
      </div>

      {error ? (
        <div className="bg-rose-950/30 border border-rose-500/40 p-4 rounded-xl text-rose-300 flex items-center justify-between text-xs">
          <span>{error}</span>
          <button
            type="button"
            onClick={() => fetchPlaces(selectedZone)}
            className="px-3 py-1.5 rounded-lg bg-rose-600 hover:bg-rose-500 text-white font-semibold"
          >
            Retry
          </button>
        </div>
      ) : loading ? (
        <div className="bg-[#111114] p-10 rounded-xl border border-white/[0.07] flex flex-col items-center justify-center gap-2.5 text-zinc-400 text-xs">
          <Loader2 className="w-5 h-5 animate-spin text-emerald-400" />
          <span>Indexing Bangalore neighborhoods & gated societies...</span>
        </div>
      ) : filteredPlaces.length === 0 ? (
        <div className="bg-[#111114] p-8 rounded-xl border border-white/[0.07] text-center space-y-1.5 text-xs text-zinc-400">
          <p className="text-sm font-semibold text-zinc-100">No matching Bangalore places found</p>
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
