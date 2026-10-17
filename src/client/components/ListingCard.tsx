import React, { useState, useEffect } from 'react';
import {
  type RentalListing,
  type UserListingStatus,
  buildSocietyMapsUrl,
  buildLandmarkMapsUrl,
  buildLocalityMapsUrl,
} from '../../domain/types';
import { RatingBadge } from './RatingBadge';
import { CommutePill } from './CommutePill';
import { detectWaterSource } from './ListingDrawer';
import { toast } from './ToastStack';
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
  Droplets,
  Eye,
  MapPin,
} from 'lucide-react';

interface ListingCardProps {
  readonly listing: RentalListing;
  readonly onStatusChange: (id: number, status: UserListingStatus) => void;
  readonly onOpenScoreModal: (listing: RentalListing) => void;
  readonly onOpenDrawer?: ((listing: RentalListing) => void) | undefined;
}

interface PhotoBannerProps {
  readonly images: readonly string[];
  readonly activeImageIdx: number;
  readonly title: string;
  readonly onSelectIndex: (idx: number) => void;
  readonly onPrev: (ev: React.MouseEvent) => void;
  readonly onNext: (ev: React.MouseEvent) => void;
  readonly onOpenLightbox: () => void;
  readonly onQuickInspect?: (() => void) | undefined;
}

