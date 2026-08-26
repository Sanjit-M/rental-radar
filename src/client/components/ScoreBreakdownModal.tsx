import React from 'react';
import { RentalListing } from '../../domain/types';
import { X, CheckCircle2, XCircle } from 'lucide-react';

interface ScoreBreakdownModalProps {
  listing: RentalListing | null;
  onClose: () => void;
}

export const ScoreBreakdownModal: React.FC<ScoreBreakdownModalProps> = ({ listing, onClose }) => {
  if (!listing) return null;

  const b = listing.scoreBreakdown;

  const rows = [
    { label: 'Baseline Points', points: b.base, desc: 'Starting score for valid Kadubeesanahalli/PTP listings' },
    {
      label: 'Monthly Rent',
      points: b.rent,
      desc: listing.entities.rent ? `₹${listing.entities.rent.toLocaleString('en-IN')}` : 'Unspecified',
    },
    {
      label: 'Brokerage Status',
      points: b.brokerage,
      desc: listing.entities.isBrokerage ? 'Broker Fee Applicable (-25)' : 'No Brokerage / Direct Owner (+15)',
    },
    {
      label: 'Security Deposit',
      points: b.deposit,
      desc: listing.entities.deposit ? `₹${listing.entities.deposit.toLocaleString('en-IN')}` : 'Standard Deposit',
    },
    {
      label: 'Gated Society',
      points: b.gatedSociety,
      desc: listing.entities.isGatedSociety ? `Verified Gated (${listing.entities.societyName || 'Complex'}) (+15)` : 'Standalone Building',
    },
    {
      label: 'Swimming Pool',
      points: b.swimmingPool,
      desc: listing.entities.hasSwimmingPool ? 'Pool amenity verified (+15)' : 'No swimming pool',
    },
    {
      label: '100% DG Power Backup',
      points: b.powerBackup,
      desc: listing.entities.hasPowerBackup ? 'Full generator backup (+10)' : 'Not mentioned',
    },
    {
      label: 'Attached Washroom',
      points: b.attachedWashroom,
      desc: listing.entities.hasAttachedWashroom ? 'Private attached bathroom (+10)' : 'Shared / Not specified',
    },
    {
      label: 'Furnishing Status',
      points: b.furnished,
      desc: `${listing.entities.furnishing} (${b.furnished > 0 ? `+${b.furnished}` : '0'})`,
    },
    {
      label: 'Panathur Bottleneck Avoidance',
      points: b.panathurBypass,
      desc: listing.entities.isKadubeesanahalliDirect ? 'Direct Kadubeesanahalli / PTP side (+10)' : 'Crosses Panathur Railway Underpass',
    },
    {
      label: 'Peak Commute to PTP (11am / 5pm)',
      points: b.commute,
      desc: `${listing.commute.twoWayAvgPeakMins}m average peak scooter time (${b.commute > 0 ? `+${b.commute}` : b.commute})`,
    },
  ];

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/80 backdrop-blur-sm animate-in fade-in duration-200">
      <div className="bg-slate-900 border border-slate-700/80 rounded-2xl w-full max-w-xl overflow-hidden shadow-2xl">
        {/* Modal Header */}
        <div className="p-5 border-b border-slate-800 flex items-center justify-between">
          <div>
            <h3 className="text-lg font-bold text-white flex items-center gap-2">
              <span>{listing.tier}</span>
              <span className="font-mono text-emerald-400 font-extrabold">{listing.score} / 100</span>
            </h3>
            <p className="text-xs text-slate-400 mt-0.5">
              {listing.location} • {listing.bhkType}
            </p>
          </div>
          <button
            onClick={onClose}
            className="p-1.5 text-slate-400 hover:text-white rounded-lg hover:bg-slate-800 transition-colors"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        {/* Score Breakdown Table */}
        <div className="p-5 max-h-[60vh] overflow-y-auto space-y-2">
          {rows.map((row, idx) => (
            <div
              key={idx}
              className={`flex items-center justify-between p-2.5 rounded-lg border text-xs ${
                row.points > 0
                  ? 'bg-emerald-950/20 border-emerald-500/20'
                  : row.points < 0
                  ? 'bg-rose-950/20 border-rose-500/20'
                  : 'bg-slate-950/40 border-slate-800/60'
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
                className={`font-mono font-bold text-sm ${
                  row.points > 0 ? 'text-emerald-400' : row.points < 0 ? 'text-rose-400' : 'text-slate-400'
                }`}
              >
                {row.points > 0 ? `+${row.points}` : row.points}
              </div>
            </div>
          ))}
        </div>

        {/* Modal Footer */}
        <div className="p-4 bg-slate-950/60 border-t border-slate-800 flex items-center justify-between text-xs text-slate-400">
          <span>Clamped mathematically between 0 and 100</span>
          <button
            onClick={onClose}
            className="px-4 py-1.5 rounded-lg bg-emerald-600 hover:bg-emerald-500 text-white font-semibold transition-colors"
          >
            Done
          </button>
        </div>
      </div>
    </div>
  );
};
