'use client'

import { Suspense, useMemo, useState } from 'react'
import { useSearchParams } from 'next/navigation'
import Link from 'next/link'
import dynamic from 'next/dynamic'

const StripePaymentStep = dynamic(() => import('@/components/StripePaymentStep'), { ssr: false })

type SetupState = 'details' | 'card' | 'done'

function FabricatorCardSetupContent() {
  const searchParams = useSearchParams()
  const [state, setState] = useState<SetupState>('details')
  const [customerId, setCustomerId] = useState('')
  const [registrationError, setRegistrationError] = useState('')
  const [data, setData] = useState(() => ({
    businessName: searchParams.get('businessName') || '',
    ownerName: searchParams.get('ownerName') || '',
    phone: searchParams.get('phone') || '',
    email: searchParams.get('email') || '',
    listingSlug: searchParams.get('listingSlug') || '',
  }))
  const hasClaimContext = Boolean(searchParams.get('listingSlug') && searchParams.get('businessName'))

  const listingUrl = useMemo(() => {
    return data.listingSlug ? `/directory/${data.listingSlug}` : '/directory'
  }, [data.listingSlug])

  const update = (key: keyof typeof data, value: string) => {
    setData(prev => ({ ...prev, [key]: value }))
  }

  const createCustomer = async () => {
    try {
      setRegistrationError('')
      const res = await fetch('/api/register-fabricator', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          businessName: data.businessName,
          ownerName: data.ownerName,
          phone: data.phone,
          email: data.email,
          listingSlug: data.listingSlug,
          radius: 'claim-only',
          step: 'pre-payment',
          source: 'directory-claim-card-setup',
        }),
      })
      const json = await res.json()
      if (!res.ok) {
        setRegistrationError(json.error || 'Card setup could not start')
        return
      }
      setCustomerId(json.customerId || '')
      setState('card')
    } catch (err) {
      console.error(err)
      setRegistrationError('Card setup could not start')
    }
  }

  const completeSetup = async () => {
    try {
      setRegistrationError('')
      const res = await fetch('/api/register-fabricator', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          businessName: data.businessName,
          ownerName: data.ownerName,
          phone: data.phone,
          email: data.email,
          listingSlug: data.listingSlug,
          customerId,
          radius: 'claim-only',
          step: 'payment-complete',
          source: 'directory-claim-card-setup',
        }),
      })
      const json = await res.json()
      if (!res.ok) {
        setRegistrationError(json.error || 'Card setup could not be completed')
        return
      }
      setState('done')
    } catch (err) {
      console.error(err)
      setRegistrationError('Card setup could not be completed')
    }
  }

  const inputClass = 'w-full bg-slate-900 border border-slate-700 rounded-lg px-4 py-3 text-white placeholder-slate-500 focus:outline-none focus:border-amber-500'

  return (
    <div className="max-w-xl mx-auto px-4 py-12">
      <div className="mb-8">
        <p className="text-amber-400 text-sm font-semibold mb-2">Quarriva lead claiming</p>
        <h1 className="text-3xl font-bold text-white mb-2">Set up card for accepted leads</h1>
        <p className="text-slate-400">
          No monthly retainer. No charge today. Your card is used only after you accept a lead offer by text.
        </p>
      </div>

      <div className="bg-slate-800/60 border border-slate-700 rounded-2xl p-6 md:p-8">
        {!hasClaimContext && (
          <div>
            <h2 className="text-xl font-bold text-white mb-2">Start by claiming your listing</h2>
            <p className="text-slate-400 text-sm mb-6">
              Card setup is part of the listing claim flow. Find your shop in the Quarriva directory, submit the claim request, then continue here with the listing attached.
            </p>
            <div className="bg-slate-900/70 border border-slate-700 rounded-xl p-4 mb-6">
              <h3 className="text-white text-sm font-semibold mb-3">How the flow works</h3>
              <div className="space-y-3 text-sm text-slate-400">
                <p><span className="text-amber-400 font-medium">1.</span> Claim your Quarriva listing for free.</p>
                <p><span className="text-amber-400 font-medium">2.</span> Save a card so accepted leads can be billed.</p>
                <p><span className="text-amber-400 font-medium">3.</span> Receive lead offers by text and reply YES or PASS.</p>
              </div>
            </div>
            <Link
              href="/directory"
              className="block w-full bg-amber-500 hover:bg-amber-400 text-slate-900 font-bold py-3 rounded-lg transition-colors text-center"
            >
              Find and Claim Your Listing
            </Link>
          </div>
        )}

        {hasClaimContext && state === 'details' && (
          <div>
            <h2 className="text-xl font-bold text-white mb-2">Confirm your billing contact</h2>
            <p className="text-slate-400 text-sm mb-6">
              This connects your claimed listing to Stripe so future lead claims can be billed after you reply YES.
            </p>

            <div className="flex flex-col gap-4">
              <input
                type="text"
                placeholder="Business name *"
                value={data.businessName}
                onChange={e => update('businessName', e.target.value)}
                className={inputClass}
              />
              <input
                type="text"
                placeholder="Owner or manager name"
                value={data.ownerName}
                onChange={e => update('ownerName', e.target.value)}
                className={inputClass}
              />
              <input
                type="tel"
                placeholder="Phone number"
                value={data.phone}
                onChange={e => update('phone', e.target.value)}
                className={inputClass}
              />
              <input
                type="email"
                placeholder="Billing email *"
                value={data.email}
                onChange={e => update('email', e.target.value)}
                className={inputClass}
              />

              <div className="bg-amber-500/10 border border-amber-500/25 rounded-xl p-4">
                <p className="text-amber-100 text-sm leading-relaxed">
                  Lead pricing: $200 for projects with measurements ready for quote and $125 for standard appointment leads. You see the lead type before accepting.
                </p>
              </div>

              <div className="bg-slate-950 border border-slate-700 rounded-xl p-4 text-left">
                <div className="flex items-center justify-between gap-3 mb-3">
                  <p className="text-white text-sm font-semibold">Example lead text</p>
                  <span className="text-slate-500 text-xs">Sample</span>
                </div>
                <div className="rounded-2xl rounded-tl-md bg-slate-800 border border-slate-700 p-4">
                  <p className="text-slate-200 text-sm leading-relaxed">
                    Quarriva lead for {data.businessName}: Bridgeport homeowner needs quartz countertops. Project with measurements ready for quote, $200 if accepted. Reply YES to claim or PASS to skip.
                  </p>
                </div>
              </div>

              {registrationError && <p className="text-red-400 text-sm">{registrationError}</p>}

              <button
                onClick={createCustomer}
                disabled={!data.businessName || !data.email}
                className="bg-amber-500 hover:bg-amber-400 disabled:opacity-50 disabled:cursor-not-allowed text-slate-900 font-bold py-3 rounded-lg transition-colors"
              >
                Continue to Secure Card Setup
              </button>

              <Link href={listingUrl} className="text-center text-slate-500 hover:text-slate-300 text-sm transition-colors">
                Back to listing
              </Link>
            </div>
          </div>
        )}

        {hasClaimContext && state === 'card' && (
          <div>
            <div className="flex items-start justify-between gap-4 mb-6">
              <div>
                <h2 className="text-xl font-bold text-white mb-2">Save card for lead claims</h2>
                <p className="text-slate-400 text-sm">
                  Stripe securely stores the payment method. Quarriva charges only when you accept a specific lead.
                </p>
              </div>
              <div className="shrink-0 rounded-lg border border-slate-600 bg-slate-900 px-3 py-2 text-slate-300 text-xs font-semibold">
                Stripe
              </div>
            </div>
            <div className="bg-slate-900/70 border border-slate-700 rounded-xl p-4 text-sm text-slate-400 space-y-2 mb-5">
              <p><span className="text-slate-300 font-medium">Business:</span> {data.businessName}</p>
              <p><span className="text-slate-300 font-medium">Billing email:</span> {data.email}</p>
              <p><span className="text-slate-300 font-medium">Today:</span> $0 due</p>
            </div>
            <div className="bg-slate-950 border border-slate-700 rounded-xl p-4 mb-5 text-left">
              <p className="text-white text-sm font-semibold mb-3">Example lead text</p>
              <div className="rounded-2xl rounded-tl-md bg-slate-800 border border-slate-700 p-4">
                <p className="text-slate-200 text-sm leading-relaxed">
                  Quarriva lead for {data.businessName}: Bridgeport homeowner needs quartz countertops. Project with measurements ready for quote, $200 if accepted. Reply YES to claim or PASS to skip.
                </p>
              </div>
            </div>
            <StripePaymentStep
              email={data.email}
              customerId={customerId}
              onSuccess={completeSetup}
              buttonLabel="Save Card for Lead Claims"
              businessName={data.businessName}
            />
            {registrationError && <p className="text-red-400 text-sm mt-3">{registrationError}</p>}
          </div>
        )}

        {hasClaimContext && state === 'done' && (
          <div className="text-center py-4">
            <div className="mx-auto mb-4 flex h-14 w-14 items-center justify-center rounded-full bg-green-500/15 text-green-300 text-3xl">
              ✓
            </div>
            <h2 className="text-2xl font-bold text-white mb-3">Card setup complete</h2>
            <p className="text-slate-400 mb-6">
              Your listing is ready for verification. Once approved, Quarriva can text you lead offers to accept or pass on.
            </p>
            <div className="bg-slate-900/60 border border-slate-700 rounded-xl p-4 text-left text-sm text-slate-400 space-y-2 mb-6">
              <p><span className="text-amber-400 font-medium">Business:</span> {data.businessName}</p>
              <p><span className="text-amber-400 font-medium">Billing:</span> {data.email}</p>
              <p><span className="text-amber-400 font-medium">Lead pricing:</span> $200 project with measurements · $125 standard appointment</p>
            </div>
            <Link href={listingUrl} className="inline-block bg-amber-500 hover:bg-amber-400 text-slate-900 font-bold px-6 py-3 rounded-lg transition-colors">
              Back to Listing
            </Link>
          </div>
        )}
      </div>
    </div>
  )
}

export default function FabricatorCardSetupPage() {
  return (
    <Suspense fallback={<div className="max-w-xl mx-auto px-4 py-12 text-slate-400">Loading card setup...</div>}>
      <FabricatorCardSetupContent />
    </Suspense>
  )
}
