#!/usr/bin/env node
/**
 * One-time script: create messages table and backfill from GHL
 */
const { Pool } = require('/Users/sorn/.openclaw/workspace/slabhub/node_modules/pg');

const pool = new Pool({
  connectionString: 'postgresql://neondb_owner:npg_JW5ns7puXzoN@ep-silent-feather-anpv5jzh.c-6.us-east-1.aws.neon.tech/neondb?sslmode=require',
  ssl: { rejectUnauthorized: false }
});

const GHL_TOKEN = 'pit-73ab457e-2144-4120-9d2e-b9e408ecbea4';
const LOC_ID = 'qhOziWzmOO7mYbl3U7tm';

async function ghlFetch(url) {
  const res = await fetch(url, {
    headers: { Authorization: `Bearer ${GHL_TOKEN}`, Version: '2021-04-15' }
  });
  if (!res.ok) {
    const t = await res.text();
    throw new Error(`GHL ${res.status}: ${t.substring(0, 200)}`);
  }
  return res.json();
}

async function saveMessages(messages, contactId, conversationId) {
  let saved = 0;
  for (const m of messages) {
    const id = m.id || `${contactId}-${m.dateAdded}`;
    const direction = (m.direction === 1 || m.direction === 'inbound') ? 'inbound' : 'outbound';
    const body = m.body || '';
    const sentAt = m.dateAdded ? new Date(m.dateAdded).toISOString() : new Date().toISOString();
    const msgType = m.messageType || m.type || 'SMS';
    if (!body.trim()) continue;
    if (body.includes('Opportunity')) continue;
    try {
      await pool.query(
        `INSERT INTO messages (id, contact_id, conversation_id, direction, body, message_type, sent_at)
         VALUES ($1, $2, $3, $4, $5, $6, $7)
         ON CONFLICT (id) DO NOTHING`,
        [id, contactId, conversationId || null, direction, body, String(msgType), sentAt]
      );
      saved++;
    } catch (e) {
      console.error(`  Failed to insert message ${id}:`, e.message);
    }
  }
  return saved;
}

async function main() {
  console.log('Creating messages table...');
  await pool.query(`
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
  `);
  console.log('Messages table ready.');

  // Backfill: get top 50 contacts from staged_messages (most recently active)
  console.log('\nFetching active contacts from staged_messages...');
  const contactsRes = await pool.query(`
    SELECT DISTINCT ON (contact_id) contact_id, contact_name, conversation_id
    FROM staged_messages
    WHERE contact_id IS NOT NULL
    ORDER BY contact_id, created_at DESC
    LIMIT 50
  `);
  const contacts = contactsRes.rows;
  console.log(`Found ${contacts.length} contacts to backfill.`);

  let totalSaved = 0;
  let processed = 0;

  for (const contact of contacts) {
    processed++;
    const { contact_id, contact_name, conversation_id } = contact;
    console.log(`\n[${processed}/${contacts.length}] ${contact_name || contact_id}`);

    try {
      let convId = conversation_id;

      // Get conversation if not known
      if (!convId) {
        const searchData = await ghlFetch(
          `https://services.leadconnectorhq.com/conversations/search?locationId=${LOC_ID}&contactId=${contact_id}&limit=1`
        );
        convId = searchData.conversations?.[0]?.id;
      }

      if (!convId) {
        console.log('  No conversation found, skipping.');
        continue;
      }

      // Fetch messages
      const msgsData = await ghlFetch(
        `https://services.leadconnectorhq.com/conversations/${convId}/messages?limit=20`
      );
      const msgs = msgsData.messages?.messages || [];
      console.log(`  Found ${msgs.length} messages in conversation ${convId}`);

      const saved = await saveMessages(msgs, contact_id, convId);
      console.log(`  Saved ${saved} messages.`);
      totalSaved += saved;

      // Small delay to avoid rate limiting
      await new Promise(r => setTimeout(r, 200));
    } catch (e) {
      console.error(`  Error for contact ${contact_id}:`, e.message);
    }
  }

  // Final count
  const countRes = await pool.query('SELECT COUNT(*) FROM messages');
  const totalRows = countRes.rows[0].count;

  console.log(`\n✅ Backfill complete!`);
  console.log(`   Saved in this run: ${totalSaved}`);
  console.log(`   Total messages in DB: ${totalRows}`);

  await pool.end();
}

main().catch(e => {
  console.error('Fatal:', e);
  process.exit(1);
});
