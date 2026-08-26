import path from 'path';
import fs from 'fs';
import os from 'os';
import { chromium, BrowserContext } from 'playwright';

export const USER_DATA_DIR = path.join(os.homedir(), '.fb_rental_profile');

/**
 * Checks whether an active Facebook session is available either via
 * local directory or via the FB_SESSION_STORAGE environment variable.
 */
export function hasExistingSession(): boolean {
  if (process.env.FB_SESSION_STORAGE) {
    return true;
  }
  return fs.existsSync(USER_DATA_DIR) && fs.readdirSync(USER_DATA_DIR).length > 0;
}

/**
 * Launches persistent context or initializes browser context from FB_SESSION_STORAGE.
 */
export async function createPersistentContext(headless: boolean = true): Promise<BrowserContext> {
  const envStorage = process.env.FB_SESSION_STORAGE;

  // 1. If running in GitHub Actions / Cloud with FB_SESSION_STORAGE Secret
  if (envStorage) {
    let storageStateObj: any;
    try {
      // Decode base64 or parse direct JSON
      const decoded = envStorage.startsWith('{')
        ? envStorage
        : Buffer.from(envStorage, 'base64').toString('utf-8');
      storageStateObj = JSON.parse(decoded);
    } catch (err) {
      console.error('Failed to parse FB_SESSION_STORAGE secret:', err);
    }

    const browser = await chromium.launch({
      headless,
      args: ['--disable-blink-features=AutomationControlled', '--no-sandbox', '--disable-dev-shm-usage'],
    });

    return await browser.newContext({
      storageState: storageStateObj,
      viewport: { width: 1280, height: 900 },
      userAgent:
        'Mozilla/5.0 (Macintosh; Intel Mac OS X 10_15_7) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/122.0.0.0 Safari/537.36',
    });
  }

  // 2. Local Persistent Profile
  if (!fs.existsSync(USER_DATA_DIR)) {
    fs.mkdirSync(USER_DATA_DIR, { recursive: true });
  }

  return await chromium.launchPersistentContext(USER_DATA_DIR, {
    headless,
    viewport: { width: 1280, height: 900 },
    userAgent:
      'Mozilla/5.0 (Macintosh; Intel Mac OS X 10_15_7) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/122.0.0.0 Safari/537.36',
    args: ['--disable-blink-features=AutomationControlled', '--no-sandbox', '--disable-dev-shm-usage'],
  });
}
