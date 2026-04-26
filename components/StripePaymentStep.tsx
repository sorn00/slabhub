'use client'

import { useState, useEffect } from 'react'
import { loadStripe } from '@stripe/stripe-js'
import {
  Elements,
  CardNumberElement,
  CardExpiryElement,
  CardCvcElement,
  useStripe,
  useElements,
} from '@stripe/react-stripe-js'

const stripePromise = loadStripe(process.env.NEXT_PUBLIC_STRIPE_PUBLISHABLE_KEY || 'pk_test_placeholder')

const CARD_ELEMENT_OPTIONS = {
  style: {
    base: {
      color: '#f1f5f9',
      fontFamily: '-apple-system, BlinkMacSystemFont, "Segoe UI", sans-serif',
      fontSize: '16px',
      '::placeholder': { color: '#64748b' },
      backgroundColor: 'transparent',
    },
    invalid: { color: '#f87171' },
  },
}

function PaymentForm({
  email,
  customerId,
  onSuccess,
  buttonLabel,
  businessName,
}: {
  email: string
  customerId: string
  onSuccess: () => void
  buttonLabel: string
  businessName?: string
}) {
  const stripe = useStripe()
  const elements = useElements()
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState('')
  const [clientSecret, setClientSecret] = useState('')
  const [cardholderName, setCardholderName] = useState(businessName || '')
  const [postalCode, setPostalCode] = useState('')

  useEffect(() => {
    const createIntent = async () => {
      try {
        const res = await fetch('/api/create-setup-intent', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ email, customerId }),
        })
        const data = await res.json()
        if (data.clientSecret) setClientSecret(data.clientSecret)
      } catch (e) {
        console.error('Failed to create setup intent:', e)
      }
    }
    createIntent()
  }, [email, customerId])

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault()
    if (!stripe || !elements) return

    setLoading(true)
    setError('')

    const cardNumberElement = elements.getElement(CardNumberElement)
    if (!cardNumberElement) { setLoading(false); return }

    if (clientSecret && clientSecret !== 'mock_secret') {
      const { error: stripeError } = await stripe.confirmCardSetup(clientSecret, {
        payment_method: {
          card: cardNumberElement,
          billing_details: {
            email,
            name: cardholderName || businessName,
            address: postalCode ? { postal_code: postalCode } : undefined,
          },
        },
      })
      if (stripeError) {
        setError(stripeError.message || 'Payment setup failed')
        setLoading(false)
        return
      }
    }

    // In dev/placeholder mode, just proceed
    setLoading(false)
    onSuccess()
  }

  return (
    <form onSubmit={handleSubmit} className="space-y-5">
      <div className="grid grid-cols-1 gap-4">
        <div>
          <label className="block text-slate-300 text-sm font-medium mb-2">Name on card</label>
          <input
            type="text"
            value={cardholderName}
            onChange={e => setCardholderName(e.target.value)}
            placeholder="Business or cardholder name"
            className="w-full bg-slate-950 border border-slate-600 rounded-lg px-4 py-3 text-white placeholder-slate-500 focus:outline-none focus:border-amber-500"
          />
        </div>

        <div>
          <label className="block text-slate-300 text-sm font-medium mb-2">Card number</label>
          <div className="bg-slate-950 border border-slate-600 rounded-lg px-4 py-4 focus-within:border-amber-500 transition-colors">
            <CardNumberElement options={{ ...CARD_ELEMENT_OPTIONS, showIcon: true }} />
          </div>
        </div>

        <div className="grid grid-cols-3 gap-3">
          <div>
            <label className="block text-slate-300 text-sm font-medium mb-2">Expiry</label>
            <div className="bg-slate-950 border border-slate-600 rounded-lg px-4 py-4 focus-within:border-amber-500 transition-colors">
              <CardExpiryElement options={CARD_ELEMENT_OPTIONS} />
            </div>
          </div>
          <div>
            <label className="block text-slate-300 text-sm font-medium mb-2">CVC</label>
            <div className="bg-slate-950 border border-slate-600 rounded-lg px-4 py-4 focus-within:border-amber-500 transition-colors">
              <CardCvcElement options={CARD_ELEMENT_OPTIONS} />
            </div>
          </div>
          <div>
            <label className="block text-slate-300 text-sm font-medium mb-2">ZIP</label>
            <input
              type="text"
              inputMode="numeric"
              value={postalCode}
              onChange={e => setPostalCode(e.target.value.replace(/\D/g, '').slice(0, 10))}
              placeholder="ZIP"
              className="w-full bg-slate-950 border border-slate-600 rounded-lg px-4 py-3 text-white placeholder-slate-500 focus:outline-none focus:border-amber-500"
            />
          </div>
        </div>
      </div>

      <div className="rounded-xl border border-blue-500/25 bg-blue-500/10 p-4">
        <p className="text-blue-100 text-sm leading-relaxed">
          By saving this card, you authorize Quarriva to charge it only after you accept a specific lead offer by text.
          Projects with measurements ready for quote are $200 and standard appointment leads are $125.
        </p>
      </div>
      {error && <p className="text-red-400 text-sm mb-4">{error}</p>}
      <button
        type="submit"
        disabled={!stripe || loading}
        className="w-full bg-amber-500 hover:bg-amber-400 disabled:opacity-50 disabled:cursor-not-allowed text-slate-900 font-bold py-3 rounded-lg transition-colors"
      >
        {loading ? 'Saving card...' : buttonLabel}
      </button>
      <p className="text-center text-slate-500 text-xs mt-3">
        Secured by Stripe. No charge today.
      </p>
    </form>
  )
}

export default function StripePaymentStep({
  email,
  customerId,
  onSuccess,
  buttonLabel = 'Save Card & Complete Registration',
  businessName,
}: {
  email: string
  customerId: string
  onSuccess: () => void
  buttonLabel?: string
  businessName?: string
}) {
  return (
    <Elements stripe={stripePromise}>
      <PaymentForm
        email={email}
        customerId={customerId}
        onSuccess={onSuccess}
        buttonLabel={buttonLabel}
        businessName={businessName}
      />
    </Elements>
  )
}
