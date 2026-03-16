// Centralized AI request tracking for Trigger.dev jobs.
// Ensures every LLM call is recorded in ai_requests (Rule 6).

export interface AiCallMetadata {
  workspaceId: string
  userId: string
  model: string
  provider: 'anthropic' | 'openai' | 'google'
  promptTokens: number
  completionTokens: number
  latencyMs: number
  taskName: string
  promptVersion: string
  validationPassed: boolean
  wasCached?: boolean
  costUsd?: number
}

export interface AiRequestRow {
  workspace_id: string
  user_id: string
  model: string
  provider: string
  prompt_tokens: number
  completion_tokens: number
  latency_ms: number
  task_name: string
  prompt_version: string
  validation_passed: boolean
  was_cached: boolean
  cost_usd?: number
}

/**
 * Build an ai_requests row from call metadata.
 * Pure function — does not insert into DB.
 */
export function buildAiRequestRow(meta: AiCallMetadata): AiRequestRow {
  return {
    workspace_id: meta.workspaceId,
    user_id: meta.userId,
    model: meta.model,
    provider: meta.provider,
    prompt_tokens: meta.promptTokens,
    completion_tokens: meta.completionTokens,
    latency_ms: meta.latencyMs,
    task_name: meta.taskName,
    prompt_version: meta.promptVersion,
    validation_passed: meta.validationPassed,
    was_cached: meta.wasCached ?? false,
    ...(meta.costUsd != null ? { cost_usd: meta.costUsd } : {}),
  }
}
