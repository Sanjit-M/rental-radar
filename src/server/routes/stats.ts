import { Hono } from 'hono';
import { listingRepository } from '../../db/repository';

export const statsRouter = new Hono();

statsRouter.get('/', async (c) => {
  const stats = await listingRepository.getStats();
  return c.json(stats);
});
