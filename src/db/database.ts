import { createClient, Client } from '@libsql/client';
import { DatabaseSync } from 'node:sqlite';
import path from 'path';
import fs from 'fs';

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
  execute(sql: string, args?: any[]): Promise<{ changes: number; lastInsertRowid?: number | bigint }>;
  query<T = any>(sql: string, args?: any[]): Promise<T[]>;
  queryOne<T = any>(sql: string, args?: any[]): Promise<T | null>;
  initSchema(): Promise<void>;
  isTurso(): boolean;
}

// 1. Turso Cloud Client Implementation
class TursoDatabase implements IDatabase {
  private client: Client;

  constructor(url: string, authToken?: string) {
    this.client = createClient({ url, authToken });
  }

  isTurso(): boolean {
    return true;
  }

  async initSchema(): Promise<void> {
    const statements = SCHEMA_SQL.split(';')
      .map((s) => s.trim())
      .filter((s) => s.length > 0);

    for (const stmt of statements) {
      await this.client.execute(stmt);
    }
  }

  async execute(sql: string, args: any[] = []): Promise<{ changes: number; lastInsertRowid?: number | bigint }> {
    const result = await this.client.execute({ sql, args });
    return {
      changes: result.rowsAffected,
      lastInsertRowid: result.lastInsertRowid,
    };
  }

  async query<T = any>(sql: string, args: any[] = []): Promise<T[]> {
    const result = await this.client.execute({ sql, args });
    return result.rows as unknown as T[];
  }

  async queryOne<T = any>(sql: string, args: any[] = []): Promise<T | null> {
    const rows = await this.query<T>(sql, args);
    return rows.length > 0 ? rows[0]! : null;
  }
}

// 2. Local node:sqlite Client Implementation
class LocalNodeDatabase implements IDatabase {
  private dbInstance: DatabaseSync;

  constructor() {
    const dataDir = path.resolve(process.cwd(), 'data');
    if (!fs.existsSync(dataDir)) {
      fs.mkdirSync(dataDir, { recursive: true });
    }
    const dbPath = path.join(dataDir, 'listings.db');
    this.dbInstance = new DatabaseSync(dbPath);
    this.dbInstance.exec(SCHEMA_SQL);
    try {
      this.dbInstance.exec("ALTER TABLE listings ADD COLUMN posted_time TEXT NOT NULL DEFAULT 'Recently';");
    } catch {
      // Column already exists
    }
  }

  isTurso(): boolean {
    return false;
  }

  async initSchema(): Promise<void> {
    this.dbInstance.exec(SCHEMA_SQL);
  }

  async execute(sql: string, args: any[] = []): Promise<{ changes: number; lastInsertRowid?: number | bigint }> {
    const stmt = this.dbInstance.prepare(sql);
    const res = stmt.run(...args);
    return {
      changes: res.changes,
      lastInsertRowid: res.lastInsertRowid,
    };
  }

  async query<T = any>(sql: string, args: any[] = []): Promise<T[]> {
    const stmt = this.dbInstance.prepare(sql);
    const rows = stmt.all(...args);
    return rows as T[];
  }

  async queryOne<T = any>(sql: string, args: any[] = []): Promise<T | null> {
    const stmt = this.dbInstance.prepare(sql);
    const row = stmt.get(...args);
    return (row as T) || null;
  }
}

/** Global unified database client instance. */
function createDatabase(): IDatabase {
  const tursoUrl = process.env.TURSO_DATABASE_URL;
  const tursoToken = process.env.TURSO_AUTH_TOKEN;

  if (tursoUrl) {
    console.log(`📡 Connected to Turso Cloud SQLite at ${tursoUrl.replace(/:\/\/.*@/, '://***@')}`);
    return new TursoDatabase(tursoUrl, tursoToken);
  }

  return new LocalNodeDatabase();
}

export const db: IDatabase = createDatabase();
