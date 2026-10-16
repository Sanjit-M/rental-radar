import { db } from './database';
import { deduplicateListings } from '../domain/parser/deduplicator';
import { DEFAULT_FB_GROUPS, KNOWN_SOCIETIES } from '../domain/config';
import {
  BANGALORE_ZONES,
  BangaloreZone,
  resolveBangalorePlace,
  buildSocietyMapsUrl,
  buildLandmarkMapsUrl,
  buildLocalityMapsUrl,
} from '../domain/bangalore/gazetteer';
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
  PaginatedListingsResponse,
  FbGroup,
  BangalorePlaceSummary,
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
  readonly zone?: string | undefined;
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
      return " AND raw_text NOT LIKE '%2025%' AND raw_text NOT LIKE '%2024%' AND raw_text NOT LIKE '%2023%' AND (created_at >= datetime('now', '-7 days') OR ((posted_time LIKE '%min%' OR posted_time LIKE '%hr%' OR posted_time LIKE '%hour%' OR posted_time LIKE '%day%' OR posted_time LIKE '%1 week%' OR posted_time LIKE '%just now%' OR posted_time LIKE '%Recently%') AND posted_time NOT LIKE '%8 day%' AND posted_time NOT LIKE '%9 day%' AND posted_time NOT LIKE '%10 day%' AND posted_time NOT LIKE '%11 day%' AND posted_time NOT LIKE '%12 day%' AND posted_time NOT LIKE '%13 day%' AND posted_time NOT LIKE '%14 day%' AND posted_time NOT LIKE '%2 week%' AND posted_time NOT LIKE '%3 week%' AND posted_time NOT LIKE '%4 week%' AND posted_time NOT LIKE '%month%' AND posted_time NOT LIKE '%year%'))";

    default:
      return '';
  }
}

