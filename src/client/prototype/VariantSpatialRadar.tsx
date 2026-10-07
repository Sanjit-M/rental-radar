import React, { useState, useMemo } from 'react';
import { RentalListing, UserListingStatus } from '../../domain/types';
import { PROTOTYPE_LISTINGS } from './mockData';
import {
  Compass,
  Bike,
  Clock,
  Sparkles,
  MapPin,
  AlertTriangle,
  IndianRupee,
  MessageCircle,
  Phone,
  ExternalLink,
  ChevronRight,
  ShieldCheck,
  CheckCircle2,
  Sliders,
} from 'lucide-react';

interface VariantSpatialRadarProps {
  readonly listings?: readonly RentalListing[] | undefined;
  readonly onStatusChange?: ((id: number, status: UserListingStatus) => void) | undefined;
  readonly replayKey?: number | undefined;
}

interface RadarCorridorPoint {
  readonly id: string;
  readonly name: string;
  readonly angleDeg: number;
  readonly timeMins: number;
  readonly distanceKm: number;
  readonly hasBottleneck?: boolean;
}

const RADAR_CORRIDORS: readonly RadarCorridorPoint[] = [
  { id: 'Cessna', name: 'Cessna Tech Zone', angleDeg: 340, timeMins: 10, distanceKm: 1.2 },
  { id: 'Kadubeesanahalli', name: 'Kadubeesanahalli', angleDeg: 30, timeMins: 11, distanceKm: 0.9 },
  { id: 'Bellandur', name: 'Bellandur / EcoSpace', angleDeg: 120, timeMins: 16, distanceKm: 2.8 },
  { id: 'Panathur', name: 'Panathur Balagere', angleDeg: 210, timeMins: 22, distanceKm: 4.1, hasBottleneck: true },
  { id: 'Marathahalli', name: 'Marathahalli ORR', angleDeg: 290, timeMins: 24, distanceKm: 3.9 },
  { id: 'Sarjapur', name: 'Sarjapur Doddakannelli', angleDeg: 165, timeMins: 32, distanceKm: 6.2 },
];

