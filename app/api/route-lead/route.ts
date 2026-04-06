/**
 * route-lead/route.ts
 * SlabHub — Inbound Lead Routing API
 *
 * POST /api/route-lead
 * Receives a new lead, matches to fabricator, and sends Telegram alert to Sorn.
 */

import { NextRequest, NextResponse } from 'next/server';

const NOTIFY_SERVER = 'http://localhost:3002';

interface LeadPayload {
  customerName?: string;
  name?: string;
  phone?: string;
  customerPhone?: string;
  zip?: string;
  zipCode?: string;
  state?: string;
  matchedState?: string;
  material?: string;
  sqft?: number | string;
  size?: number | string;
  stones?: string[] | string;
  fabricatorName?: string;
  assignedFabricator?: string;
  [key: string]: unknown;
}

export async function POST(req: NextRequest) {
  try {
    const lead: LeadPayload = await req.json();

    if (!lead || (!lead.customerName && !lead.name)) {
      return NextResponse.json(
        { error: 'Missing required field: customerName or name' },
        { status: 400 }
      );
    }

    // TODO: Add fabricator matching logic here
    // const matched = await matchFabricator(lead.zip);
    // lead.fabricatorName = matched.name;

    // Notify Sorn via Telegram
    let notifyResult: { sent?: boolean; method?: string; error?: string } = {};
    try {
      const notifyRes = await fetch(`${NOTIFY_SERVER}/notify/lead`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(lead),
        signal: AbortSignal.timeout(5000),
      });
      notifyResult = await notifyRes.json();
    } catch (notifyErr) {
      console.warn('[route-lead] Telegram notify failed:', notifyErr);
    }

    return NextResponse.json({
      success: true,
      lead,
      telegram: notifyResult,
    });
  } catch (err) {
    console.error('[route-lead] Error:', err);
    return NextResponse.json(
      { error: 'Internal server error' },
      { status: 500 }
    );
  }
}
