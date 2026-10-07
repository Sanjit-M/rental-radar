import React, { useState, useMemo } from 'react';
import { RentalListing, UserListingStatus } from '../../domain/types';
import { PROTOTYPE_LISTINGS } from './mockData';
import {
  Compass,
  Search,
  ExternalLink,
  ShieldCheck,
  Droplets,
  AlertTriangle,
  CheckCircle2,
  XCircle,
  Clock,
  User,
  Zap,
  Building,
  Phone,
  MessageCircle,
  X,
  Sparkles,
  Command,
} from 'lucide-react';

interface VariantAuthenticityLedgerProps {
  readonly listings?: readonly RentalListing[] | undefined;
  readonly onStatusChange?: ((id: number, status: UserListingStatus) => void) | undefined;
  readonly replayKey?: number | undefined;
}

export const VariantAuthenticityLedger: React.FC<VariantAuthenticityLedgerProps> = ({
  listings = PROTOTYPE_LISTINGS,
  onStatusChange,
}) => {
  const activePool = listings.length > 0 ? listings : PROTOTYPE_LISTINGS;

  // Command Palette State
  const [isCmdkOpen, setIsCmdkOpen] = useState(false);
  const [cmdkQuery, setCmdkQuery] = useState('');

  // Active Filter state
  const [filterTag, setFilterTag] = useState<'all' | 'cauvery' | 'zero-brokerage' | 'low-deposit' | 'gated'>('all');

  // Interactive Checklist User Vetting State (persisted per listing in local state)
  const [vettedItems, setVettedItems] = useState<Record<string, boolean>>({});

  const toggleVetted = (listingId: number, checkKey: string) => {
    const key = `${listingId}_${checkKey}`;
    setVettedItems((prev) => ({ ...prev, [key]: !prev[key] }));
  };

  // Filter listings based on command palette query and tags
  const filteredListings = useMemo(() => {
    return activePool.filter((l) => {
      // Query filter
      if (cmdkQuery.trim()) {
        const q = cmdkQuery.toLowerCase();
        const text = `${l.rawText} ${l.location} ${l.entities.societyName ?? ''} ${l.authorName} ${l.groupName}`.toLowerCase();
        if (!text.includes(q)) return false;
      }

      // Tag filter
      if (filterTag === 'cauvery') {
        const isCauvery = l.rawText.toLowerCase().includes('cauvery') || l.rawText.toLowerCase().includes('kaveri');
        if (!isCauvery) return false;
      } else if (filterTag === 'zero-brokerage') {
        if (l.entities.isBrokerage) return false;
      } else if (filterTag === 'low-deposit') {
        const ratio = l.entities.deposit && l.entities.rent ? l.entities.deposit / l.entities.rent : 99;
        if (ratio > 2.5) return false;
      } else if (filterTag === 'gated') {
        if (!l.entities.isGatedSociety) return false;
      }

      return true;
    });
  }, [activePool, cmdkQuery, filterTag]);

  return (
    <div className="relative w-full h-full flex flex-col bg-slate-950 text-slate-100 overflow-hidden font-sans select-none pb-28">
      {/* Top Ledger Header */}
      <header className="shrink-0 px-4 pt-3 pb-3 bg-slate-950/95 backdrop-blur-xl border-b border-slate-800/80 z-20">
        <div className="flex items-center justify-between gap-2 mb-2">
          <div className="flex items-center gap-2">
            <div className="w-7 h-7 rounded-lg bg-indigo-500/20 border border-indigo-500/40 flex items-center justify-center">
              <ShieldCheck className="w-4 h-4 text-indigo-400" />
            </div>
            <div>
              <div className="flex items-center gap-1.5">
                <span className="text-xs font-black text-white">Authenticity Ledger</span>
                <span className="text-[9px] uppercase font-bold tracking-wider px-1.5 py-0.2 rounded-full bg-indigo-500/20 text-indigo-300 border border-indigo-500/40">
                  Provenance Engine
                </span>
              </div>
              <p className="text-[10px] text-slate-400">Radical Source Audit & Landlord Sanity Checklist</p>
            </div>
          </div>

          {/* cmdk trigger button */}
          <button
            type="button"
            onClick={() => setIsCmdkOpen(true)}
            className="flex items-center gap-1.5 px-3 py-1.5 rounded-xl bg-slate-900 border border-slate-700/80 text-xs text-slate-300 hover:text-white hover:border-indigo-500/50 shadow"
          >
            <Command className="w-3.5 h-3.5 text-indigo-400" />
            <span className="font-semibold text-[11px]">Audit</span>
            <kbd className="text-[9px] font-mono px-1 py-0.5 rounded bg-slate-950 text-slate-400 border border-slate-800">
              ⌘K
            </kbd>
          </button>
        </div>

        {/* Quick Provenance Filter Pills */}
        <div className="flex items-center gap-1.5 overflow-x-auto no-scrollbar pt-1">
          <button
            type="button"
            onClick={() => setFilterTag('all')}
            className={`px-2.5 py-1 rounded-xl text-[11px] font-semibold border shrink-0 transition-colors ${
              filterTag === 'all'
                ? 'bg-indigo-600 text-white border-indigo-500'
                : 'bg-slate-900 text-slate-400 border-slate-800 hover:border-slate-700'
            }`}
          >
            All Sources ({activePool.length})
          </button>

          <button
            type="button"
            onClick={() => setFilterTag('cauvery')}
            className={`px-2.5 py-1 rounded-xl text-[11px] font-semibold border shrink-0 transition-colors ${
              filterTag === 'cauvery'
                ? 'bg-cyan-600 text-white border-cyan-500'
                : 'bg-slate-900 text-slate-400 border-slate-800 hover:border-slate-700'
            }`}
          >
            💧 Cauvery Water Only
          </button>

          <button
            type="button"
            onClick={() => setFilterTag('zero-brokerage')}
            className={`px-2.5 py-1 rounded-xl text-[11px] font-semibold border shrink-0 transition-colors ${
              filterTag === 'zero-brokerage'
                ? 'bg-emerald-600 text-white border-emerald-500'
                : 'bg-slate-900 text-slate-400 border-slate-800 hover:border-slate-700'
            }`}
          >
            🛡️ 0% Brokerage
          </button>

          <button
            type="button"
            onClick={() => setFilterTag('low-deposit')}
            className={`px-2.5 py-1 rounded-xl text-[11px] font-semibold border shrink-0 transition-colors ${
              filterTag === 'low-deposit'
                ? 'bg-amber-600 text-white border-amber-500'
                : 'bg-slate-900 text-slate-400 border-slate-800 hover:border-slate-700'
            }`}
          >
            💰 Deposit &lt; 2.5x Rent
          </button>
        </div>
      </header>

      {/* Main Ledger Content using Native Semantic HTML Elements */}
      <main className="flex-1 overflow-y-auto px-4 py-3 space-y-4">
        {filteredListings.length === 0 ? (
          <div className="p-8 text-center bg-slate-900/60 rounded-3xl border border-slate-800 text-slate-400 text-xs">
            No listings match the current authenticity audit criteria. Reset filters above.
          </div>
        ) : (
          filteredListings.map((listing) => {
            const hasCauvery = listing.rawText.toLowerCase().includes('cauvery') || listing.rawText.toLowerCase().includes('kaveri');
            const depositRatio = listing.entities.deposit && listing.entities.rent
              ? (listing.entities.deposit / listing.entities.rent).toFixed(1)
              : null;
            const isFairDeposit = depositRatio ? Number(depositRatio) <= 2.5 : false;

            return (
              <article
                key={listing.id}
                className="p-4 rounded-3xl bg-slate-900/90 border border-slate-800 hover:border-slate-700 shadow-xl space-y-3.5 transition-colors"
              >
                {/* 1. Verified Facebook Source Banner */}
                <header className="p-3 rounded-2xl bg-slate-950 border border-slate-800/80 space-y-2">
                  <div className="flex items-center justify-between text-[11px]">
                    <div className="flex items-center gap-1.5 text-indigo-400 font-semibold truncate max-w-[220px]">
                      <span className="w-2 h-2 rounded-full bg-emerald-400 animate-pulse shrink-0" />
                      <span className="truncate">{listing.groupName}</span>
                    </div>

                    <a
                      href={listing.postUrl}
                      target="_blank"
                      rel="noreferrer"
                      className="inline-flex items-center gap-1 text-[10px] text-slate-400 hover:text-white shrink-0 hover:underline"
                    >
                      <span>Original Post</span>
                      <ExternalLink className="w-3 h-3" />
                    </a>
                  </div>

                  <div className="flex items-center justify-between text-[10px] text-slate-400 font-mono">
                    <span className="flex items-center gap-1">
                      <User className="w-3 h-3 text-slate-500" />
                      <strong>{listing.authorName}</strong>
                    </span>
                    <span className="flex items-center gap-1">
                      <Clock className="w-3 h-3 text-slate-500" />
                      <span>Scraped {listing.postedTime} via Playwright</span>
                    </span>
                  </div>

                  {listing.postCount && listing.postCount > 1 && (
                    <div className="text-[10px] font-semibold text-emerald-400 bg-emerald-950/40 px-2 py-0.5 rounded border border-emerald-500/20 inline-block">
                      Seen in {listing.postCount} Facebook groups (Cross-posted)
                    </div>
                  )}
                </header>

                {/* 2. Uncropped authentic post preview */}
                <section className="space-y-1">
                  <span className="text-[10px] font-bold uppercase tracking-wider text-slate-500 block">
                    Authentic Facebook Text Preview
                  </span>
                  <div className="p-3 rounded-2xl bg-slate-950/60 border border-slate-800/60 text-xs text-slate-300 font-sans whitespace-pre-wrap leading-relaxed select-text">
                    {listing.rawText}
                  </div>
                </section>

                {/* 3. Landlord Sanity Checklist (Bangalore Decision Workspace) */}
                <section className="p-3.5 rounded-2xl bg-slate-950 border border-slate-800/90 space-y-2.5">
                  <div className="flex items-center justify-between">
                    <span className="text-xs font-bold text-white flex items-center gap-1.5">
                      <ShieldCheck className="w-4 h-4 text-emerald-400" />
                      <span>Landlord Sanity Checklist</span>
                    </span>
                    <span className="text-[10px] text-slate-400 font-mono">Bangalore Vetting Standard</span>
                  </div>

                  <dl className="grid grid-cols-1 gap-2 text-xs">
                    {/* Water source sanity */}
                    <div className="flex items-center justify-between p-2 rounded-xl bg-slate-900 border border-slate-800">
                      <dt className="flex items-center gap-2">
                        <Droplets className="w-3.5 h-3.5 text-cyan-400" />
                        <span className="text-slate-300">Water Infrastructure:</span>
                      </dt>
                      <dd className="font-semibold text-right">
                        {hasCauvery ? (
                          <span className="text-emerald-400 flex items-center gap-1">
                            <CheckCircle2 className="w-3 h-3" /> Cauvery Available
                          </span>
                        ) : (
                          <span className="text-amber-400 flex items-center gap-1">
                            <AlertTriangle className="w-3 h-3" /> Tanker / Borewell Only
                          </span>
                        )}
                      </dd>
                    </div>

                    {/* Deposit Multiple */}
                    <div className="flex items-center justify-between p-2 rounded-xl bg-slate-900 border border-slate-800">
                      <dt className="flex items-center gap-2">
                        <span className="text-xs">💰</span>
                        <span className="text-slate-300">Security Deposit Multiple:</span>
                      </dt>
                      <dd className="font-semibold text-right">
                        {depositRatio ? (
                          isFairDeposit ? (
                            <span className="text-emerald-400 flex items-center gap-1">
                              <CheckCircle2 className="w-3 h-3" /> {depositRatio}x Rent (Fair Multiple)
                            </span>
                          ) : (
                            <span className="text-rose-400 flex items-center gap-1">
                              <AlertTriangle className="w-3 h-3" /> {depositRatio}x Rent (High Lock-in)
                            </span>
                          )
                        ) : (
                          <span className="text-slate-500">Not Disclosed</span>
                        )}
                      </dd>
                    </div>

                    {/* Brokerage Check */}
                    <div className="flex items-center justify-between p-2 rounded-xl bg-slate-900 border border-slate-800">
                      <dt className="flex items-center gap-2">
                        <span className="text-xs">🤝</span>
                        <span className="text-slate-300">Brokerage Fee:</span>
                      </dt>
                      <dd className="font-semibold text-right">
                        {!listing.entities.isBrokerage ? (
                          <span className="text-emerald-400 flex items-center gap-1">
                            <CheckCircle2 className="w-3 h-3" /> Zero Brokerage
                          </span>
                        ) : (
                          <span className="text-amber-400 flex items-center gap-1">
                            <AlertTriangle className="w-3 h-3" /> 15-30 Days Brokerage
                          </span>
                        )}
                      </dd>
                    </div>

                    {/* Power Backup for WFH */}
                    <div className="flex items-center justify-between p-2 rounded-xl bg-slate-900 border border-slate-800">
                      <dt className="flex items-center gap-2">
                        <Zap className="w-3.5 h-3.5 text-yellow-400" />
                        <span className="text-slate-300">BESCOM Power Backup:</span>
                      </dt>
                      <dd className="font-semibold text-right">
                        {listing.entities.hasPowerBackup ? (
                          <span className="text-emerald-400 flex items-center gap-1">
                            <CheckCircle2 className="w-3 h-3" /> 100% DG Backup
                          </span>
                        ) : (
                          <span className="text-slate-500">No DG Mentioned</span>
                        )}
                      </dd>
                    </div>

                    {/* Bachelor & Food Policy */}
                    <div className="flex items-center justify-between p-2 rounded-xl bg-slate-900 border border-slate-800">
                      <dt className="flex items-center gap-2">
                        <span className="text-xs">🍳</span>
                        <span className="text-slate-300">Bachelor & Food Freedom:</span>
                      </dt>
                      <dd className="font-semibold text-right">
                        {!listing.entities.isVegetarianOnly && listing.entities.isMaleBachelorAllowed ? (
                          <span className="text-emerald-400 flex items-center gap-1">
                            <CheckCircle2 className="w-3 h-3" /> Bachelor Friendly & Non-Veg OK
                          </span>
                        ) : (
                          <span className="text-rose-400 flex items-center gap-1">
                            <XCircle className="w-3 h-3" /> Restricted
                          </span>
                        )}
                      </dd>
                    </div>
                  </dl>

                  {/* Interactive Personal Audit Vetting Checkboxes */}
                  <fieldset className="pt-2 border-t border-slate-800/80 space-y-1.5">
                    <legend className="text-[10px] text-slate-400 font-semibold mb-1">
                      Personal Vetting Checklist:
                    </legend>
                    <label className="flex items-center gap-2 text-xs text-slate-300 cursor-pointer">
                      <input
                        type="checkbox"
                        checked={Boolean(vettedItems[`${listing.id}_owner`])}
                        onChange={() => toggleVetted(listing.id, 'owner')}
                        className="rounded accent-emerald-500"
                      />
                      <span>Confirmed genuine owner/roommate on WhatsApp</span>
                    </label>
                    <label className="flex items-center gap-2 text-xs text-slate-300 cursor-pointer">
                      <input
                        type="checkbox"
                        checked={Boolean(vettedItems[`${listing.id}_visit`])}
                        onChange={() => toggleVetted(listing.id, 'visit')}
                        className="rounded accent-emerald-500"
                      />
                      <span>Scheduled physical visit during daylight</span>
                    </label>
                  </fieldset>
                </section>

                {/* Direct Action Thumb Bar */}
                <footer className="flex items-center gap-2 pt-1 border-t border-slate-800">
                  <a
                    href={`https://wa.me/91${listing.entities.contactPhone || '9845019823'}?text=${encodeURIComponent(
                      `Hi ${listing.authorName}, regarding your post in ${listing.groupName}: Is the listing still available?`
                    )}`}
                    target="_blank"
                    rel="noreferrer"
                    className="flex-1 py-2.5 rounded-xl bg-emerald-600 hover:bg-emerald-500 text-white font-black text-xs flex items-center justify-center gap-1.5 active:scale-95 transition-transform"
                  >
                    <MessageCircle className="w-4 h-4" />
                    <span>WhatsApp Landlord</span>
                  </a>

                  <a
                    href={`tel:${listing.entities.contactPhone || '9845019823'}`}
                    className="p-2.5 rounded-xl bg-slate-800 hover:bg-slate-700 text-slate-300 border border-slate-700 active:scale-95 transition-transform"
                    title="Call Landlord"
                  >
                    <Phone className="w-4 h-4" />
                  </a>
                </footer>
              </article>
            );
          })
        )}
      </main>

      {/* Bottom Sheet Command Palette (cmdk pattern) */}
      {isCmdkOpen && (
        <div className="fixed inset-0 z-50 flex flex-col justify-end">
          {/* Backdrop */}
          <div
            onClick={() => setIsCmdkOpen(false)}
            className="absolute inset-0 bg-black/70 backdrop-blur-sm"
          />

          {/* Palette Sheet */}
          <div className="relative w-full rounded-t-3xl bg-slate-900 border-t border-slate-700 p-4 space-y-3 shadow-2xl max-h-[75vh] flex flex-col">
            <div className="flex items-center justify-between pb-2 border-b border-slate-800">
              <div className="flex items-center gap-2">
                <Command className="w-4 h-4 text-indigo-400" />
                <span className="text-xs font-bold text-white">Provenance Command Palette</span>
              </div>
              <button
                type="button"
                onClick={() => setIsCmdkOpen(false)}
                className="p-1 rounded-lg text-slate-400 hover:text-white"
              >
                <X className="w-4 h-4" />
              </button>
            </div>

            {/* Instant Search Input */}
            <div className="relative">
              <Search className="w-4 h-4 absolute left-3 top-3 text-slate-400" />
              <input
                type="text"
                autoFocus
                value={cmdkQuery}
                onChange={(e) => setCmdkQuery(e.target.value)}
                placeholder="Search raw post text, society name, author..."
                className="w-full bg-slate-950 border border-slate-700 rounded-xl pl-9 pr-3 py-2 text-xs text-white placeholder-slate-500 focus:outline-none focus:border-indigo-500"
              />
            </div>

            {/* Quick Actions List */}
            <div className="flex-1 overflow-y-auto space-y-2 pt-1 text-xs">
              <span className="text-[10px] font-bold text-slate-500 uppercase tracking-wider block">
                Quick Audit Filters
              </span>

              <button
                type="button"
                onClick={() => {
                  setFilterTag('cauvery');
                  setIsCmdkOpen(false);
                }}
                className="w-full p-2.5 rounded-xl bg-slate-950 hover:bg-slate-800 text-left flex items-center justify-between text-slate-300"
              >
                <span>Filter to Cauvery Water Pipeline Only</span>
                <span className="text-indigo-400 font-mono text-[10px]">Filter</span>
              </button>

              <button
                type="button"
                onClick={() => {
                  setFilterTag('zero-brokerage');
                  setIsCmdkOpen(false);
                }}
                className="w-full p-2.5 rounded-xl bg-slate-950 hover:bg-slate-800 text-left flex items-center justify-between text-slate-300"
              >
                <span>Filter to 0% Brokerage (Direct Owner)</span>
                <span className="text-emerald-400 font-mono text-[10px]">Filter</span>
              </button>

              <button
                type="button"
                onClick={() => {
                  setFilterTag('low-deposit');
                  setIsCmdkOpen(false);
                }}
                className="w-full p-2.5 rounded-xl bg-slate-950 hover:bg-slate-800 text-left flex items-center justify-between text-slate-300"
              >
                <span>Filter to Low Deposit (&le; 2.5x Rent)</span>
                <span className="text-amber-400 font-mono text-[10px]">Filter</span>
              </button>

              <button
                type="button"
                onClick={() => {
                  setCmdkQuery('');
                  setFilterTag('all');
                  setIsCmdkOpen(false);
                }}
                className="w-full p-2.5 rounded-xl bg-slate-950 hover:bg-slate-800 text-left flex items-center justify-between text-rose-300"
              >
                <span>Reset All Filters and Queries</span>
                <span className="text-slate-500 font-mono text-[10px]">Reset</span>
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};
