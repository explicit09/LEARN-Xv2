import { generateText, Output } from 'ai'
import { z } from 'zod'

import { openaiProvider, MODEL_ROUTES } from './ai'

const roleSchema = z.object({
  role: z.enum(['primary', 'supplementary', 'reference']),
  confidence: z.number().min(0).max(1),
  reasoning: z.string(),
})

/**
 * Classify a document's role using LLM analysis of its first ~2000 chars,
 * page count, and structural features.
 *
 * - primary: textbook, lecture notes, main course material (defines syllabus)
 * - supplementary: extra reading, slides that support existing topics
 * - reference: formula sheet, glossary, appendix (RAG-only, no syllabus impact)
 */
export async function classifyDocumentRole(
  text: string,
  title: string,
  pageCount: number | null,
): Promise<{ role: 'primary' | 'supplementary' | 'reference'; confidence: number }> {
  const preview = text.slice(0, 2000)
  const hasTableOfContents = /table of contents|contents\n/i.test(preview)
  const hasHeadings = (preview.match(/^#{1,3}\s/gm) ?? []).length

  const prompt = `Classify this document's role in a course workspace.

Title: ${title}
Page count: ${pageCount ?? 'unknown'}
Has table of contents: ${hasTableOfContents}
Heading count (first 2000 chars): ${hasHeadings}

First 2000 characters:
${preview}

Classify as:
- "primary": Main course material (textbook chapters, comprehensive lecture notes, syllabi). These define the course structure.
- "supplementary": Supporting material (slides, extra readings, practice problems). These add depth to existing topics.
- "reference": Quick-reference material (formula sheets, glossaries, cheat sheets, appendices). These are for lookup only.

Return your classification with confidence (0-1) and brief reasoning.`

  try {
    const result = await generateText({
      model: openaiProvider(MODEL_ROUTES.FAST_GENERATION),
      output: Output.object({ schema: roleSchema }),
      prompt,
    })
    return { role: result.output.role, confidence: result.output.confidence }
  } catch {
    // Default to primary with low confidence if classification fails
    return { role: 'primary', confidence: 0.5 }
  }
}
