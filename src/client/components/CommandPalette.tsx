import React, { useState, useEffect, useRef, useMemo } from 'react';
import type { RentalListing, SortBy } from '../../domain/types';
import {
  Search,
  Compass,
  Home,
  ShieldCheck,
  Users,
  ArrowUpDown,
  Building2,
  Check,
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

const SECTION_TITLES: Record<CommandItem['section'], string> = {
  corridors: 'Bangalore Tech Corridors',
  bhk: 'Configurations',
  toggles: 'Quick Toggles',
  sort: 'Sort Modes',
  listings: 'Matching Listings',
};

const BHK_OPTIONS: readonly { readonly id: string; readonly label: string }[] = [
  { id: 'all', label: 'All Configurations' },
  { id: '1 BHK', label: '1 BHK' },
  { id: '2 BHK (Shared/Full)', label: '2 BHK (Shared / Full Flat)' },
  { id: '3 BHK (Shared/Full)', label: '3 BHK (Shared / Full Flat)' },
  { id: 'Private Room / Flatmate', label: 'Private Room / Flatmate' },
];

const SORT_OPTIONS: readonly {
  readonly id: SortBy;
  readonly label: string;
  readonly subtext: string;
}[] = [
  { id: 'score_desc', label: 'Highest Match Score', subtext: 'Ranked by PTP commuter score' },
  { id: 'rent_asc', label: 'Lowest Monthly Rent', subtext: 'Budget friendly first' },
  { id: 'commute_asc', label: 'Fastest Scooter Commute', subtext: 'Least travel minutes to PTP' },
  { id: 'newest', label: 'Newest Facebook Posts', subtext: 'Most recent scrape timestamps' },
];

function buildCommandItems(
  query: string,
  props: Omit<CommandPaletteProps, 'isOpen'>,
): CommandItem[] {
  const q = query.trim().toLowerCase();
  const result: CommandItem[] = [];

  props.corridors
    .filter(
      (c) =>
        !q ||
        c.label.toLowerCase().includes(q) ||
        (c.subtext && c.subtext.toLowerCase().includes(q)) ||
        c.id.toLowerCase().includes(q),
    )
    .forEach((c) => {
      result.push({
        id: `corridor-${c.id}`,
        section: 'corridors',
        label: c.label,
        subtext: c.subtext,
        icon: <Compass className="w-4 h-4 text-emerald-400" />,
        isSelected: props.selectedCorridor === c.id,
        onSelect: () => {
          props.onSelectCorridor(c.id);
          props.onClose();
        },
      });
    });

  BHK_OPTIONS.filter(
    (b) => !q || b.label.toLowerCase().includes(q) || b.id.toLowerCase().includes(q),
  ).forEach((b) => {
    result.push({
      id: `bhk-${b.id}`,
      section: 'bhk',
      label: b.label,
      subtext: 'BHK Filter',
      icon: <Home className="w-4 h-4 text-indigo-400" />,
      isSelected: props.bhkType === b.id,
      onSelect: () => {
        props.onSelectBhkType(b.id);
        props.onClose();
      },
    });
  });

  const toggleOptions = [
    {
      id: 'toggle-zero-brokerage',
      label: 'Zero Brokerage Only',
      subtext: 'Direct owner listings only',
      active: props.zeroBrokerageOnly,
      onToggle: props.onToggleZeroBrokerage,
      icon: <ShieldCheck className="w-4 h-4 text-emerald-400" />,
    },
    {
      id: 'toggle-bachelor-friendly',
      label: 'Bachelor Friendly Only',
      subtext: 'Filter out strictly family/female-only postings',
      active: props.bachelorFriendlyOnly,
      onToggle: props.onToggleBachelorFriendly,
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
          props.onClose();
        },
      });
    });

  SORT_OPTIONS.filter(
    (s) => !q || s.label.toLowerCase().includes(q) || s.subtext.toLowerCase().includes(q),
  ).forEach((s) => {
    result.push({
      id: `sort-${s.id}`,
      section: 'sort',
      label: s.label,
      subtext: s.subtext,
      icon: <ArrowUpDown className="w-4 h-4 text-amber-400" />,
      isSelected: props.sortBy === s.id,
      onSelect: () => {
        props.onSelectSortBy(s.id);
        props.onClose();
      },
    });
  });

  if (q) {
    props.listings
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
      .slice(0, 8)
      .forEach((l) => {
        const title = l.entities.societyName || l.location;
        const rentText = l.entities.rent
          ? `₹${l.entities.rent.toLocaleString('en-IN')}/mo`
          : 'Contact for Rent';
        result.push({
          id: `listing-${l.id}`,
          section: 'listings',
          label: title,
          subtext: `${l.bhkType} • ${rentText} • ${l.commute.twoWayAvgPeakMins}m PTP • Score: ${l.score}`,
          icon: <Building2 className="w-4 h-4 text-teal-400" />,
          badge: `${l.score} pts`,
          onSelect: () => {
            props.onSelectListing(l);
            props.onClose();
          },
        });
      });
  }

  return result;
}

