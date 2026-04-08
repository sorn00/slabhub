import { NextRequest, NextResponse } from 'next/server';
import { run } from '@/lib/db';

const TELEGRAM_TOKEN = '8505355085:AAHvIPt6KPoRosDoYavhObjhsylK_qp96Q4';
const TELEGRAM_CHAT = '5027057965';
const GHL_LOCATION_ID = 'qhOziWzmOO7mYbl3U7tm';

async function sendTelegram(msg: string) {
  try {
    await fetch(`https://api.telegram.org/bot${TELEGRAM_TOKEN}/sendMessage`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ chat_id: TELEGRAM_CHAT, text: msg, parse_mode: 'HTML' }),
    });
  } catch (err) {
    console.error('Telegram send error:', err);
  }
}

export async function POST(req: NextRequest) {
  // Optional: log secret header for future verification setup
  const secret = req.headers.get('x-ghl-signature') || req.headers.get('x-webhook-secret');
  if (secret) {
    console.log('GHL webhook secret header received:', secret.substring(0, 8) + '...');
  }

  let body: Record<string, unknown>;
  try {
    body = await req.json();
  } catch {
    return NextResponse.json({ ok: false, error: 'Invalid JSON' }, { status: 400 });
  }

  const { type, locationId } = body as { type?: string; locationId?: string };

  // Only process our location
  if (locationId && locationId !== GHL_LOCATION_ID) {
    console.log(`Ignoring webhook for locationId: ${locationId}`);
    return NextResponse.json({ ok: true });
  }

  try {
    const isInbound =
      type === 'InboundMessage' ||
      type === 'LC_EMAIL' ||
      (body as Record<string, unknown>).direction === 'inbound';

    if (isInbound) {
      // Save to webhook_events
      await run(
        `INSERT INTO webhook_events (event_type, contact_id, conversation_id, payload, created_at)
         VALUES ($1, $2, $3, $4, NOW())`,
        [
          type,
          (body as Record<string, unknown>).contactId,
          (body as Record<string, unknown>).conversationId,
          JSON.stringify(body),
        ]
      );

      // Send Telegram HOT LEAD alert
      const firstName = (body as Record<string, unknown>).firstName as string | undefined;
      const lastName = (body as Record<string, unknown>).lastName as string | undefined;
      const phone = (body as Record<string, unknown>).phone as string | undefined;
      const rawMsg =
        ((body as Record<string, unknown>).message as string) ||
        ((body as Record<string, unknown>).body as string) ||
        '';
      const name = firstName ? `${firstName} ${lastName || ''}`.trim() : phone || 'Unknown';

      const alert =
        `🔴 <b>HOT LEAD — New Message</b>\n\n` +
        `<b>${name}</b>\n` +
        `📱 ${phone || 'no phone'}\n\n` +
        `"${rawMsg.substring(0, 200)}"\n\n` +
        `<a href="https://quarriva.com/crm/leads">→ View in CRM</a>`;
      await sendTelegram(alert);
    }

    // Save inbound/outbound messages to messages table for fast local reads
    if (type === 'InboundMessage' || type === 'OutboundMessage') {
      const b = body as Record<string, unknown>;
      const msgContactId = b.contactId as string | undefined;
      if (msgContactId) {
        const msgId = (b.messageId || b.id || `${msgContactId}-${Date.now()}`) as string;
        const rawBody = ((b.message || b.body || '') as string);
        const msgType = ((b.messageType || 'SMS') as string);
        const direction = type === 'InboundMessage' ? 'inbound' : 'outbound';
        try {
          await run(
            `INSERT INTO messages (id, contact_id, conversation_id, direction, body, message_type, sent_at)
             VALUES ($1, $2, $3, $4, $5, $6, NOW())
             ON CONFLICT (id) DO NOTHING`,
            [
              msgId,
              msgContactId,
              (b.conversationId as string) || null,
              direction,
              rawBody,
              msgType,
            ]
          );
        } catch (msgErr) {
          console.error('Failed to save message to messages table:', msgErr);
        }
      }
    }

    if (type === 'ContactCreate') {
      await run(
        `INSERT INTO webhook_events (event_type, contact_id, payload, created_at)
         VALUES ($1, $2, $3, NOW())`,
        [type, (body as Record<string, unknown>).id, JSON.stringify(body)]
      );

      const firstName = (body as Record<string, unknown>).firstName as string | undefined;
      const lastName = (body as Record<string, unknown>).lastName as string | undefined;
      const phone = (body as Record<string, unknown>).phone as string | undefined;
      const name =
        `${firstName || ''} ${lastName || ''}`.trim() || phone || 'Unknown';

      await sendTelegram(
        `🟡 <b>New Lead</b>: ${name}\n📱 ${phone || 'no phone'}\n\n` +
        `<a href="https://quarriva.com/crm/leads">→ View in CRM</a>`
      );
    }

    if (type === 'OpportunityStageUpdate') {
      await run(
        `INSERT INTO webhook_events (event_type, contact_id, payload, created_at)
         VALUES ($1, $2, $3, NOW())`,
        [type, (body as Record<string, unknown>).contactId, JSON.stringify(body)]
      );
    }
  } catch (err) {
    console.error('Webhook processing error:', err);
    // Still return 200 so GHL doesn't retry aggressively
  }

  return NextResponse.json({ ok: true });
}

// GET for GHL webhook verification / health check
export async function GET() {
  return NextResponse.json({ ok: true, service: 'quarriva-webhook' });
}
