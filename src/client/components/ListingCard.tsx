import React from 'react';
import { RentalListing, UserListingStatus } from '../../domain/types';
import { RatingBadge } from './RatingBadge';
import { CommutePill } from './CommutePill';
import {
  Building2,
  Waves,
  Zap,
  Bath,
  ExternalLink,
  Phone,
  MessageCircle,
  ShieldCheck,
  Check,
} from 'lucide-react';

interface ListingCardProps {
  listing: RentalListing;
  onStatusChange: (id: number, status: UserListingStatus) => void;
  onOpenScoreModal: (listing: RentalListing) => void;
}

export const ListingCard: React.FC<ListingCardProps> = ({
  listing,
  onStatusChange,
  onOpenScoreModal,
}) => {
  const e = listing.entities;

  const getStatusColor = (status: UserListingStatus) => {
    switch (status) {
      case 'interested':
        return 'text-amber-400 bg-amber-950/40 border-amber-500/40';
      case 'called':
        return 'text-blue-400 bg-blue-950/40 border-blue-500/40';
      case 'applied':
        return 'text-emerald-400 bg-emerald-950/40 border-emerald-500/40';
      case 'rejected':
        return 'text-rose-400 bg-rose-950/40 border-rose-500/40';
      default:
        return 'text-slate-400 bg-slate-900 border-slate-700';
    }
  };

  return (
    <div className="glass-panel glass-panel-hover p-5 rounded-2xl flex flex-col justify-between relative overflow-hidden group">
      {/* Top Banner & Badges */}
      <div>
        <div className="flex items-start justify-between gap-3 mb-3">
          <div>
            <div className="flex items-center gap-2">
              <span className="text-xs font-semibold text-emerald-400 bg-emerald-950/60 border border-emerald-500/30 px-2 py-0.5 rounded-md">
                {listing.bhkType}
              </span>
              <span className="text-xs text-slate-400">
                {e.societyName ? `in ${e.societyName}` : listing.location}
              </span>
            </div>
            <h3 className="text-base font-bold text-white mt-1 leading-snug">
              {e.societyName || `${listing.location} (near PTP)`}
            </h3>
          </div>

          <RatingBadge
            score={listing.score}
            tier={listing.tier}
            onClick={() => onOpenScoreModal(listing)}
          />
        </div>

        {/* Pricing & Terms */}
        <div className="flex items-baseline gap-2 mb-4 pb-3 border-b border-slate-800/80">
          <div className="text-2xl font-extrabold text-white font-mono">
            {e.rent ? `₹${e.rent.toLocaleString('en-IN')}` : 'Contact for Rent'}
          </div>
          <span className="text-xs text-slate-400">/ month</span>

          {e.deposit && (
            <span className="text-xs text-slate-400 ml-auto font-mono">
              Dep: ₹{e.deposit.toLocaleString('en-IN')}
            </span>
          )}
        </div>

        {/* Commute Pill */}
        <div className="mb-4">
          <CommutePill commute={listing.commute} />
        </div>

        {/* Feature & Amenity Tags */}
        <div className="flex flex-wrap gap-1.5 mb-4">
          {e.isBrokerage ? (
            <span className="text-[11px] px-2 py-0.5 rounded bg-rose-950/40 text-rose-300 border border-rose-500/30 font-medium">
              Broker Fee
            </span>
          ) : (
            <span className="text-[11px] px-2 py-0.5 rounded bg-emerald-950/40 text-emerald-300 border border-emerald-500/30 font-medium">
              Zero Brokerage
            </span>
          )}

          {e.isGatedSociety && (
            <span className="inline-flex items-center gap-1 text-[11px] px-2 py-0.5 rounded bg-indigo-950/40 text-indigo-300 border border-indigo-500/30">
              <Building2 className="w-3 h-3" /> Gated
            </span>
          )}

          {e.hasSwimmingPool && (
            <span className="inline-flex items-center gap-1 text-[11px] px-2 py-0.5 rounded bg-blue-950/40 text-blue-300 border border-blue-500/30">
              <Waves className="w-3 h-3" /> Pool
            </span>
          )}

          {e.hasPowerBackup && (
            <span className="inline-flex items-center gap-1 text-[11px] px-2 py-0.5 rounded bg-amber-950/40 text-amber-300 border border-amber-500/30">
              <Zap className="w-3 h-3" /> 100% DG
            </span>
          )}

          {e.hasAttachedWashroom && (
            <span className="inline-flex items-center gap-1 text-[11px] px-2 py-0.5 rounded bg-teal-950/40 text-teal-300 border border-teal-500/30">
              <Bath className="w-3 h-3" /> Attached Bath
            </span>
          )}

          {e.furnishing !== 'Unknown' && (
            <span className="text-[11px] px-2 py-0.5 rounded bg-slate-800 text-slate-300 border border-slate-700">
              {e.furnishing}
            </span>
          )}
        </div>

        {/* Snippet from Raw Text */}
        <p className="text-xs text-slate-400 line-clamp-2 italic mb-4">
          "{listing.rawText}"
        </p>
      </div>

      {/* Card Footer: Status and Direct Action Buttons */}
      <div className="pt-3 border-t border-slate-800/80 flex items-center justify-between gap-2">
        {/* Status Dropdown */}
        <select
          value={listing.userStatus}
          onChange={(e) => onStatusChange(listing.id, e.target.value as UserListingStatus)}
          className={`text-xs font-semibold px-2.5 py-1.5 rounded-lg border focus:outline-none cursor-pointer ${getStatusColor(
            listing.userStatus
          )}`}
        >
          <option value="new">Status: New</option>
          <option value="interested">⭐ Interested</option>
          <option value="called">📞 Called</option>
          <option value="applied">📝 Applied</option>
          <option value="rejected">❌ Rejected</option>
        </select>

        {/* Contact & Link Actions */}
        <div className="flex items-center gap-1.5">
          {e.contactPhone && (
            <>
              <a
                href={`https://wa.me/91${e.contactPhone}?text=Hi%2C%20saw%20your%20rental%20post%20for%20${encodeURIComponent(
                  e.societyName || listing.location
                )}%20near%20PTP.%20Is%20it%20available%3F`}
                target="_blank"
                rel="noreferrer"
                className="p-1.5 rounded-lg bg-emerald-600/20 hover:bg-emerald-600/40 text-emerald-400 border border-emerald-500/30 transition-colors"
                title="Message on WhatsApp"
              >
                <MessageCircle className="w-4 h-4" />
              </a>
              <a
                href={`tel:${e.contactPhone}`}
                className="p-1.5 rounded-lg bg-cyan-600/20 hover:bg-cyan-600/40 text-cyan-400 border border-cyan-500/30 transition-colors"
                title="Call Owner"
              >
                <Phone className="w-4 h-4" />
              </a>
            </>
          )}

          <a
            href={listing.postUrl}
            target="_blank"
            rel="noreferrer"
            className="p-1.5 rounded-lg bg-slate-800 hover:bg-slate-700 text-slate-300 border border-slate-700 transition-colors"
            title="Open Original Facebook Post"
          >
            <ExternalLink className="w-4 h-4" />
          </a>
        </div>
      </div>
    </div>
  );
};
