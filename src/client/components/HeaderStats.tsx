import React from 'react';
import { DashboardStats } from '../../domain/types';
import { Sparkles, Home, Clock, IndianRupee, RefreshCw, ShieldCheck, Waves } from 'lucide-react';

interface HeaderStatsProps {
  stats: DashboardStats | null;
  onTriggerScrape: () => void;
  isScraping: boolean;
}

export const HeaderStats: React.FC<HeaderStatsProps> = ({
  stats,
  onTriggerScrape,
  isScraping,
}) => {
  return (
    <header className="border-b border-slate-800/80 bg-slate-950/80 backdrop-blur-md sticky top-0 z-30">
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-4">
        <div className="flex flex-col md:flex-row md:items-center md:justify-between gap-4">
          {/* Logo & Title */}
          <div>
            <div className="flex items-center gap-2.5">
              <span className="text-2xl p-1.5 bg-emerald-500/10 border border-emerald-500/30 rounded-xl">
                📍
              </span>
              <div>
                <h1 className="text-xl font-bold tracking-tight text-white flex items-center gap-2">
                  PTP & Kadubeesanahalli Rental Radar
                  <span className="text-xs font-semibold px-2 py-0.5 rounded-full bg-emerald-500/20 text-emerald-400 border border-emerald-500/30">
                    Live
                  </span>
                </h1>
                <p className="text-xs text-slate-400">
                  Automated FB group rental scraper & Peak Scooter Commute ranker for Prestige Tech Park
                </p>
              </div>
            </div>
          </div>

          {/* Action Buttons */}
          <div className="flex items-center gap-2.5">
            <button
              onClick={onTriggerScrape}
              disabled={isScraping}
              className="inline-flex items-center gap-2 px-3.5 py-1.5 text-xs font-semibold text-white bg-emerald-600 hover:bg-emerald-500 disabled:opacity-50 disabled:cursor-not-allowed rounded-lg shadow-sm shadow-emerald-900/40 transition-all"
            >
              <RefreshCw className={`w-3.5 h-3.5 ${isScraping ? 'animate-spin' : ''}`} />
              {isScraping ? 'Scraping FB Groups...' : 'Check Groups Now'}
            </button>
          </div>
        </div>

        {/* Metrics Grid */}
        {stats && (
          <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-6 gap-3 mt-4">
            <div className="glass-panel p-3 rounded-xl">
              <div className="flex items-center justify-between text-slate-400 text-xs font-medium mb-1">
                <span>Total Matches</span>
                <Home className="w-3.5 h-3.5 text-slate-500" />
              </div>
              <div className="text-lg font-bold text-white">{stats.totalListings}</div>
            </div>

            <div className="glass-panel p-3 rounded-xl border-emerald-500/30 bg-emerald-950/20">
              <div className="flex items-center justify-between text-emerald-400 text-xs font-medium mb-1">
                <span>Unicorn Deals</span>
                <Sparkles className="w-3.5 h-3.5 text-emerald-400" />
              </div>
              <div className="text-lg font-bold text-emerald-300">{stats.unicornMatches}</div>
            </div>

            <div className="glass-panel p-3 rounded-xl">
              <div className="flex items-center justify-between text-slate-400 text-xs font-medium mb-1">
                <span>Avg Rent</span>
                <IndianRupee className="w-3.5 h-3.5 text-slate-500" />
              </div>
              <div className="text-lg font-bold text-white">
                ₹{stats.avgRent > 0 ? stats.avgRent.toLocaleString('en-IN') : '—'}
              </div>
            </div>

            <div className="glass-panel p-3 rounded-xl">
              <div className="flex items-center justify-between text-slate-400 text-xs font-medium mb-1">
                <span>Avg Peak Commute</span>
                <Clock className="w-3.5 h-3.5 text-cyan-400" />
              </div>
              <div className="text-lg font-bold text-cyan-300">
                {stats.avgPeakCommuteMins > 0 ? `${stats.avgPeakCommuteMins} mins` : '—'}
              </div>
            </div>

            <div className="glass-panel p-3 rounded-xl">
              <div className="flex items-center justify-between text-slate-400 text-xs font-medium mb-1">
                <span>Gated Communities</span>
                <ShieldCheck className="w-3.5 h-3.5 text-indigo-400" />
              </div>
              <div className="text-lg font-bold text-indigo-300">{stats.gatedCount}</div>
            </div>

            <div className="glass-panel p-3 rounded-xl">
              <div className="flex items-center justify-between text-slate-400 text-xs font-medium mb-1">
                <span>Swimming Pools</span>
                <Waves className="w-3.5 h-3.5 text-blue-400" />
              </div>
              <div className="text-lg font-bold text-blue-300">{stats.poolCount}</div>
            </div>
          </div>
        )}
      </div>
    </header>
  );
};