const ListingPhotoBanner: React.FC<PhotoBannerProps> = ({
  images,
  activeImageIdx,
  title,
  onSelectIndex,
  onPrev,
  onNext,
  onOpenLightbox,
  onQuickInspect,
}) => {
  if (images.length === 0) {
    return (
      <div className="relative mb-4 rounded-xl overflow-hidden bg-slate-900/60 aspect-video border border-slate-800/80 shadow-inner flex flex-col items-center justify-center p-4 text-center group/img">
        <Building2 className="w-8 h-8 text-slate-600 mb-1.5 transition-transform duration-300 group-hover/img:scale-110" />
        <span className="text-[11px] font-medium text-slate-400">
          No direct photo uploads attached in post
        </span>
        {onQuickInspect && (
          <button
            type="button"
            onClick={onQuickInspect}
            className="mt-2 text-[10px] font-bold text-cyan-400 hover:text-cyan-300 flex items-center gap-1 px-2.5 py-1 rounded-md bg-slate-800/80 border border-slate-700/80 hover:border-cyan-500/40 transition-[background-color,border-color,transform] duration-140 ease-[var(--ease-out)] active:scale-[0.97]"
          >
            <Eye className="w-3 h-3" /> Quick Inspect
          </button>
        )}
      </div>
    );
  }

  return (
    <div className="relative mb-4 rounded-xl overflow-hidden bg-slate-900 aspect-video border border-slate-800 shadow-inner group/img">
      <button
        type="button"
        aria-label={`Open full screen photo of ${title}`}
        onClick={onOpenLightbox}
        className="w-full h-full block focus:outline-none"
      >
        <img
          src={images[activeImageIdx]}
          alt={title}
          className="w-full h-full object-cover transition-transform duration-300 group-hover/img:scale-105 cursor-pointer"
          loading="lazy"
          onError={(ev) => {
            (ev.target as HTMLElement).style.display = 'none';
          }}
        />
      </button>

      <button
        type="button"
        aria-label="View full screen photo"
        onClick={(ev) => {
          ev.stopPropagation();
          onOpenLightbox();
        }}
        className="absolute top-2.5 right-2.5 p-1.5 rounded-lg bg-black/60 hover:bg-black/80 text-white backdrop-blur-md border border-white/10 opacity-0 group-hover/img:opacity-100 transition-opacity duration-140 ease-[var(--ease-out)] active:scale-[0.97] z-10"
        title="View full screen photo"
      >
        <Maximize2 className="w-3.5 h-3.5" />
      </button>

      {images.length > 1 && (
        <>
          <button
            type="button"
            aria-label="Previous photo"
            onClick={onPrev}
            className="absolute left-2 top-1/2 -translate-y-1/2 p-1.5 rounded-full bg-black/70 hover:bg-black/90 text-white backdrop-blur-md border border-white/20 shadow-lg hover:scale-110 active:scale-[0.97] transition-[transform,background-color] duration-140 ease-[var(--ease-out)] z-10"
            title="Previous photo"
          >
            <ChevronLeft className="w-4 h-4" />
          </button>

          <button
            type="button"
            aria-label="Next photo"
            onClick={onNext}
            className="absolute right-2 top-1/2 -translate-y-1/2 p-1.5 rounded-full bg-black/70 hover:bg-black/90 text-white backdrop-blur-md border border-white/20 shadow-lg hover:scale-110 active:scale-[0.97] transition-[transform,background-color] duration-140 ease-[var(--ease-out)] z-10"
            title="Next photo"
          >
            <ChevronRight className="w-4 h-4" />
          </button>

          <div className="absolute bottom-2 right-2 flex items-center gap-1.5 bg-slate-950/85 backdrop-blur-md px-2.5 py-0.5 rounded-full text-[10px] font-mono tabular-nums text-slate-300 border border-slate-700 z-10 shadow-md">
            <span>
              {activeImageIdx + 1}/{images.length}
            </span>
            <div className="flex gap-1 ml-1">
              {images.map((imgUrl, idx) => (
                <button
                  key={imgUrl}
                  type="button"
                  aria-label={`Select photo ${idx + 1}`}
                  onClick={(ev) => {
                    ev.stopPropagation();
                    onSelectIndex(idx);
                  }}
                  className={`w-1.5 h-1.5 rounded-full transition-[width,background-color] duration-160 ease-[var(--ease-out)] ${
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
  );
};

const ListingAuthorBar: React.FC<{ readonly listing: RentalListing }> = ({ listing }) => {
  return (
    <div className="flex items-center justify-between text-xs text-slate-400 pb-2.5 mb-3 border-b border-slate-800/60">
      <div className="flex items-center gap-1.5 font-medium text-slate-300 truncate max-w-[150px]">
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

        <a
          href={listing.postUrl}
          target="_blank"
          rel="noreferrer"
          className="flex items-center gap-1 text-[11px] font-medium text-cyan-300 bg-slate-900/90 hover:bg-slate-800 px-2.5 py-0.5 rounded-full border border-cyan-500/30 shrink-0 transition-colors duration-140 ease-[var(--ease-out)] active:scale-[0.97]"
          title={`Verified Facebook Post • Published: ${listing.postedTime}`}
        >
          <Clock className="w-3 h-3 text-cyan-400 shrink-0" />
          <span>{listing.postedTime}</span>
          <ExternalLink className="w-2.5 h-2.5 text-cyan-400 shrink-0" />
        </a>
      </div>
    </div>
  );
};

const ListingMapsLinksRow: React.FC<{ readonly listing: RentalListing }> = ({ listing }) => {
  const e = listing.entities;
  const landmark = listing.landmark || e.landmark;
  const localityUrl = listing.localityMapsUrl || buildLocalityMapsUrl(listing.location);
  const societyUrl = e.societyName
    ? listing.societyMapsUrl || buildSocietyMapsUrl(e.societyName, listing.location)
    : null;
  const landmarkUrl = landmark
    ? listing.landmarkMapsUrl || buildLandmarkMapsUrl(landmark, listing.location)
    : null;

  return (
    <div className="flex flex-wrap items-center gap-1.5 mt-2">
      {listing.zone && (
        <span className="text-[10px] font-bold uppercase tracking-wider px-2 py-0.5 rounded-md bg-cyan-950/60 text-cyan-300 border border-cyan-500/30">
          {listing.zone}
        </span>
      )}

      {societyUrl && e.societyName && (
        <a
          href={societyUrl}
          target="_blank"
          rel="noreferrer"
          className="inline-flex items-center gap-1 text-[10px] font-semibold px-2 py-0.5 rounded-md bg-indigo-950/60 hover:bg-indigo-900/70 text-indigo-300 border border-indigo-500/30 transition-colors"
          title={`Open ${e.societyName} in Google Maps`}
        >
          <MapPin className="w-2.5 h-2.5 text-indigo-400 shrink-0" />
          <span className="truncate max-w-[130px]">{e.societyName}</span>
          <ExternalLink className="w-2.5 h-2.5 shrink-0" />
        </a>
      )}

      <a
        href={localityUrl}
        target="_blank"
        rel="noreferrer"
        className="inline-flex items-center gap-1 text-[10px] font-semibold px-2 py-0.5 rounded-md bg-slate-900 hover:bg-slate-800 text-emerald-300 border border-emerald-500/30 transition-colors"
        title={`Open ${listing.location} in Google Maps`}
      >
        <MapPin className="w-2.5 h-2.5 text-emerald-400 shrink-0" />
        <span>{listing.location}</span>
        <ExternalLink className="w-2.5 h-2.5 shrink-0" />
      </a>

      {landmarkUrl && landmark && (
        <a
          href={landmarkUrl}
          target="_blank"
          rel="noreferrer"
          className="inline-flex items-center gap-1 text-[10px] font-medium px-2 py-0.5 rounded-md bg-slate-900 hover:bg-slate-800 text-cyan-300 border border-cyan-500/30 transition-colors"
          title={`Open ${landmark} in Google Maps`}
        >
          <MapPin className="w-2.5 h-2.5 text-cyan-400 shrink-0" />
          <span className="truncate max-w-[130px]">{landmark}</span>
          <ExternalLink className="w-2.5 h-2.5 shrink-0" />
        </a>
      )}
    </div>
  );
};

const ListingFeatureTags: React.FC<{ readonly listing: RentalListing }> = ({ listing }) => {
  const e = listing.entities;
  const waterInfo = detectWaterSource(listing.rawText);

  return (
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

      {waterInfo.isCauvery ? (
        <span className="inline-flex items-center gap-1 text-[11px] px-2 py-0.5 rounded bg-cyan-950/50 text-cyan-300 border border-cyan-500/40 font-medium">
          <Droplets className="w-3 h-3 text-cyan-400" /> Cauvery Water
        </span>
      ) : waterInfo.label !== 'Water Source Not Specified' ? (
        <span className="inline-flex items-center gap-1 text-[11px] px-2 py-0.5 rounded bg-slate-800 text-slate-300 border border-slate-700">
          <Droplets className="w-3 h-3 text-cyan-400" /> {waterInfo.label}
        </span>
      ) : null}

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
  );
};

const ListingExpandableDescription: React.FC<{ readonly rawText: string }> = ({ rawText }) => {
  const [isExpanded, setIsExpanded] = useState(false);

  return (
    <div className="mb-4">
      <button
        type="button"
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
        className="w-full text-left cursor-pointer group/desc bg-slate-900/80 hover:bg-slate-900 border border-slate-800/90 hover:border-slate-700 rounded-xl p-3.5 transition-[border-color,background-color] duration-140 ease-[var(--ease-out)] focus:outline-none focus:border-cyan-500/50 shadow-inner"
      >
        <p
          className={`text-xs text-slate-300 italic ${
            !isExpanded ? 'line-clamp-2' : ''
          } leading-relaxed whitespace-pre-line`}
        >
          "{rawText}"
        </p>
        <div className="flex items-center gap-1 text-[11px] text-cyan-400 font-semibold mt-2 pt-1 border-t border-slate-800/40">
          <span>{isExpanded ? 'Show less' : 'Read full description'}</span>
          {isExpanded ? <ChevronUp className="w-3.5 h-3.5" /> : <ChevronDown className="w-3.5 h-3.5" />}
        </div>
      </button>
    </div>
  );
};

function getStatusColor(status: UserListingStatus): string {
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
}

const ListingCardFooter: React.FC<{
  readonly listing: RentalListing;
  readonly cardTitle: string;
  readonly onStatusChange: (id: number, status: UserListingStatus) => void;
  readonly onOpenDrawer?: ((listing: RentalListing) => void) | undefined;
}> = ({ listing, cardTitle, onStatusChange, onOpenDrawer }) => {
  const e = listing.entities;

  const handleStatusChangeInternal = (newStatus: UserListingStatus) => {
    onStatusChange(listing.id, newStatus);
    toast.success(`Pipeline updated: marked as ${newStatus}`);
  };

  return (
    <div className="pt-3 border-t border-slate-800/80 flex items-center justify-between gap-2">
      <select
        aria-label={`Status for ${cardTitle}`}
        value={listing.userStatus}
        onChange={(ev) => handleStatusChangeInternal(ev.target.value as UserListingStatus)}
        className={`text-xs font-semibold px-2.5 py-1.5 rounded-lg border focus:outline-none cursor-pointer transition-colors duration-140 ease-[var(--ease-out)] ${getStatusColor(
          listing.userStatus,
        )}`}
      >
        <option value="new">Status: New</option>
        <option value="interested">⭐ Interested</option>
        <option value="called">📞 Called</option>
        <option value="applied">📝 Applied</option>
        <option value="rejected">❌ Rejected</option>
      </select>

      <div className="flex items-center gap-1.5">
        {onOpenDrawer && (
          <button
            type="button"
            aria-label={`Quick inspect ${cardTitle}`}
            onClick={() => onOpenDrawer(listing)}
            className="p-1.5 rounded-lg bg-emerald-600/20 hover:bg-emerald-600/40 text-emerald-300 border border-emerald-500/30 transition-[background-color,border-color,transform] duration-140 ease-[var(--ease-out)] active:scale-[0.97] flex items-center gap-1 text-xs font-semibold"
            title="Quick inspect in drawer"
          >
            <Eye className="w-3.5 h-3.5" />
            <span className="hidden sm:inline text-[11px]">Inspect</span>
          </button>
        )}

        {e.contactPhone && (
          <>
            <a
              href={`https://wa.me/91${e.contactPhone}?text=Hi%20${encodeURIComponent(
                listing.authorName,
              )}%2C%20saw%20your%20rental%20post%20for%20${encodeURIComponent(
                cardTitle,
              )}%20near%20PTP.%20Is%20it%20available%3F`}
              target="_blank"
              rel="noreferrer"
              aria-label={`WhatsApp ${listing.authorName}`}
              onClick={() => toast.info(`Opening WhatsApp for +91 ${e.contactPhone}`)}
              className="p-1.5 rounded-lg bg-emerald-600/20 hover:bg-emerald-600/40 text-emerald-400 border border-emerald-500/30 transition-[background-color,transform] duration-140 ease-[var(--ease-out)] active:scale-[0.97]"
              title={`WhatsApp ${listing.authorName}`}
            >
              <MessageCircle className="w-4 h-4" />
            </a>
            <a
              href={`tel:${e.contactPhone}`}
              aria-label={`Call ${listing.authorName}`}
              onClick={() => toast.info(`Calling +91 ${e.contactPhone}`)}
              className="p-1.5 rounded-lg bg-cyan-600/20 hover:bg-cyan-600/40 text-cyan-400 border border-cyan-500/30 transition-[background-color,transform] duration-140 ease-[var(--ease-out)] active:scale-[0.97]"
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
          aria-label="Open Original Facebook Post"
          className="p-1.5 rounded-lg bg-slate-800 hover:bg-slate-700 text-slate-300 border border-slate-700 transition-[background-color,border-color,transform] duration-140 ease-[var(--ease-out)] active:scale-[0.97]"
          title="Open Original Facebook Post"
        >
          <ExternalLink className="w-4 h-4" />
        </a>
      </div>
    </div>
  );
};

interface LightboxModalProps {
  readonly images: readonly string[];
  readonly activeImageIdx: number;
  readonly title: string;
  readonly onSelectIndex: (idx: number) => void;
  readonly onPrev: (ev: React.MouseEvent) => void;
  readonly onNext: (ev: React.MouseEvent) => void;
  readonly onClose: () => void;
}

const ListingLightboxModal: React.FC<LightboxModalProps> = ({
  images,
  activeImageIdx,
  title,
  onSelectIndex,
  onPrev,
  onNext,
  onClose,
}) => {
  return (
    <dialog
      open
      aria-modal="true"
      aria-label={`Photo gallery for ${title}`}
      className="fixed inset-0 z-50 m-0 h-full w-full max-w-none max-h-none bg-slate-950/95 backdrop-blur-xl flex flex-col items-center justify-center p-4 transition-opacity duration-200 ease-[var(--ease-out)] border-0"
    >
      <button
        type="button"
        aria-label="Close photo lightbox backdrop"
        onClick={onClose}
        className="absolute inset-0 w-full h-full cursor-default"
      />

      <div className="absolute top-4 left-4 right-4 flex items-center justify-between text-white z-20 pointer-events-none">
        <div className="text-sm font-semibold flex items-center gap-2 pointer-events-auto">
          <span>{title}</span>
          <span className="text-slate-400 font-mono tabular-nums text-xs">
            ({activeImageIdx + 1} of {images.length})
          </span>
        </div>
        <button
          type="button"
          aria-label="Close photo lightbox"
          onClick={onClose}
          className="p-2 rounded-xl bg-slate-900/80 hover:bg-slate-800 border border-slate-700 text-white transition-colors duration-140 ease-[var(--ease-out)] active:scale-[0.97] pointer-events-auto"
          title="Close (Esc)"
        >
          <X className="w-5 h-5" />
        </button>
      </div>

      <div className="relative max-w-5xl max-h-[85vh] flex items-center justify-center transition-[transform,opacity] duration-200 ease-[var(--ease-out)] z-10">
        <img
          src={images[activeImageIdx]}
          alt={title}
          className="max-w-full max-h-[80vh] object-contain rounded-xl shadow-2xl border border-slate-800"
        />

        {images.length > 1 && (
          <>
            <button
              type="button"
              aria-label="Previous image"
              onClick={onPrev}
              className="absolute left-3 top-1/2 -translate-y-1/2 p-2.5 rounded-full bg-slate-900/80 hover:bg-slate-800 text-white border border-slate-700 shadow-2xl transition-[transform,background-color] duration-140 ease-[var(--ease-out)] active:scale-[0.97]"
              title="Previous image (←)"
            >
              <ChevronLeft className="w-6 h-6" />
            </button>

            <button
              type="button"
              aria-label="Next image"
              onClick={onNext}
              className="absolute right-3 top-1/2 -translate-y-1/2 p-2.5 rounded-full bg-slate-900/80 hover:bg-slate-800 text-white border border-slate-700 shadow-2xl transition-[transform,background-color] duration-140 ease-[var(--ease-out)] active:scale-[0.97]"
              title="Next image (→)"
            >
              <ChevronRight className="w-6 h-6" />
            </button>
          </>
        )}
      </div>

      {images.length > 1 && (
        <div className="absolute bottom-4 flex items-center gap-2 p-2 bg-slate-900/80 backdrop-blur-md rounded-2xl border border-slate-800 max-w-md overflow-x-auto z-20">
          {images.map((imgUrl, idx) => (
            <button
              key={imgUrl}
              type="button"
              aria-label={`View thumbnail ${idx + 1}`}
              onClick={() => onSelectIndex(idx)}
              className={`w-12 h-12 rounded-lg overflow-hidden shrink-0 border-2 transition-[border-color,opacity,transform] duration-140 ease-[var(--ease-out)] active:scale-[0.97] ${
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
    </dialog>
  );
};

/**
 * Interactive card displaying a canonical Bangalore rental listing with Google Maps deep links.
 */
export const ListingCard: React.FC<ListingCardProps> = ({
  listing,
  onStatusChange,
  onOpenScoreModal,
  onOpenDrawer,
}) => {
  const [activeImageIdx, setActiveImageIdx] = useState(0);
  const [isLightboxOpen, setIsLightboxOpen] = useState(false);

  const e = listing.entities;
  const images = listing.imageUrls || e.imageUrls || [];
  const cardTitle = e.societyName || listing.location;

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

  return (
    <>
      <div className="glass-panel glass-panel-hover p-5 rounded-2xl flex flex-col justify-between relative overflow-hidden group">
        <div>
          <ListingPhotoBanner
            images={images}
            activeImageIdx={activeImageIdx}
            title={cardTitle}
            onSelectIndex={setActiveImageIdx}
            onPrev={handlePrevImage}
            onNext={handleNextImage}
            onOpenLightbox={() => setIsLightboxOpen(true)}
            onQuickInspect={onOpenDrawer ? () => onOpenDrawer(listing) : undefined}
          />

          <ListingAuthorBar listing={listing} />

          <div className="flex items-start justify-between gap-3 mb-3">
            <div className="min-w-0">
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
              <ListingMapsLinksRow listing={listing} />
            </div>

            <RatingBadge
              score={listing.score}
              tier={listing.tier}
              onClick={() => onOpenScoreModal(listing)}
            />
          </div>

          <div className="flex items-baseline gap-2 mb-4 pb-3 border-b border-slate-800/80">
            <div className="text-2xl font-extrabold text-white font-mono tabular-nums">
              {e.rent ? `₹${e.rent.toLocaleString('en-IN')}` : 'Contact for Rent'}
            </div>
            <span className="text-xs text-slate-400">/ month</span>

            {e.deposit && (
              <span className="text-xs text-slate-400 ml-auto font-mono tabular-nums">
                Dep: ₹{e.deposit.toLocaleString('en-IN')}
              </span>
            )}
          </div>

          <div className="mb-4">
            <CommutePill commute={listing.commute} />
          </div>

          <ListingFeatureTags listing={listing} />

          <ListingExpandableDescription rawText={listing.rawText} />

          {e.contactPhone && (
            <div className="flex items-center justify-between bg-slate-900/90 border border-slate-800 px-3 py-2 rounded-xl mb-4 text-xs">
              <span className="text-slate-400 flex items-center gap-1.5 font-medium">
                <Phone className="w-3.5 h-3.5 text-cyan-400" />
                Phone:
              </span>
              <button
                type="button"
                aria-label={`Copy phone number ${e.contactPhone}`}
                onClick={() => {
                  navigator.clipboard.writeText(e.contactPhone ?? '');
                  toast.info(`Copied phone: +91 ${e.contactPhone}`);
                }}
                className="font-mono tabular-nums font-bold text-white tracking-wider hover:text-cyan-300 transition-colors duration-140 ease-[var(--ease-out)] active:scale-[0.97]"
                title="Click to copy phone number"
              >
                +91 {e.contactPhone}
              </button>
            </div>
          )}
        </div>

        <ListingCardFooter
          listing={listing}
          cardTitle={cardTitle}
          onStatusChange={onStatusChange}
          onOpenDrawer={onOpenDrawer}
        />
      </div>

      {isLightboxOpen && images.length > 0 && (
        <ListingLightboxModal
          images={images}
          activeImageIdx={activeImageIdx}
          title={cardTitle}
          onSelectIndex={setActiveImageIdx}
          onPrev={handlePrevImage}
          onNext={handleNextImage}
          onClose={() => setIsLightboxOpen(false)}
        />
      )}
    </>
  );
};
