'use client'

import { useState } from 'react'
import Link from 'next/link'
import { useRouter } from 'next/navigation'
import { createClient } from '@/lib/supabase'

export default function LoginPage() {
  const [email, setEmail] = useState('')
  const [password, setPassword] = useState('')
  const [error, setError] = useState<string | null>(null)
  const [loading, setLoading] = useState(false)
  const router = useRouter()

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault()
    setLoading(true)
    setError(null)

    const supabase = createClient()
    const { error } = await supabase.auth.signInWithPassword({ email, password })

    setLoading(false)
    if (error) {
      setError(error.message)
    } else {
      router.push('/dashboard')
      router.refresh()
    }
  }

  return (
    <div className="w-full max-w-md bg-white rounded-2xl shadow-sm border border-neutral-200 p-8">
      <h1 className="text-2xl font-semibold text-[#0a0a0a] mb-1">Welcome back</h1>
      <p className="text-neutral-500 text-sm mb-6">Sign in to your RatingsShield account</p>

      <form onSubmit={handleSubmit} className="space-y-4">
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
            placeholder="Your password"
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
          {loading ? 'Signing in…' : 'Sign in'}
        </button>
      </form>

      <p className="mt-6 text-center text-sm text-neutral-500">
        Don&apos;t have an account?{' '}
        <Link href="/signup" className="text-[#e84c2e] font-medium hover:underline">
          Sign up
        </Link>
      </p>
    </div>
  )
}
