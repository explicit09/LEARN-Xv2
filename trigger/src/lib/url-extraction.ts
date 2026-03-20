import { logger } from '@trigger.dev/sdk/v3'

/**
 * Extract text content from a URL source (web page or YouTube video).
 */
export async function extractFromUrl(url: string, isYouTube: boolean): Promise<string> {
  if (isYouTube) {
    return extractYouTubeContent(url)
  }
  return extractWebPageContent(url)
}

async function extractWebPageContent(url: string): Promise<string> {
  const response = await fetch(url, {
    headers: { 'User-Agent': 'LEARN-X/1.0 (Educational Content Ingestion)' },
    signal: AbortSignal.timeout(30_000),
  })
  if (!response.ok)
    throw new Error(`Failed to fetch URL: ${response.status} ${response.statusText}`)
  const html = await response.text()

  const text = html
    .replace(/<script[\s\S]*?<\/script>/gi, '')
    .replace(/<style[\s\S]*?<\/style>/gi, '')
    .replace(/<[^>]+>/g, ' ')
    .replace(/&nbsp;/g, ' ')
    .replace(/&amp;/g, '&')
    .replace(/&lt;/g, '<')
    .replace(/&gt;/g, '>')
    .replace(/&quot;/g, '"')
    .replace(/&#39;/g, "'")
    .replace(/\s+/g, ' ')
    .trim()

  if (text.length < 50) throw new Error(`URL produced too little text (${text.length} chars)`)
  logger.info('Web page extracted', { url, textLength: text.length })
  return text
}

/**
 * Extract YouTube video content via Gemini.
 * Pass the URL as a file part with mediaType 'video/mp4' — the AI SDK
 * sends it directly to Gemini without downloading.
 * One YouTube video URL per request is supported.
 */
async function extractYouTubeContent(url: string): Promise<string> {
  const { createGoogleGenerativeAI } = await import('@ai-sdk/google')
  const { generateText } = await import('ai')
  const google = createGoogleGenerativeAI({ apiKey: process.env.GOOGLE_API_KEY! })

  const { text } = await generateText({
    model: google('gemini-2.5-flash'),
    messages: [
      {
        role: 'user',
        content: [
          {
            type: 'file',
            data: url,
            mediaType: 'video/mp4',
          },
          {
            type: 'text',
            text: 'Produce a comprehensive transcript of this video with key topics as markdown headings. Include all important information, examples, and explanations. Output only the content — no commentary.',
          },
        ],
      },
    ],
    maxOutputTokens: 65536,
  })

  if (text.length < 50) throw new Error('YouTube extraction produced too little text')
  logger.info('YouTube content extracted via Gemini', { url, textLength: text.length })
  return text
}
