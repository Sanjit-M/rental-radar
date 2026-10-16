import React from 'react';
import type { CommuteWindow } from '../../domain/types';
import { Bike, AlertTriangle } from 'lucide-react';

interface CommutePillProps {
  readonly commute: CommuteWindow;
}

/**
 * Displays simulated peak scooter commute metrics with tabular-nums precision.
 */
export const CommutePill: React.FC<CommutePillProps> = ({ commute }) => {
  return (
    <div className="flex flex-col gap-1">
      <div className="inline-flex items-center gap-1.5 px-2.5 py-1 rounded-lg bg-[#090A0F]/90 border border-white/[0.08] text-xs text-slate-200">
        <Bike className="w-3.5 h-3.5 text-cyan-400 shrink-0" />
        <span className="font-semibold text-white font-mono tabular-nums">{commute.twoWayAvgPeakMins}m</span>
        <span className="text-[11px] text-slate-400">avg peak</span>
        <span className="text-slate-600">|</span>
        <span className="text-[11px] text-slate-400 font-mono tabular-nums">{commute.distanceKm} km</span>
      </div>

      <div className="flex items-center gap-2 text-[10px] text-slate-400 font-mono tabular-nums px-1">
        <span>11am: <strong className="text-slate-300 font-semibold">{commute.inboundMins}m</strong></span>
        <span>•</span>
        <span>5pm: <strong className="text-slate-300 font-semibold">{commute.outboundMins}m</strong></span>
      </div>

      {commute.hasPanathurUnderpassBottleneck && (
        <div className="flex items-center gap-1 text-[10px] text-amber-400 font-medium px-1">
          <AlertTriangle className="w-3 h-3 shrink-0" />
          <span>Panathur Underpass choke point</span>
        </div>
      )}
    </div>
  );
};
