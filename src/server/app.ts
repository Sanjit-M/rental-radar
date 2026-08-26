import { Hono } from 'hono';
import { cors } from 'hono/cors';
import { logger } from 'hono/logger';
import { listingsRouter } from './routes/listings';
import { statsRouter } from './routes/stats';
import { scrapeRouter } from './routes/scrape';
import { PTP_COORDINATES, SCORING_CONFIG, TARGET_LOCATIONS } from '../domain/config';
import { listingRepository } from '../db/repository';
import { seedInitialData } from '../scraper/groupScraper';

export const app = new Hono();

app.use('*', logger());
app.use('*', cors());

// Health Check
app.get('/api/health', (c) => c.json({ status: 'ok', service: 'rental-radar-ts' }));

// System Config
app.get('/api/config', (c) =>
  c.json({
    ptpAnchor: PTP_COORDINATES,
    scoringWeights: SCORING_CONFIG,
    targetLocations: TARGET_LOCATIONS,
  })
);

// Routers
app.route('/api/listings', listingsRouter);
app.route('/api/stats', statsRouter);
app.route('/api/scrape', scrapeRouter);

// Auto-seed if database is empty on launch
const existing = listingRepository.getListings();
if (existing.length === 0) {
  console.log('📦 Database is empty. Auto-seeding initial realistic listings...');
  seedInitialData().then((count) => {
    console.log(`✅ Auto-seeded ${count} listings.`);
  });
}
