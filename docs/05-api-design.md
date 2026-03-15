# API Design

## Overview

Two API surfaces:

1. **tRPC** — all CRUD, queries, mutations. TypeScript-to-TypeScript, zero codegen, end-to-end types.
2. **Vercel AI SDK route handlers** — all streaming AI responses (chat, completions). Not tRPC — SSE over plain HTTP.

The Python AI service (Phase 2+) exposes REST endpoints. FastAPI auto-generates OpenAPI, which feeds `@hey-api/openapi-ts` to produce typed TypeScript clients. Never hand-write types for the Python service.

---

## tRPC Conventions

```typescript
// Procedure types
publicProcedure        // no auth required (landing, pricing)
protectedProcedure     // requires valid Supabase session

// All mutations return the created/updated entity
// All list queries support cursor pagination
// All inputs validated against @learn-x/validators schemas
```

### Error codes used
- `UNAUTHORIZED` — no session or session expired
- `FORBIDDEN` — authenticated but no access to this resource (wrong user_id)
- `NOT_FOUND` — entity doesn't exist
- `BAD_REQUEST` — input validation failed
- `TOO_MANY_REQUESTS` — rate limit hit
- `INTERNAL_SERVER_ERROR` — unexpected failure (always log to Sentry)

---

## Router Reference

### user

```typescript
user.getProfile: protectedProcedure
  // → User & { persona: Persona | null }

user.updateProfile: protectedProcedure
  .input({ displayName?: string, avatarUrl?: string })
  // → User

user.upsertPersona: protectedProcedure
  .input({
    learningStyle?: { visualPreference?, readingSpeed?, explanationDepth?, exampleStyle? },
    interests?: string[],
    tonePreference?: 'casual' | 'balanced' | 'academic' | 'socratic',
    difficultyPreference?: 'beginner' | 'intermediate' | 'advanced' | 'adaptive',
  })
  // Creates new version if substantive change, otherwise updates current
  // → Persona

user.completeOnboarding: protectedProcedure
  // → User (onboarding_completed = true)
```

### workspace

```typescript
workspace.create: protectedProcedure
  .input({ name: string (1–200), description?: string })
  // → Workspace

workspace.list: protectedProcedure
  .input({ status?: 'active' | 'archived', cursor?: string, limit?: number (default 20) })
  // → { workspaces: Workspace[], nextCursor?: string }

workspace.get: protectedProcedure
  .input({ workspaceId: UUID })
  // → Workspace (403 if not owner)

workspace.update: protectedProcedure
  .input({ workspaceId: UUID, name?: string, description?: string, settings?: object })
  // → Workspace

workspace.archive: protectedProcedure
  .input({ workspaceId: UUID })
  // → Workspace (status = 'archived')

workspace.getStats: protectedProcedure
  .input({ workspaceId: UUID })
  // → { documentCount, lessonCount, conceptCount, avgMastery, dueReviewCount }
```

### document

```typescript
document.initiateUpload: protectedProcedure
  .input({
    workspaceId: UUID,
    fileName: string,
    fileType: 'pdf' | 'docx' | 'pptx' | 'txt',
    fileSize: number (max 50_000_000),
  })
  // Creates document record + returns Supabase signed upload URL
  // → { document: Document, uploadUrl: string }

document.confirmUpload: protectedProcedure
  .input({ documentId: UUID, storagePath: string })
  // Confirms upload complete, triggers process-document Job
  // → { document: Document, job: Job }

document.addUrl: protectedProcedure
  .input({ workspaceId: UUID, url: string, type: 'url' | 'youtube' })
  // Creates document + triggers ingestion Job
  // → { document: Document, job: Job }

document.list: protectedProcedure
  .input({ workspaceId: UUID })
  // → Document[]

document.get: protectedProcedure
  .input({ documentId: UUID })
  // → Document

document.delete: protectedProcedure
  .input({ documentId: UUID })
  // Deletes document + chunks + embeddings (CASCADE), removes from storage
  // → { success: true }
```

### lesson

```typescript
lesson.list: protectedProcedure
  .input({ workspaceId: UUID })
  // → Lesson[] (ordered by order_index)

lesson.get: protectedProcedure
  .input({ lessonId: UUID })
  // → Lesson & { concepts: Concept[], prevLesson?: { id, title }, nextLesson?: { id, title } }

lesson.markStarted: protectedProcedure
  .input({ lessonId: UUID })
  // Records LESSON_STARTED event, → void

lesson.updateProgress: protectedProcedure
  .input({ lessonId: UUID, timeSpentSeconds: number })
  // → void

lesson.markCompleted: protectedProcedure
  .input({ lessonId: UUID, timeSpentSeconds: number })
  // Sets completed_at, fires LESSON_COMPLETED event, updates mastery records
  // → Lesson

lesson.regenerate: protectedProcedure
  .input({ lessonId: UUID })
  // Triggers new lesson_generation Job with updated persona
  // → Job
```

