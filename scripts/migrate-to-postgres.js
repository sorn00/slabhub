#!/usr/bin/env node
/**
 * migrate-to-postgres.js
 * Migrates SlabHub SQLite data to Postgres
 * Usage: DATABASE_URL=postgresql://... node scripts/migrate-to-postgres.js
 */
'use strict';

const { Pool } = require('pg');
const path = require('path');

if (!process.env.DATABASE_URL) {
  console.error('Set DATABASE_URL environment variable first');
  process.exit(1);
}

const pool = new Pool({
  connectionString: process.env.DATABASE_URL,
  ssl: { rejectUnauthorized: false }
});

async function main() {
  console.log('Connecting to Postgres...');
  await pool.query('SELECT 1');
  console.log('Connected ✅');

  console.log('\nCreating schema...');
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
  `);
  console.log('Schema created ✅');

  // Migrate local SQLite data if it exists
  try {
    const Database = require('better-sqlite3');
    const dbPath = path.join(__dirname, '..', 'data', 'slabhub.db');
    const sqlite = new Database(dbPath);

    const users = sqlite.prepare('SELECT * FROM users').all();
    if (users.length > 0) {
      console.log(`\nMigrating ${users.length} users...`);
      for (const u of users) {
        await pool.query(
          'INSERT INTO users (name, email, password_hash, role, created_at) VALUES ($1,$2,$3,$4,$5) ON CONFLICT (email) DO NOTHING',
          [u.name, u.email, u.password_hash, u.role, u.created_at]
        );
      }
      console.log('Users migrated ✅');
    }

    const staged = sqlite.prepare('SELECT * FROM staged_messages').all();
    if (staged.length > 0) {
      console.log(`Migrating ${staged.length} staged messages...`);
      for (const s of staged) {
        await pool.query(
          'INSERT INTO staged_messages (id,contact_id,contact_name,phone,conversation_id,message,status,stage_name,context,notes) VALUES ($1,$2,$3,$4,$5,$6,$7,$8,$9,$10) ON CONFLICT (id) DO NOTHING',
          [s.id, s.contact_id, s.contact_name, s.phone, s.conversation_id, s.message, s.status, s.stage_name, s.context, s.notes]
        );
      }
      console.log('Staged messages migrated ✅');
    }

    sqlite.close();
  } catch(e) {
    console.log('No local SQLite data to migrate (or better-sqlite3 not available):', e.message);
  }

  console.log('\n✅ Migration complete! Add DATABASE_URL to Vercel env vars and deploy.');
  await pool.end();
}

main().catch(e => { console.error('Migration failed:', e.message); process.exit(1); });
