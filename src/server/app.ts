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

// Passcode Gate Middleware (Protects mutation/scrape endpoints if DASHBOARD_PASSCODE is configured)
app.use('*', async (c, next) => {
  const passcode = process.env.DASHBOARD_PASSCODE;
  if (!passcode) {
    return next();
  }

  // Health and config are always public
  const path = c.req.path;
  if (path.endsWith('/health') || path.endsWith('/config')) {
    return next();
  }

  // Check header or query parameter
  const clientPasscode = c.req.header('x-dashboard-passcode') || c.req.query('passcode');
  if (clientPasscode !== passcode) {
    // If it's a GET request without passcode, allow read-only
    if (c.req.method === 'GET' && !process.env.STRICT_READ_LOCK) {
      return next();
    }
    return c.json({ error: 'Unauthorized: Invalid or missing dashboard passcode' }, 401);
  }

  return next();
});

// Health Checks (Both /api/health and /health)
app.get('/health', (c) => c.json({ status: 'ok', service: 'rental-radar-ts' }));
app.get('/api/health', (c) => c.json({ status: 'ok', service: 'rental-radar-ts' }));

// System Config & Public Flags
const configHandler = (c: any) =>
  c.json({
    ptpAnchor: PTP_COORDINATES,
    scoringWeights: SCORING_CONFIG,
    targetLocations: TARGET_LOCATIONS,
    requiresPasscode: Boolean(process.env.DASHBOARD_PASSCODE),
  });

app.get('/config', configHandler);
app.get('/api/config', configHandler);

// Routers (Mount both /api/* and direct /* to prevent Vercel rewrite prefix mismatches)
app.route('/listings', listingsRouter);
app.route('/api/listings', listingsRouter);

app.route('/stats', statsRouter);
app.route('/api/stats', statsRouter);

app.route('/scrape', scrapeRouter);
app.route('/api/scrape', scrapeRouter);

// Auto-seed if database is empty on launch
listingRepository.getListings().then((existing) => {
  if (existing.length === 0) {
    console.log('📦 Database is empty. Auto-seeding initial realistic listings...');
    seedInitialData().then((count) => {
      console.log(`✅ Auto-seeded ${count} listings.`);
    });
  }
}).catch((err) => {
  console.error('Error during database check:', err);
});
