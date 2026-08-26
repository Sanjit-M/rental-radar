import path from 'path';
import fs from 'fs';
import os from 'os';
import { chromium, BrowserContext } from 'playwright';

export const USER_DATA_DIR = path.join(os.homedir(), '.fb_rental_profile');

export function hasExistingSession(): boolean {
  return fs.existsSync(USER_DATA_DIR) && fs.readdirSync(USER_DATA_DIR).length > 0;
}

export async function createPersistentContext(headless: boolean = true): Promise<BrowserContext> {
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
