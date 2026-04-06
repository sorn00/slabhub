import Link from 'next/link'

export default function FabricatorsPage() {
  return (
    <div>
      {/* Hero */}
      <section className="relative overflow-hidden">
        <div className="absolute inset-0 bg-gradient-to-br from-slate-900 via-[#0f172a] to-slate-800" />
        <div className="absolute inset-0 bg-[radial-gradient(ellipse_at_bottom_left,_rgba(245,158,11,0.1),_transparent_60%)]" />
        <div className="relative max-w-6xl mx-auto px-4 py-24 md:py-32 text-center">
          <div className="inline-flex items-center gap-2 bg-amber-500/10 border border-amber-500/20 rounded-full px-4 py-1.5 text-amber-400 text-sm font-medium mb-6">
            <span>◆</span> For Stone Fabricators
          </div>
          <h1 className="text-4xl md:text-6xl font-bold text-white mb-6 leading-tight">
            Get pre-qualified stone leads<br />
            <span className="text-amber-400">in your market.</span>
          </h1>
          <p className="text-slate-400 text-lg md:text-xl max-w-2xl mx-auto mb-10">
            Stop chasing cold prospects. We deliver homeowners who already know what they want — with measurements ready and a budget in mind.
          </p>
          <Link href="/fabricators/register" className="bg-amber-500 hover:bg-amber-400 text-slate-900 font-bold px-8 py-4 rounded-lg transition-colors text-lg inline-block">
            Start Receiving Leads
          </Link>
        </div>
      </section>

      {/* Value props */}
      <section className="max-w-6xl mx-auto px-4 py-20">
        <h2 className="text-3xl font-bold text-white text-center mb-12">Why fabricators choose SlabHub</h2>
        <div className="grid md:grid-cols-2 gap-6">
          {[
            {
              icon: '📐',
              title: 'Homeowners with measurements ready',
              desc: 'Every lead comes with project details — material preference, size, timeline, and color. No tire-kickers.',
            },
            {
              icon: '💳',
              title: 'Pay only when we deliver — $200 per lead',
              desc: 'No monthly fees. No retainers. No contracts. Your card is charged automatically when a qualified lead lands in your inbox.',
            },
            {
              icon: '🚫',
              title: 'No monthly fees, no contracts',
              desc: 'Turn it on. Turn it off. Scale up or down anytime. You\'re in full control of your lead flow.',
            },
            {
              icon: '⚡',
              title: 'Leads delivered in real time',
              desc: 'When a homeowner in your territory submits a project, you\'re notified instantly. Speed wins jobs.',
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
      <section className="bg-slate-800/30 border-y border-slate-700/50 py-20">
        <div className="max-w-6xl mx-auto px-4">
          <h2 className="text-3xl font-bold text-white text-center mb-12">How it works for fabricators</h2>
          <div className="grid md:grid-cols-4 gap-6">
            {[
              { step: '01', title: 'Sign Up', desc: 'Create your account with basic business info.' },
              { step: '02', title: 'Set Territory', desc: 'Define your service area — city, radius, or statewide.' },
              { step: '03', title: 'Receive Leads', desc: 'Get notified when a homeowner in your area submits a project.' },
              { step: '04', title: 'Get Charged Per Delivery', desc: '$200 per lead, automatically billed when we deliver.' },
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
            "We closed 4 jobs in our first week. The leads are real homeowners with projects ready to go."
          </blockquote>
          <cite className="text-slate-400 not-italic">
            — <strong className="text-amber-400">Stone Works</strong>, Hartford CT
          </cite>
        </div>
      </section>

      {/* Pricing */}
      <section className="bg-slate-800/30 border-y border-slate-700/50 py-20">
        <div className="max-w-6xl mx-auto px-4 text-center">
          <h2 className="text-3xl font-bold text-white mb-4">Simple, transparent pricing</h2>
          <p className="text-slate-400 mb-12">No tricks. No lock-in. Just leads.</p>
          <div className="max-w-sm mx-auto bg-slate-800 border border-amber-500/30 rounded-2xl p-8">
            <div className="text-amber-400 font-bold text-sm mb-2">PER QUALIFIED LEAD</div>
            <div className="text-5xl font-bold text-white mb-1">$200</div>
            <div className="text-slate-400 text-sm mb-6">charged when delivered</div>
            <ul className="text-slate-300 text-sm space-y-2 text-left">
              <li className="flex items-center gap-2"><span className="text-amber-400">✓</span> No monthly fee</li>
              <li className="flex items-center gap-2"><span className="text-amber-400">✓</span> No setup fee</li>
              <li className="flex items-center gap-2"><span className="text-amber-400">✓</span> No contract</li>
              <li className="flex items-center gap-2"><span className="text-amber-400">✓</span> Real-time delivery</li>
              <li className="flex items-center gap-2"><span className="text-amber-400">✓</span> Project details included</li>
            </ul>
            <Link href="/fabricators/register" className="block mt-6 bg-amber-500 hover:bg-amber-400 text-slate-900 font-bold py-3 rounded-lg transition-colors text-center">
              Start Receiving Leads
            </Link>
          </div>
        </div>
      </section>

      {/* Final CTA */}
      <section className="max-w-6xl mx-auto px-4 py-20 text-center">
        <h2 className="text-3xl font-bold text-white mb-4">Ready to fill your pipeline?</h2>
        <p className="text-slate-400 mb-8 max-w-lg mx-auto">Join 500+ fabricators already receiving pre-qualified leads through SlabHub.</p>
        <Link href="/fabricators/register" className="bg-amber-500 hover:bg-amber-400 text-slate-900 font-bold px-10 py-4 rounded-lg transition-colors text-lg inline-block">
          Get Started — No Charge Today
        </Link>
      </section>
    </div>
  )
}
