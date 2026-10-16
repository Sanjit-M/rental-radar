import React from 'react';
import type { RatingTier } from '../../domain/types';

interface RatingBadgeProps {
  readonly score: number;
  readonly tier: RatingTier;
  readonly onClick?: (() => void) | undefined;
}

/**
 * Interactive score badge with tabular-nums formatting and tactile press response.
 */
export const RatingBadge: React.FC<RatingBadgeProps> = ({ score, tier, onClick }) => {
  let badgeStyles = 'bg-[#11131A] text-slate-300 border-white/[0.08] hover:border-white/[0.16]';
  let glowStyle = '';

  if (score >= 90) {
    badgeStyles = 'bg-emerald-950/80 text-emerald-300 border-emerald-500/40 hover:bg-emerald-900/90 hover:border-emerald-400/60';
    glowStyle = 'shadow-[0_0_15px_rgba(16,185,129,0.2)]';
  } else if (score >= 70) {
    badgeStyles = 'bg-teal-950/80 text-teal-300 border-teal-500/35 hover:bg-teal-900/80';
  } else if (score >= 45) {
    badgeStyles = 'bg-amber-950/80 text-amber-300 border-amber-500/35 hover:bg-amber-900/80';
  } else {
    badgeStyles = 'bg-rose-950/80 text-rose-300 border-rose-500/35 hover:bg-rose-900/80';
  }

  const shortTier = tier.includes(' ') ? (tier.split(' ')[1] ?? tier) : tier;

  return (
    <button
      type="button"
      onClick={onClick}
      aria-label={`Score ${score} (${shortTier}) — view breakdown`}
      className={`inline-flex items-center gap-1.5 px-2.5 py-1 rounded-full border text-xs font-semibold cursor-pointer transition-[background-color,border-color,box-shadow,transform] duration-140 ease-[var(--ease-out)] active:scale-[0.97] ${badgeStyles} ${glowStyle}`}
      title="Click to view 14-point math audit"
    >
      <span className="text-sm font-bold font-mono tabular-nums">{score}</span>
      <span className="text-[10px] uppercase tracking-wider font-semibold opacity-90">{shortTier}</span>
    </button>
  );
};
