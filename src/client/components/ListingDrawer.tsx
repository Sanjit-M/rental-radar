import React, { useState, useEffect, useRef } from 'react';
import {
  type RentalListing,
  type UserListingStatus,
  buildSocietyMapsUrl,
  buildLandmarkMapsUrl,
  buildLocalityMapsUrl,
} from '../../domain/types';
import { RatingBadge } from './RatingBadge';
import { toast } from './ToastStack';
import {
  X,
  ExternalLink,
  Phone,
  MessageCircle,
  Clock,
  User,
  Building2,
  Waves,
  Zap,
  Bath,
  Droplets,
  ShieldCheck,
  ChevronLeft,
  ChevronRight,
  Sparkles,
  Compass,
  AlertTriangle,
  Leaf,
  Copy,
  Check,
  MapPin,
  Layers,
} from 'lucide-react';

const DRAWER_IST_FORMATTER = new Intl.DateTimeFormat('en-IN', {
  day: '2-digit',
  month: 'short',
  year: 'numeric',
  hour: '2-digit',
  minute: '2-digit',
  hour12: true,
  timeZone: 'Asia/Kolkata',
});

function formatDrawerScrapedTimeIST(createdAt: string | undefined): string {
  if (!createdAt) return 'Unknown';
  const normalized = createdAt.includes('T')
    ? createdAt
    : `${createdAt.replace(' ', 'T')}Z`;
  const parsed = new Date(normalized);
  if (Number.isNaN(parsed.getTime())) return createdAt;
  return `${DRAWER_IST_FORMATTER.format(parsed)} IST`;
}

export interface ListingDrawerProps {
  readonly listing: RentalListing | null;
  readonly isOpen: boolean;
  readonly onClose: () => void;
  readonly onStatusChange: (id: number, status: UserListingStatus) => void;
  readonly onOpenScoreModal: (listing: RentalListing) => void;
}

export interface TouchSample {
  readonly y: number;
  readonly time: number;
}

/**
 * Computes release velocity in px/ms from recent touch samples.
 */
export function computeReleaseVelocity(
  history: readonly TouchSample[],
  windowMs: number = 100,
): number {
  if (history.length < 2) return 0;
  const now = history[history.length - 1]?.time ?? 0;
  const recent = history.filter((s) => now - s.time <= windowMs);
  if (recent.length < 2) return 0;
  const first = recent[0];
  const last = recent[recent.length - 1];
  if (!first || !last) return 0;
  const dt = last.time - first.time;
  if (dt <= 0) return 0;
  return (last.y - first.y) / dt;
}

/**
 * Apple fluid interface momentum projection formula.
 * Deceleration rate d = 0.998 corresponds to standard physical scroll/swipe decay.
 * Projects resting endpoint: (vy * 1000) * 0.998 / (1 - 0.998)
 */
export function projectMomentum(
  vy: number,
  decelerationRate: number = 0.998,
): number {
  return ((vy * 1000) * decelerationRate) / (1 - decelerationRate);
}

/**
 * Projects the final resting position of a gesture given current delta and release velocity.
 */
export function projectRestingEndpoint(
  currentDeltaY: number,
  vy: number,
  decelerationRate: number = 0.998,
): number {
  return currentDeltaY + projectMomentum(vy, decelerationRate);
}

/**
 * Detects Bangalore water source mentions (Cauvery, Borewell, Tanker, 24/7) from raw post text.
 */
export function detectWaterSource(rawText: string): {
  readonly label: string;
  readonly isCauvery: boolean;
} {
  const lower = rawText.toLowerCase();
  if (lower.includes('cauvery') || lower.includes('kaveri')) {
    return { label: 'Cauvery Water Available', isCauvery: true };
  }
  if (lower.includes('borewell') && lower.includes('tanker')) {
    return { label: 'Borewell + Tanker Supply', isCauvery: false };
  }
  if (lower.includes('borewell')) {
    return { label: 'Borewell Water', isCauvery: false };
  }
  if (lower.includes('tanker')) {
    return { label: 'Tanker Water Supply', isCauvery: false };
  }
  if (
    lower.includes('24/7 water') ||
    lower.includes('24 hrs water') ||
    lower.includes('24 hours water')
  ) {
    return { label: '24/7 Running Water Supply', isCauvery: false };
  }
  return { label: 'Water Source Not Specified', isCauvery: false };
}