### chat

```typescript
// NOTE: chat.sendMessage only PERSISTS the user message.
// The AI response streams via /api/chat (AI SDK SSE endpoint).
// The client calls both: tRPC to persist, then AI SDK to stream.

chat.createSession: protectedProcedure
  .input({ workspaceId: UUID, lessonId?: UUID })
  // → ChatSession

chat.listSessions: protectedProcedure
  .input({ workspaceId: UUID, cursor?: string })
  // → { sessions: ChatSession[], nextCursor?: string }

chat.getMessages: protectedProcedure
  .input({ sessionId: UUID, cursor?: string, limit?: number (default 50) })
  // → { messages: ChatMessage[], nextCursor?: string }

chat.persistUserMessage: protectedProcedure
  .input({ sessionId: UUID, content: string (1–10_000) })
  // → { messageId: UUID }
  // Client then uses this messageId to correlate with the streamed response

chat.persistAssistantMessage: protectedProcedure
  .input({ sessionId: UUID, content: string, citedChunkIds?: UUID[], modelUsed?: string, tokenCount?: number, latencyMs?: number })
  // Called by the client after streaming completes
  // → ChatMessage
```

### quiz

```typescript
quiz.generate: protectedProcedure
  .input({
    workspaceId: UUID,
    lessonId?: UUID,
    conceptIds?: UUID[],
    quizType: 'practice' | 'review' | 'exam_prep' | 'diagnostic',
    questionCount?: number (default 5, max 20),
    questionTypes?: Array<'mcq' | 'short_answer' | 'fill_blank' | 'true_false'>,
    difficultyLevel?: 1 | 2 | 3 | 4 | 5,
  })
  // Triggers quiz_generation Job
  // → Job

quiz.list: protectedProcedure
  .input({ workspaceId: UUID, lessonId?: UUID })
  // → Quiz[]

quiz.get: protectedProcedure
  .input({ quizId: UUID })
  // → Quiz & { questions: QuizQuestion[] }

quiz.startAttempt: protectedProcedure
  .input({ quizId: UUID })
  // → QuizAttempt

quiz.submitResponse: protectedProcedure
  .input({
    attemptId: UUID,
    questionId: UUID,
    userAnswer: string,
  })
  // Evaluates answer (LLM for open-ended, exact match for MCQ/T-F)
  // Updates mastery record
  // → { isCorrect: boolean, aiFeedback: string, correctAnswer?: string }

quiz.completeAttempt: protectedProcedure
  .input({ attemptId: UUID })
  // Calculates final score, fires QUIZ_COMPLETED event
  // → QuizAttempt (with score)
```

### flashcard

```typescript
flashcard.generateSet: protectedProcedure
  .input({
    workspaceId: UUID,
    sourceType: 'lesson' | 'workspace',
    sourceId: UUID,
    cardCount?: number (default 10, max 30),
  })
  // Triggers flashcard_generation Job
  // → Job

flashcard.listSets: protectedProcedure
  .input({ workspaceId: UUID })
  // → FlashcardSet[]

flashcard.getSet: protectedProcedure
  .input({ setId: UUID })
  // → FlashcardSet & { cards: Flashcard[] }

flashcard.getDueCards: protectedProcedure
  .input({ workspaceId?: UUID, limit?: number (default 20) })
  // Calls get_due_flashcards RPC
  // → Flashcard[]

flashcard.submitReview: protectedProcedure
  .input({
    cardId: UUID,
    rating: 1 | 2 | 3 | 4,  // Again | Hard | Good | Easy
    reviewDurationMs?: number,
  })
  // Runs FSRS algorithm (ts-fsrs), updates card scheduling fields
  // Logs FlashcardReview, fires FLASHCARD_REVIEWED event
  // Updates mastery record for linked concept
  // → { nextCard?: Flashcard, updatedCard: Flashcard }
```

### mastery

