import { Resend } from 'resend'

const resend = new Resend(process.env.RESEND_API_KEY)

export async function sendDigestEmail({
  to,
  businessName,
  totalReviews: _totalReviews,
  avgRating,
  newReviews,
  unrepliedCount,
  topPositive,
  topNegative,
  weekOf,
}: {
  to: string
  businessName: string
  totalReviews: number
  avgRating: number
  newReviews: number
  unrepliedCount: number
  topPositive: string | null
  topNegative: string | null
  weekOf: string
}) {
  const subject =
    unrepliedCount > 0
      ? `${unrepliedCount} reviews need a response — ${businessName}`
      : `Your weekly review summary — ${businessName}`

  const html = `
    <!DOCTYPE html>
    <html>
    <head>
      <meta charset="utf-8"/>
      <meta name="viewport" content="width=device-width"/>
      <title>${subject}</title>
    </head>
    <body style="margin:0;padding:0;background:#f4f1ea;font-family:-apple-system,BlinkMacSystemFont,'Segoe UI',sans-serif;">

      <div style="max-width:560px;margin:40px auto;background:#ffffff;border-radius:12px;overflow:hidden;box-shadow:0 2px 8px rgba(0,0,0,0.08)">

        <!-- Header -->
        <div style="background:#0a0a0a;padding:28px 36px">
          <div style="font-size:1.3rem;color:#ffffff;font-weight:600;letter-spacing:-0.02em">
            Ratings<span style="color:#e84c2e">Shield</span>
          </div>
          <div style="color:rgba(255,255,255,0.4);font-size:0.8rem;margin-top:4px">
            Weekly Digest — ${weekOf}
          </div>
        </div>

        <!-- Business name -->
        <div style="padding:28px 36px 0">
          <h1 style="margin:0;font-size:1.4rem;color:#0a0a0a;font-weight:600">
            ${businessName}
          </h1>
          <p style="margin:6px 0 0;color:#6b6b6b;font-size:0.9rem">
            Here is your review summary for the past 7 days.
          </p>
        </div>

        <!-- Stats row -->
        <div style="padding:24px 36px;display:flex;gap:16px">
          <div style="flex:1;background:#f4f1ea;border-radius:8px;padding:16px;text-align:center">
            <div style="font-size:1.8rem;font-weight:700;color:#0a0a0a">${newReviews}</div>
            <div style="font-size:0.75rem;color:#6b6b6b;margin-top:2px">New reviews</div>
          </div>
          <div style="flex:1;background:#f4f1ea;border-radius:8px;padding:16px;text-align:center">
            <div style="font-size:1.8rem;font-weight:700;color:#0a0a0a">${avgRating.toFixed(1)}★</div>
            <div style="font-size:0.75rem;color:#6b6b6b;margin-top:2px">Avg rating</div>
          </div>
          <div style="flex:1;background:${unrepliedCount > 0 ? '#fef2f0' : '#f4f1ea'};border-radius:8px;padding:16px;text-align:center;border:${unrepliedCount > 0 ? '1px solid #e84c2e' : 'none'}">
            <div style="font-size:1.8rem;font-weight:700;color:${unrepliedCount > 0 ? '#e84c2e' : '#0a0a0a'}">
              ${unrepliedCount}
            </div>
            <div style="font-size:0.75rem;color:${unrepliedCount > 0 ? '#e84c2e' : '#6b6b6b'};margin-top:2px">Need reply</div>
          </div>
        </div>

        <!-- Top positive review -->
        ${
          topPositive
            ? `
        <div style="padding:0 36px 20px">
          <div style="font-size:0.72rem;font-weight:600;letter-spacing:0.1em;text-transform:uppercase;color:#6b6b6b;margin-bottom:10px">
            Top positive review
          </div>
          <div style="background:#f0fdf4;border-left:3px solid #16a34a;border-radius:0 8px 8px 0;padding:14px 16px;font-size:0.88rem;color:#0a0a0a;line-height:1.6;font-style:italic">
            "${topPositive.length > 180 ? topPositive.slice(0, 180) + '...' : topPositive}"
          </div>
        </div>
        `
            : ''
        }

        <!-- Top negative review -->
        ${
          topNegative
            ? `
        <div style="padding:0 36px 20px">
          <div style="font-size:0.72rem;font-weight:600;letter-spacing:0.1em;text-transform:uppercase;color:#6b6b6b;margin-bottom:10px">
            Needs your attention
          </div>
          <div style="background:#fef2f0;border-left:3px solid #e84c2e;border-radius:0 8px 8px 0;padding:14px 16px;font-size:0.88rem;color:#0a0a0a;line-height:1.6;font-style:italic">
            "${topNegative.length > 180 ? topNegative.slice(0, 180) + '...' : topNegative}"
          </div>
        </div>
        `
            : ''
        }

        <!-- CTA -->
        <div style="padding:8px 36px 36px;text-align:center">
          <a href="${process.env.NEXT_PUBLIC_APP_URL}/dashboard"
            style="display:inline-block;background:#e84c2e;color:#ffffff;text-decoration:none;padding:14px 32px;border-radius:8px;font-weight:600;font-size:0.95rem">
            View All Reviews →
          </a>
        </div>

        <!-- Footer -->
        <div style="background:#f4f1ea;padding:20px 36px;text-align:center">
          <p style="margin:0;font-size:0.75rem;color:#6b6b6b">
            RatingsShield · Unsubscribe
          </p>
        </div>
      </div>
    </body>
    </html>
  `

  const plainText = `
RatingsShield Weekly Digest — ${weekOf}

${businessName}

NEW REVIEWS: ${newReviews}
AVERAGE RATING: ${avgRating.toFixed(1)} stars
NEED REPLY: ${unrepliedCount}

${topPositive ? `TOP POSITIVE REVIEW:\n"${topPositive.slice(0, 200)}"\n` : ''}
${topNegative ? `NEEDS ATTENTION:\n"${topNegative.slice(0, 200)}"\n` : ''}
View all reviews: ${process.env.NEXT_PUBLIC_APP_URL}/dashboard

---
RatingsShield
You are receiving this because you signed up at ratingsshield.com
`

  const { data, error } = await resend.emails.send({
    from: 'RatingsShield <digest@ratingsshield.com>',
    to,
    subject,
    html,
    text: plainText,
    headers: {
      'List-Unsubscribe': `<mailto:unsubscribe@ratingsshield.com>`,
      'X-Entity-Ref-ID': businessName + '-weekly-digest',
    },
    tags: [
      { name: 'category', value: 'digest' },
      {
        name: 'business',
        value: businessName
          .toLowerCase()
          .replace(/[^a-z0-9_-]/g, '-')
          .replace(/-+/g, '-')
          .slice(0, 50),
      },
    ],
  })

  if (error) {
    console.error('[Resend] Email send error:', error)
    throw error
  }

  console.log('[Resend] Digest sent to:', to, 'ID:', data?.id)
  return data
}
