'use client'

import { useState } from 'react'

interface Review {
  id: number
  reviewer_name: string
  rating: number
  review_text: string | null
  project_type: string | null
  created_at: string
}

interface Props {
  fabricatorId: number
  fabricatorSlug: string
  reviews: Review[]
  rating: number | null
  reviewCount: number
}

function StarRating({ rating, size = 'sm' }: { rating: number; size?: 'sm' | 'lg' }) {
  const cls = size === 'lg' ? 'text-2xl' : 'text-sm'
  return (
    <div className="flex items-center gap-0.5">
      {[1, 2, 3, 4, 5].map((star) => (
        <span key={star} className={`${cls} ${star <= Math.round(rating) ? 'text-amber-400' : 'text-slate-600'}`}>★</span>
      ))}
    </div>
  )
}

export default function ReviewSection({ fabricatorId, reviews, rating, reviewCount }: Props) {
  const [showForm, setShowForm] = useState(false)
  const [reviewerName, setReviewerName] = useState('')
  const [reviewRating, setReviewRating] = useState(5)
  const [reviewText, setReviewText] = useState('')
  const [projectType, setProjectType] = useState('')
  const [loading, setLoading] = useState(false)
  const [submitted, setSubmitted] = useState(false)

  async function handleSubmitReview(e: React.FormEvent) {
    e.preventDefault()
    setLoading(true)
    try {
      await fetch('/api/directory/review', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ fabricatorId, reviewerName, rating: reviewRating, reviewText, projectType }),
      })
      setSubmitted(true)
      setShowForm(false)
    } finally {
      setLoading(false)
    }
  }

  return (
    <section className="bg-slate-800/50 border border-slate-700/60 rounded-xl p-6">
      <div className="flex items-center justify-between mb-5">
        <h2 className="text-white font-semibold text-lg">Reviews</h2>
        {!showForm && !submitted && (
          <button
            onClick={() => setShowForm(true)}
            className="text-xs bg-slate-700 hover:bg-slate-600 text-white px-3 py-1.5 rounded-lg transition-colors"
          >
            Leave a Review
          </button>
        )}
      </div>

      {rating && reviewCount > 0 ? (
        <div className="flex items-center gap-3 mb-5 p-4 bg-slate-700/30 rounded-lg">
          <div className="text-center">
            <p className="text-amber-400 font-bold text-3xl">{rating.toFixed(1)}</p>
            <StarRating rating={rating} size="lg" />
            <p className="text-slate-500 text-xs mt-1">{reviewCount} review{reviewCount !== 1 ? 's' : ''}</p>
          </div>
        </div>
      ) : (
        <p className="text-slate-500 text-sm mb-5">No reviews yet. Be the first!</p>
      )}

      {submitted && (
        <div className="bg-green-500/10 border border-green-500/30 rounded-lg p-3 mb-4 text-green-400 text-sm">
          Thanks for your review! It will appear after moderation.
        </div>
      )}

      {showForm && (
        <form onSubmit={handleSubmitReview} className="bg-slate-700/30 rounded-xl p-4 mb-5 flex flex-col gap-3">
          <h3 className="text-white text-sm font-medium">Write a Review</h3>
          <input
            type="text"
            value={reviewerName}
            onChange={e => setReviewerName(e.target.value)}
            placeholder="Your name"
            required
            className="bg-slate-700/60 border border-slate-600 text-white placeholder-slate-400 rounded-lg px-3 py-2 text-sm focus:outline-none focus:border-amber-500"
          />
          <div className="flex items-center gap-3">
            <label className="text-slate-400 text-sm">Rating:</label>
            <div className="flex gap-1">
              {[1,2,3,4,5].map(star => (
                <button
                  key={star}
                  type="button"
                  onClick={() => setReviewRating(star)}
                  className={`text-xl transition-colors ${star <= reviewRating ? 'text-amber-400' : 'text-slate-600 hover:text-slate-400'}`}
                >★</button>
              ))}
            </div>
          </div>
          <select
            value={projectType}
            onChange={e => setProjectType(e.target.value)}
            className="bg-slate-700/60 border border-slate-600 text-white rounded-lg px-3 py-2 text-sm focus:outline-none focus:border-amber-500"
          >
            <option value="">Project type (optional)</option>
            <option value="kitchen">Kitchen Countertops</option>
            <option value="bathroom">Bathroom Vanity</option>
            <option value="outdoor">Outdoor Kitchen</option>
            <option value="other">Other</option>
          </select>
          <textarea
            value={reviewText}
            onChange={e => setReviewText(e.target.value)}
            placeholder="Tell us about your experience..."
            rows={3}
            className="bg-slate-700/60 border border-slate-600 text-white placeholder-slate-400 rounded-lg px-3 py-2 text-sm focus:outline-none focus:border-amber-500 resize-none"
          />
          <div className="flex gap-2">
            <button
              type="submit"
              disabled={loading}
              className="bg-amber-500 hover:bg-amber-400 disabled:opacity-60 text-slate-900 font-semibold py-2 px-4 rounded-lg transition-colors text-sm"
            >
              {loading ? 'Submitting...' : 'Submit Review'}
            </button>
            <button
              type="button"
              onClick={() => setShowForm(false)}
              className="bg-slate-700 hover:bg-slate-600 text-white py-2 px-4 rounded-lg transition-colors text-sm"
            >
              Cancel
            </button>
          </div>
        </form>
      )}

      {reviews.length > 0 ? (
        <div className="flex flex-col gap-4">
          {reviews.map(review => (
            <div key={review.id} className="border-b border-slate-700/50 pb-4 last:border-0">
              <div className="flex items-center justify-between mb-1">
                <span className="text-white font-medium text-sm">{review.reviewer_name}</span>
                <span className="text-slate-500 text-xs">{new Date(review.created_at).toLocaleDateString()}</span>
              </div>
              <StarRating rating={review.rating} />
              {review.project_type && (
                <span className="inline-block text-xs text-slate-500 bg-slate-700/40 px-2 py-0.5 rounded-full mt-1 capitalize">{review.project_type}</span>
              )}
              {review.review_text && (
                <p className="text-slate-300 text-sm mt-2 leading-relaxed">{review.review_text}</p>
              )}
            </div>
          ))}
        </div>
      ) : null}
    </section>
  )
}
