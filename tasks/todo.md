# Tasks

## Task: Phase 0 — Foundations

**Goal:** Scaffold the full monorepo so `pnpm dev` starts the web app, `user.getProfile` tRPC call returns data from Supabase, Trigger.dev health task runs, and Helicone logs a test request.
**Phase:** 0

### Summary

Complete. Monorepo, tRPC, Supabase, Drizzle ORM, Trigger.dev scaffolded. 50 unit tests passing. All packages typecheck clean.

---

## Task: Phase 1A — Auth + Workspace Shell

**Goal:** Supabase Auth (email/password + Google OAuth), onboarding, workspace CRUD, authenticated layout.
**Phase:** 1A

### Plan

#### Validators (test-first)

- [x] `packages/validators/src/__tests__/persona.test.ts` — upsertPersonaSchema (failing first)
- [x] Extend `packages/validators/src/__tests__/workspace.test.ts` — updateWorkspaceSchema (failing first)
- [x] `packages/validators/src/persona.ts` — upsertPersonaSchema
- [x] `packages/validators/src/user.ts` — add updateProfileSchema
- [x] `packages/validators/src/workspace.ts` — add updateWorkspaceSchema
- [x] `packages/validators/src/index.ts` — export new schemas
- [x] `packages/types/src/index.ts` — export new types

#### tRPC Procedures (contract tests first)

- [x] Extend `user.contract.test.ts` — updateProfile, upsertPersona, completeOnboarding
- [x] `workspace.contract.test.ts` — create, list, get, update, delete
- [x] `apps/web/src/server/routers/user.ts` — add updateProfile, upsertPersona, completeOnboarding
- [x] `apps/web/src/server/routers/workspace.ts` — new router
- [x] `apps/web/src/server/routers/_app.ts` — merge workspaceRouter

#### Middleware

- [x] `apps/web/src/lib/supabase/middleware.ts` — auth guards (unauth → /login, auth on /login → /dashboard)

#### UI

- [x] `src/app/(auth)/login/page.tsx`
- [x] `src/app/(auth)/register/page.tsx`
- [x] `src/app/(auth)/verify-email/page.tsx`
- [x] `src/app/(auth)/callback/route.ts`
- [x] `src/app/(app)/layout.tsx`
- [x] `src/app/(app)/onboarding/page.tsx`
- [x] `src/app/(app)/dashboard/page.tsx`
- [x] `src/app/(app)/workspace/[id]/page.tsx`
- [x] `src/app/(app)/workspace/[id]/layout.tsx`
- [x] `src/components/auth/LoginForm.tsx`
- [x] `src/components/auth/RegisterForm.tsx`
- [x] `src/components/workspace/WorkspaceCard.tsx`
- [x] `src/components/workspace/CreateWorkspaceModal.tsx`
- [x] `src/components/layout/Sidebar.tsx`
- [x] `src/components/layout/Topbar.tsx`

### Verification

- [x] `pnpm --filter @learn-x/validators test:unit` — 51 tests pass (14 persona + 20 workspace + 17 user)
- [x] `pnpm typecheck` — all 7 packages clean
- [x] `pnpm --filter web test:contract` — all user + workspace procedures pass (run against hosted Supabase)
- [x] Browser E2E: register → confirm email → login → onboarding (3 steps) → dashboard → create workspace → workspace detail shell

### Summary

Phase 1A complete. Validators, tRPC procedures, auth pages, onboarding (3-step), dashboard, workspace shell all implemented. Auth middleware guards protected routes. 71 unit tests pass, all 7 packages typecheck clean. tRPC context uses Supabase JS client (REST API) — no direct Postgres connection needed. Full E2E flow verified in browser.

---

## Task: Phase 1B — Document Ingestion

**Goal:** Upload a PDF → parse → chunk → embed → store. Live job progress bar in UI.
**Phase:** 1B

### Plan

#### Validators (test-first)

- [x] `packages/validators/src/__tests__/document.test.ts` — 14 tests pass
- [x] `packages/validators/src/document.ts` — documentStatusEnum, documentFileTypeEnum, initiateUploadSchema, confirmUploadSchema
- [x] Update `packages/validators/src/index.ts` — export document schemas

