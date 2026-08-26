import { Hono } from 'hono';
import { runScrapeCycle, seedInitialData } from '../../scraper/groupScraper';

export const scrapeRouter = new Hono();

scrapeRouter.post('/trigger', async (c) => {
  // Fire scrape asynchronously
  runScrapeCycle(true).catch((err) => {
    console.error('Background scrape error:', err);
  });

  return c.json({ status: 'triggered', message: 'Background scrape job started' });
});

scrapeRouter.post('/seed', async (c) => {
  const count = await seedInitialData();
  return c.json({ status: 'seeded', count, message: `Successfully seeded ${count} listings.` });
});
