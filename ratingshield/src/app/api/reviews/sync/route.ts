import { createServerClient } from '@supabase/ssr'
import { NextResponse } from 'next/server'
import type { NextRequest } from 'next/server'
import { fetchGoogleReviews } from '@/lib/outscraper'
import { generateReviewResponse } from '@/lib/openrouter'

function createServiceClient() {
  return createServerClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.SUPABASE_SERVICE_ROLE_KEY!,
    {
      cookies: { getAll: () => [], setAll: () => {} },
    }
  )
}

export async function POST(request: NextRequest) {
  const authHeader = request.headers.get('authorization')
  if (authHeader !== `Bearer ${process.env.CRON_SECRET}`) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
  }

  const body = await request.json()
  const { businessId } = body as { businessId: string }

  if (!businessId) {
    return NextResponse.json({ error: 'businessId required' }, { status: 400 })
  }

  const supabase = createServiceClient()

  const { data: platforms, error: platformsError } = await supabase
    .from('platforms')
    .select('*, businesses(name, tone, avoid_phrases)')
    .eq('business_id', businessId)
    .eq('is_active', true)

  if (platformsError) {
    return NextResponse.json({ error: platformsError.message }, { status: 500 })
  }

  let synced = 0
  let newReviews = 0
  let alertsTriggered = 0

  for (const platform of platforms ?? []) {
    const reviews = await fetchGoogleReviews(platform.external_id)
    const business = platform.businesses as {
      name: string
      tone: string
      avoid_phrases: string | null
    }

    console.log('[Sync] Total reviews from Outscraper:', reviews.length)

    if (reviews.length === 0) continue

    console.log('[Sync] Sample review object:', JSON.stringify(reviews[0], null, 2))

    const reviewsToInsert = reviews
      .filter(r => r.reviewId && r.stars)
      .map(r => ({
        platform_id: platform.id,
        external_review_id: r.reviewId,
        star_rating: r.stars,
        reviewer_name: r.name ?? 'Anonymous',
        review_text: r.text ?? '',
        is_replied: false,
        reviewed_at: r.date ? new Date(r.date).toISOString() : new Date().toISOString(),
      }))

    console.log('[Sync] Reviews to insert after filter:', reviewsToInsert.length)

    const { data: upserted, error: upsertError } = await supabase
      .from('reviews')
      .upsert(reviewsToInsert, {
        onConflict: 'platform_id,external_review_id',
        ignoreDuplicates: false,
      })
      .select()

    console.log('[Sync] Upserted count:', upserted?.length)
    console.log('[Sync] Upsert error:', upsertError)

    if (upsertError) {
      console.error('[Sync] Upsert failed:', upsertError)
    } else {
      synced += upserted?.length ?? 0

      // Generate AI drafts for new low-star reviews
      for (const row of upserted ?? []) {
        const source = reviews.find(r => r.reviewId === row.external_review_id)
        if (!source || source.stars > 2 || row.is_replied) continue

        newReviews++
        alertsTriggered++
        try {
          const draft = await generateReviewResponse(
            source.text,
            source.stars,
            business.name,
            business.tone,
            business.avoid_phrases ?? ''
          )
          await supabase.from('ai_responses').upsert(
            {
              review_id: row.id,
              draft_text: draft,
              status: 'draft',
            },
            { onConflict: 'review_id', ignoreDuplicates: true }
          )
        } catch (err) {
          console.error('[Sync] AI draft generation failed:', err)
        }
      }
    }

    await supabase
      .from('platforms')
      .update({ last_synced_at: new Date().toISOString() })
      .eq('id', platform.id)
  }

  return NextResponse.json({ synced, newReviews, alertsTriggered })
}
