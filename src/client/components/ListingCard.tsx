import React, { useState, useEffect } from 'react';
import {
  type RentalListing,
  type UserListingStatus,
  buildSocietyMapsUrl,
  buildLandmarkMapsUrl,
  buildLocalityMapsUrl,
} from '../../domain/types';
import { RatingBadge } from './RatingBadge';
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
  Bike,
} from 'lucide-react';

const CARD_IST_FORMATTER = new Intl.DateTimeFormat('en-IN', {
  day: '2-digit',
  month: 'short',
  hour: '2-digit',
  minute: '2-digit',
  hour12: true,
  timeZone: 'Asia/Kolkata',
});

function formatListingTimestampIST(createdAt: string | undefined): string {
  if (!createdAt) return '';
  const normalized = createdAt.includes('T')
    ? createdAt
    : `${createdAt.replace(' ', 'T')}Z`;
  const parsed = new Date(normalized);
  if (Number.isNaN(parsed.getTime())) return createdAt;
  return CARD_IST_FORMATTER.format(parsed);
}

function cleanDisplayDescription(
  rawText: string,
  groupName: string,
  authorName: string,
): string {
  if (!rawText) return '';
  const groupLower = groupName.trim().toLowerCase();
  const authorLower = authorName.trim().toLowerCase();

  let cleaned = rawText
    .replace(/Shared with Public group/gi, '')
    .replace(/Shared with Members/gi, '')
    .replace(/󰞋/g, '');

  const rawLines = cleaned
    .split(/\r?\n/)
    .map((line) => line.trim())
    .filter((line) => line.length > 0);

  let startIndex = 0;
  while (startIndex < rawLines.length && startIndex < 6) {
    const candidate = rawLines[startIndex];
    if (!candidate) break;
    const lower = candidate.toLowerCase();
    const isGroupHeader =
      (groupLower.length > 2 && (lower === groupLower || groupLower.includes(lower))) ||
      /^flat\s*(and|&)\s*flatmates/i.test(candidate);
    const isAuthorHeader =
      authorLower.length > 1 &&
      authorLower !== 'facebook member' &&
      (lower === authorLower || lower.startsWith(`${authorLower} ·`));
    const isMetaNoise =
      /^(top contributor|admin|moderator|follow|join|\d+\s*(m|min|mins|h|hr|hrs|d|day|days|w|wk|wks)\s*[·•]?|[·•\s]+)$/i.test(
        candidate,
      );

    if (isGroupHeader || isAuthorHeader || isMetaNoise) {
      startIndex += 1;
    } else {
      break;
    }
  }

  const remaining = rawLines.slice(startIndex).join('\n').trim();
  const finalResult = (remaining || cleaned.trim())
    .replace(/^(?:\d+\s*(?:m|min|mins|h|hr|hrs|d|day|days|w|wk|wks)\s*[·•]\s*)+/i, '')
    .replace(/\n{3,}/g, '\n\n')
    .trim();

  return finalResult || rawText.trim();
}

export interface ListingCardProps {
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
}

