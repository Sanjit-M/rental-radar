/**
 * Browser-side API client for Rental Radar.
 *
 * Uses Effect and Schema boundary validation so all public methods return
 * `Result<T, ApiError>` values rather than throwing or rejecting on expected
 * HTTP, network, or payload-decoding failures.
 */

import { Effect, Schema } from 'effect';
import {
  type RentalListing,
  type DashboardStats,
  type UserListingStatus,
  type PaginatedListingsResponse,
  type SortBy,
  type FbGroup,
  type BangalorePlaceSummary,
  type BangaloreZone,
  BANGALORE_ZONES,
} from '../../domain/types';
import { type Result, ok, err } from '../../domain/prelude';

const API_BASE = '/api';

// ─── Domain errors ────────────────────────────────────────────────────────────

/** The API rejected the request because no valid passcode was provided. */
export class AuthRequiredError extends Error {
  readonly _tag = 'AuthRequiredError' as const;
  constructor() {
    super('Dashboard passcode required');
    this.name = 'AuthRequiredError';
  }
}

/** The API returned a non-OK, non-401 status code. */
export class ApiResponseError extends Error {
  readonly _tag = 'ApiResponseError' as const;
  constructor(
    readonly operation: string,
    readonly statusCode: number,
  ) {
    super(`API error during ${operation}: HTTP ${statusCode}`);
    this.name = 'ApiResponseError';
  }
}

/** Boundary schema decoding failed for an API payload. */
export class ApiDecodeError extends Error {
  readonly _tag = 'ApiDecodeError' as const;
  constructor(
    readonly operation: string,
    readonly detail: string,
  ) {
    super(`API schema decode error during ${operation}: ${detail}`);
    this.name = 'ApiDecodeError';
  }
}

/** An unexpected network-level failure (offline, DNS, CORS). */
export class NetworkError extends Error {
  readonly _tag = 'NetworkError' as const;
  constructor(readonly networkCause: unknown) {
    super('Network request failed');
    this.name = 'NetworkError';
    if (networkCause instanceof Error) this.cause = networkCause;
  }
}

/** Union of all expected API failure modes. */
export type ApiError =
  | AuthRequiredError
  | ApiResponseError
  | ApiDecodeError
  | NetworkError;

// ─── Typed query params & response envelopes ──────────────────────────────────

/** Query parameters accepted by the listings endpoint. */
export interface ListingQueryParams {
  readonly page?: number | undefined;
  readonly limit?: number | undefined;
  readonly minScore?: number | undefined;
  readonly maxRent?: number | undefined;
  readonly bhkType?: string | undefined;
  readonly furnishing?: string | undefined;
  readonly userStatus?: string | undefined;
  readonly recency?: string | undefined;
  readonly search?: string | undefined;
  readonly zone?: string | undefined;
  readonly sortBy?: SortBy | undefined;
}

/** Result returned by the scrape status check endpoint. */
export interface ScrapeStatusResult {
  readonly status: 'idle' | 'queued' | 'in_progress' | 'completed';
  readonly conclusion: 'success' | 'failure' | 'cancelled' | 'timed_out' | null;
  readonly runId?: number | undefined;
  readonly htmlUrl?: string | undefined;
  readonly createdAt?: string | undefined;
  readonly updatedAt?: string | undefined;
}

/** Single scrape execution telemetry log entry. */
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

/** Dashboard stats enriched with optional recent scrape run telemetry logs. */
export type DashboardStatsWithLogs = DashboardStats & {
  readonly scrapeLogs?: readonly ScrapeLogEntry[] | undefined;
};

// ─── Boundary Schemas (Effect Schema) ─────────────────────────────────────────

const FbGroupSchema = Schema.Struct({
  id: Schema.String,
  name: Schema.String,
  url: Schema.String,
  memberCount: Schema.String,
  category: Schema.String,
  enabled: Schema.Boolean,
  listingsCount: Schema.Number,
  lastScrapedAt: Schema.NullOr(Schema.String),
  createdAt: Schema.String,
  updatedAt: Schema.String,
});

const GroupsResponseSchema = Schema.Union(
  Schema.Array(FbGroupSchema),
  Schema.Struct({
    count: Schema.optional(Schema.Number),
    groups: Schema.Array(FbGroupSchema),
  }),
);

const ToggleGroupResponseSchema = Schema.Struct({
  id: Schema.String,
  enabled: Schema.Boolean,
});

const BangaloreZoneSchema = Schema.Literal(...BANGALORE_ZONES);

