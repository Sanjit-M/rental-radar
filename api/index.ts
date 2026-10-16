import { Hono } from 'hono';
import { cors } from 'hono/cors';
import { createClient } from '@libsql/client/web';
import {
  PTP_COORDINATES,
  SCORING_CONFIG,
  TARGET_LOCATIONS,
  DEFAULT_FB_GROUPS,
} from '../src/domain/config';
import { deduplicateListings } from '../src/domain/parser/deduplicator';
import { passesAllFilters, isValidLocation, isValidBHK } from '../src/domain/parser/filter';
import { extractAllEntities } from '../src/domain/parser/extractor';
import { calculatePeakScooterCommute } from '../src/domain/commute/router';
import { computeListingScore } from '../src/domain/scorer/ratingEngine';
import { cleanPostText, generatePostId } from '../src/domain/parser/cleaner';
import {
  resolveBangalorePlace,
  buildSocietyMapsUrl,
  buildLandmarkMapsUrl,
  buildLocalityMapsUrl,
} from '../src/domain/bangalore/gazetteer';
import {
  RentalListing,
  ExtractedEntities,
  CommuteWindow,
  ScoringBreakdown,
  RatingTier,
  UserListingStatus,
  BHKType,
  FurnishingStatus,
  BangaloreZone,
  FbGroup,
  BangalorePlaceSummary,
  makeINR,
  makeKilometers,
  makeMinutes,
  makeFbPostId,
  makeGoogleMapsUrl,
  makeGroupId,
  ListingId,
} from '../src/domain/types';

export const config = {
  runtime: 'edge',
};

const app = new Hono();

app.use('*', cors());

// Database client instance using pure web fetch for Edge runtime
function getDbClient() {
  const url = process.env.TURSO_DATABASE_URL || 'file:data/listings.db';
  const authToken = process.env.TURSO_AUTH_TOKEN;
  return authToken ? createClient({ url, authToken }) : createClient({ url });
}

const SCHEMA_SQL = `
CREATE TABLE IF NOT EXISTS listings (
  id INTEGER PRIMARY KEY AUTOINCREMENT,
  fb_post_id TEXT UNIQUE NOT NULL,
  group_id TEXT,
  group_name TEXT NOT NULL,
  post_url TEXT NOT NULL,
  author_name TEXT NOT NULL,
  posted_time TEXT NOT NULL DEFAULT 'Recently',
  raw_text TEXT NOT NULL,
  location TEXT NOT NULL,
  zone TEXT NOT NULL DEFAULT 'ORR & Bellandur',
  landmark TEXT,
  society_maps_url TEXT,
  landmark_maps_url TEXT,
  locality_maps_url TEXT NOT NULL DEFAULT '',
  title TEXT,
  summary TEXT,
  image_urls TEXT DEFAULT '[]',
  bhk_type TEXT NOT NULL,
  rent INTEGER,
  deposit INTEGER,
  is_brokerage INTEGER NOT NULL,
  is_gated_society INTEGER NOT NULL,
  society_name TEXT,
  has_swimming_pool INTEGER NOT NULL,
  has_power_backup INTEGER NOT NULL,
  has_attached_washroom INTEGER NOT NULL,
  has_balcony INTEGER NOT NULL,
  furnishing TEXT NOT NULL,
  is_kadubeesanahalli_direct INTEGER NOT NULL,
  contact_phone TEXT,
  distance_km REAL NOT NULL,
  inbound_mins INTEGER NOT NULL,
  outbound_mins INTEGER NOT NULL,
  two_way_avg_peak_mins INTEGER NOT NULL,
  has_panathur_underpass_bottleneck INTEGER NOT NULL,
  score INTEGER NOT NULL,
  score_breakdown TEXT NOT NULL,
  tier TEXT NOT NULL,
  user_status TEXT NOT NULL DEFAULT 'new',
  created_at TEXT NOT NULL DEFAULT (datetime('now')),
  updated_at TEXT NOT NULL DEFAULT (datetime('now'))
);
CREATE INDEX IF NOT EXISTS idx_listings_score ON listings(score DESC);
CREATE INDEX IF NOT EXISTS idx_listings_created_at ON listings(created_at DESC);
CREATE INDEX IF NOT EXISTS idx_listings_user_status ON listings(user_status);
CREATE INDEX IF NOT EXISTS idx_listings_zone ON listings(zone);
CREATE INDEX IF NOT EXISTS idx_listings_group_id ON listings(group_id);
CREATE TABLE IF NOT EXISTS fb_groups (
  id TEXT PRIMARY KEY,
  name TEXT NOT NULL,
  url TEXT NOT NULL,
  member_count TEXT DEFAULT '',
  category TEXT NOT NULL DEFAULT 'Rental & Flatmates',
  enabled INTEGER NOT NULL DEFAULT 1,
  listings_count INTEGER NOT NULL DEFAULT 0,
  last_scraped_at TEXT,
  created_at TEXT NOT NULL DEFAULT (datetime('now')),
  updated_at TEXT NOT NULL DEFAULT (datetime('now'))
);
`;

