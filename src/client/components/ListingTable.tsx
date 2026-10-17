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
  User,
  Clock,
  Layers,
  Eye,
  MapPin,
} from 'lucide-react';

interface ListingTableProps {
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
    ? l.landmarkMapsUrl || buildLandmarkMapsUrl(landmark, l.location)
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

const TableMapsLinks: React.FC<{ readonly l: RentalListing }> = ({ l }) => {
  const meta = resolveListingTableMeta(l);
  return (
    <div className="flex flex-wrap items-center gap-1 mt-1">
      {meta.societyUrl && meta.societyName && (
        <a
          href={meta.societyUrl}
          target="_blank"
          rel="noreferrer"
          className="inline-flex items-center gap-0.5 text-[10px] text-indigo-300 hover:text-indigo-200 bg-indigo-950/50 px-1.5 py-0.5 rounded border border-indigo-500/30"
          title={`Open ${meta.societyName} in Google Maps`}
        >
          <MapPin className="w-2.5 h-2.5" />
          <span>Society Map</span>
          <ExternalLink className="w-2 h-2" />
        </a>
      )}
      <a
        href={meta.localityUrl}
        target="_blank"
        rel="noreferrer"
        className="inline-flex items-center gap-0.5 text-[10px] text-emerald-300 hover:text-emerald-200 bg-slate-900 px-1.5 py-0.5 rounded border border-emerald-500/30"
        title={`Open ${l.location} in Google Maps`}
      >
        <MapPin className="w-2.5 h-2.5" />
        <span>{l.location}</span>
        <ExternalLink className="w-2 h-2" />
      </a>
      {meta.landmarkUrl && meta.landmark && (
        <a
          href={meta.landmarkUrl}
          target="_blank"
          rel="noreferrer"
          className="inline-flex items-center gap-0.5 text-[10px] text-cyan-300 hover:text-cyan-200 bg-slate-900 px-1.5 py-0.5 rounded border border-cyan-500/30"
          title={`Open ${meta.landmark} in Google Maps`}
        >
          <MapPin className="w-2.5 h-2.5" />
          <span>{meta.landmark}</span>
          <ExternalLink className="w-2 h-2" />
        </a>
      )}
    </div>
  );
};

const TableLocalityCell: React.FC<{ readonly l: RentalListing }> = ({ l }) => {
  const meta = resolveListingTableMeta(l);

  return (
    <td className="py-3 px-4 font-medium text-white">
      <div className="flex items-center gap-2">
        {meta.firstImage && (
          <img
            src={meta.firstImage}
            alt=""
            className="w-7 h-7 rounded-lg object-cover border border-slate-700 shrink-0"
            onError={(ev) => {
              (ev.target as HTMLElement).style.display = 'none';
            }}
          />
        )}
        <div>
          <div className="font-bold flex items-center gap-1.5 flex-wrap">
            <span>{meta.title}</span>
            {l.zone && (
              <span className="text-[9px] font-bold uppercase tracking-wider px-1.5 py-0.5 rounded bg-cyan-950/60 text-cyan-300 border border-cyan-500/30">
                {l.zone}
              </span>
            )}
          </div>
          <TableMapsLinks l={l} />
        </div>
      </div>
      <div className="flex items-center gap-1.5 mt-1">
        <span className="text-[10px] text-slate-400 font-normal truncate max-w-[140px]">
          {l.groupName}
        </span>
        {l.postCount && l.postCount > 1 && (
          <span
            className="inline-flex items-center gap-1 text-[9px] font-semibold bg-indigo-950/80 text-indigo-300 border border-indigo-500/40 px-1.5 py-0.5 rounded-full whitespace-nowrap"
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
    <td className="py-3 px-4">
      <div className="flex items-center gap-1.5 text-slate-400">
        {e.isGatedSociety && (
          <span title="Gated Society">
            <Building2 className="w-3.5 h-3.5 text-indigo-400" />
          </span>
        )}
        {e.hasSwimmingPool && (
          <span title="Swimming Pool">
            <Waves className="w-3.5 h-3.5 text-blue-400" />
          </span>
        )}
        {e.hasPowerBackup && (
          <span title="100% DG Backup">
            <Zap className="w-3.5 h-3.5 text-amber-400" />
          </span>
        )}
        {!hasAny && <span>—</span>}
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
    <td className="py-3 px-4 whitespace-nowrap text-right">
      <div className="flex items-center justify-end gap-1.5">
        {onOpenDrawer && (
          <button
            type="button"
            onClick={() => onOpenDrawer(l)}
            className="px-2 py-1 rounded-lg bg-emerald-600/20 text-emerald-300 hover:bg-emerald-600/40 border border-emerald-500/30 flex items-center gap-1 font-semibold text-xs transition-colors"
            title="Quick Inspect in Drawer"
          >
            <Eye className="w-3.5 h-3.5" />
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
              className="p-1 rounded-lg bg-emerald-600/20 text-emerald-400 hover:bg-emerald-600/40 transition-colors"
              title="WhatsApp"
            >
              <MessageCircle className="w-3.5 h-3.5" />
            </a>
            <a
              href={`tel:${e.contactPhone}`}
              aria-label={`Call ${l.authorName}`}
              className="p-1 rounded-lg bg-cyan-600/20 text-cyan-400 hover:bg-cyan-600/40 transition-colors"
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
          className="px-2 py-1 rounded-lg bg-blue-600/20 hover:bg-blue-600/40 text-blue-300 border border-blue-500/30 flex items-center gap-1 font-semibold text-xs transition-colors"
          title="Open Original Facebook Post"
        >
          <ExternalLink className="w-3.5 h-3.5" />
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

  return (
    <tr className="hover:bg-slate-900/40 transition-colors">
      <td className="py-3 px-4">
        <RatingBadge score={l.score} tier={l.tier} onClick={() => onOpenScoreModal(l)} />
      </td>

      <td className="py-3 px-4 whitespace-nowrap">
        <div className="font-semibold text-white flex items-center gap-1.5">
          <User className="w-3 h-3 text-indigo-400" />
          {l.authorName}
        </div>
        <div className="text-[10px] text-slate-400 flex items-center gap-1 mt-0.5">
          <Clock className="w-2.5 h-2.5 text-cyan-400" />
          {l.postedTime}
        </div>
      </td>

      <TableLocalityCell l={l} />

      <td className="py-3 px-4 whitespace-nowrap">
        <span className="px-2 py-0.5 rounded bg-slate-800 text-slate-200 border border-slate-700 text-[11px]">
          {l.bhkType}
        </span>
      </td>

      <td className="py-3 px-4 whitespace-nowrap font-mono tabular-nums font-bold text-white">
        {e.rent ? `₹${e.rent.toLocaleString('en-IN')}` : '—'}
      </td>

      <td className="py-3 px-4 whitespace-nowrap font-mono tabular-nums text-cyan-300">
        {e.contactPhone ? `+91 ${e.contactPhone}` : '—'}
      </td>

      <td className="py-3 px-4 whitespace-nowrap">
        {e.isBrokerage ? (
          <span className="text-[10px] font-semibold px-2 py-0.5 rounded bg-rose-950/50 text-rose-300 border border-rose-500/40">
            Broker Fee
          </span>
        ) : (
          <span className="text-[10px] font-bold px-2 py-0.5 rounded bg-emerald-950/60 text-emerald-300 border border-emerald-500/50 shadow-sm">
            Zero Brokerage
          </span>
        )}
      </td>

      <td className="py-3 px-4 whitespace-nowrap">
        <div className="font-semibold text-white font-mono tabular-nums">
          {l.commute.twoWayAvgPeakMins}m
        </div>
        <div className="text-[10px] text-slate-400 font-mono tabular-nums">
          11am: {l.commute.inboundMins}m • 5pm: {l.commute.outboundMins}m
        </div>
      </td>

      <TableAmenitiesCell l={l} />

      <td className="py-3 px-4 whitespace-nowrap">
        <select
          aria-label={`Status for ${e.societyName || l.location}`}
          value={l.userStatus}
          onChange={(ev) => onStatusChange(l.id, ev.target.value as UserListingStatus)}
          className="bg-slate-900 border border-slate-700/60 rounded px-2 py-1 text-xs text-white focus:outline-none focus:border-emerald-500"
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
 * High-density tabular view for rental listings with Google Maps deep-link pills.
 */
export const ListingTable: React.FC<ListingTableProps> = ({
  listings,
  onStatusChange,
  onOpenScoreModal,
  onOpenDrawer,
}) => {
  return (
    <div className="glass-panel rounded-2xl overflow-hidden border border-slate-800/80">
      <div className="overflow-x-auto">
        <table className="w-full text-left text-xs">
          <thead className="bg-slate-900/95 backdrop-blur-md sticky top-0 z-10 text-slate-300 font-semibold border-b border-slate-800">
            <tr>
              <th className="py-3 px-4">Score</th>
              <th className="py-3 px-4">Author / Posted</th>
              <th className="py-3 px-4">Society / Locality / Maps</th>
              <th className="py-3 px-4">Type</th>
              <th className="py-3 px-4">Rent</th>
              <th className="py-3 px-4">Phone</th>
              <th className="py-3 px-4">Brokerage</th>
              <th className="py-3 px-4">Peak Commute</th>
              <th className="py-3 px-4">Amenities</th>
              <th className="py-3 px-4">Status</th>
              <th className="py-3 px-4 text-right">Actions</th>
            </tr>
          </thead>
          <tbody className="divide-y divide-slate-800/60 text-slate-300">
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
