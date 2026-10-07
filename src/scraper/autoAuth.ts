import fs from 'fs';
import path from 'path';
import os from 'os';
import { execSync } from 'child_process';
import { chromium } from 'playwright';
import { runScrapeCycle } from './groupScraper';
import { syncTurso } from './syncTurso';

const USER_DATA_DIR = path.join(os.homedir(), '.fb_rental_profile');
const STORAGE_STATE_PATH = path.join(USER_DATA_DIR, 'storageState.json');

async function main() {
  console.log('='.repeat(70));
  console.log(' 🌐 Opening Interactive Facebook Login on your screen...');
  console.log('='.repeat(70));
  console.log('A Chromium browser window has opened to facebook.com.');
  console.log('Log into your account in the browser window.');
  console.log('This script will automatically detect your login and start scraping.\n');

  if (!fs.existsSync(USER_DATA_DIR)) {
    fs.mkdirSync(USER_DATA_DIR, { recursive: true });
  }

  const browserContext = await chromium.launchPersistentContext(USER_DATA_DIR, {
    headless: false,
    viewport: { width: 1280, height: 900 },
    userAgent:
      'Mozilla/5.0 (Macintosh; Intel Mac OS X 10_15_7) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/122.0.0.0 Safari/537.36',
    args: ['--disable-blink-features=AutomationControlled', '--no-sandbox'],
  });

  const page = await browserContext.newPage();
  await page.goto('https://www.facebook.com');

  console.log('⏳ Waiting for Facebook login detection...');

  // Auto-detect login cookies every 2 seconds (up to 5 minutes)
  const startTime = Date.now();
  let loggedIn = false;

  while (Date.now() - startTime < 300000) {
    await new Promise((resolve) => setTimeout(resolve, 2000));

    try {
      const cookies = await browserContext.cookies(['https://www.facebook.com', 'https://facebook.com']);
      const hasCUser = cookies.some((c) => c.name === 'c_user');
      const hasXs = cookies.some((c) => c.name === 'xs');
      const currentUrl = page.url();

      if (hasCUser && hasXs && !currentUrl.includes('/login')) {
        console.log('\n🎉 Active Facebook session detected (c_user + xs)!');
        loggedIn = true;
        break;
      }
    } catch {
      // Browser might be navigating, retry next tick
    }
  }

  if (!loggedIn) {
    console.error('❌ Login timed out after 5 minutes.');
    await browserContext.close().catch(() => {});
    process.exit(1);
  }

  // Save session state
  await browserContext.storageState({ path: STORAGE_STATE_PATH });
  const rawState = fs.readFileSync(STORAGE_STATE_PATH, 'utf-8');
  await browserContext.close().catch(() => {});

  // Update GitHub Secret
  const base64 = Buffer.from(rawState).toString('base64');
  try {
    execSync(`echo "${base64}" | gh secret set FB_SESSION_STORAGE --repo Sanjit-M/rental-radar`, {
      stdio: 'inherit',
    });
    console.log('✅ GitHub Secret FB_SESSION_STORAGE successfully updated!');
  } catch (err: unknown) {
    console.warn('Note: Could not update GitHub secret directly:', err);
  }

  // Immediately run live Facebook scraper & sync to Turso Cloud
  console.log('\n🚀 Starting live Facebook rental scrape cycle...');
  const scrapeResult = await runScrapeCycle(true);
  console.log('Scrape Summary:', JSON.stringify(scrapeResult, null, 2));

  console.log('📡 Synchronizing verified listings to Turso Cloud...');
  const syncedCount = await syncTurso();
  console.log(`✨ Done! ${syncedCount} real listings live in Turso Cloud.`);

  process.exit(0);
}

main().catch((err) => {
  console.error('AutoAuth fatal error:', err);
  process.exit(1);
});
