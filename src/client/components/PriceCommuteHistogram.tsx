import React, { useState, useMemo } from 'react';
import { RentalListing } from '../../domain/types';
import {
  IndianRupee,
  Clock,
  Bike,
  CheckCircle2,
  Sparkles,
  Compass,
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
  readonly id: string;
  readonly name: string;
  readonly minutes: number;
  readonly description: string;
}

const CORRIDOR_COMMUTES: readonly CorridorCommuteProfile[] = [
  { id: 'Cessna', name: 'Cessna Business Park', minutes: 10, description: 'Direct ORR tech hub access' },
  { id: 'Kadubeesanahalli', name: 'Kadubeesanahalli', minutes: 12, description: 'PTP primary gateway' },
  { id: 'Bellandur', name: 'Green Glen / Bellandur', minutes: 15, description: 'EcoSpace & Green Glen' },
  { id: 'Bellandur', name: 'Bellandur Outer Ring', minutes: 18, description: 'Central ORR corridor' },
  { id: 'Boganahalli', name: 'Boganahalli / Panathur', minutes: 20, description: 'Vaswani & railway bypass' },
  { id: 'Marathahalli', name: 'Marathahalli Junction', minutes: 24, description: 'ORR north arterial junction' },
];

export const PriceCommuteHistogram: React.FC<PriceCommuteHistogramProps> = ({
  listings,
  maxRent,
  onMaxRentChange,
  selectedCorridor,
  onSelectCorridor,
}) => {
  const [commuteMaxMinutes, setCommuteMaxMinutes] = useState<number>(20);
  const [hoveredBucketId, setHoveredBucketId] = useState<string | null>(null);

  // Compute 6 rent frequency buckets
  const buckets = useMemo<PriceBucket[]>(() => {
    const rawBuckets = [
      { id: 'b1', label: '< ₹20k', min: 0, max: 20000, targetRent: 20000, subtext: 'Budget flatshare' },
      { id: 'b2', label: '₹20k–₹26k', min: 20001, max: 26000, targetRent: 26000, subtext: '1 BHK sweet spot' },
      { id: 'b3', label: '₹26k–₹32k', min: 26001, max: 32000, targetRent: 32000, subtext: 'Furnished 1/2 BHK' },
      { id: 'b4', label: '₹32k–₹38k', min: 32001, max: 38000, targetRent: 38000, subtext: 'Standard 2 BHK' },
      { id: 'b5', label: '₹38k–₹45k', min: 38001, max: 45000, targetRent: 45000, subtext: 'Gated 2/3 BHK' },
      { id: 'b6', label: '> ₹45k', min: 45001, max: 1000000, targetRent: 60000, subtext: 'Executive suites' },
    ];

    const counts: number[] = rawBuckets.map((b) => {
      const matchCount = listings.filter((l) => {
        const rent = l.entities.rent;
        if (!rent) return false;
        return rent >= b.min && rent <= b.max;
      }).length;
      return matchCount;
    });

    const totalValid = listings.filter((l) => Boolean(l.entities.rent)).length || 1;
    const maxCount = Math.max(...counts, 1);

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
    <div className="glass-panel p-5 rounded-3xl border border-slate-800 space-y-6 shadow-2xl relative overflow-hidden">
      {/* Background ambient gradient glow */}
      <div className="absolute -top-24 -right-24 w-72 h-72 bg-emerald-500/10 rounded-full blur-3xl pointer-events-none" />
      <div className="absolute -bottom-24 -left-24 w-72 h-72 bg-cyan-500/10 rounded-full blur-3xl pointer-events-none" />

      {/* Grid: 2 Interactive Explorers */}
      <div className="grid grid-cols-1 lg:grid-cols-12 gap-6 relative z-10">
        {/* Left Column (7 cols): Wattenberger/Ciechanowski SVG Price Distribution */}
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
                  Interactive distribution synced with live listings
                </p>
              </div>
            </div>

            {/* Current Ceiling Badge */}
            <div className="text-right">
              <span className="text-[10px] text-slate-400 block uppercase font-mono">Max Budget</span>
              <span className="text-sm font-black font-mono text-emerald-400">
                ₹{maxRent.toLocaleString('en-IN')}
              </span>
            </div>
          </div>

          {/* SVG Bar Chart Visualization */}
          <div className="bg-slate-900/80 rounded-2xl p-4 border border-slate-800/80 backdrop-blur-sm">
            <div className="h-32 flex items-end justify-between gap-2 pt-2 px-1 pb-1">
              {buckets.map((b) => {
                const isUnderCeiling = b.min <= maxRent;
                const isHovered = hoveredBucketId === b.id;
                const barHeightPct = Math.max(8, (b.count / maxBucketCount) * 100);

                return (
                  <div
                    key={b.id}
                    onMouseEnter={() => setHoveredBucketId(b.id)}
                    onMouseLeave={() => setHoveredBucketId(null)}
                    onClick={() => onMaxRentChange(b.targetRent)}
                    className="flex-1 flex flex-col items-center justify-end h-full group cursor-pointer"
                  >
                    {/* Count Callout on Hover */}
                    <div
                      className={`text-[10px] font-mono font-bold mb-1.5 transition-all duration-150 ${
                        isHovered
                          ? 'text-cyan-300 scale-110'
                          : isUnderCeiling
                          ? 'text-slate-400 group-hover:text-white'
                          : 'text-slate-600'
                      }`}
                    >
                      {b.count}
                    </div>

                    {/* Bar Pill */}
                    <div className="w-full bg-slate-950/60 rounded-lg p-0.5 h-full flex items-end">
                      <div
                        style={{ height: `${barHeightPct}%` }}
                        className={`w-full rounded-md transition-all duration-300 relative ${
                          isUnderCeiling
                            ? isHovered
                              ? 'bg-gradient-to-t from-emerald-500 to-cyan-400 shadow-lg shadow-emerald-500/30'
                              : 'bg-gradient-to-t from-emerald-600 to-emerald-400'
                            : 'bg-slate-800/60 border border-slate-700/40 opacity-40'
                        }`}
                      >
                        {/* Shimmer top cap */}
                        {isUnderCeiling && (
                          <div className="absolute top-0 inset-x-0 h-1 bg-white/40 rounded-t-md" />
                        )}
                      </div>
                    </div>

                    {/* Bucket Label */}
                    <div
                      className={`text-[9px] font-mono mt-2 truncate max-w-full transition-colors ${
                        isUnderCeiling ? 'text-slate-300 font-semibold' : 'text-slate-600'
                      }`}
                    >
                      {b.label}
                    </div>
                  </div>
                );
              })}
            </div>

            {/* Hover Explainer strip */}
            <div className="mt-2 pt-2 border-t border-slate-800 flex items-center justify-between text-[11px] text-slate-400">
              {activeBucket ? (
                <div className="flex items-center gap-1.5 text-cyan-300 font-medium">
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

          {/* Interactive Range Slider */}
          <div className="space-y-1.5 pt-1">
            <div className="flex items-center justify-between text-[11px] text-slate-400 font-mono">
              <span>₹15,000</span>
              <span className="text-emerald-400 font-bold">Slide to adjust budget ceiling</span>
              <span>₹60,000+</span>
            </div>
            <input
              type="range"
              min={15000}
              max={60000}
              step={1000}
              value={maxRent}
              onChange={(e) => onMaxRentChange(Number(e.target.value))}
              className="w-full h-2 bg-slate-800 rounded-lg appearance-none cursor-pointer accent-emerald-400 transition-all focus:outline-none focus:ring-2 focus:ring-emerald-400/40"
            />
          </div>
        </div>

        {/* Right Column (5 cols): Scooter Commute to PTP Scrubber */}
        <div className="lg:col-span-5 space-y-4 lg:border-l lg:border-slate-800/80 lg:pl-6">
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

            {/* Current Commute Window Tag */}
            <div className="text-right">
              <span className="text-[10px] text-slate-400 block uppercase font-mono">Travel Window</span>
              <span className="text-sm font-black font-mono text-cyan-400">
                ≤ {commuteMaxMinutes} mins
              </span>
            </div>
          </div>

          {/* Scrubber Range Slider */}
          <div className="space-y-1.5">
            <div className="flex items-center justify-between text-[11px] text-slate-400 font-mono">
              <span className="flex items-center gap-1">
                <Clock className="w-3 h-3 text-emerald-400" /> 10 mins
              </span>
              <span>Scrub travel tolerance</span>
              <span>40 mins</span>
            </div>
            <input
              type="range"
              min={10}
              max={40}
              step={2}
              value={commuteMaxMinutes}
              onChange={(e) => setCommuteMaxMinutes(Number(e.target.value))}
              className="w-full h-2 bg-slate-800 rounded-lg appearance-none cursor-pointer accent-cyan-400 transition-all focus:outline-none focus:ring-2 focus:ring-cyan-400/40"
            />
          </div>

          {/* Reachable Corridors Pill Grid */}
          <div className="space-y-2">
            <div className="text-[10px] font-semibold uppercase tracking-wider text-slate-400 flex items-center justify-between">
              <span>Reachable Tech Corridors</span>
              <span className="text-cyan-400 font-mono">
                {CORRIDOR_COMMUTES.filter((c) => c.minutes <= commuteMaxMinutes).length} of {CORRIDOR_COMMUTES.length} active
              </span>
            </div>

            <div className="grid grid-cols-2 gap-2">
              {CORRIDOR_COMMUTES.map((c, idx) => {
                const isReachable = c.minutes <= commuteMaxMinutes;
                const isSelected = selectedCorridor === c.id;

                return (
                  <button
                    key={`${c.id}-${idx}`}
                    type="button"
                    onClick={() => onSelectCorridor(c.id)}
                    className={`p-2.5 rounded-xl border text-left transition-all duration-200 flex flex-col justify-between ${
                      isReachable
                        ? isSelected
                          ? 'bg-cyan-500/20 border-cyan-400/80 text-white shadow-md shadow-cyan-500/10'
                          : 'bg-slate-900/90 border-slate-700/80 hover:border-cyan-500/50 hover:bg-slate-800/70 text-slate-200'
                        : 'bg-slate-950/40 border-slate-800/40 text-slate-500 opacity-50'
                    }`}
                  >
                    <div className="flex items-center justify-between w-full mb-1">
                      <span className="font-bold text-xs truncate">{c.name}</span>
                      <span
                        className={`text-[10px] font-mono px-1.5 py-0.5 rounded-md font-bold ${
                          isReachable
                            ? 'bg-cyan-950 text-cyan-300 border border-cyan-500/30'
                            : 'bg-slate-900 text-slate-600'
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
                        <span className="text-[9px] font-mono text-slate-600 ml-1 shrink-0">
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
                  className="text-[10px] text-cyan-400 hover:text-cyan-300 font-semibold underline"
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
