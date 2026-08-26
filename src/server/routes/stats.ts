import { Hono } from 'hono';
import { listingRepository } from '../../db/repository';

export const statsRouter = new Hono();

statsRouter.get('/', (c) => {
  const stats = listingRepository.getStats();
  return c.json(stats);
});