export const VariantSpatialRadar: React.FC<VariantSpatialRadarProps> = ({
  listings = PROTOTYPE_LISTINGS,
  onStatusChange,
}) => {
  const activePool = listings.length > 0 ? listings : PROTOTYPE_LISTINGS;

  // Direct Manipulation Controls
  const [targetCommuteMins, setTargetCommuteMins] = useState<number>(20); // 10m to 40m
  const [minRent, setMinRent] = useState<number>(15000);
  const [maxRent, setMaxRent] = useState<number>(45000);
  const [selectedCorridorId, setSelectedCorridorId] = useState<string>('all');
  const [activeListingModal, setActiveListingModal] = useState<RentalListing | null>(null);

  // Compute live rent histogram data
  const histogramBuckets = useMemo(() => {
    const buckets = [
      { id: 'b1', label: '15-20k', min: 15000, max: 20000 },
      { id: 'b2', label: '20-25k', min: 20000, max: 25000 },
      { id: 'b3', label: '25-30k', min: 25000, max: 30000 },
      { id: 'b4', label: '30-38k', min: 30000, max: 38000 },
      { id: 'b5', label: '38k+', min: 38000, max: 60000 },
    ];

    return buckets.map((b) => {
      const count = activePool.filter((l) => {
        const r = l.entities.rent ?? 0;
        return r >= b.min && r < b.max;
      }).length;
      const inRange = b.min >= minRent && b.max <= maxRent;
      return { ...b, count, inRange };
    });
  }, [activePool, minRent, maxRent]);

  // Filter listings based on interactive physics parameters
  const filteredListings = useMemo(() => {
    return activePool.filter((l) => {
      // Commute threshold
      if (l.commute.twoWayAvgPeakMins > targetCommuteMins) return false;

      // Rent bounds
      const rent = l.entities.rent ?? 0;
      if (rent < minRent || rent > maxRent) return false;

      // Selected corridor
      if (selectedCorridorId !== 'all') {
        const text = `${l.location} ${l.landmark ?? ''}`.toLowerCase();
        if (!text.includes(selectedCorridorId.toLowerCase())) return false;
      }

      return true;
    });
  }, [activePool, targetCommuteMins, minRent, maxRent, selectedCorridorId]);

  // SVG Radar Dimensions
  const radarSize = 280;
  const radarCenter = radarSize / 2;
  const maxRadarRadius = 120; // 40 minutes maps to 120px

  // Convert minutes to SVG radius
  const minsToRadius = (mins: number) => {
    return (Math.min(mins, 40) / 40) * maxRadarRadius;
  };

  const currentScrubberRadius = minsToRadius(targetCommuteMins);

  return (
    <div className="relative w-full h-full flex flex-col bg-slate-950 text-slate-100 overflow-hidden font-sans select-none pb-28">
      {/* Sticky Top Direct Manipulation Commute Scrubber */}
      <div className="sticky top-0 z-30 bg-slate-950/95 backdrop-blur-xl border-b border-slate-800/80 px-4 pt-3 pb-3 shadow-xl">
        <div className="flex items-center justify-between gap-2 mb-2">
          <div className="flex items-center gap-2">
            <div className="w-7 h-7 rounded-lg bg-cyan-500/20 border border-cyan-500/40 flex items-center justify-center">
              <Bike className="w-4 h-4 text-cyan-400" />
            </div>
            <div>
              <div className="flex items-center gap-1.5">
                <span className="text-xs font-black text-white">Spatial Radar</span>
                <span className="text-[9px] uppercase font-bold tracking-wider px-1.5 py-0.2 rounded-full bg-cyan-500/20 text-cyan-300 border border-cyan-500/40">
                  Travel Physics
                </span>
              </div>
              <p className="text-[10px] text-slate-400">Prestige Tech Park (PTP) Commute Scrubber</p>
            </div>
          </div>

          <div className="text-right">
            <span className="text-[10px] text-slate-400 font-mono">Max Travel Time</span>
            <div className="text-sm font-black font-mono text-cyan-400 flex items-center gap-1 justify-end">
              <span>{targetCommuteMins} mins</span>
            </div>
          </div>
        </div>

        {/* Interactive Scooter Scrubber Bar */}
        <div className="relative mt-2 mb-1">
          <div className="relative flex items-center">
            <input
              type="range"
              min={10}
              max={40}
              step={1}
              value={targetCommuteMins}
              onChange={(e) => setTargetCommuteMins(Number(e.target.value))}
              className="w-full h-2 bg-slate-800 rounded-lg appearance-none cursor-pointer accent-cyan-400"
            />
          </div>

          <div className="flex justify-between items-center text-[10px] text-slate-400 font-mono mt-1">
            <span>🛴 10m (Walk / ORR)</span>
            <span>25m (Bellandur)</span>
            <span>40m (Perimeter)</span>
          </div>
        </div>

        {/* Peak Commute Physics Readout */}
        <div className="mt-1 flex items-center justify-between text-[10px] font-mono bg-slate-900/80 px-2.5 py-1 rounded-lg border border-slate-800 text-slate-300">
          <span>🌅 11 AM Inbound: <strong>{Math.round(targetCommuteMins * 0.95)}m</strong></span>
          <span>🌆 5 PM Outbound (1.65x): <strong>{Math.round(targetCommuteMins * 1.35)}m</strong></span>
        </div>
      </div>

      {/* Main Scrollable Body */}
      <div className="flex-1 overflow-y-auto px-4 py-3 space-y-4">
        {/* Corridor Reachability Ring (Direct Manipulation Radar) */}
        <div className="p-4 rounded-3xl bg-slate-900/90 border border-slate-800 shadow-2xl flex flex-col items-center">
          <div className="w-full flex items-center justify-between text-xs font-bold text-slate-300 mb-2">
            <div className="flex items-center gap-1.5">
              <Compass className="w-4 h-4 text-emerald-400" />
              <span>Corridor Reachability Ring</span>
            </div>
            {selectedCorridorId !== 'all' && (
              <button
                type="button"
                onClick={() => setSelectedCorridorId('all')}
                className="text-[10px] text-cyan-400 hover:underline"
              >
                Reset Corridor Filter
              </button>
            )}
          </div>

          {/* SVG Radial Visualizer */}
          <div className="relative flex items-center justify-center">
            <svg
              width={radarSize}
              height={radarSize}
              className="overflow-visible"
              viewBox={`0 0 ${radarSize} ${radarSize}`}
            >
              <defs>
                <radialGradient id="radarPulse" cx="50%" cy="50%" r="50%">
                  <stop offset="0%" stopColor="#06b6d4" stopOpacity="0.25" />
                  <stop offset="100%" stopColor="#06b6d4" stopOpacity="0.0" />
                </radialGradient>
              </defs>

              {/* Concentric Commute Rings (10m, 20m, 30m, 40m) */}
              {[10, 20, 30, 40].map((mins) => {
                const r = minsToRadius(mins);
                return (
                  <g key={`ring-${mins}`}>
                    <circle
                      cx={radarCenter}
                      cy={radarCenter}
                      r={r}
                      fill="none"
                      stroke="rgba(255, 255, 255, 0.08)"
                      strokeDasharray="3 3"
                    />
                    <text
                      x={radarCenter + 2}
                      y={radarCenter - r + 9}
                      fill="rgba(148, 163, 184, 0.6)"
                      fontSize="8"
                      fontFamily="monospace"
                    >
                      {mins}m
                    </text>
                  </g>
                );
              })}

              {/* Dynamic Target Travel Envelope Circle */}
              <circle
                cx={radarCenter}
                cy={radarCenter}
                r={currentScrubberRadius}
                fill="url(#radarPulse)"
                stroke="#06b6d4"
                strokeWidth="1.5"
                strokeOpacity="0.8"
                className="transition-all duration-150"
              />

              {/* Center Hub: Prestige Tech Park */}
              <circle cx={radarCenter} cy={radarCenter} r="7" fill="#10b981" />
              <circle cx={radarCenter} cy={radarCenter} r="14" fill="#10b981" fillOpacity="0.2" />
              <text
                x={radarCenter}
                y={radarCenter + 18}
                textAnchor="middle"
                fill="#ffffff"
                fontSize="9"
                fontWeight="bold"
              >
                PTP (0m)
              </text>

              {/* Corridor Node Points */}
              {RADAR_CORRIDORS.map((corridor) => {
                const rad = (corridor.angleDeg * Math.PI) / 180;
                const dist = minsToRadius(corridor.timeMins);
                const cx = radarCenter + dist * Math.cos(rad);
                const cy = radarCenter + dist * Math.sin(rad);

                const isWithinBudget = corridor.timeMins <= targetCommuteMins;
                const isSelected = selectedCorridorId === corridor.id;
                const excessDelta = corridor.timeMins - targetCommuteMins;

                return (
                  <g
                    key={corridor.id}
                    className="cursor-pointer"
                    onClick={() => setSelectedCorridorId(isSelected ? 'all' : corridor.id)}
                  >
                    {/* Pulsing ring if selected */}
                    {isSelected && (
                      <circle
                        cx={cx}
                        cy={cy}
                        r="12"
                        fill="none"
                        stroke="#38bdf8"
                        strokeWidth="2"
                        opacity="0.8"
                      />
                    )}

                    {/* Node Dot */}
                    <circle
                      cx={cx}
                      cy={cy}
                      r="5.5"
                      fill={isWithinBudget ? '#10b981' : '#f43f5e'}
                      stroke="#0f172a"
                      strokeWidth="1.5"
                    />

                    {/* Node Label */}
                    <text
                      x={cx}
                      y={cy - 8}
                      textAnchor="middle"
                      fill={isSelected ? '#38bdf8' : isWithinBudget ? '#e2e8f0' : '#94a3b8'}
                      fontSize="9"
                      fontWeight={isSelected ? 'bold' : 'normal'}
                    >
                      {corridor.id}
                    </text>

                    {/* Reachability Badge: Either ✓ or +Xm */}
                    <text
                      x={cx}
                      y={cy + 14}
                      textAnchor="middle"
                      fill={isWithinBudget ? '#34d399' : '#fb7185'}
                      fontSize="8"
                      fontFamily="monospace"
                      fontWeight="bold"
                    >
                      {isWithinBudget ? `${corridor.timeMins}m ✓` : `+${excessDelta}m`}
                    </text>
                  </g>
                );
              })}
            </svg>
          </div>

          <div className="w-full flex items-center justify-between text-[11px] text-slate-400 mt-2 px-2 pt-2 border-t border-slate-800/80">
            <span className="flex items-center gap-1.5">
              <span className="w-2 h-2 rounded-full bg-emerald-400 inline-block" /> In Target Travel Time
            </span>
            <span className="flex items-center gap-1.5">
              <span className="w-2 h-2 rounded-full bg-rose-400 inline-block" /> Excess Commute Delta
            </span>
          </div>
        </div>

        {/* Live Rent Frequency Histogram with Draggable Thumb Range */}
        <div className="p-4 rounded-3xl bg-slate-900/90 border border-slate-800 shadow-2xl space-y-3">
          <div className="flex items-center justify-between text-xs">
            <div className="flex items-center gap-1.5 font-bold text-slate-300">
              <IndianRupee className="w-4 h-4 text-emerald-400" />
              <span>Live Rent Frequency Histogram</span>
            </div>
            <div className="text-[11px] font-mono text-emerald-400 font-bold">
              ₹{(minRent / 1000).toFixed(0)}k – ₹{(maxRent / 1000).toFixed(0)}k
            </div>
          </div>

          {/* Histogram Bar Chart */}
          <div className="h-20 flex items-end gap-2 pt-2 pb-1 border-b border-slate-800">
            {histogramBuckets.map((bucket) => {
              const heightPct = Math.max((bucket.count / Math.max(activePool.length, 1)) * 100, 15);
              return (
                <div key={bucket.id} className="flex-1 flex flex-col items-center gap-1 h-full justify-end">
                  <div
                    className={`w-full rounded-t-lg transition-all duration-200 ${
                      bucket.inRange ? 'bg-emerald-500 shadow-lg shadow-emerald-500/20' : 'bg-slate-800 opacity-40'
                    }`}
                    style={{ height: `${heightPct}%` }}
                  />
                  <span className="text-[9px] font-mono text-slate-400">{bucket.label}</span>
                </div>
              );
            })}
          </div>

          {/* Interactive Range Scrubber */}
          <div className="space-y-1.5 pt-1">
            <div className="flex items-center justify-between text-[10px] text-slate-400">
              <span>Budget Floor: ₹{minRent.toLocaleString('en-IN')}</span>
              <span>Budget Ceiling: ₹{maxRent.toLocaleString('en-IN')}</span>
            </div>
            <input
              type="range"
              min={15000}
              max={60000}
              step={2500}
              value={maxRent}
              onChange={(e) => setMaxRent(Number(e.target.value))}
              className="w-full accent-emerald-500"
            />
          </div>
        </div>

        {/* 4px Grid-Snapped Cards Feed */}
        <div className="space-y-3">
          <div className="flex items-center justify-between px-1">
            <span className="text-xs font-bold text-slate-400 uppercase tracking-wider">
              Grid-Snapped Matches ({filteredListings.length})
            </span>
            <span className="text-[10px] text-slate-500 font-mono">4px Spatial Cadence</span>
          </div>

          {filteredListings.length === 0 ? (
            <div className="p-8 text-center bg-slate-900/60 rounded-3xl border border-slate-800 text-slate-400 text-xs">
              No listings match the current commute budget and rent range. Scrub the slider above to expand your reach.
            </div>
          ) : (
            filteredListings.map((listing) => (
              <article
                key={listing.id}
                className="p-4 rounded-2xl bg-slate-900/90 border border-slate-800 hover:border-slate-700 transition-colors shadow-lg space-y-2.5"
              >
                {/* Header: Title & Rent */}
                <div className="flex items-start justify-between gap-2">
                  <div>
                    <h3 className="text-sm font-bold text-white line-clamp-1">
                      {listing.entities.societyName || listing.location}
                    </h3>
                    <div className="flex items-center gap-1 text-[11px] text-slate-400 mt-0.5">
                      <MapPin className="w-3 h-3 text-cyan-400" />
                      <span>{listing.location}</span>
                      <span className="text-slate-600">•</span>
                      <span>{listing.bhkType}</span>
                    </div>
                  </div>

                  <div className="text-right shrink-0">
                    <div className="text-base font-black font-mono text-white">
                      ₹{listing.entities.rent?.toLocaleString('en-IN')}
                    </div>
                    <span className="text-[10px] text-slate-400 font-mono">
                      Dep: ₹{listing.entities.deposit ? (listing.entities.deposit / 1000).toFixed(0) + 'k' : '—'}
                    </span>
                  </div>
                </div>

                {/* Commute Delta Pill */}
                <div className="flex items-center gap-2 flex-wrap">
                  <div className="inline-flex items-center gap-1.5 px-2.5 py-1 rounded-xl bg-cyan-950/60 border border-cyan-500/30 text-xs text-cyan-300 font-mono">
                    <Bike className="w-3.5 h-3.5 text-cyan-400" />
                    <span>{listing.commute.twoWayAvgPeakMins}m to PTP Gate 1</span>
                    <span className="text-slate-500">({listing.commute.distanceKm} km)</span>
                  </div>

                  {listing.commute.hasPanathurUnderpassBottleneck && (
                    <div className="inline-flex items-center gap-1 px-2 py-0.5 rounded-lg bg-rose-950/60 border border-rose-500/30 text-[10px] text-rose-300 font-medium">
                      <AlertTriangle className="w-3 h-3" />
                      <span>Panathur Bottleneck</span>
                    </div>
                  )}

                  {!listing.entities.isBrokerage && (
                    <div className="inline-flex items-center gap-1 px-2 py-0.5 rounded-lg bg-emerald-950/60 border border-emerald-500/30 text-[10px] text-emerald-300 font-medium">
                      <ShieldCheck className="w-3 h-3" />
                      <span>0% Brokerage</span>
                    </div>
                  )}
                </div>

                <p className="text-xs text-slate-300 line-clamp-2 leading-relaxed">
                  {listing.summary || listing.rawText}
                </p>

                {/* 4px Snapped Action Bar */}
                <div className="flex items-center gap-2 pt-1 border-t border-slate-800/80">
                  <a
                    href={`https://wa.me/91${listing.entities.contactPhone || '9845019823'}?text=${encodeURIComponent(
                      `Hi, I'm interested in your listing at ${listing.location} (${listing.entities.societyName ?? ''}).`
                    )}`}
                    target="_blank"
                    rel="noreferrer"
                    className="flex-1 py-2 rounded-xl bg-emerald-600 hover:bg-emerald-500 text-white font-bold text-xs flex items-center justify-center gap-1.5 active:scale-95 transition-transform"
                  >
                    <MessageCircle className="w-3.5 h-3.5" />
                    <span>WhatsApp</span>
                  </a>

                  <a
                    href={`tel:${listing.entities.contactPhone || '9845019823'}`}
                    className="p-2 rounded-xl bg-slate-800 hover:bg-slate-700 text-slate-300 border border-slate-700 active:scale-95 transition-transform"
                    title="Call Landlord"
                  >
                    <Phone className="w-4 h-4" />
                  </a>

                  <a
                    href={listing.postUrl}
                    target="_blank"
                    rel="noreferrer"
                    className="p-2 rounded-xl bg-slate-800 hover:bg-slate-700 text-slate-300 border border-slate-700 active:scale-95 transition-transform"
                    title="View FB Post"
                  >
                    <ExternalLink className="w-4 h-4" />
                  </a>
                </div>
              </article>
            ))
          )}
        </div>
      </div>
    </div>
  );
};
