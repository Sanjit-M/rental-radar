import React, { useState, useEffect, useMemo, useRef } from 'react';
import { RentalListing } from '../../domain/types';
import { formatINR } from './gestureMath';
import {
  Search,
  X,
  Building,
  MapPin,
  User,
  Clock,
  Droplets,
  ShieldCheck,
  ChevronRight,
  Sparkles,
} from 'lucide-react';

export interface MobileSpotlightProps {
  readonly isOpen: boolean;
  readonly onClose: () => void;
  readonly listings: readonly RentalListing[];
  readonly onSelectListing: (listing: RentalListing) => void;
  readonly onSelectCorridor?: ((corridor: string) => void) | undefined;
}

const QUICK_SEARCH_CHIPS = [
  'Sobha Dream Acres',
  'Prestige Tech Vista',
  'PLH',
  'Kadubeesanahalli',
  'Bellandur',
  'Panathur',
  'Cauvery Water',
  'Zero Brokerage',
] as const;

export const MobileSpotlight: React.FC<MobileSpotlightProps> = ({
  isOpen,
  onClose,
  listings,
  onSelectListing,
  onSelectCorridor,
}) => {
  const [query, setQuery] = useState('');
  const inputRef = useRef<HTMLInputElement>(null);

  // Focus input when opened
  useEffect(() => {
    if (isOpen) {
      const timeout = setTimeout(() => {
        inputRef.current?.focus();
      }, 50);
      return () => clearTimeout(timeout);
    } else {
      setQuery('');
    }
  }, [isOpen]);

  // Global ⌘K / Ctrl+K and Escape listeners
  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      if ((e.metaKey || e.ctrlKey) && e.key.toLowerCase() === 'k') {
        e.preventDefault();
        if (isOpen) {
          onClose();
        }
      }
      if (e.key === 'Escape' && isOpen) {
        e.preventDefault();
        onClose();
      }
    };

    window.addEventListener('keydown', handleKeyDown);
    return () => window.removeEventListener('keydown', handleKeyDown);
  }, [isOpen, onClose]);

  const searchResults = useMemo(() => {
    const trimmed = query.trim().toLowerCase();
    if (!trimmed) {
      // If query is empty, return top 6 highest-scoring verified listings
      return [...listings].sort((a, b) => b.score - a.score).slice(0, 6);
    }

    return listings.filter((l) => {
      const textMatches =
        l.location.toLowerCase().includes(trimmed) ||
        (l.landmark?.toLowerCase() ?? '').includes(trimmed) ||
        (l.entities.societyName?.toLowerCase() ?? '').includes(trimmed) ||
        l.authorName.toLowerCase().includes(trimmed) ||
        (l.title?.toLowerCase() ?? '').includes(trimmed) ||
        l.rawText.toLowerCase().includes(trimmed);

      if (trimmed === 'cauvery' || trimmed === 'cauvery water') {
        return (
          l.rawText.toLowerCase().includes('cauvery') ||
          l.rawText.toLowerCase().includes('kaveri')
        );
      }

      if (trimmed === 'zero brokerage') {
        return !l.entities.isBrokerage;
      }

      return textMatches;
    });
  }, [listings, query]);

  if (!isOpen) return null;

  return (
    <div
      role="dialog"
      aria-modal="true"
      aria-label="Spotlight Search"
      className="fixed inset-0 z-50 flex flex-col justify-start bg-slate-950/80 backdrop-blur-xl animate-in fade-in duration-150"
    >
      {/* Backdrop Dismiss Button */}
      <div
        className="absolute inset-0 -z-10"
        onClick={onClose}
        aria-hidden="true"
      />

      {/* Main Spotlight Container */}
      <div className="w-full max-w-lg mx-auto bg-slate-900 border-b sm:border border-slate-800 sm:rounded-3xl shadow-2xl overflow-hidden flex flex-col max-h-[88vh] sm:mt-12">
        {/* Search Input Bar */}
        <div className="flex items-center gap-3 px-4 py-3.5 border-b border-slate-800 bg-slate-950/60">
          <Search className="w-5 h-5 text-emerald-400 shrink-0" />
          <input
            ref={inputRef}
            type="text"
            value={query}
            onChange={(e) => setQuery(e.target.value)}
            placeholder="Search societies (Sobha, PLH), areas, or landlords..."
            className="flex-1 bg-transparent text-sm text-white placeholder-slate-500 focus:outline-none"
          />
          {query ? (
            <button
              type="button"
              onClick={() => setQuery('')}
              className="p-1 rounded-full bg-slate-800 text-slate-400 hover:text-white transition-colors"
              aria-label="Clear query"
            >
              <X className="w-3.5 h-3.5" />
            </button>
          ) : (
            <kbd className="hidden sm:inline-block px-1.5 py-0.5 text-[10px] font-mono text-slate-400 bg-slate-800 rounded border border-slate-700">
              ESC
            </kbd>
          )}
          <button
            type="button"
            onClick={onClose}
            className="sm:hidden text-xs font-semibold text-slate-400 hover:text-white"
          >
            Cancel
          </button>
        </div>

        {/* Quick Suggestion Chips */}
        <div className="px-4 py-2.5 bg-slate-950/40 border-b border-slate-800/60 overflow-x-auto no-scrollbar flex items-center gap-1.5 shrink-0">
          <span className="text-[10px] font-bold uppercase tracking-wider text-slate-400 shrink-0 mr-1">
            Quick:
          </span>
          {QUICK_SEARCH_CHIPS.map((chip) => (
            <button
              key={chip}
              type="button"
              onClick={() => setQuery(chip)}
              className={`shrink-0 px-2.5 py-1 rounded-full text-xs font-medium transition-colors border ${
                query.toLowerCase() === chip.toLowerCase()
                  ? 'bg-emerald-500/20 text-emerald-300 border-emerald-500/50'
                  : 'bg-slate-800/80 text-slate-300 border-slate-700/80 hover:bg-slate-800 hover:text-white'
              }`}
            >
              {chip}
            </button>
          ))}
        </div>

        {/* Results Stream */}
        <div className="flex-1 overflow-y-auto p-3 space-y-2">
          <div className="px-2 py-1 flex items-center justify-between text-[11px] font-semibold text-slate-400">
            <span>
              {query.trim()
                ? `Results for "${query}" (${searchResults.length})`
                : '⭐ Trending in East Bengaluru'}
            </span>
            <span className="text-[10px] text-emerald-400 font-mono">
              Live Index
            </span>
          </div>

          {searchResults.length === 0 ? (
            <div className="py-12 text-center text-slate-500 text-xs">
              <p>No listings matched "{query}".</p>
              <p className="mt-1 text-[11px] text-slate-400">
                Try searching for "Kadubeesanahalli", "Sobha", or "2BHK".
              </p>
            </div>
          ) : (
            searchResults.map((listing) => {
              const hasCauvery =
                listing.rawText.toLowerCase().includes('cauvery') ||
                listing.rawText.toLowerCase().includes('kaveri');
              const societyName =
                listing.entities.societyName ?? listing.location;

              return (
                <div
                  key={listing.id}
                  onClick={() => {
                    onSelectListing(listing);
                    onClose();
                  }}
                  className="w-full text-left p-3 rounded-2xl bg-slate-950/70 hover:bg-slate-800/90 border border-slate-800/80 hover:border-emerald-500/40 transition-colors flex items-center gap-3 cursor-pointer group"
                >
                  <div className="w-12 h-12 rounded-xl bg-slate-800 overflow-hidden shrink-0 relative flex items-center justify-center border border-slate-700">
                    {listing.imageUrls?.[0] ? (
                      <img
                        src={listing.imageUrls[0]}
                        alt={societyName}
                        className="w-full h-full object-cover"
                      />
                    ) : (
                      <Building className="w-5 h-5 text-slate-500" />
                    )}
                    <span className="absolute bottom-0.5 right-0.5 px-1 py-0.2 rounded bg-slate-900/90 text-[9px] font-mono font-bold text-emerald-400">
                      {listing.score}
                    </span>
                  </div>

                  <div className="flex-1 min-w-0">
                    <div className="flex items-center gap-1.5">
                      <h4 className="text-xs font-bold text-white truncate group-hover:text-emerald-300 transition-colors">
                        {societyName}
                      </h4>
                      {listing.entities.isGatedSociety && (
                        <span className="shrink-0 text-[9px] font-mono px-1.5 py-0.2 rounded bg-slate-800 text-slate-400 border border-slate-700">
                          Gated
                        </span>
                      )}
                    </div>

                    <div className="flex items-center gap-2 text-[11px] text-slate-400 mt-0.5">
                      <span className="flex items-center gap-1 truncate">
                        <MapPin className="w-3 h-3 text-slate-500 shrink-0" />
                        <span className="truncate">{listing.location}</span>
                      </span>
                      <span>•</span>
                      <span className="flex items-center gap-1 shrink-0 text-cyan-400">
                        <Clock className="w-3 h-3 shrink-0" />
                        <span>{listing.commute.twoWayAvgPeakMins}m to PTP</span>
                      </span>
                    </div>

                    <div className="flex items-center gap-1.5 mt-1.5 flex-wrap">
                      <span className="text-xs font-extrabold text-white">
                        {formatINR(listing.entities.rent)}
                        <span className="text-[10px] font-normal text-slate-400">
                          /mo
                        </span>
                      </span>
                      {hasCauvery && (
                        <span className="inline-flex items-center gap-0.5 text-[10px] font-semibold text-cyan-300 bg-cyan-950/60 border border-cyan-800/60 px-1.5 py-0.2 rounded-md">
                          <Droplets className="w-2.5 h-2.5" />
                          Cauvery
                        </span>
                      )}
                      {!listing.entities.isBrokerage && (
                        <span className="inline-flex items-center gap-0.5 text-[10px] font-semibold text-emerald-300 bg-emerald-950/60 border border-emerald-800/60 px-1.5 py-0.2 rounded-md">
                          <ShieldCheck className="w-2.5 h-2.5" />
                          0% Brokerage
                        </span>
                      )}
                    </div>
                  </div>

                  <ChevronRight className="w-4 h-4 text-slate-600 group-hover:text-emerald-400 group-hover:translate-x-0.5 transition-transform shrink-0" />
                </div>
              );
            })
          )}
        </div>

        {/* Footer */}
        <div className="p-3 bg-slate-950/80 border-t border-slate-800/80 flex items-center justify-between text-[11px] text-slate-400">
          <span>Tap any result to launch 2-stage inspection</span>
          <span className="font-mono text-[10px] text-slate-400">
            {listings.length} live units indexed
          </span>
        </div>
      </div>
    </div>
  );
};
