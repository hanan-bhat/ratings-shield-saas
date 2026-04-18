// TODO: remove this route before going to production
import { NextResponse } from 'next/server'
import type { NextRequest } from 'next/server'
import { createClient } from '@/lib/supabase-server'

export async function POST(request: NextRequest) {
  const supabase = await createClient()
  const {
    data: { user },
  } = await supabase.auth.getUser()

  if (!user) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
  }

  const { businessId } = await request.json()

  const origin = new URL(request.url).origin
  const res = await fetch(`${origin}/api/reviews/sync`, {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
      Authorization: `Bearer ${process.env.CRON_SECRET}`,
    },
    body: JSON.stringify({ businessId }),
  })

  const data = await res.json()
  return NextResponse.json(data, { status: res.status })
}
