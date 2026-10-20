import React from 'react';
import {
  type RentalListing,
  type UserListingStatus,
  buildSocietyMapsUrl,
  buildLandmarkMapsUrl,
  buildLocalityMapsUrl,
} from '../../domain/types';
import { RatingBadge } from './RatingBadge';
import {
  ExternalLink,
  MessageCircle,
  Phone,
  Building2,
  Waves,
  Zap,
  Clock,
  Layers,
  Eye,
  MapPin,
} from 'lucide-react';

const TABLE_IST_FORMATTER = new Intl.DateTimeFormat('en-IN', {
  day: '2-digit',
  month: 'short',
  hour: '2-digit',
  minute: '2-digit',
  hour12: true,
  timeZone: 'Asia/Kolkata',
});

function formatTableTimestampIST(createdAt: string | undefined): string {
  if (!createdAt) return '';
  const normalized = createdAt.includes('T')
    ? createdAt
    : `${createdAt.replace(' ', 'T')}Z`;
  const parsed = new Date(normalized);
  if (Number.isNaN(parsed.getTime())) return createdAt;
  return TABLE_IST_FORMATTER.format(parsed);
}

export interface ListingTableProps {
  readonly listings: RentalListing[];
  readonly onStatusChange: (id: number, status: UserListingStatus) => void;
  readonly onOpenScoreModal: (listing: RentalListing) => void;
  readonly onOpenDrawer?: ((listing: RentalListing) => void) | undefined;
}

function resolveListingTableMeta(l: RentalListing) {
  const e = l.entities;
  const images = l.imageUrls || e.imageUrls || [];
  const firstImage = images[0];
  const landmark = l.landmark || e.landmark;
  const localityUrl = l.localityMapsUrl || buildLocalityMapsUrl(l.location);
  const societyUrl = e.societyName
    ? l.societyMapsUrl || buildSocietyMapsUrl(e.societyName, l.location)
    : null;
  const landmarkUrl = landmark
    ? l.landmarkMapsUrl || buildLandmarkMapsUrl(landmark, listing.locationFallback(l.location))
    : null;

  return {
    firstImage,
    title: e.societyName || l.location,
    societyName: e.societyName,
    landmark,
    localityUrl,
    societyUrl,
    landmarkUrl,
    groupNamesTitle: `Seen in ${l.postCount} groups: ${(l.groupNames || []).join(', ')}`,
  };
}

const listing = {
  locationFallback(loc: string): string {
    return loc;
  },
};

const TableMapsLinks: React.FC<{ readonly l: RentalListing }> = ({ l }) => {
  const meta = resolveListingTableMeta(l);
  return (
    <div className="flex flex-wrap items-center gap-1 mt-1">
      {meta.societyUrl && meta.societyName && (
        <a
          href={meta.societyUrl}
          target="_blank"
          rel="noreferrer"
          className="inline-flex items-center gap-0.5 text-[10px] text-zinc-300 hover:text-zinc-100 bg-[#09090B] px-1.5 py-0.5 rounded border border-white/[0.08]"
          title={`Open ${meta.societyName} in Google Maps`}
        >
          <MapPin className="w-2.5 h-2.5 text-emerald-400" />
          <span>Society</span>
          <ExternalLink className="w-2 h-2 text-zinc-500" />
        </a>
      )}
      <a
        href={meta.localityUrl}
        target="_blank"
        rel="noreferrer"
        className="inline-flex items-center gap-0.5 text-[10px] text-zinc-300 hover:text-zinc-100 bg-[#09090B] px-1.5 py-0.5 rounded border border-white/[0.08]"
        title={`Open ${l.location} in Google Maps`}
      >
        <MapPin className="w-2.5 h-2.5 text-zinc-400" />
        <span>{l.location}</span>
        <ExternalLink className="w-2 h-2 text-zinc-500" />
      </a>
      {meta.landmarkUrl && meta.landmark && (
        <a
          href={meta.landmarkUrl}
          target="_blank"
          rel="noreferrer"
          className="inline-flex items-center gap-0.5 text-[10px] text-zinc-400 hover:text-zinc-200 bg-[#09090B] px-1.5 py-0.5 rounded border border-white/[0.06]"
          title={`Open ${meta.landmark} in Google Maps`}
        >
          <MapPin className="w-2.5 h-2.5 text-zinc-500" />
          <span>{meta.landmark}</span>
        </a>
      )}
    </div>
  );
};