const CommandPaletteDialog: React.FC<Omit<CommandPaletteProps, 'isOpen'>> = (props) => {
  const { onClose } = props;
  const [query, setQuery] = useState('');
  const [activeIndex, setActiveIndex] = useState(0);
  const inputRef = useRef<HTMLInputElement>(null);
  const activeItemRef = useRef<HTMLButtonElement>(null);

  useEffect(() => {
    const timer = setTimeout(() => {
      inputRef.current?.focus();
    }, 30);
    return () => clearTimeout(timer);
  }, []);

  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      if (e.key === 'Escape') {
        e.preventDefault();
        onClose();
      }
    };

    window.addEventListener('keydown', handleKeyDown);
    return () => window.removeEventListener('keydown', handleKeyDown);
  }, [onClose]);

  const items = useMemo(() => buildCommandItems(query, props), [query, props]);

  useEffect(() => {
    activeItemRef.current?.scrollIntoView({ block: 'nearest' });
  }, [activeIndex]);

  const handleInputKeyDown = (e: React.KeyboardEvent<HTMLInputElement>) => {
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

  let lastSection: CommandItem['section'] | null = null;

  return (
    <dialog
      open
      aria-modal="true"
      aria-label="Command Palette"
      className="fixed inset-0 z-50 m-0 h-full w-full max-w-none max-h-none bg-slate-950/80 backdrop-blur-md flex items-start justify-center pt-[10vh] px-4 border-0"
    >
      <button
        type="button"
        aria-label="Close command palette backdrop"
        onClick={onClose}
        className="fixed inset-0 w-full h-full cursor-default"
      />

      <div className="relative z-10 w-full max-w-2xl bg-slate-900/95 border border-slate-700/80 rounded-2xl shadow-2xl shadow-emerald-950/30 overflow-hidden flex flex-col max-h-[75vh] ring-1 ring-white/10">
        <div className="flex items-center px-4 py-3.5 border-b border-slate-800 gap-3 bg-slate-950/50">
          <Search className="w-5 h-5 text-slate-400 shrink-0" />
          <input
            ref={inputRef}
            type="text"
            role="combobox"
            aria-label="Search commands or listings"
            aria-autocomplete="list"
            aria-expanded="true"
            aria-controls="cmd-palette-listbox"
            aria-activedescendant={items[activeIndex] ? items[activeIndex].id : undefined}
            value={query}
            onChange={(e) => {
              setQuery(e.target.value);
              setActiveIndex(0);
            }}
            onKeyDown={handleInputKeyDown}
            placeholder="Type a command, corridor, BHK, or search listings..."
            className="w-full bg-transparent text-sm text-slate-100 placeholder-slate-400 focus:outline-none"
          />
          <div className="flex items-center gap-1.5 shrink-0">
            <kbd className="px-1.5 py-0.5 text-[10px] font-mono bg-slate-800 text-slate-400 border border-slate-700 rounded shadow">
              ESC
            </kbd>
          </div>
        </div>

        <div
          id="cmd-palette-listbox"
          role="listbox"
          className="overflow-y-auto p-2 space-y-1 divide-y divide-slate-800/40"
        >
          {items.length === 0 ? (
            <div className="py-12 text-center text-xs text-slate-400 space-y-1">
              <p className="font-semibold text-slate-300">No matching commands or listings</p>
              <p>Try searching for a society, locality like "Kadubeesanahalli", or "2 BHK"</p>
            </div>
          ) : (
            items.map((item, idx) => {
              const isFirstOfSection = item.section !== lastSection;
              lastSection = item.section;
              const isCurrentActive = idx === activeIndex;

              return (
                <React.Fragment key={item.id}>
                  {isFirstOfSection && (
                    <div className="px-3 pt-3 pb-1 text-[10px] font-semibold uppercase tracking-wider text-slate-400">
                      {SECTION_TITLES[item.section]}
                    </div>
                  )}

                  <button
                    id={item.id}
                    type="button"
                    role="option"
                    aria-selected={isCurrentActive}
                    ref={isCurrentActive ? activeItemRef : null}
                    onMouseEnter={() => setActiveIndex(idx)}
                    onClick={item.onSelect}
                    className={`w-full text-left group flex items-center justify-between px-3 py-2.5 rounded-xl cursor-pointer text-xs transition-colors ${
                      isCurrentActive
                        ? 'bg-emerald-500/15 text-emerald-200 border border-emerald-500/30'
                        : 'text-slate-300 hover:bg-slate-800/60 border border-transparent'
                    }`}
                  >
                    <div className="flex items-center gap-3 min-w-0">
                      <div
                        className={`p-1.5 rounded-lg shrink-0 ${
                          isCurrentActive
                            ? 'bg-emerald-500/20 text-emerald-300'
                            : 'bg-slate-800/80 text-slate-400'
                        }`}
                      >
                        {item.icon}
                      </div>
                      <div className="min-w-0">
                        <div className="font-medium truncate flex items-center gap-1.5">
                          <span
                            className={
                              isCurrentActive ? 'text-white font-semibold' : 'text-slate-200'
                            }
                          >
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
                        className={`ml-2 px-2 py-0.5 text-[10px] font-mono tabular-nums rounded-full shrink-0 ${
                          item.isSelected
                            ? 'bg-emerald-950 text-emerald-300 border border-emerald-500/40'
                            : 'bg-slate-800 text-slate-400 border border-slate-700'
                        }`}
                      >
                        {item.badge}
                      </span>
                    )}
                  </button>
                </React.Fragment>
              );
            })
          )}
        </div>

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
          <span className="font-mono tabular-nums text-[10px] text-slate-400">
            {items.length} options
          </span>
        </div>
      </div>
    </dialog>
  );
};

/**
 * Keyboard-first Command Palette (Cmd+K / Ctrl+K) for filtering corridors, BHK, and searching listings.
 */
export const CommandPalette: React.FC<CommandPaletteProps> = ({ isOpen, ...rest }) => {
  if (!isOpen) return null;
  return <CommandPaletteDialog {...rest} />;
};
