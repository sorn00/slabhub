/**
 * db-postgres.ts
 * Postgres adapter for SlabHub — drop-in replacement for db.ts
 * Uses: @neondatabase/serverless (edge-compatible) or pg (Node.js)
 * Set DATABASE_URL env var to your Neon/Azure/Postgres connection string
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

export async function initSchema(): Promise<void> {
  const pool = getPool()
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
      notes TEXT,
      channel TEXT DEFAULT 'SMS',
      scheduled_for TIMESTAMPTZ
    );
    -- Add columns to existing tables if they don't exist yet
    ALTER TABLE staged_messages ADD COLUMN IF NOT EXISTS channel TEXT DEFAULT 'SMS';
    ALTER TABLE staged_messages ADD COLUMN IF NOT EXISTS scheduled_for TIMESTAMPTZ;
  `)
  console.log('[db-postgres] Schema initialized')
}

// ── Helper: query wrapper ─────────────────────────────────────────────────────
export async function query(sql: string, params?: unknown[]) {
  const pool = getPool()
  const result = await pool.query(sql, params)
  return result.rows
}

export async function queryOne(sql: string, params?: unknown[]) {
  const rows = await query(sql, params)
  return rows[0] || null
}
