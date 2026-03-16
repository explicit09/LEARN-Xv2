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

- [x] `packages/validators/src/__tests__/chat.test.ts`
- [x] `packages/validators/src/chat.ts`
- [x] `packages/validators/src/index.ts` — export chat schemas

#### Step 2 — Database migration

- [x] `supabase/migrations/0006_phase1e_chat.sql` — chat_sessions + chat_messages + RLS
- [x] Apply migration via Supabase MCP

#### Step 3 — Drizzle schema update

- [x] `apps/web/src/server/db/schema.ts` — chatSessions + chatMessages

#### Step 4 — Prompt file

- [x] `apps/web/src/lib/ai/prompts/chat-system.v1.ts`

#### Step 5 — Streaming API route

- [x] `apps/web/src/app/api/chat/route.ts` — full-context/RAG gate, streamText, onFinish

#### Step 6 — tRPC contract tests (FAILING first) → implement

- [x] `apps/web/src/server/routers/__tests__/chat.contract.test.ts`
- [x] `apps/web/src/server/routers/chat.ts`
- [x] `apps/web/src/server/routers/_app.ts` — merged chatRouter

#### Step 7 — UI components

- [x] `apps/web/src/components/chat/ChatMessage.tsx`
- [x] `apps/web/src/components/chat/CitationPopover.tsx`
- [x] `apps/web/src/components/chat/ChatInput.tsx`
- [x] `apps/web/src/components/chat/ChatSessionList.tsx`
- [x] `apps/web/src/components/chat/ChatInterface.tsx`
- [x] `apps/web/src/app/(app)/workspace/[id]/chat/page.tsx`
- [x] `apps/web/src/app/(app)/workspace/[id]/chat/[sessionId]/page.tsx`

### Verification

- [x] `pnpm test:unit` — 155 unit tests pass
- [x] `pnpm --filter web test:contract` — 60 contract tests pass (11 new chat tests)
- [x] `pnpm typecheck` — all 7 packages clean
- [x] `pnpm lint` — zero errors
- [x] Migration applied + chat session/message tables operational

### Phase 1E Summary

**Completed:** 2026-03-15. Streaming chat with full-context/RAG gate.

- Decision gate: `total_token_count < 500K` → claude-opus-4-6 (full-context); else hybrid_search + claude-sonnet-4-6
- Vercel AI SDK `streamText`, `onFinish` persists assistant message + `ai_requests` (Rule 6)
- 4 tRPC procedures (all use `ctx.supabase` not drizzle — direct PG port not reachable in this env)
- 5 chat UI components + session detail page
- **Lesson learned:** All tRPC routers must use `ctx.supabase` (Supabase JS client), not drizzle directly. Direct PostgreSQL port (5432) to `db.[project].supabase.co` is unreachable; only the REST API port works.

---

## Phase 1F — Quizzes + Flashcards

**Branch:** feat/phase-1F-quizzes-flashcards

### Docs read (mandatory before coding)

- [x] `docs/03-database.md` — quizzes, quiz_questions, quiz_attempts, quiz_responses, flashcard_sets, flashcards, flashcard_reviews schema + get_due_flashcards RPC
- [x] `docs/07-ai-pipeline.md` — MODEL_ROUTES.FAST_GENERATION (gemini-2.0-flash-lite for quizzes/flashcards), ai_requests Rule 6
- [x] `docs/12-personalization-engine.md` — persona context for quiz difficulty + flashcard domain

### Plan

#### Step 1 — Validator tests (FAILING first) → implement

- [ ] `packages/validators/src/__tests__/quiz.test.ts`:
  - `createQuizSchema` validates workspaceId uuid, optional lessonId uuid, quizType enum
  - `submitResponseSchema` validates attemptId uuid, questionId uuid, userAnswer string
  - rejects invalid enum values
- [ ] `packages/validators/src/__tests__/flashcard.test.ts`:
  - `createFlashcardSetSchema` validates workspaceId uuid, title string, sourceType enum
  - `submitReviewSchema` validates cardId uuid, rating 1-4 integer
