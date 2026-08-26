import { createClient } from '@libsql/client';
import { SEED_POSTS } from './seedData';
import { cleanPostText, generatePostId } from '../domain/parser/cleaner';
import { passesAllFilters } from '../domain/parser/filter';
import { extractAllEntities } from '../domain/parser/extractor';
import { calculatePeakScooterCommute } from '../domain/commute/router';
import { computeListingScore } from '../domain/scorer/ratingEngine';
import { SCHEMA_SQL } from '../db/database';

/**
 * Synchronizes verified Kadubeesanahalli / PTP accommodation listings
 * directly into the configured Turso Cloud SQLite database or local SQLite file.
 */
async function syncTurso(): Promise<void> {
  const url = process.env.TURSO_DATABASE_URL || 'file:data/listings.db';
  const authToken = process.env.TURSO_AUTH_TOKEN;

  console.log(`📡 Connecting to database at: ${url.replace(/:\/\/.*@/, '://***@')}`);
  const client = authToken ? createClient({ url, authToken }) : createClient({ url });

  // 1. Initialize schema
  console.log('📦 Ensuring database schema & indexes...');
  const statements = SCHEMA_SQL.split(';')
    .map((s) => s.trim())
    .filter((s) => s.length > 0);

  for (const stmt of statements) {
    try {
      await client.execute(stmt);
    } catch (err: any) {
      if (!err.message?.includes('already exists')) {
        console.warn('DDL warning:', err.message);
      }
    }
  }

  // 2. Process and insert seed listings
  console.log(`🌱 Processing ${SEED_POSTS.length} verified Kadubeesanahalli / PTP listings...`);
  let inserted = 0;

  for (const post of SEED_POSTS) {
    const clean = cleanPostText(post.text);
    const filterRes = passesAllFilters(clean);
    if (filterRes._tag === 'err') {
      console.warn(`Skipped listing by ${post.authorName}: ${filterRes.error.message}`);
      continue;
    }

    const { location, bhkType } = filterRes.value;
    const entities = extractAllEntities(clean);
    const commute = calculatePeakScooterCommute(
      entities.societyLat,
      entities.societyLon,
      location,
      entities.isKadubeesanahalliDirect
    );
    const { score, breakdown, tier } = computeListingScore(entities, commute);
    const fbPostId = post.fbPostId || generatePostId(post.groupName, post.authorName, clean);

    const upsertSql = `
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
        updated_at=datetime('now');
    `;

    await client.execute({
      sql: upsertSql,
      args: [
        fbPostId,
        post.groupName,
        post.postUrl,
        post.authorName,
        post.postedTime,
        clean,
        location,
        bhkType,
        entities.rent !== null ? entities.rent : null,
        entities.deposit !== null ? entities.deposit : null,
        entities.isBrokerage ? 1 : 0,
        entities.isGatedSociety ? 1 : 0,
        entities.societyName,
        entities.hasSwimmingPool ? 1 : 0,
        entities.hasPowerBackup ? 1 : 0,
        entities.hasAttachedWashroom ? 1 : 0,
        entities.hasBalcony ? 1 : 0,
        entities.furnishing,
        entities.isKadubeesanahalliDirect ? 1 : 0,
        entities.contactPhone,
        commute.distanceKm,
        commute.inboundMins,
        commute.outboundMins,
        commute.twoWayAvgPeakMins,
        commute.hasPanathurUnderpassBottleneck ? 1 : 0,
        score,
        JSON.stringify(breakdown),
        tier,
        post.userStatus || 'new',
      ],
    });

    inserted++;
    console.log(`  ✓ Synced: [Score: ${score}] ${post.authorName} - ${entities.societyName || location} (${tier})`);
  }

  // 3. Verify total in database
  const countRes = await client.execute('SELECT COUNT(*) as total FROM listings');
  const total = countRes.rows[0]?.total;
  console.log(`\n✨ Successfully synchronized ${inserted} listings. Total listings in database: ${total}`);
}

syncTurso().catch((err) => {
  console.error('Fatal sync error:', err);
  process.exit(1);
});
