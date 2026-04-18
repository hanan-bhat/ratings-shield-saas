import { createServerClient } from '@supabase/ssr'
import { NextResponse } from 'next/server'
import type { NextRequest } from 'next/server'
import { sendDigestEmail } from '@/lib/resend'

function createServiceClient() {
  return createServerClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.SUPABASE_SERVICE_ROLE_KEY!,
    { cookies: { getAll: () => [], setAll: () => {} } },
  )
}

function weekOf(date: Date): string {
  return date.toLocaleDateString('en-US', {
    month: 'long',
    day: 'numeric',
    year: 'numeric',
  })
}

export async function POST(request: NextRequest) {
  const authHeader = request.headers.get('authorization')
  if (authHeader !== `Bearer ${process.env.CRON_SECRET}`) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
  }

  const body = await request.json().catch(() => ({}))
  const { businessId } = body as { businessId?: string }

  const supabase = createServiceClient()

  // Fetch target businesses
  const businessQuery = supabase.from('businesses').select('id, name, user_id')

  if (businessId) {
    businessQuery.eq('id', businessId)
  }

  const { data: businesses, error: bizError } = await businessQuery

  if (bizError || !businesses) {
    return NextResponse.json(
      { error: bizError?.message ?? 'No businesses' },
      { status: 500 },
    )
  }

  // const sevenDaysAgo = new Date(Date.now() - 7 * 24 * 60 * 60 * 1000).toISOString()
  const sevenDaysAgo = new Date(
    Date.now() - 365 * 24 * 60 * 60 * 1000,
  ).toISOString() // TEMP: 1 year for testing with more reviews
  const weekLabel = weekOf(new Date())

  let sent = 0
  let errors = 0

  for (const business of businesses) {
    try {
      // Get owner email from auth.users via service role
      const { data: userData } = await supabase.auth.admin.getUserById(
        business.user_id,
      )
      const email = userData?.user?.email
      if (!email) {
        console.warn('[Digest] No email for user:', business.user_id)
        errors++
        continue
      }

      // Get platform IDs for this business
      const { data: platforms } = await supabase
        .from('platforms')
        .select('id')
        .eq('business_id', business.id)

      const platformIds = (platforms ?? []).map((p) => p.id)
      if (platformIds.length === 0) {
        console.warn('[Digest] No platforms for business:', business.id)
        continue
      }

      // All reviews for this business (for total + avg)
      const { data: allReviews } = await supabase
        .from('reviews')
        .select('star_rating, is_replied')
        .in('platform_id', platformIds)

      // Reviews from last 7 days
      const { data: recentReviews } = await supabase
        .from('reviews')
        .select('star_rating, review_text, is_replied, reviewed_at')
        .in('platform_id', platformIds)
        .gte('reviewed_at', sevenDaysAgo)
        .order('star_rating', { ascending: false })

      const all = allReviews ?? []
      const recent = recentReviews ?? []

      const totalReviews = all.length
      const avgRating =
        totalReviews > 0
          ? all.reduce((s, r) => s + r.star_rating, 0) / totalReviews
          : 0
      const newReviews = recent.length
      const unrepliedCount = all.filter((r) => !r.is_replied).length

      // Top positive: highest rated with longest text from last 7 days
      const positives = recent
        .filter((r) => r.star_rating >= 4 && r.review_text)
        .sort(
          (a, b) =>
            b.star_rating - a.star_rating ||
            (b.review_text?.length ?? 0) - (a.review_text?.length ?? 0),
        )
      const topPositive = positives[0]?.review_text ?? null

      // Top negative: lowest rated (1-2 stars) with text from last 7 days
      const negatives = recent
        .filter((r) => r.star_rating <= 2 && r.review_text)
        .sort((a, b) => a.star_rating - b.star_rating)
      const topNegative = negatives[0]?.review_text ?? null

      await sendDigestEmail({
        to: email,
        businessName: business.name,
        totalReviews,
        avgRating,
        newReviews,
        unrepliedCount,
        topPositive,
        topNegative,
        weekOf: weekLabel,
      })

      // Record in digest_emails table
      await supabase.from('digest_emails').insert({
        business_id: business.id,
        period: weekLabel,
        total_reviews: totalReviews,
        avg_rating: avgRating,
        summary_text: `${newReviews} new reviews, ${unrepliedCount} unreplied`,
        sent_at: new Date().toISOString(),
      })

      sent++
    } catch (err) {
      console.error('[Digest] Failed for business:', business.id, err)
      errors++
    }
  }

  return NextResponse.json({ sent, errors })
}