const ListingPhotoBanner: React.FC<PhotoBannerProps> = ({
  images,
  activeImageIdx,
  title,
  onSelectIndex,
  onPrev,
  onNext,
  onOpenLightbox,
}) => {
  if (images.length === 0) {
    return null;
  }

  return (
    <div className="relative mb-3 rounded-lg overflow-hidden bg-[#09090B] h-40 border border-white/[0.07] group/img">
      <button
        type="button"
        aria-label={`Open full screen photo of ${title}`}
        onClick={onOpenLightbox}
        className="w-full h-full block focus:outline-none"
      >
        <img
          src={images[activeImageIdx]}
          alt={title}
          className="w-full h-full object-cover transition-transform duration-200 ease-[var(--ease-out)] group-hover/img:scale-[1.02] cursor-pointer"
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
        className="absolute top-2 right-2 p-1.5 rounded-md bg-black/70 hover:bg-black/90 text-zinc-100 backdrop-blur-md border border-white/10 opacity-0 group-hover/img:opacity-100 transition-opacity duration-140 ease-[var(--ease-out)] active:scale-[0.97] z-10"
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
            className="absolute left-2 top-1/2 -translate-y-1/2 p-1 rounded-full bg-black/70 hover:bg-black/90 text-white backdrop-blur-md border border-white/15 active:scale-[0.97] transition-[transform,background-color] duration-140 ease-[var(--ease-out)] z-10"
            title="Previous photo"
          >
            <ChevronLeft className="w-3.5 h-3.5" />
          </button>

          <button
            type="button"
            aria-label="Next photo"
            onClick={onNext}
            className="absolute right-2 top-1/2 -translate-y-1/2 p-1 rounded-full bg-black/70 hover:bg-black/90 text-white backdrop-blur-md border border-white/15 active:scale-[0.97] transition-[transform,background-color] duration-140 ease-[var(--ease-out)] z-10"
            title="Next photo"
          >
            <ChevronRight className="w-3.5 h-3.5" />
          </button>

          <div className="absolute bottom-2 right-2 flex items-center gap-1.5 bg-zinc-950/85 backdrop-blur-md px-2 py-0.5 rounded-full text-[10px] font-mono tabular-nums text-zinc-300 border border-white/10 z-10">
            <span>
              {activeImageIdx + 1}/{images.length}
            </span>
            <div className="flex gap-1 ml-0.5">
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
                      ? 'bg-emerald-400 w-2.5'
                      : 'bg-zinc-600 hover:bg-zinc-400'
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

const ListingHeaderMetaRow: React.FC<{
  readonly listing: RentalListing;
  readonly onOpenScoreModal: (listing: RentalListing) => void;
}> = ({ listing, onOpenScoreModal }) => {
  const scrapedIST = formatListingTimestampIST(listing.createdAt);

  return (
    <div className="flex items-center justify-between gap-2 pb-2.5 mb-2.5 border-b border-white/[0.06] text-[11px]">
      <div className="flex items-center gap-1.5 min-w-0 flex-wrap">
        <span
          className="px-2 py-0.5 rounded bg-[#18181C] text-zinc-300 border border-white/[0.06] font-medium truncate max-w-[165px]"
          title={listing.groupName}
        >
          {listing.groupName}
        </span>

        <a
          href={listing.postUrl}
          target="_blank"
          rel="noreferrer"
          className="inline-flex items-center gap-1 text-[11px] font-mono tabular-nums text-zinc-400 hover:text-zinc-200 px-1.5 py-0.5 rounded bg-[#09090B] border border-white/[0.06] transition-colors duration-140"
          title={`Published: ${listing.postedTime}${scrapedIST ? ` • Scraped: ${scrapedIST} IST` : ''}`}
        >
          <Clock className="w-3 h-3 text-emerald-400 shrink-0" />
          <span>{listing.postedTime}</span>
          {scrapedIST && (
            <>
              <span className="text-zinc-600">·</span>
              <span className="text-zinc-400">{scrapedIST}</span>
            </>
          )}
        </a>

        {listing.postCount && listing.postCount > 1 && (
          <span
            className="inline-flex items-center gap-1 text-[10px] font-mono tabular-nums font-medium bg-zinc-800/80 text-zinc-300 border border-white/[0.08] px-1.5 py-0.5 rounded"
            title={`Seen in ${listing.postCount} groups: ${(listing.groupNames || []).join(', ')}`}
          >
            <Layers className="w-2.5 h-2.5 text-zinc-400" /> Seen in {listing.postCount} groups
          </span>
        )}
      </div>

      <div className="shrink-0">
        <RatingBadge
          score={listing.score}
          tier={listing.tier}
          onClick={() => onOpenScoreModal(listing)}
        />
      </div>
    </div>
  );
};

const ListingTitleAndPriceRow: React.FC<{ readonly listing: RentalListing }> = ({ listing }) => {
  const e = listing.entities;
  const primaryTitle = e.societyName || listing.location;
  const depositRatio =
    e.rent && e.deposit && e.rent > 0 ? `${(e.deposit / e.rent).toFixed(1)}x dep` : null;

  return (
    <div className="flex items-start justify-between gap-3 mb-2.5">
      <div className="min-w-0">
        <h3 className="text-[16px] font-semibold tracking-[-0.015em] text-zinc-50 leading-snug truncate">
          {primaryTitle}
        </h3>
        <div className="flex items-center gap-1.5 flex-wrap mt-1 text-xs text-zinc-400">
          <span className="font-medium text-zinc-200 bg-[#18181C] border border-white/[0.07] px-1.5 py-0.5 rounded text-[11px]">
            {listing.bhkType}
          </span>
          {e.societyName && <span>· {listing.location}</span>}
          {listing.zone && <span className="text-zinc-500">· {listing.zone}</span>}
        </div>
      </div>

      <div className="text-right shrink-0">
        <div className="text-[18px] font-mono font-semibold tabular-nums text-zinc-50 leading-tight">
          {e.rent ? `₹${e.rent.toLocaleString('en-IN')}/mo` : 'Rent in post'}
        </div>
        <div className="flex items-center justify-end gap-1.5 mt-1 text-[11px] font-mono tabular-nums text-zinc-400">
          {depositRatio ? (
            <span>{depositRatio}</span>
          ) : e.deposit ? (
            <span>Dep ₹{e.deposit.toLocaleString('en-IN')}</span>
          ) : null}
          <span className="inline-flex items-center gap-1 px-1.5 py-0.5 rounded bg-[#09090B] border border-white/[0.07] text-zinc-300">
            <Bike className="w-3 h-3 text-emerald-400" />
            <span>{listing.commute.twoWayAvgPeakMins}m to PTP</span>
          </span>
        </div>
      </div>
    </div>
  );
};

const ListingExpandableDescription: React.FC<{
  readonly rawText: string;
  readonly groupName: string;
  readonly authorName: string;
}> = ({ rawText, groupName, authorName }) => {
  const [isExpanded, setIsExpanded] = useState(false);
  const displayDescription = cleanDisplayDescription(rawText, groupName, authorName);

  return (
    <div className="mb-3">
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
        className="w-full text-left cursor-pointer bg-[#0C0C0F] hover:bg-[#0E0E12] border border-white/[0.06] hover:border-white/[0.12] rounded-lg p-2.5 transition-[border-color,background-color] duration-140 ease-[var(--ease-out)] focus:outline-none focus:border-zinc-500"
      >
        <p
          className={`text-[13px] text-zinc-300 ${
            !isExpanded ? 'line-clamp-2' : ''
          } leading-relaxed whitespace-pre-line`}
        >
          {displayDescription}
        </p>
        <div className="flex items-center justify-between text-[11px] text-zinc-400 font-medium mt-1.5 pt-1.5 border-t border-white/[0.05]">
          <span className="text-zinc-500 truncate max-w-[180px]">By {authorName}</span>
          <span className="inline-flex items-center gap-1 text-zinc-300">
            <span>{isExpanded ? 'Show less' : 'Read full description'}</span>
            {isExpanded ? <ChevronUp className="w-3 h-3" /> : <ChevronDown className="w-3 h-3" />}
          </span>
        </div>
      </div>
    </div>
  );
};

const ListingFeatureTags: React.FC<{ readonly listing: RentalListing }> = ({ listing }) => {
  const e = listing.entities;
  const waterInfo = detectWaterSource(listing.rawText);

  const amenityTags: { readonly key: string; readonly label: string; readonly icon: React.ReactNode }[] = [];
  if (e.isGatedSociety) {
    amenityTags.push({ key: 'gated', label: 'Gated', icon: <Building2 className="w-3 h-3 text-zinc-400" /> });
  }
  if (e.hasSwimmingPool) {
    amenityTags.push({ key: 'pool', label: 'Pool', icon: <Waves className="w-3 h-3 text-zinc-400" /> });
  }
  if (e.hasPowerBackup) {
    amenityTags.push({ key: 'backup', label: 'Backup', icon: <Zap className="w-3 h-3 text-zinc-400" /> });
  }
  if (e.hasAttachedWashroom) {
    amenityTags.push({ key: 'bath', label: 'Attached Bath', icon: <Bath className="w-3 h-3 text-zinc-400" /> });
  }
  if (waterInfo.isCauvery) {
    amenityTags.push({ key: 'cauvery', label: 'Cauvery', icon: <Droplets className="w-3 h-3 text-zinc-400" /> });
  }

  return (
    <div className="flex flex-wrap items-center gap-1.5 text-[11px]">
      {e.isBrokerage ? (
        <span className="px-2 py-0.5 rounded bg-rose-950/40 text-rose-300 border border-rose-500/25 font-medium">
          Brokerage
        </span>
      ) : (
        <span className="px-2 py-0.5 rounded bg-emerald-950/30 text-emerald-300 border border-emerald-500/25 font-medium">
          Direct / No Broker
        </span>
      )}

      {e.furnishing !== 'Unknown' && (
        <span className="px-2 py-0.5 rounded bg-[#18181C] text-zinc-300 border border-white/[0.06]">
          {e.furnishing}
        </span>
      )}

      {amenityTags.map((tag) => (
        <span
          key={tag.key}
          className="inline-flex items-center gap-1 px-2 py-0.5 rounded bg-[#18181C] text-zinc-300 border border-white/[0.06]"
        >
          {tag.icon} {tag.label}
        </span>
      ))}

      {e.isVegetarianOnly && (
        <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded bg-amber-950/40 text-amber-300 border border-amber-500/25">
          <Leaf className="w-3 h-3" /> Veg Only
        </span>
      )}
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
    <div className="flex flex-wrap items-center gap-1.5 mt-1.5 mb-3 text-[11px]">
      {societyUrl && e.societyName && (
        <a
          href={societyUrl}
          target="_blank"
          rel="noreferrer"
          className="inline-flex items-center gap-1 px-2 py-0.5 rounded bg-[#09090B] hover:bg-[#18181C] text-zinc-300 border border-white/[0.08] transition-colors"
          title={`Open ${e.societyName} in Google Maps`}
        >
          <MapPin className="w-2.5 h-2.5 text-emerald-400 shrink-0" />
          <span className="truncate max-w-[110px]">{e.societyName}</span>
          <ExternalLink className="w-2.5 h-2.5 text-zinc-500 shrink-0" />
        </a>
      )}

      <a
        href={localityUrl}
        target="_blank"
        rel="noreferrer"
        className="inline-flex items-center gap-1 px-2 py-0.5 rounded bg-[#09090B] hover:bg-[#18181C] text-zinc-300 border border-white/[0.08] transition-colors"
        title={`Open ${listing.location} in Google Maps`}
      >
        <MapPin className="w-2.5 h-2.5 text-zinc-400 shrink-0" />
        <span>{listing.location}</span>
        <ExternalLink className="w-2.5 h-2.5 text-zinc-500 shrink-0" />
      </a>

      {landmarkUrl && landmark && (
        <a
          href={landmarkUrl}
          target="_blank"
          rel="noreferrer"
          className="inline-flex items-center gap-1 px-2 py-0.5 rounded bg-[#09090B] hover:bg-[#18181C] text-zinc-400 border border-white/[0.06] transition-colors"
          title={`Open ${landmark} in Google Maps`}
        >
          <MapPin className="w-2.5 h-2.5 text-zinc-500 shrink-0" />
          <span className="truncate max-w-[110px]">{landmark}</span>
        </a>
      )}
    </div>
  );
};

function getStatusColor(status: UserListingStatus): string {
  switch (status) {
    case 'interested':
      return 'text-amber-300 bg-amber-950/40 border-amber-500/30';
    case 'called':
      return 'text-sky-300 bg-sky-950/40 border-sky-500/30';
    case 'applied':
      return 'text-emerald-300 bg-emerald-950/40 border-emerald-500/30';
    case 'rejected':
      return 'text-rose-300 bg-rose-950/40 border-rose-500/30';
    default:
      return 'text-zinc-300 bg-[#09090B] border-white/[0.08]';
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
    <div className="pt-2.5 border-t border-white/[0.06] flex items-center justify-between gap-2">
      <select
        aria-label={`Status for ${cardTitle}`}
        value={listing.userStatus}
        onChange={(ev) => handleStatusChangeInternal(ev.target.value as UserListingStatus)}
        className={`text-[11px] font-medium px-2 py-1 rounded-lg border focus:outline-none cursor-pointer transition-colors duration-140 ease-[var(--ease-out)] ${getStatusColor(
          listing.userStatus,
        )}`}
      >
        <option value="new">Status: New</option>
        <option value="interested">Interested</option>
        <option value="called">Called</option>
        <option value="applied">Applied</option>
        <option value="rejected">Rejected</option>
      </select>

      <div className="flex items-center gap-1.5">
        {e.contactPhone && (
          <button
            type="button"
            aria-label={`Copy phone number ${e.contactPhone}`}
            onClick={() => {
              navigator.clipboard.writeText(e.contactPhone ?? '');
              toast.info(`Copied phone: +91 ${e.contactPhone}`);
            }}
            className="hidden sm:inline-flex items-center gap-1 px-2 py-1 rounded-lg bg-[#09090B] hover:bg-[#18181C] text-zinc-300 border border-white/[0.07] font-mono tabular-nums text-[11px] transition-[background-color,transform] duration-140 ease-[var(--ease-out)] active:scale-[0.97]"
            title="Click to copy phone number"
          >
            <span>+91 {e.contactPhone}</span>
          </button>
        )}

        {onOpenDrawer && (
          <button
            type="button"
            aria-label={`Quick inspect ${cardTitle}`}
            onClick={() => onOpenDrawer(listing)}
            className="px-2 py-1 rounded-lg bg-[#18181C] hover:bg-zinc-800 text-zinc-200 border border-white/[0.08] transition-[background-color,border-color,transform] duration-140 ease-[var(--ease-out)] active:scale-[0.97] flex items-center gap-1 text-[11px] font-medium"
            title="Inspect full post & commute details"
          >
            <Eye className="w-3.5 h-3.5 text-zinc-400" />
            <span>Inspect</span>
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
              className="p-1.5 rounded-lg bg-emerald-950/50 hover:bg-emerald-900/60 text-emerald-400 border border-emerald-500/30 transition-[background-color,transform] duration-140 ease-[var(--ease-out)] active:scale-[0.97]"
              title={`WhatsApp ${listing.authorName}`}
            >
              <MessageCircle className="w-3.5 h-3.5" />
            </a>
            <a
              href={`tel:${e.contactPhone}`}
              aria-label={`Call ${listing.authorName}`}
              onClick={() => toast.info(`Calling +91 ${e.contactPhone}`)}
              className="p-1.5 rounded-lg bg-[#18181C] hover:bg-zinc-800 text-zinc-200 border border-white/[0.08] transition-[background-color,transform] duration-140 ease-[var(--ease-out)] active:scale-[0.97]"
              title={`Call ${listing.authorName}`}
            >
              <Phone className="w-3.5 h-3.5" />
            </a>
          </>
        )}

        <a
          href={listing.postUrl}
          target="_blank"
          rel="noreferrer"
          aria-label="Open Original Facebook Post"
          className="p-1.5 rounded-lg bg-[#09090B] hover:bg-[#18181C] text-zinc-300 border border-white/[0.08] transition-[background-color,border-color,transform] duration-140 ease-[var(--ease-out)] active:scale-[0.97]"
          title="Open Original Facebook Post"
        >
          <ExternalLink className="w-3.5 h-3.5" />
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
      className="fixed inset-0 z-50 m-0 h-full w-full max-w-none max-h-none bg-zinc-950/95 backdrop-blur-xl flex flex-col items-center justify-center p-4 transition-opacity duration-200 ease-[var(--ease-out)] border-0"
    >
      <button
        type="button"
        aria-label="Close photo lightbox backdrop"
        onClick={onClose}
        className="absolute inset-0 w-full h-full cursor-default"
      />

      <div className="absolute top-4 left-4 right-4 flex items-center justify-between text-zinc-100 z-20 pointer-events-none">
        <div className="text-sm font-semibold flex items-center gap-2 pointer-events-auto">
          <span>{title}</span>
          <span className="text-zinc-400 font-mono tabular-nums text-xs">
            ({activeImageIdx + 1} of {images.length})
          </span>
        </div>
        <button
          type="button"
          aria-label="Close photo lightbox"
          onClick={onClose}
          className="p-2 rounded-xl bg-zinc-900 hover:bg-zinc-800 border border-white/10 text-zinc-100 transition-colors duration-140 ease-[var(--ease-out)] active:scale-[0.97] pointer-events-auto"
          title="Close (Esc)"
        >
          <X className="w-5 h-5" />
        </button>
      </div>

      <div className="relative max-w-5xl max-h-[85vh] flex items-center justify-center transition-[transform,opacity] duration-200 ease-[var(--ease-out)] z-10">
        <img
          src={images[activeImageIdx]}
          alt={title}
          className="max-w-full max-h-[80vh] object-contain rounded-xl shadow-2xl border border-white/10"
        />

        {images.length > 1 && (
          <>
            <button
              type="button"
              aria-label="Previous image"
              onClick={onPrev}
              className="absolute left-3 top-1/2 -translate-y-1/2 p-2.5 rounded-full bg-zinc-900/90 hover:bg-zinc-800 text-white border border-white/15 shadow-2xl transition-[transform,background-color] duration-140 ease-[var(--ease-out)] active:scale-[0.97]"
              title="Previous image (←)"
            >
              <ChevronLeft className="w-6 h-6" />
            </button>

            <button
              type="button"
              aria-label="Next image"
              onClick={onNext}
              className="absolute right-3 top-1/2 -translate-y-1/2 p-2.5 rounded-full bg-zinc-900/90 hover:bg-zinc-800 text-white border border-white/15 shadow-2xl transition-[transform,background-color] duration-140 ease-[var(--ease-out)] active:scale-[0.97]"
              title="Next image (→)"
            >
              <ChevronRight className="w-6 h-6" />
            </button>
          </>
        )}
      </div>

      {images.length > 1 && (
        <div className="absolute bottom-4 flex items-center gap-2 p-2 bg-zinc-900/90 backdrop-blur-md rounded-xl border border-white/10 max-w-md overflow-x-auto z-20">
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
 * High-craft monochrome card displaying a Bangalore rental listing with exact IST timestamps and Google Maps links.
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
      <article className="bg-[#111114] hover:bg-[#141418] border border-white/[0.07] hover:border-white/[0.15] p-4 rounded-xl flex flex-col justify-between relative overflow-hidden transition-[background-color,border-color] duration-160 ease-[var(--ease-out)]">
        <div>
          <ListingPhotoBanner
            images={images}
            activeImageIdx={activeImageIdx}
            title={cardTitle}
            onSelectIndex={setActiveImageIdx}
            onPrev={handlePrevImage}
            onNext={handleNextImage}
            onOpenLightbox={() => setIsLightboxOpen(true)}
          />

          <ListingHeaderMetaRow listing={listing} onOpenScoreModal={onOpenScoreModal} />

          <ListingTitleAndPriceRow listing={listing} />

          <ListingExpandableDescription
            rawText={listing.rawText}
            groupName={listing.groupName}
            authorName={listing.authorName}
          />

          <ListingFeatureTags listing={listing} />
          <ListingMapsLinksRow listing={listing} />
        </div>

        <ListingCardFooter
          listing={listing}
          cardTitle={cardTitle}
          onStatusChange={onStatusChange}
          onOpenDrawer={onOpenDrawer}
        />
      </article>

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
