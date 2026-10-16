import React, { useEffect, useRef } from 'react';
import type { RentalListing } from '../../domain/types';
import { X, CheckCircle2, XCircle } from 'lucide-react';

interface ScoreBreakdownModalProps {
  readonly listing: RentalListing | null;
  readonly onClose: () => void;
}

/**
 * Displays the complete 14-point mathematical score breakdown for a listing.
 */
export const ScoreBreakdownModal: React.FC<ScoreBreakdownModalProps> = ({ listing, onClose }) => {
  const modalRef = useRef<HTMLDivElement>(null);
  const previousActiveElementRef = useRef<HTMLElement | null>(null);

  useEffect(() => {
    if (!listing) return;

    if (document.activeElement instanceof HTMLElement) {
      previousActiveElementRef.current = document.activeElement;
    }

    const scrollbarWidth = window.innerWidth - document.documentElement.clientWidth;
    const originalOverflow = document.body.style.overflow;
    const originalPaddingRight = document.body.style.paddingRight;

    document.body.style.overflow = 'hidden';
    if (scrollbarWidth > 0) {
      document.body.style.paddingRight = `${scrollbarWidth}px`;
    }

    const focusTimer = setTimeout(() => {
      const focusable = modalRef.current?.querySelectorAll<HTMLElement>(
        'button, [href], input, select, textarea, [tabindex]:not([tabindex="-1"])',
      );
      if (focusable && focusable.length > 0) {
        focusable[0]?.focus();
      }
    }, 20);

    const handleKeyDown = (e: KeyboardEvent) => {
      if (e.key === 'Escape') {
        e.preventDefault();
        onClose();
        return;
      }

      if (e.key === 'Tab') {
        const focusable = modalRef.current?.querySelectorAll<HTMLElement>(
          'button, [href], input, select, textarea, [tabindex]:not([tabindex="-1"])',
        );
        if (!focusable || focusable.length === 0) return;

        const first = focusable[0];
        const last = focusable[focusable.length - 1];

        if (e.shiftKey) {
          if (document.activeElement === first && last) {
            e.preventDefault();
            last.focus();
          }
        } else if (document.activeElement === last && first) {
          e.preventDefault();
          first.focus();
        }
      }
    };

    window.addEventListener('keydown', handleKeyDown);

    return () => {
      clearTimeout(focusTimer);
      window.removeEventListener('keydown', handleKeyDown);
      document.body.style.overflow = originalOverflow;
      document.body.style.paddingRight = originalPaddingRight;
      previousActiveElementRef.current?.focus();
    };
  }, [listing, onClose]);

  if (!listing) return null;

  const b = listing.scoreBreakdown;

  const rows = [
    {
      label: 'Baseline Points',
      points: b.base,
      desc: 'Starting score for verified Bangalore rental listings',
    },
    {
      label: 'Monthly Rent',
      points: b.rent,
      desc: listing.entities.rent
        ? `₹${listing.entities.rent.toLocaleString('en-IN')}`
        : 'Unspecified',
    },
    {
      label: 'Brokerage Status',
      points: b.brokerage,
      desc: listing.entities.isBrokerage
        ? 'Broker Fee Applicable (-40)'
        : 'No Brokerage / Direct Owner (+15)',
    },
    {
      label: 'Security Deposit',
      points: b.deposit,
      desc: listing.entities.deposit
        ? `₹${listing.entities.deposit.toLocaleString('en-IN')}`
        : 'Standard Deposit',
    },
    {
      label: 'Gated Society',
      points: b.gatedSociety,
      desc: listing.entities.isGatedSociety
        ? `Verified Gated (${listing.entities.societyName || 'Complex'}) (+15)`
        : 'Standalone Building',
    },
    {
      label: 'Swimming Pool',
      points: b.swimmingPool,
      desc: listing.entities.hasSwimmingPool
        ? 'Pool amenity verified (+15)'
        : 'No swimming pool',
    },
    {
      label: '100% DG Power Backup',
      points: b.powerBackup,
      desc: listing.entities.hasPowerBackup
        ? 'Full generator backup (+10)'
        : 'Not mentioned',
    },
    {
      label: 'Attached Washroom',
      points: b.attachedWashroom,
      desc: listing.entities.hasAttachedWashroom
        ? 'Private attached bathroom (+10)'
        : 'Shared / Not specified',
    },
    {
      label: 'Bachelor / Male Eligibility',
      points: b.bachelorMatch,
      desc: listing.entities.isFemaleOnly
        ? 'Female-only listing (-30)'
        : listing.entities.isMaleBachelorAllowed
          ? 'Bachelor friendly (+10)'
          : 'Family / restricted',
    },
    {
      label: 'Dietary Restriction',
      points: b.vegetarianPenalty,
      desc: listing.entities.isVegetarianOnly
        ? 'Vegetarian-only restriction (-50)'
        : 'No dietary restriction (0)',
    },
    {
      label: 'Walking Distance Proximity',
      points: b.walkProximity,
      desc: listing.entities.isWalkingDistance
        ? 'Walkable to tech park (+15)'
        : 'Scooter / transit commute',
    },
    {
      label: 'Furnishing Status',
      points: b.furnished,
      desc: `${listing.entities.furnishing} (${b.furnished > 0 ? `+${b.furnished}` : '0'})`,
    },
    {
      label: 'Panathur Bottleneck Avoidance',
      points: b.panathurBypass,
      desc: listing.entities.isKadubeesanahalliDirect
        ? 'Direct Kadubeesanahalli / PTP side (+10)'
        : 'Crosses Panathur Railway Underpass',
    },
    {
      label: 'Peak Commute to PTP (11am / 5pm)',
      points: b.commute,
      desc: `${listing.commute.twoWayAvgPeakMins}m average peak scooter time (${b.commute > 0 ? `+${b.commute}` : b.commute})`,
    },
  ];

  return (
    <dialog
      open
      aria-modal="true"
      aria-labelledby="score-breakdown-title"
      className="fixed inset-0 z-50 m-0 h-full w-full max-w-none max-h-none flex items-center justify-center p-4 bg-[#090A0F]/85 backdrop-blur-sm border-0"
    >
      <div
        ref={modalRef}
        className="bg-[#11131A] border border-white/[0.08] rounded-2xl w-full max-w-xl overflow-hidden shadow-2xl"
      >
        <div className="p-5 border-b border-white/[0.08] flex items-center justify-between">
          <div>
            <h3 id="score-breakdown-title" className="text-lg font-bold text-white flex items-center gap-2">
              <span>{listing.tier}</span>
              <span className="font-mono tabular-nums text-emerald-400 font-extrabold">{listing.score} pts</span>
            </h3>
            <p className="text-xs text-slate-400 mt-0.5">
              {listing.zone ? `${listing.zone} • ` : ''}{listing.location} • {listing.bhkType}
            </p>
          </div>
          <button
            type="button"
            onClick={onClose}
            aria-label="Close score breakdown dialog"
            className="p-1.5 text-slate-400 hover:text-white rounded-lg hover:bg-white/[0.06] transition-[background-color,color,transform] duration-140 ease-[var(--ease-out)] active:scale-[0.97]"
            title="Close dialog"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        <div className="p-5 max-h-[60vh] overflow-y-auto space-y-2">
          {rows.map((row) => (
            <div
              key={row.label}
              className={`flex items-center justify-between p-2.5 rounded-lg border text-xs ${
                row.points > 0
                  ? 'bg-emerald-950/20 border-emerald-500/20'
                  : row.points < 0
                    ? 'bg-rose-950/20 border-rose-500/20'
                    : 'bg-[#090A0F]/60 border-white/[0.06]'
              }`}
            >
              <div className="flex items-center gap-2.5">
                {row.points > 0 ? (
                  <CheckCircle2 className="w-4 h-4 text-emerald-400 shrink-0" />
                ) : row.points < 0 ? (
                  <XCircle className="w-4 h-4 text-rose-400 shrink-0" />
                ) : (
                  <div className="w-4 h-4 rounded-full border border-slate-600 flex items-center justify-center text-[10px] text-slate-400 font-mono">
                    —
                  </div>
                )}
                <div>
                  <div className="font-semibold text-slate-200">{row.label}</div>
                  <div className="text-[11px] text-slate-400">{row.desc}</div>
                </div>
              </div>
              <div
                className={`font-mono tabular-nums font-bold text-sm ${
                  row.points > 0
                    ? 'text-emerald-400'
                    : row.points < 0
                      ? 'text-rose-400'
                      : 'text-slate-400'
                }`}
              >
                {row.points > 0 ? `+${row.points}` : row.points}
              </div>
            </div>
          ))}
        </div>

        <div className="p-4 bg-[#090A0F]/80 border-t border-white/[0.08] flex items-center justify-between text-xs text-slate-400">
          <span>14-point mathematical score breakdown</span>
          <button
            type="button"
            onClick={onClose}
            className="px-4 py-1.5 rounded-lg bg-emerald-600 hover:bg-emerald-500 text-white font-semibold transition-[background-color,transform] duration-140 ease-[var(--ease-out)] active:scale-[0.97]"
          >
            Done
          </button>
        </div>
      </div>
    </dialog>
  );
};
