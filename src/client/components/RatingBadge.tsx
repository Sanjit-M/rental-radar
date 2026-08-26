import React from 'react';
import { RatingTier } from '../../domain/types';

interface RatingBadgeProps {
  score: number;
  tier: RatingTier;
  onClick?: () => void;
}

export const RatingBadge: React.FC<RatingBadgeProps> = ({ score, tier, onClick }) => {
  let badgeStyles = 'bg-slate-800 text-slate-300 border-slate-700';
  let glowStyle = '';

  if (score >= 90) {
    badgeStyles = 'bg-emerald-950/80 text-emerald-300 border-emerald-500/50 hover:bg-emerald-900/90';
    glowStyle = 'shadow-[0_0_15px_rgba(16,185,129,0.25)]';
  } else if (score >= 75) {
    badgeStyles = 'bg-teal-950/80 text-teal-300 border-teal-500/40 hover:bg-teal-900/80';
  } else if (score >= 55) {
    badgeStyles = 'bg-amber-950/80 text-amber-300 border-amber-500/40 hover:bg-amber-900/80';
  } else {
    badgeStyles = 'bg-rose-950/80 text-rose-300 border-rose-500/40 hover:bg-rose-900/80';
  }

  return (
    <button
      type="button"
      onClick={onClick}
      className={`inline-flex items-center gap-1.5 px-2.5 py-1 rounded-full border text-xs font-semibold cursor-pointer transition-all ${badgeStyles} ${glowStyle}`}
      title="Click to view point-by-point math audit"
    >
      <span className="text-sm font-bold font-mono">{score}</span>
      <span className="text-[10px] uppercase tracking-wider font-semibold opacity-90">{tier.split(' ')[1] || tier}</span>
    </button>
  );
};
