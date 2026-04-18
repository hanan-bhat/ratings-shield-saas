export async function fetchGoogleReviews(
  placeId: string,
  limit: number = 50
): Promise<any[]> {
  try {
    const url = new URL('https://api.app.outscraper.com/maps/reviews-v3')
    url.searchParams.set('query', placeId)
    url.searchParams.set('reviewsLimit', String(limit))
    url.searchParams.set('language', 'en')

    console.log('[Outscraper] Starting request for:', placeId)

    const response = await fetch(url.toString(), {
      headers: {
        'X-API-KEY': process.env.OUTSCRAPER_API_KEY!,
      },
    })

    const initial = await response.json()
    console.log('[Outscraper] Initial response status:', initial.status)

    // If synchronous response (unlikely but handle it)
    if (initial.status === 'Success') {
      return extractReviews(initial)
    }

    // Async job — poll results_location until done
    if (initial.status === 'Pending' && initial.results_location) {
      return await pollForResults(initial.results_location)
    }

    console.error('[Outscraper] Unexpected response:', initial)
    return []

  } catch (error) {
    console.error('[Outscraper] Error:', error)
    return []
  }
}

async function pollForResults(
  resultsUrl: string,
  maxAttempts: number = 12,
  intervalMs: number = 5000
): Promise<any[]> {
  for (let attempt = 1; attempt <= maxAttempts; attempt++) {
    console.log(`[Outscraper] Polling attempt ${attempt}/${maxAttempts}`)

    // Wait before polling
    await new Promise(resolve => setTimeout(resolve, intervalMs))

    try {
      const response = await fetch(resultsUrl, {
        headers: {
          'X-API-KEY': process.env.OUTSCRAPER_API_KEY!,
        },
      })

      const data = await response.json()
      console.log('[Outscraper] Poll status:', data.status)

      if (data.status === 'Success') {
        const reviews = extractReviews(data)
        console.log('[Outscraper] Reviews found:', reviews.length)
        return reviews
      }

      if (data.status === 'Error') {
        console.error('[Outscraper] Job failed:', data)
        return []
      }

      // Still pending — continue polling

    } catch (error) {
      console.error('[Outscraper] Poll error:', error)
    }
  }

  console.error('[Outscraper] Max polling attempts reached')
  return []
}

function extractReviews(data: any): any[] {
  const reviews = data?.data?.[0]?.reviews_data ?? []
  return reviews.map((r: any) => ({
    reviewId: r.review_id,
    stars: r.review_rating,
    text: r.review_text,
    name: r.author_title,
    date: r.review_datetime_utc,
  }))
}
