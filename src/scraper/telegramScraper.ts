import { ScrapedPost } from '../domain/types';

export const TELEGRAM_RENTAL_CHANNELS = [
  'bangalorerental',
  'bangalore_flatmates',
  'bangaloreproperties',
  'bangalorerealestate',
  'flatmates_bangalore',
  'blr_flats',
];

/**
 * Scrapes public messages from curated Bangalore Telegram rental channels.
 * Uses the open public web preview protocol (https://t.me/s/<channel>).
 *
 * @returns Array of ScrapedPost records from Telegram channels.
 */
export async function scrapePublicTelegramChannels(): Promise<ScrapedPost[]> {
  const posts: ScrapedPost[] = [];

  for (const channel of TELEGRAM_RENTAL_CHANNELS) {
    try {
      const url = `https://t.me/s/${channel}`;
      const response = await fetch(url, {
        headers: {
          'User-Agent':
            'Mozilla/5.0 (Macintosh; Intel Mac OS X 10_15_7) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/122.0.0.0 Safari/537.36',
          Accept: 'text/html,application/xhtml+xml,application/xml;q=0.9,*/*;q=0.8',
          'Accept-Language': 'en-US,en;q=0.9',
        },
      });

      if (!response.ok) {
        continue;
      }

      const html = await response.text();
      const channelPosts = parseTelegramChannelHtml(html, channel);
      posts.push(...channelPosts);
    } catch (err: any) {
      console.warn(`⚠️ [Telegram] Error scraping channel @${channel}:`, err?.message || String(err));
    }
  }

  return posts;
}

/**
 * Parses raw Telegram public channel HTML into ScrapedPost records.
 *
 * @param html - Raw HTML from https://t.me/s/<channel>.
 * @param channelName - Telegram channel slug.
 * @returns Parsed ScrapedPost array.
 */
export function parseTelegramChannelHtml(html: string, channelName: string): ScrapedPost[] {
  const posts: ScrapedPost[] = [];

  // Match message wraps: <div class="tgme_widget_message_wrap ... data-post="channel/123" ...
  const messageWrapRegex = /<div[^>]*class="[^"]*tgme_widget_message_wrap[^"]*"[^>]*>([\s\S]*?)<\/div>\s*<\/div>\s*<\/div>/g;
  let wrapMatch;

  while ((wrapMatch = messageWrapRegex.exec(html)) !== null) {
    const blockHtml = wrapMatch[0];

    // Extract Post ID / URL
    const postAttrMatch = blockHtml.match(/data-post="([^"]+)"/);
    const postSlug: string = (postAttrMatch && postAttrMatch[1]) ? postAttrMatch[1] : `${channelName}_${Date.now()}`;
    const postUrl = `https://t.me/${postSlug}`;
    const postId = `tg_${postSlug.replace(/\//g, '_')}`;

    // Extract Message Text
    const textMatch = blockHtml.match(/<div[^>]*class="[^"]*tgme_widget_message_text[^"]*"[^>]*>([\s\S]*?)<\/div>/);
    if (!textMatch || !textMatch[1]) {
      continue;
    }

    // Clean HTML tags and br entities from text
    const rawText = textMatch[1]
      .replace(/<br\s*\/?>/gi, '\n')
      .replace(/<[^>]+>/g, '')
      .replace(/&amp;/g, '&')
      .replace(/&lt;/g, '<')
      .replace(/&gt;/g, '>')
      .replace(/&quot;/g, '"')
      .replace(/&#39;/g, "'")
      .trim();

    if (!rawText || rawText.length < 15) {
      continue;
    }

    // Extract Datetime
    const timeMatch = blockHtml.match(/<time[^>]*datetime="([^"]+)"[^>]*>([^<]*)<\/time>/);
    let postedTimeStr = 'Just now';
    if (timeMatch && timeMatch[1]) {
      const parsedDate = new Date(timeMatch[1]);
      if (!isNaN(parsedDate.getTime())) {
        postedTimeStr =
          parsedDate.toLocaleString('en-IN', {
            timeZone: 'Asia/Kolkata',
            day: '2-digit',
            month: 'short',
            year: 'numeric',
            hour: '2-digit',
            minute: '2-digit',
            hour12: true,
          }) + ' IST';
      }
    }

    // Extract Author Name / Channel Name
    const authorMatch = blockHtml.match(/<div[^>]*class="[^"]*tgme_widget_message_owner_name[^"]*"[^>]*>([^<]+)<\/div>/);
    const authorName = (authorMatch && authorMatch[1]) ? authorMatch[1].trim() : `Telegram @${channelName}`;

    // Extract photo attachments
    const imageUrls: string[] = [];
    const photoMatch = blockHtml.match(/tgme_widget_message_photo_wrap[^"]*"[^>]*style="[^"]*background-image:\s*url\(['"]?([^'")]+)['"]?\)/i);
    if (photoMatch && photoMatch[1]) {
      imageUrls.push(photoMatch[1]);
    }

    posts.push({
      postId,
      postUrl,
      authorName,
      postedTime: postedTimeStr,
      rawText,
      groupName: `Telegram @${channelName}`,
      imageUrls: imageUrls.length > 0 ? imageUrls : undefined,
    });
  }

  return posts;
}
