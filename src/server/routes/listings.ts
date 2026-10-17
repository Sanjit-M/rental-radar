import { Hono } from 'hono';
import { Effect, Either } from 'effect';
import type { ListingQueryOptions } from '../../db/repository';
import {
  ListingRepository,
  ListingRepositoryLive,
  ListingNotFoundError,
} from '../../domain/services/RepositoryService';
import type { UserListingStatus, SortBy } from '../../domain/types';

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

export const listingsRouter = new Hono();

listingsRouter.get('/', async (c) => {
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

  const program = Effect.gen(function* () {
    const repo = yield* ListingRepository;
    return yield* repo.getPaginatedListings(options);
  }).pipe(Effect.either, Effect.provide(ListingRepositoryLive));

  const result = await Effect.runPromise(program);
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
        error: result.left.message || 'Database connection error',
        hint: 'Please ensure TURSO_DATABASE_URL and TURSO_AUTH_TOKEN are valid in your Vercel project settings.',
      },
      500
    );
  }

  return c.json(result.right);
});

listingsRouter.get('/:id', async (c) => {
  const id = parseInt(c.req.param('id'), 10);
  if (isNaN(id)) {
    return c.json({ error: 'Invalid ID' }, 400);
  }

  const program = Effect.gen(function* () {
    const repo = yield* ListingRepository;
    return yield* repo.getListingById(id);
  }).pipe(Effect.either, Effect.provide(ListingRepositoryLive));

  const result = await Effect.runPromise(program);
  if (Either.isLeft(result)) {
    if (result.left._tag === 'ListingNotFoundError') {
      return c.json({ error: 'Listing not found' }, 404);
    }
    return c.json({ error: result.left.message }, 500);
  }

  return c.json(result.right);
});

listingsRouter.patch('/:id/status', async (c) => {
  const id = parseInt(c.req.param('id'), 10);
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
  const program = Effect.gen(function* () {
    const repo = yield* ListingRepository;
    const updated = yield* repo.updateStatus(id, status);
    if (!updated) {
      return yield* Effect.fail(
        new ListingNotFoundError({ id, message: 'Failed to update status' })
      );
    }
    const listing = yield* repo.getListingById(id);
    return { success: true as const, listing };
  }).pipe(Effect.either, Effect.provide(ListingRepositoryLive));

  const result = await Effect.runPromise(program);
  if (Either.isLeft(result)) {
    if (result.left._tag === 'ListingNotFoundError') {
      return c.json({ error: result.left.message }, 404);
    }
    return c.json({ error: result.left.message }, 500);
  }

  return c.json(result.right);
});
