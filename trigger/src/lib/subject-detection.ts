import OpenAI from 'openai'

export interface SubjectMetadata {
  domain: string
  subfield: string
  content_type: string
  academic_level: string
  has_math: boolean
  has_code: boolean
  has_proofs: boolean
  has_lab_content: boolean
  pedagogical_framework: string
  scaffolding_direction: string
  component_emphasis: string[]
}

const SUBJECT_DETECTION_SCHEMA = {
  type: 'object' as const,
  properties: {
    domain: { type: 'string' as const },
    subfield: { type: 'string' as const },
    content_type: { type: 'string' as const },
    academic_level: { type: 'string' as const },
    has_math: { type: 'boolean' as const },
    has_code: { type: 'boolean' as const },
    has_proofs: { type: 'boolean' as const },
    has_lab_content: { type: 'boolean' as const },
    pedagogical_framework: { type: 'string' as const },
    scaffolding_direction: { type: 'string' as const },
    component_emphasis: { type: 'array' as const, items: { type: 'string' as const } },
  },
  required: [
    'domain',
    'subfield',
    'content_type',
    'academic_level',
    'has_math',
    'has_code',
    'has_proofs',
    'has_lab_content',
    'pedagogical_framework',
    'scaffolding_direction',
    'component_emphasis',
  ],
  additionalProperties: false as const,
}

/**
 * Detect subject/domain from document text using GPT-5.4 Nano.
 * Runs in ~2s, costs ~$0.0004. Designed to run in parallel with chunking.
 */
export async function detectSubject(
  rawText: string,
  title: string,
  apiKey: string,
): Promise<SubjectMetadata> {
  const openai = new OpenAI({ apiKey })
  const preview = rawText.slice(0, 3000)

  const response = await openai.chat.completions.create({
    model: 'gpt-5.4-nano',
    response_format: {
      type: 'json_schema',
      json_schema: { name: 'subject', schema: SUBJECT_DETECTION_SCHEMA, strict: true },
    },
    messages: [
      {
        role: 'system',
        content: `You classify academic documents. Return JSON with:
- domain: one of: mathematics, computer-science, physics, chemistry, biology, engineering, humanities, social-sciences, business, languages, general
- subfield: specific subfield (e.g. "linear-algebra", "digital-logic", "organic-chemistry")
- content_type: one of: lecture-notes, textbook-chapter, homework, exam, lab-report, research-paper, tutorial, reference-sheet
- academic_level: one of: high-school, undergraduate, graduate, professional
- has_math, has_code, has_proofs, has_lab_content: booleans
- pedagogical_framework: best teaching framework for this subject. One of: worked-examples (math), PRIMM (programming), 5E (lab-sciences), socratic (humanities), case-method (business), comprehensible-input (languages), design-based (engineering), general
- scaffolding_direction: one of: concrete-to-abstract (STEM), abstract-to-concrete (humanities), read-before-write (CS), observe-hypothesize-test (sciences), general
- component_emphasis: array of 3-5 most important lesson component types for this subject from: text, concept_definition, process_flow, comparison_table, analogy_card, key_takeaway, mini_quiz, code_explainer, interactive_widget, concept_bridge, timeline, quote_block`,
      },
      {
        role: 'user',
        content: `Document title: "${title}"\n\nContent preview:\n${preview}`,
      },
    ],
    max_completion_tokens: 300,
  })

  return JSON.parse(response.choices[0]?.message?.content ?? '{}') as SubjectMetadata
}
