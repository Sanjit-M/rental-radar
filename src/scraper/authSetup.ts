import readline from 'readline';
import { createPersistentContext, USER_DATA_DIR } from './browserSession';

async function main() {
  console.log('='.repeat(65));
  console.log(' 🚀 Facebook Session Authentication Setup — Rental Radar');
  console.log('='.repeat(65));
  console.log(`Profile Directory: ${USER_DATA_DIR}`);
  console.log('\nLaunching browser window...');
  console.log('1. Log in to your Facebook account in the opened window.');
  console.log('2. Navigate into your Bangalore Flat & Flatmates groups.');
  console.log('3. Return here and press ENTER to save your session.\n');

  const context = await createPersistentContext(false);
  const page = await context.newPage();
  await page.goto('https://www.facebook.com', { waitUntil: 'domcontentloaded' });

  const rl = readline.createInterface({
    input: process.stdin,
    output: process.stdout,
  });

  await new Promise<void>((resolve) => {
    rl.question('👉 Press [ENTER] once you are logged in... ', () => {
      rl.close();
      resolve();
    });
  });

  console.log('💾 Saving persistent browser session...');
  await context.close();
  console.log('🎉 Facebook session successfully saved to profile! Background hourly scraper is now ready.');
  process.exit(0);
}

main().catch((err) => {
  console.error('Error during setup:', err);
  process.exit(1);
});