const DrawerMapsLinks: React.FC<{ readonly listing: RentalListing }> = ({ listing }) => {
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
        <span className="text-[10px] font-semibold uppercase tracking-wider px-2 py-0.5 rounded bg-[#18181C] text-zinc-300 border border-white/[0.08]">
          {listing.zone}
        </span>
      )}

      {societyUrl && e.societyName && (
        <a
          href={societyUrl}
          target="_blank"
          rel="noreferrer"
          className="inline-flex items-center gap-1 text-xs font-medium px-2.5 py-0.5 rounded-md bg-[#09090B] hover:bg-[#18181C] text-zinc-200 border border-white/[0.08] transition-colors"
          title={`Open ${e.societyName} in Google Maps`}
        >
          <MapPin className="w-3 h-3 text-emerald-400 shrink-0" />
          <span>{e.societyName}</span>
          <ExternalLink className="w-2.5 h-2.5 text-zinc-500 shrink-0" />
        </a>
      )}

      <a
        href={localityUrl}
        target="_blank"
        rel="noreferrer"
        className="inline-flex items-center gap-1 text-xs font-medium px-2.5 py-0.5 rounded-md bg-[#09090B] hover:bg-[#18181C] text-zinc-200 border border-white/[0.08] transition-colors"
        title={`Open ${listing.location} in Google Maps`}
      >
        <MapPin className="w-3 h-3 text-zinc-400 shrink-0" />
        <span>{listing.location}</span>
        <ExternalLink className="w-2.5 h-2.5 text-zinc-500 shrink-0" />
      </a>

      {landmarkUrl && landmark && (
        <a
          href={landmarkUrl}
          target="_blank"
          rel="noreferrer"
          className="inline-flex items-center gap-1 text-xs font-medium px-2.5 py-0.5 rounded-md bg-[#09090B] hover:bg-[#18181C] text-zinc-400 border border-white/[0.07] transition-colors"
          title={`Open ${landmark} in Google Maps`}
        >
          <MapPin className="w-3 h-3 text-zinc-500 shrink-0" />
          <span>{landmark}</span>
        </a>
      )}
    </div>
  );
};

const DrawerPhotoCarousel: React.FC<{ readonly images: readonly string[] }> = ({
  images,
}) => {
  const [activeImgIdx, setActiveImgIdx] = useState(0);

  if (images.length === 0) {
    return null;
  }

  return (
    <div className="space-y-2">
      <div className="relative aspect-video rounded-xl overflow-hidden bg-[#09090B] border border-white/[0.08] group">
        <img
          src={images[activeImgIdx]}
          alt="Rental Listing"
          className="w-full h-full object-cover"
        />

        {images.length > 1 && (
          <>
            <button
              type="button"
              aria-label="Previous photo"
              onClick={() =>
                setActiveImgIdx((prev) => (prev > 0 ? prev - 1 : images.length - 1))
              }
              className="absolute left-3 top-1/2 -translate-y-1/2 p-2 rounded-full bg-zinc-950/80 hover:bg-zinc-950 text-white border border-white/15 shadow-lg transition-[transform,background-color] duration-140 ease-[var(--ease-out)] active:scale-[0.97]"
            >
              <ChevronLeft className="w-4 h-4" />
            </button>
            <button
              type="button"
              aria-label="Next photo"
              onClick={() =>
                setActiveImgIdx((prev) => (prev < images.length - 1 ? prev + 1 : 0))
              }
              className="absolute right-3 top-1/2 -translate-y-1/2 p-2 rounded-full bg-zinc-950/80 hover:bg-zinc-950 text-white border border-white/15 shadow-lg transition-[transform,background-color] duration-140 ease-[var(--ease-out)] active:scale-[0.97]"
            >
              <ChevronRight className="w-4 h-4" />
            </button>
            <div className="absolute bottom-2 right-2 bg-zinc-950/90 backdrop-blur-md px-2.5 py-1 rounded-full text-[11px] font-mono tabular-nums text-zinc-200 border border-white/10">
              {activeImgIdx + 1} / {images.length}
            </div>
          </>
        )}
      </div>

      {images.length > 1 && (
        <div className="flex items-center gap-2 overflow-x-auto pb-1">
          {images.map((img, idx) => (
            <button
              key={img}
              type="button"
              aria-label={`Select thumbnail ${idx + 1}`}
              onClick={() => setActiveImgIdx(idx)}
              className={`w-14 h-14 rounded-lg overflow-hidden shrink-0 border-2 transition-[border-color,opacity,transform] duration-140 ease-[var(--ease-out)] active:scale-[0.97] ${
                idx === activeImgIdx
                  ? 'border-emerald-400 scale-105'
                  : 'border-transparent opacity-60 hover:opacity-100'
              }`}
            >
              <img src={img} alt="" className="w-full h-full object-cover" />
            </button>
          ))}
        </div>
      )}
    </div>
  );
};

