'use client'

import { useState } from 'react'
import { useRouter } from 'next/navigation'

interface FormState {
  businessName: string
  businessType: string
  placeId: string
  tone: 'professional' | 'friendly' | 'formal'
  avoidPhrases: string
}

const BUSINESS_TYPES = [
  'Restaurant',
  'Salon/Spa',
  'Dental/Medical',
  'Gym/Fitness',
  'Retail Store',
  'Hotel',
  'Auto Services',
  'Other',
]

export default function OnboardingPage() {
  const router = useRouter()
  const [step, setStep] = useState(1)
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState<string | null>(null)
  const [form, setForm] = useState<FormState>({
    businessName: '',
    businessType: '',
    placeId: '',
    tone: 'professional',
    avoidPhrases: '',
  })

  function update(field: keyof FormState, value: string) {
    setForm((prev) => ({ ...prev, [field]: value }))
  }

  async function handleFinish() {
    setLoading(true)
    setError(null)
    try {
      const res = await fetch('/api/onboarding/setup', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          businessName: form.businessName,
          businessType: form.businessType,
          placeId: form.placeId,
          tone: form.tone,
          avoidPhrases: form.avoidPhrases,
        }),
      })
      if (!res.ok) {
        const data = await res.json()
        throw new Error(data.error ?? 'Setup failed')
      }
      router.push('/dashboard')
      router.refresh()
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Something went wrong')
      setLoading(false)
    }
  }

  return (
    <div className="w-full max-w-lg py-12">
      {/* Logo */}
      <div className="text-center mb-8">
        <span className="text-2xl font-bold text-[#0a0a0a] tracking-tight">
          Ratings<span className="text-[#e84c2e]">Shield</span>
        </span>
      </div>

      {/* Progress bar */}
      <div className="mb-8">
        <div className="flex items-center justify-between mb-2">
          <span className="text-xs font-medium text-neutral-500">
            Step {step} of 3
          </span>
          <span className="text-xs text-neutral-400">
            {step === 1 ? 'Business Details' : step === 2 ? 'Connect Google' : 'Brand Voice'}
          </span>
        </div>
        <div className="h-1.5 bg-neutral-200 rounded-full overflow-hidden">
          <div
            className="h-full bg-[#e84c2e] rounded-full transition-all duration-300"
            style={{ width: `${(step / 3) * 100}%` }}
          />
        </div>
      </div>

      {/* Card */}
      <div className="bg-white rounded-2xl shadow-sm border border-neutral-200 p-8">
        {step === 1 && (
          <Step1 form={form} update={update} onNext={() => setStep(2)} />
        )}
        {step === 2 && (
          <Step2
            form={form}
            update={update}
            onNext={() => setStep(3)}
            onSkip={() => setStep(3)}
            onBack={() => setStep(1)}
          />
        )}
        {step === 3 && (
          <Step3
            form={form}
            update={update}
            onBack={() => setStep(2)}
            onFinish={handleFinish}
            loading={loading}
            error={error}
          />
        )}
      </div>
    </div>
  )
}

function Step1({
  form,
  update,
  onNext,
}: {
  form: FormState
  update: (field: keyof FormState, value: string) => void
  onNext: () => void
}) {
  function handleSubmit(e: React.FormEvent) {
    e.preventDefault()
    onNext()
  }

  return (
    <form onSubmit={handleSubmit} className="space-y-5">
      <div>
        <h2 className="text-xl font-semibold text-[#0a0a0a] mb-1">
          Tell us about your business
        </h2>
        <p className="text-sm text-neutral-500">
          We&apos;ll use this to personalise your review responses.
        </p>
      </div>

      <div>
        <label className="block text-sm font-medium text-[#0a0a0a] mb-1.5">
          Business name <span className="text-[#e84c2e]">*</span>
        </label>
        <input
          type="text"
          required
          value={form.businessName}
          onChange={(e) => update('businessName', e.target.value)}
          placeholder="e.g. Bella Vista Restaurant"
          className="w-full px-3.5 py-2.5 rounded-lg border border-neutral-300 text-[#0a0a0a] text-sm placeholder:text-neutral-400 focus:outline-none focus:ring-2 focus:ring-[#e84c2e]/40 focus:border-[#e84c2e] transition"
        />
      </div>

      <div>
        <label className="block text-sm font-medium text-[#0a0a0a] mb-1.5">
          Business type
        </label>
        <select
          value={form.businessType}
          onChange={(e) => update('businessType', e.target.value)}
          className="w-full px-3.5 py-2.5 rounded-lg border border-neutral-300 text-[#0a0a0a] text-sm focus:outline-none focus:ring-2 focus:ring-[#e84c2e]/40 focus:border-[#e84c2e] transition bg-white"
        >
          <option value="">Select a type…</option>
          {BUSINESS_TYPES.map((t) => (
            <option key={t} value={t}>
              {t}
            </option>
          ))}
        </select>
      </div>

      <button
        type="submit"
        className="w-full bg-[#e84c2e] hover:bg-[#d43e22] text-white font-medium py-2.5 rounded-lg text-sm transition"
      >
        Continue →
      </button>
    </form>
  )
}