const TableLocalityCell: React.FC<{ readonly l: RentalListing }> = ({ l }) => {
  const meta = resolveListingTableMeta(l);

  return (
    <td className="py-2.5 px-3 font-medium text-zinc-100">
      <div className="flex items-center gap-2">
        {meta.firstImage && (
          <img
            src={meta.firstImage}
            alt=""
            className="w-7 h-7 rounded-md object-cover border border-white/10 shrink-0"
            onError={(ev) => {
              (ev.target as HTMLElement).style.display = 'none';
            }}
          />
        )}
        <div>
          <div className="font-semibold flex items-center gap-1.5 flex-wrap">
            <span>{meta.title}</span>
            {l.zone && (
              <span className="text-[9px] font-medium uppercase tracking-wider px-1.5 py-0.5 rounded bg-[#18181C] text-zinc-400 border border-white/[0.07]">
                {l.zone}
              </span>
            )}
          </div>
          <TableMapsLinks l={l} />
        </div>
      </div>
      <div className="flex items-center gap-1.5 mt-1">
        <span className="text-[10px] text-zinc-500 font-normal truncate max-w-[160px]">
          {l.groupName} · {l.authorName}
        </span>
        {l.postCount && l.postCount > 1 && (
          <span
            className="inline-flex items-center gap-1 text-[9px] font-mono tabular-nums font-medium bg-zinc-800 text-zinc-300 border border-white/[0.08] px-1.5 py-0.5 rounded whitespace-nowrap"
            title={meta.groupNamesTitle}
          >
            <Layers className="w-2.5 h-2.5" /> Seen in {l.postCount} groups
          </span>
        )}
      </div>
    </td>
  );
};

const TableAmenitiesCell: React.FC<{ readonly l: RentalListing }> = ({ l }) => {
  const e = l.entities;
  const hasAny = e.isGatedSociety || e.hasSwimmingPool || e.hasPowerBackup;
  return (
    <td className="py-2.5 px-3">
      <div className="flex items-center gap-1.5 text-zinc-400">
        {e.isGatedSociety && (
          <span title="Gated Society">
            <Building2 className="w-3.5 h-3.5 text-zinc-300" />
          </span>
        )}
        {e.hasSwimmingPool && (
          <span title="Swimming Pool">
            <Waves className="w-3.5 h-3.5 text-zinc-300" />
          </span>
        )}
        {e.hasPowerBackup && (
          <span title="100% DG Backup">
            <Zap className="w-3.5 h-3.5 text-zinc-300" />
          </span>
        )}
        {!hasAny && <span className="text-zinc-600">—</span>}
      </div>
    </td>
  );
};

const TableActionsCell: React.FC<{
  readonly l: RentalListing;
  readonly onOpenDrawer?: ((listing: RentalListing) => void) | undefined;
}> = ({ l, onOpenDrawer }) => {
  const e = l.entities;
  const title = e.societyName || l.location;
  return (
    <td className="py-2.5 px-3 whitespace-nowrap text-right">
      <div className="flex items-center justify-end gap-1.5">
        {onOpenDrawer && (
          <button
            type="button"
            onClick={() => onOpenDrawer(l)}
            className="px-2 py-1 rounded-md bg-[#18181C] text-zinc-200 hover:bg-zinc-800 border border-white/[0.08] flex items-center gap-1 font-medium text-[11px] transition-colors"
            title="Inspect in Drawer"
          >
            <Eye className="w-3 h-3 text-zinc-400" />
            <span>Inspect</span>
          </button>
        )}

        {e.contactPhone && (
          <>
            <a
              href={`https://wa.me/91${e.contactPhone}?text=Hi%20${encodeURIComponent(
                l.authorName,
              )}%2C%20saw%20your%20rental%20post%20for%20${encodeURIComponent(
                title,
              )}%20near%20PTP.`}
              target="_blank"
              rel="noreferrer"
              aria-label={`WhatsApp ${l.authorName}`}
              className="p-1 rounded-md bg-emerald-950/50 text-emerald-400 border border-emerald-500/30 hover:bg-emerald-900/60 transition-colors"
              title="WhatsApp"
            >
              <MessageCircle className="w-3.5 h-3.5" />
            </a>
            <a
              href={`tel:${e.contactPhone}`}
              aria-label={`Call ${l.authorName}`}
              className="p-1 rounded-md bg-[#18181C] text-zinc-200 border border-white/[0.08] hover:bg-zinc-800 transition-colors"
              title="Call"
            >
              <Phone className="w-3.5 h-3.5" />
            </a>
          </>
        )}
        <a
          href={l.postUrl}
          target="_blank"
          rel="noreferrer"
          className="px-2 py-1 rounded-md bg-[#09090B] hover:bg-[#18181C] text-zinc-300 border border-white/[0.08] flex items-center gap-1 font-medium text-[11px] transition-colors"
          title="Open Original Facebook Post"
        >
          <ExternalLink className="w-3 h-3" />
          <span>Post</span>
        </a>
      </div>
    </td>
  );
};

interface ListingTableRowProps {
  readonly l: RentalListing;
  readonly onStatusChange: (id: number, status: UserListingStatus) => void;
  readonly onOpenScoreModal: (listing: RentalListing) => void;
  readonly onOpenDrawer?: ((listing: RentalListing) => void) | undefined;
}