const DrawerProvenancePanel: React.FC<{ readonly listing: RentalListing }> = ({ listing }) => {
  const scrapedIST = formatDrawerScrapedTimeIST(listing.createdAt);
  const allGroups = listing.groupNames && listing.groupNames.length > 0
    ? listing.groupNames
    : [listing.groupName];

  return (
    <div className="p-3.5 rounded-xl bg-[#09090B] border border-white/[0.07] space-y-2.5 text-xs">
      <div className="flex items-center justify-between gap-2">
        <div className="flex items-center gap-2 min-w-0">
          <div className="w-8 h-8 rounded-lg bg-[#141418] border border-white/[0.08] flex items-center justify-center text-zinc-300 font-semibold shrink-0">
            <User className="w-4 h-4 text-zinc-400" />
          </div>
          <div className="min-w-0">
            <div className="font-semibold text-zinc-100 truncate">{listing.authorName}</div>
            <div className="text-[11px] text-zinc-400 font-mono tabular-nums flex items-center gap-1.5 flex-wrap">
              <span className="inline-flex items-center gap-1 text-emerald-400">
                <Clock className="w-3 h-3" /> Posted {listing.postedTime}
              </span>
              <span className="text-zinc-600">·</span>
              <span>Scraped {scrapedIST}</span>
            </div>
          </div>
        </div>

        <a
          href={listing.postUrl}
          target="_blank"
          rel="noreferrer"
          className="inline-flex items-center gap-1.5 px-2.5 py-1.5 rounded-lg bg-zinc-100 hover:bg-white text-zinc-950 font-semibold text-xs transition-[background-color,transform] duration-140 ease-[var(--ease-out)] active:scale-[0.97] shrink-0"
        >
          <span>View Post</span>
          <ExternalLink className="w-3.5 h-3.5" />
        </a>
      </div>

      <div className="pt-2 border-t border-white/[0.05] flex items-center gap-1.5 flex-wrap text-[11px] text-zinc-400">
        <Layers className="w-3 h-3 text-zinc-500 shrink-0" />
        <span>Source Group{allGroups.length > 1 ? 's' : ''}:</span>
        {allGroups.map((grp) => (
          <span
            key={grp}
            className="px-2 py-0.5 rounded bg-[#141418] text-zinc-300 border border-white/[0.06]"
          >
            {grp}
          </span>
        ))}
      </div>
    </div>
  );
};

