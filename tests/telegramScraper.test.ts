import { describe, it, expect } from 'vitest';
import { parseTelegramChannelHtml } from '../src/scraper/telegramScraper';

describe('Telegram Public Channel Parser', () => {
  it('parses valid Telegram HTML widget message wrap into ScrapedPost', () => {
    const sampleHtml = `
      <div class="tgme_widget_message_wrap js-widget_message_wrap" data-post="bangalorerental/105">
        <div class="tgme_widget_message text_not_empty js-widget_message">
          <div class="tgme_widget_message_owner_name">Bangalore Rentals Direct</div>
          <div class="tgme_widget_message_text js-message_text">
            1 BHK available in Kadubeesanahalli near Prestige Tech Park.<br/>
            Rent: 22k, Deposit: 50k.<br/>
            Zero brokerage, male bachelor flatmate preferred.
          </div>
          <div class="tgme_widget_message_footer">
            <time datetime="2026-08-27T06:00:00+00:00">27 Aug at 11:30</time>
          </div>
        </div>
      </div>
    `;

    const posts = parseTelegramChannelHtml(sampleHtml, 'bangalorerental');
    expect(posts.length).toBe(1);
    const first = posts[0];
    expect(first).toBeDefined();
    if (first) {
      expect(first.postId).toBe('tg_bangalorerental_105');
      expect(first.postUrl).toBe('https://t.me/bangalorerental/105');
      expect(first.authorName).toBe('Bangalore Rentals Direct');
      expect(first.rawText).toContain('1 BHK available in Kadubeesanahalli');
      expect(first.groupName).toBe('Telegram @bangalorerental');
    }
  });

  it('skips short spam or empty message blocks', () => {
    const emptyHtml = `
      <div class="tgme_widget_message_wrap" data-post="bangalorerental/106">
        <div class="tgme_widget_message_text">Hi</div>
      </div>
    `;
    const posts = parseTelegramChannelHtml(emptyHtml, 'bangalorerental');
    expect(posts.length).toBe(0);
  });
});
