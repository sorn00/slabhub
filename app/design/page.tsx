import type { Metadata } from 'next'
import Link from 'next/link'

export const metadata: Metadata = {
  title: 'Kitchen Design Service | Quarriva – Free Custom Kitchen Design',
  description:
    'Get a free custom kitchen design with cabinet layout + countertop pairing. Our designers turn your sketch into a full 3D-ready plan in 24-48 hours. Serving all of New England.',
  keywords: [
    'free kitchen design',
    'custom kitchen design',
    'cabinet layout',
    'countertop pairing',
    'New England kitchen design',
  ],
  openGraph: {
    title: 'Free Custom Kitchen Design | Quarriva',
    description:
      'Upload your sketch. Get a full cabinet layout + countertop pairing in 24-48 hours.',
    type: 'website',
  },
}

const faqs = [
  {
    q: 'How long does the design take?',
    a: 'Most designs are delivered within 24-48 hours of receiving your sketch or dimensions. Complex layouts may take up to 72 hours.',
  },
  {
    q: 'Is the design really free?',
    a: 'Yes — the design consultation and layout are completely free with any cabinet order over $3,000. No strings attached for the initial design concept.',
  },
  {
    q: 'What if I want changes?',
    a: 'We include up to 2 rounds of revisions at no charge. Our goal is to get it right before you order anything.',
  },
  {
    q: 'Do I have to buy through Quarriva?',
    a: "You're not obligated to purchase, but the design is provided free in connection with a Quarriva cabinet and stone order. We think you'll love the pricing and selection.",
  },
  {
    q: 'What cabinet brands do you carry?',
    a: 'We work with top-tier cabinet manufacturers offering hundreds of styles, finishes, and configurations at competitive pricing. Our team will match you to the right line for your budget and aesthetic.',
  },
]