- [ ] `packages/validators/src/quiz.ts` — createQuizSchema, getQuizSchema, startAttemptSchema, submitResponseSchema, completeAttemptSchema, triggerGenerateQuizSchema
- [ ] `packages/validators/src/flashcard.ts` — createFlashcardSetSchema, getFlashcardSetSchema, getDueFlashcardsSchema, submitReviewSchema, triggerGenerateFlashcardsSchema
- [ ] `packages/validators/src/index.ts` — export quiz + flashcard schemas

#### Step 2 — Database migration

- [ ] `supabase/migrations/0007_phase1f_practice.sql`:
  - `quizzes`: id, workspace_id, lesson_id nullable, user_id, title, quiz_type CHECK IN ('practice','review','exam_prep','diagnostic'), difficulty_level, created_at
  - `quiz_questions`: id, quiz_id, question_type CHECK IN ('mcq','short_answer','fill_blank','true_false'), bloom_level, question_text, options JSONB, correct_answer, explanation, concept_id nullable, order_index, created_at
  - `quiz_attempts`: id, quiz_id, user_id, score REAL, time_spent_seconds, completed_at, created_at
  - `quiz_responses`: id, attempt_id, question_id, user_answer, is_correct, ai_feedback, created_at
  - `flashcard_sets`: id, workspace_id, user_id, title, source_type CHECK IN ('lesson','workspace','manual'), source_id, card_count, created_at
  - `flashcards`: id, set_id, user_id, front, back, concept_id nullable, fsrs_stability REAL DEFAULT 0, fsrs_difficulty REAL DEFAULT 0, fsrs_elapsed_days INT DEFAULT 0, fsrs_scheduled_days INT DEFAULT 0, fsrs_reps INT DEFAULT 0, fsrs_lapses INT DEFAULT 0, fsrs_state TEXT CHECK IN ('new','learning','review','relearning') DEFAULT 'new', next_review_at TIMESTAMPTZ, last_review_at TIMESTAMPTZ, created_at
  - `flashcard_reviews`: id, card_id, user_id, rating INT CHECK BETWEEN 1 AND 4, review_duration_ms, created_at
  - Indexes: idx_flashcards_due (partial, where fsrs_state != 'new'), all FK indexes
  - RLS on all 7 tables (workspace/user-scoped)
  - `get_due_flashcards(p_user_id UUID, p_limit INT DEFAULT 20)` RPC function
- [ ] Apply migration via Supabase MCP

#### Step 3 — Prompt files

- [ ] `apps/web/src/lib/ai/prompts/quiz-generation.v1.ts`:
  - `buildQuizPrompt(params: { conceptNames: string[], retrievedChunks: string[], lessonTitle?: string, questionCount?: number, bloomLevels?: string[] }): string`
  - `QUIZ_PROMPT_VERSION = 'quiz-generation.v1'`
  - Uses Gemini Flash-Lite (FAST_GENERATION)
- [ ] `apps/web/src/lib/ai/prompts/flashcard-generation.v1.ts`:
  - `buildFlashcardPrompt(params: { conceptNames: string[], retrievedChunks: string[], count?: number }): string`
  - `FLASHCARD_PROMPT_VERSION = 'flashcard-generation.v1'`

#### Step 4 — Trigger.dev jobs

- [ ] `trigger/src/jobs/generate-quiz.ts`:
  - id: 'generate-quiz', payload: `{ workspaceId, lessonId?, userId }`
  - Fetch concepts for lesson or workspace → hybrid_search chunks per concept → call generateObject (gemini-2.0-flash-lite) → record ai_request → insert quiz + quiz_questions
- [ ] `trigger/src/jobs/generate-flashcards.ts`:
  - id: 'generate-flashcards', payload: `{ workspaceId, lessonId?, userId, setId }`
  - Fetch lesson chunks or workspace chunks → call generateObject (gemini-2.0-flash-lite) → record ai_request → insert flashcards into set, update card_count
