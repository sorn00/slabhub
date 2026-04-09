import https from 'https'
import fs from 'fs'
import path from 'path'

const GHL_CONFIG_PATH = '/Users/sorn/.openclaw/workspace/agents/ghl/config.json'

interface GhlConfig {
  ghl: {
    apiToken: string
    locationId: string
    apiBase: string
    apiVersion: string
  }
}

function getConfig(): GhlConfig['ghl'] {
  const raw = fs.readFileSync(GHL_CONFIG_PATH, 'utf-8')
  const config: GhlConfig = JSON.parse(raw)
  return config.ghl
}

function httpsRequest(
  method: string,
  url: string,
  headers: Record<string, string>,
  body?: string
): Promise<{ status: number; data: unknown }> {
  return new Promise((resolve, reject) => {
    const parsed = new URL(url)
    const options: https.RequestOptions = {
      hostname: parsed.hostname,
      port: parsed.port || 443,
      path: parsed.pathname + parsed.search,
      method,
      headers,
    }

    const req = https.request(options, (res) => {
      let raw = ''
      res.on('data', (chunk) => (raw += chunk))
      res.on('end', () => {
        try {
          const data = raw ? JSON.parse(raw) : {}
          resolve({ status: res.statusCode || 0, data })
        } catch {
          resolve({ status: res.statusCode || 0, data: raw })
        }
      })
    })

    req.on('error', reject)
    if (body) req.write(body)
    req.end()
  })
}

export async function sendGhlMessage(params: {
  conversationId: string
  contactId?: string
  message: string
  type?: string
}): Promise<{ success: boolean; messageId?: string; error?: string }> {
  const cfg = getConfig()

  const body = JSON.stringify({
    type: params.type || 'SMS',
    conversationId: params.conversationId,
    contactId: params.contactId,
    message: params.message,
  })

  const result = await httpsRequest(
    'POST',
    `${cfg.apiBase}/conversations/messages`,
    {
      Authorization: `Bearer ${cfg.apiToken}`,
      'Content-Type': 'application/json',
      Version: cfg.apiVersion,
      'Content-Length': Buffer.byteLength(body).toString(),
    },
    body
  )

  if (result.status >= 200 && result.status < 300) {
    const data = result.data as { id?: string; messageId?: string }
    return { success: true, messageId: data?.id || data?.messageId }
  }

  return {
    success: false,
    error: `GHL API returned ${result.status}: ${JSON.stringify(result.data)}`,
  }
}

export async function getOrCreateConversation(contactId: string): Promise<string | null> {
  const cfg = getConfig()

  // Try to get existing conversation
  const listResult = await httpsRequest(
    'GET',
    `${cfg.apiBase}/conversations/search?contactId=${contactId}&locationId=${cfg.locationId}`,
    {
      Authorization: `Bearer ${cfg.apiToken}`,
      Version: cfg.apiVersion,
    }
  )

  if (listResult.status === 200) {
    const data = listResult.data as { conversations?: Array<{ id: string }> }
    if (data?.conversations?.length) {
      return data.conversations[0].id
    }
  }

  // Create new conversation
  const body = JSON.stringify({
    locationId: cfg.locationId,
    contactId,
  })

  const createResult = await httpsRequest(
    'POST',
    `${cfg.apiBase}/conversations/`,
    {
      Authorization: `Bearer ${cfg.apiToken}`,
      'Content-Type': 'application/json',
      Version: cfg.apiVersion,
      'Content-Length': Buffer.byteLength(body).toString(),
    },
    body
  )

  if (createResult.status >= 200 && createResult.status < 300) {
    const data = createResult.data as { conversation?: { id: string }; id?: string }
    return data?.conversation?.id || data?.id || null
  }

  return null
}
