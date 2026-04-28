import { NextRequest, NextResponse } from 'next/server'
import { getPool } from '@/lib/db'
import { createGhlContact } from '@/lib/ghl-contacts'

export async function POST(req: NextRequest) {
  try {
    const body = await req.json()
    if (!body.businessName || !body.email) {
      return NextResponse.json({ success: false, error: 'Business name and email are required' }, { status: 400 })
    }

    const stripeKey = process.env.STRIPE_SECRET_KEY || ''
    const needsPaymentCustomer = body.step === 'pre-payment' || body.step === 'payment-complete'
    const isStripeConfigured = needsPaymentCustomer && stripeKey && stripeKey !== 'sk_test_placeholder'

    let customerId = body.customerId || ''

    // Create Stripe customer if real key
    if (isStripeConfigured && !customerId) {
      try {
        // eslint-disable-next-line @typescript-eslint/no-explicit-any
        const StripeLib = (await import('stripe')).default as any
        const stripe = new StripeLib(stripeKey, { apiVersion: '2024-04-10' })
        const customer = await stripe.customers.create({
          email: body.email,
          name: body.businessName,
          phone: body.phone,
          metadata: {
            businessName: body.businessName,
            ownerName: body.ownerName,
            address: body.address || '',
            city: body.city || '',
            state: body.state,
            zip: body.zip || '',
            radius: body.radius,
          },
        })
        customerId = customer.id
      } catch (stripeErr) {
        console.error('Stripe customer creation failed:', stripeErr)
        return NextResponse.json({ success: false, error: 'Payment customer creation failed' }, { status: 502 })
      }
    } else if (needsPaymentCustomer && !customerId) {
      customerId = 'cus_mock'
    }

    const status = body.step === 'payment-complete'
      ? 'payment_method_saved'
      : body.step === 'trial-claim'
        ? 'trial_claim_requested'
        : 'pending_payment'
    const pool = getPool()

    await pool.query(`
      CREATE TABLE IF NOT EXISTS fabricator_registrations (
        id SERIAL PRIMARY KEY,
        business_name TEXT NOT NULL,
        owner_name TEXT,
        phone TEXT,
        email TEXT NOT NULL,
        city TEXT,
        state TEXT,
        zip TEXT,
        radius TEXT,
        customer_id TEXT,
        status TEXT NOT NULL DEFAULT 'pending_payment',
        payload JSONB NOT NULL,
        created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
        updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
      );
    `)

    const result = await pool.query(`
      INSERT INTO fabricator_registrations (
        business_name, owner_name, phone, email, city, state, zip, radius, customer_id, status, payload
      )
      VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9, $10, $11)
      RETURNING id
    `, [
      body.businessName,
      body.ownerName || null,
      body.phone || null,
      body.email,
      body.city || null,
      body.state || null,
      body.zip || null,
      body.radius || null,
      customerId,
      status,
      JSON.stringify({ ...body, customerId, status }),
    ])

    await createGhlContact({
      name: body.ownerName || body.businessName,
      email: body.email,
      phone: body.phone,
      companyName: body.businessName,
      source: body.step === 'trial-claim' ? 'Quarriva Listing Claim' : 'Quarriva Card Setup',
      tags: body.step === 'trial-claim'
        ? ['quarriva:fabricator_claim', 'quarriva:first_opportunity_free', 'partner-outreach']
        : ['quarriva:fabricator_card_setup', 'quarriva:launch_2026_04_27', 'partner-outreach'],
    })

    return NextResponse.json({ success: true, id: result.rows[0].id, customerId })
  } catch (err) {
    console.error('register-fabricator error:', err)
    return NextResponse.json({ success: false, error: 'Registration failed' }, { status: 500 })
  }
}