const DrawerCommutePanel: React.FC<{ readonly listing: RentalListing }> = ({
  listing,
}) => {
  const e = listing.entities;
  const depositMultiple =
    e.rent && e.deposit ? (e.deposit / e.rent).toFixed(1) : null;

  return (
    <>
      <div className="grid grid-cols-2 gap-3">
        <div className="p-3.5 rounded-xl bg-[#09090B] border border-white/[0.07] space-y-1">
          <div className="text-[11px] text-zinc-400 font-medium">Monthly Rent</div>
          <div className="text-xl font-semibold font-mono tabular-nums text-zinc-50">
            {e.rent ? `₹${e.rent.toLocaleString('en-IN')}` : 'See post text'}
          </div>
          <div className="text-[10px] text-zinc-500 font-mono">per calendar month</div>
        </div>

        <div className="p-3.5 rounded-xl bg-[#09090B] border border-white/[0.07] space-y-1">
          <div className="text-[11px] text-zinc-400 font-medium">Security Deposit</div>
          <div className="text-xl font-semibold font-mono tabular-nums text-zinc-50">
            {e.deposit ? `₹${e.deposit.toLocaleString('en-IN')}` : 'Negotiable'}
          </div>
          <div className="text-[10px] text-zinc-400 font-mono tabular-nums">
            {depositMultiple ? `${depositMultiple}x monthly rent` : 'Standard terms'}
          </div>
        </div>
      </div>

      <div className="p-3.5 rounded-xl bg-[#09090B] border border-white/[0.07] space-y-3">
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-2">
            <Compass className="w-4 h-4 text-emerald-400" />
            <span className="text-xs font-semibold text-zinc-200">
              Prestige Tech Park (PTP) Commute
            </span>
          </div>
          <span className="text-xs font-mono tabular-nums font-semibold text-emerald-400">
            {listing.commute.twoWayAvgPeakMins}m average peak
          </span>
        </div>

        <div className="grid grid-cols-3 gap-2 text-center text-xs">
          <div className="p-2 rounded-lg bg-[#141418] border border-white/[0.06]">
            <div className="text-[10px] text-zinc-400 font-medium">Morning 11am</div>
            <div className="text-sm font-semibold font-mono tabular-nums text-zinc-100 mt-0.5">
              {listing.commute.inboundMins} mins
            </div>
          </div>
          <div className="p-2 rounded-lg bg-[#141418] border border-white/[0.06]">
            <div className="text-[10px] text-zinc-400 font-medium">Evening 5pm</div>
            <div className="text-sm font-semibold font-mono tabular-nums text-zinc-100 mt-0.5">
              {listing.commute.outboundMins} mins
            </div>
          </div>
          <div className="p-2 rounded-lg bg-[#141418] border border-white/[0.06]">
            <div className="text-[10px] text-zinc-400 font-medium">Distance</div>
            <div className="text-sm font-semibold font-mono tabular-nums text-zinc-100 mt-0.5">
              {listing.commute.distanceKm} km
            </div>
          </div>
        </div>

        <div className="text-[11px] flex items-center gap-2 pt-0.5">
          {e.isKadubeesanahalliDirect ? (
            <span className="text-emerald-400 flex items-center gap-1 font-medium">
              <Check className="w-3.5 h-3.5" /> Direct PTP/Cessna side (Bypasses Panathur underpass bottleneck)
            </span>
          ) : (
            <span className="text-amber-400 flex items-center gap-1 font-medium">
              <AlertTriangle className="w-3.5 h-3.5" /> Involves Panathur Railway Underpass crossing
            </span>
          )}
        </div>
      </div>
    </>
  );
};

const DrawerSpecsSection: React.FC<{ readonly listing: RentalListing }> = ({ listing }) => {
  const e = listing.entities;
  const waterInfo = detectWaterSource(listing.rawText);

  return (
    <div className="space-y-2">
      <h4 className="text-[11px] font-semibold uppercase tracking-wider text-zinc-400">
        Property Specs
      </h4>
      <div className="flex flex-wrap gap-1.5 text-xs">
        {e.isBrokerage ? (
          <span className="px-2.5 py-1 rounded-lg bg-rose-950/40 text-rose-300 border border-rose-500/30 flex items-center gap-1.5 font-medium">
            Broker Fee Applicable
          </span>
        ) : (
          <span className="px-2.5 py-1 rounded-lg bg-emerald-950/40 text-emerald-300 border border-emerald-500/30 flex items-center gap-1.5 font-medium">
            <ShieldCheck className="w-3.5 h-3.5 text-emerald-400" /> Direct Owner / Zero Brokerage
          </span>
        )}

        <span className="px-2.5 py-1 rounded-lg bg-[#141418] text-zinc-300 border border-white/[0.07] flex items-center gap-1.5">
          <Droplets className="w-3.5 h-3.5 text-zinc-400" />
          {waterInfo.label}
        </span>

        <span className="px-2.5 py-1 rounded-lg bg-[#141418] text-zinc-300 border border-white/[0.07]">
          {e.furnishing}
        </span>

        {e.isGatedSociety && (
          <span className="px-2.5 py-1 rounded-lg bg-[#141418] text-zinc-300 border border-white/[0.07] flex items-center gap-1.5">
            <Building2 className="w-3.5 h-3.5 text-zinc-400" /> Gated Society
          </span>
        )}

        {e.hasSwimmingPool && (
          <span className="px-2.5 py-1 rounded-lg bg-[#141418] text-zinc-300 border border-white/[0.07] flex items-center gap-1.5">
            <Waves className="w-3.5 h-3.5 text-zinc-400" /> Swimming Pool
          </span>
        )}

        {e.hasPowerBackup && (
          <span className="px-2.5 py-1 rounded-lg bg-[#141418] text-zinc-300 border border-white/[0.07] flex items-center gap-1.5">
            <Zap className="w-3.5 h-3.5 text-zinc-400" /> 100% Generator Backup
          </span>
        )}

        {e.hasAttachedWashroom && (
          <span className="px-2.5 py-1 rounded-lg bg-[#141418] text-zinc-300 border border-white/[0.07] flex items-center gap-1.5">
            <Bath className="w-3.5 h-3.5 text-zinc-400" /> Attached Washroom
          </span>
        )}

        {e.isVegetarianOnly && (
          <span className="px-2.5 py-1 rounded-lg bg-amber-950/40 text-amber-300 border border-amber-500/30 flex items-center gap-1.5 font-medium">
            <Leaf className="w-3.5 h-3.5 text-amber-400" /> Strict Vegetarian Only
          </span>
        )}
      </div>
    </div>
  );
};

