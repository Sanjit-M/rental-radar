import { Hono } from 'hono';

export const scrapeRouter = new Hono();

scrapeRouter.post('/trigger', async (c) => {
  try {
    const { runScrapeCycle } = await import('../../scraper/groupScraper');
    const result = await runScrapeCycle(true);
    return c.json({
      status: result.status,
      message: result.message || `Scraped ${result.scanned} posts, found ${result.matched} matches near PTP.`,
      scanned: result.scanned,
      matched: result.matched,
    });
  } catch (err: any) {
    return c.json({ status: 'error', message: err?.message || String(err) }, 500);
  }
});

scrapeRouter.post('/seed', async (c) => {
  try {
    const { runScrapeCycle } = await import('../../scraper/groupScraper');
    const result = await runScrapeCycle(true);
    return c.json({
      status: result.status,
      count: result.matched,
      message: `Scrape complete: ${result.matched} listings matched.`,
    });
  } catch (err: any) {
    return c.json({ status: 'error', message: err?.message || String(err) }, 500);
  }
});

