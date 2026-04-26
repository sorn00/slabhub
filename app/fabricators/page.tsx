import Link from 'next/link'
import ROICalculator from '@/components/ROICalculator'

export default function FabricatorsPage() {
  return (
    <div>
      {/* Hero */}
      <section className="relative overflow-hidden">
        <div className="absolute inset-0 bg-gradient-to-br from-slate-900 via-[#0f172a] to-slate-800" />
        <div className="absolute inset-0 bg-[radial-gradient(ellipse_at_bottom_left,_rgba(245,158,11,0.1),_transparent_60%)]" />
        <div className="relative max-w-6xl mx-auto px-4 py-24 md:py-32 text-center">
          <div className="inline-flex items-center gap-2 bg-amber-500/10 border border-amber-500/20 rounded-full px-4 py-1.5 text-amber-400 text-sm font-medium mb-6">
            <span>◆</span> CT Beta Launch — Limited Spots
          </div>
          <h1 className="text-4xl md:text-6xl font-bold text-white mb-6 leading-tight">
            Apply to become our exclusive fabricator partner in your market.
          </h1>
          <p className="text-slate-400 text-lg md:text-xl max-w-2xl mx-auto mb-10">
            Claim your Quarriva listing, save a card on file, and get first access to homeowner leads in your city.
          </p>
          <div className="flex flex-col sm:flex-row gap-4 justify-center">
            <Link href="/directory" className="bg-amber-500 hover:bg-amber-400 text-slate-900 font-bold px-8 py-4 rounded-lg transition-colors text-lg inline-block">
              Claim Your Listing →
            </Link>
            <a href="#how-it-works" className="border border-slate-600 hover:border-amber-500/50 text-slate-300 hover:text-white font-semibold px-8 py-4 rounded-lg transition-colors text-lg inline-block">
              See how it works
            </a>
          </div>
        </div>
      </section>

      {/* Social proof bar */}
      <section className="border-y border-slate-700/50 bg-slate-800/30 py-6">
        <div className="max-w-6xl mx-auto px-4">
          <div className="flex flex-wrap justify-center gap-8 text-center">
            {[
              { stat: 'MSI Catalog', label: 'Pre-loaded — 391 stones' },
              { stat: '1 Partner', label: 'Per city — exclusive' },
              { stat: '$0', label: 'Monthly retainer' },
              { stat: 'YES', label: 'Claim by text' },
            ].map(item => (
              <div key={item.stat}>
                <div className="text-2xl font-bold text-amber-400">{item.stat}</div>
                <div className="text-slate-400 text-sm">{item.label}</div>
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* Value props */}
      <section className="max-w-6xl mx-auto px-4 py-20">
        <h2 className="text-3xl font-bold text-white text-center mb-4">Why fabricators choose Quarriva</h2>
        <p className="text-slate-400 text-center mb-12 max-w-xl mx-auto">We do the marketing. You do the fabrication. Simple.</p>
        <div className="grid md:grid-cols-2 gap-6">
          {[
            {
              icon: '📐',
              title: 'Leads come with measurements',
              desc: 'Every homeowner on Quarriva has submitted their kitchen or bath dimensions before reaching you. You quote faster, close faster.',
            },
            {
              icon: '🗺️',
              title: 'Claim your public listing first',
              desc: 'Your Quarriva profile is the starting point. Claim it, verify the business, and unlock lead delivery for your city.',
            },
            {
              icon: '🪨',
              title: 'MSI catalog pre-loaded',
              desc: 'All 391 MSI stones — Calacatta, Carrara, quartz, granite, quartzite — are live on the platform. If you carry MSI, you\'re already set up.',
            },
            {
              icon: '⚡',
              title: 'Text-first lead delivery',
              desc: 'When a homeowner lead is a fit, we text you the lead type. Reply YES, we charge the saved card, then send the project details exclusively to your shop.',
            },
          ].map(item => (
            <div key={item.title} className="bg-slate-800/50 border border-slate-700/50 rounded-xl p-6 hover:border-amber-500/30 transition-colors flex gap-4">
              <div className="text-3xl flex-shrink-0">{item.icon}</div>
              <div>
                <h3 className="text-white font-bold text-lg mb-2">{item.title}</h3>
                <p className="text-slate-400">{item.desc}</p>
              </div>
            </div>
          ))}
        </div>
      </section>

      {/* How it works */}
      <section id="how-it-works" className="bg-slate-800/30 border-y border-slate-700/50 py-20">
        <div className="max-w-6xl mx-auto px-4">
          <h2 className="text-3xl font-bold text-white text-center mb-12">From listing claim to paid leads</h2>
          <div className="grid md:grid-cols-4 gap-6">
            {[
              { step: '01', title: 'Find your listing', desc: 'Search Quarriva for your shop and submit the owner claim form.' },
              { step: '02', title: 'We verify and onboard', desc: 'We confirm the business, service area, materials, and lead preferences.' },
              { step: '03', title: 'Save a card on file', desc: 'No monthly retainer. The card is used only when you accept a lead.' },
              { step: '04', title: 'Reply YES to claim', desc: 'Projects with measurements ready for quote are $200. Standard appointment leads are $125. Once accepted, the lead is yours exclusively.' },
            ].map(item => (
              <div key={item.step} className="text-center">
                <div className="w-12 h-12 bg-amber-500/20 border border-amber-500/40 rounded-full flex items-center justify-center text-amber-400 font-bold mx-auto mb-4">
                  {item.step}
                </div>
                <h3 className="text-white font-bold mb-2">{item.title}</h3>
                <p className="text-slate-400 text-sm">{item.desc}</p>
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* Testimonial */}
      <section className="max-w-6xl mx-auto px-4 py-20">
        <div className="bg-gradient-to-r from-amber-500/10 to-transparent border border-amber-500/20 rounded-2xl p-8 md:p-12 max-w-2xl mx-auto text-center">
          <div className="text-4xl mb-4">⭐⭐⭐⭐⭐</div>
          <blockquote className="text-white text-xl font-medium italic mb-4">
            &ldquo;The leads come in with measurements already done. We quote same day and close faster than anything else we&apos;ve tried.&rdquo;
          </blockquote>
          <cite className="text-slate-400 not-italic">
            — <strong className="text-amber-400">Quarriva partner fabricator</strong>, Massachusetts
          </cite>
        </div>
      </section>

      {/* ROI Calculator */}
      <ROICalculator />

      {/* Pricing */}
      <section id="pricing" className="bg-slate-800/30 border-y border-slate-700/50 py-20">
        <div className="max-w-6xl mx-auto px-4 text-center">
          <h2 className="text-3xl font-bold text-white mb-4">Simple pricing. No surprises.</h2>
          <p className="text-slate-400 mb-12">Lock in your market. Pay only when we deliver a matching homeowner lead.</p>
          <div className="grid md:grid-cols-2 gap-6 max-w-3xl mx-auto">
            {/* Project with measurements */}
            <div className="bg-slate-800 border border-amber-500/40 rounded-2xl p-8 relative">
              <div className="absolute -top-3 left-1/2 -translate-x-1/2 bg-amber-500 text-slate-900 text-xs font-bold px-3 py-1 rounded-full">MOST POPULAR</div>
              <div className="text-amber-400 font-bold text-sm mb-2">PROJECT WITH MEASUREMENTS</div>
              <div className="text-5xl font-bold text-white mb-1">$200<span className="text-2xl text-slate-400">/lead</span></div>
              <div className="text-slate-400 text-sm mb-6">ready for quote with measurements or plan details</div>
              <ul className="text-slate-300 text-sm space-y-3 text-left mb-8">
                <li className="flex items-start gap-2"><span className="text-amber-400 mt-0.5">✓</span> Exclusive territory — 1 fabricator per city</li>
                <li className="flex items-start gap-2"><span className="text-amber-400 mt-0.5">✓</span> Project measurements included</li>
                <li className="flex items-start gap-2"><span className="text-amber-400 mt-0.5">✓</span> Material direction already chosen</li>
                <li className="flex items-start gap-2"><span className="text-amber-400 mt-0.5">✓</span> Real-time lead notifications</li>
                <li className="flex items-start gap-2"><span className="text-amber-400 mt-0.5">✓</span> No setup fee or monthly retainer</li>
              </ul>
              <Link href="/fabricators/register" className="block bg-amber-500 hover:bg-amber-400 text-slate-900 font-bold py-3 rounded-lg transition-colors text-center">
                Save Card for Lead Claims →
              </Link>
            </div>
            {/* Standard appointment lead */}
            <div className="bg-slate-800 border border-slate-700 rounded-2xl p-8">
              <div className="text-slate-400 font-bold text-sm mb-2">STANDARD APPOINTMENT LEAD</div>
              <div className="text-5xl font-bold text-white mb-1">$125<span className="text-2xl text-slate-400">/lead</span></div>
              <div className="text-slate-400 text-sm mb-6">qualified homeowner appointment without measurements yet</div>
              <ul className="text-slate-300 text-sm space-y-3 text-left mb-8">
                <li className="flex items-start gap-2"><span className="text-green-400 mt-0.5">✓</span> Homeowner has requested contact</li>
                <li className="flex items-start gap-2"><span className="text-green-400 mt-0.5">✓</span> Contact info and project intent included</li>
                <li className="flex items-start gap-2"><span className="text-green-400 mt-0.5">✓</span> Good fit for quick callback workflows</li>
                <li className="flex items-start gap-2"><span className="text-green-400 mt-0.5">✓</span> Average job value $3,000–$8,000</li>
                <li className="flex items-start gap-2"><span className="text-green-400 mt-0.5">✓</span> No setup fee or monthly retainer</li>
              </ul>
              <Link href="/fabricators/register" className="block border border-slate-600 hover:border-amber-500/50 text-slate-300 hover:text-white font-bold py-3 rounded-lg transition-colors text-center">
                Save Card for Lead Claims
              </Link>
            </div>
          </div>
          <p className="text-slate-500 text-sm mt-8">No setup fee. No contracts. No monthly retainer. Stripe-secured payments.</p>
        </div>
      </section>

      {/* Territory availability */}
      <section className="max-w-6xl mx-auto px-4 py-20">
        <div className="text-center mb-12">
          <h2 className="text-3xl font-bold text-white mb-4">CT beta markets — 1 slot per city</h2>
          <p className="text-slate-400">Submit your application before a competitor does.</p>
        </div>
        <div className="grid grid-cols-2 md:grid-cols-4 gap-3 max-w-3xl mx-auto mb-6">
          {['Bridgeport', 'Stamford', 'Hartford', 'New Haven', 'Waterbury', 'Norwalk', 'Danbury', 'Greenwich'].map(city => (
            <div key={city} className="bg-slate-800/50 border border-green-500/30 rounded-lg px-4 py-3 text-center">
              <div className="w-2 h-2 bg-green-400 rounded-full mx-auto mb-1 animate-pulse" />
              <div className="text-white text-sm font-medium">{city}</div>
              <div className="text-green-400 text-xs">1 Slot Open</div>
            </div>
          ))}
        </div>
        <p className="text-slate-500 text-sm text-center mb-10">Once a partner claims a market, it&apos;s closed. We don&apos;t double-book.</p>
        <div className="text-center">
          <Link href="/directory" className="bg-amber-500 hover:bg-amber-400 text-slate-900 font-bold px-10 py-4 rounded-lg transition-colors text-lg inline-block">
            Find and Claim Your Listing →
          </Link>
        </div>
      </section>

      {/* FAQ */}
      <section className="bg-slate-800/30 border-y border-slate-700/50 py-20">
        <div className="max-w-3xl mx-auto px-4">
          <h2 className="text-3xl font-bold text-white text-center mb-12">Common questions</h2>
          <div className="space-y-6">
            {[
              {
                q: 'What does "exclusive market" mean exactly?',
                a: 'It means you\'re the only claimed Quarriva fabricator we offer that city\'s matching leads to first. We are starting with one partner per city so homeowners get fast follow-up.',
              },
              {
                q: 'Do I need to carry MSI to join?',
                a: 'No — but if you carry MSI, setup is faster since we\'ve already loaded their full catalog. Fabricators sourcing from Bedrosians, Arizona Tile, or other suppliers are welcome too.',
              },
              {
                q: 'What happens if a lead doesn\'t close?',
                a: 'You only pay after you accept the lead by text. Projects with measurements ready for quote are $200. Standard appointment leads are $125. If a homeowner no-shows or the lead is invalid, contact us and we\'ll review credits case by case.',
              },
              {
                q: 'How long is the contract?',
                a: 'No monthly contract. You keep your exclusive market while you remain an active partner and lead quality is working for both sides.',
              },
            ].map(item => (
              <div key={item.q} className="border border-slate-700 rounded-xl p-6">
                <h3 className="text-white font-bold mb-2">{item.q}</h3>
                <p className="text-slate-400 text-sm">{item.a}</p>
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* Final CTA */}
      <section className="max-w-6xl mx-auto px-4 py-24 text-center">
        <h2 className="text-3xl md:text-4xl font-bold text-white mb-4">Ready to own your market?</h2>
        <p className="text-slate-400 mb-8 max-w-lg mx-auto">Start by claiming your Quarriva listing. Once verified, we can send lead offers by text.</p>
        <Link href="/directory" className="bg-amber-500 hover:bg-amber-400 text-slate-900 font-bold px-10 py-4 rounded-lg transition-colors text-lg inline-block">
          Claim Your Listing →
        </Link>
        <p className="text-slate-500 text-sm mt-4">Questions? Text Sorn directly: (your number)</p>
      </section>
    </div>
  )
}