export default function DesignPage() {
  return (
    <div className="min-h-screen bg-[#0f172a] text-slate-100">

      {/* ── Hero ─────────────────────────────────────────────── */}
      <section className="relative overflow-hidden border-b border-slate-800">
        {/* subtle grid background */}
        <div
          className="absolute inset-0 opacity-[0.03]"
          style={{
            backgroundImage:
              'linear-gradient(#94a3b8 1px, transparent 1px), linear-gradient(90deg, #94a3b8 1px, transparent 1px)',
            backgroundSize: '40px 40px',
          }}
        />
        <div className="relative max-w-5xl mx-auto px-4 py-24 md:py-32 text-center">
          <div className="inline-flex items-center gap-2 bg-amber-500/10 border border-amber-500/30 text-amber-400 text-sm font-medium px-4 py-1.5 rounded-full mb-6">
            <span className="w-2 h-2 bg-amber-400 rounded-full animate-pulse" />
            Free for cabinet orders over $3,000
          </div>
          <h1 className="text-4xl md:text-6xl font-extrabold tracking-tight text-white mb-6 leading-tight">
            Design Your{' '}
            <span className="text-amber-400">Dream Kitchen</span>
          </h1>
          <p className="text-lg md:text-xl text-slate-400 max-w-2xl mx-auto mb-10 leading-relaxed">
            Get a free custom kitchen design with cabinet layout + countertop pairing.
            Our designers turn your sketch into a full 3D-ready plan in{' '}
            <strong className="text-slate-200">24-48 hours</strong>.
          </p>
          <div className="flex flex-col sm:flex-row gap-4 justify-center">
            <Link
              href="/design/submit"
              className="bg-amber-500 hover:bg-amber-400 text-slate-900 font-bold px-8 py-4 rounded-xl text-lg transition-colors shadow-lg shadow-amber-500/20"
            >
              Start Your Free Design →
            </Link>
            <a
              href="#how-it-works"
              className="border border-slate-700 hover:border-slate-500 text-slate-300 hover:text-white font-semibold px-8 py-4 rounded-xl text-lg transition-colors"
            >
              See how it works ↓
            </a>
          </div>
        </div>
      </section>

      {/* ── How It Works ─────────────────────────────────────── */}
      <section id="how-it-works" className="max-w-5xl mx-auto px-4 py-20">
        <h2 className="text-3xl font-bold text-center text-white mb-4">How It Works</h2>
        <p className="text-slate-400 text-center mb-14 max-w-xl mx-auto">
          Three simple steps from rough sketch to finished design.
        </p>
        <div className="grid md:grid-cols-3 gap-8">
          {[
            {
              step: '01',
              icon: '📐',
              title: 'Upload Your Sketch',
              desc: 'Share your room dimensions and a rough sketch or photo. No design experience needed.',
            },
            {
              step: '02',
              icon: '✏️',
              title: 'We Design It',
              desc: 'Our kitchen designers create a custom cabinet layout with countertop pairing matched to your style and budget.',
            },
            {
              step: '03',
              icon: '🚚',
              title: 'Order & Install',
              desc: 'Approve your design, order cabinets + stone through Quarriva, and we coordinate delivery to your door.',
            },
          ].map(({ step, icon, title, desc }) => (
            <div
              key={step}
              className="relative bg-slate-800/50 border border-slate-700 rounded-2xl p-8 hover:border-amber-500/40 transition-colors"
            >
              <div className="text-4xl mb-4">{icon}</div>
              <div className="text-amber-400 text-sm font-bold tracking-widest mb-2">
                STEP {step}
              </div>
              <h3 className="text-xl font-bold text-white mb-3">{title}</h3>
              <p className="text-slate-400 leading-relaxed">{desc}</p>
            </div>
          ))}
        </div>
      </section>

      {/* ── What's Included ──────────────────────────────────── */}
      <section className="border-y border-slate-800 bg-slate-900/40">
        <div className="max-w-5xl mx-auto px-4 py-20">
          <div className="grid md:grid-cols-2 gap-12 items-center">
            <div>
              <h2 className="text-3xl font-bold text-white mb-4">What&apos;s Included</h2>
              <p className="text-slate-400 mb-8">
                Everything you need to go from empty space to finished kitchen — at no design cost.
              </p>
              <ul className="space-y-4">
                {[
                  { icon: '🗂️', text: 'Custom cabinet layout from premium collections' },
                  { icon: '🪨', text: 'Countertop material recommendation' },
                  { icon: '🎨', text: 'Stone + cabinet pairing visualization' },
                  { icon: '📋', text: 'Full itemized quote' },
                  { icon: '✅', text: 'Free with any cabinet order over $3,000' },
                ].map(({ icon, text }) => (
                  <li key={text} className="flex items-start gap-3">
                    <span className="text-2xl leading-none mt-0.5">{icon}</span>
                    <span className="text-slate-300 text-lg">{text}</span>
                  </li>
                ))}
              </ul>
            </div>
            <div className="bg-gradient-to-br from-amber-500/10 to-slate-800 border border-amber-500/20 rounded-2xl p-8 text-center">
              <div className="text-6xl mb-4">🏠</div>
              <div className="text-4xl font-extrabold text-amber-400 mb-2">$0</div>
              <div className="text-slate-300 text-lg font-semibold mb-1">Design Fee</div>
              <div className="text-slate-500 text-sm">with qualifying cabinet order</div>
              <div className="mt-8 border-t border-slate-700 pt-6">
                <Link
                  href="/design/submit"
                  className="inline-block bg-amber-500 hover:bg-amber-400 text-slate-900 font-bold px-6 py-3 rounded-lg transition-colors"
                >
                  Start My Free Design →
                </Link>
              </div>
            </div>
          </div>
        </div>
      </section>

      {/* ── Trust / Social Proof ─────────────────────────────── */}
      <section className="max-w-5xl mx-auto px-4 py-20">
        <h2 className="text-2xl font-bold text-center text-white mb-12">
          Backed by the Best in the Business
        </h2>
        <div className="grid md:grid-cols-3 gap-6">
          {[
            {
              icon: '🏭',
              title: 'Premium Cabinet Collections',
              desc: 'Hundreds of styles, finishes, and configurations sourced from top-tier manufacturers — at competitive pricing only available through Quarriva.',
            },
            {
              icon: '🪨',
              title: '200+ Premium Stone Surfaces',
              desc: 'Quartz, granite, marble, quartzite. Sourced directly. Paired perfectly with your cabinet selection.',
            },
            {
              icon: '📍',
              title: 'Serving All of New England',
              desc: 'Massachusetts, Connecticut, Rhode Island, New Hampshire, Vermont, and Maine.',
            },
          ].map(({ icon, title, desc }) => (
            <div
              key={title}
              className="bg-slate-800/40 border border-slate-700 rounded-xl p-6 text-center hover:border-amber-500/30 transition-colors"
            >
              <div className="text-4xl mb-4">{icon}</div>
              <h3 className="font-bold text-white mb-2">{title}</h3>
              <p className="text-slate-400 text-sm leading-relaxed">{desc}</p>
            </div>
          ))}
        </div>
      </section>

      {/* ── FAQ ──────────────────────────────────────────────── */}
      <section className="border-t border-slate-800 bg-slate-900/30">
        <div className="max-w-3xl mx-auto px-4 py-20">
          <h2 className="text-3xl font-bold text-center text-white mb-12">
            Frequently Asked Questions
          </h2>
          <div className="space-y-4">
            {faqs.map(({ q, a }) => (
              <div key={q} className="bg-slate-800/50 border border-slate-700 rounded-xl p-6">
                <h3 className="font-bold text-white mb-2">{q}</h3>
                <p className="text-slate-400 leading-relaxed">{a}</p>
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* ── Complete Your Kitchen ──────────────────────────── */}
      <section className="border-t border-slate-800 bg-slate-900/30">
        <div className="max-w-5xl mx-auto px-4 py-20">
          <h2 className="text-3xl font-bold text-center text-white mb-3">Complete Your Kitchen</h2>
          <p className="text-slate-400 text-center mb-10 max-w-lg mx-auto">
            Great kitchens start with two things: the right stone and the right cabinets. We do both.
          </p>
          <div className="grid md:grid-cols-2 gap-6">
            <Link
              href="/stones"
              className="group bg-slate-800/50 border border-slate-700 hover:border-amber-500/40 rounded-2xl p-8 text-center transition-all"
            >
              <div className="text-5xl mb-4">🪨</div>
              <h3 className="text-xl font-bold text-white mb-2">Stone Countertops</h3>
              <p className="text-slate-400 text-sm leading-relaxed mb-4">
                Browse 200+ quartz, granite, marble, and quartzite surfaces. Get quotes from local fabricators.
              </p>
              <span className="text-amber-400 font-semibold group-hover:text-amber-300 transition-colors">
                Browse Stones →
              </span>
            </Link>
            <Link
              href="/cabinets"
              className="group bg-slate-800/50 border border-slate-700 hover:border-amber-500/40 rounded-2xl p-8 text-center transition-all"
            >
              <div className="text-5xl mb-4">🚪</div>
              <h3 className="text-xl font-bold text-white mb-2">Kitchen Cabinets</h3>
              <p className="text-slate-400 text-sm leading-relaxed mb-4">
                16 door styles across 4 quality tiers. Build your cabinet list and request a custom quote.
              </p>
              <span className="text-amber-400 font-semibold group-hover:text-amber-300 transition-colors">
                Configure Cabinets →
              </span>
            </Link>
          </div>
        </div>
      </section>

      {/* ── Final CTA ────────────────────────────────────────── */}
      <section className="max-w-4xl mx-auto px-4 py-20 text-center">
        <div className="bg-gradient-to-r from-amber-500/10 via-slate-800/60 to-amber-500/10 border border-amber-500/25 rounded-3xl p-12">
          <h2 className="text-3xl md:text-4xl font-extrabold text-white mb-4">
            Ready to start?
          </h2>
          <p className="text-slate-400 text-lg mb-8 max-w-lg mx-auto">
            Tell us about your space and preferences. We&apos;ll handle the design — you just approve it.
          </p>
          <Link
            href="/design/submit"
            className="inline-block bg-amber-500 hover:bg-amber-400 text-slate-900 font-bold px-10 py-4 rounded-xl text-xl transition-colors shadow-xl shadow-amber-500/20"
          >
            Start Your Free Design →
          </Link>
          <p className="text-slate-600 text-sm mt-4">No commitment. No credit card. Just your dream kitchen.</p>
        </div>
      </section>
    </div>
  )
}
