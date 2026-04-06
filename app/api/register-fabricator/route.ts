import { NextRequest, NextResponse } from 'next/server'
import fs from 'fs'

export async function POST(req: NextRequest) {
  try {
    const body = await req.json()
    const stripeKey = process.env.STRIPE_SECRET_KEY || ''

    let customerId = body.customerId || ''

    // Create Stripe customer if real key
    if (stripeKey && stripeKey !== 'sk_test_placeholder' && !customerId) {
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
        customerId = 'cus_mock'
      }
    } else if (!customerId) {
      customerId = 'cus_mock'
    }

    const entry = {
      ...body,
      customerId,
      id: `fab_${Date.now()}`,
      createdAt: new Date().toISOString(),
      status: 'active',
    }

    const filePath = '/tmp/fabricator-registrations.json'
    let existing: unknown[] = []

    if (fs.existsSync(filePath)) {
      try {
        const raw = fs.readFileSync(filePath, 'utf-8')
        existing = JSON.parse(raw)
        if (!Array.isArray(existing)) existing = []
      } catch {
        existing = []
      }
    }

    existing.push(entry)
    fs.writeFileSync(filePath, JSON.stringify(existing, null, 2))

    return NextResponse.json({ success: true, id: entry.id, customerId })
  } catch (err) {
    console.error('register-fabricator error:', err)
    return NextResponse.json({ success: false, error: 'Registration failed' }, { status: 500 })
  }
}
