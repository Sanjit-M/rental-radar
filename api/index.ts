import { Hono, type Context } from 'hono';
import { cors } from 'hono/cors';
import { Effect, Either, Layer } from 'effect';
import {
  PTP_COORDINATES,
  SCORING_CONFIG,
  TARGET_LOCATIONS,
} from '../src/domain/config';
import type { ListingQueryOptions } from '../src/db/repository';
import {
  ListingRepository,
  ListingRepositoryLive,
  GroupRepository,
  GroupRepositoryLive,
  ListingNotFoundError,
  GroupNotFoundError,
} from '../src/domain/services/RepositoryService';
import { passesAllFilters, isValidLocation, isValidBHK } from '../src/domain/parser/filter';
import { extractAllEntities } from '../src/domain/parser/extractor';
import { calculatePeakScooterCommute } from '../src/domain/commute/router';
import { computeListingScore } from '../src/domain/scorer/ratingEngine';
import { cleanPostText, generatePostId } from '../src/domain/parser/cleaner';
import { resolveBangalorePlace } from '../src/domain/bangalore/gazetteer';
import {
  type UserListingStatus,
  type BHKType,
  type SortBy,
  makeGroupId,
} from '../src/domain/types';

export const config = {
  runtime: 'edge',
};

const MainLayer = Layer.mergeAll(ListingRepositoryLive, GroupRepositoryLive);

function runEdgeEffect<A, E>(
  program: Effect.Effect<A, E, ListingRepository | GroupRepository>
): Promise<Either.Either<A, E>> {
  return Effect.runPromise(program.pipe(Effect.either, Effect.provide(MainLayer)));
}

const VALID_SORT_VALUES: readonly SortBy[] = ['score_desc', 'rent_asc', 'commute_asc', 'newest'];
const VALID_USER_STATUSES: readonly UserListingStatus[] = [
  'new',
  'interested',
  'called',
  'applied',
  'rejected',
];

function isSortBy(raw: string | undefined): raw is SortBy {
  return raw !== undefined && (VALID_SORT_VALUES as readonly string[]).includes(raw);
}

function parseSortBy(raw: string | undefined): SortBy {
  return isSortBy(raw) ? raw : 'score_desc';
}

function isUserListingStatus(raw: unknown): raw is UserListingStatus {
  return typeof raw === 'string' && (VALID_USER_STATUSES as readonly string[]).includes(raw);
}

const app = new Hono();

app.use('*', cors());

const healthHandler = (c: Context) => c.json({ status: 'ok', service: 'rental-radar-edge' });
app.get('/health', healthHandler);
app.get('/api/health', healthHandler);

const configHandler = (c: Context) =>
  c.json({
    ptpAnchor: PTP_COORDINATES,
    scoringWeights: SCORING_CONFIG,
    targetLocations: TARGET_LOCATIONS,
    requiresPasscode: false,
  });
app.get('/config', configHandler);
app.get('/api/config', configHandler);

const getListingsHandler = async (c: Context) => {
  const rawPage = c.req.query('page');
  const rawLimit = c.req.query('limit');
  const parsedPage = rawPage ? parseInt(rawPage, 10) : 1;
  const parsedLimit = rawLimit ? parseInt(rawLimit, 10) : 12;
  const page = isNaN(parsedPage) || parsedPage < 1 ? 1 : parsedPage;
  const limit = isNaN(parsedLimit) || parsedLimit < 1 ? 12 : Math.min(100, parsedLimit);

  const rawMinScore = c.req.query('minScore');
  const rawMaxRent = c.req.query('maxRent');
  const parsedMinScore = rawMinScore ? parseInt(rawMinScore, 10) : NaN;
  const parsedMaxRent = rawMaxRent ? parseInt(rawMaxRent, 10) : NaN;

  const options: ListingQueryOptions = {
    page,
    limit,
    minScore: isNaN(parsedMinScore) ? undefined : parsedMinScore,
    maxRent: isNaN(parsedMaxRent) ? undefined : parsedMaxRent,
    bhkType: c.req.query('bhkType') || undefined,
    furnishing: c.req.query('furnishing') || undefined,
    userStatus: c.req.query('userStatus') || undefined,
    recency: c.req.query('recency') || undefined,
    search: c.req.query('search') || undefined,
    zone: c.req.query('zone') || undefined,
    sortBy: parseSortBy(c.req.query('sortBy')),
  };

  const result = await runEdgeEffect(
    Effect.gen(function* () {
      const repo = yield* ListingRepository;
      return yield* repo.getPaginatedListings(options);
    })
  );

  if (Either.isLeft(result)) {
    return c.json(
      {
        count: 0,
        totalCount: 0,
        page: 1,
        limit: 12,
        totalPages: 0,
        hasMore: false,
        listings: [],
        error: result.left.message,
        hint: process.env.TURSO_DATABASE_URL
          ? undefined
          : 'Please configure TURSO_DATABASE_URL and TURSO_AUTH_TOKEN in your Vercel project environment variables.',
      },
      500
    );
  }

  return c.json(result.right);
};