#### Database migration

- [x] `supabase/migrations/0002_phase1b_documents.sql` — applied to hosted Supabase

#### Drizzle schema

- [x] `apps/web/src/server/db/schema.ts` — halfvec custom type + 5 new tables

#### Chunking logic (test-first)

- [x] Set up vitest in trigger package (package.json + vitest.config.ts)
- [x] `trigger/src/__tests__/chunking.test.ts` — 9 tests pass
- [x] `trigger/src/lib/chunker.ts` — structure-aware 512-token chunks, 15% overlap

#### tRPC procedures (contract tests first)

- [x] `apps/web/src/server/routers/__tests__/document.contract.test.ts` — 12 tests pass
- [x] `apps/web/src/server/routers/document.ts` — initiateUpload, confirmUpload, list, get, delete
- [x] `apps/web/src/server/routers/_app.ts` — merge documentRouter

#### Trigger.dev job

- [x] Install packages: `openai`, `@supabase/supabase-js` in trigger
- [x] `trigger/src/jobs/process-document.ts` — download→parse→chunk→enrich→embed→store

#### UI

- [x] `apps/web/src/components/document/UploadDropzone.tsx`
- [x] `apps/web/src/components/document/DocumentList.tsx`
- [x] `apps/web/src/components/document/JobProgress.tsx` — Realtime subscription
- [x] `apps/web/src/components/document/WorkspaceDocuments.tsx` — client wrapper with cache invalidation
- [x] `apps/web/src/app/(app)/workspace/[id]/page.tsx` — document list + upload

### Verification

- [x] `pnpm test:unit` — 94 tests pass (65 validators + 20 utils + 9 chunker)
- [x] `pnpm --filter web test:contract` — 32 tests pass (10 user + 10 workspace + 12 document)
- [x] `pnpm typecheck` — all 7 packages clean
- [x] Browser: upload TXT → document appears in list with status "processing"

### Summary

Phase 1B complete. Documents table + chunks + chunk_embeddings + jobs + ai_requests migrated. hybrid_search SQL function deployed. Validators, contract tests, tRPC router, Trigger.dev process-document job, and upload UI all implemented. Full upload flow verified in browser.

---

## Task: Phase 1C — Concept Graph + Syllabus

**Goal:** Extract concepts from chunks, build concept graph, generate learning syllabus. Workspace page shows Concepts + Syllabus tabs.
**Phase:** 1C

### Plan

#### Validators (test-first)

- [x] `packages/validators/src/__tests__/concept.test.ts` — 10 tests pass
- [x] `packages/validators/src/concept.ts` — conceptRelationTypeEnum, conceptSchema
- [x] `packages/validators/src/index.ts` — export new schemas

#### Concept-utils (test-first)

- [x] `trigger/src/__tests__/concept-utils.test.ts` — 9 tests pass
- [x] `trigger/src/lib/concept-utils.ts` — normalizeConceptName, deduplicateConcepts

#### Database migration

- [x] `supabase/migrations/0003_phase1c_concepts.sql` — 8 tables + RLS applied
- [x] `apps/web/src/server/db/schema.ts` — 8 new tables added

#### tRPC procedures (contract tests first)

- [x] `apps/web/src/server/routers/__tests__/concept.contract.test.ts` — 7 tests pass
- [x] `apps/web/src/server/routers/concept.ts` — concept.list
- [x] `apps/web/src/server/routers/syllabus.ts` — syllabus.get
- [x] `apps/web/src/server/routers/_app.ts` — merged conceptRouter + syllabusRouter

#### Trigger.dev jobs

- [x] `trigger/src/lib/prompts/extract-concepts.v1.ts` — versioned, no example_of
- [x] `trigger/src/lib/prompts/generate-syllabus.v1.ts` — versioned
- [x] `trigger/src/lib/ai.ts` — MODEL_ROUTES + anthropic/openai providers for trigger
- [x] `trigger/src/jobs/extract-concepts.ts` — Vercel AI SDK + claude-sonnet-4-6 + correct column names
- [x] `trigger/src/jobs/generate-syllabus.ts` — Vercel AI SDK + claude-sonnet-4-6 + syllabus_id in topics
- [x] `trigger/src/jobs/process-document.ts` — Anthropic Contextual Retrieval (Haiku + doc caching), fixed embeddings insert

