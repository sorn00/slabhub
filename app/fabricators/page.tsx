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
            We&apos;re selecting one fabricator per city across Connecticut. One slot. Full market exclusivity. Founding partner rate.
          </p>
          <div className="flex flex-col sm:flex-row gap-4 justify-center">
            <Link href="/fabricators/register" className="bg-amber-500 hover:bg-amber-400 text-slate-900 font-bold px-8 py-4 rounded-lg transition-colors text-lg inline-block">
              Apply for Your Market →
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
              { stat: '$0', label: 'Setup fee' },
              { stat: '48hr', label: 'Avg. time to first lead' },
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
              title: 'Exclusive territory — no bidding wars',
              desc: 'One fabricator per city. When you claim your market, no competing shop on Quarriva gets those leads. First-mover advantage is real.',
            },
            {
              icon: '🪨',
              title: 'MSI catalog pre-loaded',
              desc: 'All 391 MSI stones — Calacatta, Carrara, quartz, granite, quartzite — are live on the platform. If you carry MSI, you\'re already set up.',
            },
            {
              icon: '⚡',
              title: 'Real-time lead delivery',
              desc: 'When a homeowner in your territory picks a stone and submits their project, you\'re notified instantly. Speed wins jobs.',
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
          <h2 className="text-3xl font-bold text-white text-center mb-12">Up and running in 48 hours</h2>
          <div className="grid md:grid-cols-4 gap-6">
            {[
              { step: '01', title: 'Apply for your city', desc: 'Submit your application. We review and confirm your market is available.' },
              { step: '02', title: 'We verify your shop', desc: 'Quick onboarding call, confirm your materials and service area.' },
              { step: '03', title: 'Leads start flowing', desc: 'Homeowners with measurements browse the catalog, match your territory, and land in your inbox.' },
              { step: '04', title: 'You close the job', desc: 'Quote fast, win the job. Pay $150 per booked sketch/measure appointment on top of the monthly.' },
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
            — <strong className="text-amber-400">Arts Marble &amp; Granite</strong>, Massachusetts
          </cite>
        </div>
      </section>

      {/* ROI Calculator */}
      <ROICalculator />

      {/* Pricing */}
      <section id="pricing" className="bg-slate-800/30 border-y border-slate-700/50 py-20">
        <div className="max-w-6xl mx-auto px-4 text-center">
          <h2 className="text-3xl font-bold text-white mb-4">Simple pricing. No surprises.</h2>
          <p className="text-slate-400 mb-12">Lock in your market. Pay only for results beyond the monthly.</p>
          <div className="grid md:grid-cols-2 gap-6 max-w-3xl mx-auto">
            {/* Monthly */}
            <div className="bg-slate-800 border border-amber-500/40 rounded-2xl p-8 relative">
              <div className="absolute -top-3 left-1/2 -translate-x-1/2 bg-amber-500 text-slate-900 text-xs font-bold px-3 py-1 rounded-full">MOST POPULAR</div>
              <div className="text-amber-400 font-bold text-sm mb-2">MARKET EXCLUSIVITY</div>
              <div className="text-5xl font-bold text-white mb-1">$300<span className="text-2xl text-slate-400">/mo</span></div>
              <div className="text-slate-400 text-sm mb-6">+ $150 per booked appointment</div>
              <ul className="text-slate-300 text-sm space-y-3 text-left mb-8">
                <li className="flex items-start gap-2"><span className="text-amber-400 mt-0.5">✓</span> Exclusive territory — 1 fabricator per city</li>
                <li className="flex items-start gap-2"><span className="text-amber-400 mt-0.5">✓</span> All leads in your market go to you only</li>
                <li className="flex items-start gap-2"><span className="text-amber-400 mt-0.5">✓</span> Full MSI catalog pre-loaded</li>
                <li className="flex items-start gap-2"><span className="text-amber-400 mt-0.5">✓</span> Real-time lead notifications</li>
                <li className="flex items-start gap-2"><span className="text-amber-400 mt-0.5">✓</span> Cancel anytime</li>
              </ul>
              <Link href="/fabricators/register" className="block bg-amber-500 hover:bg-amber-400 text-slate-900 font-bold py-3 rounded-lg transition-colors text-center">
                Apply for Your Market →
              </Link>
            </div>
            {/* Per lead */}
            <div className="bg-slate-800 border border-slate-700 rounded-2xl p-8">
              <div className="text-slate-400 font-bold text-sm mb-2">PAY PER APPOINTMENT</div>
              <div className="text-5xl font-bold text-white mb-1">$150<span className="text-2xl text-slate-400">/appt</span></div>
              <div className="text-slate-400 text-sm mb-6">per booked sketch / measure visit</div>
              <ul className="text-slate-300 text-sm space-y-3 text-left mb-8">
                <li className="flex items-start gap-2"><span className="text-green-400 mt-0.5">✓</span> Only pay when we book the appointment</li>
                <li className="flex items-start gap-2"><span className="text-green-400 mt-0.5">✓</span> Homeowner has submitted measurements</li>
                <li className="flex items-start gap-2"><span className="text-green-400 mt-0.5">✓</span> Material direction already chosen</li>
                <li className="flex items-start gap-2"><span className="text-green-400 mt-0.5">✓</span> Average job value $3,000–$8,000</li>
                <li className="flex items-start gap-2"><span className="text-green-400 mt-0.5">✓</span> Included with monthly plan</li>
              </ul>
              <Link href="/fabricators/register" className="block border border-slate-600 hover:border-amber-500/50 text-slate-300 hover:text-white font-bold py-3 rounded-lg transition-colors text-center">
                Learn More
              </Link>
            </div>
          </div>
          <p className="text-slate-500 text-sm mt-8">No setup fee. No contracts. Cancel anytime. Stripe-secured payments.</p>
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
          <Link href="/fabricators/register" className="bg-amber-500 hover:bg-amber-400 text-slate-900 font-bold px-10 py-4 rounded-lg transition-colors text-lg inline-block">
            Apply for Your Market →
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
                a: 'It means you\'re the only fabricator on Quarriva who receives leads from your city. When a homeowner in Bridgeport submits a project, it comes to you — not to 10 other shops.',
              },
              {
                q: 'Do I need to carry MSI to join?',
                a: 'No — but if you carry MSI, setup is faster since we\'ve already loaded their full catalog. Fabricators sourcing from Bedrosians, Arizona Tile, or other suppliers are welcome too.',
              },
              {
                q: 'What happens if a lead doesn\'t close?',
                a: 'You pay $150 per booked appointment, not per closed job. If a homeowner no-shows or changes their mind, contact us and we\'ll review credits case by case.',
              },
              {
                q: 'How long is the contract?',
                a: 'Month-to-month. Cancel anytime with 30 days notice. No lock-in.',
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
        <p className="text-slate-400 mb-8 max-w-lg mx-auto">CT markets are filling up. Apply before a competitor locks your city.</p>
        <Link href="/fabricators/register" className="bg-amber-500 hover:bg-amber-400 text-slate-900 font-bold px-10 py-4 rounded-lg transition-colors text-lg inline-block">
          Apply for Your Market →
        </Link>
        <p className="text-slate-500 text-sm mt-4">Questions? Text Sorn directly: (your number)</p>
      </section>
    </div>
  )
}
