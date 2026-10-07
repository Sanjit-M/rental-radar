import React, { useState, useEffect, useRef } from 'react';
import { RentalListing, UserListingStatus } from '../../domain/types';
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
} from 'lucide-react';

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
  windowMs: number = 100
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
  return (last.y - first.y) / dt; // px/ms
}

/**
 * Apple fluid interface momentum projection formula.
 * Deceleration rate d = 0.998 corresponds to standard physical scroll/swipe decay.
 * Projects resting endpoint: (vy * 1000) * 0.998 / (1 - 0.998)
 *
 * @param vy release velocity in normalized units (where vy * 1000 is velocity in px/ms)
 * @param decelerationRate default 0.998
 */
export function projectMomentum(
  vy: number,
  decelerationRate: number = 0.998
): number {
  return ((vy * 1000) * decelerationRate) / (1 - decelerationRate);
}

/**
 * Projects the final resting position of a gesture given current delta and release velocity.
 */
export function projectRestingEndpoint(
  currentDeltaY: number,
  vy: number,
  decelerationRate: number = 0.998
): number {
  return currentDeltaY + projectMomentum(vy, decelerationRate);
}

export function detectWaterSource(rawText: string): { readonly label: string; readonly isCauvery: boolean } {
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
  if (lower.includes('24/7 water') || lower.includes('24 hrs water') || lower.includes('24 hours water')) {
    return { label: '24/7 Running Water Supply', isCauvery: false };
  }
  return { label: 'Water Source Not Specified', isCauvery: false };
}