const BangalorePlaceSummarySchema = Schema.Struct({
  zone: BangaloreZoneSchema,
  locality: Schema.String,
  societyName: Schema.NullOr(Schema.String),
  mapsUrl: Schema.String,
  listingCount: Schema.Number,
  medianRent: Schema.NullOr(Schema.Number),
  topScore: Schema.Number,
});

const PlacesResponseSchema = Schema.Union(
  Schema.Array(BangalorePlaceSummarySchema),
  Schema.Struct({
    count: Schema.optional(Schema.Number),
    places: Schema.Array(BangalorePlaceSummarySchema),
  }),
);

const ScrapeLogEntrySchema = Schema.Struct({
  id: Schema.Number,
  runAt: Schema.String,
  groupsScanned: Schema.Number,
  itemsScanned: Schema.Number,
  itemsMatched: Schema.Number,
  status: Schema.String,
  errorMessage: Schema.NullOr(Schema.String),
  durationMs: Schema.Number,
});

const DashboardStatsSchema = Schema.Struct({
  totalListings: Schema.Number,
  unicornMatches: Schema.Number,
  greatMatches: Schema.Number,
  avgRent: Schema.Number,
  avgPeakCommuteMins: Schema.Number,
  gatedCount: Schema.Number,
  poolCount: Schema.Number,
  directOwnerCount: Schema.Number,
  lastScrapeTime: Schema.NullOr(Schema.String),
  scrapeLogs: Schema.optional(Schema.Array(ScrapeLogEntrySchema)),
});

const TriggerScrapeResponseSchema = Schema.Struct({
  status: Schema.String,
  message: Schema.String,
});

const ScrapeStatusResultSchema = Schema.Struct({
  status: Schema.Literal('idle', 'queued', 'in_progress', 'completed'),
  conclusion: Schema.NullOr(
    Schema.Literal('success', 'failure', 'cancelled', 'timed_out'),
  ),
  runId: Schema.optional(Schema.Number),
  htmlUrl: Schema.optional(Schema.String),
  createdAt: Schema.optional(Schema.String),
  updatedAt: Schema.optional(Schema.String),
});

// ─── Internal helpers ─────────────────────────────────────────────────────────

function getHeaders(): HeadersInit {
  const headers: Record<string, string> = {
    'Content-Type': 'application/json',
  };
  if (typeof localStorage !== 'undefined') {
    const passcode = localStorage.getItem('dashboard_passcode');
    if (passcode) {
      headers['x-dashboard-passcode'] = passcode;
    }
  }
  return headers;
}

function executeRequestEffect<T>(
  operation: string,
  url: string,
  init: RequestInit | undefined,
  decode: (raw: unknown) => T,
): Effect.Effect<Result<T, ApiError>> {
  return Effect.gen(function* () {
    const responseResult = yield* Effect.tryPromise({
      try: () => fetch(url, init),
      catch: (cause) => new NetworkError(cause),
    }).pipe(Effect.either);

    if (responseResult._tag === 'Left') {
      return err(responseResult.left);
    }

    const res = responseResult.right;
    if (res.status === 401) {
      return err(new AuthRequiredError());
    }
    if (!res.ok) {
      return err(new ApiResponseError(operation, res.status));
    }

    const jsonResult = yield* Effect.tryPromise({
      try: () => res.json() as Promise<unknown>,
      catch: (cause) => new NetworkError(cause),
    }).pipe(Effect.either);

    if (jsonResult._tag === 'Left') {
      return err(jsonResult.left);
    }

    const decodedResult = yield* Effect.try({
      try: () => decode(jsonResult.right),
      catch: (cause) =>
        new ApiDecodeError(
          operation,
          cause instanceof Error ? cause.message : String(cause),
        ),
    }).pipe(Effect.either);

    if (decodedResult._tag === 'Left') {
      return err(decodedResult.left);
    }

    return ok(decodedResult.right);
  });
}

function isObjectRecord(value: unknown): value is Record<string, unknown> {
  return typeof value === 'object' && value !== null;
}

function decodePaginatedListings(raw: unknown): PaginatedListingsResponse {
  if (!isObjectRecord(raw) || !Array.isArray(raw.listings)) {
    throw new Error('Expected PaginatedListingsResponse with listings array');
  }
  // SAFETY: Server listings endpoint returns canonical RentalListing domain records verified by repository schema.
  return raw as unknown as PaginatedListingsResponse;
}

function decodeSingleListing(raw: unknown): RentalListing {
  if (!isObjectRecord(raw) || typeof raw.id !== 'number') {
    throw new Error('Expected RentalListing record with numeric id');
  }
  // SAFETY: Server listing endpoint returns canonical RentalListing domain record.
  return raw as unknown as RentalListing;
}

// ─── Public API client ────────────────────────────────────────────────────────

