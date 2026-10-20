/**
 * Domain types and custom domain errors for Rental Radar.
 * Ambient Result, branded primitives, and defect helpers are imported from ./prelude.
 */

import {
  INR,
  Minutes,
  Kilometers,
  FbPostId,
  ListingId,
} from './prelude';
import { BangaloreZone } from './bangalore/gazetteer';

export * from './prelude';
export {
  type BangaloreZone,
  type BangaloreLocalityEntry,
  type ResolvedBangalorePlace,
  BANGALORE_ZONES,
  BANGALORE_LOCALITIES,
  buildSocietyMapsUrl,
  buildLandmarkMapsUrl,
  buildLocalityMapsUrl,
  resolveBangalorePlace,
} from './bangalore/gazetteer';

// ==========================================
// 1. Custom Domain Tagged Errors
// ==========================================

/** Custom Tagged Error for Filter Rejections */
export class FilterRejectionError extends Error {
  readonly _tag = 'FilterRejectionError' as const;

  constructor(
    readonly reason: string,
    readonly rawSample?: string
  ) {
    super(`Post filtered out: ${reason}`);
    this.name = 'FilterRejectionError';
  }
}

/** Custom Tagged Error for Entity Parsing Failures */
export class ParseEntityError extends Error {
  readonly _tag = 'ParseEntityError' as const;

  constructor(
    readonly field: string,
    readonly rawValue: string
  ) {
    super(`Failed to parse ${field} from value: "${rawValue}"`);
    this.name = 'ParseEntityError';
  }
}

// ==========================================
// 2. Domain Property & Accommodation Types
// ==========================================

/** Target accommodation configurations. */
export type BHKType =
  | '1 BHK'
  | '2 BHK (Shared/Full)'
  | '3 BHK (Shared/Full)'
  | 'Private Room / Flatmate';

/** Furnishing status of accommodation. */
export type FurnishingStatus =
  | 'Fully Furnished'
  | 'Semi-Furnished'
  | 'Unfurnished'
  | 'Unknown';

/** Pipeline workflow status for tracking interactions with owners. */
export type UserListingStatus =
  | 'new'
  | 'interested'
  | 'called'
  | 'applied'
  | 'rejected';

/** Visual badge tier mapped from rating score (supports clean v3 and legacy v2 labels). */
export type RatingTier =
  | 'Unicorn'
  | 'Prime'
  | 'Solid'
  | 'Fair'
  | '🔥 Unicorn Deal'     // 90 - 100
  | '✨ Great Match'       // 75 - 89
  | '⚡ Moderate Match'    // 55 - 74
  | '⚠️ Low Match';        // < 55

/** Sort ordering for the listings endpoint. */
export type SortBy = 'score_desc' | 'rent_asc' | 'commute_asc' | 'newest';

/** Commute metrics simulated for weekday peak hours to PTP. */
export interface CommuteWindow {
  readonly distanceKm: Kilometers;
  readonly inboundMins: Minutes;         // 11:00 AM – 1:00 PM IST (1.30x baseline)
  readonly outboundMins: Minutes;        // 4:00 PM – 6:00 PM IST (1.65x baseline)
  readonly twoWayAvgPeakMins: Minutes;   // (inbound + outbound) / 2
  readonly hasPanathurUnderpassBottleneck: boolean;
}

/** Full point-by-point scoring breakdown. */
export interface ScoringBreakdown {
  readonly base: number;                // 50 pts
  readonly rent: number;                // +20, 0, or -30
  readonly brokerage: number;           // +15 or -40
  readonly deposit: number;             // +10 or -30 (>2.2x rent)
  readonly gatedSociety: number;        // +15 or 0
  readonly swimmingPool: number;        // +15 or 0
  readonly powerBackup: number;         // +10 or -20
  readonly attachedWashroom: number;    // +10 or -15
  readonly vegetarianPenalty: number;   // -50 or 0
  readonly bachelorMatch: number;       // +10 or -30
  readonly walkProximity: number;       // +15 or 0
  readonly furnished: number;           // +5 or 0
  readonly panathurBypass: number;      // +10 or -35
  readonly commute: number;             // +20, +10, -10, or -30
}