export const ListingDrawer: React.FC<ListingDrawerProps> = ({
  listing,
  isOpen,
  onClose,
  onStatusChange,
  onOpenScoreModal,
}) => {
  const [activeImgIdx, setActiveImgIdx] = useState(0);
  const [isCopied, setIsCopied] = useState(false);
  const [touchDeltaY, setTouchDeltaY] = useState(0);
  const [isDragging, setIsDragging] = useState(false);
  const touchStartY = useRef<number>(0);
  const touchHistory = useRef<TouchSample[]>([]);

  // Reset image index when listing changes
  useEffect(() => {
    setActiveImgIdx(0);
    setTouchDeltaY(0);
    touchHistory.current = [];
  }, [listing?.id]);

  // Handle ESC key
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

  // Touch drag-to-dismiss physics for mobile bottom sheet with Apple momentum projection
  const handleTouchStart = (e: React.TouchEvent<HTMLDivElement>) => {
    const touch = e.touches[0];
    if (touch) {
      const now = performance.now();
      touchStartY.current = touch.clientY;
      touchHistory.current = [{ y: touch.clientY, time: now }];
      setIsDragging(true);
    }
  };

  const handleTouchMove = (e: React.TouchEvent<HTMLDivElement>) => {
    if (!isDragging) return;
    const touch = e.touches[0];
    if (touch) {
      const now = performance.now();
      touchHistory.current.push({ y: touch.clientY, time: now });
      // Retain touch history within last 100ms
      touchHistory.current = touchHistory.current.filter((s) => now - s.time <= 100);
      const delta = touch.clientY - touchStartY.current;
      if (delta > 0) {
        setTouchDeltaY(delta);
      }
    }
  };

  const handleTouchEnd = () => {
    const vyPxPerMs = computeReleaseVelocity(touchHistory.current);
    // vy normalized so that (vy * 1000) * 0.998 / (1 - 0.998) gives physical distance in pixels
    const vy = vyPxPerMs / 1000;
    const projectedEndpoint = projectRestingEndpoint(touchDeltaY, vy);

    if (projectedEndpoint > 140 || touchDeltaY > 120) {
      onClose();
    }
    setTouchDeltaY(0);
    setIsDragging(false);
    touchHistory.current = [];
  };

  const handleCopyText = (text: string) => {
    navigator.clipboard.writeText(text);
    setIsCopied(true);
    toast.info('Post text copied to clipboard');
    setTimeout(() => setIsCopied(false), 2000);
  };

  const handleStatusSelect = (status: UserListingStatus) => {
    if (!listing) return;
    onStatusChange(listing.id, status);
    toast.success(`Pipeline updated: marked as ${status}`);
  };

  if (!isOpen || !listing) return null;

  const e = listing.entities;
  const images = listing.imageUrls ?? e.imageUrls ?? [];
  const waterInfo = detectWaterSource(listing.rawText);

  const depositMultiple =
    e.rent && e.deposit ? (e.deposit / e.rent).toFixed(1) : null;

  const statusOptions: { readonly id: UserListingStatus; readonly label: string; readonly color: string }[] = [
    { id: 'new', label: 'New', color: 'bg-slate-800 text-slate-300 border-slate-700' },
    { id: 'interested', label: '⭐ Interested', color: 'bg-amber-950/80 text-amber-300 border-amber-500/50' },
    { id: 'called', label: '📞 Called', color: 'bg-blue-950/80 text-blue-300 border-blue-500/50' },
    { id: 'applied', label: '📝 Applied', color: 'bg-emerald-950/80 text-emerald-300 border-emerald-500/50' },
    { id: 'rejected', label: '❌ Rejected', color: 'bg-rose-950/80 text-rose-300 border-rose-500/50' },
  ];

  return (
    <div
      role="dialog"
      aria-modal="true"
      className="fixed inset-0 z-50 bg-slate-950/80 backdrop-blur-md flex justify-end"
      onClick={onClose}
    >
      <div
        style={{
          transform: touchDeltaY > 0 ? `translateY(${touchDeltaY}px)` : undefined,
          transition: isDragging
            ? 'none'
            : 'transform 260ms var(--ease-drawer)',
        }}
        onClick={(ev) => ev.stopPropagation()}
        className="w-full md:max-w-xl h-full bg-slate-900 border-t md:border-t-0 md:border-l border-slate-700/80 shadow-2xl flex flex-col justify-between overflow-hidden fixed md:static inset-x-0 bottom-0 md:inset-auto max-h-[92vh] md:max-h-full rounded-t-3xl md:rounded-t-none"
      >
        {/* Mobile Pull-Down Drag Bar */}
        <div
          onTouchStart={handleTouchStart}
          onTouchMove={handleTouchMove}
          onTouchEnd={handleTouchEnd}
          className="w-full py-3 flex justify-center cursor-grab active:cursor-grabbing md:hidden select-none bg-slate-900 border-b border-slate-800/60"
        >
          <div className="w-12 h-1.5 bg-slate-700 rounded-full" />
        </div>

        {/* Scrollable Drawer Body */}
        <div className="overflow-y-auto flex-1 p-5 md:p-6 space-y-6">
          {/* Top Header & Close Button */}
          <div className="flex items-start justify-between gap-3">
            <div>
              <div className="flex items-center gap-2 flex-wrap">
                <span className="text-xs font-bold px-2.5 py-0.5 rounded-full bg-emerald-950 text-emerald-300 border border-emerald-500/40">
                  {listing.bhkType}
                </span>
                <span className="text-xs text-slate-400">
                  {e.societyName ? `in ${e.societyName}` : listing.location}
                </span>
              </div>
              <h2 className="text-xl font-black text-white mt-1 leading-snug">
                {e.societyName || `${listing.location} (near PTP)`}
              </h2>
              {(listing.landmark || e.landmark) && (
                <div className="text-xs text-cyan-300 mt-0.5 flex items-center gap-1">
                  <span>📍</span>
                  <span>{listing.landmark || e.landmark}</span>
                </div>
              )}
            </div>

            <div className="flex items-center gap-2 shrink-0">
              <RatingBadge
                score={listing.score}
                tier={listing.tier}
                onClick={() => onOpenScoreModal(listing)}
              />
              <button
                type="button"
                onClick={onClose}
                className="p-2 rounded-xl bg-slate-800 hover:bg-slate-700 text-slate-300 hover:text-white transition-colors duration-140 ease-[var(--ease-out)] active:scale-[0.97]"
                title="Close drawer"
              >
                <X className="w-5 h-5" />
              </button>
            </div>
          </div>

          {/* Verified Facebook Post Banner */}
          <div className="p-3.5 rounded-2xl bg-gradient-to-r from-blue-950/60 to-indigo-950/50 border border-blue-500/30 flex items-center justify-between text-xs">
            <div className="flex items-center gap-3">
              <div className="w-9 h-9 rounded-xl bg-blue-600/30 border border-blue-400/30 flex items-center justify-center text-blue-400 font-bold shrink-0">
                FB
              </div>
              <div>
                <div className="flex items-center gap-1.5 font-semibold text-white">
                  <User className="w-3.5 h-3.5 text-blue-400" />
                  <span>{listing.authorName}</span>
                  <span className="text-[10px] text-blue-300 bg-blue-900/60 px-1.5 py-0.2 rounded border border-blue-500/30">
                    Verified Post
                  </span>
                </div>
                <div className="text-[11px] text-slate-300 flex items-center gap-2 mt-0.5">
                  <span className="flex items-center gap-1">
                    <Clock className="w-3 h-3 text-cyan-400" /> {listing.postedTime}
                  </span>
                  <span>•</span>
                  <span className="truncate max-w-[150px]">{listing.groupName}</span>
                </div>
              </div>
            </div>

            <a
              href={listing.postUrl}
              target="_blank"
              rel="noreferrer"
              className="flex items-center gap-1.5 px-3 py-1.5 rounded-xl bg-blue-600 hover:bg-blue-500 text-white font-bold text-xs transition-[background-color,transform] duration-140 ease-[var(--ease-out)] active:scale-[0.97] shrink-0 shadow-md shadow-blue-600/20"
            >
              <span>View Post</span>
              <ExternalLink className="w-3.5 h-3.5" />
            </a>
          </div>

          {/* Photo Gallery Viewer */}
          {images.length > 0 ? (
            <div className="space-y-2">
              <div className="relative aspect-video rounded-2xl overflow-hidden bg-slate-950 border border-slate-800 shadow-inner group">
                <img
                  src={images[activeImgIdx]}
                  alt="Rental Listing"
                  className="w-full h-full object-cover"
                />

                {images.length > 1 && (
                  <>
                    <button
                      type="button"
                      onClick={() => setActiveImgIdx((prev) => (prev > 0 ? prev - 1 : images.length - 1))}
                      className="absolute left-3 top-1/2 -translate-y-1/2 p-2 rounded-full bg-slate-950/80 hover:bg-slate-950 text-white border border-slate-700 shadow-lg transition-[transform,background-color] duration-140 ease-[var(--ease-out)] active:scale-[0.97]"
                    >
                      <ChevronLeft className="w-4 h-4" />
                    </button>
                    <button
                      type="button"
                      onClick={() => setActiveImgIdx((prev) => (prev < images.length - 1 ? prev + 1 : 0))}
                      className="absolute right-3 top-1/2 -translate-y-1/2 p-2 rounded-full bg-slate-950/80 hover:bg-slate-950 text-white border border-slate-700 shadow-lg transition-[transform,background-color] duration-140 ease-[var(--ease-out)] active:scale-[0.97]"
                    >
                      <ChevronRight className="w-4 h-4" />
                    </button>
                    <div className="absolute bottom-2 right-2 bg-slate-950/90 backdrop-blur-md px-2.5 py-1 rounded-full text-[11px] font-mono text-white border border-slate-700">
                      {activeImgIdx + 1} / {images.length}
                    </div>
                  </>
                )}
              </div>

              {/* Thumbnails */}
              {images.length > 1 && (
                <div className="flex items-center gap-2 overflow-x-auto pb-1">
                  {images.map((img, idx) => (
                    <button
                      key={idx}
                      type="button"
                      onClick={() => setActiveImgIdx(idx)}
                      className={`w-14 h-14 rounded-xl overflow-hidden shrink-0 border-2 transition-[border-color,opacity,transform] duration-140 ease-[var(--ease-out)] active:scale-[0.97] ${
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
          ) : (
            <div className="p-8 rounded-2xl bg-slate-950/60 border border-slate-800 text-center space-y-2">
              <Building2 className="w-8 h-8 text-slate-600 mx-auto" />
              <div className="text-xs font-semibold text-slate-400">
                No direct photo uploads found in this Facebook post
              </div>
              <p className="text-[11px] text-slate-500">
                Check original Facebook post or contact the owner via WhatsApp to request photos.
              </p>
            </div>
          )}

          {/* Pricing & Terms Key Metrics */}
          <div className="grid grid-cols-2 gap-3">
            <div className="p-4 rounded-2xl bg-slate-950/80 border border-slate-800 space-y-1">
              <div className="text-[11px] text-slate-400 font-medium">Monthly Rent</div>
              <div className="text-2xl font-black font-mono text-emerald-400">
                {e.rent ? `₹${e.rent.toLocaleString('en-IN')}` : 'Contact for Rent'}
              </div>
              <div className="text-[10px] text-slate-500 font-mono">per calendar month</div>
            </div>

            <div className="p-4 rounded-2xl bg-slate-950/80 border border-slate-800 space-y-1">
              <div className="text-[11px] text-slate-400 font-medium">Security Deposit</div>
              <div className="text-xl font-black font-mono text-white">
                {e.deposit ? `₹${e.deposit.toLocaleString('en-IN')}` : 'Negotiable'}
              </div>
              <div className="text-[10px] text-slate-400 font-mono">
                {depositMultiple ? `${depositMultiple}x monthly rent` : 'Standard terms'}
              </div>
            </div>
          </div>

          {/* Commute Window to PTP */}
          <div className="p-4 rounded-2xl bg-slate-950/80 border border-slate-800 space-y-3">
            <div className="flex items-center justify-between">
              <div className="flex items-center gap-2">
                <Compass className="w-4 h-4 text-cyan-400" />
                <span className="text-xs font-bold text-slate-200">
                  Prestige Tech Park (PTP) Commute
                </span>
              </div>
              <span className="text-xs font-mono font-bold text-cyan-400">
                {listing.commute.twoWayAvgPeakMins}m average peak
              </span>
            </div>

            <div className="grid grid-cols-3 gap-2 text-center text-xs">
              <div className="p-2.5 rounded-xl bg-slate-900 border border-slate-800">
                <div className="text-[10px] text-slate-400 font-medium">Morning 11am</div>
                <div className="text-sm font-bold font-mono text-white mt-0.5">
                  {listing.commute.inboundMins} mins
                </div>
              </div>
              <div className="p-2.5 rounded-xl bg-slate-900 border border-slate-800">
                <div className="text-[10px] text-slate-400 font-medium">Evening 5pm</div>
                <div className="text-sm font-bold font-mono text-white mt-0.5">
                  {listing.commute.outboundMins} mins
                </div>
              </div>
              <div className="p-2.5 rounded-xl bg-slate-900 border border-slate-800">
                <div className="text-[10px] text-slate-400 font-medium">Distance</div>
                <div className="text-sm font-bold font-mono text-white mt-0.5">
                  {listing.commute.distanceKm} km
                </div>
              </div>
            </div>

            <div className="text-[11px] flex items-center gap-2 pt-1">
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

          {/* Key Amenities & Verification Tags */}
          <div className="space-y-2">
            <h4 className="text-xs font-bold uppercase tracking-wider text-slate-400">
              Verified Property Specs
            </h4>
            <div className="flex flex-wrap gap-2 text-xs">
              {/* Zero Brokerage */}
              {e.isBrokerage ? (
                <span className="px-3 py-1.5 rounded-xl bg-rose-950/60 text-rose-300 border border-rose-500/30 flex items-center gap-1.5 font-medium">
                  Broker Fee Applicable
                </span>
              ) : (
                <span className="px-3 py-1.5 rounded-xl bg-emerald-950/60 text-emerald-300 border border-emerald-500/30 flex items-center gap-1.5 font-bold shadow-sm">
                  <ShieldCheck className="w-4 h-4 text-emerald-400" /> Zero Brokerage / Direct Owner
                </span>
              )}

              {/* Water Source Tag */}
              <span
                className={`px-3 py-1.5 rounded-xl border flex items-center gap-1.5 font-medium ${
                  waterInfo.isCauvery
                    ? 'bg-cyan-950/60 text-cyan-300 border-cyan-500/40'
                    : 'bg-slate-900 text-slate-300 border-slate-700'
                }`}
              >
                <Droplets className="w-4 h-4 text-cyan-400" />
                {waterInfo.label}
              </span>

              {/* Furnishing */}
              <span className="px-3 py-1.5 rounded-xl bg-slate-900 text-slate-300 border border-slate-700">
                {e.furnishing}
              </span>

              {/* Gated Society */}
              {e.isGatedSociety && (
                <span className="px-3 py-1.5 rounded-xl bg-indigo-950/60 text-indigo-300 border border-indigo-500/30 flex items-center gap-1.5">
                  <Building2 className="w-4 h-4 text-indigo-400" /> Gated Society
                </span>
              )}

              {/* Pool */}
              {e.hasSwimmingPool && (
                <span className="px-3 py-1.5 rounded-xl bg-blue-950/60 text-blue-300 border border-blue-500/30 flex items-center gap-1.5">
                  <Waves className="w-4 h-4 text-blue-400" /> Swimming Pool
                </span>
              )}

              {/* DG Backup */}
              {e.hasPowerBackup && (
                <span className="px-3 py-1.5 rounded-xl bg-amber-950/60 text-amber-300 border border-amber-500/30 flex items-center gap-1.5">
                  <Zap className="w-4 h-4 text-amber-400" /> 100% Generator Backup
                </span>
              )}

              {/* Attached Bathroom */}
              {e.hasAttachedWashroom && (
                <span className="px-3 py-1.5 rounded-xl bg-teal-950/60 text-teal-300 border border-teal-500/30 flex items-center gap-1.5">
                  <Bath className="w-4 h-4 text-teal-400" /> Attached Washroom
                </span>
              )}

              {/* Food Preference */}
              {e.isVegetarianOnly && (
                <span className="px-3 py-1.5 rounded-xl bg-amber-950/60 text-amber-300 border border-amber-500/40 flex items-center gap-1.5 font-medium">
                  <Leaf className="w-4 h-4 text-amber-400" /> Strict Vegetarian Only
                </span>
              )}
            </div>
          </div>

          {/* Full Post Description */}
          <div className="space-y-2">
            <div className="flex items-center justify-between text-xs">
              <span className="font-bold uppercase tracking-wider text-slate-400">
                Original Facebook Post Text
              </span>
              <button
                type="button"
                onClick={() => handleCopyText(listing.rawText)}
                className="flex items-center gap-1 text-[11px] text-cyan-400 hover:text-cyan-300 font-semibold transition-colors duration-140 ease-[var(--ease-out)] active:scale-[0.97]"
              >
                {isCopied ? <Check className="w-3.5 h-3.5 text-emerald-400" /> : <Copy className="w-3.5 h-3.5" />}
                <span>{isCopied ? 'Copied!' : 'Copy Text'}</span>
              </button>
            </div>
            <div className="p-4 rounded-2xl bg-slate-950/80 border border-slate-800 text-xs text-slate-300 leading-relaxed whitespace-pre-line font-sans shadow-inner">
              {listing.rawText}
            </div>
          </div>

          {/* Contact Details */}
          {e.contactPhone && (
            <div className="p-4 rounded-2xl bg-gradient-to-r from-emerald-950/60 to-teal-950/50 border border-emerald-500/40 flex items-center justify-between">
              <div>
                <span className="text-[11px] text-emerald-300 font-medium block">
                  Direct Contact Number
                </span>
                <span className="text-base font-mono font-bold text-white tracking-wider">
                  +91 {e.contactPhone}
                </span>
              </div>
              <div className="flex items-center gap-2">
                <a
                  href={`tel:${e.contactPhone}`}
                  onClick={() => toast.info(`Calling +91 ${e.contactPhone}`)}
                  className="px-3.5 py-2 rounded-xl bg-cyan-600 hover:bg-cyan-500 text-white font-bold text-xs flex items-center gap-1.5 shadow transition-[background-color,transform] duration-140 ease-[var(--ease-out)] active:scale-[0.97]"
                >
                  <Phone className="w-3.5 h-3.5" /> Call
                </a>
                <a
                  href={`https://wa.me/91${e.contactPhone}?text=Hi%20${encodeURIComponent(
                    listing.authorName
                  )}%2C%20saw%20your%20rental%20post%20for%20${encodeURIComponent(
                    e.societyName || listing.location
                  )}%20near%20PTP.%20Is%20it%20available%3F`}
                  target="_blank"
                  rel="noreferrer"
                  onClick={() => toast.info(`Opening WhatsApp for +91 ${e.contactPhone}`)}
                  className="px-3.5 py-2 rounded-xl bg-emerald-600 hover:bg-emerald-500 text-white font-bold text-xs flex items-center gap-1.5 shadow transition-[background-color,transform] duration-140 ease-[var(--ease-out)] active:scale-[0.97]"
                >
                  <MessageCircle className="w-3.5 h-3.5" /> WhatsApp
                </a>
              </div>
            </div>
          )}
        </div>

        {/* Action Footer Bar */}
        <div className="p-4 bg-slate-950 border-t border-slate-800 space-y-3">
          {/* Status Pipeline Pills */}
          <div className="flex items-center justify-between gap-1.5">
            <span className="text-[11px] text-slate-400 font-semibold shrink-0">Pipeline:</span>
            <div className="flex items-center gap-1.5 overflow-x-auto pb-0.5">
              {statusOptions.map((opt) => (
                <button
                  key={opt.id}
                  type="button"
                  onClick={() => handleStatusSelect(opt.id)}
                  className={`px-2.5 py-1 rounded-xl text-xs font-semibold border transition-[color,background-color,border-color,box-shadow,transform] duration-140 ease-[var(--ease-out)] active:scale-[0.97] ${
                    listing.userStatus === opt.id
                      ? `${opt.color} ring-2 ring-emerald-500/40 scale-105 font-bold`
                      : 'bg-slate-900 text-slate-400 border-slate-800 hover:border-slate-700'
                  }`}
                >
                  {opt.label}
                </button>
              ))}
            </div>
          </div>

          {/* Primary Action Buttons */}
          <div className="flex items-center gap-2.5">
            <button
              type="button"
              onClick={() => onOpenScoreModal(listing)}
              className="flex-1 py-2.5 rounded-xl bg-slate-900 hover:bg-slate-800 text-slate-200 border border-slate-700 font-bold text-xs flex items-center justify-center gap-1.5 transition-[background-color,transform] duration-140 ease-[var(--ease-out)] active:scale-[0.97]"
            >
              <Sparkles className="w-4 h-4 text-emerald-400" />
              <span>Score Breakdown</span>
            </button>

            <a
              href={listing.postUrl}
              target="_blank"
              rel="noreferrer"
              className="flex-1 py-2.5 rounded-xl bg-gradient-to-r from-emerald-500 to-teal-500 hover:from-emerald-400 hover:to-teal-400 text-slate-950 font-bold text-xs flex items-center justify-center gap-1.5 shadow-lg shadow-emerald-500/20 transition-[background-color,transform,box-shadow] duration-140 ease-[var(--ease-out)] active:scale-[0.97]"
            >
              <ExternalLink className="w-4 h-4" />
              <span>Facebook Post</span>
            </a>
          </div>
        </div>
      </div>
    </div>
  );
};