/** Rental Radar browser-side API client. All methods return Result values via Effect. */
export const api = {
  /**
   * Fetch a paginated, filtered list of rental listings.
   *
   * @param params - Filter, pagination, and Bangalore zone query parameters.
   * @returns A Result containing the `PaginatedListingsResponse` or an `ApiError`.
   */
  async getListings(
    params: ListingQueryParams = {},
  ): Promise<Result<PaginatedListingsResponse, ApiError>> {
    const query = new URLSearchParams();
    const entries: [string, string | number | undefined][] = [
      ['page', params.page],
      ['limit', params.limit],
      ['minScore', params.minScore],
      ['maxRent', params.maxRent],
      ['bhkType', params.bhkType],
      ['furnishing', params.furnishing],
      ['userStatus', params.userStatus],
      ['recency', params.recency],
      ['search', params.search],
      ['zone', params.zone],
      ['sortBy', params.sortBy],
    ];
    for (const [key, value] of entries) {
      if (value !== undefined && value !== null && value !== '') {
        query.append(key, String(value));
      }
    }

    return Effect.runPromise(
      executeRequestEffect(
        'getListings',
        `${API_BASE}/listings?${query.toString()}`,
        { headers: getHeaders() },
        decodePaginatedListings,
      ),
    );
  },

  /**
   * Fetch a single listing by its database ID.
   *
   * @param id - Numeric database listing ID.
   * @returns A Result containing the `RentalListing` or an `ApiError`.
   */
  async getListingById(id: number): Promise<Result<RentalListing, ApiError>> {
    return Effect.runPromise(
      executeRequestEffect(
        'getListingById',
        `${API_BASE}/listings/${id}`,
        { headers: getHeaders() },
        decodeSingleListing,
      ),
    );
  },

  /**
   * Update the user-facing pipeline status for a listing.
   *
   * @param id - Numeric database listing ID.
   * @param status - Target workflow status.
   * @returns A Result containing the updated listing envelope or an `ApiError`.
   */
  async updateListingStatus(
    id: number,
    status: UserListingStatus,
  ): Promise<Result<{ success: boolean; listing: RentalListing }, ApiError>> {
    return Effect.runPromise(
      executeRequestEffect(
        'updateListingStatus',
        `${API_BASE}/listings/${id}/status`,
        {
          method: 'PATCH',
          headers: getHeaders(),
          body: JSON.stringify({ status }),
        },
        (raw) => {
          if (!isObjectRecord(raw) || typeof raw.success !== 'boolean') {
            throw new Error('Invalid status update response');
          }
          return {
            success: raw.success,
            listing: decodeSingleListing(raw.listing),
          };
        },
      ),
    );
  },

  /**
   * Fetch aggregate dashboard statistics.
   *
   * @returns A Result containing `DashboardStatsWithLogs` or an `ApiError`.
   */
  async getStats(): Promise<Result<DashboardStatsWithLogs, ApiError>> {
    const decodeStats = Schema.decodeUnknownSync(DashboardStatsSchema);
    return Effect.runPromise(
      executeRequestEffect(
        'getStats',
        `${API_BASE}/stats`,
        { headers: getHeaders() },
        (raw) => decodeStats(raw),
      ),
    );
  },

  /**
   * Fetch all discovered and configured Facebook groups.
   *
   * @returns A Result containing the count and array of `FbGroup` records.
   */
  async getGroups(): Promise<
    Result<{ count: number; groups: FbGroup[] }, ApiError>
  > {
    const decodeGroups = Schema.decodeUnknownSync(GroupsResponseSchema);
    return Effect.runPromise(
      executeRequestEffect(
        'getGroups',
        `${API_BASE}/groups`,
        { headers: getHeaders() },
        (raw) => {
          const decoded = decodeGroups(raw);
          const groups: FbGroup[] = 'groups' in decoded
            ? [...decoded.groups]
            : [...decoded];
          return {
            count: groups.length,
            groups,
          };
        },
      ),
    );
  },

  /**
   * Enable or disable scraping for a specific Facebook group.
   *
   * @param id - Group identifier.
   * @param enabled - Desired enabled state.
   * @returns A Result with the updated group ID and enabled state.
   */
  async toggleGroup(
    id: string,
    enabled: boolean,
  ): Promise<Result<{ id: string; enabled: boolean }, ApiError>> {
    const decodeToggle = Schema.decodeUnknownSync(ToggleGroupResponseSchema);
    return Effect.runPromise(
      executeRequestEffect(
        'toggleGroup',
        `${API_BASE}/groups/${encodeURIComponent(id)}`,
        {
          method: 'PATCH',
          headers: getHeaders(),
          body: JSON.stringify({ enabled }),
        },
        (raw) => decodeToggle(raw),
      ),
    );
  },

  /**
   * Fetch aggregated Bangalore neighborhoods, corridors, and gated societies.
   *
   * @param zone - Optional canonical Bangalore zone filter.
   * @returns A Result containing the count and array of `BangalorePlaceSummary` items.
   */
  async getPlaces(
    zone?: BangaloreZone | 'all',
  ): Promise<Result<{ count: number; places: BangalorePlaceSummary[] }, ApiError>> {
    const decodePlaces = Schema.decodeUnknownSync(PlacesResponseSchema);
    const query =
      zone && zone !== 'all' ? `?zone=${encodeURIComponent(zone)}` : '';
    return Effect.runPromise(
      executeRequestEffect(
        'getPlaces',
        `${API_BASE}/places${query}`,
        { headers: getHeaders() },
        (raw) => {
          const decoded = decodePlaces(raw);
          const places: BangalorePlaceSummary[] = 'places' in decoded
            ? [...decoded.places]
            : [...decoded];
          return {
            count: places.length,
            places,
          };
        },
      ),
    );
  },

  /**
   * Trigger a live Facebook group scrape.
   *
   * @returns A Result with the trigger status and message.
   */
  async triggerScrape(): Promise<
    Result<{ status: string; message: string }, ApiError>
  > {
    const decodeTrigger = Schema.decodeUnknownSync(TriggerScrapeResponseSchema);
    return Effect.runPromise(
      executeRequestEffect(
        'triggerScrape',
        `${API_BASE}/scrape/trigger`,
        {
          method: 'POST',
          headers: getHeaders(),
        },
        (raw) => decodeTrigger(raw),
      ),
    );
  },

  /**
   * Fetch runtime configuration, e.g. whether a passcode is required.
   *
   * @returns Configuration object with `requiresPasscode`.
   */
  async getConfig(): Promise<{ requiresPasscode: boolean }> {
    try {
      const res = await fetch(`${API_BASE}/config`);
      if (!res.ok) return { requiresPasscode: false };
      const data: unknown = await res.json();
      if (isObjectRecord(data) && typeof data.requiresPasscode === 'boolean') {
        return { requiresPasscode: data.requiresPasscode };
      }
      return { requiresPasscode: false };
    } catch {
      return { requiresPasscode: false };
    }
  },

  /**
   * Check current scrape / workflow execution status.
   *
   * @returns A Result with the current `ScrapeStatusResult`.
   */
  async getScrapeStatus(): Promise<Result<ScrapeStatusResult, ApiError>> {
    const decodeStatus = Schema.decodeUnknownSync(ScrapeStatusResultSchema);
    return Effect.runPromise(
      executeRequestEffect(
        'getScrapeStatus',
        `${API_BASE}/scrape/status`,
        { headers: getHeaders() },
        (raw) => decodeStatus(raw),
      ),
    );
  },

  /**
   * Instantly parse and ingest a single post text or URL.
   *
   * @param text - Raw Facebook or Telegram post text.
   * @param postUrl - Permalink URL to the post.
   * @param imageUrls - Optional image attachment URLs.
   * @param bypassFilters - Whether to bypass strict location/gender filters.
   * @returns A Result with the parsed listing or filter rejection details.
   */
  async parseSinglePost(
    text: string,
    postUrl?: string,
    imageUrls?: string[],
    bypassFilters?: boolean,
  ): Promise<
    Result<
      {
        readonly success: boolean;
        readonly listing?: RentalListing | undefined;
        readonly filtered?: boolean | undefined;
        readonly reason?: string | undefined;
        readonly error?: string | undefined;
      },
      ApiError
    >
  > {
    return Effect.runPromise(
      executeRequestEffect(
        'parseSinglePost',
        `${API_BASE}/scrape/parse-single`,
        {
          method: 'POST',
          headers: getHeaders(),
          body: JSON.stringify({ text, postUrl, imageUrls, bypassFilters }),
        },
        (raw) => {
          if (!isObjectRecord(raw) || typeof raw.success !== 'boolean') {
            throw new Error('Invalid parseSinglePost response');
          }
          return {
            success: raw.success,
            listing: isObjectRecord(raw.listing)
              ? decodeSingleListing(raw.listing)
              : undefined,
            filtered:
              typeof raw.filtered === 'boolean' ? raw.filtered : undefined,
            reason: typeof raw.reason === 'string' ? raw.reason : undefined,
            error: typeof raw.error === 'string' ? raw.error : undefined,
          };
        },
      ),
    );
  },
};
