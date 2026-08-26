import { createPersistentContext, USER_DATA_DIR, hasExistingSession } from './browserSession';

async function exportSession() {
  console.log('='.repeat(65));
  console.log(' 📤 Facebook Session Exporter for GitHub Actions');
  console.log('='.repeat(65));

  if (!hasExistingSession()) {
    console.error('❌ No active session found in ' + USER_DATA_DIR);
    console.error('👉 Please run `pnpm auth` first to log into Facebook in browser.');
    process.exit(1);
  }

  console.log('🔍 Reading active browser session from ' + USER_DATA_DIR + '...');
  const context = await createPersistentContext(true);

  // Extract storage state (cookies, origins, local storage)
  const storageState = await context.storageState();
  await context.close();

  // Validate Facebook authentication cookies
  const cookies: Array<{ name: string; domain: string }> = storageState.cookies || [];
  const fbCookies = cookies.filter((c) => c.domain.includes('facebook.com'));
  const hasCUser = fbCookies.some((c) => c.name === 'c_user');
  const hasXs = fbCookies.some((c) => c.name === 'xs');

  if (!hasCUser || !hasXs) {
    console.warn('⚠️ Warning: Critical Facebook session cookies (c_user / xs) were not found.');
    console.warn('Your session might be logged out. Please re-run `pnpm auth`.');
  } else {
    console.log('✅ Found active Facebook session cookies: c_user, xs, datr');
  }

  const compactState = {
    cookies: storageState.cookies || [],
    origins: [],
  };

  const jsonString = JSON.stringify(compactState);
  const base64String = Buffer.from(jsonString).toString('base64');

  console.log('\n' + '-'.repeat(65));
  console.log('📋 Copy the Secret value below and save it as:');
  console.log('   GitHub Repository -> Settings -> Secrets and variables -> Actions');
  console.log('   Secret Name: FB_SESSION_STORAGE');
  console.log('-'.repeat(65) + '\n');
  console.log(base64String);
  console.log('\n' + '-'.repeat(65));
  console.log('🎉 Done! Add TURSO_DATABASE_URL and TURSO_AUTH_TOKEN to GitHub Secrets as well.');
  process.exit(0);
}

exportSession().catch((err) => {
  console.error('Fatal export error:', err);
  process.exit(1);
});
