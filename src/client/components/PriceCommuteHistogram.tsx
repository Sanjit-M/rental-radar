import React, { useState, useMemo } from 'react';
import type { RentalListing } from '../../domain/types';
import {
  IndianRupee,
  Clock,
  Bike,
  CheckCircle2,
  Sparkles,
} from 'lucide-react';

export interface PriceCommuteHistogramProps {
  readonly listings: RentalListing[];
  readonly maxRent: number;
  readonly onMaxRentChange: (rent: number) => void;
  readonly selectedCorridor: string;
  readonly onSelectCorridor: (corridorId: string) => void;
}

interface PriceBucket {
  readonly id: string;
  readonly label: string;
  readonly min: number;
  readonly max: number;
  readonly targetRent: number;
  readonly count: number;
  readonly percentage: number;
  readonly subtext: string;
}

interface CorridorCommuteProfile {
  readonly key: string;
  readonly id: string;
  readonly name: string;
  readonly minutes: number;
  readonly description: string;
}

const CORRIDOR_COMMUTES: readonly CorridorCommuteProfile[] = [
  { key: 'cessna', id: 'Cessna', name: 'Cessna Business Park', minutes: 10, description: 'Direct ORR tech hub access' },
  { key: 'kadubeesanahalli', id: 'Kadubeesanahalli', name: 'Kadubeesanahalli', minutes: 12, description: 'PTP primary gateway' },
  { key: 'bellandur-gg', id: 'Bellandur', name: 'Green Glen / Bellandur', minutes: 15, description: 'EcoSpace & Green Glen' },
  { key: 'sarjapur-harlur', id: 'Harlur', name: 'Harlur & Sarjapur Rd', minutes: 18, description: 'Harlur & Kasavanahalli' },
  { key: 'boganahalli', id: 'Boganahalli', name: 'Boganahalli / Panathur', minutes: 20, description: 'Vaswani & railway bypass' },
  { key: 'marathahalli', id: 'Marathahalli', name: 'Marathahalli / HSR', minutes: 24, description: 'ORR north & south hubs' },
];

/**
 * Interactive Wattenberger-inspired rent histogram and scooter commute scrubber.
 */
