import path from 'path';
import fs from 'fs';
import os from 'os';

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
 * Parses raw session input from environment variables across multiple formats:
 * 1. Standard Playwright storageState JSON string
 * 2. Base64-encoded storageState JSON
 * 3. Raw Cookie string (e.g. "c_user=123; xs=abc; sb=xyz; datr=...")
 */
export function parseStorageState(rawInput: string): any {
  if (!rawInput || typeof rawInput !== 'string') return undefined;

  let input = rawInput.trim();

  // Strip wrapping quotes e.g. '"..."' or "'''"
  if (
    (input.startsWith('"') && input.endsWith('"')) ||
    (input.startsWith("'") && input.endsWith("'"))
  ) {
    input = input.slice(1, -1).trim();
  }

  // 1. Direct JSON parse
  if (input.startsWith('{') || input.startsWith('[')) {
    try {
      const parsed = JSON.parse(input);
      if (Array.isArray(parsed)) {
        return { cookies: parsed, origins: [] };
      }
      return parsed;
    } catch {
      // Continue to next strategy
    }
  }

  // 2. Base64 decoded JSON
  try {
    const decoded = Buffer.from(input, 'base64').toString('utf-8').trim();
    if (decoded.startsWith('{') || decoded.startsWith('[')) {
      const parsed = JSON.parse(decoded);
      if (Array.isArray(parsed)) {
        return { cookies: parsed, origins: [] };
      }
      return parsed;
    }
  } catch {
    // Continue to next strategy
  }

  // 3. Raw Cookie String format (e.g. "sb=...; datr=...; c_user=...; xs=...")
  if (input.includes('=') && (input.includes(';') || input.includes('c_user') || input.includes('xs') || input.includes('sb') || input.includes('datr'))) {
    try {
      const cookies = input
        .split(';')
        .map((part) => part.trim())
        .filter((part) => part.includes('='))
        .map((part) => {
          const eqIdx = part.indexOf('=');
          const name = part.slice(0, eqIdx).trim();
          const value = part.slice(eqIdx + 1).trim();
          return {
            name,
            value,
            domain: '.facebook.com',
            path: '/',
            expires: -1,
            httpOnly: false,
            secure: true,
            sameSite: 'Lax' as const,
          };
        });

      if (cookies.length > 0) {
        console.log(`🍪 Successfully converted raw cookie string into ${cookies.length} browser cookies.`);
        return { cookies, origins: [] };
      }
    } catch (err) {
      console.warn('Failed converting cookie string:', err);
    }
  }

  return undefined;
}

/**
 * Launches persistent context or initializes browser context from storageState.json / FB_SESSION_STORAGE.
 * NOTE: Playwright is dynamically loaded so serverless runtime on Vercel never crashes on import.
 */
export async function createPersistentContext(headless: boolean = true): Promise<any> {
  const { chromium } = await import('playwright');
  const envStorage = process.env.FB_SESSION_STORAGE;

  // 1. If running in GitHub Actions / Cloud with FB_SESSION_STORAGE Secret
  if (envStorage) {
    const storageStateObj = parseStorageState(envStorage);
    if (storageStateObj) {
      console.log('🔑 Successfully loaded Facebook session from FB_SESSION_STORAGE secret.');
    } else {
      console.warn('⚠️ FB_SESSION_STORAGE secret provided but could not be parsed into cookies/storage state. Launching clean context.');
    }

    const browser = await chromium.launch({
      headless,
      args: ['--disable-blink-features=AutomationControlled', '--no-sandbox', '--disable-dev-shm-usage', '--lang=en-US'],
    });

    return await browser.newContext({
      storageState: storageStateObj,
      locale: 'en-US',
      extraHTTPHeaders: {
        'Accept-Language': 'en-US,en;q=0.9',
      },
      viewport: { width: 1920, height: 1080 },
      userAgent:
        'Mozilla/5.0 (Macintosh; Intel Mac OS X 10_15_7) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/122.0.0.0 Safari/537.36',
    });
  }

  // 2. If storageState.json exists locally (exported from Helium or default browser)
  if (fs.existsSync(STORAGE_STATE_PATH)) {
    const browser = await chromium.launch({
      headless,
      args: ['--disable-blink-features=AutomationControlled', '--no-sandbox', '--disable-dev-shm-usage', '--lang=en-US'],
    });

    return await browser.newContext({
      storageState: STORAGE_STATE_PATH,
      locale: 'en-US',
      extraHTTPHeaders: {
        'Accept-Language': 'en-US,en;q=0.9',
      },
      viewport: { width: 1920, height: 1080 },
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
    locale: 'en-US',
    extraHTTPHeaders: {
      'Accept-Language': 'en-US,en;q=0.9',
    },
    viewport: { width: 1920, height: 1080 },
    userAgent:
      'Mozilla/5.0 (Macintosh; Intel Mac OS X 10_15_7) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/122.0.0.0 Safari/537.36',
    args: ['--disable-blink-features=AutomationControlled', '--no-sandbox', '--disable-dev-shm-usage', '--lang=en-US'],
  });
}

/**
 * Attaches route interception to abort heavy images, video media, web fonts,
 * and tracking beacons, saving ~75% bandwidth and cutting page load times.
 */
export async function enableFastNetworkInterception(page: any): Promise<void> {
  await page.route('**/*', (route: any) => {
    const request = route.request();
    const resourceType = request.resourceType();
    const url = request.url().toLowerCase();

    // Abort heavy media, fonts, images, and tracking endpoints
    if (
      resourceType === 'image' ||
      resourceType === 'media' ||
      resourceType === 'font' ||
      url.includes('.jpg') ||
      url.includes('.jpeg') ||
      url.includes('.png') ||
      url.includes('.webp') ||
      url.includes('.gif') ||
      url.includes('.svg') ||
      url.includes('.mp4') ||
      url.includes('.webm') ||
      url.includes('.woff') ||
      url.includes('.woff2') ||
      url.includes('.ttf') ||
      url.includes('/privacy_sandbox/') ||
      url.includes('facebook.com/tr/') ||
      url.includes('graph.facebook.com/logging')
    ) {
      return route.abort();
    }

    return route.continue();
  });
}