const DrawerPostAndContactSection: React.FC<{ readonly listing: RentalListing }> = ({
  listing,
}) => {
  const [isCopied, setIsCopied] = useState(false);
  const e = listing.entities;

  const handleCopyText = (text: string) => {
    navigator.clipboard.writeText(text);
    setIsCopied(true);
    toast.info('Post text copied to clipboard');
    setTimeout(() => setIsCopied(false), 2000);
  };

  return (
    <>
      <div className="space-y-2">
        <div className="flex items-center justify-between text-xs">
          <span className="font-semibold uppercase tracking-wider text-zinc-400 text-[11px]">
            Original Facebook Post Text
          </span>
          <button
            type="button"
            onClick={() => handleCopyText(listing.rawText)}
            className="flex items-center gap-1 text-[11px] text-zinc-300 hover:text-zinc-100 font-medium transition-colors duration-140 ease-[var(--ease-out)] active:scale-[0.97]"
          >
            {isCopied ? (
              <Check className="w-3.5 h-3.5 text-emerald-400" />
            ) : (
              <Copy className="w-3.5 h-3.5" />
            )}
            <span>{isCopied ? 'Copied!' : 'Copy Text'}</span>
          </button>
        </div>
        <div className="p-3.5 rounded-xl bg-[#09090B] border border-white/[0.07] text-[13px] text-zinc-300 leading-relaxed whitespace-pre-line font-sans">
          {listing.rawText}
        </div>
      </div>

      {e.contactPhone && (
        <div className="p-3.5 rounded-xl bg-[#09090B] border border-white/[0.08] flex items-center justify-between">
          <div>
            <span className="text-[11px] text-zinc-400 font-medium block">
              Direct Contact Number
            </span>
            <span className="text-base font-mono tabular-nums font-semibold text-zinc-100 tracking-wider">
              +91 {e.contactPhone}
            </span>
          </div>
          <div className="flex items-center gap-2">
            <a
              href={`tel:${e.contactPhone}`}
              onClick={() => toast.info(`Calling +91 ${e.contactPhone}`)}
              className="px-3 py-1.5 rounded-lg bg-[#18181C] hover:bg-zinc-800 text-zinc-100 border border-white/[0.08] font-medium text-xs flex items-center gap-1.5 transition-[background-color,transform] duration-140 ease-[var(--ease-out)] active:scale-[0.97]"
            >
              <Phone className="w-3.5 h-3.5" /> Call
            </a>
            <a
              href={`https://wa.me/91${e.contactPhone}?text=Hi%20${encodeURIComponent(
                listing.authorName,
              )}%2C%20saw%20your%20rental%20post%20for%20${encodeURIComponent(
                e.societyName || listing.location,
              )}%20near%20PTP.%20Is%20it%20available%3F`}
              target="_blank"
              rel="noreferrer"
              onClick={() => toast.info(`Opening WhatsApp for +91 ${e.contactPhone}`)}
              className="px-3 py-1.5 rounded-lg bg-emerald-500 hover:bg-emerald-400 text-zinc-950 font-semibold text-xs flex items-center gap-1.5 transition-[background-color,transform] duration-140 ease-[var(--ease-out)] active:scale-[0.97]"
            >
              <MessageCircle className="w-3.5 h-3.5" /> WhatsApp
            </a>
          </div>
        </div>
      )}
    </>
  );
};

const STATUS_OPTIONS: readonly {
  readonly id: UserListingStatus;
  readonly label: string;
}[] = [
  { id: 'new', label: 'New' },
  { id: 'interested', label: 'Interested' },
  { id: 'called', label: 'Called' },
  { id: 'applied', label: 'Applied' },
  { id: 'rejected', label: 'Rejected' },
];