export interface RawDatabaseRow {
  id: number;
  fb_post_id: string;
  group_id?: string | null;
  group_name: string;
  post_url: string;
  author_name: string;
  posted_time: string;
  raw_text: string;
  location: string;
  zone?: string | null;
  landmark?: string | null;
  society_maps_url?: string | null;
  landmark_maps_url?: string | null;
  locality_maps_url?: string | null;
  title?: string | null;
  summary?: string | null;
  image_urls?: string | null;
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

export interface RawFbGroupRow {
  id: string;
  name: string;
  url: string;
  member_count: string | null;
  category: string;
  enabled: number;
  listings_count: number;
  last_scraped_at: string | null;
  created_at: string;
  updated_at: string;
}

function isBangaloreZone(value: unknown): value is BangaloreZone {
  return typeof value === 'string' && (BANGALORE_ZONES as readonly string[]).includes(value);
}

/**
 * Maps a raw database row into a rich canonical `RentalListing` with resolved
 * Bangalore zone and Google Maps deep links.
 */
export function mapRowToListing(row: RawDatabaseRow): RentalListing {
  let parsedImages: string[] = [];
  if (row.image_urls) {
    try {
      parsedImages = JSON.parse(row.image_urls);
    } catch {
      parsedImages = [];
    }
  }

  const resolvedPlace = resolveBangalorePlace(
    row.raw_text,
    row.location,
    row.society_name,
    row.landmark
  );

  const societyName = row.society_name || resolvedPlace.society || null;
  const landmark = row.landmark || resolvedPlace.landmark || null;
  const locality = row.location || resolvedPlace.locality;
  const zone: BangaloreZone =
    row.zone && isBangaloreZone(row.zone) && row.zone !== 'ORR & Bellandur'
      ? row.zone
      : resolvedPlace.zone;

  const societyMapsUrl =
    row.society_maps_url ||
    (societyName ? buildSocietyMapsUrl(societyName, locality) : undefined);
  const landmarkMapsUrl =
    row.landmark_maps_url ||
    (landmark ? buildLandmarkMapsUrl(landmark, locality) : undefined);
  const localityMapsUrl =
    row.locality_maps_url || buildLocalityMapsUrl(locality);

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
    isVegetarianOnly: /veg\s*only|vegetarian\s*only/i.test(row.raw_text),
    isMaleBachelorAllowed: true,
    isFemaleOnly: /female\s*only|girls?\s*only/i.test(row.raw_text),
    isWalkingDistance: /walking\s*distance|walk\s*to\s*ptp/i.test(row.raw_text),
    // SAFETY: `furnishing` column is constrained by the INSERT schema to one of
    // the four FurnishingStatus literals. The DB is the sole write path.
    furnishing: row.furnishing as FurnishingStatus,
    isKadubeesanahalliDirect: Boolean(row.is_kadubeesanahalli_direct),
    contactPhone: row.contact_phone || null,
    societyLat: resolvedPlace.lat,
    societyLon: resolvedPlace.lon,
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
    groupId: row.group_id || undefined,
    groupName: row.group_name,
    postUrl: row.post_url,
    authorName: row.author_name || 'Facebook Member',
    postedTime: row.posted_time || 'Recently',
    rawText: row.raw_text,
    location: row.location,
    zone,
    landmark: landmark || undefined,
    societyMapsUrl,
    landmarkMapsUrl,
    localityMapsUrl,
    title: row.title || undefined,
    summary: row.summary || undefined,
    imageUrls: parsedImages.length > 0 ? parsedImages : undefined,
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
    whereSql += ' AND (raw_text LIKE ? OR society_name LIKE ? OR location LIKE ? OR landmark LIKE ? OR author_name LIKE ? OR contact_phone LIKE ?)';
    const term = `%${options.search}%`;
    params.push(term, term, term, term, term, term);
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

function computeMedian(values: number[]): number | null {
  if (values.length === 0) return null;
  const sorted = [...values].sort((a, b) => a - b);
  const mid = Math.floor(sorted.length / 2);
  if (sorted.length % 2 === 1) {
    return sorted[mid] ?? null;
  }
  const left = sorted[mid - 1] ?? 0;
  const right = sorted[mid] ?? 0;
  return Math.round((left + right) / 2);
}

/** Repository for persisting and querying rental listings, Facebook groups, and Bangalore places across Local SQLite or Turso. */
export const listingRepository = {
  async init(): Promise<void> {
    await db.initSchema();
  },

  async upsertListing(
    listing: Omit<RentalListing, 'id' | 'createdAt' | 'updatedAt'> & { createdAt?: string | undefined }
  ): Promise<RentalListing> {
    if (
      !listing.postUrl ||
      !listing.postUrl.startsWith('https://www.facebook.com/') ||
      listing.postUrl.includes('fb_') ||
      listing.postUrl.includes('seed_') ||
      listing.postUrl.includes('manual_') ||
      listing.fbPostId.includes('seed') ||
      listing.groupName.toLowerCase().includes('seed')
    ) {
      throw new Error(
        `Invariant Violation: Synthetic, seed, or broken listings are strictly forbidden. Listing must have an authentic Facebook post permalink. Got: ${listing.postUrl}`
      );
    }

    const resolvedPlace = resolveBangalorePlace(
      listing.rawText,
      listing.location,
      listing.entities.societyName,
      listing.landmark || listing.entities.landmark
    );

    const zone = listing.zone || resolvedPlace.zone;
    const societyMapsUrl = listing.societyMapsUrl || resolvedPlace.societyMapsUrl || null;
    const landmarkMapsUrl = listing.landmarkMapsUrl || resolvedPlace.landmarkMapsUrl || null;
    const localityMapsUrl = listing.localityMapsUrl || resolvedPlace.localityMapsUrl;

    const upsertSql = `
      INSERT INTO listings (
        fb_post_id, group_id, group_name, post_url, author_name, posted_time, raw_text,
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
        ?, ?, ?, ?, ?, ?, ?,
        ?, ?, ?, ?, ?, ?,
        ?, ?, ?,
        ?, ?, ?, ?,
        ?, ?, ?,
        ?, ?, ?,
        ?, ?, ?,
        ?, ?, ?, ?,
        ?, ?, ?, ?,
        ?, coalesce(?, datetime('now')), datetime('now')
      )
      ON CONFLICT(fb_post_id) DO UPDATE SET
        group_id=coalesce(excluded.group_id, listings.group_id),
        author_name=excluded.author_name,
        posted_time=excluded.posted_time,
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
        inbound_mins=excluded.inbound_mins,
        outbound_mins=excluded.outbound_mins,
        two_way_avg_peak_mins=excluded.two_way_avg_peak_mins,
        updated_at=datetime('now');
    `;

    const imagesToSave = listing.imageUrls || listing.entities.imageUrls || [];

    await db.execute(upsertSql, [
      listing.fbPostId,
      listing.groupId || null,
      listing.groupName,
      listing.postUrl,
      listing.authorName,
      listing.postedTime || 'Recently',
      listing.rawText,
      listing.location,
      zone,
      listing.landmark || listing.entities.landmark || null,
      societyMapsUrl,
      landmarkMapsUrl,
      localityMapsUrl,
      listing.title || null,
      listing.summary || null,
      JSON.stringify(imagesToSave),
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
      listing.createdAt || null,
    ]);

    const row = await db.queryOne<RawDatabaseRow>('SELECT * FROM listings WHERE fb_post_id = ?', [listing.fbPostId]);
    if (!row) throw new Error('Failed to retrieve upserted listing');
    return mapRowToListing(row);
  },

  async deleteListingsOlderThan(days: number = 7): Promise<number> {
    const res = await db.execute(
      `DELETE FROM listings WHERE created_at < datetime('now', '-' || ? || ' days')`,
      [days]
    );
    return res.changes;
  },

  async getPaginatedListings(options: ListingQueryOptions = {}): Promise<PaginatedListingsResponse> {
    // 0. Continuous 7-Day Auto-Retention Cleanup per Q3 (Option A)
    await this.deleteListingsOlderThan(7).catch(() => {});

    const page = Math.max(1, typeof options.page === 'number' && !isNaN(options.page) ? options.page : 1);
    const limit = Math.min(100, Math.max(1, typeof options.limit === 'number' && !isNaN(options.limit) ? options.limit : 12));
    const offset = (page - 1) * limit;

    const { whereSql, params } = buildWhereClause(options);
    const orderSql = buildOrderClause(options.sortBy);

    // 1. Query all matching rows
    const dataSql = `SELECT * FROM listings${whereSql}${orderSql}`;
    const rows = await db.query<RawDatabaseRow>(dataSql, params);
    let allRawListings = rows.map(mapRowToListing);

    // Filter by resolved BangaloreZone if requested
    if (options.zone && options.zone !== 'all') {
      allRawListings = allRawListings.filter((l) => l.zone === options.zone);
    }

    // 2. Deduplicate canonical listings across full dataset
    const allCanonicalListings = deduplicateListings(allRawListings);
    const totalCount = allCanonicalListings.length;
    const totalPages = totalCount === 0 ? 0 : Math.ceil(totalCount / limit);
    const hasMore = page < totalPages;

    // 3. Slice for the requested page
    const listings = allCanonicalListings.slice(offset, offset + limit);

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
    await this.deleteListingsOlderThan(7).catch(() => {});
    const { whereSql, params } = buildWhereClause(options);
    const orderSql = buildOrderClause(options.sortBy);

    let sql = `SELECT * FROM listings${whereSql}${orderSql}`;
    const queryParams = [...params];

    if (options.limit !== undefined && (!options.zone || options.zone === 'all')) {
      sql += ' LIMIT ?';
      queryParams.push(options.limit);
      if (options.page !== undefined && options.page > 1) {
        sql += ' OFFSET ?';
        queryParams.push((options.page - 1) * options.limit);
      }
    }

    const rows = await db.query<RawDatabaseRow>(sql, queryParams);
    let mapped = rows.map(mapRowToListing);
    if (options.zone && options.zone !== 'all') {
      mapped = mapped.filter((l) => l.zone === options.zone);
      if (options.limit !== undefined) {
        const offset = options.page && options.page > 1 ? (options.page - 1) * options.limit : 0;
        mapped = mapped.slice(offset, offset + options.limit);
      }
    }
    return mapped;
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
    await this.deleteListingsOlderThan(7).catch(() => {});
    const statsRow = await db.queryOne<Record<string, number | null>>(`
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

  async logScrapeRun(
    status: string,
    itemsScanned: number,
    itemsMatched: number,
    errorMessage?: string,
    groupsScanned: number = 0
  ): Promise<void> {
    await db.execute(
      'INSERT INTO scrape_logs (status, items_scanned, items_matched, groups_scanned, error_message) VALUES (?, ?, ?, ?, ?)',
      [status, itemsScanned, itemsMatched, groupsScanned, errorMessage || null]
    );
  },

  async getGroups(): Promise<FbGroup[]> {
    let rows = await db.query<RawFbGroupRow>('SELECT * FROM fb_groups ORDER BY listings_count DESC, name ASC');

    if (rows.length === 0) {
      for (const seed of DEFAULT_FB_GROUPS) {
        try {
          await db.execute(
            `INSERT OR IGNORE INTO fb_groups (id, name, url, member_count, category, enabled, listings_count, created_at, updated_at)
             VALUES (?, ?, ?, ?, ?, 1, 0, datetime('now'), datetime('now'))`,
            [seed.id, seed.name, seed.url, seed.memberCount, seed.category]
          );
        } catch {
          // Ignore duplicate seed errors
        }
      }
      rows = await db.query<RawFbGroupRow>('SELECT * FROM fb_groups ORDER BY listings_count DESC, name ASC');
    }

    const groupCounts = await db.query<{ group_id: string | null; group_name: string; cnt: number }>(
      'SELECT group_id, group_name, COUNT(*) as cnt FROM listings GROUP BY group_id, group_name'
    );

    return rows.map((r) => {
      const cleanGroupName = r.name.replace(/\s*\(\d+k\)/i, '').toLowerCase().trim();
      let liveCount = 0;
      for (const gc of groupCounts) {
        if (
          (gc.group_id && gc.group_id === r.id) ||
          gc.group_name === r.name ||
          (cleanGroupName.length > 5 && gc.group_name.toLowerCase().includes(cleanGroupName))
        ) {
          liveCount += Number(gc.cnt || 0);
        }
      }

      return {
        id: r.id,
        name: r.name,
        url: r.url,
        memberCount: r.member_count || '',
        category: r.category || 'Rental & Flatmates',
        enabled: Boolean(r.enabled),
        listingsCount: Math.max(Number(r.listings_count || 0), liveCount),
        lastScrapedAt: r.last_scraped_at || null,
        createdAt: r.created_at,
        updatedAt: r.updated_at,
      };
    });
  },

  async upsertGroup(group: Omit<FbGroup, 'createdAt' | 'updatedAt'>): Promise<FbGroup> {
    await db.execute(
      `INSERT INTO fb_groups (id, name, url, member_count, category, enabled, listings_count, last_scraped_at, created_at, updated_at)
       VALUES (?, ?, ?, ?, ?, ?, ?, ?, datetime('now'), datetime('now'))
       ON CONFLICT(id) DO UPDATE SET
         name=excluded.name,
         url=excluded.url,
         member_count=excluded.member_count,
         category=excluded.category,
         enabled=excluded.enabled,
         listings_count=excluded.listings_count,
         last_scraped_at=coalesce(excluded.last_scraped_at, fb_groups.last_scraped_at),
         updated_at=datetime('now')`,
      [
        group.id,
        group.name,
        group.url,
        group.memberCount || '',
        group.category || 'Rental & Flatmates',
        group.enabled ? 1 : 0,
        group.listingsCount || 0,
        group.lastScrapedAt || null,
      ]
    );

    const row = await db.queryOne<RawFbGroupRow>('SELECT * FROM fb_groups WHERE id = ?', [group.id]);
    if (!row) {
      throw new Error(`Failed to retrieve upserted group ${group.id}`);
    }
    return {
      id: row.id,
      name: row.name,
      url: row.url,
      memberCount: row.member_count || '',
      category: row.category || 'Rental & Flatmates',
      enabled: Boolean(row.enabled),
      listingsCount: Number(row.listings_count || 0),
      lastScrapedAt: row.last_scraped_at || null,
      createdAt: row.created_at,
      updatedAt: row.updated_at,
    };
  },

  async toggleGroup(id: string, enabled: boolean): Promise<boolean> {
    // Ensure seeded first if table is empty
    const existing = await db.queryOne<RawFbGroupRow>('SELECT id FROM fb_groups WHERE id = ?', [id]);
    if (!existing) {
      await this.getGroups();
    }
    const res = await db.execute(
      `UPDATE fb_groups SET enabled = ?, updated_at = datetime('now') WHERE id = ?`,
      [enabled ? 1 : 0, id]
    );
    return res.changes > 0;
  },

  async getPlacesDirectory(): Promise<BangalorePlaceSummary[]> {
    const rows = await db.query<RawDatabaseRow>('SELECT * FROM listings ORDER BY score DESC');
    const listings = deduplicateListings(rows.map(mapRowToListing));

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

    for (const listing of listings) {
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

    // Supplement with verified gated societies from the gazetteer so the directory is always rich
    for (const society of Object.values(KNOWN_SOCIETIES)) {
      const zone = society.zone || 'ORR & Bellandur';
      const locality = society.locality || 'Kadubeesanahalli';
      const key = `${zone}::${locality.toLowerCase()}::${society.name.toLowerCase()}`;
      if (!buckets.has(key)) {
        buckets.set(key, {
          zone,
          locality,
          societyName: society.name,
          mapsUrl: buildSocietyMapsUrl(society.name, locality),
          rents: [],
          topScore: 85,
          count: 0,
        });
      }
    }

    return Array.from(buckets.values())
      .map((b) => ({
        zone: b.zone,
        locality: b.locality,
        societyName: b.societyName,
        mapsUrl: b.mapsUrl,
        listingCount: b.count,
        medianRent: computeMedian(b.rents),
        topScore: b.topScore,
      }))
      .sort((a, b) => b.listingCount - a.listingCount || b.topScore - a.topScore);
  },
};
