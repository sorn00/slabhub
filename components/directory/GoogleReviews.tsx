'use client'

interface GoogleReview {
  author: string
  rating: number
  text: string
  time: string
}

interface Props {
  claimed: boolean
  googleRating: number | null
  googleReviewCount: number
  googleReviews: GoogleReview[]
  claimSlug: string
}

function Stars({ rating }: { rating: number }) {
  return (
    <div className="flex items-center gap-0.5">
      {[1, 2, 3, 4, 5].map((s) => (
        <span key={s} className={`text-sm ${s <= Math.round(rating) ? 'text-amber-400' : 'text-slate-600'}`}>★</span>
      ))}
    </div>
  )
}

export default function GoogleReviews({ claimed, googleRating, googleReviewCount, googleReviews, claimSlug }: Props) {
  if (!googleRating && googleReviewCount === 0) return null

  return (
    <section className="bg-slate-800/50 border border-slate-700/60 rounded-xl p-6 relative overflow-hidden">
      {/* Header */}
      <div className="flex items-center gap-3 mb-4">
        <div className="flex items-center gap-2">
          {/* Google G icon */}
          <svg className="w-5 h-5" viewBox="0 0 24 24" fill="none">
            <path d="M22.56 12.25c0-.78-.07-1.53-.2-2.25H12v4.26h5.92c-.26 1.37-1.04 2.53-2.21 3.31v2.77h3.57c2.08-1.92 3.28-4.74 3.28-8.09z" fill="#4285F4"/>
            <path d="M12 23c2.97 0 5.46-.98 7.28-2.66l-3.57-2.77c-.98.66-2.23 1.06-3.71 1.06-2.86 0-5.29-1.93-6.16-4.53H2.18v2.84C3.99 20.53 7.7 23 12 23z" fill="#34A853"/>
            <path d="M5.84 14.09c-.22-.66-.35-1.36-.35-2.09s.13-1.43.35-2.09V7.07H2.18C1.43 8.55 1 10.22 1 12s.43 3.45 1.18 4.93l3.66-2.84z" fill="#FBBC05"/>
            <path d="M12 5.38c1.62 0 3.06.56 4.21 1.64l3.15-3.15C17.45 2.09 14.97 1 12 1 7.7 1 3.99 3.47 2.18 7.07l3.66 2.84c.87-2.6 3.3-4.53 6.16-4.53z" fill="#EA4335"/>
          </svg>
          <span className="text-white font-semibold">Google Reviews</span>
        </div>
        {googleRating && (
          <div className="flex items-center gap-2">
            <span className="text-amber-400 font-bold">{googleRating}</span>
            <Stars rating={googleRating} />
            <span className="text-slate-400 text-sm">({googleReviewCount.toLocaleString()})</span>
          </div>
        )}
      </div>

      {/* Reviews — blurred if not claimed */}
      <div className={`space-y-4 ${!claimed ? 'opacity-30 select-none pointer-events-none' : ''}`}>
        {googleReviews.length > 0 ? googleReviews.map((r, i) => (
          <div key={i} className="border-t border-slate-700/50 pt-4 first:border-0 first:pt-0">
            <div className="flex items-center justify-between mb-1">
              <span className="text-white text-sm font-medium">{r.author}</span>
              <span className="text-slate-500 text-xs">{r.time}</span>
            </div>
            <Stars rating={r.rating} />
            {r.text && <p className="text-slate-300 text-sm mt-2 leading-relaxed">{r.text}</p>}
          </div>
        )) : (
          // Placeholder reviews for blur effect
          [1,2,3].map(i => (
            <div key={i} className="border-t border-slate-700/50 pt-4 first:border-0 first:pt-0">
              <div className="flex items-center justify-between mb-1">
                <span className="text-white text-sm font-medium">Verified Customer</span>
                <span className="text-slate-500 text-xs">2 weeks ago</span>
              </div>
              <Stars rating={5} />
              <p className="text-slate-300 text-sm mt-2">Excellent work, very professional and timely. Would highly recommend to anyone looking for quality countertops.</p>
            </div>
          ))
        )}
      </div>

      {/* Locked overlay for unclaimed */}
      {!claimed && (
        <div className="absolute inset-0 flex flex-col items-center justify-center bg-slate-900/60 backdrop-blur-[2px] rounded-xl">
          <div className="text-center px-6">
            <div className="w-12 h-12 rounded-full bg-slate-700 flex items-center justify-center mx-auto mb-3">
              <svg className="w-6 h-6 text-slate-400" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 15v2m-6 4h12a2 2 0 002-2v-6a2 2 0 00-2-2H6a2 2 0 00-2 2v6a2 2 0 002 2zm10-10V7a4 4 0 00-8 0v4h8z" />
              </svg>
            </div>
            <p className="text-white font-semibold mb-1">
              {googleReviewCount > 0 ? `${googleReviewCount} Google Reviews` : 'Google Reviews'}
            </p>
            <p className="text-slate-400 text-sm mb-4">Claim your listing to display your reviews and start receiving leads</p>
            <a
              href={`/directory/${claimSlug}/claim`}
              className="inline-block bg-blue-600 hover:bg-blue-500 text-white text-sm font-semibold px-5 py-2.5 rounded-lg transition-colors"
            >
              Claim Your Free Listing →
            </a>
          </div>
        </div>
      )}
    </section>
  )
}
