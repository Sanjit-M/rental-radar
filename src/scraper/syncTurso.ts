import { createClient } from '@libsql/client';
import { SCHEMA_SQL } from '../db/database';
import { listingRepository } from '../db/repository';

/**
 * Synchronizes real, verified accommodation listings from the local SQLite database
 * directly into the configured Turso Cloud SQLite database.
 */
export async function syncTurso(): Promise<number> {
  const url = process.env.TURSO_DATABASE_URL;
  const authToken = process.env.TURSO_AUTH_TOKEN;

  if (!url) {
    console.log('ℹ️ No TURSO_DATABASE_URL set; skipping cloud synchronization.');
    return 0;
  }

  console.log(`📡 Connecting to Turso Cloud at: ${url.replace(/:\/\/.*@/, '://***@')}`);
  const client = authToken ? createClient({ url, authToken }) : createClient({ url });

  // 1. Initialize schema
  console.log('📦 Ensuring database schema & indexes on Turso Cloud...');
  const statements = SCHEMA_SQL.split(';')
    .map((s) => s.trim())
    .filter((s) => s.length > 0);

  for (const stmt of statements) {
    try {
      await client.execute(stmt);
    } catch (err: unknown) {
      const message = err instanceof Error ? err.message : String(err);
      if (!message.includes('already exists')) {
        console.warn('DDL warning:', message);
      }
    }
  }

  // 2. Fetch verified local listings
  const localListings = await listingRepository.getListings();
  console.log(`📤 Synchronizing ${localListings.length} verified real listings to Turso Cloud...`);
  let synced = 0;

  for (const l of localListings) {
    if (
      !l.postUrl ||
      l.postUrl.trim().length === 0 ||
      l.postUrl.includes('seed_') ||
      l.fbPostId.includes('seed')
    ) {
      continue;
    }

    const imagesToSave = l.imageUrls || l.entities.imageUrls || [];

    const upsertSql = `
      INSERT INTO listings (
        fb_post_id, group_name, post_url, author_name, posted_time, raw_text,
        location, landmark, title, summary, image_urls,
        bhk_type, rent, deposit, is_brokerage,
        is_gated_society, society_name, has_swimming_pool,
        has_power_backup, has_attached_washroom, has_balcony,
        furnishing, is_kadubeesanahalli_direct, contact_phone,
        distance_km, inbound_mins, outbound_mins, two_way_avg_peak_mins,
        has_panathur_underpass_bottleneck, score, score_breakdown, tier,
        user_status, created_at, updated_at
      ) VALUES (
        ?, ?, ?, ?, ?, ?,
        ?, ?, ?, ?, ?,
        ?, ?, ?, ?,
        ?, ?, ?,
        ?, ?, ?,
        ?, ?, ?,
        ?, ?, ?, ?,
        ?, ?, ?, ?,
        ?, coalesce(?, datetime('now')), datetime('now')
      )
      ON CONFLICT(fb_post_id) DO UPDATE SET
        author_name=excluded.author_name,
        landmark=excluded.landmark,
        title=excluded.title,
        summary=excluded.summary,
        image_urls=excluded.image_urls,
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
    `;

    await client.execute({
      sql: upsertSql,
      args: [
        l.fbPostId,
        l.groupName,
        l.postUrl,
        l.authorName,
        l.postedTime,
        l.rawText,
        l.location,
        l.landmark || l.entities.landmark || null,
        l.title || null,
        l.summary || null,
        JSON.stringify(imagesToSave),
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
        l.createdAt || null,
      ],
    });
    synced++;
  }

  // 3. Verify total in remote Turso
  const countRes = await client.execute('SELECT COUNT(*) as total FROM listings');
  const total = countRes.rows[0]?.total;
  console.log(`\n✨ Successfully synchronized ${synced} real listings. Total in Turso: ${total}`);
  return synced;
}

if (process.argv[1] && (process.argv[1].endsWith('syncTurso.ts') || process.argv[1].endsWith('syncTurso.js'))) {
  syncTurso().catch((err: unknown) => {
    console.error('Fatal sync error:', err);
    process.exit(1);
  });
}