#### Corrections (migration 0004 + code fixes)

- [x] `supabase/migrations/0004_schema_corrections.sql` — applied to hosted Supabase
- [x] `apps/web/src/server/db/schema.ts` — all tables corrected (concept_relations column renames, chunkEmbeddings PK, chunkConcepts composite PK, new columns)
- [x] `packages/validators/src/concept.ts` — removed example_of (not in docs/03-database.md)
- [x] `trigger/package.json` — added @ai-sdk/anthropic, @ai-sdk/openai, ai, zod

#### UI

- [x] `apps/web/src/components/concept/ConceptList.tsx`
- [x] `apps/web/src/components/syllabus/SyllabusView.tsx`
- [x] `apps/web/src/app/(app)/workspace/[id]/page.tsx` — tabs: Documents | Concepts | Syllabus

### Verification

- [x] `pnpm test:unit` — 114 tests pass (18 trigger + 76 validators + 20 utils)
- [x] `pnpm typecheck` — all 7 packages clean

### Summary

Phase 1C complete with corrections. 8 DB tables + RLS deployed via migrations 0003+0004. All jobs rewritten to use Vercel AI SDK (generateObject/generateText) with MODEL_ROUTES. process-document uses Anthropic Contextual Retrieval (Haiku + document caching) per docs/07-ai-pipeline.md. concept_relations uses source_concept_id/target_concept_id with correct unique index. Prompt files versioned (.v1.ts). Drizzle schema mirrors DB exactly.

---

## Task: Phase 1D — Lesson Generation (Generative UI)

**Goal:** After concept graph exists, generate structured lessons (component specs, not markdown). Workspace page shows Lessons tab. Students can read lessons and mark them complete.
**Phase:** 1D
**Branch:** feat/phase-1D-lesson-generation

### Docs read (mandatory before coding)

- [x] `docs/10-generative-ui.md` — component types, LessonSection discriminated union, LessonRenderer
- [x] `docs/07-ai-pipeline.md` — MODEL_ROUTES (claude-sonnet-4-6), lesson generation prompt, generateObject
- [x] `docs/03-database.md` — lessons, lesson_concepts tables, syllabus_topic_id FK

### Plan

#### Step 1 — Validator tests (FAILING first) → implement

- [x] `packages/validators/src/__tests__/lesson.test.ts` — lessonSectionSchema (all types), 21 tests pass
- [x] `packages/validators/src/lesson.ts` — lessonSectionSchema (discriminated union), listLessonsSchema, getLessonSchema, markCompleteSchema
- [x] `packages/validators/src/index.ts` — export lesson schemas

#### Step 2 — Database migration

- [x] `supabase/migrations/0005_phase1d_lessons.sql`:
  - `lessons` table: id, workspace_id, user_id, title, order_index, content_markdown, structured_sections JSONB, summary, key_takeaways TEXT[], prompt_version, model_used, generation_cost_cents, syllabus_topic_id UUID REFERENCES syllabus_topics(id) ON DELETE SET NULL, source_updated BOOLEAN, is_completed BOOLEAN, completed_at, time_spent_seconds, created_at, updated_at
  - `lesson_concepts` table: lesson_id, concept_id, is_primary BOOLEAN, PRIMARY KEY(lesson_id, concept_id)
  - RLS on both tables (workspace owner via JOIN users)
  - Indexes: idx_lessons_workspace ON lessons(workspace_id, order_index), idx_lesson_concepts_lesson ON lesson_concepts(lesson_id)
- [x] Apply migration via Supabase MCP

#### Step 3 — Drizzle schema update

- [x] `apps/web/src/server/db/schema.ts` — add `lessons` table + `lessonConcepts` table (mirror migration exactly)

