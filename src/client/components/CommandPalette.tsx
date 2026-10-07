import React, { useState, useEffect, useRef, useMemo } from 'react';
import { RentalListing, SortBy } from '../../domain/types';
import {
  Search,
  Compass,
  Home,
  ShieldCheck,
  Users,
  ArrowUpDown,
  Building2,
  Check,
  Clock,
  Sparkles,
  IndianRupee,
} from 'lucide-react';

export interface CommandPaletteProps {
  readonly isOpen: boolean;
  readonly onClose: () => void;
  readonly corridors: readonly { id: string; label: string; subtext?: string }[];
  readonly selectedCorridor: string;
  readonly onSelectCorridor: (id: string) => void;
  readonly bhkType: string;
  readonly onSelectBhkType: (bhk: string) => void;
  readonly sortBy: SortBy;
  readonly onSelectSortBy: (sort: SortBy) => void;
  readonly zeroBrokerageOnly: boolean;
  readonly onToggleZeroBrokerage: () => void;
  readonly bachelorFriendlyOnly: boolean;
  readonly onToggleBachelorFriendly: () => void;
  readonly listings: RentalListing[];
  readonly onSelectListing: (listing: RentalListing) => void;
}

interface CommandItem {
  readonly id: string;
  readonly section: 'corridors' | 'bhk' | 'toggles' | 'sort' | 'listings';
  readonly label: string;
  readonly subtext?: string | undefined;
  readonly icon: React.ReactNode;
  readonly isSelected?: boolean | undefined;
  readonly badge?: string | undefined;
  readonly onSelect: () => void;
}

