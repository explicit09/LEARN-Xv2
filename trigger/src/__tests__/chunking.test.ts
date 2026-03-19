import { describe, expect, it } from 'vitest'

import { chunkText, estimateTokens } from '../lib/chunker'

describe('estimateTokens', () => {
  it('returns 0 for empty string', () => {
    expect(estimateTokens('')).toBe(0)
  })

  it('estimates ~1 token per 4 characters', () => {
    // 400 chars ≈ 100 tokens
    expect(estimateTokens('a'.repeat(400))).toBe(100)
  })
})

describe('chunkText', () => {
  it('returns empty array for empty text', () => {
    expect(chunkText('')).toEqual([])
  })

  it('returns single chunk for short text', () => {
    const text = 'This is a short paragraph about machine learning.'
    const chunks = chunkText(text)
    expect(chunks).toHaveLength(1)
    expect(chunks[0]!.content).toBe(text)
    expect(chunks[0]!.chunkIndex).toBe(0)
  })

  it('chunks long text into ≤512-token segments', () => {
    // ~2500 tokens worth of text
    const sentence =
      'The gradient descent algorithm converges when the loss function reaches a minimum. '
    const text = sentence.repeat(120)
    const chunks = chunkText(text)
    expect(chunks.length).toBeGreaterThan(1)
    for (const chunk of chunks) {
      expect(estimateTokens(chunk.content)).toBeLessThanOrEqual(560) // 512 + small tolerance
    }
  })

  it('assigns sequential chunkIndex values starting at 0', () => {
    const sentence = 'Machine learning is a subset of artificial intelligence. '
    const text = sentence.repeat(150)
    const chunks = chunkText(text)
    expect(chunks.length).toBeGreaterThan(1)
    chunks.forEach((chunk, i) => {
      expect(chunk.chunkIndex).toBe(i)
    })
  })

  it('maintains overlap — end of chunk N appears in chunk N+1', () => {
    const sentence =
      'Deep learning uses neural networks with many layers to learn representations. '
    const text = sentence.repeat(150)
    const chunks = chunkText(text)
    expect(chunks.length).toBeGreaterThan(1)
    // Last few words of chunk[0] should appear somewhere in chunk[1]
    const lastWords = chunks[0]!.content.trim().split(/\s+/).slice(-5).join(' ')
    expect(chunks[1]!.content).toContain(lastWords)
  })

  it('never produces empty chunks', () => {
    const text = 'word '.repeat(800)
    const chunks = chunkText(text)
    for (const chunk of chunks) {
      expect(chunk.content.trim().length).toBeGreaterThan(0)
    }
  })

  it('reports tokenCount for each chunk', () => {
    const text = 'This is a test sentence for chunking. '.repeat(100)
    const chunks = chunkText(text)
    for (const chunk of chunks) {
      expect(chunk.tokenCount).toBeGreaterThan(0)
      expect(chunk.tokenCount).toBe(estimateTokens(chunk.content))
    }
  })

  it('keeps code fences as atomic chunks', () => {
    const code = '```python\ndef hello():\n    print("world")\n```'
    const text =
      'Some intro text. '.repeat(20) + '\n\n' + code + '\n\n' + 'Some outro text. '.repeat(20)
    const chunks = chunkText(text)
    // The code block should appear in exactly one chunk, unbroken
    const codeChunk = chunks.find((c) => c.content.includes('def hello()'))
    expect(codeChunk).toBeDefined()
    expect(codeChunk!.content).toContain('```python')
    expect(codeChunk!.content).toContain('print("world")')
    expect(codeChunk!.content).toContain('```')
  })

  it('keeps markdown tables as atomic chunks', () => {
    const table = '| A | B |\n| --- | --- |\n| 1 | 2 |\n| 3 | 4 |'
    const text =
      'Intro paragraph. '.repeat(20) + '\n\n' + table + '\n\n' + 'Outro paragraph. '.repeat(20)
    const chunks = chunkText(text)
    const tableChunk = chunks.find((c) => c.content.includes('| A | B |'))
    expect(tableChunk).toBeDefined()
    expect(tableChunk!.content).toContain('| 3 | 4 |')
  })

  it('handles text with no atomic blocks identically to before', () => {
    const text = 'Plain prose without any code or tables. '.repeat(100)
    const chunks = chunkText(text)
    expect(chunks.length).toBeGreaterThan(1)
    for (const chunk of chunks) {
      expect(chunk.tokenCount).toBeLessThanOrEqual(560)
    }
  })
})
