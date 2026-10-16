import React from 'react';
import { Compass, ShieldCheck, Users, MapPin } from 'lucide-react';
import { BANGALORE_ZONES } from '../../domain/types';
import { toast } from './ToastStack';

/** Metadata for a Bangalore tech corridor quick filter. */
export interface TechCorridor {
  readonly id: string;
  readonly label: string;
  readonly subtext: string;
}

/** Canonical 7 PTP & ORR tech corridors. */
export const BANGALORE_CORRIDORS: readonly TechCorridor[] = [
  { id: 'all', label: 'All Corridors', subtext: 'Full PTP Perimeter' },
  { id: 'Kadubeesanahalli', label: 'Kadubeesanahalli', subtext: 'Direct PTP Access' },
  { id: 'Prestige Tech Park', label: 'Prestige Tech Park', subtext: 'Back Gate & ORR' },
  { id: 'Cessna', label: 'Cessna Business Park', subtext: 'Cessna Tech Zone' },
  { id: 'Bellandur', label: 'Bellandur', subtext: 'Green Glen & EcoSpace' },
  { id: 'Marathahalli', label: 'Marathahalli', subtext: 'ORR Junction' },
  { id: 'Boganahalli', label: 'Boganahalli', subtext: 'Vaswani & Panathur' },
];

const DISPLAY_ZONES = BANGALORE_ZONES.filter((z) => z !== 'Bangalore General');

interface CorridorFilterProps {
  readonly selectedCorridor: string;
  readonly onSelectCorridor: (corridorId: string) => void;
  readonly selectedZone?: string | undefined;
  readonly onSelectZone?: ((zone: string) => void) | undefined;
  readonly zeroBrokerageOnly: boolean;
  readonly onToggleZeroBrokerage: () => void;
  readonly bachelorFriendlyOnly: boolean;
  readonly onToggleBachelorFriendly: () => void;
}

/**
 * Interactive filter strip for Bangalore Metropolitan Zones, PTP Tech Corridors,
 * and Zero-Brokerage / Bachelor-Friendly quick toggles.
 */
