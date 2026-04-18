import { NextResponse } from 'next/server'
import type { NextRequest } from 'next/server'
import { createClient } from '@/lib/supabase-server'
import { generateReviewResponse } from '@/lib/openrouter'

export async function POST(request: NextRequest) {
  const supabase = await createClient()

  const {
    data: { user },
  } = await supabase.auth.getUser()

  if (!user) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
  }

  const body = await request.json()
  const { reviewId } = body as { reviewId: string }

  if (!reviewId) {
    return NextResponse.json({ error: 'reviewId required' }, { status: 400 })
  }

  const { data: review, error: reviewError } = await supabase
    .from('reviews')
    .select(
      `
      id,
      star_rating,
      review_text,
      reviewer_name,
      platforms (
        business_id,
        businesses (
          name,
          tone,
          avoid_phrases
        )
      )
    `
    )
    .eq('id', reviewId)
    .single()

  if (reviewError || !review) {
    return NextResponse.json({ error: 'Review not found' }, { status: 404 })
  }

  const platform = review.platforms as {
    business_id: string
    businesses: { name: string; tone: string; avoid_phrases: string | null }
  }
  const business = platform.businesses

  let draft: string
  try {
    draft = await generateReviewResponse(
      review.review_text ?? '',
      review.star_rating,
      business.name,
      business.tone,
      business.avoid_phrases ?? '',
      review.reviewer_name ?? undefined
    )
  } catch (err) {
    console.error('generateReviewResponse failed:', err)
    return NextResponse.json({ error: 'AI generation failed' }, { status: 500 })
  }

  const { data: upserted, error: upsertError } = await supabase
    .from('ai_responses')
    .upsert(
      {
        review_id: reviewId,
        draft_text: draft,
        status: 'draft',
      },
      { onConflict: 'review_id' }
    )
    .select('id')
    .single()

  if (upsertError) {
    return NextResponse.json({ error: upsertError.message }, { status: 500 })
  }

  return NextResponse.json({ draft, responseId: upserted?.id ?? null })
}