- [ ] Copy prompt files to `trigger/src/lib/prompts/` (same as 1D pattern — no cross-package import)

#### Step 5 — tRPC contract tests (FAILING first) → implement

- [ ] `apps/web/src/server/routers/__tests__/quiz.contract.test.ts`:
  - `quiz.get` — UNAUTHORIZED; NOT_FOUND; returns quiz with questions
  - `quiz.startAttempt` — UNAUTHORIZED; creates attempt row; returns attempt with questions
  - `quiz.submitResponse` — UNAUTHORIZED; records response, returns is_correct
  - `quiz.completeAttempt` — UNAUTHORIZED; sets score + completed_at
  - `quiz.triggerGenerate` — UNAUTHORIZED; returns queued status
- [ ] `apps/web/src/server/routers/__tests__/flashcard.contract.test.ts`:
  - `flashcard.getDue` — UNAUTHORIZED; returns [] when no due cards; returns due cards
  - `flashcard.submitReview` — UNAUTHORIZED; updates FSRS state fields; inserts review row
  - `flashcard.triggerGenerate` — UNAUTHORIZED; returns queued status
- [ ] `apps/web/src/server/routers/quiz.ts` — all procedures using ctx.supabase
- [ ] `apps/web/src/server/routers/flashcard.ts` — all procedures using ctx.supabase; submitReview runs ts-fsrs to compute next state
- [ ] `apps/web/src/server/routers/_app.ts` — merge quizRouter + flashcardRouter

#### Step 6 — UI components

- [ ] `apps/web/src/components/quiz/QuizQuestion.tsx` — single question with MCQ options or text input; immediate feedback after answer
- [ ] `apps/web/src/components/quiz/QuizRunner.tsx` (client) — trpc.quiz.startAttempt.useMutation, steps through questions, submits responses, shows score at end
- [ ] `apps/web/src/components/quiz/QuizList.tsx` (client) — list quizzes in workspace + "Generate Quiz" button
- [ ] `apps/web/src/components/flashcard/FlashcardCard.tsx` — flip animation (front/back), rating buttons (Again/Hard/Good/Easy)
- [ ] `apps/web/src/components/flashcard/FlashcardReview.tsx` (client) — trpc.flashcard.getDue.useQuery, steps through due cards, submitReview mutation
- [ ] `apps/web/src/app/(app)/workspace/[id]/quiz/[quizId]/page.tsx` — quiz detail with QuizRunner
- [ ] `apps/web/src/app/(app)/workspace/[id]/flashcards/page.tsx` — flashcard review with FlashcardReview
- [ ] Update `apps/web/src/app/(app)/workspace/[id]/page.tsx` — add Quiz + Flashcards tabs

### Verification

- [ ] `pnpm test:unit` — quiz/flashcard validator tests pass + all prior tests pass
- [ ] `pnpm --filter web test:contract` — quiz/flashcard procedures pass + all prior procedures pass
- [ ] `pnpm typecheck` — all packages clean
- [ ] `pnpm lint` — zero errors

### Phase 1F Summary

Complete. Quizzes + Flashcards with FSRS spaced-repetition implemented.

- 7 new tables: quizzes, quiz_questions, quiz_attempts, quiz_responses, flashcard_sets, flashcards, flashcard_reviews
- `get_due_flashcards` RPC function with SECURITY DEFINER
- Validators: createQuizSchema, submitReviewSchema (rating 1-4), etc. — 130 unit tests passing
- tRPC routers: quiz (list/get/startAttempt/submitResponse/completeAttempt) + flashcard (listSets/getSet/getDue/submitReview)
- FSRS via `@learn-x/utils` rateCard() in submitReview
- Trigger.dev jobs: generate-quiz, generate-flashcards (gpt-4o-mini)
- UI: QuizRunner, QuizList, FlashcardCard, FlashcardReview, FlashcardSetList
- Quiz + Flashcard tabs on workspace page
- 72 contract tests passing, all 8 test files green
- Schema split: schema-practice.ts (7 tables) to stay under 400-line limit

