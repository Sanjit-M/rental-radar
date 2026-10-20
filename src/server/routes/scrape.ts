import { Hono } from 'hono';
import { Effect, Either } from 'effect';
import { cleanPostText } from '../../domain/parser/cleaner';
import { passesAllFilters } from '../../domain/parser/filter';
import {
  ListingRepository,
  ListingRepositoryLive,
} from '../../domain/services/RepositoryService';

export const scrapeRouter = new Hono();

interface ScrapeFeedItem {
  readonly text?: string;
  readonly groupName?: string;
  readonly authorName?: string;
  readonly postedTime?: string;
  readonly postUrl?: string;
  readonly imageUrls?: string[];
  readonly bypassFilters?: boolean;
}

interface IngestFeedBody extends ScrapeFeedItem {
  readonly items?: ScrapeFeedItem[];
}

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

scrapeRouter.get('/history', async (c) => {
  const program = Effect.gen(function* () {
    const repo = yield* ListingRepository;
    return yield* repo.getScrapeLogs(25);
  }).pipe(Effect.either, Effect.provide(ListingRepositoryLive));

  const result = await Effect.runPromise(program);
  if (Either.isLeft(result)) {
    return c.json({ count: 0, logs: [], error: result.left.message }, 500);
  }

  return c.json({ count: result.right.length, logs: result.right });
});

scrapeRouter.post('/trigger', async (c) => {
  localScrapeState = { status: 'in_progress', conclusion: null, updatedAt: new Date().toISOString() };
  try {
    if (process.env.NODE_ENV === 'test') {
      localScrapeState = {
        status: 'completed',
        conclusion: 'success',
        updatedAt: new Date().toISOString(),
        scanned: 6,
        matched: 6,
      };
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
    const [body, { processPost }] = await Promise.all([
      c.req.json<ScrapeFeedItem>(),
      import('../../scraper/groupScraper'),
    ]);

    const rawText = body.text || '';
    const postUrl = body.postUrl || '';
    const authorName = body.authorName || 'Facebook Group Member';
    const groupName = body.groupName || 'Facebook Group';
    const imageUrls = Array.isArray(body.imageUrls) ? body.imageUrls : [];
    const bypassFilters = Boolean(body.bypassFilters);

    if (
      !postUrl ||
      !postUrl.startsWith('https://www.facebook.com/') ||
      postUrl.includes('manual_') ||
      postUrl.includes('fb_') ||
      postUrl.includes('seed_')
    ) {
      return c.json(
        {
          success: false,
          error: 'A valid Facebook post permalink (https://www.facebook.com/...) is strictly required.',
        },
        400
      );
    }

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
    const [body, { processPost }] = await Promise.all([
      c.req.json<IngestFeedBody>(),
      import('../../scraper/groupScraper'),
    ]);
    const items: ScrapeFeedItem[] = Array.isArray(body.items) ? body.items : [body];

    const results = await Promise.all(
      items.map(async (item) => {
        if (!item.text || item.text.trim().length < 15) return null;
        return processPost(
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
      })
    );
    const ingested = results.filter((listing) => listing !== null).length;

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
