import { Hono } from 'hono';
import { Effect, Either } from 'effect';
import {
  ListingRepository,
  ListingRepositoryLive,
} from '../../domain/services/RepositoryService';

export const statsRouter = new Hono();

statsRouter.get('/', async (c) => {
  const program = Effect.gen(function* () {
    const repo = yield* ListingRepository;
    return yield* repo.getStats();
  }).pipe(Effect.either, Effect.provide(ListingRepositoryLive));

  const result = await Effect.runPromise(program);
  if (Either.isLeft(result)) {
    return c.json({
      totalListings: 0,
      unicornMatches: 0,
      greatMatches: 0,
      avgRent: 0,
      avgPeakCommuteMins: 0,
      gatedCount: 0,
      poolCount: 0,
      directOwnerCount: 0,
      lastScrapeTime: null,
      error: result.left.message,
    });
  }

  return c.json(result.right);
});