export const PriceCommuteHistogram: React.FC<PriceCommuteHistogramProps> = ({
  listings,
  maxRent,
  onMaxRentChange,
  selectedCorridor,
  onSelectCorridor,
}) => {
  const [commuteMaxMinutes, setCommuteMaxMinutes] = useState<number>(20);
  const [hoveredBucketId, setHoveredBucketId] = useState<string | null>(null);

  const buckets = useMemo<PriceBucket[]>(() => {
    const rawBuckets = [
      { id: 'b1', label: '< ₹20k', min: 0, max: 20000, targetRent: 20000, subtext: 'Budget flatshare' },
      { id: 'b2', label: '₹20k–₹26k', min: 20001, max: 26000, targetRent: 26000, subtext: '1 BHK sweet spot' },
      { id: 'b3', label: '₹26k–₹32k', min: 26001, max: 32000, targetRent: 32000, subtext: 'Furnished 1/2 BHK' },
      { id: 'b4', label: '₹32k–₹38k', min: 32001, max: 38000, targetRent: 38000, subtext: 'Standard 2 BHK' },
      { id: 'b5', label: '₹38k–₹45k', min: 38001, max: 45000, targetRent: 45000, subtext: 'Gated 2/3 BHK' },
      { id: 'b6', label: '> ₹45k', min: 45001, max: 1000000, targetRent: 60000, subtext: 'Executive suites' },
    ];

    const counts: number[] = rawBuckets.map((b) =>
      listings.filter((l) => {
        const rent = l.entities.rent;
        if (!rent) return false;
        return rent >= b.min && rent <= b.max;
      }).length,
    );

    const totalValid = listings.filter((l) => Boolean(l.entities.rent)).length || 1;

    return rawBuckets.map((b, i) => {
      const count = counts[i] ?? 0;
      return {
        ...b,
        count,
        percentage: Math.round((count / totalValid) * 100),
      };
    });
  }, [listings]);

  const maxBucketCount = useMemo(() => {
    return Math.max(...buckets.map((b) => b.count), 1);
  }, [buckets]);

  const activeBucket = buckets.find((b) => b.id === hoveredBucketId);

  return (
    <div className="bg-[#11131A]/90 p-5 rounded-3xl border border-white/[0.08] space-y-6 shadow-2xl relative overflow-hidden">
      <div className="grid grid-cols-1 lg:grid-cols-12 gap-6 relative z-10">
        <div className="lg:col-span-7 space-y-4">
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-2">
              <div className="p-2 rounded-xl bg-emerald-950/80 border border-emerald-500/30 text-emerald-400">
                <IndianRupee className="w-4 h-4" />
              </div>
              <div>
                <h3 className="text-xs font-bold uppercase tracking-wider text-slate-200">
                  Rent Frequency Distribution
                </h3>
                <p className="text-[11px] text-slate-400">
                  Interactive distribution synced with live Bangalore listings
                </p>
              </div>
            </div>

            <div className="text-right">
              <span className="text-[10px] text-slate-400 block uppercase font-mono">Max Budget</span>
              <span className="text-sm font-black font-mono tabular-nums text-emerald-400">
                ₹{maxRent.toLocaleString('en-IN')}
              </span>
            </div>
          </div>

          <div className="bg-[#090A0F]/90 rounded-2xl p-4 border border-white/[0.08]">
            <div className="h-32 flex items-end justify-between gap-2 pt-2 px-1 pb-1">
              {buckets.map((b) => {
                const isUnderCeiling = b.min <= maxRent;
                const isHovered = hoveredBucketId === b.id;
                const barHeightPct = Math.max(8, (b.count / maxBucketCount) * 100);

                return (
                  <button
                    key={b.id}
                    type="button"
                    aria-label={`Filter max rent to ${b.label} (${b.count} listings)`}
                    onMouseEnter={() => setHoveredBucketId(b.id)}
                    onMouseLeave={() => setHoveredBucketId(null)}
                    onClick={() => onMaxRentChange(b.targetRent)}
                    className="flex-1 flex flex-col items-center justify-end h-full group cursor-pointer bg-transparent border-0 p-0 focus:outline-none active:scale-[0.97] transition-transform duration-140 ease-[var(--ease-out)]"
                  >
                    <div
                      className={`text-[10px] font-mono tabular-nums font-bold mb-1.5 transition-[transform,color] duration-150 ease-[var(--ease-out)] ${
                        isHovered
                          ? 'text-cyan-300 scale-110'
                          : isUnderCeiling
                            ? 'text-slate-400 group-hover:text-white'
                            : 'text-slate-600'
                      }`}
                    >
                      {b.count}
                    </div>

                    <div className="w-full bg-[#11131A] rounded-lg p-0.5 h-full flex items-end border border-white/[0.05]">
                      <div
                        style={{ height: `${barHeightPct}%` }}
                        className={`w-full rounded-md transition-[height,background-color,box-shadow,opacity] duration-250 ease-[var(--ease-out)] relative ${
                          isUnderCeiling
                            ? isHovered
                              ? 'bg-gradient-to-t from-emerald-500 to-cyan-400 shadow-lg shadow-emerald-500/30'
                              : 'bg-gradient-to-t from-emerald-600 to-emerald-400'
                            : 'bg-slate-800/60 border border-slate-700/40 opacity-40'
                        }`}
                      >
                        {isUnderCeiling && (
                          <div className="absolute top-0 inset-x-0 h-1 bg-white/40 rounded-t-md" />
                        )}
                      </div>
                    </div>

                    <div
                      className={`text-[9px] font-mono tabular-nums mt-2 truncate max-w-full transition-colors duration-140 ${
                        isUnderCeiling ? 'text-slate-300 font-semibold' : 'text-slate-600'
                      }`}
                    >
                      {b.label}
                    </div>
                  </button>
                );
              })}
            </div>

            <div className="mt-2 pt-2 border-t border-white/[0.08] flex items-center justify-between text-[11px] text-slate-400">
              {activeBucket ? (
                <div className="flex items-center gap-1.5 text-cyan-300 font-medium font-mono tabular-nums">
                  <Sparkles className="w-3.5 h-3.5 text-cyan-400" />
                  <span>
                    {activeBucket.label}: {activeBucket.count} listings ({activeBucket.percentage}% of feed) • {activeBucket.subtext}
                  </span>
                </div>
              ) : (
                <span>Click any bar to snap maximum rent ceiling</span>
              )}
              <span className="font-mono text-[10px] text-slate-500">Click bar to filter</span>
            </div>
          </div>

          <div className="space-y-1.5 pt-1">
            <div className="flex items-center justify-between text-[11px] text-slate-400 font-mono tabular-nums">
              <span>₹15,000</span>
              <label htmlFor="histogram-rent-slider" className="text-emerald-400 font-bold cursor-pointer">
                Slide to adjust budget ceiling
              </label>
              <span>₹60,000+</span>
            </div>
            <input
              id="histogram-rent-slider"
              type="range"
              min={15000}
              max={60000}
              step={1000}
              value={maxRent}
              onChange={(e) => onMaxRentChange(Number(e.target.value))}
              className="w-full h-2 bg-[#090A0F] rounded-lg appearance-none cursor-pointer accent-emerald-400 transition-[box-shadow,background-color] duration-140 focus:outline-none focus:ring-2 focus:ring-emerald-400/40"
            />
          </div>
        </div>

        <div className="lg:col-span-5 space-y-4 lg:border-l lg:border-white/[0.08] lg:pl-6">
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-2">
              <div className="p-2 rounded-xl bg-cyan-950/80 border border-cyan-500/30 text-cyan-400">
                <Bike className="w-4 h-4" />
              </div>
              <div>
                <h3 className="text-xs font-bold uppercase tracking-wider text-slate-200">
                  Scooter Commute Scrubber
                </h3>
                <p className="text-[11px] text-slate-400">
                  Peak weekday morning rush to PTP
                </p>
              </div>
            </div>

            <div className="text-right">
              <span className="text-[10px] text-slate-400 block uppercase font-mono">Travel Window</span>
              <span className="text-sm font-black font-mono tabular-nums text-cyan-400">
                ≤ {commuteMaxMinutes} mins
              </span>
            </div>
          </div>

          <div className="space-y-1.5">
            <div className="flex items-center justify-between text-[11px] text-slate-400 font-mono tabular-nums">
              <span className="flex items-center gap-1">
                <Clock className="w-3 h-3 text-emerald-400" /> 10 mins
              </span>
              <label htmlFor="histogram-commute-slider" className="cursor-pointer">
                Scrub travel tolerance
              </label>
              <span>40 mins</span>
            </div>
            <input
              id="histogram-commute-slider"
              type="range"
              min={10}
              max={40}
              step={2}
              value={commuteMaxMinutes}
              onChange={(e) => setCommuteMaxMinutes(Number(e.target.value))}
              className="w-full h-2 bg-[#090A0F] rounded-lg appearance-none cursor-pointer accent-cyan-400 transition-[box-shadow,background-color] duration-140 focus:outline-none focus:ring-2 focus:ring-cyan-400/40"
            />
          </div>

          <div className="space-y-2">
            <div className="text-[10px] font-semibold uppercase tracking-wider text-slate-400 flex items-center justify-between">
              <span>Reachable Tech Corridors</span>
              <span className="text-cyan-400 font-mono tabular-nums">
                {CORRIDOR_COMMUTES.filter((c) => c.minutes <= commuteMaxMinutes).length} of {CORRIDOR_COMMUTES.length} active
              </span>
            </div>

            <div className="grid grid-cols-2 gap-2">
              {CORRIDOR_COMMUTES.map((c) => {
                const isReachable = c.minutes <= commuteMaxMinutes;
                const isSelected = selectedCorridor === c.id;

                return (
                  <button
                    key={c.key}
                    type="button"
                    onClick={() => onSelectCorridor(c.id)}
                    className={`p-2.5 rounded-xl border text-left transition-[background-color,border-color,color,box-shadow,transform,opacity] duration-160 ease-[var(--ease-out)] active:scale-[0.97] flex flex-col justify-between ${
                      isReachable
                        ? isSelected
                          ? 'bg-cyan-500/20 border-cyan-400/80 text-white shadow-md shadow-cyan-500/10'
                          : 'bg-[#090A0F]/90 border-white/[0.08] hover:border-white/[0.16] hover:bg-white/[0.04] text-slate-200'
                        : 'bg-[#090A0F]/40 border-white/[0.04] text-slate-500 opacity-50'
                    }`}
                  >
                    <div className="flex items-center justify-between w-full mb-1">
                      <span className="font-bold text-xs truncate">{c.name}</span>
                      <span
                        className={`text-[10px] font-mono tabular-nums px-1.5 py-0.5 rounded-md font-bold ${
                          isReachable
                            ? 'bg-cyan-950 text-cyan-300 border border-cyan-500/30'
                            : 'bg-[#11131A] text-slate-600'
                        }`}
                      >
                        {c.minutes}m
                      </span>
                    </div>

                    <div className="flex items-center justify-between text-[10px]">
                      <span className="truncate text-slate-400 text-[10px]">{c.description}</span>
                      {isReachable ? (
                        <CheckCircle2 className="w-3 h-3 text-emerald-400 shrink-0 ml-1" />
                      ) : (
                        <span className="text-[9px] font-mono tabular-nums text-slate-600 ml-1 shrink-0">
                          +{c.minutes - commuteMaxMinutes}m
                        </span>
                      )}
                    </div>
                  </button>
                );
              })}
            </div>

            {selectedCorridor !== 'all' && (
              <div className="pt-1 flex items-center justify-between">
                <span className="text-[10px] text-slate-400">
                  Filtered to <strong className="text-white">{selectedCorridor}</strong>
                </span>
                <button
                  type="button"
                  onClick={() => onSelectCorridor('all')}
                  className="text-[10px] text-cyan-400 hover:text-cyan-300 font-semibold underline active:scale-[0.97] transition-[color,transform] duration-140 ease-[var(--ease-out)]"
                >
                  Clear corridor filter
                </button>
              </div>
            )}
          </div>
        </div>
      </div>
    </div>
  );
};
