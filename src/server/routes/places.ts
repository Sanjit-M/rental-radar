import { Hono } from 'hono';
import { listingRepository } from '../../db/repository';

export const placesRouter = new Hono();

placesRouter.get('/', async (c) => {
  try {
    const zoneFilter = c.req.query('zone');
    const places = await listingRepository.getPlacesDirectory();
    if (zoneFilter && zoneFilter !== 'all' && zoneFilter !== 'All') {
      return c.json(places.filter((p) => p.zone.toLowerCase() === zoneFilter.toLowerCase()));
    }
    return c.json(places);
  } catch (err: unknown) {
    const message = err instanceof Error ? err.message : 'Failed to fetch places directory';
    return c.json({ error: message, places: [] }, 500);
  }
});
