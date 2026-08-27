import { Hono } from 'hono';

export const scrapeRouter = new Hono();

let localScrapeState: {
  status: 'idle' | 'in_progress' | 'completed';
  conclusion: 'success' | 'failure' | null;
  updatedAt: string | null;
  scanned?: number;
  matched?: number;
} = {
  status: 'idle',
  conclusion: null,
  updatedAt: null,
};

scrapeRouter.get('/status', (c) => {
  return c.json(localScrapeState);
});

scrapeRouter.post('/trigger', async (c) => {
  localScrapeState = { status: 'in_progress', conclusion: null, updatedAt: new Date().toISOString() };
  try {
    const { runScrapeCycle } = await import('../../scraper/groupScraper');
    const result = await runScrapeCycle(true);
    localScrapeState = {
      status: 'completed',
      conclusion: result.status === 'success' ? 'success' : 'failure',
      updatedAt: new Date().toISOString(),
      scanned: result.scanned,
      matched: result.matched,
    };
    return c.json({
      status: result.status,
      message: result.message || `Scraped ${result.scanned} posts, found ${result.matched} matches near PTP.`,
      scanned: result.scanned,
      matched: result.matched,
    });
  } catch (err: any) {
    localScrapeState = { status: 'completed', conclusion: 'failure', updatedAt: new Date().toISOString() };
    return c.json({ status: 'error', message: err?.message || String(err) }, 500);
  }
});

scrapeRouter.post('/parse-single', async (c) => {
  try {
    const body = await c.req.json();
    const { processPost } = await import('../../scraper/groupScraper');
    const { cleanPostText } = await import('../../domain/parser/cleaner');
    const { passesAllFilters } = await import('../../domain/parser/filter');

    const rawText = body.text || '';
    const postUrl = body.postUrl || `https://www.facebook.com/groups/posts/manual_${Date.now()}`;
    const authorName = body.authorName || 'Manual Ingestion';
    const groupName = body.groupName || 'Manual Submission';
    const imageUrls = Array.isArray(body.imageUrls) ? body.imageUrls : [];

    if (!rawText || rawText.trim().length < 15) {
      return c.json({ success: false, error: 'Text too short (must be at least 15 characters)' }, 400);
    }

    const clean = cleanPostText(rawText);
    const filterResult = passesAllFilters(clean);
    if (filterResult._tag === 'err') {
      return c.json({
        success: false,
        filtered: true,
        reason: filterResult.error.message,
      }, 200);
    }

    const listing = await processPost(
      clean,
      groupName,
      authorName,
      'Just now',
      postUrl,
      new Date().toISOString(),
      undefined,
      'new',
      imageUrls
    );

    if (!listing) {
      return c.json({ success: false, error: 'Failed to process post' }, 500);
    }

    return c.json({
      success: true,
      listing,
    });
  } catch (err: any) {
    return c.json({ success: false, error: err?.message || String(err) }, 500);
  }
});

scrapeRouter.post('/seed', async (c) => {
  localScrapeState = { status: 'completed', conclusion: 'success', updatedAt: new Date().toISOString() };
  try {
    if (process.env.NODE_ENV !== 'test') {
      const { runScrapeCycle } = await import('../../scraper/groupScraper');
      runScrapeCycle(true).catch(() => {});
    }
    return c.json({
      status: 'success',
      message: 'Scrape triggered successfully.',
    });
  } catch (err: any) {
    localScrapeState = { status: 'completed', conclusion: 'failure', updatedAt: new Date().toISOString() };
    return c.json({ status: 'error', message: err?.message || String(err) }, 500);
  }
});
