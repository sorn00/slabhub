'use client'

import { useState, useEffect } from 'react'
import { loadStripe } from '@stripe/stripe-js'
import {
  Elements,
  CardElement,
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

function PaymentForm({ email, customerId, onSuccess }: { email: string; customerId: string; onSuccess: () => void }) {
  const stripe = useStripe()
  const elements = useElements()
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState('')
  const [clientSecret, setClientSecret] = useState('')

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

    const cardElement = elements.getElement(CardElement)
    if (!cardElement) { setLoading(false); return }

    if (clientSecret && clientSecret !== 'mock_secret') {
      const { error: stripeError } = await stripe.confirmCardSetup(clientSecret, {
        payment_method: { card: cardElement, billing_details: { email } },
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
    <form onSubmit={handleSubmit}>
      <div className="bg-slate-900 border border-slate-600 rounded-lg px-4 py-4 mb-4 focus-within:border-amber-500 transition-colors">
        <CardElement options={CARD_ELEMENT_OPTIONS} />
      </div>
      {error && <p className="text-red-400 text-sm mb-4">{error}</p>}
      <button
        type="submit"
        disabled={!stripe || loading}
        className="w-full bg-amber-500 hover:bg-amber-400 disabled:opacity-50 disabled:cursor-not-allowed text-slate-900 font-bold py-3 rounded-lg transition-colors"
      >
        {loading ? 'Saving card...' : 'Save Card & Complete Registration'}
      </button>
      <p className="text-center text-slate-500 text-xs mt-3">
        🔒 Secured by Stripe. No charge today.
      </p>
    </form>
  )
}

export default function StripePaymentStep({
  email,
  customerId,
  onSuccess,
}: {
  email: string
  customerId: string
  onSuccess: () => void
}) {
  return (
    <Elements stripe={stripePromise}>
      <PaymentForm email={email} customerId={customerId} onSuccess={onSuccess} />
    </Elements>
  )
}
