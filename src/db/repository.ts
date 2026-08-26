import { db } from './database';
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
  makeINR,
  makeKilometers,
  makeMinutes,
  makeFbPostId,
} from '../domain/types';

/** Options for filtering and sorting rental listings. */
export interface ListingQueryOptions {
  readonly minScore?: number;
  readonly maxRent?: number;
  readonly bhkType?: string;
  readonly furnishing?: string;
  readonly userStatus?: string;
  readonly search?: string;
  readonly sortBy?: 'score_desc' | 'rent_asc' | 'commute_asc' | 'newest';
}

interface RawDatabaseRow {
  id: number;
  fb_post_id: string;
  group_name: string;
  post_url: string;
  author_name: string;
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
    rent: row.rent !== null ? makeINR(row.rent) : null,
    deposit: row.deposit !== null ? makeINR(row.deposit) : null,
    isBrokerage: Boolean(row.is_brokerage),
    isGatedSociety: Boolean(row.is_gated_society),
    societyName: row.society_name || null,
    hasSwimmingPool: Boolean(row.has_swimming_pool),
    hasPowerBackup: Boolean(row.has_power_backup),
    hasAttachedWashroom: Boolean(row.has_attached_washroom),
    hasBalcony: Boolean(row.has_balcony),
    furnishing: row.furnishing as FurnishingStatus,
    isKadubeesanahalliDirect: Boolean(row.is_kadubeesanahalli_direct),
    contactPhone: row.contact_phone || null,
  };

  const commute: CommuteWindow = {
    distanceKm: makeKilometers(row.distance_km),
    inboundMins: makeMinutes(row.inbound_mins),
    outboundMins: makeMinutes(row.outbound_mins),
    twoWayAvgPeakMins: makeMinutes(row.two_way_avg_peak_mins),
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
      furnished: 0,
      panathurBypass: 0,
      commute: 0,
    };
  }

  // SAFETY: ID is populated by autoincrement primary key in SQLite.
  const id = row.id as ListingId;
  const fbPostId = makeFbPostId(row.fb_post_id);

  return {
    id,
    fbPostId,
    groupName: row.group_name,
    postUrl: row.post_url,
    authorName: row.author_name,
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

/** Repository for persisting and querying rental listings. */
export const listingRepository = {
  /**
   * Inserts or updates a rental listing identified by fb_post_id.
   *
   * @param listing - Domain listing payload without generated IDs.
   * @returns Persisted RentalListing domain entity.
   */
  upsertListing(listing: Omit<RentalListing, 'id' | 'createdAt' | 'updatedAt'>): RentalListing {
    const upsertSql = `
      INSERT INTO listings (
        fb_post_id, group_name, post_url, author_name, raw_text,
        location, bhk_type, rent, deposit, is_brokerage,
        is_gated_society, society_name, has_swimming_pool,
        has_power_backup, has_attached_washroom, has_balcony,
        furnishing, is_kadubeesanahalli_direct, contact_phone,
        distance_km, inbound_mins, outbound_mins, two_way_avg_peak_mins,
        has_panathur_underpass_bottleneck, score, score_breakdown, tier,
        user_status, updated_at
      ) VALUES (
        ?, ?, ?, ?, ?,
        ?, ?, ?, ?, ?,
        ?, ?, ?,
        ?, ?, ?,
        ?, ?, ?,
        ?, ?, ?, ?,
        ?, ?, ?, ?,
        ?, datetime('now')
      )
      ON CONFLICT(fb_post_id) DO UPDATE SET
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

    const stmt = db.prepare(upsertSql);
    stmt.run(
      listing.fbPostId,
      listing.groupName,
      listing.postUrl,
      listing.authorName,
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
      listing.userStatus || 'new'
    );

    const getStmt = db.prepare('SELECT * FROM listings WHERE fb_post_id = ?');
    const row = getStmt.get(listing.fbPostId) as RawDatabaseRow;
    return mapRowToListing(row);
  },

  /**
   * Retrieves filtered and sorted listings.
   *
   * @param options - Query filters and sorting parameters.
   * @returns Array of matching RentalListing domain entities.
   */
  getListings(options: ListingQueryOptions = {}): RentalListing[] {
    let sql = 'SELECT * FROM listings WHERE 1=1';
    const params: (string | number)[] = [];

    if (options.minScore !== undefined) {
      sql += ' AND score >= ?';
      params.push(options.minScore);
    }

    if (options.maxRent !== undefined) {
      sql += ' AND (rent <= ? OR rent IS NULL)';
      params.push(options.maxRent);
    }

    if (options.bhkType && options.bhkType !== 'all') {
      sql += ' AND bhk_type LIKE ?';
      params.push(`%${options.bhkType}%`);
    }

    if (options.furnishing && options.furnishing !== 'all') {
      sql += ' AND furnishing = ?';
      params.push(options.furnishing);
    }

    if (options.userStatus && options.userStatus !== 'all') {
      sql += ' AND user_status = ?';
      params.push(options.userStatus);
    }

    if (options.search) {
      sql += ' AND (raw_text LIKE ? OR society_name LIKE ? OR location LIKE ?)';
      const term = `%${options.search}%`;
      params.push(term, term, term);
    }

    switch (options.sortBy) {
      case 'rent_asc':
        sql += ' ORDER BY CASE WHEN rent IS NULL THEN 999999 ELSE rent END ASC';
        break;
      case 'commute_asc':
        sql += ' ORDER BY two_way_avg_peak_mins ASC';
        break;
      case 'newest':
        sql += ' ORDER BY created_at DESC';
        break;
      case 'score_desc':
      default:
        sql += ' ORDER BY score DESC, created_at DESC';
        break;
    }

    const stmt = db.prepare(sql);
    const rows = stmt.all(...params) as RawDatabaseRow[];
    return rows.map(mapRowToListing);
  },

  /**
   * Retrieves a single listing by its primary database ID.
   *
   * @param id - Internal Listing ID.
   * @returns Matching RentalListing or null.
   */
  getListingById(id: number): RentalListing | null {
    const stmt = db.prepare('SELECT * FROM listings WHERE id = ?');
    const row = stmt.get(id) as RawDatabaseRow | undefined;
    return row ? mapRowToListing(row) : null;
  },

  /**
   * Updates pipeline tracking status for a listing.
   *
   * @param id - Internal Listing ID.
   * @param status - Target UserListingStatus.
   * @returns True if record was updated.
   */
  updateStatus(id: number, status: UserListingStatus): boolean {
    const stmt = db.prepare(`
      UPDATE listings SET user_status = ?, updated_at = datetime('now') WHERE id = ?
    `);
    stmt.run(status, id);
    return true;
  },

  /**
   * Aggregates live statistical metrics for dashboard summary.
   *
   * @returns DashboardStats record.
   */
  getStats(): DashboardStats {
    const statsStmt = db.prepare(`
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
    const row = (statsStmt.get() || {}) as Record<string, number | null>;

    const lastLogStmt = db.prepare('SELECT ran_at FROM scrape_logs ORDER BY ran_at DESC LIMIT 1');
    const lastLogRow = lastLogStmt.get() as { ran_at?: string } | undefined;

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

  /**
   * Records a scrape audit log entry.
   *
   * @param status - Status of scrape run ('success', 'error', 'seed_loaded').
   * @param itemsScanned - Count of raw DOM elements scanned.
   * @param itemsMatched - Count of posts successfully passing all filters.
   * @param errorMessage - Optional error or warning message.
   */
  logScrapeRun(status: string, itemsScanned: number, itemsMatched: number, errorMessage?: string): void {
    const stmt = db.prepare(`
      INSERT INTO scrape_logs (status, items_scanned, items_matched, error_message)
      VALUES (?, ?, ?, ?)
    `);
    stmt.run(status, itemsScanned, itemsMatched, errorMessage || null);
  },
};