let schemaReady = false;
async function ensureSchema(client: any) {
  if (schemaReady) return;
  const statements = SCHEMA_SQL.split(';').map((s) => s.trim()).filter((s) => s.length > 0);
  try {
    if (typeof client.batch === 'function') {
      await client.batch(
        statements.map((sql: string) => ({ sql, args: [] })),
        'write'
      );
    } else {
      for (const stmt of statements) {
        await client.execute(stmt);
      }
    }
  } catch {
    // Ignore already exists
  }

  // Auto-migration
  const migrations = [
    'ALTER TABLE listings ADD COLUMN landmark TEXT',
    'ALTER TABLE listings ADD COLUMN title TEXT',
    'ALTER TABLE listings ADD COLUMN summary TEXT',
    "ALTER TABLE listings ADD COLUMN image_urls TEXT DEFAULT '[]'",
    'ALTER TABLE listings ADD COLUMN group_id TEXT',
    "ALTER TABLE listings ADD COLUMN zone TEXT NOT NULL DEFAULT 'ORR & Bellandur'",
    'ALTER TABLE listings ADD COLUMN society_maps_url TEXT',
    'ALTER TABLE listings ADD COLUMN landmark_maps_url TEXT',
    "ALTER TABLE listings ADD COLUMN locality_maps_url TEXT NOT NULL DEFAULT ''",
  ];

  for (const mig of migrations) {
    try {
      await client.execute(mig);
    } catch {
      // Ignore if already added
    }
  }

  schemaReady = true;
}

function mapRow(row: any): RentalListing {
  let parsedImages: string[] = [];
  if (row.image_urls) {
    try {
      parsedImages = JSON.parse(row.image_urls);
    } catch {
      parsedImages = [];
    }
  }

  const rawText = String(row.raw_text ?? '');
  const location = String(row.location ?? 'Kadubeesanahalli');
  const societyName = row.society_name ? String(row.society_name) : null;
  const landmark = row.landmark ? String(row.landmark) : null;

  const resolvedPlace = resolveBangalorePlace(rawText, location, societyName, landmark);
  const zone = (row.zone ? String(row.zone) : resolvedPlace.zone) as BangaloreZone;
  const localityMapsUrl = row.locality_maps_url
    ? makeGoogleMapsUrl(String(row.locality_maps_url))
    : resolvedPlace.localityMapsUrl;
  const societyMapsUrl = row.society_maps_url
    ? makeGoogleMapsUrl(String(row.society_maps_url))
    : resolvedPlace.societyMapsUrl ??
      (societyName ? buildSocietyMapsUrl(societyName, location) : undefined);
  const landmarkMapsUrl = row.landmark_maps_url
    ? makeGoogleMapsUrl(String(row.landmark_maps_url))
    : resolvedPlace.landmarkMapsUrl ??
      (landmark ? buildLandmarkMapsUrl(landmark, location) : undefined);

  const entities: ExtractedEntities = {
    rent: row.rent !== null ? makeINR(Number(row.rent)) : null,
    deposit: row.deposit !== null ? makeINR(Number(row.deposit)) : null,
    isBrokerage: Boolean(row.is_brokerage),
    isGatedSociety: Boolean(row.is_gated_society),
    societyName,
    landmark,
    hasSwimmingPool: Boolean(row.has_swimming_pool),
    hasPowerBackup: Boolean(row.has_power_backup),
    hasAttachedWashroom: Boolean(row.has_attached_washroom),
    hasBalcony: Boolean(row.has_balcony),
    isVegetarianOnly: /veg\s*only|vegetarian\s*only/i.test(rawText),
    isMaleBachelorAllowed: true,
    isFemaleOnly: /female\s*only|girls?\s*only/i.test(rawText),
    isWalkingDistance: /walking\s*distance|walk\s*to\s*ptp/i.test(rawText),
    furnishing: row.furnishing as FurnishingStatus,
    isKadubeesanahalliDirect: Boolean(row.is_kadubeesanahalli_direct),
    contactPhone: row.contact_phone || null,
    imageUrls: parsedImages.length > 0 ? parsedImages : undefined,
  };

  const commute: CommuteWindow = {
    distanceKm: makeKilometers(Number(row.distance_km)),
    inboundMins: makeMinutes(Number(row.inbound_mins)),
    outboundMins: makeMinutes(Number(row.outbound_mins)),
    twoWayAvgPeakMins: makeMinutes(Number(row.two_way_avg_peak_mins)),
    hasPanathurUnderpassBottleneck: Boolean(row.has_panathur_underpass_bottleneck),
  };

  let scoreBreakdown: ScoringBreakdown;
  try {
    scoreBreakdown = JSON.parse(row.score_breakdown);
  } catch {
    scoreBreakdown = {
      base: 50,
      rent: 0,
      brokerage: 0,
      deposit: 0,
      gatedSociety: 0,
      swimmingPool: 0,
      powerBackup: 0,
      attachedWashroom: 0,
      vegetarianPenalty: 0,
      bachelorMatch: 0,
      walkProximity: 0,
      furnished: 0,
      panathurBypass: 0,
      commute: 0,
    };
  }

  return {
    id: Number(row.id) as ListingId,
    fbPostId: makeFbPostId(row.fb_post_id),
    groupId: row.group_id ? makeGroupId(String(row.group_id)) : undefined,
    groupName: row.group_name,
    postUrl: row.post_url,
    authorName: row.author_name || 'Facebook Member',
    postedTime: row.posted_time || 'Recently',
    rawText,
    location,
    zone,
    landmark: landmark || undefined,
    societyMapsUrl,
    landmarkMapsUrl,
    localityMapsUrl,
    title: row.title || undefined,
    summary: row.summary || undefined,
    imageUrls: parsedImages.length > 0 ? parsedImages : undefined,
    bhkType: row.bhk_type as BHKType,
    entities,
    commute,
    score: Number(row.score),
    scoreBreakdown,
    tier: row.tier as RatingTier,
    userStatus: row.user_status as UserListingStatus,
    createdAt: row.created_at,
    updatedAt: row.updated_at,
  };
}

