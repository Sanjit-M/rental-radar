import React, { useState, useEffect } from 'react';
import { RentalListing, UserListingStatus } from '../../domain/types';
import { ProtoPicker, PrototypeVariantId, PROTOTYPE_VARIANTS } from './ProtoPicker';
import { MobilePlatformPrototype } from './MobilePlatformPrototype';
import { VariantLinearDeck } from './VariantLinearDeck';
import { VariantSpatialRadar } from './VariantSpatialRadar';
import { VariantAuthenticityLedger } from './VariantAuthenticityLedger';
import { PROTOTYPE_LISTINGS } from './mockData';
import { api } from '../services/api';
import {
  Smartphone,
  Maximize2,
  ArrowLeft,
  Info,
  Sparkles,
  Wifi,
  Battery,
} from 'lucide-react';

export interface MobilePrototypeHarnessProps {
  readonly listings?: readonly RentalListing[] | undefined;
  readonly onStatusChange?: ((id: number, status: UserListingStatus) => void) | undefined;
  readonly onExitPrototype?: (() => void) | undefined;
}

const FALLBACK_META = PROTOTYPE_VARIANTS[0]!;

export const MobilePrototypeHarness: React.FC<MobilePrototypeHarnessProps> = ({
  listings = PROTOTYPE_LISTINGS,
  onStatusChange,
  onExitPrototype,
}) => {
  const [activeVariant, setActiveVariant] = useState<PrototypeVariantId>('unified-platform');
  const [replayKey, setReplayKey] = useState(0);
  const [isFramedView, setIsFramedView] = useState(true);
  const [showInfoBanner, setShowInfoBanner] = useState(true);
  const [realListings, setRealListings] = useState<RentalListing[]>([]);

  // Wire to real listings, seamlessly falling back to mockData
  useEffect(() => {
    if (!listings || listings.length === 0) {
      api.getListings({ limit: 100 }).then((res) => {
        if (res._tag === 'ok' && res.value.listings.length > 0) {
          setRealListings(res.value.listings);
        }
      });
    }
  }, [listings]);

  const activePool =
    listings && listings.length > 0
      ? listings
      : realListings.length > 0
      ? realListings
      : PROTOTYPE_LISTINGS;

  const currentMeta = PROTOTYPE_VARIANTS.find((v) => v.id === activeVariant) ?? FALLBACK_META;

  const handleReplay = () => {
    setReplayKey((k) => k + 1);
  };

  return (
    <div className="min-h-screen bg-slate-950 text-slate-100 flex flex-col font-sans selection:bg-emerald-500 selection:text-slate-950">
      {/* Top Prototype Harness Control Bar */}
      <header className="shrink-0 bg-slate-900/90 border-b border-slate-800/80 backdrop-blur-md px-4 py-2.5 flex items-center justify-between z-40">
        <div className="flex items-center gap-3">
          {onExitPrototype && (
            <button
              type="button"
              onClick={onExitPrototype}
              className="flex items-center gap-1.5 px-3 py-1.5 rounded-xl bg-slate-800 hover:bg-slate-700 text-slate-300 hover:text-white text-xs font-semibold border border-slate-700/80 transition-colors"
            >
              <ArrowLeft className="w-3.5 h-3.5" />
              <span>Standard Dashboard</span>
            </button>
          )}

          <div className="hidden sm:flex items-center gap-2">
            <span className="text-xs font-black text-white tracking-tight">
              Mobile Prototype Suite
            </span>
            <span className="text-[10px] font-mono font-bold uppercase bg-emerald-500/20 text-emerald-400 border border-emerald-500/40 px-2 py-0.5 rounded-full">
              Emil Kowalski Harness
            </span>
          </div>
        </div>

        {/* Viewport Frame Toggle & Info Toggle */}
        <div className="flex items-center gap-2">
          <button
            type="button"
            onClick={() => setShowInfoBanner((prev) => !prev)}
            className={`p-1.5 rounded-xl border text-xs font-semibold transition-colors ${
              showInfoBanner
                ? 'bg-emerald-500/20 text-emerald-300 border-emerald-500/50'
                : 'bg-slate-800 text-slate-400 border-slate-700'
            }`}
            title="Toggle Variant Info Banner"
          >
            <Info className="w-3.5 h-3.5" />
          </button>

          <button
            type="button"
            onClick={() => setIsFramedView((prev) => !prev)}
            className="flex items-center gap-1.5 px-2.5 py-1.5 rounded-xl bg-slate-800 hover:bg-slate-700 text-slate-300 hover:text-white text-xs font-semibold border border-slate-700 transition-colors"
            title="Toggle Simulated iPhone Device Frame"
          >
            {isFramedView ? (
              <>
                <Maximize2 className="w-3.5 h-3.5" />
                <span className="hidden sm:inline">Full Surface</span>
              </>
            ) : (
              <>
                <Smartphone className="w-3.5 h-3.5" />
                <span className="hidden sm:inline">iPhone 16 Pro</span>
              </>
            )}
          </button>
        </div>
      </header>

      {/* Axis & Reference Info Banner */}
      {showInfoBanner && (
        <aside className="bg-slate-900/40 border-b border-slate-800/60 px-4 py-2 flex flex-col sm:flex-row sm:items-center justify-between text-xs text-slate-400 gap-1 z-30">
          <div className="flex items-center gap-2">
            <Sparkles className="w-3.5 h-3.5 text-emerald-400 shrink-0" />
            <span className="font-bold text-white">{currentMeta.label}:</span>
            <span className="text-slate-300">{currentMeta.axis}</span>
          </div>
          <div className="text-[11px] font-mono text-slate-500">
            Keys: <kbd className="px-1 py-0.5 bg-slate-900 rounded border border-slate-800">1</kbd>{' '}
            <kbd className="px-1 py-0.5 bg-slate-900 rounded border border-slate-800">2</kbd>{' '}
            <kbd className="px-1 py-0.5 bg-slate-900 rounded border border-slate-800">3</kbd>{' '}
            <kbd className="px-1 py-0.5 bg-slate-900 rounded border border-slate-800">4</kbd> switch •{' '}
            <kbd className="px-1 py-0.5 bg-slate-900 rounded border border-slate-800">R</kbd> replay
          </div>
        </aside>
      )}

      {/* Main Prototype Viewport Container */}
      <main className="flex-1 flex items-center justify-center p-0 sm:p-4 overflow-hidden relative">
        {isFramedView ? (
          /* Simulated iPhone 16 Pro Device Frame */
          <div className="relative w-full max-w-[400px] h-[780px] max-h-[92vh] rounded-[50px] bg-black p-3.5 shadow-2xl border-[4px] border-slate-800 ring-1 ring-white/10 flex flex-col overflow-hidden">
            {/* Dynamic Island Notch */}
            <div className="absolute top-4 left-1/2 -translate-x-1/2 w-28 h-6 bg-black rounded-full z-50 flex items-center justify-between px-3 shadow-md">
              <span className="w-2.5 h-2.5 rounded-full bg-slate-900 border border-slate-800" />
              <span className="w-2 h-2 rounded-full bg-cyan-950/80" />
            </div>

            {/* Mobile Screen Area */}
            <div className="relative flex-1 w-full h-full rounded-[40px] bg-[#09090b] overflow-hidden flex flex-col pt-3">
              {/* Simulated iOS Status Bar */}
              <div className="shrink-0 px-6 pt-1 pb-1 flex items-center justify-between text-[11px] font-semibold text-slate-300 z-40 select-none">
                <span>9:41</span>
                <div className="flex items-center gap-1.5">
                  <span className="text-[10px] font-bold tracking-tighter text-slate-400">5G</span>
                  <Wifi className="w-3 h-3 text-slate-300" />
                  <Battery className="w-3.5 h-3.5 text-slate-300" />
                </div>
              </div>

              {/* Active Variant Component */}
              <div className="flex-1 relative overflow-hidden">
                {activeVariant === 'unified-platform' && (
                  <MobilePlatformPrototype
                    listings={activePool}
                    onStatusChange={onStatusChange}
                    replayKey={replayKey}
                  />
                )}
                {activeVariant === 'linear-deck' && (
                  <VariantLinearDeck
                    listings={activePool}
                    onStatusChange={onStatusChange}
                    replayKey={replayKey}
                  />
                )}
                {activeVariant === 'spatial-radar' && (
                  <VariantSpatialRadar
                    listings={activePool}
                    onStatusChange={onStatusChange}
                    replayKey={replayKey}
                  />
                )}
                {activeVariant === 'authenticity-ledger' && (
                  <VariantAuthenticityLedger
                    listings={activePool}
                    onStatusChange={onStatusChange}
                    replayKey={replayKey}
                  />
                )}
              </div>

              {/* Home Indicator Bar */}
              <div className="absolute bottom-1 left-1/2 -translate-x-1/2 w-32 h-1 bg-white/30 rounded-full z-40 pointer-events-none" />
            </div>
          </div>
        ) : (
          /* Full Surface (Unframed Edge-to-Edge) Mobile View */
          <div className="relative w-full h-full flex-1 max-w-2xl bg-[#09090b] overflow-hidden flex flex-col border-x border-slate-800 shadow-2xl">
            {activeVariant === 'unified-platform' && (
              <MobilePlatformPrototype
                listings={activePool}
                onStatusChange={onStatusChange}
                replayKey={replayKey}
              />
            )}
            {activeVariant === 'linear-deck' && (
              <VariantLinearDeck
                listings={activePool}
                onStatusChange={onStatusChange}
                replayKey={replayKey}
              />
            )}
            {activeVariant === 'spatial-radar' && (
              <VariantSpatialRadar
                listings={activePool}
                onStatusChange={onStatusChange}
                replayKey={replayKey}
              />
            )}
            {activeVariant === 'authenticity-ledger' && (
              <VariantAuthenticityLedger
                listings={activePool}
                onStatusChange={onStatusChange}
                replayKey={replayKey}
              />
            )}
          </div>
        )}

        {/* Emil Kowalski's ProtoPicker Chrome */}
        <ProtoPicker
          activeVariant={activeVariant}
          onSelectVariant={setActiveVariant}
          onReplay={handleReplay}
        />
      </main>
    </div>
  );
};
