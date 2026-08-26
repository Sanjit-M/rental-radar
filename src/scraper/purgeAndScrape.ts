import fs from 'fs';
import path from 'path';
import { createClient } from '@libsql/client';
import { db } from '../db/database';
import { runScrapeCycle } from './groupScraper';
import { listingRepository } from '../db/repository';

function loadEnv() {
  const envPath = path.resolve(process.cwd(), '.env');
  if (fs.existsSync(envPath)) {
    const lines = fs.readFileSync(envPath, 'utf-8').split('\n');
    for (const line of lines) {
      const match = line.match(/^\s*([\w.-]+)\s*=\s*(.*)?\s*$/);
      if (match) {
        const key = match[1];
        let val = match[2] || '';
        if (key) {
          process.env[key] = val.trim();
        }
      }
    }
  }
}

async function purgeAndScrape() {
  loadEnv();
  console.log('='.repeat(70));
  console.log(' 🧹 PURGING ALL MOCK & SEED LISTINGS (Local & Cloud Turso)');
  console.log('='.repeat(70));

  // 1. Purge Local Database
  await db.initSchema();
  await db.execute('DELETE FROM listings');
  await db.execute('DELETE FROM scrape_logs');
  console.log('✅ Local SQLite database wiped clean.');

  // 2. Purge Cloud Turso Database
  const tursoUrl = process.env.TURSO_DATABASE_URL;
  const tursoToken = process.env.TURSO_AUTH_TOKEN;
  if (tursoUrl && tursoToken) {
    const tursoClient = createClient({ url: tursoUrl, authToken: tursoToken });
    await tursoClient.execute('DELETE FROM listings');
    await tursoClient.execute('DELETE FROM scrape_logs');
    console.log('✅ Remote Turso Cloud database wiped clean.');
  }

  // 3. Run Live Real Facebook Scraper across all 20 Sources
  console.log('\n' + '='.repeat(70));
  console.log(' 🚀 RUNNING 20-SOURCE LIVE FACEBOOK SCRAPER & SYNC');
  console.log('='.repeat(70));

  const result = await runScrapeCycle(true);
  console.log('\nScrape Summary:', JSON.stringify(result, null, 2));

  // 4. Sync all newly scraped listings to Turso
  if (tursoUrl && tursoToken) {
    console.log('\n📤 Syncing verified live listings to Turso Cloud...');
    const allLocal = await listingRepository.getListings();
    const tursoClient = createClient({ url: tursoUrl, authToken: tursoToken });

    for (const l of allLocal) {
      await tursoClient.execute({
        sql: `
          INSERT INTO listings (
            fb_post_id, group_name, post_url, author_name, posted_time, raw_text,
            location, bhk_type, rent, deposit, is_brokerage,
            is_gated_society, society_name, has_swimming_pool,
            has_power_backup, has_attached_washroom, has_balcony,
            furnishing, is_kadubeesanahalli_direct, contact_phone,
            distance_km, inbound_mins, outbound_mins, two_way_avg_peak_mins,
            has_panathur_underpass_bottleneck, score, score_breakdown, tier,
            user_status, updated_at
          ) VALUES (
            ?, ?, ?, ?, ?, ?,
            ?, ?, ?, ?, ?,
            ?, ?, ?,
            ?, ?, ?,
            ?, ?, ?,
            ?, ?, ?, ?,
            ?, ?, ?, ?,
            ?, datetime('now')
          )
          ON CONFLICT(fb_post_id) DO UPDATE SET
            author_name=excluded.author_name,
            posted_time=excluded.posted_time,
            rent=excluded.rent,
            deposit=excluded.deposit,
            score=excluded.score,
            score_breakdown=excluded.score_breakdown,
            tier=excluded.tier,
            inbound_mins=excluded.inbound_mins,
            outbound_mins=excluded.outbound_mins,
            two_way_avg_peak_mins=excluded.two_way_avg_peak_mins,
            updated_at=datetime('now');
        `,
        args: [
          l.fbPostId,
          l.groupName,
          l.postUrl,
          l.authorName,
          l.postedTime,
          l.rawText,
          l.location,
          l.bhkType,
          l.entities.rent !== null ? l.entities.rent : null,
          l.entities.deposit !== null ? l.entities.deposit : null,
          l.entities.isBrokerage ? 1 : 0,
          l.entities.isGatedSociety ? 1 : 0,
          l.entities.societyName,
          l.entities.hasSwimmingPool ? 1 : 0,
          l.entities.hasPowerBackup ? 1 : 0,
          l.entities.hasAttachedWashroom ? 1 : 0,
          l.entities.hasBalcony ? 1 : 0,
          l.entities.furnishing,
          l.entities.isKadubeesanahalliDirect ? 1 : 0,
          l.entities.contactPhone,
          l.commute.distanceKm,
          l.commute.inboundMins,
          l.commute.outboundMins,
          l.commute.twoWayAvgPeakMins,
          l.commute.hasPanathurUnderpassBottleneck ? 1 : 0,
          l.score,
          JSON.stringify(l.scoreBreakdown),
          l.tier,
          l.userStatus || 'new',
        ],
      });
    }
    console.log(`✅ Synced ${allLocal.length} live verified listings to Turso Cloud.`);
  }

  console.log('\n🎉 Done! Real listings are populated and live.');
}

purgeAndScrape().catch((err) => {
  console.error('Purge and scrape failed:', err);
  process.exit(1);
});
