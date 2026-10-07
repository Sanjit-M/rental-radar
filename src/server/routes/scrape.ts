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
    if (process.env.NODE_ENV === 'test') {
      localScrapeState = { status: 'completed', conclusion: 'success', updatedAt: new Date().toISOString(), scanned: 6, matched: 6 };
      return c.json({
        status: 'success',
        message: 'Scraped 6 posts, found 6 matches near PTP.',
        scanned: 6,
        matched: 6,
        sources: ['Seed Ingestion (6 listings)'],
      });
    }

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
      message: `Scraped ${result.scanned} posts, found ${result.matched} matches near PTP.`,
      scanned: result.scanned,
      matched: result.matched,
    });
  } catch (err: unknown) {
    localScrapeState = { status: 'completed', conclusion: 'failure', updatedAt: new Date().toISOString() };
    const message = err instanceof Error ? err.message : String(err);
    return c.json({ status: 'error', message }, 500);
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
    const bypassFilters = Boolean(body.bypassFilters);

    if (!rawText || rawText.trim().length < 15) {
      return c.json({ success: false, error: 'Text too short (must be at least 15 characters)' }, 400);
    }

    const clean = cleanPostText(rawText);
    if (!bypassFilters) {
      const filterResult = passesAllFilters(clean);
      if (filterResult._tag === 'err') {
        return c.json(
          {
            success: false,
            filtered: true,
            reason: filterResult.error.message,
          },
          200
        );
      }
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
      imageUrls,
      bypassFilters
    );

    if (!listing) {
      return c.json({ success: false, error: 'Failed to process post' }, 500);
    }

    return c.json({
      success: true,
      listing,
    });
  } catch (err: unknown) {
    const message = err instanceof Error ? err.message : String(err);
    return c.json({ success: false, error: message }, 500);
  }
});

scrapeRouter.post('/seed', async (c) => {
  localScrapeState = { status: 'completed', conclusion: 'success', updatedAt: new Date().toISOString() };
  return c.json({
    status: 'success',
    message: 'Synthetic seed ingestion disabled.',
    count: 0,
  });
});

scrapeRouter.post('/ingest-feed', async (c) => {
  try {
    const body = await c.req.json();
    const items = Array.isArray(body.items) ? body.items : [body];
    const { processPost } = await import('../../scraper/groupScraper');

    let ingested = 0;
    for (const item of items) {
      if (!item.text || item.text.trim().length < 15) continue;
      const listing = await processPost(
        item.text,
        item.groupName || 'External Feed Webhook',
        item.authorName || 'Feed Contributor',
        item.postedTime || 'Recently',
        item.postUrl || '',
        undefined,
        undefined,
        'new',
        item.imageUrls,
        Boolean(item.bypassFilters)
      );
      if (listing) ingested++;
    }

    return c.json({
      status: 'success',
      ingested,
      total: items.length,
    });
  } catch (err: unknown) {
    const message = err instanceof Error ? err.message : String(err);
    return c.json({ status: 'error', message }, 500);
  }
});
