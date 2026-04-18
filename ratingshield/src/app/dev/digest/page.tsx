'use client'

import { useState } from 'react'

export default function DevDigestPage() {
  const [status, setStatus] = useState<'idle' | 'loading' | 'success' | 'error'>('idle')
  const [result, setResult] = useState<string | null>(null)

  async function handleSend() {
    setStatus('loading')
    setResult(null)
    try {
      const res = await fetch('/api/dev/digest', {
        method: 'POST',
      })
      const data = await res.json()
      if (!res.ok) throw new Error(data.error ?? 'Unknown error')
      setResult(JSON.stringify(data, null, 2))
      setStatus('success')
    } catch (err) {
      setResult(err instanceof Error ? err.message : 'Failed')
      setStatus('error')
    }
  }

  return (
    <div style={{ padding: 40, fontFamily: 'sans-serif', maxWidth: 480 }}>
      <h1 style={{ fontSize: '1.2rem', marginBottom: 8 }}>Dev — Send Test Digest</h1>
      <p style={{ fontSize: '0.85rem', color: '#666', marginBottom: 24 }}>
        Sends the weekly digest email for your current business to your account email.
      </p>
      <button
        onClick={handleSend}
        disabled={status === 'loading'}
        style={{
          background: '#e84c2e',
          color: '#fff',
          border: 'none',
          padding: '12px 24px',
          borderRadius: 8,
          fontSize: '0.95rem',
          fontWeight: 600,
          cursor: status === 'loading' ? 'not-allowed' : 'pointer',
          opacity: status === 'loading' ? 0.7 : 1,
        }}
      >
        {status === 'loading' ? 'Sending…' : 'Send Test Digest'}
      </button>

      {result && (
        <pre
          style={{
            marginTop: 24,
            padding: 16,
            borderRadius: 8,
            background: status === 'error' ? '#fef2f0' : '#f0fdf4',
            color: status === 'error' ? '#c0392b' : '#166534',
            fontSize: '0.82rem',
            whiteSpace: 'pre-wrap',
            wordBreak: 'break-all',
          }}
        >
          {result}
        </pre>
      )}
    </div>
  )
}
