// TODO: remove before production
import { createServerClient } from '@supabase/ssr'
import { NextResponse } from 'next/server'
import type { NextRequest } from 'next/server'
import { createClient } from '@/lib/supabase-server'

function createServiceClient() {
  return createServerClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.SUPABASE_SERVICE_ROLE_KEY!,
    { cookies: { getAll: () => [], setAll: () => {} } }
  )
}

export async function POST(request: NextRequest) {
  const authClient = await createClient()
  const {
    data: { user },
  } = await authClient.auth.getUser()

  if (!user) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
  }

  // Look up the user's business
  const supabase = createServiceClient()
  const { data: business } = await supabase
    .from('businesses')
    .select('id')
    .eq('user_id', user.id)
    .single()

  if (!business) {
    return NextResponse.json({ error: 'No business found' }, { status: 404 })
  }

  const origin = new URL(request.url).origin
  const res = await fetch(`${origin}/api/digest/send`, {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
      Authorization: `Bearer ${process.env.CRON_SECRET}`,
    },
    body: JSON.stringify({ businessId: business.id }),
  })

  const data = await res.json()
  return NextResponse.json(data, { status: res.status })
}
