import { NextResponse } from 'next/server'
import type { NextRequest } from 'next/server'
import { createClient } from '@/lib/supabase-server'

export async function PATCH(
  _request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  const supabase = await createClient()

  const {
    data: { user },
  } = await supabase.auth.getUser()

  if (!user) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
  }

  const { id: reviewId } = await params

  const { error: reviewError } = await supabase
    .from('reviews')
    .update({ is_replied: true })
    .eq('id', reviewId)

  if (reviewError) {
    return NextResponse.json({ error: reviewError.message }, { status: 500 })
  }

  await supabase
    .from('ai_responses')
    .update({ status: 'posted' })
    .eq('review_id', reviewId)
    .eq('status', 'draft')

  return NextResponse.json({ success: true })
}