app.get('/listings', getListingsHandler);
app.get('/api/listings', getListingsHandler);

const getListingByIdHandler = async (c: Context) => {
  const id = parseInt(c.req.param('id') ?? '', 10);
  if (isNaN(id)) {
    return c.json({ error: 'Invalid ID' }, 400);
  }

  const result = await runEdgeEffect(
    Effect.gen(function* () {
      const repo = yield* ListingRepository;
      return yield* repo.getListingById(id);
    })
  );

  if (Either.isLeft(result)) {
    if (result.left._tag === 'ListingNotFoundError') {
      return c.json({ error: 'Listing not found' }, 404);
    }
    return c.json({ error: result.left.message }, 500);
  }

  return c.json(result.right);
};

app.get('/listings/:id', getListingByIdHandler);
app.get('/api/listings/:id', getListingByIdHandler);

const updateStatusHandler = async (c: Context) => {
  const id = parseInt(c.req.param('id') ?? '', 10);
  if (isNaN(id)) {
    return c.json({ error: 'Invalid ID' }, 400);
  }

  let rawStatus: unknown;
  try {
    const body = await c.req.json<{ status?: unknown }>();
    rawStatus = body.status;
  } catch {
    return c.json({ error: 'Invalid request body' }, 400);
  }

  if (!isUserListingStatus(rawStatus)) {
    return c.json(
      { error: `Invalid status. Must be one of: ${VALID_USER_STATUSES.join(', ')}` },
      400
    );
  }

  const status = rawStatus;
  const result = await runEdgeEffect(
    Effect.gen(function* () {
      const repo = yield* ListingRepository;
      const updated = yield* repo.updateStatus(id, status);
      if (!updated) {
        return yield* Effect.fail(
          new ListingNotFoundError({ id, message: 'Failed to update status' })
        );
      }
      const listing = yield* repo.getListingById(id);
      return { success: true as const, listing };
    })
  );

  if (Either.isLeft(result)) {
    if (result.left._tag === 'ListingNotFoundError') {
      return c.json({ error: result.left.message }, 404);
    }
    return c.json({ error: result.left.message }, 500);
  }

  return c.json(result.right);
};

app.patch('/listings/:id/status', updateStatusHandler);
app.patch('/api/listings/:id/status', updateStatusHandler);

const statsHandler = async (c: Context) => {
  const result = await runEdgeEffect(
    Effect.gen(function* () {
      const repo = yield* ListingRepository;
      return yield* repo.getStats();
    })
  );

  if (Either.isLeft(result)) {
    return c.json({ totalListings: 0, error: result.left.message }, 500);
  }

  return c.json(result.right);
};

app.get('/stats', statsHandler);
app.get('/api/stats', statsHandler);

const getGroupsHandler = async (c: Context) => {
  const result = await runEdgeEffect(
    Effect.gen(function* () {
      const repo = yield* GroupRepository;
      return yield* repo.getGroups();
    })
  );

  if (Either.isLeft(result)) {
    return c.json({ error: result.left.message, groups: [] }, 500);
  }

  return c.json(result.right);
};

