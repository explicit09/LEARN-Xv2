import { describe, it, expect } from 'vitest'
import {
  lessonSectionSchema,
  listLessonsSchema,
  getLessonSchema,
  markCompleteSchema,
} from '../lesson'

describe('lessonSectionSchema', () => {
  it('accepts text section', () => {
    const result = lessonSectionSchema.safeParse({ type: 'text', content: 'Hello world' })
    expect(result.success).toBe(true)
  })

  it('accepts concept_definition section', () => {
    const result = lessonSectionSchema.safeParse({
      type: 'concept_definition',
      term: 'Newton',
      definition: 'A unit of force',
    })
    expect(result.success).toBe(true)
  })

  it('accepts concept_definition with optional analogy and etymology', () => {
    const result = lessonSectionSchema.safeParse({
      type: 'concept_definition',
      term: 'Force',
      definition: 'A push or pull',
      analogy: 'Like pushing a shopping cart',
      etymology: 'From Latin fortis',
    })
    expect(result.success).toBe(true)
  })

  it('accepts process_flow section', () => {
    const result = lessonSectionSchema.safeParse({
      type: 'process_flow',
      title: 'Solving F=ma',
      steps: [
        { label: 'Step 1', description: 'Identify knowns' },
        { label: 'Step 2', description: 'Solve for unknown' },
      ],
    })
    expect(result.success).toBe(true)
  })

  it('accepts comparison_table section', () => {
    const result = lessonSectionSchema.safeParse({
      type: 'comparison_table',
      title: 'Heavy vs Light',
      columns: ['Object', 'Mass', 'Acceleration'],
      rows: [{ label: 'Tennis ball', values: ['0.06 kg', '167 m/s²'] }],
    })
    expect(result.success).toBe(true)
  })

  it('accepts analogy_card section', () => {
    const result = lessonSectionSchema.safeParse({
      type: 'analogy_card',
      concept: 'Electric Current',
      analogy: 'Water flowing through a pipe',
      mapping: [{ abstract: 'Voltage', familiar: 'Water pressure' }],
    })
    expect(result.success).toBe(true)
  })

  it('accepts key_takeaway section', () => {
    const result = lessonSectionSchema.safeParse({
      type: 'key_takeaway',
      points: ['Point 1', 'Point 2'],
    })
    expect(result.success).toBe(true)
  })

  it('accepts mini_quiz section', () => {
    const result = lessonSectionSchema.safeParse({
      type: 'mini_quiz',
      question: 'What is F=ma?',
      options: [
        { label: 'A', text: 'Force = mass × acceleration', is_correct: true },
        { label: 'B', text: 'Frequency = mass × amplitude', is_correct: false },
      ],
      explanation: "Newton's second law states F=ma",
    })
    expect(result.success).toBe(true)
  })

  it('accepts quote_block section', () => {
    const result = lessonSectionSchema.safeParse({
      type: 'quote_block',
      quote: 'If I have seen further...',
      attribution: 'Isaac Newton',
    })
    expect(result.success).toBe(true)
  })

  it('accepts timeline section', () => {
    const result = lessonSectionSchema.safeParse({
      type: 'timeline',
      title: 'History of Physics',
      events: [
        {
          date: '1687',
          label: 'Principia published',
          description: 'Newton publishes laws of motion',
        },
      ],
    })
    expect(result.success).toBe(true)
  })

  it('accepts concept_bridge section', () => {
    const result = lessonSectionSchema.safeParse({
      type: 'concept_bridge',
      from: 'Velocity',
      to: 'Acceleration',
      relation: 'prerequisite',
      explanation: 'You need velocity before acceleration',
    })
    expect(result.success).toBe(true)
  })

  it('accepts code_explainer section', () => {
    const result = lessonSectionSchema.safeParse({
      type: 'code_explainer',
      language: 'python',
      code: 'force = mass * acceleration',
      annotations: [{ line: 1, note: 'Apply F=ma' }],
    })
    expect(result.success).toBe(true)
  })

  it('rejects unknown section type', () => {
    const result = lessonSectionSchema.safeParse({ type: 'unknown_type', content: 'hi' })
    expect(result.success).toBe(false)
  })

  it('rejects text section missing content', () => {
    const result = lessonSectionSchema.safeParse({ type: 'text' })
    expect(result.success).toBe(false)
  })

  it('rejects concept_bridge with invalid relation', () => {
    const result = lessonSectionSchema.safeParse({
      type: 'concept_bridge',
      from: 'A',
      to: 'B',
      relation: 'invented',
      explanation: 'bad relation',
    })
    expect(result.success).toBe(false)
  })
})

describe('listLessonsSchema', () => {
  it('accepts valid workspaceId', () => {
    const result = listLessonsSchema.safeParse({
      workspaceId: 'a1b2c3d4-e5f6-7890-abcd-ef1234567890',
    })
    expect(result.success).toBe(true)
  })

  it('rejects non-uuid workspaceId', () => {
    const result = listLessonsSchema.safeParse({ workspaceId: 'not-a-uuid' })
    expect(result.success).toBe(false)
  })
})

describe('getLessonSchema', () => {
  it('accepts valid id and workspaceId', () => {
    const result = getLessonSchema.safeParse({
      id: 'a1b2c3d4-e5f6-7890-abcd-ef1234567890',
      workspaceId: 'a1b2c3d4-e5f6-7890-abcd-ef1234567891',
    })
    expect(result.success).toBe(true)
  })

  it('rejects missing id', () => {
    const result = getLessonSchema.safeParse({
      workspaceId: 'a1b2c3d4-e5f6-7890-abcd-ef1234567890',
    })
    expect(result.success).toBe(false)
  })
})

describe('markCompleteSchema', () => {
  it('accepts valid id and workspaceId', () => {
    const result = markCompleteSchema.safeParse({
      id: 'a1b2c3d4-e5f6-7890-abcd-ef1234567890',
      workspaceId: 'a1b2c3d4-e5f6-7890-abcd-ef1234567891',
    })
    expect(result.success).toBe(true)
  })

  it('rejects missing workspaceId', () => {
    const result = markCompleteSchema.safeParse({ id: 'a1b2c3d4-e5f6-7890-abcd-ef1234567890' })
    expect(result.success).toBe(false)
  })
})