export const CommandPalette: React.FC<CommandPaletteProps> = ({
  isOpen,
  onClose,
  corridors,
  selectedCorridor,
  onSelectCorridor,
  bhkType,
  onSelectBhkType,
  sortBy,
  onSelectSortBy,
  zeroBrokerageOnly,
  onToggleZeroBrokerage,
  bachelorFriendlyOnly,
  onToggleBachelorFriendly,
  listings,
  onSelectListing,
}) => {
  const [query, setQuery] = useState('');
  const [activeIndex, setActiveIndex] = useState(0);
  const inputRef = useRef<HTMLInputElement>(null);
  const listRef = useRef<HTMLDivElement>(null);
  const activeItemRef = useRef<HTMLDivElement>(null);

  // Focus input when opened
  useEffect(() => {
    if (isOpen) {
      setQuery('');
      setActiveIndex(0);
      const timer = setTimeout(() => {
        inputRef.current?.focus();
      }, 50);
      return () => clearTimeout(timer);
    }
  }, [isOpen]);

  // Handle Escape key
  useEffect(() => {
    if (!isOpen) return;

    const handleKeyDown = (e: KeyboardEvent) => {
      if (e.key === 'Escape') {
        e.preventDefault();
        onClose();
      }
    };

    window.addEventListener('keydown', handleKeyDown);
    return () => window.removeEventListener('keydown', handleKeyDown);
  }, [isOpen, onClose]);

  // Construct items based on search query
  const items = useMemo<CommandItem[]>(() => {
    const q = query.trim().toLowerCase();
    const result: CommandItem[] = [];

    // 1. Corridors
    const matchingCorridors = corridors.filter(
      (c) =>
        !q ||
        c.label.toLowerCase().includes(q) ||
        (c.subtext && c.subtext.toLowerCase().includes(q)) ||
        c.id.toLowerCase().includes(q)
    );

    matchingCorridors.forEach((c) => {
      result.push({
        id: `corridor-${c.id}`,
        section: 'corridors',
        label: c.label,
        subtext: c.subtext,
        icon: <Compass className="w-4 h-4 text-emerald-400" />,
        isSelected: selectedCorridor === c.id,
        onSelect: () => {
          onSelectCorridor(c.id);
          onClose();
        },
      });
    });

    // 2. BHK Configurations
    const bhkOptions: { id: string; label: string }[] = [
      { id: 'all', label: 'All Configurations' },
      { id: '1 BHK', label: '1 BHK' },
      { id: '2 BHK (Shared/Full)', label: '2 BHK (Shared / Full Flat)' },
      { id: '3 BHK (Shared/Full)', label: '3 BHK (Shared / Full Flat)' },
      { id: 'Private Room / Flatmate', label: 'Private Room / Flatmate' },
    ];

    const matchingBhk = bhkOptions.filter(
      (b) => !q || b.label.toLowerCase().includes(q) || b.id.toLowerCase().includes(q)
    );

    matchingBhk.forEach((b) => {
      result.push({
        id: `bhk-${b.id}`,
        section: 'bhk',
        label: b.label,
        subtext: 'BHK Filter',
        icon: <Home className="w-4 h-4 text-indigo-400" />,
        isSelected: bhkType === b.id,
        onSelect: () => {
          onSelectBhkType(b.id);
          onClose();
        },
      });
    });

    // 3. Quick Toggles
    const toggleOptions: {
      id: string;
      label: string;
      subtext: string;
      active: boolean;
      onToggle: () => void;
      icon: React.ReactNode;
    }[] = [
      {
        id: 'toggle-zero-brokerage',
        label: 'Zero Brokerage Only',
        subtext: 'Direct owner listings only',
        active: zeroBrokerageOnly,
        onToggle: onToggleZeroBrokerage,
        icon: <ShieldCheck className="w-4 h-4 text-emerald-400" />,
      },
      {
        id: 'toggle-bachelor-friendly',
        label: 'Bachelor Friendly Only',
        subtext: 'Filter out strictly family/female-only postings',
        active: bachelorFriendlyOnly,
        onToggle: onToggleBachelorFriendly,
        icon: <Users className="w-4 h-4 text-cyan-400" />,
      },
    ];

    toggleOptions
      .filter((t) => !q || t.label.toLowerCase().includes(q) || t.subtext.toLowerCase().includes(q))
      .forEach((t) => {
        result.push({
          id: t.id,
          section: 'toggles',
          label: t.label,
          subtext: t.subtext,
          icon: t.icon,
          isSelected: t.active,
          badge: t.active ? 'Active' : 'Off',
          onSelect: () => {
            t.onToggle();
            onClose();
          },
        });
      });

    // 4. Sort Modes
    const sortOptions: { id: SortBy; label: string; subtext: string }[] = [
      { id: 'score_desc', label: 'Highest Match Score', subtext: 'Ranked by PTP commuter score' },
      { id: 'rent_asc', label: 'Lowest Monthly Rent', subtext: 'Budget friendly first' },
      { id: 'commute_asc', label: 'Fastest Scooter Commute', subtext: 'Least travel minutes to PTP' },
      { id: 'newest', label: 'Newest Facebook Posts', subtext: 'Most recent scrape timestamps' },
    ];

    sortOptions
      .filter((s) => !q || s.label.toLowerCase().includes(q) || s.subtext.toLowerCase().includes(q))
      .forEach((s) => {
        result.push({
          id: `sort-${s.id}`,
          section: 'sort',
          label: s.label,
          subtext: s.subtext,
          icon: <ArrowUpDown className="w-4 h-4 text-amber-400" />,
          isSelected: sortBy === s.id,
          onSelect: () => {
            onSelectSortBy(s.id);
            onClose();
          },
        });
      });

    // 5. Matching Listings
    if (q) {
      const matchingListings = listings
        .filter((l) => {
          const searchHaystack = [
            l.location,
            l.entities.societyName ?? '',
            l.landmark ?? '',
            l.title ?? '',
            l.authorName,
            l.rawText,
          ]
            .join(' ')
            .toLowerCase();
          return searchHaystack.includes(q);
        })
        .slice(0, 8);

      matchingListings.forEach((l) => {
        const title = l.entities.societyName || l.location;
        const rentText = l.entities.rent ? `₹${l.entities.rent.toLocaleString('en-IN')}/mo` : 'Contact for Rent';
        result.push({
          id: `listing-${l.id}`,
          section: 'listings',
          label: title,
          subtext: `${l.bhkType} • ${rentText} • ${l.commute.twoWayAvgPeakMins}m PTP • Score: ${l.score}`,
          icon: <Building2 className="w-4 h-4 text-teal-400" />,
          badge: `${l.score} pts`,
          onSelect: () => {
            onSelectListing(l);
            onClose();
          },
        });
      });
    }

    return result;
  }, [
    query,
    corridors,
    selectedCorridor,
    onSelectCorridor,
    onClose,
    bhkType,
    onSelectBhkType,
    zeroBrokerageOnly,
    onToggleZeroBrokerage,
    bachelorFriendlyOnly,
    onToggleBachelorFriendly,
    sortBy,
    onSelectSortBy,
    listings,
    onSelectListing,
  ]);

  // Keep active index in bounds
  useEffect(() => {
    setActiveIndex(0);
  }, [query]);

  // Scroll active item into view
  useEffect(() => {
    if (activeItemRef.current) {
      activeItemRef.current.scrollIntoView({
        block: 'nearest',
      });
    }
  }, [activeIndex]);

  const handleKeyDown = (e: React.KeyboardEvent<HTMLInputElement>) => {
    if (items.length === 0) return;

    if (e.key === 'ArrowDown') {
      e.preventDefault();
      setActiveIndex((prev) => (prev + 1) % items.length);
    } else if (e.key === 'ArrowUp') {
      e.preventDefault();
      setActiveIndex((prev) => (prev - 1 + items.length) % items.length);
    } else if (e.key === 'Enter') {
      e.preventDefault();
      const current = items[activeIndex];
      if (current) {
        current.onSelect();
      }
    }
  };

  if (!isOpen) return null;

  const sectionTitles: Record<CommandItem['section'], string> = {
    corridors: 'Bangalore Tech Corridors',
    bhk: 'Configurations',
    toggles: 'Quick Toggles',
    sort: 'Sort Modes',
    listings: 'Matching Listings',
  };

  return (
    <div
      role="dialog"
      aria-modal="true"
      aria-label="Command Palette"
      className="fixed inset-0 z-50 bg-slate-950/80 backdrop-blur-md flex items-start justify-center pt-[10vh] px-4"
      onClick={onClose}
    >
      <div
        className="w-full max-w-2xl bg-slate-900/95 border border-slate-700/80 rounded-2xl shadow-2xl shadow-emerald-950/30 overflow-hidden flex flex-col max-h-[75vh] ring-1 ring-white/10"
        onClick={(e) => e.stopPropagation()}
      >
        {/* Search Input Bar */}
        <div className="flex items-center px-4 py-3.5 border-b border-slate-800 gap-3 bg-slate-950/50">
          <Search className="w-5 h-5 text-slate-400 shrink-0" />
          <input
            ref={inputRef}
            type="text"
            role="combobox"
            aria-autocomplete="list"
            aria-expanded="true"
            aria-controls="cmd-palette-listbox"
            aria-activedescendant={items[activeIndex] ? items[activeIndex].id : undefined}
            value={query}
            onChange={(e) => setQuery(e.target.value)}
            onKeyDown={handleKeyDown}
            placeholder="Type a command, corridor, BHK, or search listings..."
            className="w-full bg-transparent text-sm text-slate-100 placeholder-slate-400 focus:outline-none"
          />
          <div className="flex items-center gap-1.5 shrink-0">
            <kbd className="px-1.5 py-0.5 text-[10px] font-mono bg-slate-800 text-slate-400 border border-slate-700 rounded shadow">
              ESC
            </kbd>
          </div>
        </div>

        {/* Results List */}
        <div
          id="cmd-palette-listbox"
          role="listbox"
          ref={listRef}
          className="overflow-y-auto p-2 space-y-1 divide-y divide-slate-800/40"
        >
          {items.length === 0 ? (
            <div className="py-12 text-center text-xs text-slate-400 space-y-1">
              <p className="font-semibold text-slate-300">No matching commands or listings</p>
              <p>Try searching for a society, locality like "Kadubeesanahalli", or "2 BHK"</p>
            </div>
          ) : (
            (() => {
              let lastSection: CommandItem['section'] | null = null;
              return items.map((item, idx) => {
                const isFirstOfSection = item.section !== lastSection;
                lastSection = item.section;
                const isCurrentActive = idx === activeIndex;

                return (
                  <React.Fragment key={item.id}>
                    {isFirstOfSection && (
                      <div className="px-3 pt-3 pb-1 text-[10px] font-semibold uppercase tracking-wider text-slate-400">
                        {sectionTitles[item.section]}
                      </div>
                    )}

                    <div
                      id={item.id}
                      role="option"
                      aria-selected={isCurrentActive}
                      ref={isCurrentActive ? activeItemRef : null}
                      onMouseEnter={() => setActiveIndex(idx)}
                      onClick={item.onSelect}
                      className={`group flex items-center justify-between px-3 py-2.5 rounded-xl cursor-pointer text-xs transition-colors ${
                        isCurrentActive
                          ? 'bg-emerald-500/15 text-emerald-200 border border-emerald-500/30'
                          : 'text-slate-300 hover:bg-slate-800/60 border border-transparent'
                      }`}
                    >
                      <div className="flex items-center gap-3 min-w-0">
                        <div
                          className={`p-1.5 rounded-lg shrink-0 ${
                            isCurrentActive ? 'bg-emerald-500/20 text-emerald-300' : 'bg-slate-800/80 text-slate-400'
                          }`}
                        >
                          {item.icon}
                        </div>
                        <div className="min-w-0">
                          <div className="font-medium truncate flex items-center gap-1.5">
                            <span className={isCurrentActive ? 'text-white font-semibold' : 'text-slate-200'}>
                              {item.label}
                            </span>
                            {item.isSelected && (
                              <Check className="w-3.5 h-3.5 text-emerald-400 shrink-0 inline" />
                            )}
                          </div>
                          {item.subtext && (
                            <div className="text-[11px] text-slate-400 truncate mt-0.5">
                              {item.subtext}
                            </div>
                          )}
                        </div>
                      </div>

                      {item.badge && (
                        <span
                          className={`ml-2 px-2 py-0.5 text-[10px] font-mono rounded-full shrink-0 ${
                            item.isSelected
                              ? 'bg-emerald-950 text-emerald-300 border border-emerald-500/40'
                              : 'bg-slate-800 text-slate-400 border border-slate-700'
                          }`}
                        >
                          {item.badge}
                        </span>
                      )}
                    </div>
                  </React.Fragment>
                );
              });
            })()
          )}
        </div>

        {/* Footer Shortcut Bar */}
        <div className="px-4 py-2 border-t border-slate-800/80 bg-slate-950/60 flex items-center justify-between text-[11px] text-slate-400">
          <div className="flex items-center gap-3">
            <span className="flex items-center gap-1">
              <kbd className="px-1 py-0.5 text-[10px] font-mono bg-slate-800 text-slate-300 rounded border border-slate-700">
                ↑
              </kbd>
              <kbd className="px-1 py-0.5 text-[10px] font-mono bg-slate-800 text-slate-300 rounded border border-slate-700">
                ↓
              </kbd>
              <span>Navigate</span>
            </span>
            <span className="flex items-center gap-1">
              <kbd className="px-1.5 py-0.5 text-[10px] font-mono bg-slate-800 text-slate-300 rounded border border-slate-700">
                ↵
              </kbd>
              <span>Select</span>
            </span>
          </div>
          <span className="font-mono text-[10px] text-slate-400">
            {items.length} options
          </span>
        </div>
      </div>
    </div>
  );
};