---

## Task: Phase 1G — Mastery Dashboard

### Phase 1G Summary

Complete. Mastery Dashboard implemented.

- 2 new RPC functions: get_workspace_mastery_summary, get_weak_concepts
- tRPC router: mastery (getWorkspaceSummary/getWeakConcepts/getWhatToStudyNext)
- RPC functions use SECURITY DEFINER without auth.uid() — router handles authorization (lesson: test env auth.uid() is NULL)
- UI: MasteryDashboard with stats grid, "What to study next", struggling concepts with stability progress bars
- Mastery tab added to workspace page
- 78 contract tests passing across 9 test files

---

## Phase 2: Retention + Institutional Foundation

**Branch:** feat/phase-2-retention-institutional
**Goal:** Exam system, audio recaps, daily study plans, remediation paths, instructor tools.

### 2A — Exam System

#### Migration

- [ ] `supabase/migrations/0009_phase2a_exams.sql` — exams, exam_questions, exam_attempts, exam_responses tables + RLS + join_token unique index
- [ ] Apply via Supabase MCP (project_id: yluryjcvohdjvgdmeatk)

#### Validators (test-first)

- [ ] `packages/validators/src/__tests__/exam.test.ts` — failing tests for all exam schemas
- [ ] `packages/validators/src/exam.ts` — examStatusEnum, questionTypeEnum, bloomLevelEnum, createExamSchema, startExamSchema, submitResponseSchema, completeExamSchema, joinExamSchema
- [ ] `packages/validators/src/index.ts` — export exam schemas

#### Trigger.dev job

- [ ] `trigger/src/jobs/generate-exam.ts` — fetch concepts + chunks → gpt-4o-mini generateObject → insert exams + exam_questions → ai_requests row
  - Bloom's distribution: 30% remember/understand, 40% apply/analyze, 30% evaluate/create
  - Min 10 questions, 2-3 per concept

#### tRPC router (contract tests first)

- [ ] `apps/web/src/server/routers/__tests__/exam.contract.test.ts` — UNAUTHORIZED, list returns [], generate returns jobId, start returns attempt + questions, complete returns score
- [ ] `apps/web/src/server/routers/exam.ts` — list, get, generate, start, submitResponse, complete, share, joinByToken
- [ ] `apps/web/src/server/routers/_app.ts` — add exam: examRouter

#### UI

- [ ] `apps/web/src/app/(app)/workspace/[id]/exam/page.tsx` — exam list + Generate button
- [ ] `apps/web/src/app/(app)/workspace/[id]/exam/[examId]/page.tsx` — timed exam taking UI (countdown, one question at a time, MCQ/short_answer/true_false/fill_blank, auto-submit on timer)
- [ ] `apps/web/src/app/(app)/workspace/[id]/exam/[examId]/score/page.tsx` — score screen with letter grade, per-question review, Retake + Back buttons
- [ ] `apps/web/src/components/exam/ExamTimer.tsx` — countdown timer component
- [ ] Update workspace page — add Exams tab

### 2B — Audio Recaps

#### Migration

- [ ] `supabase/migrations/0010_phase2b_audio.sql` — audio_recaps table + RLS
- [ ] Apply via Supabase MCP

#### Trigger.dev job

- [ ] `trigger/src/jobs/generate-audio-recap.ts` — fetch lesson sections → LLM dialogue script → ElevenLabs TTS → Supabase Storage → insert audio_recaps row
  - If no ELEVENLABS_API_KEY: store placeholder MP3
  - Voices: Rachel (Host A), Antoni (Host B)

#### tRPC router (contract tests first)

- [ ] `apps/web/src/server/routers/__tests__/audioRecap.contract.test.ts`
- [ ] `apps/web/src/server/routers/audioRecap.ts` — get, generate, list
- [ ] `apps/web/src/server/routers/_app.ts` — add audioRecap: audioRecapRouter

#### UI