const ListingTableRow: React.FC<ListingTableRowProps> = ({
  l,
  onStatusChange,
  onOpenScoreModal,
  onOpenDrawer,
}) => {
  const e = l.entities;
  const scrapedIST = formatTableTimestampIST(l.createdAt);

  return (
    <tr className="hover:bg-[#141418] transition-colors">
      <td className="py-2.5 px-3 whitespace-nowrap font-mono tabular-nums">
        <div className="text-zinc-100 font-semibold flex items-center gap-1 text-[11px]">
          <Clock className="w-3 h-3 text-emerald-400 shrink-0" />
          <span>{l.postedTime}</span>
        </div>
        {scrapedIST && (
          <div className="text-[10px] text-zinc-400 mt-0.5">
            {scrapedIST} IST
          </div>
        )}
      </td>

      <td className="py-2.5 px-3">
        <RatingBadge score={l.score} tier={l.tier} onClick={() => onOpenScoreModal(l)} />
      </td>

      <TableLocalityCell l={l} />

      <td className="py-2.5 px-3 whitespace-nowrap">
        <span className="px-2 py-0.5 rounded bg-[#18181C] text-zinc-200 border border-white/[0.07] text-[11px]">
          {l.bhkType}
        </span>
      </td>

      <td className="py-2.5 px-3 whitespace-nowrap font-mono tabular-nums font-semibold text-zinc-100">
        {e.rent ? `₹${e.rent.toLocaleString('en-IN')}` : 'In post'}
      </td>

      <td className="py-2.5 px-3 whitespace-nowrap font-mono tabular-nums text-zinc-300">
        {e.contactPhone ? `+91 ${e.contactPhone}` : '—'}
      </td>

      <td className="py-2.5 px-3 whitespace-nowrap">
        {e.isBrokerage ? (
          <span className="text-[10px] font-medium px-2 py-0.5 rounded bg-rose-950/40 text-rose-300 border border-rose-500/30">
            Brokerage
          </span>
        ) : (
          <span className="text-[10px] font-medium px-2 py-0.5 rounded bg-emerald-950/40 text-emerald-300 border border-emerald-500/30">
            Direct Owner
          </span>
        )}
      </td>

      <td className="py-2.5 px-3 whitespace-nowrap">
        <div className="font-semibold text-zinc-100 font-mono tabular-nums">
          {l.commute.twoWayAvgPeakMins}m
        </div>
        <div className="text-[10px] text-zinc-400 font-mono tabular-nums">
          {l.commute.inboundMins}m / {l.commute.outboundMins}m
        </div>
      </td>

      <TableAmenitiesCell l={l} />

      <td className="py-2.5 px-3 whitespace-nowrap">
        <select
          aria-label={`Status for ${e.societyName || l.location}`}
          value={l.userStatus}
          onChange={(ev) => onStatusChange(l.id, ev.target.value as UserListingStatus)}
          className="bg-[#09090B] border border-white/[0.08] rounded px-2 py-1 text-[11px] text-zinc-200 focus:outline-none focus:border-zinc-500"
        >
          <option value="new">New</option>
          <option value="interested">Interested</option>
          <option value="called">Called</option>
          <option value="applied">Applied</option>
          <option value="rejected">Rejected</option>
        </select>
      </td>

      <TableActionsCell l={l} onOpenDrawer={onOpenDrawer} />
    </tr>
  );
};

/**
 * High-density chronological ledger table for rental listings with IST timestamps and Google Maps links.
 */
export const ListingTable: React.FC<ListingTableProps> = ({
  listings,
  onStatusChange,
  onOpenScoreModal,
  onOpenDrawer,
}) => {
  return (
    <div className="bg-[#111114] rounded-xl overflow-hidden border border-white/[0.07]">
      <div className="overflow-x-auto">
        <table className="w-full text-left text-xs">
          <thead className="bg-[#0C0C0F] sticky top-0 z-10 text-zinc-400 font-medium border-b border-white/[0.07] text-[11px]">
            <tr>
              <th className="py-2.5 px-3">Posted / Scraped (IST)</th>
              <th className="py-2.5 px-3">Score</th>
              <th className="py-2.5 px-3">Society / Locality / Source</th>
              <th className="py-2.5 px-3">Type</th>
              <th className="py-2.5 px-3">Rent</th>
              <th className="py-2.5 px-3">Phone</th>
              <th className="py-2.5 px-3">Terms</th>
              <th className="py-2.5 px-3">PTP Commute</th>
              <th className="py-2.5 px-3">Specs</th>
              <th className="py-2.5 px-3">Status</th>
              <th className="py-2.5 px-3 text-right">Actions</th>
            </tr>
          </thead>
          <tbody className="divide-y divide-white/[0.05] text-zinc-300">
            {listings.map((l) => (
              <ListingTableRow
                key={l.id}
                l={l}
                onStatusChange={onStatusChange}
                onOpenScoreModal={onOpenScoreModal}
                onOpenDrawer={onOpenDrawer}
              />
            ))}
          </tbody>
        </table>
      </div>
    </div>
  );
};