// Health Checks
const healthHandler = (c: any) => c.json({ status: 'ok', service: 'rental-radar-edge' });
app.get('/health', healthHandler);
app.get('/api/health', healthHandler);

// Config
const configHandler = (c: any) =>
  c.json({
    ptpAnchor: PTP_COORDINATES,
    scoringWeights: SCORING_CONFIG,
    targetLocations: TARGET_LOCATIONS,
    requiresPasscode: false,
  });
app.get('/config', configHandler);
app.get('/api/config', configHandler);

function buildRecencySqlCondition(recency?: string): string {
  if (!recency || recency === 'all') return '';

  switch (recency) {
    case '1h':
      return " AND (created_at >= datetime('now', '-1 hour') OR ((posted_time LIKE '%min%' OR posted_time LIKE '%1 hr%' OR posted_time LIKE '%1 hour%' OR posted_time LIKE '%just now%' OR posted_time LIKE '%Recently%') AND posted_time NOT LIKE '%11 hr%' AND posted_time NOT LIKE '%21 hr%' AND posted_time NOT LIKE '%11 hour%' AND posted_time NOT LIKE '%21 hour%' AND posted_time NOT LIKE '%day%' AND posted_time NOT LIKE '%week%' AND posted_time NOT LIKE '%month%'))";

    case '3h':
      return " AND (created_at >= datetime('now', '-3 hours') OR ((posted_time LIKE '%min%' OR posted_time LIKE '%1 hr%' OR posted_time LIKE '%2 hr%' OR posted_time LIKE '%3 hr%' OR posted_time LIKE '%1 hour%' OR posted_time LIKE '%2 hour%' OR posted_time LIKE '%3 hour%' OR posted_time LIKE '%just now%' OR posted_time LIKE '%Recently%') AND posted_time NOT LIKE '%11 hr%' AND posted_time NOT LIKE '%21 hr%' AND posted_time NOT LIKE '%12 hr%' AND posted_time NOT LIKE '%22 hr%' AND posted_time NOT LIKE '%13 hr%' AND posted_time NOT LIKE '%23 hr%' AND posted_time NOT LIKE '%11 hour%' AND posted_time NOT LIKE '%21 hour%' AND posted_time NOT LIKE '%12 hour%' AND posted_time NOT LIKE '%22 hour%' AND posted_time NOT LIKE '%13 hour%' AND posted_time NOT LIKE '%23 hour%' AND posted_time NOT LIKE '%day%' AND posted_time NOT LIKE '%week%' AND posted_time NOT LIKE '%month%'))";

    case '6h':
      return " AND (created_at >= datetime('now', '-6 hours') OR ((posted_time LIKE '%min%' OR posted_time LIKE '%1 hr%' OR posted_time LIKE '%2 hr%' OR posted_time LIKE '%3 hr%' OR posted_time LIKE '%4 hr%' OR posted_time LIKE '%5 hr%' OR posted_time LIKE '%6 hr%' OR posted_time LIKE '%1 hour%' OR posted_time LIKE '%2 hour%' OR posted_time LIKE '%3 hour%' OR posted_time LIKE '%4 hour%' OR posted_time LIKE '%5 hour%' OR posted_time LIKE '%6 hour%' OR posted_time LIKE '%just now%' OR posted_time LIKE '%Recently%') AND posted_time NOT LIKE '%11 hr%' AND posted_time NOT LIKE '%21 hr%' AND posted_time NOT LIKE '%12 hr%' AND posted_time NOT LIKE '%22 hr%' AND posted_time NOT LIKE '%13 hr%' AND posted_time NOT LIKE '%23 hr%' AND posted_time NOT LIKE '%14 hr%' AND posted_time NOT LIKE '%24 hr%' AND posted_time NOT LIKE '%15 hr%' AND posted_time NOT LIKE '%16 hr%' AND posted_time NOT LIKE '%11 hour%' AND posted_time NOT LIKE '%21 hour%' AND posted_time NOT LIKE '%12 hour%' AND posted_time NOT LIKE '%22 hour%' AND posted_time NOT LIKE '%13 hour%' AND posted_time NOT LIKE '%23 hour%' AND posted_time NOT LIKE '%14 hour%' AND posted_time NOT LIKE '%24 hour%' AND posted_time NOT LIKE '%15 hour%' AND posted_time NOT LIKE '%16 hour%' AND posted_time NOT LIKE '%day%' AND posted_time NOT LIKE '%week%' AND posted_time NOT LIKE '%month%'))";

    case '12h':
      return " AND (created_at >= datetime('now', '-12 hours') OR ((posted_time LIKE '%min%' OR posted_time LIKE '%hr%' OR posted_time LIKE '%hour%' OR posted_time LIKE '%just now%' OR posted_time LIKE '%Recently%') AND posted_time NOT LIKE '%13 hr%' AND posted_time NOT LIKE '%14 hr%' AND posted_time NOT LIKE '%15 hr%' AND posted_time NOT LIKE '%16 hr%' AND posted_time NOT LIKE '%17 hr%' AND posted_time NOT LIKE '%18 hr%' AND posted_time NOT LIKE '%19 hr%' AND posted_time NOT LIKE '%20 hr%' AND posted_time NOT LIKE '%21 hr%' AND posted_time NOT LIKE '%22 hr%' AND posted_time NOT LIKE '%23 hr%' AND posted_time NOT LIKE '%24 hr%' AND posted_time NOT LIKE '%13 hour%' AND posted_time NOT LIKE '%14 hour%' AND posted_time NOT LIKE '%15 hour%' AND posted_time NOT LIKE '%16 hour%' AND posted_time NOT LIKE '%17 hour%' AND posted_time NOT LIKE '%18 hour%' AND posted_time NOT LIKE '%19 hour%' AND posted_time NOT LIKE '%20 hour%' AND posted_time NOT LIKE '%21 hour%' AND posted_time NOT LIKE '%22 hour%' AND posted_time NOT LIKE '%23 hour%' AND posted_time NOT LIKE '%24 hour%' AND posted_time NOT LIKE '%day%' AND posted_time NOT LIKE '%week%' AND posted_time NOT LIKE '%month%' AND posted_time NOT LIKE '%year%'))";

    case '24h':
      return " AND (created_at >= datetime('now', '-24 hours') OR ((posted_time LIKE '%min%' OR posted_time LIKE '%hr%' OR posted_time LIKE '%hour%' OR posted_time LIKE '%just now%' OR posted_time LIKE '%Recently%' OR posted_time LIKE '%1 day%' OR posted_time LIKE '%1day%') AND posted_time NOT LIKE '%2 day%' AND posted_time NOT LIKE '%3 day%' AND posted_time NOT LIKE '%4 day%' AND posted_time NOT LIKE '%5 day%' AND posted_time NOT LIKE '%6 day%' AND posted_time NOT LIKE '%7 day%' AND posted_time NOT LIKE '%8 day%' AND posted_time NOT LIKE '%9 day%' AND posted_time NOT LIKE '%2day%' AND posted_time NOT LIKE '%3day%' AND posted_time NOT LIKE '%week%' AND posted_time NOT LIKE '%month%' AND posted_time NOT LIKE '%year%'))";

    case '7d':
      return " AND (created_at >= datetime('now', '-7 days') OR ((posted_time LIKE '%min%' OR posted_time LIKE '%hr%' OR posted_time LIKE '%hour%' OR posted_time LIKE '%day%' OR posted_time LIKE '%1 week%' OR posted_time LIKE '%just now%' OR posted_time LIKE '%Recently%') AND posted_time NOT LIKE '%8 day%' AND posted_time NOT LIKE '%9 day%' AND posted_time NOT LIKE '%10 day%' AND posted_time NOT LIKE '%11 day%' AND posted_time NOT LIKE '%12 day%' AND posted_time NOT LIKE '%13 day%' AND posted_time NOT LIKE '%14 day%' AND posted_time NOT LIKE '%2 week%' AND posted_time NOT LIKE '%3 week%' AND posted_time NOT LIKE '%4 week%' AND posted_time NOT LIKE '%month%' AND posted_time NOT LIKE '%year%'))";

    default:
      return '';
  }
}

