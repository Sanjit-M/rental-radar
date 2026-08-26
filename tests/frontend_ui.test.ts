import { describe, it, expect } from 'vitest';
import * as fs from 'node:fs';
import * as path from 'node:path';
import { buildRecencySqlCondition } from '../src/db/repository';
import { KNOWN_SOCIETIES, PTP_COORDINATES } from '../src/domain/config';

describe('Milestone 2 — Geospatial Map & Frontend UI Unit & Contract Tests', () => {
  describe('1. Sample Data Button Removal (R4 / Feature F12)', () => {
    it('verifies HeaderStats.tsx does not contain "Load Sample Data" button or onReseed prop', () => {
      const headerStatsPath = path.resolve(__dirname, '../src/client/components/HeaderStats.tsx');
      const content = fs.readFileSync(headerStatsPath, 'utf8');

      expect(content).not.toContain('Load Sample Data');
      expect(content).not.toContain('onReseed');
      expect(content).toContain('Check Groups Now');
      expect(content).toContain('HeaderStats');
    });
  });

  describe('2. Expandable Post Descriptions (R4 / Feature F11)', () => {
    it('verifies ListingCard.tsx implements click/tap expansion toggle with line-clamp-2 and full text', () => {
      const listingCardPath = path.resolve(__dirname, '../src/client/components/ListingCard.tsx');
      const content = fs.readFileSync(listingCardPath, 'utf8');

      expect(content).toContain('isExpanded');
      expect(content).toContain('line-clamp-2');
      expect(content).toContain('Show less');
      expect(content).toContain('Read full description');
      expect(content).toContain('aria-expanded');
    });
  });

  describe('3. Multi-Group Provenance Badges (R2 / Feature F6)', () => {
    it('verifies ListingCard.tsx renders "Seen in X groups" badge when postCount > 1', () => {
      const listingCardPath = path.resolve(__dirname, '../src/client/components/ListingCard.tsx');
      const content = fs.readFileSync(listingCardPath, 'utf8');

      expect(content).toContain('listing.postCount && listing.postCount > 1');
      expect(content).toContain('Seen in {listing.postCount} groups');
    });

    it('verifies ListingTable.tsx renders "Seen in X groups" badge when postCount > 1', () => {
      const listingTablePath = path.resolve(__dirname, '../src/client/components/ListingTable.tsx');
      const content = fs.readFileSync(listingTablePath, 'utf8');

      expect(content).toContain('l.postCount && l.postCount > 1');
      expect(content).toContain('Seen in {l.postCount} groups');
    });
  });

  describe('4. Geospatial Map & Leaflet Tile Layer (R1 / Features F1–F4)', () => {
    it('verifies MapView.tsx loads a free tile layer without external API keys', () => {
      const mapViewPath = path.resolve(__dirname, '../src/client/components/MapView.tsx');
      const content = fs.readFileSync(mapViewPath, 'utf8');

      // CartoDB basemaps.cartocdn.com now requires a paid API key.
      // Switched to free tile.openstreetmap.org with CSS dark mode filter.
      expect(content).toContain('tile.openstreetmap.org');
      expect(content).not.toMatch(/api_key|access_token|key=|token=/i);
      expect(content).toContain('Prestige Tech Park');
      expect(content).toContain('invalidateSize');
    });

    it('verifies FilterBar.tsx and App.tsx support 3-way view toggle (grid, table, map)', () => {
      const filterBarPath = path.resolve(__dirname, '../src/client/components/FilterBar.tsx');
      const filterContent = fs.readFileSync(filterBarPath, 'utf8');

      expect(filterContent).toContain("'grid' | 'table' | 'map'");
      expect(filterContent).toContain('OpenStreetMap View');

      const appPath = path.resolve(__dirname, '../src/client/App.tsx');
      const appContent = fs.readFileSync(appPath, 'utf8');
      expect(appContent).toContain("viewMode === 'map'");
      expect(appContent).toContain('<MapView');
    });
  });

  describe('5. Recency Filter UI & Boundary Matching (R2 / Feature F7)', () => {
    it('verifies FilterBar.tsx includes all required recency time windows', () => {
      const filterBarPath = path.resolve(__dirname, '../src/client/components/FilterBar.tsx');
      const content = fs.readFileSync(filterBarPath, 'utf8');

      expect(content).toContain('<option value="all">All Time</option>');
      expect(content).toContain('<option value="1h">Past 1 Hour</option>');
      expect(content).toContain('<option value="3h">Past 3 Hours</option>');
      expect(content).toContain('<option value="6h">Past 6 Hours</option>');
      expect(content).toContain('<option value="12h">Past 12 Hours</option>');
      expect(content).toContain('<option value="24h">Past 24 Hours</option>');
      expect(content).toContain('<option value="7d">Past 7 Days</option>');
    });

    it('verifies buildRecencySqlCondition generates exclusion filters against multi-digit collisions', () => {
      const sql1h = buildRecencySqlCondition('1h');
      expect(sql1h).toContain("posted_time NOT LIKE '%11 hr%'");
      expect(sql1h).toContain("posted_time NOT LIKE '%21 hr%'");

      const sql6h = buildRecencySqlCondition('6h');
      expect(sql6h).toContain("posted_time NOT LIKE '%14 hr%'");
      expect(sql6h).toContain("posted_time NOT LIKE '%24 hr%'");

      const sql12h = buildRecencySqlCondition('12h');
      expect(sql12h).toContain("posted_time NOT LIKE '%24 hr%'");

      const sql24h = buildRecencySqlCondition('24h');
      expect(sql24h).toContain("posted_time NOT LIKE '%2 day%'");

      const sql7d = buildRecencySqlCondition('7d');
      expect(sql7d).toContain("posted_time NOT LIKE '%8 day%'");
      expect(sql7d).toContain("posted_time NOT LIKE '%2 week%'");
    });
  });

  describe('6. Server-Side Pagination UI Controls (R4 / Feature F9)', () => {
    it('verifies App.tsx renders Previous, Next, page numbers, and total count metadata', () => {
      const appPath = path.resolve(__dirname, '../src/client/App.tsx');
      const content = fs.readFileSync(appPath, 'utf8');

      expect(content).toContain('handlePageChange');
      expect(content).toContain('Previous');
      expect(content).toContain('Next');
      expect(content).toContain('Showing');
      expect(content).toContain('Page');
      expect(content).toContain('totalPages');
    });

    it('verifies api.ts returns typed PaginatedListingsResponse', () => {
      const apiPath = path.resolve(__dirname, '../src/client/services/api.ts');
      const content = fs.readFileSync(apiPath, 'utf8');

      expect(content).toContain('PaginatedListingsResponse');
      expect(content).toContain('getListings(');
    });
  });

  describe('7. Score Breakdown Modal Brokerage Label (R3)', () => {
    it('verifies ScoreBreakdownModal.tsx displays -40 pts for brokerage fee penalty', () => {
      const modalPath = path.resolve(__dirname, '../src/client/components/ScoreBreakdownModal.tsx');
      const content = fs.readFileSync(modalPath, 'utf8');

      expect(content).toContain('Broker Fee Applicable (-40)');
      expect(content).not.toContain('Broker Fee Applicable (-30)');
    });
  });

  describe('8. Database Client Dual-Runtime Support', () => {
    it('verifies database.ts imports createClient from @libsql/client for Node file: compatibility', () => {
      const dbPath = path.resolve(__dirname, '../src/db/database.ts');
      const content = fs.readFileSync(dbPath, 'utf8');

      expect(content).toContain("import { createClient, Client } from '@libsql/client'");
      expect(content).not.toContain("from '@libsql/client/web'");
    });
  });
});
