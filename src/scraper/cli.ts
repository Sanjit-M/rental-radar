import { runScrapeCycle } from './groupScraper';

async function main() {
  console.log('🚀 Starting manual rental scrape cycle...');
  const result = await runScrapeCycle(true);
  console.log('Scrape result:', JSON.stringify(result, null, 2));
  process.exit(0);
}

main().catch((err) => {
  console.error('Fatal scrape error:', err);
  process.exit(1);
});
