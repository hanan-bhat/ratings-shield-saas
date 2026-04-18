const BUSINESS_WORDS = [
  'restaurant', 'cafe', 'bar', 'grill', 'kitchen',
  'house', 'garden', 'wildflower', 'bistro', 'diner',
  'lounge', 'inn', 'hotel', 'spa', 'salon', 'studio',
]

function getFirstName(reviewerName: string | null | undefined): string {
  if (!reviewerName) return ''

  const name = reviewerName.trim()
  const nameLower = name.toLowerCase()

  if (BUSINESS_WORDS.some(word => nameLower.includes(word))) return ''

  const firstName = name.split(' ')[0]
  if (firstName.length > 12) return ''

  return firstName
}

export async function generateReviewResponse(
  reviewText: string,
  starRating: number,
  businessName: string,
  tone: string,
  avoidPhrases: string,
  reviewerName?: string
): Promise<string> {
  const firstName = getFirstName(reviewerName)

  const negativeExtras = starRating <= 2 ? `
For serious safety or health complaints (mentions of: foreign objects, metal, glass, hair, illness, injury, food poisoning, allergic reaction):
- Do NOT use phrases like "your safety is our priority" or "we take this seriously" — these are clichés
- Instead be specific: "Finding a metal wire in your meal is genuinely unacceptable"
- Show real urgency: "We are investigating exactly how this happened"
- Be human: express actual concern not corporate language
- Keep the apology front and center — do not pivot quickly to positives` : ''

  const systemPrompt = `You are writing a Google review response on behalf of ${businessName}.

Tone: ${tone}
${avoidPhrases ? `Never use these phrases: ${avoidPhrases}` : ''}

Strict rules:
- ${firstName ? `Start with the reviewer's first name: "${firstName},"` : `Start with "Hi there,"`}
- Never use placeholder text like [email address] — instead write "please contact us directly through our website" or "reach out to our team directly"
- Never add a sign-off like "Warm regards" or sign the business name at the end — Google responses already show the business name
- Never start with "Thank you for your review" or "Thank you for taking the time"
- For 1-2 star reviews: acknowledge their specific complaint by name, apologize sincerely, say you will investigate, invite them to contact you directly
- For 3 star reviews: thank them warmly, acknowledge what fell short, invite them back
- For 4-5 star reviews: show genuine excitement, reference something specific they mentioned, invite them back
- Sound like a real person not a corporate PR team
- Maximum 120 words
- No bullet points, no formatting, just natural prose${negativeExtras}`

  const userPrompt = `Write a response to this ${starRating}-star review from ${firstName || 'a customer'}:

"${reviewText || '(No text — reviewer left only a star rating.)'}"`

  const response = await fetch('https://openrouter.ai/api/v1/chat/completions', {
    method: 'POST',
    headers: {
      'Authorization': `Bearer ${process.env.OPENROUTER_API_KEY}`,
      'Content-Type': 'application/json',
    },
    body: JSON.stringify({
      model: 'openai/gpt-4o',
      messages: [
        { role: 'system', content: systemPrompt },
        { role: 'user', content: userPrompt },
      ],
    }),
  })

  if (!response.ok) {
    throw new Error(`OpenRouter error: ${response.status} ${response.statusText}`)
  }

  const data = await response.json()
  return data.choices?.[0]?.message?.content ?? ''
}
