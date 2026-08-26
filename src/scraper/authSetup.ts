import readline from 'readline';
import fs from 'fs';
import path from 'path';
import os from 'os';
import { execSync } from 'child_process';
import { chromium } from 'playwright';

const USER_DATA_DIR = path.join(os.homedir(), '.fb_rental_profile');
const STORAGE_STATE_PATH = path.join(USER_DATA_DIR, 'storageState.json');

function prompt(query: string): Promise<string> {
  const rl = readline.createInterface({
    input: process.stdin,
    output: process.stdout,
  });
  return new Promise((resolve) =>
    rl.question(query, (ans) => {
      rl.close();
      resolve(ans.trim());
    })
  );
}

async function main() {
  console.log('='.repeat(70));
  console.log(' 🌐 Facebook Real Account Authentication (Interactive Browser)');
  console.log('='.repeat(70));
  console.log('\n1. A Chromium browser window will open to facebook.com.');
  console.log('2. Log in to your Facebook account in the browser window.');
  console.log('3. Return here and press ENTER once you see your Facebook feed.\n');

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

  await prompt('👉 Once you are logged in on Facebook in the browser window, press ENTER here: ');

  // Save the full storage state with all HttpOnly cookies (xs, c_user, datr, sb, fr)
  await browserContext.storageState({ path: STORAGE_STATE_PATH });
  const rawState = fs.readFileSync(STORAGE_STATE_PATH, 'utf-8');
  const stateObj = JSON.parse(rawState);

  const cookies = stateObj.cookies || [];
  const hasCUser = cookies.some((c: any) => c.name === 'c_user');
  const hasXs = cookies.some((c: any) => c.name === 'xs');

  if (hasCUser && hasXs) {
    console.log('\n✅ Active Facebook session successfully captured (c_user + xs)!');
  } else {
    console.warn('\n⚠️ Warning: c_user or xs was not detected. Ensure you completed login.');
  }

  await browserContext.close();

  // Export base64 for GitHub Secrets
  const base64 = Buffer.from(rawState).toString('base64');
  console.log('\n' + '='.repeat(70));
  console.log('📤 Updating GitHub Actions Secret FB_SESSION_STORAGE via GitHub CLI...');
  try {
    execSync(`echo "${base64}" | gh secret set FB_SESSION_STORAGE --repo Sanjit-M/rental-radar`, {
      stdio: 'inherit',
    });
    console.log('✅ GitHub Secret FB_SESSION_STORAGE successfully updated!');
  } catch (err: any) {
    console.log('Note: To update GitHub Actions secret manually, copy:');
    console.log(base64);
  }
  console.log('='.repeat(70));
  console.log('\n🎉 Setup complete! You can now run `pnpm scrape` to scrape live listings.');
}

main().catch((err) => {
  console.error('Authentication setup error:', err);
  process.exit(1);
});