const DrawerFooterBar: React.FC<{
  readonly listing: RentalListing;
  readonly onStatusChange: (id: number, status: UserListingStatus) => void;
  readonly onOpenScoreModal: (listing: RentalListing) => void;
}> = ({ listing, onStatusChange, onOpenScoreModal }) => {
  const handleStatusSelect = (status: UserListingStatus) => {
    onStatusChange(listing.id, status);
    toast.success(`Pipeline updated: marked as ${status}`);
  };

  return (
    <div className="p-4 bg-[#0C0C0F] border-t border-white/[0.07] space-y-3">
      <div className="flex items-center justify-between gap-1.5">
        <span className="text-[11px] text-zinc-400 font-medium shrink-0">Pipeline:</span>
        <div className="flex items-center gap-1.5 overflow-x-auto pb-0.5">
          {STATUS_OPTIONS.map((opt) => (
            <button
              key={opt.id}
              type="button"
              onClick={() => handleStatusSelect(opt.id)}
              className={`px-2.5 py-1 rounded-lg text-xs font-medium border transition-[color,background-color,border-color,transform] duration-140 ease-[var(--ease-out)] active:scale-[0.97] ${
                listing.userStatus === opt.id
                  ? 'bg-zinc-100 text-zinc-950 border-zinc-200 font-semibold'
                  : 'bg-[#141418] text-zinc-400 border-white/[0.07] hover:text-zinc-200'
              }`}
            >
              {opt.label}
            </button>
          ))}
        </div>
      </div>

      <div className="flex items-center gap-2.5">
        <button
          type="button"
          onClick={() => onOpenScoreModal(listing)}
          className="flex-1 py-2 rounded-lg bg-[#141418] hover:bg-zinc-800 text-zinc-200 border border-white/[0.08] font-medium text-xs flex items-center justify-center gap-1.5 transition-[background-color,transform] duration-140 ease-[var(--ease-out)] active:scale-[0.97]"
        >
          <Sparkles className="w-3.5 h-3.5 text-emerald-400" />
          <span>Score Breakdown</span>
        </button>

        <a
          href={listing.postUrl}
          target="_blank"
          rel="noreferrer"
          className="flex-1 py-2 rounded-lg bg-zinc-100 hover:bg-white text-zinc-950 font-semibold text-xs flex items-center justify-center gap-1.5 transition-[background-color,transform] duration-140 ease-[var(--ease-out)] active:scale-[0.97]"
        >
          <ExternalLink className="w-3.5 h-3.5" />
          <span>Open Facebook Post</span>
        </a>
      </div>
    </div>
  );
};

interface DrawerContentProps {
  readonly listing: RentalListing;
  readonly onClose: () => void;
  readonly onStatusChange: (id: number, status: UserListingStatus) => void;
  readonly onOpenScoreModal: (listing: RentalListing) => void;
}

