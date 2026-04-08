/**
 * db.ts — Database adapter
 * Uses Postgres (Neon/Azure) in production, SQLite locally as fallback
 */
import { Pool } from 'pg'

let _pool: Pool | null = null

export function getPool(): Pool {
  if (!_pool) {
    if (!process.env.DATABASE_URL) {
      throw new Error('DATABASE_URL environment variable is not set')
    }
    _pool = new Pool({
      connectionString: process.env.DATABASE_URL,
      ssl: { rejectUnauthorized: false },
      max: 10,
    })
  }
  return _pool
}

// Initialize schema on first connection
let _initialized = false
export async function getDb() {
  const pool = getPool()
  if (!_initialized) {
    await pool.query(`
      CREATE TABLE IF NOT EXISTS users (
        id SERIAL PRIMARY KEY,
        name TEXT NOT NULL,
        email TEXT UNIQUE NOT NULL,
        password_hash TEXT NOT NULL,
        role TEXT NOT NULL DEFAULT 'customer',
        created_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
      );
      CREATE TABLE IF NOT EXISTS favorites (
        id SERIAL PRIMARY KEY,
        user_id INTEGER NOT NULL REFERENCES users(id) ON DELETE CASCADE,
        stone_id TEXT NOT NULL,
        stone_name TEXT,
        stone_image TEXT,
        stone_material TEXT,
        stone_price_range INTEGER,
        created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
        UNIQUE(user_id, stone_id)
      );
      CREATE TABLE IF NOT EXISTS quote_requests (
        id SERIAL PRIMARY KEY,
        user_id INTEGER NOT NULL REFERENCES users(id) ON DELETE CASCADE,
        stone_id TEXT NOT NULL,
        stone_name TEXT,
        customer_name TEXT NOT NULL,
        phone TEXT NOT NULL,
        sqft_estimate REAL,
        notes TEXT,
        status TEXT NOT NULL DEFAULT 'pending',
        created_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
      );
      CREATE TABLE IF NOT EXISTS quote_files (
        id SERIAL PRIMARY KEY,
        quote_request_id INTEGER NOT NULL REFERENCES quote_requests(id) ON DELETE CASCADE,
        filename TEXT NOT NULL,
        original_name TEXT NOT NULL,
        uploaded_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
      );
      CREATE TABLE IF NOT EXISTS staged_messages (
        id TEXT PRIMARY KEY,
        contact_id TEXT NOT NULL,
        contact_name TEXT,
        phone TEXT,
        conversation_id TEXT,
        message TEXT NOT NULL,
        status TEXT DEFAULT 'pending',
        stage_name TEXT,
        context TEXT,
        created_at TIMESTAMPTZ DEFAULT NOW(),
        reviewed_at TIMESTAMPTZ,
        reviewed_by TEXT,
        sent_at TIMESTAMPTZ,
        notes TEXT
      );
      CREATE TABLE IF NOT EXISTS stone_prices (
        id SERIAL PRIMARY KEY,
        stone_id TEXT UNIQUE NOT NULL,
        stone_name TEXT NOT NULL,
        material TEXT,
        dealer_cost_sqft REAL,
        retail_sqft REAL,
        slab_width_inches REAL DEFAULT 130,
        slab_height_inches REAL DEFAULT 79,
        notes TEXT,
        updated_at TIMESTAMPTZ DEFAULT NOW(),
        updated_by TEXT
      );
      CREATE TABLE IF NOT EXISTS webhook_events (
        id SERIAL PRIMARY KEY,
        event_type TEXT,
        contact_id TEXT,
        conversation_id TEXT,
        payload JSONB,
        created_at TIMESTAMPTZ DEFAULT NOW()
      );
      CREATE TABLE IF NOT EXISTS messages (
        id TEXT PRIMARY KEY,
        contact_id TEXT NOT NULL,
        conversation_id TEXT,
        direction TEXT NOT NULL,
        body TEXT,
        message_type TEXT DEFAULT 'SMS',
        sent_at TIMESTAMPTZ NOT NULL,
        synced_at TIMESTAMPTZ DEFAULT NOW()
      );
      CREATE INDEX IF NOT EXISTS idx_messages_contact_id ON messages(contact_id);
      CREATE INDEX IF NOT EXISTS idx_messages_sent_at ON messages(sent_at DESC);
    `)
    // Migrations: add new columns if not present
    await pool.query(`
      ALTER TABLE quote_requests ADD COLUMN IF NOT EXISTS stones JSONB;
      ALTER TABLE quote_requests ADD COLUMN IF NOT EXISTS layout TEXT;
      ALTER TABLE quote_requests ADD COLUMN IF NOT EXISTS sink_type TEXT;
    `)
    _initialized = true
  }
  return pool
}

// Helper: query returning rows
export async function query(sql: string, params?: unknown[]) {
  const pool = await getDb()
  const result = await pool.query(sql, params)
  return result.rows
}

// Helper: query returning first row
export async function queryOne(sql: string, params?: unknown[]) {
  const rows = await query(sql, params)
  return rows[0] || null
}

// Helper: run a statement (insert/update/delete)
export async function run(sql: string, params?: unknown[]) {
  const pool = await getDb()
  const result = await pool.query(sql, params)
  return result
}