// Listings Endpoints (with Backend Database Pagination & Recency Filtering)
const getListingsHandler = async (c: any) => {
  try {
    const client = getDbClient();
    await ensureSchema(client);

    // Continuous 7-Day Auto-Retention Cleanup
    await client.execute("DELETE FROM listings WHERE created_at < datetime('now', '-7 days')").catch(() => {});

    const rawPage = c.req.query('page');
    const rawLimit = c.req.query('limit');
    const parsedPage = rawPage ? parseInt(rawPage, 10) : 1;
    const parsedLimit = rawLimit ? parseInt(rawLimit, 10) : 12;
    const page = isNaN(parsedPage) || parsedPage < 1 ? 1 : parsedPage;
    const limit = isNaN(parsedLimit) || parsedLimit < 1 ? 12 : Math.min(100, parsedLimit);
    const offset = (page - 1) * limit;

    const minScore = c.req.query('minScore') ? parseInt(c.req.query('minScore')!, 10) : undefined;
    const maxRent = c.req.query('maxRent') ? parseInt(c.req.query('maxRent')!, 10) : undefined;
    const bhkType = c.req.query('bhkType');
    const furnishing = c.req.query('furnishing');
    const userStatus = c.req.query('userStatus');
    const recency = c.req.query('recency');
    const search = c.req.query('search');
    const zone = c.req.query('zone');
    const sortBy = c.req.query('sortBy') || 'score_desc';

    let whereClause = ' WHERE 1=1';
    const args: any[] = [];

    if (minScore !== undefined && !isNaN(minScore)) {
      whereClause += ' AND score >= ?';
      args.push(minScore);
    }
    if (maxRent !== undefined && !isNaN(maxRent)) {
      whereClause += ' AND (rent <= ? OR rent IS NULL)';
      args.push(maxRent);
    }
    if (bhkType && bhkType !== 'all') {
      whereClause += ' AND bhk_type LIKE ?';
      args.push(`%${bhkType}%`);
    }
    if (furnishing && furnishing !== 'all') {
      whereClause += ' AND furnishing = ?';
      args.push(furnishing);
    }
    if (userStatus && userStatus !== 'all') {
      whereClause += ' AND user_status = ?';
      args.push(userStatus);
    }
    if (recency && recency !== 'all') {
      whereClause += buildRecencySqlCondition(recency);
    }
    if (search) {
      whereClause += ' AND (raw_text LIKE ? OR society_name LIKE ? OR location LIKE ? OR landmark LIKE ? OR author_name LIKE ? OR contact_phone LIKE ?)';
      const t = `%${search}%`;
      args.push(t, t, t, t, t, t);
    }

    let orderClause = ' ORDER BY score DESC, created_at DESC';
    switch (sortBy) {
      case 'rent_asc':
        orderClause = ' ORDER BY CASE WHEN rent IS NULL THEN 999999 ELSE rent END ASC';
        break;
      case 'commute_asc':
        orderClause = ' ORDER BY two_way_avg_peak_mins ASC';
        break;
      case 'newest':
        orderClause = ' ORDER BY created_at DESC';
        break;
    }

    const dataSql = `SELECT * FROM listings ${whereClause} ${orderClause}`;
    const dataRes = await client.execute({ sql: dataSql, args });
    const rawRows = dataRes.rows || [];

    const rawListings = rawRows.map(mapRow);
    const zoneFilteredListings =
      zone && zone !== 'all' && zone !== 'All'
        ? rawListings.filter((l) => (l.zone ?? 'ORR & Bellandur').toLowerCase() === zone.toLowerCase())
        : rawListings;
    const allCanonicalListings = deduplicateListings(zoneFilteredListings);
    const totalCount = allCanonicalListings.length;
    const totalPages = totalCount === 0 ? 0 : Math.ceil(totalCount / limit);
    const hasMore = page < totalPages;
    const listings = allCanonicalListings.slice(offset, offset + limit);

    return c.json({
      count: listings.length,
      totalCount,
      page,
      limit,
      totalPages,
      hasMore,
      listings,
    });
  } catch (err: any) {
    return c.json(
      {
        count: 0,
        totalCount: 0,
        page: 1,
        limit: 12,
        totalPages: 0,
        hasMore: false,
        listings: [],
        error: err?.message || String(err),
        hint: process.env.TURSO_DATABASE_URL
          ? undefined
          : 'Please configure TURSO_DATABASE_URL and TURSO_AUTH_TOKEN in your Vercel project environment variables.',
      },
      500
    );
  }
};

