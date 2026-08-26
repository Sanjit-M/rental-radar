import readline from 'readline';
import { exec } from 'child_process';
import fs from 'fs';
import path from 'path';
import os from 'os';

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

function parseCookieHeader(cookieStr: string) {
  const cookies: Array<{
    name: string;
    value: string;
    domain: string;
    path: string;
    expires: number;
    httpOnly: boolean;
    secure: boolean;
    sameSite: 'Lax' | 'None' | 'Strict';
  }> = [];

  const pairs = cookieStr.split(';');
  for (const pair of pairs) {
    const idx = pair.indexOf('=');
    if (idx === -1) continue;
    const name = pair.substring(0, idx).trim();
    const value = pair.substring(idx + 1).trim();
    if (!name) continue;

    cookies.push({
      name,
      value,
      domain: '.facebook.com',
      path: '/',
      expires: Math.floor(Date.now() / 1000) + 86400 * 90, // 90 days
      httpOnly: name === 'xs' || name === 'c_user',
      secure: true,
      sameSite: 'None',
    });
  }
  return cookies;
}

async function main() {
  console.log('='.repeat(70));
  console.log(' 🌐 Facebook Default Browser Authentication (Helium / macOS)');
  console.log('='.repeat(70));

  // 1. Open default browser (Helium) to Facebook
  console.log('\n🚀 Opening Facebook in your default browser (Helium)...');
  exec('open https://www.facebook.com');

  console.log('\n' + '-'.repeat(70));
  console.log('📋 FASTEST SETUP (10 Seconds):');
  console.log('1. In Helium on facebook.com, open Developer Console (Cmd + Option + J)');
  console.log('2. Copy and paste this 1 line into the console and press Enter:\n');
  console.log('   \x1b[36mcopy(document.cookie)\x1b[0m\n');
  console.log('   (This instantly copies your Facebook session cookies to your clipboard)');
  console.log('-'.repeat(70) + '\n');

  let cookieInput = await prompt('👉 Paste your clipboard here and press ENTER: ');

  // If user pasted individual c_user or format
  if (!cookieInput.includes('=')) {
    console.log('\nNo key-value pairs detected. Let us capture c_user and xs individually:');
    const cUser = await prompt('Enter your c_user (Numeric ID): ');
    const xs = await prompt('Enter your xs (Session Token): ');
    cookieInput = `c_user=${cUser}; xs=${xs}`;
  }

  const cookies = parseCookieHeader(cookieInput);

  if (!cookies.some((c) => c.name === 'c_user') && !cookies.some((c) => c.name === 'xs')) {
    console.warn('\n⚠️ Warning: Neither "c_user" nor "xs" was found in the input.');
    console.warn('Please make sure you were logged in on facebook.com when copying.');
  }

  const storageState = {
    cookies,
    origins: [
      {
        origin: 'https://www.facebook.com',
        localStorage: [],
      },
    ],
  };

  // 2. Write to ~/.fb_rental_profile/storageState.json
  if (!fs.existsSync(USER_DATA_DIR)) {
    fs.mkdirSync(USER_DATA_DIR, { recursive: true });
  }
  fs.writeFileSync(STORAGE_STATE_PATH, JSON.stringify(storageState, null, 2), 'utf-8');

  console.log('\n✅ Successfully saved active session to:');
  console.log('   ' + STORAGE_STATE_PATH);

  // 3. Output Base64 for GitHub Secrets
  const base64String = Buffer.from(JSON.stringify(storageState)).toString('base64');

  console.log('\n' + '='.repeat(70));
  console.log('📤 GITHUB ACTIONS SECRET (Optional for Cloud Scraper)');
  console.log('Copy this value to GitHub -> Settings -> Secrets -> FB_SESSION_STORAGE:');
  console.log('='.repeat(70) + '\n');
  console.log(base64String);
  console.log('\n' + '='.repeat(70));
  console.log('🎉 Setup complete! You can now run `pnpm scrape` anytime.');
}

main().catch((err) => {
  console.error('Setup failed:', err);
  process.exit(1);
});
