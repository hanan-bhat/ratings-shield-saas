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

  const body = await request.json()
  const { businessName, businessType, placeId, tone, avoidPhrases } = body as {
    businessName: string
    businessType: string
    placeId?: string
    tone: string
    avoidPhrases?: string
  }

  if (!businessName?.trim()) {
    return NextResponse.json({ error: 'businessName is required' }, { status: 400 })
  }

  const supabase = createServiceClient()

  // 1. Insert business
  const { data: newBusiness, error: businessError } = await supabase
    .from('businesses')
    .insert({
      user_id: user.id,
      name: businessName.trim(),
      type: businessType || null,
      tone: tone || 'professional',
      avoid_phrases: avoidPhrases || null,
    })
    .select('id')
    .single()

  if (businessError || !newBusiness) {
    return NextResponse.json(
      { error: businessError?.message ?? 'Failed to create business' },
      { status: 500 }
    )
  }

  // 2. Insert platform if placeId provided
  if (placeId?.trim()) {
    const { error: platformError } = await supabase.from('platforms').insert({
      business_id: newBusiness.id,
      platform_name: 'google',
      external_id: placeId.trim(),
    })

    if (platformError) {
      console.error('Platform insert error:', platformError)
    } else {
      // Fire and forget — don't await
      fetch(`${process.env.NEXT_PUBLIC_APP_URL}/api/reviews/sync`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${process.env.CRON_SECRET}`,
        },
        body: JSON.stringify({ businessId: newBusiness.id }),
      }).catch(err => console.error('Background sync failed:', err))
    }
  }

  // Respond immediately — don't wait for sync
  return NextResponse.json({ success: true, businessId: newBusiness.id })
}