app.get('/listings', getListingsHandler);
app.get('/api/listings', getListingsHandler);

// Stats Endpoints
const statsHandler = async (c: any) => {
  try {
    const client = getDbClient();
    await ensureSchema(client);

    // Continuous 7-Day Auto-Retention Cleanup
    await client.execute("DELETE FROM listings WHERE created_at < datetime('now', '-7 days')").catch(() => {});

    const statsRes = await client.execute(`
      SELECT 
        COUNT(*) as total_listings,
        SUM(CASE WHEN score >= 90 THEN 1 ELSE 0 END) as unicorn_matches,
        SUM(CASE WHEN score >= 70 AND score < 90 THEN 1 ELSE 0 END) as great_matches,
        AVG(CASE WHEN rent IS NOT NULL THEN rent ELSE NULL END) as avg_rent,
        AVG(two_way_avg_peak_mins) as avg_commute,
        SUM(CASE WHEN is_gated_society = 1 THEN 1 ELSE 0 END) as gated_count,
        SUM(CASE WHEN has_swimming_pool = 1 THEN 1 ELSE 0 END) as pool_count,
        SUM(CASE WHEN is_brokerage = 0 THEN 1 ELSE 0 END) as direct_owner_count
      FROM listings
    `);
    const row = (statsRes.rows[0] as Record<string, unknown> | undefined) ?? {};

    return c.json({
      totalListings: Number(row['total_listings'] ?? 0),
      unicornMatches: Number(row['unicorn_matches'] ?? 0),
      greatMatches: Number(row['great_matches'] ?? 0),
      avgRent: Math.round(Number(row['avg_rent'] ?? 0)),
      avgPeakCommuteMins: Math.round(Number(row['avg_commute'] ?? 0)),
      gatedCount: Number(row['gated_count'] ?? 0),
      poolCount: Number(row['pool_count'] ?? 0),
      directOwnerCount: Number(row['direct_owner_count'] ?? 0),
      lastScrapeTime: null,
    });
  } catch (err: any) {
    return c.json({ totalListings: 0, error: err?.message || String(err) }, 500);
  }
};

app.get('/stats', statsHandler);
app.get('/api/stats', statsHandler);