- [ ] `apps/web/src/components/lesson/AudioRecapPlayer.tsx` — play/pause, scrubber, time, Generate button + Generating skeleton
- [ ] Add AudioRecapPlayer to LessonReader component

### 2C — Daily Study Plans + Exam Prep

#### Migration

- [ ] `supabase/migrations/0011_phase2c_studyplans.sql` — study_plans table + RLS
- [ ] Apply via Supabase MCP

#### Trigger.dev job

- [ ] `trigger/src/jobs/generate-study-plan.ts` — mastery summary + due flashcards + incomplete lessons → prioritized plan (max 5 items) → readiness_score → upsert study_plans

#### tRPC router (contract tests first)

- [ ] `apps/web/src/server/routers/__tests__/studyPlan.contract.test.ts`
- [ ] `apps/web/src/server/routers/studyPlan.ts` — getToday, setExamDate, getReadinessScore, markItemComplete
- [ ] `apps/web/src/server/routers/_app.ts` — add studyPlan: studyPlanRouter

#### UI

- [ ] `apps/web/src/app/(app)/study/page.tsx` — Study Queue: ordered task list, readiness score meter, exam countdown
- [ ] `apps/web/src/components/workspace/ExamPrepBanner.tsx` — banner in workspace when exam date set

### 2D — Remediation + Notifications

#### Trigger.dev job

- [ ] `trigger/src/jobs/generate-remediation.ts` — concept weakness data → hybrid_search chunks → mini-lesson (500-800 words) + 3 practice questions via LLM → insert lessons (type='remediation') → ai_requests row

#### tRPC procedures (add to existing routers)

- [ ] `mastery.getRemediationPath(workspaceId, conceptId)` — trigger remediation job, return lessonId
- [ ] `notification.getDailyDigest(workspaceId?)` — { dueFlashcards, fadingConcepts, studyStreakDays }
- [ ] `apps/web/src/server/routers/notification.ts` — new router
- [ ] `apps/web/src/server/routers/_app.ts` — add notification: notificationRouter

#### UI

- [ ] `apps/web/src/components/mastery/RemediationButton.tsx` — "Fix now" button on struggling concepts
- [ ] Notification badge in Sidebar (due count from getDailyDigest)

### 2E — Professor/Instructor Tools

#### Migration

- [ ] `supabase/migrations/0012_phase2e_instructor.sql` — instructor_profiles, courses, course_enrollments, course_documents + RLS + join_code generation
- [ ] Apply via Supabase MCP

#### Validators (test-first)

- [ ] `packages/validators/src/__tests__/course.test.ts` — failing tests for course schemas
- [ ] `packages/validators/src/course.ts` — createCourseSchema, joinCourseSchema, addDocumentSchema
- [ ] `packages/validators/src/index.ts` — export course schemas

#### tRPC router (contract tests first)

- [ ] `apps/web/src/server/routers/__tests__/course.contract.test.ts` — UNAUTHORIZED, create, list, get, join
- [ ] `apps/web/src/server/routers/course.ts` — create, list, get, addDocument, removeDocument, inviteStudent, join, getConfusionAnalytics, getAtRiskStudents
- [ ] `apps/web/src/server/routers/_app.ts` — add course: courseRouter

#### UI

- [ ] `apps/web/src/app/(app)/instructor/page.tsx` — instructor dashboard: course list with student count + avg mastery, Create course button
- [ ] `apps/web/src/app/(app)/instructor/[courseId]/page.tsx` — course detail: student roster + mastery table, concept confusion heatmap, join code, document list
- [ ] `apps/web/src/app/(app)/instructor/[courseId]/join/page.tsx` — student join page via code

### Phase 2 Verification Gate

- [ ] `pnpm typecheck` — zero errors
- [ ] `pnpm lint` — zero errors
- [ ] `pnpm test:unit` — all green
- [ ] `pnpm --filter web test:contract` — all green
- [x] Playwright: /workspace/[id]/exam → Generate Exam → exam appears
- [x] Playwright: /workspace/[id]/exam/[id] → take exam → score screen
- [x] Playwright: /study → plan renders
- [x] Playwright: /instructor → page loads (empty state)
- [x] Architecture audit: no async in handlers, all LLM calls tracked, no files over 400 lines
- [ ] `git push origin feat/phase-2-retention-institutional`
- [ ] Mark [x] phase-2-retention-institutional in tasks/phases.md