const postGroupHandler = async (c: Context) => {
  let body: {
    id?: string;
    name?: string;
    url?: string;
    memberCount?: string;
    category?: string;
    enabled?: boolean;
  };
  try {
    body = await c.req.json();
  } catch {
    return c.json({ error: 'Invalid JSON payload' }, 400);
  }

  if (!body.name || !body.url) {
    return c.json({ error: 'Both name and url are required' }, 400);
  }

  const name = body.name;
  const url = body.url;
  const id = makeGroupId(
    body.id ||
      name
        .toLowerCase()
        .replace(/[^a-z0-9]+/g, '_')
        .replace(/^_|_$/g, '')
  );

  const result = await runEdgeEffect(
    Effect.gen(function* () {
      const repo = yield* GroupRepository;
      return yield* repo.upsertGroup({
        id,
        name,
        url,
        memberCount: body.memberCount || '',
        category: body.category || 'Rental & Flatmates',
        enabled: body.enabled ?? true,
        listingsCount: 0,
        lastScrapedAt: null,
      });
    })
  );

  if (Either.isLeft(result)) {
    return c.json({ error: result.left.message }, 500);
  }

  return c.json({ success: true, group: result.right }, 201);
};

const patchGroupHandler = async (c: Context) => {
  const id = c.req.param('id');
  if (!id) {
    return c.json({ error: 'Invalid group ID' }, 400);
  }

  let requestedEnabled: boolean | undefined;
  try {
    const body = await c.req.json<{ enabled?: boolean }>();
    if (typeof body.enabled === 'boolean') {
      requestedEnabled = body.enabled;
    }
  } catch {
    // Allow empty body to toggle
  }

  const result = await runEdgeEffect(
    Effect.gen(function* () {
      const repo = yield* GroupRepository;
      let nextEnabled = requestedEnabled;
      if (nextEnabled === undefined) {
        const existingGroups = yield* repo.getGroups();
        const existing = existingGroups.find((g) => g.id === id);
        if (!existing) {
          return yield* Effect.fail(
            new GroupNotFoundError({ id, message: `Facebook group "${id}" not found` })
          );
        }
        nextEnabled = !existing.enabled;
      }

      yield* repo.toggleGroup(id, nextEnabled);
      const refreshedGroups = yield* repo.getGroups();
      const updatedGroup = refreshedGroups.find((g) => g.id === id);

      return {
        success: true as const,
        id,
        enabled: nextEnabled,
        group: updatedGroup,
      };
    })
  );

  if (Either.isLeft(result)) {
    if (result.left._tag === 'GroupNotFoundError') {
      return c.json({ error: 'Group not found' }, 404);
    }
    return c.json({ error: result.left.message }, 500);
  }

  return c.json(result.right);
};

app.get('/groups', getGroupsHandler);
app.get('/api/groups', getGroupsHandler);
app.post('/groups', postGroupHandler);
app.post('/api/groups', postGroupHandler);
app.patch('/groups/:id', patchGroupHandler);
app.patch('/api/groups/:id', patchGroupHandler);

const getPlacesHandler = async (c: Context) => {
  const zoneFilter = c.req.query('zone');

  const result = await runEdgeEffect(
    Effect.gen(function* () {
      const repo = yield* ListingRepository;
      const places = yield* repo.getPlacesDirectory();
      if (zoneFilter && zoneFilter !== 'all' && zoneFilter !== 'All') {
        return places.filter((p) => p.zone.toLowerCase() === zoneFilter.toLowerCase());
      }
      return places;
    })
  );

  if (Either.isLeft(result)) {
    return c.json({ error: result.left.message, places: [] }, 500);
  }

  return c.json(result.right);
};

app.get('/places', getPlacesHandler);
app.get('/api/places', getPlacesHandler);

interface GitHubDispatchErrorPayload {
  readonly message?: string;
}

const triggerRouteHandler = async (c: Context) => {
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
      const errorJson = (await response.json()) as GitHubDispatchErrorPayload;
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
  } catch (err: unknown) {
    const message = err instanceof Error ? err.message : String(err);
    return c.json(
      {
        status: 'error',
        message: `Failed to dispatch GitHub Actions workflow: ${message}`,
      },
      500
    );
  }
};