function Step2({
  form,
  update,
  onNext,
  onSkip,
  onBack,
}: {
  form: FormState
  update: (field: keyof FormState, value: string) => void
  onNext: () => void
  onSkip: () => void
  onBack: () => void
}) {
  function handleSubmit(e: React.FormEvent) {
    e.preventDefault()
    onNext()
  }

  return (
    <form onSubmit={handleSubmit} className="space-y-5">
      <div>
        <h2 className="text-xl font-semibold text-[#0a0a0a] mb-1">
          Connect your Google Business
        </h2>
        <p className="text-sm text-neutral-500">
          Enter your Google Place ID so we can monitor your reviews. Find it at{' '}
          <a
            href="https://developers.google.com/maps/documentation/places/web-service/place-id"
            target="_blank"
            rel="noopener noreferrer"
            className="text-[#e84c2e] hover:underline"
          >
            developers.google.com/maps/documentation/places/web-service/place-id
          </a>
        </p>
      </div>

      <div>
        <label className="block text-sm font-medium text-[#0a0a0a] mb-1.5">
          Google Place ID <span className="text-[#e84c2e]">*</span>
        </label>
        <input
          type="text"
          required
          value={form.placeId}
          onChange={(e) => update('placeId', e.target.value)}
          placeholder="ChIJN1t_tDeuEmsRUsoyG83frY4"
          className="w-full px-3.5 py-2.5 rounded-lg border border-neutral-300 text-[#0a0a0a] text-sm placeholder:text-neutral-400 focus:outline-none focus:ring-2 focus:ring-[#e84c2e]/40 focus:border-[#e84c2e] transition font-mono"
        />
        <p className="mt-1.5 text-xs text-neutral-400">
          Looks like: ChIJN1t_tDeuEmsRUsoyG83frY4
        </p>
      </div>

      <div className="flex flex-col gap-2 pt-1">
        <button
          type="submit"
          className="w-full bg-[#e84c2e] hover:bg-[#d43e22] text-white font-medium py-2.5 rounded-lg text-sm transition"
        >
          Connect →
        </button>
        <button
          type="button"
          onClick={onSkip}
          className="w-full text-neutral-500 hover:text-[#0a0a0a] font-medium py-2 rounded-lg text-sm transition"
        >
          I&apos;ll do this later
        </button>
      </div>

      <button
        type="button"
        onClick={onBack}
        className="text-xs text-neutral-400 hover:text-neutral-600 transition"
      >
        ← Back
      </button>
    </form>
  )
}

function Step3({
  form,
  update,
  onBack,
  onFinish,
  loading,
  error,
}: {
  form: FormState
  update: (field: keyof FormState, value: string) => void
  onBack: () => void
  onFinish: () => void
  loading: boolean
  error: string | null
}) {
  return (
    <div className="space-y-5">
      <div>
        <h2 className="text-xl font-semibold text-[#0a0a0a] mb-1">
          How should we sound?
        </h2>
        <p className="text-sm text-neutral-500">
          We&apos;ll match this tone in every AI-generated response.
        </p>
      </div>

      <div>
        <label className="block text-sm font-medium text-[#0a0a0a] mb-3">
          Tone
        </label>
        <div className="space-y-2">
          {(['professional', 'friendly', 'formal'] as const).map((t) => (
            <label
              key={t}
              className={`flex items-center gap-3 px-4 py-3 rounded-lg border cursor-pointer transition ${
                form.tone === t
                  ? 'border-[#e84c2e] bg-[#e84c2e]/5'
                  : 'border-neutral-200 hover:border-neutral-300'
              }`}
            >
              <input
                type="radio"
                name="tone"
                value={t}
                checked={form.tone === t}
                onChange={() => update('tone', t)}
                className="accent-[#e84c2e]"
              />
              <span className="text-sm font-medium text-[#0a0a0a] capitalize">
                {t}
              </span>
            </label>
          ))}
        </div>
      </div>

      <div>
        <label className="block text-sm font-medium text-[#0a0a0a] mb-1.5">
          Phrases to avoid
        </label>
        <textarea
          rows={3}
          value={form.avoidPhrases}
          onChange={(e) => update('avoidPhrases', e.target.value)}
          placeholder="e.g. No worries, My bad, Totally..."
          className="w-full px-3.5 py-2.5 rounded-lg border border-neutral-300 text-[#0a0a0a] text-sm placeholder:text-neutral-400 focus:outline-none focus:ring-2 focus:ring-[#e84c2e]/40 focus:border-[#e84c2e] transition resize-none"
        />
      </div>

      {error && (
        <p className="text-sm text-red-600 bg-red-50 px-3.5 py-2.5 rounded-lg">
          {error}
        </p>
      )}

      <button
        type="button"
        onClick={onFinish}
        disabled={loading}
        className="w-full bg-[#e84c2e] hover:bg-[#d43e22] text-white font-medium py-2.5 rounded-lg text-sm transition disabled:opacity-60 disabled:cursor-not-allowed"
      >
        {loading ? 'Setting up your account…' : 'Finish Setup →'}
      </button>

      <button
        type="button"
        onClick={onBack}
        className="text-xs text-neutral-400 hover:text-neutral-600 transition"
      >
        ← Back
      </button>
    </div>
  )
}
