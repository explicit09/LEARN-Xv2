import { describe, it, expect } from 'vitest'
import { buildAiRequestRow } from '../lib/tracked-generate'

describe('buildAiRequestRow', () => {
  it('builds a valid ai_requests row from call metadata', () => {
    const row = buildAiRequestRow({
      workspaceId: 'ws-123',
      userId: 'user-456',
      model: 'claude-haiku-4-5-20251001',
      provider: 'anthropic',
      promptTokens: 1500,
      completionTokens: 800,
      latencyMs: 2340,
      taskName: 'generate-lessons',
      promptVersion: 'lesson-generation.v2',
      validationPassed: true,
    })

    expect(row.workspace_id).toBe('ws-123')
    expect(row.user_id).toBe('user-456')
    expect(row.model).toBe('claude-haiku-4-5-20251001')
    expect(row.provider).toBe('anthropic')
    expect(row.prompt_tokens).toBe(1500)
    expect(row.completion_tokens).toBe(800)
    expect(row.latency_ms).toBe(2340)
    expect(row.task_name).toBe('generate-lessons')
    expect(row.prompt_version).toBe('lesson-generation.v2')
    expect(row.validation_passed).toBe(true)
    expect(row.was_cached).toBe(false)
  })

  it('defaults was_cached to false', () => {
    const row = buildAiRequestRow({
      workspaceId: 'ws-1',
      userId: 'u-1',
      model: 'gpt-4o',
      provider: 'openai',
      promptTokens: 0,
      completionTokens: 0,
      latencyMs: 100,
      taskName: 'test',
      promptVersion: 'v1',
      validationPassed: false,
    })
    expect(row.was_cached).toBe(false)
  })

  it('includes cost_usd when provided', () => {
    const row = buildAiRequestRow({
      workspaceId: 'ws-1',
      userId: 'u-1',
      model: 'claude-sonnet-4-6',
      provider: 'anthropic',
      promptTokens: 1000,
      completionTokens: 500,
      latencyMs: 5000,
      taskName: 'generate-syllabus',
      promptVersion: 'v1',
      validationPassed: true,
      costUsd: 0.0105,
    })
    expect(row.cost_usd).toBeCloseTo(0.0105, 4)
  })
})
