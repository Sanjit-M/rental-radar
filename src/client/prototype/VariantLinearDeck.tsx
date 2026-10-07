import React, { useState, useRef, useEffect, useCallback } from 'react';
import { RentalListing, UserListingStatus } from '../../domain/types';
import { PROTOTYPE_LISTINGS } from './mockData';
import {
  Compass,
  Heart,
  X,
  Phone,
  MessageCircle,
  ExternalLink,
  Info,
  RotateCcw,
  SlidersHorizontal,
  Bookmark,
  Layers,
  Sparkles,
  Droplets,
  ShieldCheck,
  Building2,
  Bike,
  AlertTriangle,
  ChevronUp,
  MapPin,
  CheckCircle2,
  Share2,
} from 'lucide-react';

interface VariantLinearDeckProps {
  readonly listings?: readonly RentalListing[] | undefined;
  readonly onStatusChange?: ((id: number, status: UserListingStatus) => void) | undefined;
  readonly replayKey?: number | undefined;
}

type DeckTab = 'explore' | 'corridors' | 'saved' | 'filters';
type SheetSnapStage = 'closed' | 'half' | 'full';

const CORRIDORS = [
  { id: 'all', name: 'All Perimeter', time: '8-26m to PTP' },
  { id: 'Kadubeesanahalli', name: 'Kadubeesanahalli', time: '8m walk / 3m scooter' },
  { id: 'Bellandur', name: 'Bellandur / Green Glen', time: '14-18m scooter' },
  { id: 'Cessna', name: 'Cessna Tech Zone', time: '10-12m scooter' },
  { id: 'Marathahalli', name: 'Marathahalli ORR', time: '16-22m scooter' },
  { id: 'Panathur', name: 'Panathur / Balagere', time: '22-30m (choke point)' },
];

