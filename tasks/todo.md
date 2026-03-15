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