app.post('/scrape/trigger', triggerRouteHandler);
app.post('/api/scrape/trigger', triggerRouteHandler);
app.post('/scrape/seed', triggerRouteHandler);
app.post('/api/scrape/seed', triggerRouteHandler);

interface GitHubWorkflowRun {
  readonly id?: number;
  readonly status?: string;
  readonly conclusion?: string | null;
  readonly html_url?: string;
  readonly created_at?: string;
  readonly updated_at?: string;
}

interface GitHubWorkflowRunsPayload {
  readonly workflow_runs?: readonly GitHubWorkflowRun[];
}

const scrapeStatusHandler = async (c: Context) => {
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

    const data = (await res.json()) as GitHubWorkflowRunsPayload;
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
  } catch (err: unknown) {
    const message = err instanceof Error ? err.message : String(err);
    return c.json({
      status: 'idle',
      conclusion: null,
      error: message,
    });
  }
};

app.get('/scrape/status', scrapeStatusHandler);
app.get('/api/scrape/status', scrapeStatusHandler);

interface ParseSingleRequest {
  readonly text?: string;
  readonly postUrl?: string;
  readonly authorName?: string;
  readonly groupName?: string;
  readonly imageUrls?: unknown;
  readonly bypassFilters?: boolean;
}

const parseSingleHandler = async (c: Context) => {
  try {
    const body = await c.req.json<ParseSingleRequest>();
    const rawText = body.text || '';
    const postUrl =
      body.postUrl || `https://www.facebook.com/groups/591413389157630/posts/${Date.now()}/`;
    const authorName = body.authorName || 'Manual Ingestion';
    const groupName = body.groupName || 'Manual Submission';
    const imageUrls = Array.isArray(body.imageUrls)
      ? body.imageUrls.filter((u): u is string => typeof u === 'string')
      : [];
    const bypassFilters = Boolean(body.bypassFilters);

    if (!rawText || rawText.trim().length < 15) {
      return c.json(
        { success: false, error: 'Text too short (must be at least 15 characters)' },
        400
      );
    }

    const clean = cleanPostText(rawText);
    let location = 'Kadubeesanahalli';
    let bhkType: BHKType = '2 BHK (Shared/Full)';

    if (!bypassFilters) {
      const filterResult = passesAllFilters(clean);
      if (filterResult._tag === 'err') {
        return c.json(
          {
            success: false,
            filtered: true,
            reason: filterResult.error.message,
          },
          200
        );
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
    const resolvedPlace = resolveBangalorePlace(
      clean,
      location,
      entities.societyName,
      entities.landmark
    );
    const commute = calculatePeakScooterCommute(
      entities.societyLat,
      entities.societyLon,
      location,
      entities.isKadubeesanahalliDirect
    );
    const { score, breakdown, tier } = computeListingScore(entities, commute);
    const fbPostId = generatePostId(groupName, authorName, clean);

    const imagesToSave = entities.imageUrls ?? (imageUrls.length > 0 ? imageUrls : undefined);
    const title = `${bhkType} in ${entities.societyName || location}`;
    const summary = clean.slice(0, 250);

    const result = await runEdgeEffect(
      Effect.gen(function* () {
        const repo = yield* ListingRepository;
        return yield* repo.upsertListing({
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
          imageUrls: imagesToSave,
          bhkType,
          entities,
          commute,
          score,
          scoreBreakdown: breakdown,
          tier,
          userStatus: 'new',
        });
      })
    );

    if (Either.isLeft(result)) {
      return c.json({ success: false, error: result.left.message }, 500);
    }

    return c.json({
      success: true,
      listing: result.right,
    });
  } catch (err: unknown) {
    const message = err instanceof Error ? err.message : String(err);
    return c.json({ success: false, error: message }, 500);
  }
};

app.post('/scrape/parse-single', parseSingleHandler);
app.post('/api/scrape/parse-single', parseSingleHandler);

export default app.fetch;