```typescript
mastery.getWorkspaceSummary: protectedProcedure
  .input({ workspaceId: UUID })
  // Calls get_workspace_mastery_summary RPC
  // → { totalConcepts, masteredConcepts, strugglingConcepts, avgMastery, dueReviewCount }

mastery.getConceptDetail: protectedProcedure
  .input({ conceptId: UUID })
  // → MasteryRecord & { concept: Concept, relatedConcepts: Concept[] }

mastery.getTimeline: protectedProcedure
  .input({ workspaceId: UUID, days?: number (default 30) })
  // → { date: string, avgMastery: number, eventsCount: number }[]

mastery.getWeakConcepts: protectedProcedure
  .input({ workspaceId: UUID, limit?: number (default 5) })
  // → Concept[] ordered by mastery_level ASC where level < 0.5

mastery.getWhatToStudyNext: protectedProcedure
  .input({ workspaceId: UUID })
  // Combines: due flashcards, weak concepts, incomplete lessons
  // → { type: 'flashcard_review' | 'lesson' | 'quiz', entityId: UUID, reason: string }[]
```

### concept

```typescript
concept.list: protectedProcedure
  .input({ workspaceId: UUID })
  // → Concept[]

concept.getGraph: protectedProcedure
  .input({ workspaceId: UUID })
  // → { nodes: Concept[], edges: ConceptRelation[] }
  // For rendering the concept map visualization

concept.getRelated: protectedProcedure
  .input({ conceptId: UUID, depth?: number (default 2) })
  // → Concept[] (within N hops in the graph)
```

### job

```typescript
job.get: protectedProcedure
  .input({ jobId: UUID })
  // → Job

job.list: protectedProcedure
  .input({ workspaceId?: UUID, status?: string, limit?: number (default 20) })
  // → Job[]

job.cancel: protectedProcedure
  .input({ jobId: UUID })
  // Attempts to cancel via Trigger.dev, sets status = 'cancelled'
  // → Job
```

### analytics

```typescript
analytics.getDashboard: protectedProcedure
  // → {
  //   recentWorkspaces: Workspace[],
  //   studyStreak: number,
  //   totalStudyMinutes: number,
  //   totalConceptsMastered: number,
  //   recentActivity: LearningEvent[],
  // }

analytics.getStudyHeatmap: protectedProcedure
  .input({ year?: number })
  // → { date: string, minutes: number }[]  (GitHub contribution graph style)
```

---

## AI SDK Streaming Routes

### POST /api/chat

Streams the AI response for a chat session. Called by the client immediately after `chat.persistUserMessage`.

```typescript
// app/api/chat/route.ts
export async function POST(req: Request) {
  const { sessionId, messages } = await req.json()

  // 1. Validate auth (Supabase session cookie)
  // 2. Load session → workspace → persona
  // 3. Embed the latest user message
  // 4. hybrid_search(workspaceId, embedding, queryText, 8)
  // 5. Build system prompt: persona context + retrieved chunks with citations
  // 6. Stream response

  const result = streamText({
    model: openai('gpt-4o'),
    system: buildSystemPrompt({ persona, retrievedChunks, session }),
    messages,
    onFinish: async ({ text, usage }) => {
      // Persist assistant message via direct DB write (not tRPC)
      // Fire CHAT_MESSAGE_SENT event
      // Update mastery signals if concepts referenced
    },
  })

  return result.toDataStreamResponse()
}
```

### POST /api/completions/[type]

Single-turn completions (no streaming state needed on client):

| Route | Used for |
|-------|---------|
| `/api/completions/explain` | "Explain this concept differently" |
| `/api/completions/hint` | Socratic hint for a quiz question |
| `/api/completions/feedback` | Short-answer quiz evaluation |

---

## System Prompt Structure

All chat system prompts follow this structure to maximize provider-level prompt caching:

```
[CACHED PREFIX — same for all users in this workspace]
You are a learning assistant for LEARN-X...
[workspace documents summary]
[concept graph context]

[USER-SPECIFIC SUFFIX — persona-dependent, small]
Student learning style: ...
Tone: ...
Current lesson: ...

[RETRIEVED CONTEXT — injected per query]
Relevant source material:
[chunk 1 with citation tag]
[chunk 2 with citation tag]
...
```

The cached prefix must come first and stay stable. User-specific content goes at the end. This structure yields 50–60% cost reduction via provider-level caching.

---

## Rate Limits

| Endpoint | Limit | Window |
|----------|-------|--------|
| `/api/chat` | 30 requests | per user per hour |
| `quiz.generate` | 10 requests | per user per hour |
| `flashcard.generateSet` | 10 requests | per user per hour |
| `lesson.regenerate` | 5 requests | per user per hour |

Implemented via Upstash Redis sliding window. Returns `429 Too Many Requests` with `Retry-After` header.