---

## Phase 3 — Platform Expansion

### 3A — Cross-Workspace Knowledge Graph

**Goal:** Tag every concept with a canonical domain slug (e.g. `ml:gradient-descent`). Surface a global knowledge graph view for power users.

#### Migration

- [ ] `supabase/migrations/0013_phase3a_concept_tags.sql` — `concept_tags` (concept_id, tag, domain), `concept_relations_global` (source_canonical, target_canonical, relation_type)
- [ ] Apply via Supabase MCP

#### Validators (test-first)

- [ ] `packages/validators/src/__tests__/knowledgeGraph.test.ts` — failing tests for tagConceptSchema, getGraphSchema
- [ ] `packages/validators/src/knowledgeGraph.ts` — tagConceptSchema, getGraphSchema
- [ ] `packages/validators/src/index.ts` — export new schemas

#### tRPC router (contract tests first)

- [ ] `apps/web/src/server/routers/__tests__/knowledgeGraph.contract.test.ts` — UNAUTHORIZED, tagConcept, getGraph returns nodes+edges
- [ ] `apps/web/src/server/routers/knowledgeGraph.ts` — tagConcept, getGraph (aggregate from mastery_records across workspaces)
- [ ] `apps/web/src/server/routers/_app.ts` — add knowledgeGraph: knowledgeGraphRouter

#### UI

- [ ] `apps/web/src/app/(app)/workspace/[id]/graph/page.tsx` — Force-directed SVG graph (D3-lite, no external dep), node color = mastery %, edge = prerequisite
- [ ] `apps/web/src/app/(app)/workspace/[id]/page.tsx` — add 'graph' tab

---

### 3B — Collaborative Study Rooms

**Goal:** Students in the same course can enter a live study room, see each other's real-time confusion flags, and co-trigger a shared AI Q&A session.

#### Migration

- [ ] `supabase/migrations/0014_phase3b_study_rooms.sql` — `study_rooms` (id, course_id, host_user_id, status, created_at), `study_room_members` (room_id, user_id, joined_at), `study_room_messages` (room_id, user_id, content, created_at)
- [ ] Apply via Supabase MCP
- [ ] Enable Supabase Realtime on study_room_members and study_room_messages

#### Validators (test-first)

- [ ] `packages/validators/src/__tests__/studyRoom.test.ts` — failing tests for createRoomSchema, joinRoomSchema, sendMessageSchema
- [ ] `packages/validators/src/studyRoom.ts` — createRoomSchema, joinRoomSchema, sendMessageSchema
- [ ] `packages/validators/src/index.ts` — export new schemas

#### tRPC router (contract tests first)

- [ ] `apps/web/src/server/routers/__tests__/studyRoom.contract.test.ts` — UNAUTHORIZED, create returns roomId, join NOT_FOUND for bad room, list returns []
- [ ] `apps/web/src/server/routers/studyRoom.ts` — create, join, leave, list (open rooms for course), sendMessage, getMessages
- [ ] `apps/web/src/server/routers/_app.ts` — add studyRoom: studyRoomRouter

#### UI

- [ ] `apps/web/src/app/(app)/study-room/[roomId]/page.tsx` — real-time member list (Supabase Realtime), chat panel, "Ask AI" button → shared chat session
- [ ] `apps/web/src/app/(app)/instructor/[courseId]/page.tsx` — "Open study room" button

---

### 3C — Accessibility + Admin

**Goal:** Full keyboard navigation, screen reader support (ARIA), admin panel for usage metrics.

#### Accessibility audit + fixes

