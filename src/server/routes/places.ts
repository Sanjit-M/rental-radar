import { Hono } from 'hono';
import { Effect, Either } from 'effect';
import {
  ListingRepository,
  ListingRepositoryLive,
} from '../../domain/services/RepositoryService';

export const placesRouter = new Hono();

placesRouter.get('/', async (c) => {
  const zoneFilter = c.req.query('zone');

  const program = Effect.gen(function* () {
    const repo = yield* ListingRepository;
    const places = yield* repo.getPlacesDirectory();
    if (zoneFilter && zoneFilter !== 'all' && zoneFilter !== 'All') {
      return places.filter((p) => p.zone.toLowerCase() === zoneFilter.toLowerCase());
    }
    return places;
  }).pipe(Effect.either, Effect.provide(ListingRepositoryLive));

  const result = await Effect.runPromise(program);
  if (Either.isLeft(result)) {
    return c.json(
      { error: result.left.message || 'Failed to fetch places directory', places: [] },
      500
    );
  }

  return c.json(result.right);
});
