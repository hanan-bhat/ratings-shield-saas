'use client'

import { useState, useEffect, useRef } from 'react'
import Link from 'next/link'
import ReviewSkeleton from '@/components/dashboard/ReviewSkeleton'

interface Review {
  id: string
  star_rating: number
  reviewer_name: string | null
  review_text: string | null
  is_replied: boolean
  reviewed_at: string | null
  fetched_at: string
  platforms: {
    platform_name: string
    businesses: {
      name: string
      tone: string
      avoid_phrases: string | null
    }
  } | null
}

interface Business {
  id: string
  name: string
}

interface DraftModal {
  open: boolean
  reviewId: string | null
  reviewText: string | null
  reviewerName: string | null
  starRating: number | null
  draft: string
  responseId: string | null
  loading: boolean
  error: string | null
  posting: boolean
  posted: boolean
}

const MAX_POLL_ATTEMPTS = 6
const POLL_INTERVAL_MS = 10_000

function starColor(rating: number) {
  if (rating <= 2) return 'text-red-400'
  if (rating === 3) return 'text-amber-400'
  return 'text-amber-400'
}

function Stars({ rating }: { rating: number }) {
  const color = starColor(rating)
  return (
    <div className="flex gap-0.5">
      {[1, 2, 3, 4, 5].map((s) => (
        <svg
          key={s}
          className={`w-4 h-4 ${s <= rating ? color : 'text-neutral-200'}`}
          fill="currentColor"
          viewBox="0 0 20 20"
        >
          <path d="M9.049 2.927c.3-.921 1.603-.921 1.902 0l1.07 3.292a1 1 0 00.95.69h3.462c.969 0 1.371 1.24.588 1.81l-2.8 2.034a1 1 0 00-.364 1.118l1.07 3.292c.3.921-.755 1.688-1.54 1.118l-2.8-2.034a1 1 0 00-1.175 0l-2.8 2.034c-.784.57-1.838-.197-1.539-1.118l1.07-3.292a1 1 0 00-.364-1.118L2.98 8.72c-.783-.57-.38-1.81.588-1.81h3.461a1 1 0 00.951-.69l1.07-3.292z" />
        </svg>
      ))}
    </div>
  )
}

function StatCard({ label, value }: { label: string; value: string | number }) {
  return (
    <div className="bg-white rounded-xl border border-neutral-200 px-6 py-5">
      <p className="text-xs font-medium text-neutral-400 uppercase tracking-wide mb-1">
        {label}
      </p>
      <p className="text-2xl font-semibold text-[#0a0a0a]">{value}</p>
    </div>
  )
}