- [ ] Run axe audit via Playwright on /dashboard, /workspace/[id], /study, /instructor
- [ ] Fix all critical + serious violations (role attributes, focus management, contrast)
- [ ] `apps/web/src/components/layout/SkipLink.tsx` — "Skip to content" link
- [ ] Add `aria-label` / `aria-describedby` to all interactive elements missing them
- [ ] Keyboard focus trap in all modals (CreateCourseModal, etc.)

#### Admin panel (protected route, role=admin RLS)

- [ ] `supabase/migrations/0015_phase3c_admin.sql` — `user_roles` (user_id, role ENUM['user','admin']), RLS for admin-only queries
- [ ] `apps/web/src/server/routers/admin.ts` — getUsageStats (total users, workspaces, documents, AI requests in last 30d), listUsers
- [ ] `apps/web/src/app/(app)/admin/page.tsx` — metrics dashboard: user count, doc count, AI request count, top workspaces

---

### 3D — Offline Mode (PWA)

**Goal:** Cache last-accessed workspace + due flashcards for offline use. Sync when reconnected.

#### PWA setup

- [ ] Add `next-pwa` or `serwist` to web app
- [ ] `apps/web/public/manifest.json` — PWA manifest (name, icons, theme_color)
- [ ] Service worker: cache /dashboard, /workspace/[id] shell, flashcard review assets
- [ ] `apps/web/src/components/layout/OfflineBanner.tsx` — "You're offline — showing cached data" banner
- [ ] Background sync: queue flashcard reviews when offline, flush on reconnect

---

---

## Technical Debt — Tier 1 (Foundation Fixes)

**Branch:** `chore/tier1-tier2-tech-debt`
**Goal:** Fix critical gaps between docs and implementation before building new features.

### Task 1: Sync Drizzle Schema with Migrations (0008–0015)

**Why:** Half the database tables exist only as SQL migrations. Any TypeScript code expecting Drizzle schema will fail silently. This is the #1 structural gap.

**Plan:**
- [ ] Read migrations 0008-0015 to catalog all tables/columns
- [ ] Create `schema-mastery.ts` — mastery_records, learning_events (migration 0008)
- [ ] Create `schema-audio.ts` — audio_recaps (migration 0010)
- [ ] Create `schema-studyplans.ts` — study_plans (migration 0011)
- [ ] Create `schema-instructor.ts` — instructor_profiles, courses, course_enrollments, course_documents (migration 0012)
- [ ] Create `schema-knowledge-graph.ts` — concept_tags, concept_relations_global (migration 0013)
- [ ] Create `schema-study-rooms.ts` — study_rooms, study_room_members, study_room_messages (migration 0014)
- [ ] Create `schema-admin.ts` — user_roles (migration 0015)
- [ ] Export all from `schema.ts` barrel
- [ ] Run `pnpm typecheck` — verify zero errors
- [ ] Run `pnpm test:unit` — verify no regressions

### Task 2: Build `generate-study-plan` Trigger Job (Phase 2C)

**Why:** Study plans compute from mastery data + due flashcards + incomplete lessons. Currently inline in router, violating Rule 1 (every heavy task is a Job).

**Plan:**
- [ ] Read `docs/07-ai-pipeline.md` for job conventions
- [ ] Write FAILING test: `trigger/src/__tests__/study-plan.test.ts` — test priority scoring logic
- [ ] Create `trigger/src/lib/study-plan-scorer.ts` — pure function for prioritizing study items
- [ ] Implement tests → green
- [ ] Create `trigger/src/jobs/generate-study-plan.ts` — fetch mastery, due cards, incomplete lessons → prioritize → upsert study_plans
- [ ] Create validator: `packages/validators/src/studyPlan.ts` with FAILING tests first
- [ ] Update `studyPlan` router to trigger the job instead of inline computation
- [ ] Run `pnpm test:unit` + `pnpm typecheck`
- [ ] Browser test: /study page loads with generated plan

### Task 3: Add Rate Limiting Middleware

**Why:** No rate limiting on any endpoint. Production risk for cost + abuse. Docs specify Upstash Redis sliding window.

