import { createClient, Client } from '@libsql/client';

/** Schema SQL shared identically across both local SQLite and Turso Cloud SQLite. */
export const SCHEMA_SQL = `
CREATE TABLE IF NOT EXISTS listings (
  id INTEGER PRIMARY KEY AUTOINCREMENT,
  fb_post_id TEXT UNIQUE NOT NULL,
  group_name TEXT NOT NULL,
  post_url TEXT NOT NULL,
  author_name TEXT NOT NULL,
  posted_time TEXT NOT NULL DEFAULT 'Recently',
  raw_text TEXT NOT NULL,
  location TEXT NOT NULL,
  bhk_type TEXT NOT NULL,
  rent INTEGER,
  deposit INTEGER,
  is_brokerage INTEGER NOT NULL,
  is_gated_society INTEGER NOT NULL,
  society_name TEXT,
  has_swimming_pool INTEGER NOT NULL,
  has_power_backup INTEGER NOT NULL,
  has_attached_washroom INTEGER NOT NULL,
  has_balcony INTEGER NOT NULL,
  furnishing TEXT NOT NULL,
  is_kadubeesanahalli_direct INTEGER NOT NULL,
  contact_phone TEXT,
  distance_km REAL NOT NULL,
  inbound_mins INTEGER NOT NULL,
  outbound_mins INTEGER NOT NULL,
  two_way_avg_peak_mins INTEGER NOT NULL,
  has_panathur_underpass_bottleneck INTEGER NOT NULL,
  score INTEGER NOT NULL,
  score_breakdown TEXT NOT NULL,
  tier TEXT NOT NULL,
  user_status TEXT NOT NULL DEFAULT 'new',
  created_at TEXT NOT NULL DEFAULT (datetime('now')),
  updated_at TEXT NOT NULL DEFAULT (datetime('now'))
);

CREATE INDEX IF NOT EXISTS idx_listings_score ON listings(score DESC);
CREATE INDEX IF NOT EXISTS idx_listings_created_at ON listings(created_at DESC);
CREATE INDEX IF NOT EXISTS idx_listings_user_status ON listings(user_status);

CREATE TABLE IF NOT EXISTS scrape_logs (
  id INTEGER PRIMARY KEY AUTOINCREMENT,
  status TEXT NOT NULL,
  items_scanned INTEGER NOT NULL,
  items_matched INTEGER NOT NULL,
  error_message TEXT,
  ran_at TEXT NOT NULL DEFAULT (datetime('now'))
);
`;

/** Abstract Database Interface for Dual-Mode Execution. */
export interface IDatabase {
  execute(sql: string, args?: any[]): Promise<{ changes: number; lastInsertRowid?: number | bigint | undefined }>;
  query<T = any>(sql: string, args?: any[]): Promise<T[]>;
  queryOne<T = any>(sql: string, args?: any[]): Promise<T | null>;
  initSchema(): Promise<void>;
  isTurso(): boolean;
}

class WebLibSqlDatabase implements IDatabase {
  private client: Client;
  private isCloud: boolean;
  private initPromise: Promise<void> | null = null;

  constructor(url: string, authToken?: string) {
    this.isCloud = !url.startsWith('file:');
    this.client = authToken ? createClient({ url, authToken }) : createClient({ url });
  }

  isTurso(): boolean {
    return this.isCloud;
  }

  private async ensureInitialized(): Promise<void> {
    if (!this.initPromise) {
      this.initPromise = this.initSchema().catch((err) => {
        console.error('Database schema auto-init warning:', err?.message || err);
        this.initPromise = null;
      });
    }
    return this.initPromise;
  }

  async initSchema(): Promise<void> {
    const statements = SCHEMA_SQL.split(';')
      .map((s) => s.trim())
      .filter((s) => s.length > 0);

    for (const stmt of statements) {
      try {
        await this.client.execute(stmt);
      } catch (err: any) {
        if (!err.message?.includes('already exists')) {
          console.warn('DDL notice:', err.message);
        }
      }
    }
  }

  async execute(sql: string, args: any[] = []): Promise<{ changes: number; lastInsertRowid?: number | bigint | undefined }> {
    await this.ensureInitialized();
    const result = await this.client.execute({ sql, args });
    return {
      changes: result.rowsAffected,
      lastInsertRowid: result.lastInsertRowid,
    };
  }

  async query<T = any>(sql: string, args: any[] = []): Promise<T[]> {
    await this.ensureInitialized();
    const result = await this.client.execute({ sql, args });
    return result.rows as unknown as T[];
  }

  async queryOne<T = any>(sql: string, args: any[] = []): Promise<T | null> {
    await this.ensureInitialized();
    const rows = await this.query<T>(sql, args);
    return rows.length > 0 ? rows[0]! : null;
  }
}

/** Global unified database client instance. */
function createDatabase(): IDatabase {
  const tursoUrl = process.env.TURSO_DATABASE_URL;
  const tursoToken = process.env.TURSO_AUTH_TOKEN;

  if (tursoUrl) {
    console.log(`📡 Connecting to Turso Cloud (Web Fetch) at ${tursoUrl.replace(/:\/\/.*@/, '://***@')}`);
    return new WebLibSqlDatabase(tursoUrl, tursoToken);
  }

  // Fallback in local node development
  const localDbUrl = 'file:data/listings.db';
  return new WebLibSqlDatabase(localDbUrl);
}

export const db: IDatabase = createDatabase();