#### Step 4 — Prompt file

- [x] `apps/web/src/lib/ai/prompts/lesson-generation.v1.ts`:
  - `buildLessonPrompt(params: { concept: string, prerequisites: string[], retrievedChunks: string[], persona?: PersonaContext }): string`
  - `LESSON_COMPONENT_INSTRUCTIONS` (from docs/10-generative-ui.md)
  - `PROMPT_VERSION = 'lesson-generation.v1'`
  - No interactive_widget in 1D — only: text, concept_definition, process_flow, comparison_table, analogy_card, key_takeaway, mini_quiz, quote_block, timeline, concept_bridge, code_explainer

#### Step 5 — Trigger.dev job (unit tests first for pure logic)

- [x] `trigger/src/__tests__/lesson-ordering.test.ts` — test topological sort of concepts by prerequisites
- [x] `trigger/src/lib/concept-ordering.ts` — `orderConceptsByPrerequisites(concepts, relations): Concept[]` (Kahn's algorithm)
- [x] `trigger/src/jobs/generate-lessons.ts`:
  - id: 'generate-lessons'
  - payload: `{ workspaceId: string, userId: string }`
  - Steps:
    1. Fetch all concepts for workspace with their prerequisite relations
    2. Topological sort (prerequisites first) using concept-ordering lib
    3. Fetch user persona (for personalization context)
    4. Fetch active syllabus topics to group concepts into lesson clusters
    5. For each topic cluster (or ungrouped concept group):
       a. Retrieve chunks via `hybrid_search` (10 chunks per lesson)
       b. Call `generateObject` with `anthropic(MODEL_ROUTES.LESSON_GENERATION)` + lessonSectionSchema
       c. Record `ai_requests` row
       d. Insert `lessons` row with structured_sections JSONB
       e. Insert `lesson_concepts` rows
    6. Update jobs row to completed (100%)
    7. Early return if no concepts exist

#### Step 6 — tRPC contract tests (FAILING first) → implement

- [x] `apps/web/src/server/routers/__tests__/lesson.contract.test.ts`:
  - `lesson.list` — UNAUTHORIZED when no session; returns [] for workspace with no lessons; returns lessons after seeding
  - `lesson.get` — UNAUTHORIZED; NOT_FOUND for wrong workspace; returns lesson with sections
  - `lesson.markComplete` — UNAUTHORIZED; marks lesson as complete, sets completed_at
  - `lesson.triggerGenerate` — UNAUTHORIZED; enqueues generate-lessons job, returns jobId
- [x] `apps/web/src/server/routers/lesson.ts` — implement all 4 procedures
- [x] `apps/web/src/server/routers/_app.ts` — merge lessonRouter

#### Step 7 — UI components

- [x] `apps/web/src/components/lesson/sections/TextSection.tsx`
- [x] `apps/web/src/components/lesson/sections/ConceptDefinition.tsx`
- [x] `apps/web/src/components/lesson/sections/ProcessFlow.tsx`
- [x] `apps/web/src/components/lesson/sections/ComparisonTable.tsx`
- [x] `apps/web/src/components/lesson/sections/AnalogyCard.tsx`
- [x] `apps/web/src/components/lesson/sections/KeyTakeaway.tsx`
- [x] `apps/web/src/components/lesson/sections/MiniQuiz.tsx`
- [x] `apps/web/src/components/lesson/sections/QuoteBlock.tsx`
- [x] `apps/web/src/components/lesson/sections/Timeline.tsx`
- [x] `apps/web/src/components/lesson/sections/ConceptBridge.tsx`
- [x] `apps/web/src/components/lesson/sections/CodeExplainer.tsx`
- [x] `apps/web/src/components/lesson/LessonRenderer.tsx` — routes section.type to component
- [x] `apps/web/src/components/lesson/LessonCard.tsx` — card in list (title, completion status, concept count)
- [x] `apps/web/src/components/lesson/LessonList.tsx` — trpc.lesson.list.useQuery, loading skeleton, empty state + generate button
- [x] `apps/web/src/app/(app)/workspace/[id]/lesson/[lessonId]/page.tsx` — lesson detail with LessonRenderer + prev/next nav + mark complete button
- [x] Update `apps/web/src/app/(app)/workspace/[id]/page.tsx` — add Lessons tab

### Verification

- [x] `pnpm test:unit` — lesson-ordering tests + all prior tests pass (123 unit tests)
- [x] `pnpm --filter web test:contract` — lesson procedures pass + all prior procedures pass (49 contract tests)
- [x] `pnpm typecheck` — all packages clean
- [x] `pnpm lint` — zero errors
- [x] Browser: workspace → Lessons tab → Generate Lessons → lessons appear → click lesson → LessonRenderer shows structured components → Mark Complete works

### Phase 1D Summary

**Completed:** 2026-03-15. All Phase 1D deliverables implemented TDD-first.

- 11 LessonSection types (discriminatedUnion): text, concept_definition, process_flow, comparison_table, analogy_card, key_takeaway, mini_quiz, quote_block, timeline, concept_bridge, code_explainer
- Kahn's algorithm topological sort for concept ordering (cycle-safe)
- `generate-lessons` Trigger.dev job: fetches concepts → topo-sorts → RAG per concept → generateObject (claude-sonnet-4-6) → inserts lessons
- 4 tRPC procedures: lesson.list, lesson.get, lesson.markComplete, lesson.triggerGenerate
- 11 section React components + LessonRenderer + LessonList + LessonCard + lesson detail page
- Workspace page updated with Lessons tab
- 123 unit tests, 49 contract tests, all packages typecheck clean
- **Lesson learned:** lint-staged + turbo incompatible (turbo rejects file path args) — removed pnpm lint from lint-staged, kept only prettier.

---

## Phase 1E — Grounded Chat

**Branch:** feat/phase-1E-grounded-chat

### Docs read (mandatory before coding)

- [x] `docs/07-ai-pipeline.md` — full-context vs RAG decision gate, MODEL_ROUTES (CHAT/FULL_CONTEXT_CHAT), prompt caching blocks, ai_requests Rule 6
- [x] `docs/03-database.md` — chat_sessions + chat_messages schema, RLS pattern
- [x] `docs/01-architecture.md` — ADR-008 SSE for streaming, ADR-005 Vercel AI SDK route for streaming

### Plan

#### Step 1 — Validator tests (FAILING first) → implement

- [ ] `packages/validators/src/__tests__/chat.test.ts`:
  - `createChatSessionSchema` validates workspaceId uuid, optional lessonId uuid
  - `sendMessageSchema` validates sessionId uuid, content non-empty string
  - rejects invalid uuids
- [ ] `packages/validators/src/chat.ts`:
  - `createChatSessionSchema`, `listChatSessionsSchema`, `getChatSessionSchema`, `deleteChatSessionSchema`, `sendMessageSchema`
- [ ] `packages/validators/src/index.ts` — export chat schemas

#### Step 2 — Database migration

- [ ] `supabase/migrations/0006_phase1e_chat.sql`:
  - `chat_sessions` table: id, workspace_id, user_id, lesson_id REFERENCES lessons(id) ON DELETE SET NULL, title TEXT, created_at, updated_at
  - `chat_messages` table: id, session_id REFERENCES chat_sessions(id) ON DELETE CASCADE, role TEXT CHECK IN ('user','assistant','system'), content TEXT NOT NULL, cited_chunk_ids UUID[], model_used TEXT, token_count INTEGER, latency_ms INTEGER, created_at
  - Indexes: idx_chat_sessions_workspace, idx_chat_messages_session
  - RLS: chat_sessions workspace-scoped (JOIN users u ON u.id = w.user_id WHERE u.auth_id = auth.uid()); chat_messages via session
- [ ] Apply migration via Supabase MCP

#### Step 3 — Drizzle schema update

- [ ] `apps/web/src/server/db/schema.ts` — add `chatSessions` + `chatMessages` tables mirroring migration exactly

#### Step 4 — Prompt file

- [ ] `apps/web/src/lib/ai/prompts/chat-system.v1.ts`:
  - `buildChatSystemPrompt(params: { workspaceName: string, persona?: PersonaContext }): string`
  - `CHAT_PROMPT_VERSION = 'chat-system.v1'`
  - Static instructions block (cacheable prefix) + persona block

#### Step 5 — Streaming API route

- [ ] `apps/web/src/app/api/chat/route.ts` (POST handler):
  1. Auth check: get Supabase user, load `users` row + workspace ownership
  2. Load session: validate sessionId belongs to workspace
  3. Load workspace `total_token_count`
  4. **Decision gate:** `total_token_count < 500_000` → full-context (fetch document texts, build cached blocks, use `MODEL_ROUTES.FULL_CONTEXT_CHAT = claude-opus-4-6`) else RAG (embed query → `hybrid_search` → 8 chunks, use `MODEL_ROUTES.CHAT = claude-sonnet-4-6`)
  5. Build messages: `[systemBlock, ...conversationHistory, userMessage]`
  6. `streamText({ model: anthropic(modelId), messages })` with `onFinish`:
     - Persist assistant message to `chat_messages` (content, cited_chunk_ids, token_count, latency_ms)
     - Insert `ai_requests` row (task_type: 'chat', provider: 'anthropic', model, prompt_version, input/output tokens, latency, cost_cents, was_cached)
  7. Return `result.toDataStreamResponse()`
- [ ] Input schema: `{ sessionId: string, message: string }`

#### Step 6 — tRPC contract tests (FAILING first) → implement

- [ ] `apps/web/src/server/routers/__tests__/chat.contract.test.ts`:
  - `chat.createSession` — UNAUTHORIZED; creates session + returns id, workspaceId; sets lesson_id when provided
  - `chat.listSessions` — UNAUTHORIZED; returns [] for empty workspace; returns sessions ordered by updated_at DESC
  - `chat.getSession` — UNAUTHORIZED; NOT_FOUND wrong workspace; returns session with messages array
  - `chat.deleteSession` — UNAUTHORIZED; deletes session; cascades to messages
- [ ] `apps/web/src/server/routers/chat.ts`:
  - `chat.createSession` — insert session row, return it
  - `chat.listSessions` — list sessions for workspace ordered by updated_at DESC
  - `chat.getSession` — get session + its messages ordered by created_at ASC
  - `chat.deleteSession` — delete by id + workspace ownership check
- [ ] `apps/web/src/server/routers/_app.ts` — merge chatRouter

#### Step 7 — UI components

- [ ] `apps/web/src/components/chat/ChatMessage.tsx` — displays single message; assistant messages show citation badges; badge click → popover with chunk text + doc title
- [ ] `apps/web/src/components/chat/CitationPopover.tsx` — Radix popover showing cited chunk content
- [ ] `apps/web/src/components/chat/ChatInput.tsx` — textarea with send button (cmd+enter to submit)
- [ ] `apps/web/src/components/chat/ChatSessionList.tsx` — list of sessions in sidebar, "New Chat" button, active session highlight
- [ ] `apps/web/src/components/chat/ChatInterface.tsx` (client, 'use client'):
  - `useChat` from `ai/react` with `api: '/api/chat'`, `body: { sessionId }`
  - On `onFinish`: invalidate `chat.getSession` via `trpc.useUtils()`
  - Scrolls to bottom on new message
  - Loading indicator while streaming
- [ ] `apps/web/src/app/(app)/workspace/[id]/chat/page.tsx` — creates new session then redirects to `/workspace/[id]/chat/[sessionId]`
- [ ] `apps/web/src/app/(app)/workspace/[id]/chat/[sessionId]/page.tsx` — server component; loads session; renders ChatInterface + ChatSessionList

### Verification

- [ ] `pnpm test:unit` — chat validator tests pass + all prior tests pass
- [ ] `pnpm --filter web test:contract` — chat procedures pass + all prior procedures pass
- [ ] `pnpm typecheck` — all packages clean
- [ ] `pnpm lint` — zero errors
- [ ] Browser: workspace → Chat tab → send message → streaming response → citation badges appear → new session creates cleanly
