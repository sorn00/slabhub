import { NextRequest, NextResponse } from 'next/server'

export async function POST(req: NextRequest) {
  try {
    const { email, customerId } = await req.json()

    const stripeKey = process.env.STRIPE_SECRET_KEY || ''

    // If using placeholder key, return a mock secret
    if (!stripeKey || stripeKey === 'sk_test_placeholder') {
      return NextResponse.json({ clientSecret: 'mock_secret', customerId: customerId || 'cus_mock' })
    }

    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    const StripeLib = (await import('stripe')).default as any
    const stripe = new StripeLib(stripeKey, { apiVersion: '2024-04-10' })

    let customer
    if (customerId) {
      customer = { id: customerId }
    } else {
      customer = await stripe.customers.create({ email })
    }

    const setupIntent = await stripe.setupIntents.create({
      customer: customer.id,
      payment_method_types: ['card'],
    })

    return NextResponse.json({
      clientSecret: setupIntent.client_secret,
      customerId: customer.id,
    })
  } catch (err) {
    console.error('create-setup-intent error:', err)
    return NextResponse.json({ error: 'Payment setup failed' }, { status: 502 })
  }
}
