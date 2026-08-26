/**
 * Browser-side API client for Rental Radar.
 *
 * All public methods return `Result<T, ApiError>` so callers handle failures
 * as values rather than catching thrown exceptions. Network defects that cannot
 * be classified (e.g. offline) propagate as `NetworkError`.
 */

import {
  RentalListing,
  DashboardStats,
  UserListingStatus,
  PaginatedListingsResponse,
  SortBy,
} from '../../domain/types';
import { Result, ok, err } from '../../domain/prelude';

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

/** An unexpected network-level failure (offline, DNS, CORS). These are defects. */
export class NetworkError extends Error {
  readonly _tag = 'NetworkError' as const;
  constructor(readonly networkCause: unknown) {
    super('Network request failed');
    this.name = 'NetworkError';
    if (networkCause instanceof Error) this.cause = networkCause;
  }
}

/** Union of all expected API failure modes. */
export type ApiError = AuthRequiredError | ApiResponseError | NetworkError;

// ─── Typed query params ────────────────────────────────────────────────────────

/** Query parameters accepted by the listings endpoint. */
export interface ListingQueryParams {
  readonly page?: number;
  readonly limit?: number;
  readonly minScore?: number;
  readonly maxRent?: number;
  readonly bhkType?: string;
  readonly furnishing?: string;
  readonly userStatus?: string;
  readonly recency?: string;
  readonly search?: string;
  readonly sortBy?: SortBy;
}

// ─── Internal helpers ─────────────────────────────────────────────────────────

function getHeaders(): HeadersInit {
  const headers: Record<string, string> = {
    'Content-Type': 'application/json',
  };
  const passcode = localStorage.getItem('dashboard_passcode');
  if (passcode) {
    headers['x-dashboard-passcode'] = passcode;
  }
  return headers;
}

async function classifyResponse(
  res: Response,
  operation: string,
): Promise<Result<Response, AuthRequiredError | ApiResponseError>> {
  if (res.status === 401) return err(new AuthRequiredError());
  if (!res.ok) return err(new ApiResponseError(operation, res.status));
  return ok(res);
}

// ─── Public API client ────────────────────────────────────────────────────────

/** Rental Radar browser-side API client. All methods return Result values. */
export const api = {
  /** Fetch a paginated, filtered list of rental listings. */
  async getListings(
    params: ListingQueryParams = {},
  ): Promise<Result<PaginatedListingsResponse, ApiError>> {
    const query = new URLSearchParams();
    const entries = Object.entries(params) as [string, string | number | undefined][];
    for (const [key, value] of entries) {
      if (value !== undefined && value !== null && value !== '') {
        query.append(key, String(value));
      }
    }
    try {
      const res = await fetch(`${API_BASE}/listings?${query.toString()}`, {
        headers: getHeaders(),
      });
      const checked = await classifyResponse(res, 'getListings');
      if (checked._tag === 'err') return checked;
      return ok(await checked.value.json() as PaginatedListingsResponse);
    } catch (cause) {
      return err(new NetworkError(cause));
    }
  },

  /** Fetch a single listing by its database ID. */
  async getListingById(
    id: number,
  ): Promise<Result<RentalListing, ApiError>> {
    try {
      const res = await fetch(`${API_BASE}/listings/${id}`, {
        headers: getHeaders(),
      });
      const checked = await classifyResponse(res, 'getListingById');
      if (checked._tag === 'err') return checked;
      return ok(await checked.value.json() as RentalListing);
    } catch (cause) {
      return err(new NetworkError(cause));
    }
  },

  /** Update the user-facing status for a listing. */
  async updateListingStatus(
    id: number,
    status: UserListingStatus,
  ): Promise<Result<{ success: boolean; listing: RentalListing }, ApiError>> {
    try {
      const res = await fetch(`${API_BASE}/listings/${id}/status`, {
        method: 'PATCH',
        headers: getHeaders(),
        body: JSON.stringify({ status }),
      });
      const checked = await classifyResponse(res, 'updateListingStatus');
      if (checked._tag === 'err') return checked;
      return ok(await checked.value.json() as { success: boolean; listing: RentalListing });
    } catch (cause) {
      return err(new NetworkError(cause));
    }
  },

  /** Fetch aggregate dashboard statistics. */
  async getStats(): Promise<Result<DashboardStats, ApiError>> {
    try {
      const res = await fetch(`${API_BASE}/stats`, { headers: getHeaders() });
      const checked = await classifyResponse(res, 'getStats');
      if (checked._tag === 'err') return checked;
      return ok(await checked.value.json() as DashboardStats);
    } catch (cause) {
      return err(new NetworkError(cause));
    }
  },

  /** Trigger a live Facebook group scrape. */
  async triggerScrape(): Promise<Result<{ status: string; message: string }, ApiError>> {
    try {
      const res = await fetch(`${API_BASE}/scrape/trigger`, {
        method: 'POST',
        headers: getHeaders(),
      });
      const checked = await classifyResponse(res, 'triggerScrape');
      if (checked._tag === 'err') return checked;
      return ok(await checked.value.json() as { status: string; message: string });
    } catch (cause) {
      return err(new NetworkError(cause));
    }
  },

  /** Fetch runtime configuration, e.g. whether a passcode is required. */
  async getConfig(): Promise<{ requiresPasscode: boolean }> {
    // getConfig is always safe to call and returns a default on failure.
    try {
      const res = await fetch(`${API_BASE}/config`);
      if (!res.ok) return { requiresPasscode: false };
      return res.json() as Promise<{ requiresPasscode: boolean }>;
    } catch {
      return { requiresPasscode: false };
    }
  },
};
