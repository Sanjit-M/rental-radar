import React, { useState, useEffect } from 'react';
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
  Clock,
  User,
  Layers,
  ChevronDown,
  ChevronUp,
  ChevronLeft,
  ChevronRight,
  Maximize2,
  X,
  Leaf,
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
  const [isExpanded, setIsExpanded] = useState(false);
  const [activeImageIdx, setActiveImageIdx] = useState(0);
  const [isLightboxOpen, setIsLightboxOpen] = useState(false);

  const e = listing.entities;
  const images = listing.imageUrls || e.imageUrls || [];

  // Keyboard navigation for full-screen lightbox
  useEffect(() => {
    if (!isLightboxOpen) return;

    const handleKeyDown = (ev: KeyboardEvent) => {
      if (ev.key === 'Escape') {
        setIsLightboxOpen(false);
      } else if (ev.key === 'ArrowLeft') {
        setActiveImageIdx((prev) => (prev > 0 ? prev - 1 : images.length - 1));
      } else if (ev.key === 'ArrowRight') {
        setActiveImageIdx((prev) => (prev < images.length - 1 ? prev + 1 : 0));
      }
    };

    window.addEventListener('keydown', handleKeyDown);
    return () => window.removeEventListener('keydown', handleKeyDown);
  }, [isLightboxOpen, images.length]);

  const handlePrevImage = (ev: React.MouseEvent) => {
    ev.stopPropagation();
    setActiveImageIdx((prev) => (prev > 0 ? prev - 1 : images.length - 1));
  };

  const handleNextImage = (ev: React.MouseEvent) => {
    ev.stopPropagation();
    setActiveImageIdx((prev) => (prev < images.length - 1 ? prev + 1 : 0));
  };

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
    <>
      <div className="glass-panel glass-panel-hover p-5 rounded-2xl flex flex-col justify-between relative overflow-hidden group">
        {/* Top Banner & Badges */}
        <div>
          {/* Photo Gallery Banner if Images Available */}
          {images.length > 0 && (
            <div className="relative mb-4 rounded-xl overflow-hidden bg-slate-900 aspect-video border border-slate-800 shadow-inner group/img">
              <img
                src={images[activeImageIdx]}
                alt={e.societyName || listing.location}
                className="w-full h-full object-cover transition-transform duration-300 group-hover/img:scale-105 cursor-pointer"
                loading="lazy"
                onClick={() => setIsLightboxOpen(true)}
                onError={(ev) => {
                  (ev.target as HTMLElement).style.display = 'none';
                }}
              />

              {/* Expand / Lightbox Trigger Button */}
              <button
                type="button"
                onClick={(ev) => {
                  ev.stopPropagation();
                  setIsLightboxOpen(true);
                }}
                className="absolute top-2.5 right-2.5 p-1.5 rounded-lg bg-black/60 hover:bg-black/80 text-white backdrop-blur-md border border-white/10 opacity-0 group-hover/img:opacity-100 transition-opacity z-10"
                title="View full screen photo"
              >
                <Maximize2 className="w-3.5 h-3.5" />
              </button>

              {/* Left/Right Carousel Arrow Overlay Buttons */}
              {images.length > 1 && (
                <>
                  <button
                    type="button"
                    onClick={handlePrevImage}
                    className="absolute left-2 top-1/2 -translate-y-1/2 p-1.5 rounded-full bg-black/70 hover:bg-black/90 text-white backdrop-blur-md border border-white/20 shadow-lg hover:scale-110 active:scale-95 transition-all z-10"
                    title="Previous photo"
                  >
                    <ChevronLeft className="w-4 h-4" />
                  </button>

                  <button
                    type="button"
                    onClick={handleNextImage}
                    className="absolute right-2 top-1/2 -translate-y-1/2 p-1.5 rounded-full bg-black/70 hover:bg-black/90 text-white backdrop-blur-md border border-white/20 shadow-lg hover:scale-110 active:scale-95 transition-all z-10"
                    title="Next photo"
                  >
                    <ChevronRight className="w-4 h-4" />
                  </button>

                  {/* Dot & Counter Bar */}
                  <div className="absolute bottom-2 right-2 flex items-center gap-1.5 bg-slate-950/85 backdrop-blur-md px-2.5 py-0.5 rounded-full text-[10px] font-mono text-slate-300 border border-slate-700 z-10 shadow-md">
                    <span>
                      {activeImageIdx + 1}/{images.length}
                    </span>
                    <div className="flex gap-1 ml-1">
                      {images.map((_, idx) => (
                        <button
                          key={idx}
                          type="button"
                          onClick={(ev) => {
                            ev.stopPropagation();
                            setActiveImageIdx(idx);
                          }}
                          className={`w-1.5 h-1.5 rounded-full transition-all ${
                            idx === activeImageIdx
                              ? 'bg-emerald-400 w-3'
                              : 'bg-slate-600 hover:bg-slate-400'
                          }`}
                        />
                      ))}
                    </div>
                  </div>
                </>
              )}
            </div>
          )}

          {/* Author & Facebook Publication Time Header */}
          <div className="flex items-center justify-between text-xs text-slate-400 pb-2.5 mb-3 border-b border-slate-800/60">
            <div className="flex items-center gap-1.5 font-medium text-slate-300 truncate max-w-[160px]">
              <User className="w-3.5 h-3.5 text-indigo-400 shrink-0" />
              <span className="truncate">{listing.authorName}</span>
            </div>

            <div className="flex items-center gap-1.5">
              {listing.postCount && listing.postCount > 1 && (
                <span
                  className="inline-flex items-center gap-1 text-[10px] font-semibold bg-indigo-950/80 text-indigo-300 border border-indigo-500/40 px-2 py-0.5 rounded-full"
                  title={`Seen in ${listing.postCount} groups: ${(listing.groupNames || []).join(', ')}`}
                >
                  <Layers className="w-2.5 h-2.5" /> Seen in {listing.postCount} groups
                </span>
              )}

              {/* Exact Facebook Publication Timestamp */}
              <div
                className="flex items-center gap-1 text-[11px] font-medium text-cyan-300 bg-slate-900/90 px-2.5 py-0.5 rounded-full border border-cyan-500/30 shrink-0"
                title={`Published on Facebook: ${listing.postedTime}`}
              >
                <Clock className="w-3 h-3 text-cyan-400 shrink-0" />
                <span>{listing.postedTime}</span>
              </div>
            </div>
          </div>

        <div className="flex items-start justify-between gap-3 mb-3">
          <div>
            <div className="flex items-center gap-2 flex-wrap">
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
            {(listing.landmark || e.landmark) && (
              <div className="text-[11px] text-cyan-300 mt-0.5 flex items-center gap-1">
                <span>📍</span>
                <span className="truncate">{listing.landmark || e.landmark}</span>
              </div>
            )}
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

          {e.isVegetarianOnly && (
            <span className="inline-flex items-center gap-1 text-[11px] px-2 py-0.5 rounded bg-amber-950/50 text-amber-300 border border-amber-500/40 font-medium">
              <Leaf className="w-3 h-3" /> Veg Only (-50)
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

          {e.hasAttachedWashroom ? (
            <span className="inline-flex items-center gap-1 text-[11px] px-2 py-0.5 rounded bg-teal-950/40 text-teal-300 border border-teal-500/30">
              <Bath className="w-3 h-3" /> Attached Bath
            </span>
          ) : (
            <span className="text-[11px] px-2 py-0.5 rounded bg-slate-800/80 text-slate-400 border border-slate-700">
              Shared Bath (-15)
            </span>
          )}

          {e.furnishing !== 'Unknown' && (
            <span className="text-[11px] px-2 py-0.5 rounded bg-slate-800 text-slate-300 border border-slate-700">
              {e.furnishing}
            </span>
          )}
        </div>

        {/* Full Expandable Facebook Post Body */}
        <div className="mb-4">
          <div
            role="button"
            tabIndex={0}
            aria-expanded={isExpanded}
            onClick={() => setIsExpanded(!isExpanded)}
            onKeyDown={(e) => {
              if (e.key === 'Enter' || e.key === ' ') {
                e.preventDefault();
                setIsExpanded(!isExpanded);
              }
            }}
            className="cursor-pointer group/desc bg-slate-900/80 hover:bg-slate-900 border border-slate-800/90 hover:border-slate-700 rounded-xl p-3.5 transition-all focus:outline-none focus:border-cyan-500/50 shadow-inner"
          >
            <p className={`text-xs text-slate-300 italic ${!isExpanded ? 'line-clamp-2' : ''} leading-relaxed whitespace-pre-line`}>
              "{listing.rawText}"
            </p>
            <div className="flex items-center gap-1 text-[11px] text-cyan-400 font-semibold mt-2 pt-1 border-t border-slate-800/40">
              <span>{isExpanded ? 'Show less' : 'Read full description'}</span>
              {isExpanded ? <ChevronUp className="w-3.5 h-3.5" /> : <ChevronDown className="w-3.5 h-3.5" />}
            </div>
          </div>
        </div>

        {/* Phone Number Banner if Available */}
        {e.contactPhone && (
          <div className="flex items-center justify-between bg-slate-900/90 border border-slate-800 px-3 py-2 rounded-xl mb-4 text-xs">
            <span className="text-slate-400 flex items-center gap-1.5 font-medium">
              <Phone className="w-3.5 h-3.5 text-cyan-400" />
              Phone:
            </span>
            <span className="font-mono font-bold text-white tracking-wider">
              +91 {e.contactPhone}
            </span>
          </div>
        )}
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
                href={`https://wa.me/91${e.contactPhone}?text=Hi%20${encodeURIComponent(
                  listing.authorName
                )}%2C%20saw%20your%20rental%20post%20for%20${encodeURIComponent(
                  e.societyName || listing.location
                )}%20near%20PTP.%20Is%20it%20available%3F`}
                target="_blank"
                rel="noreferrer"
                className="p-1.5 rounded-lg bg-emerald-600/20 hover:bg-emerald-600/40 text-emerald-400 border border-emerald-500/30 transition-colors"
                title={`WhatsApp ${listing.authorName}`}
              >
                <MessageCircle className="w-4 h-4" />
              </a>
              <a
                href={`tel:${e.contactPhone}`}
                className="p-1.5 rounded-lg bg-cyan-600/20 hover:bg-cyan-600/40 text-cyan-400 border border-cyan-500/30 transition-colors"
                title={`Call ${listing.authorName}`}
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

    {/* Full Screen Photo Lightbox Modal */}
    {isLightboxOpen && images.length > 0 && (
      <div
        className="fixed inset-0 z-50 bg-slate-950/95 backdrop-blur-xl flex flex-col items-center justify-center p-4"
        onClick={() => setIsLightboxOpen(false)}
      >
        {/* Lightbox Top Bar */}
        <div className="absolute top-4 left-4 right-4 flex items-center justify-between text-white z-20">
          <div className="text-sm font-semibold flex items-center gap-2">
            <span>{e.societyName || listing.location}</span>
            <span className="text-slate-400 font-mono text-xs">
              ({activeImageIdx + 1} of {images.length})
            </span>
          </div>
          <button
            type="button"
            onClick={() => setIsLightboxOpen(false)}
            className="p-2 rounded-xl bg-slate-900/80 hover:bg-slate-800 border border-slate-700 text-white transition-colors"
            title="Close (Esc)"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        {/* Lightbox Main Image */}
        <div
          className="relative max-w-5xl max-h-[85vh] flex items-center justify-center"
          onClick={(ev) => ev.stopPropagation()}
        >
          <img
            src={images[activeImageIdx]}
            alt={e.societyName || listing.location}
            className="max-w-full max-h-[80vh] object-contain rounded-xl shadow-2xl border border-slate-800"
          />

          {/* Left/Right Lightbox Arrows */}
          {images.length > 1 && (
            <>
              <button
                type="button"
                onClick={handlePrevImage}
                className="absolute left-3 top-1/2 -translate-y-1/2 p-2.5 rounded-full bg-slate-900/80 hover:bg-slate-800 text-white border border-slate-700 shadow-2xl transition-all"
                title="Previous image (←)"
              >
                <ChevronLeft className="w-6 h-6" />
              </button>

              <button
                type="button"
                onClick={handleNextImage}
                className="absolute right-3 top-1/2 -translate-y-1/2 p-2.5 rounded-full bg-slate-900/80 hover:bg-slate-800 text-white border border-slate-700 shadow-2xl transition-all"
                title="Next image (→)"
              >
                <ChevronRight className="w-6 h-6" />
              </button>
            </>
          )}
        </div>

        {/* Lightbox Bottom Thumbnail Strip */}
        {images.length > 1 && (
          <div
            className="absolute bottom-4 flex items-center gap-2 p-2 bg-slate-900/80 backdrop-blur-md rounded-2xl border border-slate-800 max-w-md overflow-x-auto"
            onClick={(ev) => ev.stopPropagation()}
          >
            {images.map((imgUrl, idx) => (
              <button
                key={idx}
                type="button"
                onClick={() => setActiveImageIdx(idx)}
                className={`w-12 h-12 rounded-lg overflow-hidden shrink-0 border-2 transition-all ${
                  idx === activeImageIdx
                    ? 'border-emerald-400 scale-105'
                    : 'border-transparent opacity-60 hover:opacity-100'
                }`}
              >
                <img
                  src={imgUrl}
                  alt={`Thumbnail ${idx + 1}`}
                  className="w-full h-full object-cover"
                />
              </button>
            ))}
          </div>
        )}
      </div>
    )}
  </>
);
};
