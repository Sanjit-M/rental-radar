import path from 'path';
import fs from 'fs';
import os from 'os';
import { chromium, BrowserContext } from 'playwright';

export const USER_DATA_DIR = path.join(os.homedir(), '.fb_rental_profile');
const STORAGE_STATE_PATH = path.join(USER_DATA_DIR, 'storageState.json');

/**
 * Checks whether an active Facebook session is available either via
 * local storageState.json or via the FB_SESSION_STORAGE environment variable.
 */
export function hasExistingSession(): boolean {
  if (process.env.FB_SESSION_STORAGE) {
    return true;
  }
  if (fs.existsSync(STORAGE_STATE_PATH)) {
    return true;
  }
  return fs.existsSync(USER_DATA_DIR) && fs.readdirSync(USER_DATA_DIR).length > 0;
}

/**
 * Launches persistent context or initializes browser context from storageState.json / FB_SESSION_STORAGE.
 */
export async function createPersistentContext(headless: boolean = true): Promise<BrowserContext> {
  const envStorage = process.env.FB_SESSION_STORAGE;

  // 1. If running in GitHub Actions / Cloud with FB_SESSION_STORAGE Secret
  if (envStorage) {
    let storageStateObj: any;
    try {
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

  // 2. If storageState.json exists locally (exported from Helium or default browser)
  if (fs.existsSync(STORAGE_STATE_PATH)) {
    const browser = await chromium.launch({
      headless,
      args: ['--disable-blink-features=AutomationControlled', '--no-sandbox', '--disable-dev-shm-usage'],
    });

    return await browser.newContext({
      storageState: STORAGE_STATE_PATH,
      viewport: { width: 1280, height: 900 },
      userAgent:
        'Mozilla/5.0 (Macintosh; Intel Mac OS X 10_15_7) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/122.0.0.0 Safari/537.36',
    });
  }

  // 3. Fallback: Local Persistent Profile Directory
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
