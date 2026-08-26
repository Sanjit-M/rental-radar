import React from 'react';
import { RentalListing, UserListingStatus } from '../../domain/types';
import { RatingBadge } from './RatingBadge';
import { ExternalLink, MessageCircle, Phone, Building2, Waves, Zap, User, Clock, Layers } from 'lucide-react';

interface ListingTableProps {
  listings: RentalListing[];
  onStatusChange: (id: number, status: UserListingStatus) => void;
  onOpenScoreModal: (listing: RentalListing) => void;
}

export const ListingTable: React.FC<ListingTableProps> = ({
  listings,
  onStatusChange,
  onOpenScoreModal,
}) => {
  return (
    <div className="glass-panel rounded-2xl overflow-hidden border border-slate-800/80">
      <div className="overflow-x-auto">
        <table className="w-full text-left text-xs">
          <thead className="bg-slate-900/90 text-slate-400 font-semibold border-b border-slate-800">
            <tr>
              <th className="py-3 px-4">Score</th>
              <th className="py-3 px-4">Author / Posted</th>
              <th className="py-3 px-4">Society / Locality</th>
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
            {listings.map((l) => {
              const e = l.entities;
              return (
                <tr key={l.id} className="hover:bg-slate-900/40 transition-colors">
                  <td className="py-3 px-4">
                    <RatingBadge
                      score={l.score}
                      tier={l.tier}
                      onClick={() => onOpenScoreModal(l)}
                    />
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

                  <td className="py-3 px-4 font-medium text-white">
                    <div>{e.societyName || l.location}</div>
                    <div className="flex items-center gap-1.5 mt-0.5">
                      <span className="text-[10px] text-slate-400 font-normal truncate max-w-[140px]">
                        {l.groupName}
                      </span>
                      {l.postCount && l.postCount > 1 && (
                        <span
                          className="inline-flex items-center gap-1 text-[9px] font-semibold bg-indigo-950/80 text-indigo-300 border border-indigo-500/40 px-1.5 py-0.5 rounded-full whitespace-nowrap"
                          title={`Seen in ${l.postCount} groups: ${(l.groupNames || []).join(', ')}`}
                        >
                          <Layers className="w-2.5 h-2.5" /> Seen in {l.postCount} groups
                        </span>
                      )}
                    </div>
                  </td>

                  <td className="py-3 px-4 whitespace-nowrap">
                    <span className="px-2 py-0.5 rounded bg-slate-800 text-slate-200 border border-slate-700 text-[11px]">
                      {l.bhkType}
                    </span>
                  </td>

                  <td className="py-3 px-4 whitespace-nowrap font-mono font-bold text-white">
                    {e.rent ? `₹${e.rent.toLocaleString('en-IN')}` : '—'}
                  </td>

                  <td className="py-3 px-4 whitespace-nowrap font-mono text-cyan-300">
                    {e.contactPhone ? `+91 ${e.contactPhone}` : '—'}
                  </td>

                  <td className="py-3 px-4 whitespace-nowrap">
                    {e.isBrokerage ? (
                      <span className="text-[11px] px-2 py-0.5 rounded bg-rose-950/40 text-rose-300 border border-rose-500/30">
                        Broker Fee
                      </span>
                    ) : (
                      <span className="text-[11px] px-2 py-0.5 rounded bg-emerald-950/40 text-emerald-300 border border-emerald-500/30">
                        Zero
                      </span>
                    )}
                  </td>

                  <td className="py-3 px-4 whitespace-nowrap">
                    <div className="font-semibold text-white font-mono">{l.commute.twoWayAvgPeakMins}m</div>
                    <div className="text-[10px] text-slate-400">
                      11am: {l.commute.inboundMins}m • 5pm: {l.commute.outboundMins}m
                    </div>
                  </td>

                  <td className="py-3 px-4">
                    <div className="flex items-center gap-1.5 text-slate-400">
                      {e.isGatedSociety && <span title="Gated Society"><Building2 className="w-3.5 h-3.5 text-indigo-400" /></span>}
                      {e.hasSwimmingPool && <span title="Swimming Pool"><Waves className="w-3.5 h-3.5 text-blue-400" /></span>}
                      {e.hasPowerBackup && <span title="100% DG Backup"><Zap className="w-3.5 h-3.5 text-amber-400" /></span>}
                      {!e.isGatedSociety && !e.hasSwimmingPool && !e.hasPowerBackup && <span>—</span>}
                    </div>
                  </td>

                  <td className="py-3 px-4 whitespace-nowrap">
                    <select
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

                  <td className="py-3 px-4 whitespace-nowrap text-right">
                    <div className="flex items-center justify-end gap-1.5">
                      {e.contactPhone && (
                        <>
                          <a
                            href={`https://wa.me/91${e.contactPhone}?text=Hi%20${encodeURIComponent(
                              l.authorName
                            )}%2C%20saw%20your%20rental%20post%20for%20${encodeURIComponent(
                              e.societyName || l.location
                            )}%20near%20PTP.`}
                            target="_blank"
                            rel="noreferrer"
                            className="p-1 rounded bg-emerald-600/20 text-emerald-400 hover:bg-emerald-600/40"
                            title="WhatsApp"
                          >
                            <MessageCircle className="w-3.5 h-3.5" />
                          </a>
                          <a
                            href={`tel:${e.contactPhone}`}
                            className="p-1 rounded bg-cyan-600/20 text-cyan-400 hover:bg-cyan-600/40"
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
                        className="p-1 rounded bg-slate-800 text-slate-300 hover:bg-slate-700"
                        title="Facebook Post"
                      >
                        <ExternalLink className="w-3.5 h-3.5" />
                      </a>
                    </div>
                  </td>
                </tr>
              );
            })}
          </tbody>
        </table>
      </div>
    </div>
  );
};
