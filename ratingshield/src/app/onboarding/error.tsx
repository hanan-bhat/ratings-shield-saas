'use client'

import { useEffect } from 'react'

export default function Error({
  error,
  reset,
}: {
  error: Error & { digest?: string }
  reset: () => void
}) {
  useEffect(() => {
    console.error('Onboarding error:', error)
  }, [error])

  return (
    <div className="min-h-screen flex flex-col items-center justify-center bg-[#fafaf8] gap-4">
      <h2 className="text-xl font-semibold text-[#0a0a0a]">
        Something went wrong loading onboarding
      </h2>
      <p className="text-sm text-gray-500">{error.message}</p>
      <button
        onClick={reset}
        className="px-4 py-2 bg-[#e84c2e] text-white rounded-lg text-sm font-medium"
      >
        Try again
      </button>
    </div>
  )
}
