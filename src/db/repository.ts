import { db } from './database';
import { deduplicateListings } from '../domain/parser/deduplicator';
import {
  RentalListing,
  ExtractedEntities,
  CommuteWindow,
  ScoringBreakdown,
  RatingTier,
  UserListingStatus,
  BHKType,
  FurnishingStatus,
  DashboardStats,
  ListingId,
  FbPostId,
  PaginatedListingsResponse,
  makeINR,
  makeKilometers,
  makeMinutes,
  makeFbPostId,
  SortBy,
} from '../domain/types';

/** Options for filtering and sorting rental listings. */
export interface ListingQueryOptions {
  readonly page?: number | undefined;
  readonly limit?: number | undefined;
  readonly minScore?: number | undefined;
  readonly maxRent?: number | undefined;
  readonly bhkType?: string | undefined;
  readonly furnishing?: string | undefined;
  readonly userStatus?: string | undefined;
  readonly recency?: string | undefined;
  readonly search?: string | undefined;
  readonly sortBy?: SortBy | undefined;
}

/**
 * Generates SQL condition for recency time-window filtering.
 * Evaluates both SQLite datetime created_at records and relative posted_time strings.
 */
export function buildRecencySqlCondition(recency?: string): string {
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

interface RawDatabaseRow {
  id: number;
  fb_post_id: string;
  group_name: string;
  post_url: string;
  author_name: string;
  posted_time: string;
  raw_text: string;
  location: string;
  bhk_type: string;
  rent: number | null;
  deposit: number | null;
  is_brokerage: number;
  is_gated_society: number;
  society_name: string | null;
  has_swimming_pool: number;
  has_power_backup: number;
  has_attached_washroom: number;
  has_balcony: number;
  furnishing: string;
  is_kadubeesanahalli_direct: number;
  contact_phone: string | null;
  distance_km: number;
  inbound_mins: number;
  outbound_mins: number;
  two_way_avg_peak_mins: number;
  has_panathur_underpass_bottleneck: number;
  score: number;
  score_breakdown: string;
  tier: string;
  user_status: string;
  created_at: string;
  updated_at: string;
}

function mapRowToListing(row: RawDatabaseRow): RentalListing {
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
    // SAFETY: `furnishing` column is constrained by the INSERT schema to one of
    // the four FurnishingStatus literals. The DB is the sole write path.
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
    scoreBreakdown = JSON.parse(row.score_breakdown) as ScoringBreakdown;
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

  // SAFETY: DB `id` column is an INTEGER PRIMARY KEY; Number() coercion is safe
  // and callers cannot construct a ListingId without going through this adapter.
  const id = Number(row.id) as ListingId;
  const fbPostId = makeFbPostId(row.fb_post_id);

  return {
    id,
    fbPostId,
    groupName: row.group_name,
    postUrl: row.post_url,
    authorName: row.author_name || 'Facebook Member',
    postedTime: row.posted_time || 'Recently',
    rawText: row.raw_text,
    location: row.location,
    // SAFETY: `bhk_type` column is constrained by INSERT schema to the BHKType union.
    bhkType: row.bhk_type as BHKType,
    entities,
    commute,
    score: Number(row.score),
    scoreBreakdown,
    // SAFETY: `tier` column is written by ratingEngine.ts which produces only RatingTier values.
    tier: row.tier as RatingTier,
    // SAFETY: `user_status` column is constrained by PATCH /status route to UserListingStatus.
    userStatus: row.user_status as UserListingStatus,
    createdAt: row.created_at,
    updatedAt: row.updated_at,
  };
}

function buildWhereClause(options: ListingQueryOptions): { whereSql: string; params: (string | number)[] } {
  let whereSql = ' WHERE 1=1';
  const params: (string | number)[] = [];

  if (options.minScore !== undefined) {
    whereSql += ' AND score >= ?';
    params.push(options.minScore);
  }

  if (options.maxRent !== undefined) {
    whereSql += ' AND (rent <= ? OR rent IS NULL)';
    params.push(options.maxRent);
  }

  if (options.bhkType && options.bhkType !== 'all') {
    whereSql += ' AND bhk_type LIKE ?';
    params.push(`%${options.bhkType}%`);
  }

  if (options.furnishing && options.furnishing !== 'all') {
    whereSql += ' AND furnishing = ?';
    params.push(options.furnishing);
  }

  if (options.userStatus && options.userStatus !== 'all') {
    whereSql += ' AND user_status = ?';
    params.push(options.userStatus);
  }

  if (options.recency && options.recency !== 'all') {
    whereSql += buildRecencySqlCondition(options.recency);
  }

  if (options.search) {
    whereSql += ' AND (raw_text LIKE ? OR society_name LIKE ? OR location LIKE ? OR author_name LIKE ? OR contact_phone LIKE ?)';
    const term = `%${options.search}%`;
    params.push(term, term, term, term, term);
  }

  return { whereSql, params };
}

function buildOrderClause(sortBy?: string): string {
  switch (sortBy) {
    case 'rent_asc':
      return ' ORDER BY CASE WHEN rent IS NULL THEN 999999 ELSE rent END ASC';
    case 'commute_asc':
      return ' ORDER BY two_way_avg_peak_mins ASC';
    case 'newest':
      return ' ORDER BY created_at DESC';
    case 'score_desc':
    default:
      return ' ORDER BY score DESC, created_at DESC';
  }
}

/** Repository for persisting and querying rental listings across Local SQLite or Turso. */
export const listingRepository = {
  async init(): Promise<void> {
    await db.initSchema();
  },

  async upsertListing(listing: Omit<RentalListing, 'id' | 'createdAt' | 'updatedAt'>): Promise<RentalListing> {
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
        tier=excluded.tier,
        inbound_mins=excluded.inbound_mins,
        outbound_mins=excluded.outbound_mins,
        two_way_avg_peak_mins=excluded.two_way_avg_peak_mins,
        updated_at=datetime('now');
    `;

    await db.execute(upsertSql, [
      listing.fbPostId,
      listing.groupName,
      listing.postUrl,
      listing.authorName,
      listing.postedTime || 'Recently',
      listing.rawText,
      listing.location,
      listing.bhkType,
      listing.entities.rent !== null ? listing.entities.rent : null,
      listing.entities.deposit !== null ? listing.entities.deposit : null,
      listing.entities.isBrokerage ? 1 : 0,
      listing.entities.isGatedSociety ? 1 : 0,
      listing.entities.societyName,
      listing.entities.hasSwimmingPool ? 1 : 0,
      listing.entities.hasPowerBackup ? 1 : 0,
      listing.entities.hasAttachedWashroom ? 1 : 0,
      listing.entities.hasBalcony ? 1 : 0,
      listing.entities.furnishing,
      listing.entities.isKadubeesanahalliDirect ? 1 : 0,
      listing.entities.contactPhone,
      listing.commute.distanceKm,
      listing.commute.inboundMins,
      listing.commute.outboundMins,
      listing.commute.twoWayAvgPeakMins,
      listing.commute.hasPanathurUnderpassBottleneck ? 1 : 0,
      listing.score,
      JSON.stringify(listing.scoreBreakdown),
      listing.tier,
      listing.userStatus || 'new',
    ]);

    const row = await db.queryOne<RawDatabaseRow>('SELECT * FROM listings WHERE fb_post_id = ?', [listing.fbPostId]);
    if (!row) throw new Error('Failed to retrieve upserted listing');
    return mapRowToListing(row);
  },

  async getPaginatedListings(options: ListingQueryOptions = {}): Promise<PaginatedListingsResponse> {
    const page = Math.max(1, typeof options.page === 'number' && !isNaN(options.page) ? options.page : 1);
    const limit = Math.min(50, Math.max(1, typeof options.limit === 'number' && !isNaN(options.limit) ? options.limit : 12));
    const offset = (page - 1) * limit;

    const { whereSql, params } = buildWhereClause(options);
    const orderSql = buildOrderClause(options.sortBy);

    // 1. Query total matching count
    const countSql = `SELECT COUNT(*) as total FROM listings${whereSql}`;
    const countRow = await db.queryOne<{ total: number }>(countSql, params);
    const totalCount = Number(countRow?.total || 0);

    // 2. Query paginated slice
    const dataSql = `SELECT * FROM listings${whereSql}${orderSql} LIMIT ? OFFSET ?`;
    const dataParams = [...params, limit, offset];
    const rows = await db.query<RawDatabaseRow>(dataSql, dataParams);
    const rawListings = rows.map(mapRowToListing);

    // 3. Deduplicate listings within this slice
    const listings = deduplicateListings(rawListings);

    const totalPages = totalCount === 0 ? 0 : Math.ceil(totalCount / limit);
    const hasMore = page < totalPages;

    return {
      count: listings.length,
      totalCount,
      page,
      limit,
      totalPages,
      hasMore,
      listings,
    };
  },

  async getListings(options: ListingQueryOptions = {}): Promise<RentalListing[]> {
    const { whereSql, params } = buildWhereClause(options);
    const orderSql = buildOrderClause(options.sortBy);

    let sql = `SELECT * FROM listings${whereSql}${orderSql}`;
    const queryParams = [...params];

    if (options.limit !== undefined) {
      sql += ' LIMIT ?';
      queryParams.push(options.limit);
      if (options.page !== undefined && options.page > 1) {
        sql += ' OFFSET ?';
        queryParams.push((options.page - 1) * options.limit);
      }
    }

    const rows = await db.query<RawDatabaseRow>(sql, queryParams);
    return rows.map(mapRowToListing);
  },

  async getListingById(id: number): Promise<RentalListing | null> {
    const row = await db.queryOne<RawDatabaseRow>('SELECT * FROM listings WHERE id = ?', [id]);
    return row ? mapRowToListing(row) : null;
  },

  async updateStatus(id: number, status: UserListingStatus): Promise<boolean> {
    const res = await db.execute(
      'UPDATE listings SET user_status = ?, updated_at = datetime("now") WHERE id = ?',
      [status, id]
    );
    return res.changes > 0;
  },

  async getStats(): Promise<DashboardStats> {
    const statsRow = await db.queryOne<Record<string, number | null>>(`
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
    const row = statsRow || {};

    const lastLogRow = await db.queryOne<{ ran_at?: string }>(
      'SELECT ran_at FROM scrape_logs ORDER BY ran_at DESC LIMIT 1'
    );

    return {
      totalListings: Number(row.total_listings || 0),
      unicornMatches: Number(row.unicorn_matches || 0),
      greatMatches: Number(row.great_matches || 0),
      avgRent: Math.round(Number(row.avg_rent || 0)),
      avgPeakCommuteMins: Math.round(Number(row.avg_commute || 0)),
      gatedCount: Number(row.gated_count || 0),
      poolCount: Number(row.pool_count || 0),
      directOwnerCount: Number(row.direct_owner_count || 0),
      lastScrapeTime: lastLogRow?.ran_at || null,
    };
  },

  async logScrapeRun(status: string, itemsScanned: number, itemsMatched: number, errorMessage?: string): Promise<void> {
    await db.execute(
      'INSERT INTO scrape_logs (status, items_scanned, items_matched, error_message) VALUES (?, ?, ?, ?)',
      [status, itemsScanned, itemsMatched, errorMessage || null]
    );
  },
};