// Scrape Trigger Endpoints (Dispatches GitHub Actions scraper workflow)
const triggerRouteHandler = async (c: any) => {
  try {
    const token = process.env.GITHUB_DISPATCH_TOKEN || process.env.GITHUB_TOKEN;
    const repo = process.env.GITHUB_REPO || 'Sanjit-M/rental-radar';
    const ref = process.env.GITHUB_REF || 'main';
    const workflow = process.env.GITHUB_WORKFLOW || 'scraper.yml';

    if (!token) {
      return c.json(
        {
          status: 'error',
          message:
            'GITHUB_DISPATCH_TOKEN is not configured in Vercel environment variables. Please add a GitHub Personal Access Token with actions:write permission.',
        },
        500
      );
    }

    const dispatchUrl = `https://api.github.com/repos/${repo}/actions/workflows/${workflow}/dispatches`;
    const response = await fetch(dispatchUrl, {
      method: 'POST',
      headers: {
        Accept: 'application/vnd.github.v3+json',
        Authorization: `Bearer ${token}`,
        'User-Agent': 'Rental-Radar-Trigger',
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({ ref }),
    });

    if (response.status === 204) {
      return c.json({
        status: 'success',
        message:
          'GitHub Actions scrape workflow dispatched successfully. New listings will sync within 2-3 minutes.',
      });
    }

    let errorDetails = '';
    try {
      const errorJson: any = await response.json();
      errorDetails = errorJson.message || JSON.stringify(errorJson);
    } catch {
      errorDetails = response.statusText || 'Unknown error';
    }

    return c.json(
      {
        status: 'error',
        message: `GitHub Actions dispatch failed (HTTP ${response.status}): ${errorDetails}`,
      },
      502
    );
  } catch (err: any) {
    return c.json(
      {
        status: 'error',
        message: `Failed to dispatch GitHub Actions workflow: ${err?.message || String(err)}`,
      },
      500
    );
  }
};

app.post('/scrape/trigger', triggerRouteHandler);
app.post('/api/scrape/trigger', triggerRouteHandler);
app.post('/scrape/seed', triggerRouteHandler);
app.post('/api/scrape/seed', triggerRouteHandler);

// Scrape Status Polling Handler (Checks GitHub Actions workflow run status)
const scrapeStatusHandler = async (c: any) => {
  try {
    const token = process.env.GITHUB_DISPATCH_TOKEN || process.env.GITHUB_TOKEN;
    const repo = process.env.GITHUB_REPO || 'Sanjit-M/rental-radar';
    const workflow = process.env.GITHUB_WORKFLOW || 'scraper.yml';

    if (!token) {
      return c.json({
        status: 'idle',
        conclusion: null,
        message: 'No GitHub token configured',
      });
    }

    const runsUrl = `https://api.github.com/repos/${repo}/actions/workflows/${workflow}/runs?per_page=1`;
    const res = await fetch(runsUrl, {
      headers: {
        Accept: 'application/vnd.github.v3+json',
        Authorization: `Bearer ${token}`,
        'User-Agent': 'Rental-Radar-Trigger',
      },
    });

    if (!res.ok) {
      return c.json({
        status: 'idle',
        conclusion: null,
        message: `GitHub API error: ${res.statusText}`,
      });
    }

    const data: any = await res.json();
    const run = data.workflow_runs?.[0];
    if (!run) {
      return c.json({
        status: 'idle',
        conclusion: null,
        message: 'No workflow runs found',
      });
    }

    return c.json({
      status: run.status,
      conclusion: run.conclusion,
      runId: run.id,
      htmlUrl: run.html_url,
      createdAt: run.created_at,
      updatedAt: run.updated_at,
    });
  } catch (err: any) {
    return c.json({
      status: 'idle',
      conclusion: null,
      error: err?.message || String(err),
    });
  }
};

app.get('/scrape/status', scrapeStatusHandler);
app.get('/api/scrape/status', scrapeStatusHandler);

// Status Update Handler
const updateStatusHandler = async (c: any) => {
  try {
    const id = parseInt(c.req.param('id'), 10);
    const body = await c.req.json();
    const client = getDbClient();
    await ensureSchema(client);
    await client.execute({
      sql: 'UPDATE listings SET user_status = ?, updated_at = datetime("now") WHERE id = ?',
      args: [body.status, id],
    });
    return c.json({ success: true });
  } catch (err: any) {
    return c.json({ error: err?.message || String(err) }, 500);
  }
};

app.patch('/listings/:id/status', updateStatusHandler);
app.patch('/api/listings/:id/status', updateStatusHandler);

// Single Post Quick Parse & Ingest Handler (Interactive Test Mode)
const parseSingleHandler = async (c: any) => {
  try {
    const body = await c.req.json();
    const rawText = body.text || '';
    const postUrl = body.postUrl || `https://www.facebook.com/groups/posts/manual_${Date.now()}`;
    const authorName = body.authorName || 'Manual Ingestion';
    const groupName = body.groupName || 'Manual Submission';
    const imageUrls = Array.isArray(body.imageUrls) ? body.imageUrls : [];
    const bypassFilters = Boolean(body.bypassFilters);

    if (!rawText || rawText.trim().length < 15) {
      return c.json({ success: false, error: 'Text too short (must be at least 15 characters)' }, 400);
    }

    const clean = cleanPostText(rawText);
    let location = 'Kadubeesanahalli';
    let bhkType: BHKType = '2 BHK (Shared/Full)';

    if (!bypassFilters) {
      const filterResult = passesAllFilters(clean);
      if (filterResult._tag === 'err') {
        return c.json({
          success: false,
          filtered: true,
          reason: filterResult.error.message,
        }, 200);
      }
      location = filterResult.value.location;
      bhkType = filterResult.value.bhkType;
    } else {
      const locMatch = isValidLocation(clean, { cityWide: true });
      if (locMatch._tag === 'ok') location = locMatch.value;
      const bhkMatch = isValidBHK(clean);
      if (bhkMatch._tag === 'ok') bhkType = bhkMatch.value;
    }

    const entities = extractAllEntities(clean, imageUrls);
    const resolvedPlace = resolveBangalorePlace(clean, location, entities.societyName, entities.landmark);
    const commute = calculatePeakScooterCommute(
      entities.societyLat,
      entities.societyLon,
      location,
      entities.isKadubeesanahalliDirect
    );
    const { score, breakdown, tier } = computeListingScore(entities, commute);
    const fbPostId = generatePostId(groupName, authorName, clean);

    const client = getDbClient();
    await ensureSchema(client);

    const upsertSql = `
      INSERT INTO listings (
        fb_post_id, group_name, post_url, author_name, posted_time, raw_text,
        location, zone, landmark, society_maps_url, landmark_maps_url, locality_maps_url,
        title, summary, image_urls,
        bhk_type, rent, deposit, is_brokerage,
        is_gated_society, society_name, has_swimming_pool,
        has_power_backup, has_attached_washroom, has_balcony,
        furnishing, is_kadubeesanahalli_direct, contact_phone,
        distance_km, inbound_mins, outbound_mins, two_way_avg_peak_mins,
        has_panathur_underpass_bottleneck, score, score_breakdown, tier,
        user_status, created_at, updated_at
      ) VALUES (
        ?, ?, ?, ?, ?, ?,
        ?, ?, ?, ?, ?, ?,
        ?, ?, ?,
        ?, ?, ?, ?,
        ?, ?, ?,
        ?, ?, ?,
        ?, ?, ?,
        ?, ?, ?, ?,
        ?, ?, ?, ?,
        ?, datetime('now'), datetime('now')
      )
      ON CONFLICT(fb_post_id) DO UPDATE SET
        author_name=excluded.author_name,
        zone=excluded.zone,
        landmark=excluded.landmark,
        society_maps_url=excluded.society_maps_url,
        landmark_maps_url=excluded.landmark_maps_url,
        locality_maps_url=excluded.locality_maps_url,
        title=excluded.title,
        summary=excluded.summary,
        image_urls=excluded.image_urls,
        rent=excluded.rent,
        deposit=excluded.deposit,
        score=excluded.score,
        score_breakdown=excluded.score_breakdown,
        tier=excluded.tier,
        updated_at=datetime('now');
    `;

    const imagesToSave = entities.imageUrls || imageUrls || [];
    const title = `${bhkType} in ${entities.societyName || location}`;
    const summary = clean.slice(0, 250);

    await client.execute({
      sql: upsertSql,
      args: [
        fbPostId,
        groupName,
        postUrl,
        authorName,
        'Just now',
        clean,
        location,
        resolvedPlace.zone,
        entities.landmark || null,
        resolvedPlace.societyMapsUrl ?? null,
        resolvedPlace.landmarkMapsUrl ?? null,
        resolvedPlace.localityMapsUrl,
        title,
        summary,
        JSON.stringify(imagesToSave),
        bhkType,
        entities.rent !== null ? entities.rent : null,
        entities.deposit !== null ? entities.deposit : null,
        entities.isBrokerage ? 1 : 0,
        entities.isGatedSociety ? 1 : 0,
        entities.societyName,
        entities.hasSwimmingPool ? 1 : 0,
        entities.hasPowerBackup ? 1 : 0,
        entities.hasAttachedWashroom ? 1 : 0,
        entities.hasBalcony ? 1 : 0,
        entities.furnishing,
        entities.isKadubeesanahalliDirect ? 1 : 0,
        entities.contactPhone,
        commute.distanceKm,
        commute.inboundMins,
        commute.outboundMins,
        commute.twoWayAvgPeakMins,
        commute.hasPanathurUnderpassBottleneck ? 1 : 0,
        score,
        JSON.stringify(breakdown),
        tier,
        'new',
      ],
    });

    const selectRes = await client.execute({
      sql: 'SELECT * FROM listings WHERE fb_post_id = ? LIMIT 1',
      args: [fbPostId],
    });
    const fullListing = selectRes.rows.length > 0 ? mapRow(selectRes.rows[0]) : null;

    return c.json({
      success: true,
      listing: fullListing || {
        id: 0,
        fbPostId,
        groupName,
        postUrl,
        authorName,
        postedTime: 'Just now',
        rawText: clean,
        location,
        zone: resolvedPlace.zone,
        landmark: entities.landmark || undefined,
        societyMapsUrl: resolvedPlace.societyMapsUrl,
        landmarkMapsUrl: resolvedPlace.landmarkMapsUrl,
        localityMapsUrl: resolvedPlace.localityMapsUrl,
        title,
        summary,
        imageUrls: imagesToSave.length > 0 ? imagesToSave : undefined,
        bhkType,
        entities,
        commute,
        score,
        scoreBreakdown: breakdown,
        tier,
        userStatus: 'new',
        createdAt: new Date().toISOString(),
        updatedAt: new Date().toISOString(),
      },
    });
  } catch (err: any) {
    return c.json({ success: false, error: err?.message || String(err) }, 500);
  }
};

app.post('/scrape/parse-single', parseSingleHandler);
app.post('/api/scrape/parse-single', parseSingleHandler);

// Groups Endpoints
async function seedDefaultGroupsIfNeeded(client: any): Promise<void> {
  const existing = await client.execute('SELECT COUNT(*) as count FROM fb_groups');
  const count = Number((existing.rows[0] as Record<string, unknown> | undefined)?.['count'] ?? 0);
  if (count > 0) return;

  for (const g of DEFAULT_FB_GROUPS) {
    await client.execute({
      sql: `
        INSERT INTO fb_groups (id, name, url, member_count, category, enabled, listings_count, last_scraped_at, created_at, updated_at)
        VALUES (?, ?, ?, ?, ?, 1, 0, NULL, datetime('now'), datetime('now'))
        ON CONFLICT(id) DO NOTHING
      `,
      args: [g.id, g.name, g.url, g.memberCount, g.category],
    });
  }
}

const getGroupsHandler = async (c: any) => {
  try {
    const client = getDbClient();
    await ensureSchema(client);
    await seedDefaultGroupsIfNeeded(client);

    const res = await client.execute(`
      SELECT
        g.id,
        g.name,
        g.url,
        g.member_count,
        g.category,
        g.enabled,
        g.last_scraped_at,
        g.listings_count,
        g.created_at,
        g.updated_at,
        COUNT(l.id) as live_count
      FROM fb_groups g
      LEFT JOIN listings l ON (l.group_id = g.id OR l.group_name = g.name)
      GROUP BY g.id, g.name, g.url, g.member_count, g.category, g.enabled, g.last_scraped_at, g.listings_count, g.created_at, g.updated_at
      ORDER BY g.enabled DESC, live_count DESC, g.name ASC
    `);

    const now = new Date().toISOString();
    const groups: FbGroup[] = (res.rows || []).map((r: any) => {
      const row = r as Record<string, unknown>;
      const liveCount = Number(row['live_count'] ?? 0);
      const storedCount = Number(row['listings_count'] ?? 0);
      return {
        id: makeGroupId(String(row['id'])),
        name: String(row['name']),
        url: String(row['url']),
        memberCount: String(row['member_count'] ?? ''),
        category: String(row['category'] ?? 'Rental & Flatmates'),
        enabled: Boolean(row['enabled']),
        lastScrapedAt: row['last_scraped_at'] ? String(row['last_scraped_at']) : null,
        listingsCount: Math.max(liveCount, storedCount),
        createdAt: String(row['created_at'] ?? now),
        updatedAt: String(row['updated_at'] ?? now),
      };
    });

    return c.json(groups);
  } catch (err: any) {
    return c.json({ error: err?.message || String(err), groups: [] }, 500);
  }
};

const patchGroupHandler = async (c: any) => {
  try {
    const id = c.req.param('id');
    const client = getDbClient();
    await ensureSchema(client);
    await seedDefaultGroupsIfNeeded(client);

    let requestedEnabled: boolean | undefined;
    try {
      const body = await c.req.json();
      if (typeof body.enabled === 'boolean') {
        requestedEnabled = body.enabled;
      }
    } catch {
      // Allow empty body to toggle
    }

    const currentRes = await client.execute({
      sql: 'SELECT enabled FROM fb_groups WHERE id = ? LIMIT 1',
      args: [id],
    });
    if (currentRes.rows.length === 0) {
      return c.json({ error: 'Group not found' }, 404);
    }

    const currentEnabled = Boolean((currentRes.rows[0] as Record<string, unknown>)['enabled']);
    const nextEnabled = requestedEnabled !== undefined ? requestedEnabled : !currentEnabled;

    await client.execute({
      sql: "UPDATE fb_groups SET enabled = ?, updated_at = datetime('now') WHERE id = ?",
      args: [nextEnabled ? 1 : 0, id],
    });

    return c.json({ success: true, id, enabled: nextEnabled });
  } catch (err: any) {
    return c.json({ error: err?.message || String(err) }, 500);
  }
};

app.get('/groups', getGroupsHandler);
app.get('/api/groups', getGroupsHandler);
app.patch('/groups/:id', patchGroupHandler);
app.patch('/api/groups/:id', patchGroupHandler);

function computeMedianRent(values: number[]): number | null {
  if (values.length === 0) return null;
  const sorted = [...values].sort((a, b) => a - b);
  const mid = Math.floor(sorted.length / 2);
  if (sorted.length % 2 === 1) {
    return sorted[mid] ?? null;
  }
  return Math.round(((sorted[mid - 1] ?? 0) + (sorted[mid] ?? 0)) / 2);
}

// Places Directory Endpoints
const getPlacesHandler = async (c: any) => {
  try {
    const client = getDbClient();
    await ensureSchema(client);

    const res = await client.execute('SELECT * FROM listings ORDER BY score DESC, created_at DESC');
    const rawListings = (res.rows || []).map(mapRow);
    const canonical = deduplicateListings(rawListings);

    const buckets = new Map<
      string,
      {
        zone: BangaloreZone;
        locality: string;
        societyName: string | null;
        mapsUrl: string;
        rents: number[];
        topScore: number;
        count: number;
      }
    >();

    for (const listing of canonical) {
      const zone = listing.zone || 'ORR & Bellandur';
      const locality = listing.location || 'Kadubeesanahalli';
      const societyName = listing.entities.societyName || null;
      const key = `${zone}::${locality.toLowerCase()}::${(societyName || '').toLowerCase()}`;
      const mapsUrl =
        listing.societyMapsUrl ||
        listing.localityMapsUrl ||
        (societyName ? buildSocietyMapsUrl(societyName, locality) : buildLocalityMapsUrl(locality));

      const existing = buckets.get(key);
      if (existing) {
        existing.count += 1;
        if (listing.entities.rent !== null) {
          existing.rents.push(Number(listing.entities.rent));
        }
        if (listing.score > existing.topScore) {
          existing.topScore = listing.score;
        }
      } else {
        buckets.set(key, {
          zone,
          locality,
          societyName,
          mapsUrl,
          rents: listing.entities.rent !== null ? [Number(listing.entities.rent)] : [],
          topScore: listing.score,
          count: 1,
        });
      }
    }

    const places: BangalorePlaceSummary[] = Array.from(buckets.values())
      .map((entry) => ({
        zone: entry.zone,
        locality: entry.locality,
        societyName: entry.societyName,
        mapsUrl: entry.mapsUrl,
        listingCount: entry.count,
        medianRent: computeMedianRent(entry.rents),
        topScore: entry.topScore,
      }))
      .sort((a, b) => b.listingCount - a.listingCount || b.topScore - a.topScore);

    return c.json(places);
  } catch (err: any) {
    return c.json({ error: err?.message || String(err), places: [] }, 500);
  }
};

app.get('/places', getPlacesHandler);
app.get('/api/places', getPlacesHandler);

export default app.fetch;


