import React, { useEffect, useRef, useState, useLayoutEffect } from 'react';
import './protoPicker.css';

export type PrototypeVariantId =
  | 'unified-platform'
  | 'linear-deck'
  | 'spatial-radar'
  | 'authenticity-ledger';

export interface VariantMeta {
  readonly id: PrototypeVariantId;
  readonly label: string;
  readonly subtitle: string;
  readonly axis: string;
}

export const PROTOTYPE_VARIANTS: readonly VariantMeta[] = [
  {
    id: 'unified-platform',
    label: 'Unified Platform',
    subtitle: 'Complete 5-Tab Mobile Suite',
    axis: 'The complete 5-tab mobile platform: Explore, Corridors, Ledger, Pipeline, Ops (Default)',
  },
  {
    id: 'linear-deck',
    label: 'Linear Deck',
    subtitle: 'Touch Fluidity & Thumb Zone',
    axis: 'Touch fluidity & bottom-docked thumb zone (Emil Kowalski & Apple Design)',
  },
  {
    id: 'spatial-radar',
    label: 'Spatial Radar',
    subtitle: 'Direct Manipulation & Commute Physics',
    axis: 'Direct manipulation & real-time travel physics (Bartosz Ciechanowski, Amelia Wattenberger)',
  },
  {
    id: 'authenticity-ledger',
    label: 'Authenticity Ledger',
    subtitle: 'Provenance & Decision Workspace',
    axis: 'Radical source provenance & decision workspace (Maggie Appleton, Jim Nielsen, Rauno Freiberg)',
  },
];

interface ProtoPickerProps {
  readonly activeVariant: PrototypeVariantId;
  readonly onSelectVariant: (variant: PrototypeVariantId) => void;
  readonly onReplay: () => void;
}

export const ProtoPicker: React.FC<ProtoPickerProps> = ({
  activeVariant,
  onSelectVariant,
  onReplay,
}) => {
  const navRef = useRef<HTMLElement>(null);
  const highlightRef = useRef<HTMLSpanElement>(null);
  const itemRefs = useRef<Map<PrototypeVariantId, HTMLButtonElement>>(new Map());
  const [isReady, setIsReady] = useState(false);

  // Position the sliding highlight indicator
  useLayoutEffect(() => {
    const activeEl = itemRefs.current.get(activeVariant);
    const highlightEl = highlightRef.current;
    if (!activeEl || !highlightEl) return;

    const left = activeEl.offsetLeft;
    const width = activeEl.offsetWidth;

    highlightEl.style.transform = `translateX(${left}px)`;
    highlightEl.style.width = `${width}px`;

    if (!isReady) {
      // Allow DOM to apply initial position before enabling transition
      const frame = requestAnimationFrame(() => {
        setIsReady(true);
      });
      return () => cancelAnimationFrame(frame);
    }
  }, [activeVariant, isReady]);

  // Keyboard navigation shortcuts: 1, 2, 3, 4 for variants, R for replay
  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      // Don't trigger if user is typing in an input/textarea
      const targetTag = (e.target as HTMLElement | null)?.tagName;
      if (targetTag === 'INPUT' || targetTag === 'TEXTAREA') return;

      if (e.key === '1') {
        e.preventDefault();
        onSelectVariant('unified-platform');
      } else if (e.key === '2') {
        e.preventDefault();
        onSelectVariant('linear-deck');
      } else if (e.key === '3') {
        e.preventDefault();
        onSelectVariant('spatial-radar');
      } else if (e.key === '4') {
        e.preventDefault();
        onSelectVariant('authenticity-ledger');
      } else if (e.key.toLowerCase() === 'r') {
        e.preventDefault();
        onReplay();
      }
    };

    window.addEventListener('keydown', handleKeyDown);
    return () => window.removeEventListener('keydown', handleKeyDown);
  }, [onSelectVariant, onReplay]);

  return (
    <nav
      ref={navRef}
      className="proto-picker"
      aria-label="Prototype variants"
      {...(isReady ? { 'data-ready': '' } : {})}
    >
      <span ref={highlightRef} className="proto-picker-highlight" aria-hidden="true" />

      {PROTOTYPE_VARIANTS.map((v) => {
        const isActive = activeVariant === v.id;
        return (
          <button
            key={v.id}
            ref={(el) => {
              if (el) itemRefs.current.set(v.id, el);
              else itemRefs.current.delete(v.id);
            }}
            type="button"
            className="proto-picker-item"
            {...(isActive ? { 'data-active': '', 'aria-current': 'true' as const } : {})}
            onClick={() => onSelectVariant(v.id)}
          >
            {v.label}
          </button>
        );
      })}

      <span className="proto-picker-divider" aria-hidden="true" />

      <button
        type="button"
        className="proto-picker-item proto-picker-replay"
        aria-label="Replay animation (R)"
        title="Replay animation (R)"
        onClick={onReplay}
      >
        ↻
      </button>
    </nav>
  );
};