/** Extracted property features. */
export interface ExtractedEntities {
  readonly rent: INR | null;
  readonly deposit: INR | null;
  readonly isBrokerage: boolean;
  readonly isGatedSociety: boolean;
  readonly societyName: string | null;
  readonly landmark?: string | null | undefined;
  readonly hasSwimmingPool: boolean;
  readonly hasPowerBackup: boolean;
  readonly hasAttachedWashroom: boolean;
  readonly hasBalcony: boolean;
  readonly isVegetarianOnly: boolean;
  readonly isMaleBachelorAllowed: boolean;
  readonly isFemaleOnly: boolean;
  readonly isWalkingDistance: boolean;
  readonly furnishing: FurnishingStatus;
  readonly isKadubeesanahalliDirect: boolean;
  readonly contactPhone: string | null;
  readonly societyLat?: number | undefined;
  readonly societyLon?: number | undefined;
  readonly imageUrls?: string[] | undefined;
}

/** Validated filter details. */
export interface ValidatedPostDetails {
  readonly location: string;
  readonly bhkType: BHKType;
  readonly zone?: BangaloreZone | undefined;
}

/** Complete canonical Rental Listing domain model with cross-group deduplication and Google Maps deep links. */
export interface RentalListing {
  readonly id: ListingId;
  readonly fbPostId: FbPostId;
  readonly groupId?: string | undefined;
  readonly groupName: string;
  readonly groupNames?: string[] | undefined;      // Multiple groups if cross-posted
  readonly postCount?: number | undefined;          // Number of times cross-posted
  readonly postUrl: string;
  readonly authorName: string;
  readonly postedTime: string;
  readonly rawText: string;
  readonly location: string;
  readonly zone?: BangaloreZone | undefined;
  readonly landmark?: string | null | undefined;
  readonly societyMapsUrl?: string | undefined;
  readonly landmarkMapsUrl?: string | undefined;
  readonly localityMapsUrl?: string | undefined;
  readonly title?: string | undefined;
  readonly summary?: string | undefined;
  readonly imageUrls?: string[] | undefined;
  readonly bhkType: BHKType;
  readonly entities: ExtractedEntities;
  readonly commute: CommuteWindow;
  readonly score: number;
  readonly scoreBreakdown: ScoringBreakdown;
  readonly tier: RatingTier;
  readonly userStatus: UserListingStatus;
  readonly createdAt: string;
  readonly updatedAt: string;
}

/** Discovered or configured Facebook Group source. */
export interface FbGroup {
  readonly id: string;
  readonly name: string;
  readonly url: string;
  readonly memberCount: string;
  readonly category: string;
  readonly enabled: boolean;
  readonly listingsCount: number;
  readonly lastScrapedAt: string | null;
  readonly createdAt: string;
  readonly updatedAt: string;
}

/** Aggregated Bangalore locality / society summary with Google Maps deep link. */
export interface BangalorePlaceSummary {
  readonly zone: BangaloreZone;
  readonly locality: string;
  readonly societyName: string | null;
  readonly mapsUrl: string;
  readonly listingCount: number;
  readonly medianRent: number | null;
  readonly topScore: number;
}

/** Paginated API Response Envelope */
export interface PaginatedListingsResponse {
  readonly count: number;
  readonly totalCount: number;
  readonly page: number;
  readonly limit: number;
  readonly totalPages: number;
  readonly hasMore: boolean;
  readonly listings: RentalListing[];
}

/** Record of a single scraper execution cycle from scrape_logs. */
export interface ScrapeLogEntry {
  readonly id: number;
  readonly runAt: string;
  readonly groupsScanned: number;
  readonly itemsScanned: number;
  readonly itemsMatched: number;
  readonly status: string;
  readonly errorMessage: string | null;
  readonly durationMs: number;
}

/** Aggregated Dashboard metrics. */
export interface DashboardStats {
  readonly totalListings: number;
  readonly unicornMatches: number;
  readonly greatMatches: number;
  readonly avgRent: number;
  readonly avgPeakCommuteMins: number;
  readonly gatedCount: number;
  readonly poolCount: number;
  readonly directOwnerCount: number;
  readonly lastScrapeTime: string | null;
  readonly scrapeLogs?: readonly ScrapeLogEntry[] | undefined;
}

/** Normalized Raw Scraped Post record from any source (Facebook, Telegram, etc.) */
export interface ScrapedPost {
  readonly postId: string;
  readonly postUrl: string;
  readonly authorName: string;
  readonly postedTime: string;
  readonly rawText: string;
  readonly groupName: string;
  readonly groupId?: string | undefined;
  readonly imageUrls?: string[] | undefined;
}
