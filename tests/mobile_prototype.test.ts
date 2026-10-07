import { describe, it, expect } from 'vitest';
import * as fs from 'node:fs';
import * as path from 'node:path';
import { PROTOTYPE_VARIANTS } from '../src/client/prototype/ProtoPicker';
import { PROTOTYPE_LISTINGS } from '../src/client/prototype/mockData';

describe('Mobile-Native Prototype Suite Tests', () => {
  describe('1. Emil Kowalski ProtoPicker Contract', () => {
    it('verifies protoPicker.css contains exact styling from PICKER.md', () => {
      const cssPath = path.resolve(__dirname, '../src/client/prototype/protoPicker.css');
      const content = fs.readFileSync(cssPath, 'utf8');

      expect(content).toContain('.proto-picker');
      expect(content).toContain('.proto-picker-highlight');
      expect(content).toContain('.proto-picker-item');
      expect(content).toContain('position: fixed;');
      expect(content).toContain('top: 56px;');
      expect(content).toContain('z-index: 2147483647;');
      expect(content).toContain('rgba(10, 10, 10, 0.82)');
    });

    it('verifies ProtoPicker.tsx exports variants matching specs', () => {
      expect(PROTOTYPE_VARIANTS.length).toBe(4);
      expect(PROTOTYPE_VARIANTS[0]?.id).toBe('unified-platform');
      expect(PROTOTYPE_VARIANTS[1]?.id).toBe('linear-deck');
      expect(PROTOTYPE_VARIANTS[2]?.id).toBe('spatial-radar');
      expect(PROTOTYPE_VARIANTS[3]?.id).toBe('authenticity-ledger');
    });

    it('verifies ProtoPicker component markup reflects PICKER.md exact elements', () => {
      const pickerPath = path.resolve(__dirname, '../src/client/prototype/ProtoPicker.tsx');
      const content = fs.readFileSync(pickerPath, 'utf8');

      expect(content).toContain('proto-picker');
      expect(content).toContain('proto-picker-highlight');
      expect(content).toContain('proto-picker-item');
      expect(content).toContain('proto-picker-divider');
      expect(content).toContain('proto-picker-replay');
      expect(content).toContain('data-active');
      expect(content).toContain('data-ready');
    });
  });

  describe('2. Variant 1: The Linear Deck', () => {
    it('verifies VariantLinearDeck.tsx implements required features', () => {
      const variantPath = path.resolve(__dirname, '../src/client/prototype/VariantLinearDeck.tsx');
      const content = fs.readFileSync(variantPath, 'utf8');

      // Bottom-docked thumb zone tabs
      expect(content).toContain('explore');
      expect(content).toContain('corridors');
      expect(content).toContain('saved');
      expect(content).toContain('filters');

      // Swipeable card gestures & drag thresholds
      expect(content).toContain('onPointerDown');
      expect(content).toContain('onPointerMove');
      expect(content).toContain('onPointerUp');
      expect(content).toContain('SHORTLIST');
      expect(content).toContain('PASS');

      // Floating bottom action pill (WhatsApp, Call, FB Post)
      expect(content).toContain('https://wa.me/91');
      expect(content).toContain('tel:');

      // Snapping bottom sheet (two-stage: half and full)
      expect(content).toContain('half');
      expect(content).toContain('full');
      expect(content).toContain('closed');

      // Pull-to-refresh
      expect(content).toContain('pullY');
      expect(content).toContain('isRefreshing');
    });
  });

  describe('3. Variant 2: The Spatial Radar', () => {
    it('verifies VariantSpatialRadar.tsx implements required features', () => {
      const variantPath = path.resolve(__dirname, '../src/client/prototype/VariantSpatialRadar.tsx');
      const content = fs.readFileSync(variantPath, 'utf8');

      // Sticky top interactive scooter commute scrubber (10m to 40m)
      expect(content).toContain('targetCommuteMins');
      expect(content).toContain('to PTP');

      // Corridor reachability ring & excess delta (+Xm)
      expect(content).toContain('Corridor Reachability Ring');
      expect(content).toContain('radarCenter');
      expect(content).toContain('excessDelta');

      // Live rent frequency histogram
      expect(content).toContain('histogramBuckets');
      expect(content).toContain('Live Rent Frequency Histogram');

      // 4px grid-snapped cards & micro-typography
      expect(content).toContain('4px Spatial Cadence');
    });
  });

  describe('4. Variant 3: The Authenticity Ledger', () => {
    it('verifies VariantAuthenticityLedger.tsx implements required features', () => {
      const variantPath = path.resolve(__dirname, '../src/client/prototype/VariantAuthenticityLedger.tsx');
      const content = fs.readFileSync(variantPath, 'utf8');

      // Verified Facebook source preview & provenance
      expect(content).toContain('groupName');
      expect(content).toContain('authorName');
      expect(content).toContain('postedTime');
      expect(content).toContain('postUrl');

      // Landlord sanity checklist
      expect(content).toContain('Landlord Sanity Checklist');
      expect(content).toContain('Cauvery');
      expect(content).toContain('Security Deposit Multiple');
      expect(content).toContain('BESCOM Power Backup');

      // Bottom sheet Command Palette (cmdk pattern)
      expect(content).toContain('isCmdkOpen');
      expect(content).toContain('cmdkQuery');
      expect(content).toContain('Command');

      // Native semantic HTML elements
      expect(content).toContain('<article');
      expect(content).toContain('<header');
      expect(content).toContain('<section');
      expect(content).toContain('<dl');
      expect(content).toContain('<dt');
      expect(content).toContain('<dd');
      expect(content).toContain('<fieldset');
    });
  });

  describe('5. Harness & App Integration', () => {
    it('verifies App.tsx renders toggle button and respects ?proto=true query param', () => {
      const appPath = path.resolve(__dirname, '../src/client/App.tsx');
      const content = fs.readFileSync(appPath, 'utf8');

      expect(content).toContain('MobilePrototypeHarness');
      expect(content).toContain('isPrototypeMode');
      expect(content).toContain('params.get(\'proto\')');
      expect(content).toContain('Mobile Prototype');
    });

    it('verifies mock prototype dataset contains realistic PTP listings', () => {
      expect(PROTOTYPE_LISTINGS.length).toBeGreaterThanOrEqual(4);
      const kadubeesanahalli = PROTOTYPE_LISTINGS.find((l) => l.location === 'Kadubeesanahalli');
      expect(kadubeesanahalli).toBeDefined();
      expect(kadubeesanahalli?.commute.twoWayAvgPeakMins).toBeLessThanOrEqual(15);
    });
  });
});
