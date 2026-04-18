'use client'

import { useState } from 'react'
import Link from 'next/link'
import { createClient } from '@/lib/supabase'

export default function SignupPage() {
  const [fullName, setFullName] = useState('')
  const [email, setEmail] = useState('')
  const [password, setPassword] = useState('')
  const [error, setError] = useState<string | null>(null)
  const [success, setSuccess] = useState(false)
  const [loading, setLoading] = useState(false)

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault()
    setLoading(true)
    setError(null)

    const supabase = createClient()
    const { error } = await supabase.auth.signUp({
      email,
      password,
      options: { data: { full_name: fullName } },
    })

    setLoading(false)
    if (error) {
      setError(error.message)
    } else {
      setSuccess(true)
    }
  }

  if (success) {
    return (
      <div className="w-full max-w-md bg-white rounded-2xl shadow-sm border border-neutral-200 p-8 text-center">
        <div className="w-12 h-12 rounded-full bg-[#e84c2e]/10 flex items-center justify-center mx-auto mb-4">
          <svg
            className="w-6 h-6 text-[#e84c2e]"
            fill="none"
            stroke="currentColor"
            viewBox="0 0 24 24"
          >
            <path
              strokeLinecap="round"
              strokeLinejoin="round"
              strokeWidth={2}
              d="M3 8l7.89 5.26a2 2 0 002.22 0L21 8M5 19h14a2 2 0 002-2V7a2 2 0 00-2-2H5a2 2 0 00-2 2v10a2 2 0 002 2z"
            />
          </svg>
        </div>
        <h2 className="text-xl font-semibold text-[#0a0a0a] mb-2">Check your email</h2>
        <p className="text-neutral-500 text-sm">
          We sent a confirmation link to <strong>{email}</strong>. Click it to
          activate your account.
        </p>
      </div>
    )
  }

  return (
    <div className="w-full max-w-md bg-white rounded-2xl shadow-sm border border-neutral-200 p-8">
      <h1 className="text-2xl font-semibold text-[#0a0a0a] mb-1">Create your account</h1>
      <p className="text-neutral-500 text-sm mb-6">Start your 14-day free trial</p>

      <form onSubmit={handleSubmit} className="space-y-4">
        <div>
          <label
            htmlFor="fullName"
            className="block text-sm font-medium text-[#0a0a0a] mb-1.5"
          >
            Full name
          </label>
          <input
            id="fullName"
            type="text"
            required
            value={fullName}
            onChange={(e) => setFullName(e.target.value)}
            placeholder="Jane Smith"
            className="w-full px-3.5 py-2.5 rounded-lg border border-neutral-300 text-[#0a0a0a] text-sm placeholder:text-neutral-400 focus:outline-none focus:ring-2 focus:ring-[#e84c2e]/40 focus:border-[#e84c2e] transition"
          />
        </div>

        <div>
          <label
            htmlFor="email"
            className="block text-sm font-medium text-[#0a0a0a] mb-1.5"
          >
            Email
          </label>
          <input
            id="email"
            type="email"
            required
            value={email}
            onChange={(e) => setEmail(e.target.value)}
            placeholder="jane@company.com"
            className="w-full px-3.5 py-2.5 rounded-lg border border-neutral-300 text-[#0a0a0a] text-sm placeholder:text-neutral-400 focus:outline-none focus:ring-2 focus:ring-[#e84c2e]/40 focus:border-[#e84c2e] transition"
          />
        </div>

        <div>
          <label
            htmlFor="password"
            className="block text-sm font-medium text-[#0a0a0a] mb-1.5"
          >
            Password
          </label>
          <input
            id="password"
            type="password"
            required
            value={password}
            onChange={(e) => setPassword(e.target.value)}
            placeholder="Min. 8 characters"
            className="w-full px-3.5 py-2.5 rounded-lg border border-neutral-300 text-[#0a0a0a] text-sm placeholder:text-neutral-400 focus:outline-none focus:ring-2 focus:ring-[#e84c2e]/40 focus:border-[#e84c2e] transition"
          />
        </div>

        {error && (
          <p className="text-sm text-red-600 bg-red-50 px-3.5 py-2.5 rounded-lg">
            {error}
          </p>
        )}

        <button
          type="submit"
          disabled={loading}
          className="w-full bg-[#e84c2e] hover:bg-[#d43e22] text-white font-medium py-2.5 rounded-lg text-sm transition disabled:opacity-60 disabled:cursor-not-allowed"
        >
          {loading ? 'Creating account…' : 'Create account'}
        </button>
      </form>

      <p className="mt-6 text-center text-sm text-neutral-500">
        Already have an account?{' '}
        <Link href="/login" className="text-[#e84c2e] font-medium hover:underline">
          Sign in
        </Link>
      </p>
    </div>
  )
}