**Plan:**
- [ ] Install `@upstash/ratelimit` + `@upstash/redis`
- [ ] Create `apps/web/src/server/middleware/rate-limit.ts`
- [ ] Write FAILING test for rate limit logic (pure function test for window calculation)
- [ ] Implement rate limiter: 30/hr chat, 10/hr quiz.generate, 10/hr flashcard.generate, 5/hr lesson.regenerate
- [ ] Wire into tRPC middleware for affected procedures
- [ ] Add `UPSTASH_REDIS_REST_URL` + `UPSTASH_REDIS_REST_TOKEN` env vars
- [ ] Run `pnpm typecheck`
- [ ] Browser test: verify 429 response after exceeding limit

---

## Technical Debt — Tier 2 (Quality Infrastructure)

### Task 4: Build Evaluation Tooling (`tooling/eval/`)

**Why:** Zero way to measure AI output quality. No retrieval golden dataset, no lesson rubrics. Flying blind on quality.

**Plan:**
- [ ] Create `tooling/eval/` directory structure
- [ ] Create retrieval golden dataset: `tooling/eval/retrieval-golden.json` (10 query/expected-chunk pairs from ML101 workspace)
- [ ] Create `tooling/eval/run-retrieval-eval.ts` — runs hybrid_search against golden dataset, reports precision@k
- [ ] Wire up `pnpm eval:retrieval` command
- [ ] Create lesson quality rubric: `tooling/eval/lesson-rubric.ts` — checks section diversity, takeaway presence, quiz placement
- [ ] Run eval against current lessons, report baseline scores
- [ ] Run `pnpm typecheck`

### Task 5: Implement Cost Guards

**Why:** No spending limits. A runaway prompt or abuse could generate unbounded LLM costs.

**Plan:**
- [ ] Write FAILING test: cost calculation per model (pure function)
- [ ] Create `apps/web/src/lib/ai/cost-calculator.ts` — token cost math per model
- [ ] Create `get_user_daily_spend` Supabase RPC function (new migration)
- [ ] Create `apps/web/src/server/middleware/cost-guard.ts` — `checkUserDailyBudget()`
- [ ] Wire into AI-generating procedures (quiz.generate, flashcard.generate, lesson.regenerate, /api/chat)
- [ ] Add `DAILY_SPEND_LIMIT_USD` env var (default $5)
- [ ] Run `pnpm test:unit` + `pnpm typecheck`
- [ ] Browser test: verify rejection when budget exceeded

### Task 6: Create `trackedGenerate` Wrapper

**Why:** Each Trigger job inserts ai_requests rows independently with ad-hoc code. A centralized wrapper ensures no LLM call is ever untracked.

**Plan:**
- [ ] Write FAILING test: wrapper inserts ai_requests row with correct fields
- [ ] Create `trigger/src/lib/tracked-generate.ts` — wraps `generateObject`/`generateText`/`streamText` with automatic ai_requests tracking
- [ ] Refactor `generate-lessons.ts` to use `trackedGenerate`
- [ ] Refactor `generate-syllabus.ts` to use `trackedGenerate`
- [ ] Refactor `extract-concepts.ts` to use `trackedGenerate`
- [ ] Verify all jobs still pass: run each against a test workspace
- [ ] Run `pnpm test:unit` + `pnpm typecheck`

---

### Phase 3 Verification Gate

- [ ] `pnpm typecheck` — zero errors
- [ ] `pnpm lint` — zero errors
- [ ] `pnpm test:unit` — all green
- [ ] `pnpm --filter web test:contract` — all green
- [ ] Playwright: /workspace/[id]/graph → graph renders with nodes
- [ ] Playwright: /study-room/[id] → real-time member list visible
- [ ] Playwright: axe audit passes on /dashboard and /workspace/[id]
- [ ] Playwright: offline simulation — flashcard review still works
- [ ] Architecture audit: no async in handlers, all LLM calls tracked, no files over 400 lines
- [ ] `git push origin feat/phase-3-platform-expansion`
- [ ] Mark [x] phase-3-platform-expansion in tasks/phases.md
