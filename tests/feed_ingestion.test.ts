import { describe, it, expect } from 'vitest';
import { ingestSeedListings, SEED_LISTINGS_DATA } from '../src/scraper/seedIngestion';
import { runHttpScrapeCycle } from '../src/scraper/httpFeedScraper';
import { parseTelegramChannelHtml } from '../src/scraper/telegramScraper';

describe('Resilient Free Ingestion Pipeline (Zero-Auth)', () => {
  it('parses and persists verified multi-source seed listings across Kadubeesanahalli & PTP', async () => {
    expect(SEED_LISTINGS_DATA.length).toBeGreaterThanOrEqual(5);

    const seeded = await ingestSeedListings();
    expect(seeded.length).toBeGreaterThanOrEqual(5);

    for (const listing of seeded) {
      expect(listing).toHaveProperty('id');
      expect(listing).toHaveProperty('score');
      expect(listing.score).toBeGreaterThan(0);
      expect(listing.commute).toBeDefined();
      expect(listing.entities).toBeDefined();
    }
  });

  it('runs HTTP scrape cycle without requiring browser or Facebook cookies', async () => {
    const result = await runHttpScrapeCycle();
    expect(result.status).toBe('success');
    expect(result.scanned).toBeGreaterThan(0);
    expect(result.matched).toBeGreaterThan(0);
    expect(result.sources.length).toBeGreaterThanOrEqual(1);
  });

  it('correctly parses Telegram channel HTML fixture into structured posts', () => {
    const mockHtml = `
      <div class="tgme_widget_message_wrap js-widget_message_wrap" data-post="bangalore_flatmates/1234">
        <div class="tgme_widget_message_owner_name">Amit Rao</div>
        <div class="tgme_widget_message_text">Looking for male flatmate in 3BHK flat at Kadubeesanahalli near Cessna. Rent 23k deposit 46k. Attached bath, power backup, pool. Call 9876543210.</div>
        <time datetime="2026-08-27T10:00:00+00:00">10:00 AM</time>
      </div>
      </div>
      </div>
    `;

    const posts = parseTelegramChannelHtml(mockHtml, 'bangalore_flatmates');
    expect(posts.length).toBe(1);
    expect(posts[0]?.postId).toBe('tg_bangalore_flatmates_1234');
    expect(posts[0]?.authorName).toBe('Amit Rao');
    expect(posts[0]?.rawText).toContain('Kadubeesanahalli');
    expect(posts[0]?.rawText).toContain('23k');
  });
});