export default function DashboardPage() {
  const [loading, setLoading] = useState(true)
  const [reviews, setReviews] = useState<Review[]>([])
  const [business, setBusiness] = useState<Business | null>(null)
  const [noBusiness, setNoBusiness] = useState(false)
  const [pollAttempts, setPollAttempts] = useState(0)
  const [polling, setPolling] = useState(false)
  const [pollingExhausted, setPollingExhausted] = useState(false)
  const [syncing, setSyncing] = useState(false)
  const [toast, setToast] = useState<string | null>(null)
  const [modal, setModal] = useState<DraftModal>({
    open: false,
    reviewId: null,
    reviewText: null,
    reviewerName: null,
    starRating: null,
    draft: '',
    responseId: null,
    loading: false,
    error: null,
    posting: false,
    posted: false,
  })

  const businessRef = useRef<Business | null>(null)
  const pollAttemptsRef = useRef(0)
  const timerRef = useRef<ReturnType<typeof setTimeout> | null>(null)

  async function fetchReviews(): Promise<Review[]> {
    const res = await fetch('/api/reviews')
    if (res.status === 404) {
      setNoBusiness(true)
      return []
    }
    if (!res.ok) return []
    const data = await res.json()
    if (data.business) {
      setBusiness(data.business)
      businessRef.current = data.business
    }
    return data.reviews ?? []
  }

  function scheduleNextPoll() {
    pollAttemptsRef.current += 1
    setPollAttempts(pollAttemptsRef.current)

    if (pollAttemptsRef.current >= MAX_POLL_ATTEMPTS) {
      setPolling(false)
      setPollingExhausted(true)
      return
    }

    timerRef.current = setTimeout(async () => {
      const data = await fetchReviews()
      if (data.length > 0) {
        setReviews(data)
        setPolling(false)
      } else {
        scheduleNextPoll()
      }
    }, POLL_INTERVAL_MS)
  }

  useEffect(() => {
    ;(async () => {
      const data = await fetchReviews()
      setLoading(false)
      if (data.length > 0) {
        setReviews(data)
      } else if (!noBusiness) {
        setPolling(true)
        scheduleNextPoll()
      }
    })()

    return () => {
      if (timerRef.current) clearTimeout(timerRef.current)
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [])

  async function handleManualSync() {
    if (!businessRef.current) return
    setSyncing(true)
    try {
      await fetch('/api/dev/sync', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ businessId: businessRef.current.id }),
      })
      // Reset polling state and try once more after 10s
      pollAttemptsRef.current = 0
      setPollAttempts(0)
      setPollingExhausted(false)
      setPolling(true)
      scheduleNextPoll()
    } finally {
      setSyncing(false)
    }
  }

  async function handleDraftReply(review: Review) {
    setModal({
      open: true,
      reviewId: review.id,
      reviewText: review.review_text,
      reviewerName: review.reviewer_name,
      starRating: review.star_rating,
      draft: '',
      responseId: null,
      loading: true,
      error: null,
      posting: false,
      posted: false,
    })
    try {
      const res = await fetch('/api/ai/draft', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ reviewId: review.id }),
      })
      const data = await res.json()
      if (!res.ok) throw new Error(data.error ?? 'Failed to generate draft')
      setModal((m) => ({ ...m, draft: data.draft ?? '', responseId: data.responseId ?? null, loading: false }))
    } catch (err) {
      setModal((m) => ({
        ...m,
        loading: false,
        error: err instanceof Error ? err.message : 'Failed',
      }))
    }
  }

  function showToast(message: string) {
    setToast(message)
    setTimeout(() => setToast(null), 3000)
  }

  async function handleMarkPosted() {
    if (!modal.reviewId) return
    setModal((m) => ({ ...m, posting: true }))
    const reviewId = modal.reviewId
    try {
      const res = await fetch(`/api/reviews/${reviewId}/replied`, { method: 'PATCH' })
      if (!res.ok) throw new Error()
      setReviews((prev) =>
        prev.map((r) => (r.id === reviewId ? { ...r, is_replied: true } : r))
      )
      closeModal()
      showToast('Response marked as posted')
    } catch {
      setModal((m) => ({ ...m, posting: false }))
    }
  }

  async function handleTestSync() {
    console.log('[Sync] Triggering sync for businessId:', business?.id)
    const res = await fetch('/api/dev/sync', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ businessId: business?.id }),
    })
    const data = await res.json()
    console.log('[Sync] Response:', data)
  }

  function closeModal() {
    setModal({
      open: false,
      reviewId: null,
      reviewText: null,
      reviewerName: null,
      starRating: null,
      draft: '',
      responseId: null,
      loading: false,
      error: null,
      posting: false,
      posted: false,
    })
  }

  // ── Loading skeleton ────────────────────────────────────────
  if (loading) {
    return (
      <div className="p-8 max-w-4xl">
        <div className="h-7 w-48 bg-neutral-200 rounded animate-pulse mb-8" />
        <div className="grid grid-cols-3 gap-4 mb-8">
          {[0, 1, 2].map((i) => (
            <div key={i} className="bg-white rounded-xl border border-neutral-200 px-6 py-5 animate-pulse">
              <div className="h-3 w-20 bg-neutral-200 rounded mb-3" />
              <div className="h-7 w-12 bg-neutral-200 rounded" />
            </div>
          ))}
        </div>
        <ReviewSkeleton />
      </div>
    )
  }

  // ── No business ─────────────────────────────────────────────
  if (noBusiness) {
    return (
      <div className="flex flex-col items-center justify-center min-h-screen gap-4">
        <p className="text-neutral-500 text-sm">Your account isn&apos;t fully set up yet.</p>
        <Link
          href="/onboarding"
          className="px-4 py-2 bg-[#e84c2e] text-white rounded-lg text-sm font-medium hover:bg-[#d43e22] transition"
        >
          Complete onboarding
        </Link>
      </div>
    )
  }

  const total = reviews.length
  const avgRating =
    total > 0
      ? (reviews.reduce((s, r) => s + r.star_rating, 0) / total).toFixed(1)
      : '—'
  const unread = reviews.filter((r) => !r.is_replied).length

  return (
    <div className="p-8 max-w-4xl">
      <div className="flex items-center justify-between mb-8">
        <h1 className="text-xl font-semibold text-[#0a0a0a]">
          {business?.name ?? 'Dashboard'}
        </h1>
        {/* TODO: remove — debug only */}
        <button
          onClick={handleTestSync}
          className="px-3 py-1.5 text-xs font-medium border border-neutral-300 text-neutral-500 rounded-lg hover:border-neutral-400 hover:text-neutral-700 transition"
        >
          [DEV] Trigger Sync
        </button>
      </div>

      {/* Stats */}
      <div className="grid grid-cols-3 gap-4 mb-8">
        <StatCard label="Total Reviews" value={total} />
        <StatCard label="Avg Rating" value={avgRating} />
        <StatCard label="Awaiting Reply" value={unread} />
      </div>

      {/* Polling banner */}
      {polling && (
        <div className="bg-white rounded-xl border border-neutral-200 p-8 text-center mb-4">
          <div className="flex items-center justify-center gap-3 mb-3">
            <svg className="w-5 h-5 text-[#e84c2e] animate-spin" fill="none" viewBox="0 0 24 24">
              <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4" />
              <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4z" />
            </svg>
            <p className="text-sm font-medium text-[#0a0a0a]">
              Syncing your reviews… this takes about 30–60 seconds
            </p>
          </div>
          {/* Progress dots */}
          <div className="flex items-center justify-center gap-1.5">
            {Array.from({ length: MAX_POLL_ATTEMPTS }).map((_, i) => (
              <div
                key={i}
                className={`h-1.5 rounded-full transition-all duration-300 ${
                  i < pollAttempts ? 'w-4 bg-[#e84c2e]' : 'w-1.5 bg-neutral-200'
                }`}
              />
            ))}
          </div>
          <p className="text-xs text-neutral-400 mt-3">
            Check {pollAttempts} of {MAX_POLL_ATTEMPTS}
          </p>
        </div>
      )}

      {/* Review list */}
      {!polling && reviews.length === 0 && (
        <div className="bg-white rounded-xl border border-neutral-200 p-10 text-center">
          {pollingExhausted ? (
            <>
              <p className="text-neutral-500 text-sm mb-4">
                No reviews found. Check your Google Place ID in{' '}
                <Link href="/settings" className="text-[#e84c2e] hover:underline">
                  Settings
                </Link>{' '}
                or try syncing manually.
              </p>
              <button
                onClick={handleManualSync}
                disabled={syncing}
                className="px-4 py-2 bg-[#e84c2e] hover:bg-[#d43e22] text-white rounded-lg text-sm font-medium transition disabled:opacity-60 disabled:cursor-not-allowed"
              >
                {syncing ? 'Syncing…' : 'Sync Now'}
              </button>
            </>
          ) : (
            <p className="text-neutral-500 text-sm">No reviews yet.</p>
          )}
        </div>
      )}

      {reviews.length > 0 && (
        <div className="space-y-3">
          {reviews.map((review) => (
            <div
              key={review.id}
              className="bg-white rounded-xl border border-neutral-200 p-5"
            >
              <div className="flex items-start justify-between gap-4">
                <div className="flex-1 min-w-0">
                  <div className="flex items-center gap-3 mb-1.5">
                    <Stars rating={review.star_rating} />
                    <span className="text-sm font-medium text-[#0a0a0a]">
                      {review.reviewer_name ?? 'Anonymous'}
                    </span>
                    {review.platforms?.platform_name && (
                      <span className="text-xs px-2 py-0.5 bg-neutral-100 text-neutral-500 rounded-full capitalize">
                        {review.platforms.platform_name}
                      </span>
                    )}
                    {review.is_replied ? (
                      <span className="text-xs px-2 py-0.5 bg-green-50 text-green-600 rounded-full font-medium">
                        Replied
                      </span>
                    ) : review.star_rating <= 2 ? (
                      <span className="text-xs px-2 py-0.5 bg-[#e84c2e]/10 text-[#e84c2e] rounded-full font-medium">
                        Needs reply
                      </span>
                    ) : (
                      <span className="text-xs px-2 py-0.5 bg-neutral-100 text-neutral-400 rounded-full font-medium">
                        Pending
                      </span>
                    )}
                  </div>
                  {review.review_text && (
                    <p className="text-sm text-neutral-600 line-clamp-3">
                      {review.review_text}
                    </p>
                  )}
                  {review.reviewed_at && (
                    <p className="text-xs text-neutral-400 mt-2">
                      {new Date(review.reviewed_at).toLocaleDateString('en-US', {
                        month: 'short',
                        day: 'numeric',
                        year: 'numeric',
                      })}
                    </p>
                  )}
                </div>
                <button
                  onClick={() => handleDraftReply(review)}
                  className="shrink-0 px-3.5 py-2 border border-[#e84c2e] text-[#e84c2e] hover:bg-[#e84c2e] hover:text-white rounded-lg text-xs font-medium transition"
                >
                  Draft AI Reply
                </button>
              </div>
            </div>
          ))}
        </div>
      )}

      {/* AI Draft Modal */}
      {modal.open && (
        <div
          className="fixed inset-0 bg-black/40 flex items-center justify-center z-50 p-4"
          onClick={(e) => e.target === e.currentTarget && closeModal()}
        >
          <div className="bg-white rounded-2xl shadow-xl w-full max-w-lg p-6">
            <div className="flex items-center justify-between mb-4">
              <h2 className="text-base font-semibold text-[#0a0a0a]">AI Draft Reply</h2>
              <button
                onClick={closeModal}
                className="text-neutral-400 hover:text-neutral-600 transition"
              >
                <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
                </svg>
              </button>
            </div>

            {/* Original review */}
            {modal.reviewText && (
              <div className="mb-4 bg-neutral-50 rounded-lg px-4 py-3 border border-neutral-200">
                <div className="flex items-center gap-2 mb-1.5">
                  {modal.starRating !== null && <Stars rating={modal.starRating} />}
                  {modal.reviewerName && (
                    <span className="text-xs font-medium text-neutral-500">{modal.reviewerName}</span>
                  )}
                </div>
                <p className="text-sm text-neutral-600 line-clamp-4">{modal.reviewText}</p>
              </div>
            )}

            {modal.loading && (
              <div className="flex items-center gap-3 py-8 justify-center">
                <svg className="w-5 h-5 text-[#e84c2e] animate-spin" fill="none" viewBox="0 0 24 24">
                  <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4" />
                  <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4z" />
                </svg>
                <span className="text-sm text-neutral-500">Generating reply…</span>
              </div>
            )}

            {modal.error && (
              <p className="text-sm text-red-600 bg-red-50 px-4 py-3 rounded-lg">
                {modal.error}
              </p>
            )}

            {!modal.loading && !modal.error && modal.draft !== undefined && (
              <>
                <textarea
                  value={modal.draft}
                  onChange={(e) => setModal((m) => ({ ...m, draft: e.target.value }))}
                  rows={6}
                  maxLength={900}
                  className="w-full px-3.5 py-3 rounded-lg border border-neutral-200 text-sm text-[#0a0a0a] resize-none focus:outline-none focus:ring-2 focus:ring-[#e84c2e]/30 focus:border-[#e84c2e]"
                  placeholder="Your AI-generated reply will appear here…"
                />
                <div className="flex items-center mt-1.5 mb-3">
                  <span className="text-xs text-neutral-400">
                    {modal.draft.trim().split(/\s+/).filter(Boolean).length} / 120 words
                  </span>
                </div>
                <div className="flex gap-2">
                  <button
                    onClick={() => navigator.clipboard.writeText(modal.draft)}
                    className="flex-1 border border-[#e84c2e] text-[#e84c2e] hover:bg-[#e84c2e] hover:text-white font-medium py-2.5 rounded-lg text-sm transition"
                  >
                    Copy to clipboard
                  </button>
                  <button
                    onClick={handleMarkPosted}
                    disabled={modal.posting || modal.posted}
                    className="flex-1 bg-[#e84c2e] hover:bg-[#d43e22] text-white font-medium py-2.5 rounded-lg text-sm transition disabled:opacity-60 disabled:cursor-not-allowed"
                  >
                    {modal.posting ? 'Saving…' : modal.posted ? 'Posted' : 'Mark as Posted'}
                  </button>
                </div>
              </>
            )}
          </div>
        </div>
      )}

      {/* Toast */}
      {toast && (
        <div className="fixed bottom-6 left-1/2 -translate-x-1/2 z-50 px-4 py-2.5 bg-[#0a0a0a] text-white text-sm rounded-lg shadow-lg">
          {toast}
        </div>
      )}
    </div>
  )
}
