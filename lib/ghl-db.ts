import Database from 'better-sqlite3'
import path from 'path'

const GHL_DB_PATH = '/Users/sorn/.openclaw/workspace/agents/ghl/ghl.db'

let _ghlDb: Database.Database | null = null

export function getGhlDb(): Database.Database {
  if (!_ghlDb) {
    _ghlDb = new Database(GHL_DB_PATH, { readonly: true })
    _ghlDb.pragma('journal_mode = WAL')
  }
  return _ghlDb
}

export interface GhlContact {
  id: string
  name: string
  phone: string
  email: string
  tags: string
  created_at: string
  updated_at: string
}

export interface GhlOpportunity {
  id: string
  contact_id: string
  contact_name: string
  pipeline_id: string
  stage_id: string
  stage_name: string
  status: string
  monetary_value: number
  updated_at: string
}

export interface GhlMessage {
  id: string
  conversation_id: string
  contact_id: string
  direction: string
  body: string
  attachments: string
  sent_at: string
}

export interface GhlConversation {
  id: string
  contact_id: string
  last_message_at: string
  last_message_body: string
  unread_count: number
}

export function getLeadsWithStage(): Array<GhlContact & {
  stage_name: string | null
  stage_id: string | null
  last_message: string | null
  last_message_at: string | null
  conversation_id: string | null
  days_since_contact: number | null
}> {
  const db = getGhlDb()
  const rows = db.prepare(`
    SELECT
      c.id,
      c.name,
      c.phone,
      c.email,
      c.tags,
      c.created_at,
      c.updated_at,
      o.stage_name,
      o.stage_id,
      conv.last_message_body as last_message,
      conv.last_message_at,
      conv.id as conversation_id,
      CASE
        WHEN conv.last_message_at IS NOT NULL
        THEN CAST((julianday('now') - julianday(conv.last_message_at)) AS INTEGER)
        ELSE NULL
      END as days_since_contact
    FROM contacts c
    LEFT JOIN opportunities o ON o.contact_id = c.id
    LEFT JOIN conversations conv ON conv.contact_id = c.id
    ORDER BY conv.last_message_at DESC NULLS LAST
  `).all() as ReturnType<typeof getLeadsWithStage>
  return rows
}

export function getContactMessages(contactId: string, limit = 10): GhlMessage[] {
  const db = getGhlDb()
  return db.prepare(`
    SELECT m.* FROM messages m
    WHERE m.contact_id = ?
    ORDER BY m.sent_at DESC
    LIMIT ?
  `).all(contactId, limit) as GhlMessage[]
}

export function getStageCounts(): Record<string, number> {
  const db = getGhlDb()
  const rows = db.prepare(`
    SELECT stage_name, COUNT(*) as count
    FROM opportunities
    WHERE stage_name IS NOT NULL
    GROUP BY stage_name
  `).all() as Array<{ stage_name: string; count: number }>

  return rows.reduce((acc, row) => {
    acc[row.stage_name] = row.count
    return acc
  }, {} as Record<string, number>)
}

export function getContactById(contactId: string): GhlContact | null {
  const db = getGhlDb()
  return db.prepare('SELECT * FROM contacts WHERE id = ?').get(contactId) as GhlContact | null
}

export function getConversationByContact(contactId: string): GhlConversation | null {
  const db = getGhlDb()
  return db.prepare('SELECT * FROM conversations WHERE contact_id = ? LIMIT 1').get(contactId) as GhlConversation | null
}