export const CorridorFilter: React.FC<CorridorFilterProps> = ({
  selectedCorridor,
  onSelectCorridor,
  selectedZone = 'all',
  onSelectZone,
  zeroBrokerageOnly,
  onToggleZeroBrokerage,
  bachelorFriendlyOnly,
  onToggleBachelorFriendly,
}) => {
  const handleCorridorClick = (corridor: TechCorridor) => {
    if (selectedCorridor !== corridor.id) {
      onSelectCorridor(corridor.id);
      toast.info(`Filtered to ${corridor.label} corridor`);
    }
  };

  const handleZoneClick = (zone: string) => {
    if (!onSelectZone) return;
    const nextZone = selectedZone === zone ? 'all' : zone;
    onSelectZone(nextZone);
    toast.info(
      nextZone === 'all' ? 'Showing all Bangalore zones' : `Filtered to ${nextZone}`,
    );
  };

  const handleToggleZeroBrokerage = () => {
    const next = !zeroBrokerageOnly;
    onToggleZeroBrokerage();
    toast.info(`Zero Brokerage filter ${next ? 'enabled' : 'disabled'}`);
  };

  const handleToggleBachelorFriendly = () => {
    const next = !bachelorFriendlyOnly;
    onToggleBachelorFriendly();
    toast.info(`Bachelor Friendly filter ${next ? 'enabled' : 'disabled'}`);
  };

  return (
    <div className="bg-[#11131A]/90 p-4 rounded-2xl border border-white/[0.08] space-y-3.5 shadow-lg">
      <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-2.5">
        <div className="flex items-center gap-2 text-xs font-bold text-slate-200">
          <Compass className="w-4 h-4 text-emerald-400" />
          <span>Bangalore Zones & Tech Corridors</span>
          <span className="text-[10px] text-slate-400 font-normal">
            (City-Wide + Peak Scooter Commute to PTP)
          </span>
        </div>

        <div className="flex items-center gap-2 flex-wrap">
          <button
            type="button"
            onClick={handleToggleZeroBrokerage}
            className={`flex items-center gap-1.5 px-3 py-1.5 rounded-xl text-xs font-bold border transition-[background-color,color,border-color,box-shadow,transform] duration-140 ease-[var(--ease-out)] active:scale-[0.97] ${
              zeroBrokerageOnly
                ? 'bg-emerald-500/20 text-emerald-300 border-emerald-500/50 shadow-md shadow-emerald-500/10'
                : 'bg-[#090A0F] text-slate-400 border-white/[0.08] hover:text-slate-200 hover:border-white/[0.16]'
            }`}
          >
            <ShieldCheck className="w-3.5 h-3.5 text-emerald-400" />
            <span>Zero Brokerage</span>
          </button>

          <button
            type="button"
            onClick={handleToggleBachelorFriendly}
            className={`flex items-center gap-1.5 px-3 py-1.5 rounded-xl text-xs font-bold border transition-[background-color,color,border-color,box-shadow,transform] duration-140 ease-[var(--ease-out)] active:scale-[0.97] ${
              bachelorFriendlyOnly
                ? 'bg-cyan-500/20 text-cyan-300 border-cyan-500/50 shadow-md shadow-cyan-500/10'
                : 'bg-[#090A0F] text-slate-400 border-white/[0.08] hover:text-slate-200 hover:border-white/[0.16]'
            }`}
          >
            <Users className="w-3.5 h-3.5 text-cyan-400" />
            <span>Bachelor Friendly</span>
          </button>
        </div>
      </div>

      {onSelectZone && (
        <div className="flex items-center gap-1.5 overflow-x-auto pb-1 no-scrollbar">
          <button
            type="button"
            onClick={() => handleZoneClick('all')}
            className={`shrink-0 inline-flex items-center gap-1.5 px-2.5 py-1 rounded-lg text-[11px] font-semibold border transition-[background-color,color,border-color,transform] duration-140 ease-[var(--ease-out)] active:scale-[0.97] ${
              selectedZone === 'all'
                ? 'bg-cyan-500/20 text-cyan-300 border-cyan-500/50'
                : 'bg-[#090A0F] text-slate-400 border-white/[0.08] hover:text-slate-200 hover:border-white/[0.16]'
            }`}
          >
            <MapPin className="w-3 h-3 text-cyan-400" />
            <span>All Bangalore Zones</span>
          </button>
          {DISPLAY_ZONES.map((zone) => {
            const active = selectedZone === zone;
            return (
              <button
                key={zone}
                type="button"
                onClick={() => handleZoneClick(zone)}
                className={`shrink-0 inline-flex items-center gap-1 px-2.5 py-1 rounded-lg text-[11px] font-semibold border transition-[background-color,color,border-color,transform] duration-140 ease-[var(--ease-out)] active:scale-[0.97] ${
                  active
                    ? 'bg-cyan-500/20 text-cyan-200 border-cyan-400/60'
                    : 'bg-[#090A0F] text-slate-400 border-white/[0.08] hover:text-slate-200 hover:border-white/[0.16]'
                }`}
              >
                <span>{zone}</span>
              </button>
            );
          })}
        </div>
      )}

      <div className="flex items-center gap-2 overflow-x-auto pb-1 pt-0.5 no-scrollbar">
        {BANGALORE_CORRIDORS.map((corridor) => {
          const isSelected = selectedCorridor === corridor.id;
          return (
            <button
              key={corridor.id}
              type="button"
              onClick={() => handleCorridorClick(corridor)}
              className={`shrink-0 flex flex-col items-start px-3 py-1.5 rounded-xl text-left border transition-[background-color,color,border-color,box-shadow,transform] duration-140 ease-[var(--ease-out)] active:scale-[0.97] ${
                isSelected
                  ? 'bg-emerald-500 text-slate-950 border-emerald-400 font-bold shadow-md shadow-emerald-500/20'
                  : 'bg-[#090A0F]/90 text-slate-300 border-white/[0.08] hover:bg-white/[0.04] hover:border-white/[0.16]'
              }`}
            >
              <span className="text-xs font-bold leading-tight">{corridor.label}</span>
              <span
                className={`text-[10px] leading-tight ${
                  isSelected ? 'text-slate-900 font-medium' : 'text-slate-400'
                }`}
              >
                {corridor.subtext}
              </span>
            </button>
          );
        })}
      </div>
    </div>
  );
};
