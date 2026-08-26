import { Hono } from 'hono';
import { listingRepository } from '../../db/repository';

export const statsRouter = new Hono();

statsRouter.get('/', async (c) => {
  try {
    const stats = await listingRepository.getStats();
    return c.json(stats);
  } catch (err: any) {
    console.error('Error fetching stats:', err);
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
      error: err.message,
    });
  }
});