const DrawerPanelContent: React.FC<DrawerContentProps> = ({
  listing,
  onClose,
  onStatusChange,
  onOpenScoreModal,
}) => {
  const [touchDeltaY, setTouchDeltaY] = useState(0);
  const [isDragging, setIsDragging] = useState(false);
  const touchStartY = useRef<number>(0);
  const touchHistory = useRef<TouchSample[]>([]);

  const e = listing.entities;
  const images = listing.imageUrls ?? e.imageUrls ?? [];

  const handleTouchStart = (ev: React.TouchEvent<HTMLDivElement>) => {
    const touch = ev.touches[0];
    if (touch) {
      const now = performance.now();
      touchStartY.current = touch.clientY;
      touchHistory.current = [{ y: touch.clientY, time: now }];
      setIsDragging(true);
    }
  };

  const handleTouchMove = (ev: React.TouchEvent<HTMLDivElement>) => {
    if (!isDragging) return;
    const touch = ev.touches[0];
    if (touch) {
      const now = performance.now();
      touchHistory.current.push({ y: touch.clientY, time: now });
      touchHistory.current = touchHistory.current.filter((s) => now - s.time <= 100);
      const delta = touch.clientY - touchStartY.current;
      if (delta > 0) {
        setTouchDeltaY(delta);
      }
    }
  };

  const handleTouchEnd = () => {
    const vyPxPerMs = computeReleaseVelocity(touchHistory.current);
    const vy = vyPxPerMs / 1000;
    const projectedEndpoint = projectRestingEndpoint(touchDeltaY, vy);

    if (projectedEndpoint > 140 || touchDeltaY > 120) {
      onClose();
    }
    setTouchDeltaY(0);
    setIsDragging(false);
    touchHistory.current = [];
  };

  return (
    <div
      style={{
        transform: touchDeltaY > 0 ? `translateY(${touchDeltaY}px)` : undefined,
        transition: isDragging ? 'none' : 'transform 260ms var(--ease-drawer)',
      }}
      className="relative z-10 w-full md:max-w-xl h-full bg-[#111114] border-t md:border-t-0 md:border-l border-white/[0.09] shadow-2xl flex flex-col justify-between overflow-hidden fixed md:static inset-x-0 bottom-0 md:inset-auto max-h-[92vh] md:max-h-full rounded-t-2xl md:rounded-t-none"
    >
      <div
        onTouchStart={handleTouchStart}
        onTouchMove={handleTouchMove}
        onTouchEnd={handleTouchEnd}
        className="w-full py-2.5 flex justify-center cursor-grab active:cursor-grabbing md:hidden select-none bg-[#111114] border-b border-white/[0.06]"
      >
        <div className="w-10 h-1 bg-zinc-700 rounded-full" />
      </div>

      <div className="overflow-y-auto flex-1 p-5 space-y-5">
        <div className="flex items-start justify-between gap-3">
          <div>
            <div className="flex items-center gap-2 flex-wrap">
              <span className="text-xs font-medium px-2 py-0.5 rounded bg-[#18181C] text-zinc-200 border border-white/[0.08]">
                {listing.bhkType}
              </span>
              <span className="text-xs text-zinc-400">
                {e.societyName ? `in ${e.societyName}` : listing.location}
              </span>
            </div>
            <h2 className="text-lg font-semibold tracking-[-0.015em] text-zinc-50 mt-1 leading-snug">
              {e.societyName || listing.location}
            </h2>
            <DrawerMapsLinks listing={listing} />
          </div>

          <div className="flex items-center gap-2 shrink-0">
            <RatingBadge
              score={listing.score}
              tier={listing.tier}
              onClick={() => onOpenScoreModal(listing)}
            />
            <button
              type="button"
              aria-label="Close drawer"
              onClick={onClose}
              className="p-1.5 rounded-lg bg-[#18181C] hover:bg-zinc-800 text-zinc-400 hover:text-zinc-100 border border-white/[0.07] transition-colors duration-140 ease-[var(--ease-out)] active:scale-[0.97]"
              title="Close drawer"
            >
              <X className="w-4 h-4" />
            </button>
          </div>
        </div>

        <DrawerProvenancePanel listing={listing} />

        <DrawerPhotoCarousel images={images} />

        <DrawerCommutePanel listing={listing} />

        <DrawerSpecsSection listing={listing} />

        <DrawerPostAndContactSection listing={listing} />
      </div>

      <DrawerFooterBar
        listing={listing}
        onStatusChange={onStatusChange}
        onOpenScoreModal={onOpenScoreModal}
      />
    </div>
  );
};

/**
 * Slide-over and mobile bottom-sheet drawer for inspecting a rental listing.
 */
export const ListingDrawer: React.FC<ListingDrawerProps> = ({
  listing,
  isOpen,
  onClose,
  onStatusChange,
  onOpenScoreModal,
}) => {
  useEffect(() => {
    if (!isOpen) return;

    const handleKeyDown = (e: KeyboardEvent) => {
      if (e.key === 'Escape') {
        onClose();
      }
    };

    window.addEventListener('keydown', handleKeyDown);
    return () => window.removeEventListener('keydown', handleKeyDown);
  }, [isOpen, onClose]);

  if (!isOpen || !listing) return null;

  return (
    <dialog
      open
      aria-modal="true"
      aria-label={`Listing inspection for ${listing.entities.societyName || listing.location}`}
      className="fixed inset-0 z-50 m-0 h-full w-full max-w-none max-h-none bg-zinc-950/80 backdrop-blur-sm flex justify-end border-0 p-0"
    >
      <button
        type="button"
        aria-label="Close listing drawer backdrop"
        onClick={onClose}
        className="fixed inset-0 w-full h-full cursor-default"
      />
      <DrawerPanelContent
        key={listing.id}
        listing={listing}
        onClose={onClose}
        onStatusChange={onStatusChange}
        onOpenScoreModal={onOpenScoreModal}
      />
    </dialog>
  );
};
