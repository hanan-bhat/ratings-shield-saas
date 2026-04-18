import { NextResponse } from 'next/server'
import { createClient } from '@/lib/supabase-server'

export async function GET() {
  const supabase = await createClient()

  const {
    data: { user },
  } = await supabase.auth.getUser()

  if (!user) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
  }

  // Step 1 — get the user's business
  const { data: business } = await supabase
    .from('businesses')
    .select('id, name, tone')
    .eq('user_id', user.id)
    .single()

  if (!business) {
    return NextResponse.json({ error: 'No business found' }, { status: 404 })
  }

  // Step 2 — get platforms for that business
  const { data: platforms } = await supabase
    .from('platforms')
    .select('id')
    .eq('business_id', business.id)

  if (!platforms || platforms.length === 0) {
    return NextResponse.json({ reviews: [], business })
  }

  // Step 3 — get reviews for those platforms
  const platformIds = platforms.map(p => p.id)

  const { data: reviews, error } = await supabase
    .from('reviews')
    .select(`
      id,
      external_review_id,
      star_rating,
      reviewer_name,
      review_text,
      is_replied,
      reviewed_at,
      platform_id,
      platforms (
        platform_name
      )
    `)
    .in('platform_id', platformIds)
    .order('reviewed_at', { ascending: false })
    .limit(50)

  if (error) {
    return NextResponse.json({ error: error.message }, { status: 500 })
  }

  return NextResponse.json({ reviews: reviews ?? [], business })
}
