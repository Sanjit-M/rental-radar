import { runHttpScrapeCycle } from './httpFeedScraper';
import { runScrapeCycle } from './groupScraper';
import { hasExistingSession } from './browserSession';
import { syncTurso } from './syncTurso';

async function main() {
  console.log('🚀 Starting rental-radar ingestion cycle...');

  console.log('⚡ Running zero-auth HTTP ingestion (Telegram + Curated Corridor Seeds)...');
  const httpResult = await runHttpScrapeCycle();
  console.log('HTTP Ingestion result:', JSON.stringify(httpResult, null, 2));

  if (hasExistingSession()) {
    console.log('🌐 Facebook session detected, running Playwright group crawler...');
    const fbResult = await runScrapeCycle(true);
    console.log('Playwright scrape result:', JSON.stringify(fbResult, null, 2));
  } else {
    console.log('ℹ️ No active Facebook session found, skipping Playwright browser crawl.');
  }

  console.log('📡 Synchronizing verified listings to Turso Cloud...');
  const syncedCount = await syncTurso();
  console.log(`✅ Synchronization complete: ${syncedCount} listings pushed to Turso Cloud.`);

  process.exit(0);
}

main().catch((err) => {
  console.error('Fatal scrape error:', err);
  process.exit(1);
});
