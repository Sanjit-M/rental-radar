import { Hono } from 'hono';
import { runScrapeCycle, seedInitialData } from '../../scraper/groupScraper';

export const scrapeRouter = new Hono();

scrapeRouter.post('/trigger', async (c) => {
  try {
    const result = await runScrapeCycle(true);
    return c.json({
      status: result.status,
      message: result.message || `Scraped ${result.scanned} posts, found ${result.matched} matches near PTP.`,
      scanned: result.scanned,
      matched: result.matched,
    });
  } catch (err: any) {
    return c.json({ status: 'error', message: err.message }, 500);
  }
});

scrapeRouter.post('/seed', async (c) => {
  try {
    const count = await seedInitialData();
    return c.json({
      status: 'success',
      count,
      message: `Successfully loaded ${count} verified Kadubeesanahalli / PTP listings.`,
    });
  } catch (err: any) {
    return c.json({ status: 'error', message: err.message }, 500);
  }
});
