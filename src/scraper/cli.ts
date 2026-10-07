import { runScrapeCycle } from './groupScraper';
import { syncTurso } from './syncTurso';

async function main() {
  console.log('🚀 Starting Facebook rental scraper...');
  const result = await runScrapeCycle(true);
  console.log('Facebook scrape result:', JSON.stringify(result, null, 2));

  console.log('📡 Synchronizing verified listings to Turso Cloud...');
  const syncedCount = await syncTurso();
  console.log(`✅ Synchronization complete: ${syncedCount} real listings pushed to Turso Cloud.`);

  process.exit(0);
}

main().catch((err) => {
  console.error('Fatal scrape error:', err);
  process.exit(1);
});
