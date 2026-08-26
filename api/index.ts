import { Hono } from 'hono';
import { cors } from 'hono/cors';
import { createClient } from '@libsql/client/web';
import { PTP_COORDINATES, SCORING_CONFIG, TARGET_LOCATIONS } from '../src/domain/config';
import { SEED_POSTS } from '../src/scraper/seedData';
import { passesAllFilters } from '../src/domain/parser/filter';
import { extractAllEntities } from '../src/domain/parser/extractor';
import { calculatePeakScooterCommute } from '../src/domain/commute/router';
import { computeListingScore } from '../src/domain/scorer/ratingEngine';
import { cleanPostText, generatePostId } from '../src/domain/parser/cleaner';
import { deduplicateListings } from '../src/domain/parser/deduplicator';
import {
  RentalListing,
  ExtractedEntities,
  CommuteWindow,
  ScoringBreakdown,
  RatingTier,
  UserListingStatus,
  BHKType,
  FurnishingStatus,
  makeINR,
  makeKilometers,
  makeMinutes,
  makeFbPostId,
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
  group_name TEXT NOT NULL,
  post_url TEXT NOT NULL,
  author_name TEXT NOT NULL,
  posted_time TEXT NOT NULL DEFAULT 'Recently',
  raw_text TEXT NOT NULL,
  location TEXT NOT NULL,
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
  schemaReady = true;
}

function mapRow(row: any): RentalListing {
  const entities: ExtractedEntities = {
    rent: row.rent !== null ? makeINR(Number(row.rent)) : null,
    deposit: row.deposit !== null ? makeINR(Number(row.deposit)) : null,
    isBrokerage: Boolean(row.is_brokerage),
    isGatedSociety: Boolean(row.is_gated_society),
    societyName: row.society_name || null,
    hasSwimmingPool: Boolean(row.has_swimming_pool),
    hasPowerBackup: Boolean(row.has_power_backup),
    hasAttachedWashroom: Boolean(row.has_attached_washroom),
    hasBalcony: Boolean(row.has_balcony),
    isVegetarianOnly: /veg\s*only|vegetarian\s*only/i.test(row.raw_text),
    isMaleBachelorAllowed: true,
    isFemaleOnly: /female\s*only|girls?\s*only/i.test(row.raw_text),
    isWalkingDistance: /walking\s*distance|walk\s*to\s*ptp/i.test(row.raw_text),
    furnishing: row.furnishing as FurnishingStatus,
    isKadubeesanahalliDirect: Boolean(row.is_kadubeesanahalli_direct),
    contactPhone: row.contact_phone || null,
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
    groupName: row.group_name,
    postUrl: row.post_url,
    authorName: row.author_name || 'Facebook Member',
    postedTime: row.posted_time || 'Recently',
    rawText: row.raw_text,
    location: row.location,
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

async function seedData(client: any): Promise<number> {
  await ensureSchema(client);
  let count = 0;
  for (const post of SEED_POSTS) {
    const clean = cleanPostText(post.text);
    const filterRes = passesAllFilters(clean);
    if (filterRes._tag === 'err') continue;

    const { location, bhkType } = filterRes.value;
    const entities = extractAllEntities(clean);
    const commute = calculatePeakScooterCommute(
      entities.societyLat,
      entities.societyLon,
      location,
      entities.isKadubeesanahalliDirect
    );
    const { score, breakdown, tier } = computeListingScore(entities, commute);
    const fbPostId = post.fbPostId || generatePostId(post.groupName, post.authorName, clean);

    const upsertSql = `
      INSERT INTO listings (
        fb_post_id, group_name, post_url, author_name, posted_time, raw_text,
        location, bhk_type, rent, deposit, is_brokerage,
        is_gated_society, society_name, has_swimming_pool,
        has_power_backup, has_attached_washroom, has_balcony,
        furnishing, is_kadubeesanahalli_direct, contact_phone,
        distance_km, inbound_mins, outbound_mins, two_way_avg_peak_mins,
        has_panathur_underpass_bottleneck, score, score_breakdown, tier,
        user_status, updated_at
      ) VALUES (
        ?, ?, ?, ?, ?, ?,
        ?, ?, ?, ?, ?,
        ?, ?, ?,
        ?, ?, ?,
        ?, ?, ?,
        ?, ?, ?, ?,
        ?, ?, ?, ?,
        ?, datetime('now')
      )
      ON CONFLICT(fb_post_id) DO UPDATE SET
        author_name=excluded.author_name,
        posted_time=excluded.posted_time,
        rent=excluded.rent,
        deposit=excluded.deposit,
        score=excluded.score,
        score_breakdown=excluded.score_breakdown,
        updated_at=datetime('now');
    `;

    await client.execute({
      sql: upsertSql,
      args: [
        fbPostId,
        post.groupName,
        post.postUrl,
        post.authorName,
        post.postedTime,
        clean,
        location,
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
        post.userStatus || 'new',
      ],
    });
    count++;
  }
  return count;
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
      whereClause += ' AND (raw_text LIKE ? OR society_name LIKE ? OR location LIKE ? OR author_name LIKE ? OR contact_phone LIKE ?)';
      const t = `%${search}%`;
      args.push(t, t, t, t, t);
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
    const allCanonicalListings = deduplicateListings(rawListings);
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

    const statsRes = await client.execute(`
      SELECT 
        COUNT(*) as total_listings,
        SUM(CASE WHEN score >= 90 THEN 1 ELSE 0 END) as unicorn_matches,
        SUM(CASE WHEN score >= 75 AND score < 90 THEN 1 ELSE 0 END) as great_matches,
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

// Scrape / Seed Endpoints (Unrestricted for seamless UI triggers)
const triggerRouteHandler = async (c: any) => {
  try {
    const client = getDbClient();
    const count = await seedData(client);
    return c.json({
      status: 'success',
      scanned: count,
      matched: count,
      message: `Synced ${count} verified listings to cloud database.`,
    });
  } catch (err: any) {
    return c.json({ status: 'error', message: err?.message || String(err) }, 500);
  }
};

app.post('/scrape/trigger', triggerRouteHandler);
app.post('/api/scrape/trigger', triggerRouteHandler);
app.post('/scrape/seed', triggerRouteHandler);
app.post('/api/scrape/seed', triggerRouteHandler);

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

export default app.fetch;