export const VariantLinearDeck: React.FC<VariantLinearDeckProps> = ({
  listings = PROTOTYPE_LISTINGS,
  onStatusChange,
  replayKey = 0,
}) => {
  const activePool = listings.length > 0 ? listings : PROTOTYPE_LISTINGS;

  // Deck State
  const [activeTab, setActiveTab] = useState<DeckTab>('explore');
  const [selectedCorridor, setSelectedCorridor] = useState<string>('all');
  const [currentIndex, setCurrentIndex] = useState(0);
  const [savedListingIds, setSavedListingIds] = useState<Set<number>>(new Set());
  const [dismissedListingIds, setDismissedListingIds] = useState<Set<number>>(new Set());

  // Quick Filters
  const [maxRentFilter, setMaxRentFilter] = useState(45000);
  const [zeroBrokerageFilter, setZeroBrokerageFilter] = useState(false);
  const [bachelorOnlyFilter, setBachelorOnlyFilter] = useState(false);

  // Bottom Sheet State
  const [sheetListing, setSheetListing] = useState<RentalListing | null>(null);
  const [sheetStage, setSheetStage] = useState<SheetSnapStage>('closed');

  // Pull-to-refresh & Drag gesture physics state
  const [dragOffset, setDragOffset] = useState({ x: 0, y: 0 });
  const [isDragging, setIsDragging] = useState(false);
  const [pullY, setPullY] = useState(0);
  const [isPulling, setIsPulling] = useState(false);
  const [isRefreshing, setIsRefreshing] = useState(false);

  // Gesture references
  const dragStartRef = useRef<{ x: number; y: number; time: number } | null>(null);
  const sheetDragStartRef = useRef<{ y: number; startStage: SheetSnapStage } | null>(null);
  const [sheetDragDeltaY, setSheetDragDeltaY] = useState(0);

  // Reset when replay is triggered
  useEffect(() => {
    setCurrentIndex(0);
    setSavedListingIds(new Set());
    setDismissedListingIds(new Set());
    setSheetStage('closed');
    setSheetListing(null);
    setDragOffset({ x: 0, y: 0 });
  }, [replayKey]);

  // Filter listings for the explore deck
  const filteredListings = activePool.filter((item) => {
    if (selectedCorridor !== 'all' && !item.location.toLowerCase().includes(selectedCorridor.toLowerCase())) {
      return false;
    }
    if (item.entities.rent && item.entities.rent > maxRentFilter) {
      return false;
    }
    if (zeroBrokerageFilter && item.entities.isBrokerage) {
      return false;
    }
    if (bachelorOnlyFilter && (item.entities.isFemaleOnly || !item.entities.isMaleBachelorAllowed)) {
      return false;
    }
    return true;
  });

  const currentListing = filteredListings[currentIndex] ?? null;
  const nextListing = filteredListings[currentIndex + 1] ?? null;
  const thirdListing = filteredListings[currentIndex + 2] ?? null;

  // Haptic feedback helper
  const triggerHaptic = (ms = 15) => {
    if (typeof window !== 'undefined' && 'navigator' in window && 'vibrate' in navigator) {
      try {
        navigator.vibrate(ms);
      } catch {
        // Ignored in non-supporting browsers
      }
    }
  };

  // Card Swipe Gesture Handlers
  const handlePointerDown = (e: React.PointerEvent<HTMLDivElement>) => {
    if (!currentListing) return;
    dragStartRef.current = { x: e.clientX, y: e.clientY, time: Date.now() };
    setIsDragging(true);
    (e.target as HTMLElement).setPointerCapture(e.pointerId);
  };

  const handlePointerMove = (e: React.PointerEvent<HTMLDivElement>) => {
    if (!isDragging || !dragStartRef.current) return;
    const dx = e.clientX - dragStartRef.current.x;
    const dy = e.clientY - dragStartRef.current.y;

    // Detect pull-to-refresh if dragging downwards near top of card
    if (dy > 0 && Math.abs(dy) > Math.abs(dx) * 1.5 && currentIndex === 0) {
      setIsPulling(true);
      // Spring resistance curve
      setPullY(Math.min(dy * 0.4, 75));
    } else {
      setIsPulling(false);
      setDragOffset({ x: dx, y: dy * 0.35 });
    }
  };

  const handlePointerUp = (e: React.PointerEvent<HTMLDivElement>) => {
    if (!isDragging) return;
    setIsDragging(false);

    if (isPulling) {
      if (pullY > 45) {
        setIsRefreshing(true);
        triggerHaptic(25);
        setTimeout(() => {
          setCurrentIndex(0);
          setIsRefreshing(false);
          setPullY(0);
          setIsPulling(false);
        }, 500);
      } else {
        setPullY(0);
        setIsPulling(false);
      }
      return;
    }

    const { x: dx } = dragOffset;
    const threshold = 110;

    if (dx > threshold && currentListing) {
      // Swiped Right -> Shortlist
      triggerHaptic(30);
      setSavedListingIds((prev) => new Set(prev).add(currentListing.id));
      onStatusChange?.(currentListing.id, 'interested');
      setCurrentIndex((prev) => prev + 1);
    } else if (dx < -threshold && currentListing) {
      // Swiped Left -> Dismiss
      triggerHaptic(20);
      setDismissedListingIds((prev) => new Set(prev).add(currentListing.id));
      onStatusChange?.(currentListing.id, 'rejected');
      setCurrentIndex((prev) => prev + 1);
    }

    // Reset card drag offset
    setDragOffset({ x: 0, y: 0 });
    dragStartRef.current = null;
  };

  // Button-based fallback actions
  const handleShortlist = () => {
    if (!currentListing) return;
    triggerHaptic(30);
    setSavedListingIds((prev) => new Set(prev).add(currentListing.id));
    onStatusChange?.(currentListing.id, 'interested');
    setCurrentIndex((prev) => prev + 1);
  };

  const handleDismiss = () => {
    if (!currentListing) return;
    triggerHaptic(20);
    setDismissedListingIds((prev) => new Set(prev).add(currentListing.id));
    onStatusChange?.(currentListing.id, 'rejected');
    setCurrentIndex((prev) => prev + 1);
  };

  const handleOpenDetails = (listing: RentalListing) => {
    setSheetListing(listing);
    setSheetStage('half');
    triggerHaptic(15);
  };

  // Bottom Sheet Gesture Handlers
  const handleSheetDragStart = (e: React.PointerEvent) => {
    sheetDragStartRef.current = { y: e.clientY, startStage: sheetStage };
    (e.target as HTMLElement).setPointerCapture(e.pointerId);
  };

  const handleSheetDragMove = (e: React.PointerEvent) => {
    if (!sheetDragStartRef.current) return;
    const dy = e.clientY - sheetDragStartRef.current.y;
    setSheetDragDeltaY(dy);
  };

  const handleSheetDragEnd = () => {
    if (!sheetDragStartRef.current) return;
    const dy = sheetDragDeltaY;
    const current = sheetDragStartRef.current.startStage;

    if (current === 'half') {
      if (dy < -60) {
        setSheetStage('full');
      } else if (dy > 80) {
        setSheetStage('closed');
        setSheetListing(null);
      }
    } else if (current === 'full') {
      if (dy > 100) {
        setSheetStage('half');
      } else if (dy > 250) {
        setSheetStage('closed');
        setSheetListing(null);
      }
    }

    sheetDragStartRef.current = null;
    setSheetDragDeltaY(0);
  };

  return (
    <div className="relative w-full h-full flex flex-col bg-slate-950 text-slate-100 overflow-hidden font-sans select-none">
      {/* Top Mobile Status Header */}
      <div className="shrink-0 px-4 pt-3 pb-2 flex items-center justify-between border-b border-slate-900/80 bg-slate-950/90 backdrop-blur-md z-20">
        <div className="flex items-center gap-2">
          <div className="w-7 h-7 rounded-lg bg-emerald-500/20 border border-emerald-500/40 flex items-center justify-center">
            <Compass className="w-4 h-4 text-emerald-400" />
          </div>
          <div>
            <div className="flex items-center gap-1.5">
              <span className="text-xs font-black tracking-tight text-white">Linear Deck</span>
              <span className="text-[9px] uppercase font-bold tracking-wider px-1.5 py-0.2 rounded-full bg-emerald-500/20 text-emerald-400 border border-emerald-500/40">
                0ms Thumb Dock
              </span>
            </div>
            <p className="text-[10px] text-slate-400">PTP Scooter Orbit • Fluid Stack</p>
          </div>
        </div>

        <div className="flex items-center gap-2">
          <div className="text-right">
            <div className="text-[10px] font-mono text-slate-400">Stack</div>
            <div className="text-xs font-mono font-bold text-emerald-400">
              {filteredListings.length > 0 ? `${currentIndex + 1} / ${filteredListings.length}` : '0/0'}
            </div>
          </div>
          <button
            type="button"
            onClick={() => {
              setCurrentIndex(0);
              triggerHaptic(20);
            }}
            title="Reset Deck"
            className="p-1.5 rounded-lg bg-slate-900 border border-slate-800 text-slate-400 hover:text-white"
          >
            <RotateCcw className="w-3.5 h-3.5" />
          </button>
        </div>
      </div>

      {/* Pull To Refresh Spring Physics Banner */}
      {pullY > 0 && (
        <div
          className="absolute top-12 left-0 right-0 flex items-center justify-center pointer-events-none z-30 transition-transform duration-75"
          style={{ transform: `translateY(${pullY * 0.7}px)` }}
        >
          <div className="flex items-center gap-2 px-3 py-1 rounded-full bg-emerald-500/20 border border-emerald-500/40 text-emerald-300 text-xs shadow-lg backdrop-blur-md">
            <RotateCcw
              className={`w-3.5 h-3.5 ${isRefreshing ? 'animate-spin' : ''}`}
              style={{ transform: `rotate(${pullY * 4}deg)` }}
            />
            <span className="text-[11px] font-semibold">
              {pullY > 45 ? 'Release to reload cards' : 'Pull to refresh'}
            </span>
          </div>
        </div>
      )}

      {/* Body Area Driven by Peer Tabs */}
      <div className="flex-1 relative overflow-hidden flex flex-col">
        {/* TAB 1: EXPLORE (CARD SWIPER DECK) */}
        {activeTab === 'explore' && (
          <div className="flex-1 relative flex flex-col items-center justify-center p-3 pb-36">
            {currentListing ? (
              <div className="relative w-full max-w-sm h-[460px] flex items-center justify-center">
                {/* Third Card Peek */}
                {thirdListing && (
                  <div
                    className="absolute inset-0 rounded-3xl bg-slate-900/60 border border-slate-800/60 pointer-events-none"
                    style={{
                      transform: 'translateY(24px) scale(0.9)',
                      opacity: 0.45,
                      zIndex: 1,
                    }}
                  />
                )}

                {/* Second Card Peek */}
                {nextListing && (
                  <div
                    className="absolute inset-0 rounded-3xl bg-slate-900/80 border border-slate-800 pointer-events-none transition-transform duration-200"
                    style={{
                      transform: 'translateY(12px) scale(0.95)',
                      opacity: 0.8,
                      zIndex: 2,
                    }}
                  >
                    <div className="p-4 flex flex-col justify-between h-full">
                      <div className="flex justify-between items-center text-xs text-slate-400">
                        <span>{nextListing.location}</span>
                        <span className="font-bold font-mono text-emerald-400">
                          ₹{nextListing.entities.rent?.toLocaleString('en-IN')}
                        </span>
                      </div>
                    </div>
                  </div>
                )}

                {/* Top Active Interactive Card */}
                <div
                  onPointerDown={handlePointerDown}
                  onPointerMove={handlePointerMove}
                  onPointerUp={handlePointerUp}
                  onPointerCancel={handlePointerUp}
                  className={`absolute inset-0 rounded-3xl bg-slate-900 border border-slate-700/80 shadow-2xl overflow-hidden cursor-grab active:cursor-grabbing flex flex-col justify-between ${
                    isDragging ? '' : 'transition-transform duration-250 ease-out'
                  }`}
                  style={{
                    transform: `translate3d(${dragOffset.x}px, ${dragOffset.y + pullY}px, 0) rotate(${
                      dragOffset.x * 0.05
                    }deg)`,
                    zIndex: 10,
                    touchAction: 'none',
                  }}
                >
                  {/* Visual Swipe Feedback Overlays */}
                  {dragOffset.x > 25 && (
                    <div
                      className="absolute top-4 left-4 z-30 px-3 py-1.5 rounded-xl border-2 border-emerald-400 bg-emerald-950/80 text-emerald-300 font-black tracking-wider text-sm shadow-xl flex items-center gap-1.5"
                      style={{ opacity: Math.min(dragOffset.x / 100, 1) }}
                    >
                      <Heart className="w-4 h-4 fill-emerald-400" />
                      <span>SHORTLIST</span>
                    </div>
                  )}

                  {dragOffset.x < -25 && (
                    <div
                      className="absolute top-4 right-4 z-30 px-3 py-1.5 rounded-xl border-2 border-rose-400 bg-rose-950/80 text-rose-300 font-black tracking-wider text-sm shadow-xl flex items-center gap-1.5"
                      style={{ opacity: Math.min(-dragOffset.x / 100, 1) }}
                    >
                      <X className="w-4 h-4" />
                      <span>PASS</span>
                    </div>
                  )}

                  {/* Card Image Banner */}
                  <div className="relative h-48 w-full bg-slate-950 overflow-hidden">
                    {currentListing.imageUrls && currentListing.imageUrls.length > 0 ? (
                      <img
                        src={currentListing.imageUrls[0]}
                        alt={currentListing.title || currentListing.location}
                        className="w-full h-full object-cover pointer-events-none"
                      />
                    ) : (
                      <div className="w-full h-full flex items-center justify-center bg-slate-800 text-slate-500">
                        <Building2 className="w-12 h-12" />
                      </div>
                    )}

                    <div className="absolute inset-0 bg-gradient-to-t from-slate-900 via-transparent to-black/40" />

                    {/* Top Badges */}
                    <div className="absolute top-3 left-3 right-3 flex items-center justify-between text-xs">
                      <span className="px-2.5 py-1 rounded-full bg-slate-950/80 backdrop-blur-md text-emerald-400 border border-emerald-500/30 font-bold font-mono">
                        {currentListing.tier}
                      </span>
                      <span className="px-2.5 py-1 rounded-full bg-slate-950/80 backdrop-blur-md text-white font-mono text-[11px] font-semibold border border-slate-700">
                        {currentListing.score} pts
                      </span>
                    </div>

                    {/* Commute Badge */}
                    <div className="absolute bottom-2 left-3 flex items-center gap-1.5 px-2.5 py-1 rounded-xl bg-slate-950/90 backdrop-blur-md border border-slate-700/80 text-xs">
                      <Bike className="w-3.5 h-3.5 text-cyan-400" />
                      <span className="font-bold text-white">
                        {currentListing.commute.twoWayAvgPeakMins}m scooter
                      </span>
                      <span className="text-[10px] text-slate-400">
                        • {currentListing.commute.distanceKm} km to PTP
                      </span>
                    </div>
                  </div>

                  {/* Card Content Body */}
                  <div className="p-4 flex-1 flex flex-col justify-between space-y-2">
                    <div>
                      <div className="flex items-start justify-between gap-2">
                        <div>
                          <h3 className="text-base font-bold text-white line-clamp-1">
                            {currentListing.entities.societyName || currentListing.location}
                          </h3>
                          <div className="flex items-center gap-1 text-xs text-slate-400 mt-0.5">
                            <MapPin className="w-3 h-3 text-emerald-400" />
                            <span>{currentListing.location}</span>
                            {currentListing.landmark && (
                              <span className="text-[10px] text-slate-500 truncate max-w-[150px]">
                                • {currentListing.landmark}
                              </span>
                            )}
                          </div>
                        </div>

                        <div className="text-right shrink-0">
                          <div className="text-lg font-black text-white font-mono leading-none">
                            ₹{currentListing.entities.rent?.toLocaleString('en-IN')}
                          </div>
                          <span className="text-[10px] text-slate-400">
                            Dep: ₹{currentListing.entities.deposit ? (currentListing.entities.deposit / 1000).toFixed(0) + 'k' : '—'}
                          </span>
                        </div>
                      </div>

                      {/* Micro Pill Highlights */}
                      <div className="flex items-center gap-1.5 flex-wrap mt-2.5">
                        <span className="text-[10px] font-semibold px-2 py-0.5 rounded-md bg-slate-800 text-slate-300 border border-slate-700">
                          {currentListing.bhkType}
                        </span>
                        {currentListing.entities.isBrokerage ? (
                          <span className="text-[10px] font-semibold px-2 py-0.5 rounded-md bg-amber-950/60 text-amber-300 border border-amber-500/30">
                            Brokerage Fee
                          </span>
                        ) : (
                          <span className="text-[10px] font-semibold px-2 py-0.5 rounded-md bg-emerald-950/60 text-emerald-300 border border-emerald-500/30">
                            0% Brokerage
                          </span>
                        )}
                        {currentListing.entities.hasSwimmingPool && (
                          <span className="text-[10px] font-semibold px-2 py-0.5 rounded-md bg-cyan-950/60 text-cyan-300 border border-cyan-500/30">
                            Pool
                          </span>
                        )}
                        {currentListing.commute.hasPanathurUnderpassBottleneck && (
                          <span className="text-[10px] font-semibold px-2 py-0.5 rounded-md bg-rose-950/60 text-rose-300 border border-rose-500/30 flex items-center gap-0.5">
                            <AlertTriangle className="w-2.5 h-2.5" /> Underpass Choke
                          </span>
                        )}
                      </div>

                      <p className="text-xs text-slate-300 line-clamp-2 mt-2 leading-relaxed">
                        {currentListing.summary || currentListing.rawText}
                      </p>
                    </div>

                    {/* Card Tap Details Trigger */}
                    <button
                      type="button"
                      onClick={() => handleOpenDetails(currentListing)}
                      className="w-full py-1.5 rounded-xl bg-slate-800/80 hover:bg-slate-700 text-slate-300 hover:text-white text-xs font-semibold flex items-center justify-center gap-1.5 transition-colors border border-slate-700/60"
                    >
                      <Info className="w-3.5 h-3.5 text-cyan-400" />
                      <span>Tap to inspect sanity checklist & details</span>
                      <ChevronUp className="w-3.5 h-3.5" />
                    </button>
                  </div>
                </div>
              </div>
            ) : (
              /* Empty Stack State */
              <div className="p-8 text-center space-y-4 max-w-xs">
                <div className="w-14 h-14 mx-auto rounded-3xl bg-slate-900 border border-slate-800 flex items-center justify-center text-emerald-400 shadow-xl">
                  <CheckCircle2 className="w-7 h-7" />
                </div>
                <h3 className="text-base font-bold text-white">All Listings Reviewed!</h3>
                <p className="text-xs text-slate-400">
                  You’ve evaluated every listing in this corridor deck. Reset the deck or switch corridors.
                </p>
                <button
                  type="button"
                  onClick={() => {
                    setCurrentIndex(0);
                    triggerHaptic(25);
                  }}
                  className="px-5 py-2.5 rounded-2xl bg-emerald-500 hover:bg-emerald-400 text-slate-950 font-black text-xs shadow-lg shadow-emerald-500/20 active:scale-95 transition-transform"
                >
                  Reload Deck
                </button>
              </div>
            )}

            {/* Floating Bottom Action Pill within Thumb Reach */}
            {currentListing && (
              <div className="fixed bottom-24 left-1/2 -translate-x-1/2 z-30 flex items-center gap-2 p-1.5 rounded-full bg-slate-900/90 backdrop-blur-xl border border-slate-700/80 shadow-2xl">
                {/* Dismiss Button */}
                <button
                  type="button"
                  onClick={handleDismiss}
                  className="w-11 h-11 rounded-full bg-slate-800 hover:bg-rose-900/40 text-slate-300 hover:text-rose-400 border border-slate-700 flex items-center justify-center active:scale-90 transition-transform"
                  title="Dismiss (Swipe Left)"
                >
                  <X className="w-5 h-5" />
                </button>

                {/* WhatsApp Action */}
                <a
                  href={`https://wa.me/91${currentListing.entities.contactPhone || '9845019823'}?text=${encodeURIComponent(
                    `Hi, I saw your rental post for ${currentListing.location} on Facebook. Is it still available?`
                  )}`}
                  target="_blank"
                  rel="noreferrer"
                  onClick={() => triggerHaptic(15)}
                  className="flex items-center gap-1.5 px-3.5 py-2.5 rounded-full bg-emerald-600 hover:bg-emerald-500 text-white font-bold text-xs shadow-lg shadow-emerald-600/30 active:scale-95 transition-transform"
                >
                  <MessageCircle className="w-4 h-4 fill-white" />
                  <span>WhatsApp</span>
                </a>

                {/* Call Landlord */}
                <a
                  href={`tel:${currentListing.entities.contactPhone || '9845019823'}`}
                  onClick={() => triggerHaptic(15)}
                  className="w-11 h-11 rounded-full bg-slate-800 hover:bg-cyan-900/40 text-slate-300 hover:text-cyan-400 border border-slate-700 flex items-center justify-center active:scale-90 transition-transform"
                  title="Call Landlord"
                >
                  <Phone className="w-4 h-4" />
                </a>

                {/* Shortlist Button */}
                <button
                  type="button"
                  onClick={handleShortlist}
                  className="w-11 h-11 rounded-full bg-emerald-500/20 hover:bg-emerald-500 text-emerald-400 hover:text-slate-950 border border-emerald-500/40 flex items-center justify-center active:scale-90 transition-transform"
                  title="Shortlist (Swipe Right)"
                >
                  <Heart className="w-5 h-5 fill-emerald-400" />
                </button>
              </div>
            )}
          </div>
        )}

        {/* TAB 2: CORRIDORS */}
        {activeTab === 'corridors' && (
          <div className="flex-1 overflow-y-auto p-4 space-y-3 pb-32">
            <div className="text-xs text-slate-400 font-medium">
              Select Bangalore Tech Corridor for 0ms Deck Re-Focus:
            </div>
            <div className="space-y-2">
              {CORRIDORS.map((c) => {
                const isSelected = selectedCorridor === c.id;
                return (
                  <button
                    key={c.id}
                    type="button"
                    onClick={() => {
                      setSelectedCorridor(c.id);
                      setCurrentIndex(0);
                      triggerHaptic(20);
                      setActiveTab('explore');
                    }}
                    className={`w-full p-3.5 rounded-2xl border text-left flex items-center justify-between transition-colors ${
                      isSelected
                        ? 'bg-emerald-500/20 border-emerald-500/60 text-white'
                        : 'bg-slate-900/90 border-slate-800 text-slate-300 hover:border-slate-700'
                    }`}
                  >
                    <div>
                      <div className="text-sm font-bold text-white">{c.name}</div>
                      <div className="text-xs text-emerald-400 mt-0.5">{c.time}</div>
                    </div>
                    {isSelected && <CheckCircle2 className="w-5 h-5 text-emerald-400" />}
                  </button>
                );
              })}
            </div>
          </div>
        )}

        {/* TAB 3: SAVED LISTINGS */}
        {activeTab === 'saved' && (
          <div className="flex-1 overflow-y-auto p-4 space-y-3 pb-32">
            <div className="flex items-center justify-between">
              <span className="text-xs text-slate-400 font-medium">
                Shortlisted via Swipe Right ({savedListingIds.size})
              </span>
              {savedListingIds.size > 0 && (
                <button
                  type="button"
                  onClick={() => setSavedListingIds(new Set())}
                  className="text-[11px] text-rose-400 hover:underline"
                >
                  Clear All
                </button>
              )}
            </div>

            {savedListingIds.size === 0 ? (
              <div className="p-8 text-center text-slate-500 text-xs space-y-2">
                <Bookmark className="w-8 h-8 mx-auto text-slate-600" />
                <p>No listings saved yet. Swipe right on any card in the Explore tab!</p>
              </div>
            ) : (
              <div className="space-y-2.5">
                {activePool
                  .filter((l) => savedListingIds.has(l.id))
                  .map((item) => (
                    <div
                      key={item.id}
                      className="p-3 rounded-2xl bg-slate-900 border border-slate-800 flex items-center justify-between gap-3 shadow-lg"
                    >
                      <div
                        onClick={() => handleOpenDetails(item)}
                        className="cursor-pointer flex-1"
                      >
                        <div className="text-xs font-bold text-white line-clamp-1">
                          {item.entities.societyName || item.location}
                        </div>
                        <div className="text-[11px] text-emerald-400 font-mono mt-0.5">
                          ₹{item.entities.rent?.toLocaleString('en-IN')} • {item.commute.twoWayAvgPeakMins}m to PTP
                        </div>
                      </div>

                      <div className="flex items-center gap-1.5 shrink-0">
                        <a
                          href={`https://wa.me/91${item.entities.contactPhone || '9845019823'}`}
                          target="_blank"
                          rel="noreferrer"
                          className="p-2 rounded-xl bg-emerald-500/20 text-emerald-300 border border-emerald-500/40"
                          title="WhatsApp"
                        >
                          <MessageCircle className="w-3.5 h-3.5" />
                        </a>
                        <button
                          type="button"
                          onClick={() => {
                            setSavedListingIds((prev) => {
                              const next = new Set(prev);
                              next.delete(item.id);
                              return next;
                            });
                          }}
                          className="p-2 rounded-xl bg-slate-800 text-slate-400 hover:text-rose-400"
                        >
                          <X className="w-3.5 h-3.5" />
                        </button>
                      </div>
                    </div>
                  ))}
              </div>
            )}
          </div>
        )}

        {/* TAB 4: FILTERS */}
        {activeTab === 'filters' && (
          <div className="flex-1 overflow-y-auto p-4 space-y-4 pb-32">
            <div>
              <label className="text-xs font-bold text-slate-300 block mb-2">
                Max Monthly Rent: <span className="text-emerald-400 font-mono">₹{maxRentFilter.toLocaleString('en-IN')}</span>
              </label>
              <input
                type="range"
                min={15000}
                max={60000}
                step={2000}
                value={maxRentFilter}
                onChange={(e) => setMaxRentFilter(Number(e.target.value))}
                className="w-full accent-emerald-500"
              />
              <div className="flex justify-between text-[10px] text-slate-500 font-mono">
                <span>₹15,000</span>
                <span>₹35,000</span>
                <span>₹60,000</span>
              </div>
            </div>

            <div className="space-y-2 pt-2">
              <button
                type="button"
                onClick={() => setZeroBrokerageFilter(!zeroBrokerageFilter)}
                className={`w-full p-3 rounded-2xl border text-xs font-bold flex items-center justify-between ${
                  zeroBrokerageFilter
                    ? 'bg-emerald-500/20 border-emerald-500/50 text-emerald-300'
                    : 'bg-slate-900 border-slate-800 text-slate-400'
                }`}
              >
                <div className="flex items-center gap-2">
                  <ShieldCheck className="w-4 h-4 text-emerald-400" />
                  <span>Zero Brokerage (Direct Owner / Flatmate)</span>
                </div>
                <span>{zeroBrokerageFilter ? 'ON' : 'OFF'}</span>
              </button>

              <button
                type="button"
                onClick={() => setBachelorOnlyFilter(!bachelorOnlyFilter)}
                className={`w-full p-3 rounded-2xl border text-xs font-bold flex items-center justify-between ${
                  bachelorOnlyFilter
                    ? 'bg-cyan-500/20 border-cyan-500/50 text-cyan-300'
                    : 'bg-slate-900 border-slate-800 text-slate-400'
                }`}
              >
                <div className="flex items-center gap-2">
                  <Building2 className="w-4 h-4 text-cyan-400" />
                  <span>Male Bachelor Friendly Only</span>
                </div>
                <span>{bachelorOnlyFilter ? 'ON' : 'OFF'}</span>
              </button>
            </div>

            <button
              type="button"
              onClick={() => {
                setActiveTab('explore');
                setCurrentIndex(0);
                triggerHaptic(20);
              }}
              className="w-full py-2.5 rounded-2xl bg-emerald-500 text-slate-950 font-bold text-xs"
            >
              Apply & Return to Deck
            </button>
          </div>
        )}
      </div>

      {/* Two-Stage Snapping Bottom Sheet for Listing Details */}
      {sheetStage !== 'closed' && sheetListing && (
        <div className="fixed inset-0 z-50 flex flex-col justify-end">
          {/* Backdrop */}
          <div
            onClick={() => {
              setSheetStage('closed');
              setSheetListing(null);
            }}
            className="absolute inset-0 bg-black/60 backdrop-blur-sm transition-opacity"
          />

          {/* Snapped Sheet Container */}
          <div
            className={`relative w-full rounded-t-3xl bg-slate-900 border-t border-slate-700 shadow-2xl flex flex-col transition-[height,transform] duration-200 ease-out ${
              sheetStage === 'half' ? 'h-[52vh]' : 'h-[88vh]'
            }`}
            style={{
              transform: `translateY(${Math.max(0, sheetDragDeltaY)}px)`,
            }}
          >
            {/* Gesture Drag Pill Handle */}
            <div
              onPointerDown={handleSheetDragStart}
              onPointerMove={handleSheetDragMove}
              onPointerUp={handleSheetDragEnd}
              onPointerCancel={handleSheetDragEnd}
              className="w-full pt-3 pb-2 flex flex-col items-center justify-center cursor-grab active:cursor-grabbing shrink-0"
              style={{ touchAction: 'none' }}
            >
              <div className="w-12 h-1.5 rounded-full bg-slate-600/80" />
            </div>

            {/* Sheet Scrollable Content */}
            <div className="flex-1 overflow-y-auto px-5 pb-8 space-y-4">
              <div className="flex items-start justify-between gap-3">
                <div>
                  <h2 className="text-base font-bold text-white">
                    {sheetListing.entities.societyName || sheetListing.title || sheetListing.location}
                  </h2>
                  <p className="text-xs text-slate-400 mt-0.5">{sheetListing.location} • {sheetListing.landmark}</p>
                </div>
                <div className="text-right shrink-0">
                  <div className="text-lg font-black text-white font-mono">
                    ₹{sheetListing.entities.rent?.toLocaleString('en-IN')}
                  </div>
                  <div className="text-[10px] text-emerald-400 font-mono">
                    Deposit: ₹{sheetListing.entities.deposit?.toLocaleString('en-IN')} (
                    {sheetListing.entities.deposit && sheetListing.entities.rent
                      ? (sheetListing.entities.deposit / sheetListing.entities.rent).toFixed(1) + 'x'
                      : '—'}
                    )
                  </div>
                </div>
              </div>

              {/* Sanity Quick Grid */}
              <div className="grid grid-cols-2 gap-2 text-xs">
                <div className="p-2.5 rounded-xl bg-slate-950 border border-slate-800">
                  <span className="text-[10px] text-slate-400 block">Water Source</span>
                  <span className="font-semibold text-emerald-300 flex items-center gap-1 mt-0.5">
                    <Droplets className="w-3.5 h-3.5" /> Cauvery Connection
                  </span>
                </div>
                <div className="p-2.5 rounded-xl bg-slate-950 border border-slate-800">
                  <span className="text-[10px] text-slate-400 block">Peak Scooter to PTP</span>
                  <span className="font-semibold text-cyan-300 flex items-center gap-1 mt-0.5">
                    <Bike className="w-3.5 h-3.5" /> {sheetListing.commute.twoWayAvgPeakMins}m commute
                  </span>
                </div>
              </div>

              {/* Commute Window Breakdown */}
              <div className="p-3 rounded-2xl bg-slate-950 border border-slate-800 space-y-1.5">
                <div className="text-xs font-bold text-slate-300">Peak Commute Dynamics to PTP:</div>
                <div className="flex justify-between text-xs text-slate-400 font-mono">
                  <span>🌅 Morning 11:00 AM (1.30x):</span>
                  <span className="text-white font-bold">{sheetListing.commute.inboundMins} mins</span>
                </div>
                <div className="flex justify-between text-xs text-slate-400 font-mono">
                  <span>🌆 Evening 5:00 PM (1.65x):</span>
                  <span className="text-white font-bold">{sheetListing.commute.outboundMins} mins</span>
                </div>
                {sheetListing.commute.hasPanathurUnderpassBottleneck && (
                  <div className="text-[11px] text-rose-400 font-medium pt-1 flex items-center gap-1">
                    <AlertTriangle className="w-3 h-3" /> Railway underpass subject to severe monsoon waterlogging
                  </div>
                )}
              </div>

              {/* Raw Facebook Post Authenticity View */}
              <div className="space-y-1.5">
                <div className="text-xs font-bold text-slate-400">Authentic Facebook Post Source:</div>
                <div className="p-3.5 rounded-2xl bg-slate-950/80 border border-slate-800 text-xs text-slate-300 whitespace-pre-wrap font-sans leading-relaxed">
                  {sheetListing.rawText}
                </div>
              </div>

              {/* Action Buttons in Sheet */}
              <div className="flex items-center gap-2 pt-2">
                <a
                  href={`https://wa.me/91${sheetListing.entities.contactPhone || '9845019823'}?text=${encodeURIComponent(
                    `Hi, I saw your post for ${sheetListing.location}. Is it still available?`
                  )}`}
                  target="_blank"
                  rel="noreferrer"
                  className="flex-1 py-3 rounded-xl bg-emerald-500 hover:bg-emerald-400 text-slate-950 font-black text-xs flex items-center justify-center gap-1.5 shadow-lg shadow-emerald-500/20"
                >
                  <MessageCircle className="w-4 h-4" />
                  <span>Chat on WhatsApp</span>
                </a>
                <a
                  href={sheetListing.postUrl}
                  target="_blank"
                  rel="noreferrer"
                  className="p-3 rounded-xl bg-slate-800 text-slate-300 hover:text-white border border-slate-700"
                  title="Open Original Post"
                >
                  <ExternalLink className="w-4 h-4" />
                </a>
              </div>
            </div>
          </div>
        </div>
      )}

      {/* Pinned Bottom Navigation Dock (Apple Thumb Zone, 0ms Peer Switching) */}
      <nav
        aria-label="Bottom Navigation Dock"
        className="fixed bottom-0 left-0 right-0 z-40 bg-slate-950/95 border-t border-slate-800/80 backdrop-blur-xl px-4 py-2 flex items-center justify-around"
      >
        <button
          type="button"
          onClick={() => {
            setActiveTab('explore');
            triggerHaptic(10);
          }}
          className={`flex flex-col items-center gap-0.5 px-3 py-1 rounded-xl transition-colors ${
            activeTab === 'explore' ? 'text-emerald-400 font-bold' : 'text-slate-400 hover:text-slate-200'
          }`}
        >
          <Layers className="w-5 h-5" />
          <span className="text-[10px]">Explore</span>
        </button>

        <button
          type="button"
          onClick={() => {
            setActiveTab('corridors');
            triggerHaptic(10);
          }}
          className={`flex flex-col items-center gap-0.5 px-3 py-1 rounded-xl transition-colors ${
            activeTab === 'corridors' ? 'text-emerald-400 font-bold' : 'text-slate-400 hover:text-slate-200'
          }`}
        >
          <Compass className="w-5 h-5" />
          <span className="text-[10px]">Corridors</span>
        </button>

        <button
          type="button"
          onClick={() => {
            setActiveTab('saved');
            triggerHaptic(10);
          }}
          className={`flex flex-col items-center gap-0.5 px-3 py-1 rounded-xl transition-colors ${
            activeTab === 'saved' ? 'text-emerald-400 font-bold' : 'text-slate-400 hover:text-slate-200'
          }`}
        >
          <div className="relative">
            <Bookmark className="w-5 h-5" />
            {savedListingIds.size > 0 && (
              <span className="absolute -top-1 -right-2 w-3.5 h-3.5 rounded-full bg-emerald-500 text-[9px] font-bold text-slate-950 flex items-center justify-center">
                {savedListingIds.size}
              </span>
            )}
          </div>
          <span className="text-[10px]">Saved</span>
        </button>

        <button
          type="button"
          onClick={() => {
            setActiveTab('filters');
            triggerHaptic(10);
          }}
          className={`flex flex-col items-center gap-0.5 px-3 py-1 rounded-xl transition-colors ${
            activeTab === 'filters' ? 'text-emerald-400 font-bold' : 'text-slate-400 hover:text-slate-200'
          }`}
        >
          <SlidersHorizontal className="w-5 h-5" />
          <span className="text-[10px]">Filters</span>
        </button>
      </nav>
    </div>
  );
};
