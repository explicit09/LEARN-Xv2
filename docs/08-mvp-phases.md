# MVP Phases

## Sequence Principle

Build in this exact order. Do not skip ahead. Each phase depends on the one before it.

The core loop is: **Upload → Understand → Teach → Study → Track mastery**

Phase 1 completes this loop. Every phase after it adds more power to the same loop.

---

## Phase 0: Foundations

> No user-visible features. Infrastructure only. Do not show users a broken version of features — wait until Phase 1A.

### Deliverables

- [ ] Monorepo initialized: Turborepo + pnpm workspaces, all packages scaffolded
- [ ] `apps/web`: Next.js 15 with App Router, TypeScript strict, Tailwind, shadcn/ui
- [ ] `packages/validators`: first Zod schemas (User, Workspace)
- [ ] `packages/ui`: shadcn primitives installed, Button, Input, Dialog working
- [ ] Supabase project created, local dev configured (`supabase start`)
- [ ] First migration: `users`, `personas`, `workspaces` tables
- [ ] Drizzle ORM connected, first query working
- [ ] tRPC setup: router, context (Supabase client + user session), `user.getProfile` procedure
- [ ] Trigger.dev project created, dev CLI connected, health task deployed
- [ ] Langfuse project created, SDK initialized (LLM observability)
- [ ] CI pipeline: lint, typecheck, build checks on every PR
- [ ] Pre-commit hooks: lint-staged + file-size check (≤ 400 lines)
- [ ] Environment variables documented in `.env.example` for each app/service

### Definition of done

`pnpm dev` starts the web app. `user.getProfile` tRPC call returns data from Supabase. Trigger.dev dashboard shows the health task running. Langfuse dashboard shows traces.

---

## Phase 1A: Auth + Workspace Shell

### Deliverables

**Auth:**

- [ ] Supabase Auth configured: email/password + Google OAuth
- [ ] Login page, register page, email verification flow
- [ ] Auth middleware: redirect unauthenticated users to `/login`
- [ ] User record created on first sign-in (Supabase Auth trigger → `users` table insert)
- [ ] Protected routes working

**Onboarding:**

- [ ] Onboarding flow (shown once, gated by `onboarding_completed = false`)
  - Step 1: Name, learning goal
  - Step 2: Persona — tone preference, difficulty preference, interests (3 fields, keep it short)
  - Step 3: Done — creates workspace with suggested name
- [ ] `persona.upsert` tRPC procedure working
- [ ] `user.completeOnboarding` marks flag, redirects to dashboard

**Dashboard:**

- [ ] `/dashboard` layout: sidebar (workspace list, nav links) + topbar (user menu)
- [ ] Workspace list on dashboard (empty state with "Create workspace" CTA)
- [ ] Create workspace modal (name + description)
- [ ] Workspace detail shell at `/workspace/[id]` with tabs: Documents, Lessons, Chat, Flashcards, Mastery

### Definition of done

User can sign up → complete onboarding → see dashboard → create a workspace → open the workspace shell. The tabs exist but are empty. Auth persists across browser refresh.

---

## Phase 1B: Document Ingestion

### Deliverables

**Upload UI:**

- [ ] Document upload UI in workspace: drag-and-drop, file picker, max 50MB, supported types shown
- [ ] Upload progress indicator
- [ ] `document.initiateUpload` → get signed Supabase Storage URL → upload directly from browser
- [ ] `document.confirmUpload` → creates document record → triggers `process-document` Job
- [ ] URL / YouTube input form (text field + submit)
- [ ] Document list with status badges: Pending, Processing, Done, Failed

**Processing pipeline (Trigger.dev + TypeScript):**

- [ ] `process-document` task: parse → chunk → enrich → embed → store
- [ ] Document parsing: unpdf for text-based PDFs, Mammoth for DOCX, Gemini OCR for scanned docs
- [ ] Structure-aware chunker (see `07-ai-pipeline.md`)
- [ ] Contextual chunk enrichment (Haiku generates context per chunk — 67% retrieval improvement)
- [ ] Batch embedding generation via `text-embedding-3-large`
- [ ] Chunks + embeddings stored in Supabase (transaction)
- [ ] `document.status` updates: `processing` → `completed` / `failed`

**Real-time progress:**

- [ ] Supabase Realtime subscription on `jobs` table → live progress bar in UI
- [ ] Job record updated at each pipeline step (0% → 25% → 50% → 75% → 100%)
- [ ] Error state: show `processingError` if failed, offer retry button

### Definition of done

Upload a 20-page PDF. Watch the progress bar move in real time. Document shows "Done." Query Supabase directly to confirm chunks and embeddings exist in the database.

---

## Phase 1C: Concept Graph + Syllabus

### Deliverables

**Concept Extraction (Trigger.dev, runs after Phase 1B completes):**

- [ ] `extract-concepts` task: sample chunks → LLM extraction → deduplicate → store
- [ ] `concepts` + `concept_relations` + `chunk_concepts` tables populated
- [ ] Concept deduplication (normalize names, merge near-duplicates)

**Syllabus Generation (runs after all docs in upload batch complete):**

- [ ] `generate-syllabus` task: documents → hierarchical outline (unit → topic → subtopic)
- [ ] `syllabuses` + `syllabus_units` + `syllabus_topics` + `syllabus_topic_concepts` + `syllabus_topic_documents` tables populated
- [ ] Syllabus drives lesson ordering in Phase 1D — concept topological order alone doesn't capture the narrative structure of a document (chapter → section → subsection)
- [ ] `syllabus.get` and `syllabus.update` tRPC procedures (professor can reorder in Phase 2)

**Document Role Classification (runs during `process-document`):**

- [ ] `classifyDocumentRole()`: LLM classifies each document as `primary` | `supplementary` | `reference`
  - Heuristics: page count, heading structure, presence of table of contents, first 2000 chars
  - Confidence < 0.65 → default to `supplementary`, show confirmation prompt in UI
- [ ] `documents.role` and `documents.role_confidence` columns stored on completion
- [ ] `documents.upload_batch_id` set when user uploads multiple files simultaneously
- [ ] Reference-role documents skip syllabus — they are RAG-only

**Incremental Syllabus Update (when new document is added to existing workspace):**

- [ ] `update-syllabus` task: classifies new doc role, then:
  - `reference` → no syllabus change
  - `supplementary` → `map-to-syllabus`: LLM maps doc to existing topics, links in `syllabus_topic_documents`
  - `primary` → full incremental merge: extract new outline, compare via topic embeddings (cosine ≥ 0.85 = same topic, < 0.85 = new topic), create new syllabus version
- [ ] Topic deduplication: `syllabus_topics.embedding` (`halfvec(3072)`) enables similarity-based merge
- [ ] Old syllabus version marked `superseded`; new version created — existing lessons preserve their `syllabus_topic_id` pointer to old version topics until user reviews

**Multi-Document Batch Upload Coordination:**

- [ ] When `upload_batch_id` is set: `process-document` defers syllabus synthesis until all batch members reach `completed`
- [ ] Last document in batch triggers `generate-syllabus` or `update-syllabus` with all batch document IDs
- [ ] Batch synthesis sees all documents at once → correct ordering (avoids A/B ordering conflicts when processed independently)

**Lesson Staleness Notifications:**

- [ ] `lessons.source_updated = true` set when: a contributing document is reprocessed, OR a new supplementary/primary doc maps to a lesson's topic
- [ ] UI shows non-blocking notice on affected lessons: "This lesson may be outdated — a new document was added that covers this topic"
- [ ] "Regenerate lesson" button — user-initiated only. Never auto-regenerate.
- [ ] `LESSON_STALENESS_FLAGGED` event logged

**Concept UI:**

- [ ] Concepts tab in workspace: list view of all concepts with difficulty badge
- [ ] Concept graph visualization (force-directed using D3 or react-force-graph)
  - Nodes = concepts, colored by mastery level (gray = unstudied)
  - Edges = relations (prerequisite shown as directed arrow)
  - Click node → concept detail sidebar (description, linked lessons, mastery)
- [ ] Syllabus view: collapsible outline showing unit/topic/subtopic hierarchy
  - Each topic shows which document it originated from
  - Expand topic to see linked concepts
  - Stale indicator on topics where `source_updated` lessons exist
- [ ] `concept.list` and `concept.getGraph` tRPC procedures

### Definition of done

After document processing completes, the Concepts tab shows an auto-generated concept graph AND a structured syllabus outline. The syllabus reflects the document's narrative structure (not just concept prerequisites). Clicking a concept shows its description and relationships. Upload a second document to the same workspace — the syllabus updates with a new version, existing lessons are flagged as stale if affected, and no content is auto-deleted. Upload three documents at once — the syllabus is synthesized from all three simultaneously, not one-at-a-time.

---

## Phase 1D: Lessons

### Deliverables

**Generation (Trigger.dev, runs after concept extraction):**

- [ ] `generate-lessons` task: concepts in topological order → persona-adapted lesson per cluster
- [ ] PersonalizationEngine: `buildPersonaContext()` — turns Persona record into prompt instructions
- [ ] Lesson generation prompt (v1), stored in `lib/ai/prompts/lesson-generation.v1.ts`
- [ ] `lessons` + `lesson_concepts` tables populated
- [ ] Lessons ordered by concept dependency (prerequisites first)

**Lesson UI:**

- [ ] Lessons tab: ordered list with completion status (checkmark, progress ring)
- [ ] Lesson reader at `/workspace/[id]/lessons/[lessonId]`
  - Markdown rendered with syntax highlighting (code blocks), table support
  - Key takeaways section (expandable)
  - Concept badges linked to graph
  - Prev / Next lesson navigation
  - "Mark as complete" button
- [ ] `lesson.markStarted`, `lesson.updateProgress`, `lesson.markCompleted` procedures
- [ ] Mastery record created/updated on lesson completion
- [ ] `LESSON_STARTED` and `LESSON_COMPLETED` events logged

### Definition of done

After document ingestion, lessons auto-generate and appear in the Lessons tab ordered by concept dependency. User can read a lesson, see it adapts to their persona, mark it complete, and move to the next one.

---

## Phase 1E: Grounded Chat

### Deliverables

**Chat infrastructure:**

- [ ] `chat_sessions` + `chat_messages` tables (already in schema)
- [ ] `chat.createSession`, `chat.listSessions`, `chat.getMessages`, `chat.persistUserMessage`, `chat.persistAssistantMessage` procedures
- [ ] `/api/chat` AI SDK streaming route
  - Auth check
  - Hybrid search retrieval (8 chunks)
  - System prompt with persona context + retrieved chunks (citations tagged)
  - `streamText` with `onFinish` → persist assistant message
- [ ] FSRS `ai_requests` record on every chat LLM call

**Chat UI:**

- [ ] Chat tab in workspace: session list sidebar + active chat area
- [ ] Lesson-level chat: chat panel inside the lesson reader (context = lesson's chunks)
- [ ] Streaming message display (tokens appear as they arrive)
- [ ] Citation badges on assistant messages (click → see source chunk with document name)
- [ ] "New chat" button, session title (auto-generated from first message)
- [ ] Empty state: suggested starter questions based on workspace concepts

### Definition of done

User asks a question about an uploaded document. Response streams in, cites specific chunks with document and page references. Messages persist across page refresh. Workspace chat searches all documents; lesson chat is scoped to that lesson's material.

---

## Phase 1F: Quizzes & Flashcards

### Deliverables

**Quizzes:**

- [ ] `generate-quiz` Trigger.dev task
- [ ] Quiz generation prompt (v1): Bloom's-tagged, 4 question types minimum (MCQ, short_answer, true_false, fill_blank)
- [ ] Quiz UI at `/workspace/[id]/quiz/[quizId]`
  - One question at a time
  - MCQ: clickable options
  - Short answer: text input
  - Submit → immediate AI feedback
  - Final score screen with per-question review
- [ ] "Generate quiz" button on lesson and workspace level
- [ ] `quiz.generate`, `quiz.startAttempt`, `quiz.submitResponse`, `quiz.completeAttempt` procedures
- [ ] Mastery record updated per concept after quiz completion
- [ ] `QUIZ_COMPLETED` event logged

**Flashcards + FSRS:**

- [ ] `generate-flashcards` Trigger.dev task
- [ ] `ts-fsrs` integrated in `@learn-x/utils/fsrs.ts`
- [ ] `flashcard.submitReview` runs FSRS algorithm, updates scheduling fields
- [ ] Flashcard review UI (`/workspace/[id]/flashcards`)
  - Card flip animation (front → back)
  - Rating buttons: Again (1) / Hard (2) / Good (3) / Easy (4)
  - Due count shown on entry
  - Session summary on completion (cards reviewed, retention estimate)
- [ ] "Generate flashcards" button on lesson level
- [ ] `flashcard.getDueCards` returns next cards via `get_due_flashcards` RPC
- [ ] Mastery record updated per concept after flashcard review
- [ ] `FLASHCARD_REVIEWED` event logged

### Definition of done

User generates a quiz from a lesson → takes it → gets per-question AI feedback → sees score. User generates flashcards from a lesson → reviews them with FSRS ratings → cards are rescheduled. Returning the next day, the due cards reflect FSRS scheduling (yesterday's "Easy" cards aren't shown; "Again" cards are).

---

## Phase 1G: Mastery Dashboard

### Deliverables

- [ ] `mastery.getWorkspaceSummary` using `get_workspace_mastery_summary` RPC
- [ ] `mastery.getWeakConcepts` — bottom 5 concepts by mastery level
- [ ] `mastery.getWhatToStudyNext` — prioritized recommendations
- [ ] `analytics.getDashboard` — streak, total minutes, total mastered

**Mastery UI:**

- [ ] Mastery tab in workspace
  - Concept heatmap: grid of concepts colored green (≥0.8), yellow (0.4–0.8), red (<0.4)
  - Hovering a concept shows: mastery %, last studied, quiz score avg, flashcard retention
  - "Struggling concepts" list with "Review now" buttons
- [ ] Dashboard page (`/dashboard`)
  - Study streak (days in a row with activity)
  - Total concepts mastered across all workspaces
  - "What to study next" — 3 recommendations with one-line reasons
  - Recent activity timeline

### Definition of done

After completing some lessons and quizzes, the mastery heatmap reflects actual performance. "What to study next" shows sensible recommendations. Study streak increments when the user studies on consecutive days.

---

## Phase 1 Complete

A student can:

1. Sign up, set learning preferences
2. Create a workspace, upload course documents
3. Watch documents process with real-time progress
4. Browse an auto-generated concept graph
5. Read AI-generated, persona-adapted lessons in order
6. Chat with their sources (grounded, cited)
7. Take adaptive quizzes with AI feedback
8. Review FSRS-scheduled flashcards
9. See their mastery per concept as a heatmap
10. Know what to study next

**This is the core loop. Everything after this compounds from here.**

---

## Phase 2: Retention + Institutional Foundation (after Phase 1 ships and is solid)

**Retention layer:**

- Audio recaps — two-host conversation format (ElevenLabs dual-voice, script via LLM); Cloudflare R2 storage
- Audio quiz interruptions — audio pauses at timestamps, quiz question shown, resumes on answer; directly differentiates vs NotebookLM which has no quiz interruptions
- Daily study plans generated from mastery state + declared schedule
- Exam prep mode ("midterm on chapters 3–7 in 5 days")
- Exam readiness score (daily-updating %)
- Remediation paths (weak concept → targeted mini-lesson + quiz)
- Study notifications (daily digest: "3 flashcards due, 1 concept flagged as fading")

**Exam system (formal, distinct from quizzes):**

- `generate-exam` Trigger.dev task — Bloom's-tagged, timed, configurable question mix
- Timed exam delivery UI — countdown timer, one question at a time or scrollable, no immediate feedback
- Exam scoring on submission — score + per-question review after completion
- Share via join token — professor distributes a code; students join and take the same exam
- Exam attempt history and analytics per student
- `exam.generate`, `exam.start`, `exam.submit`, `exam.share` tRPC procedures
- Mastery records updated after exam completion

**Professor / instructor tools (grassroots institutional adoption):**

- InstructorProfile: professor account type with course management capabilities
- Course creation: professor creates a Course, uploads Documents, system generates Syllabus + Lessons
- Student roster: invite students via email or join code; students get pre-seeded Workspace
- Concept confusion analytics: class-level view of which concepts are generating errors across all enrolled students (the #1 gap no competitor fills)
- At-risk signals: students with login gaps or declining mastery trends
- FERPA DPA template: must exist before any professor pilot involves student data — prepare in Phase 1, finalize for Phase 2

**Python AI service introduction:**

- Docling self-hosted for better table handling on complex PDFs
- Custom reranker (Cohere or local cross-encoder) when retrieval quality needs improvement

## Phase 3: Platform Expansion + Institutional Sales

- Cross-workspace knowledge graph (concepts linked across all workspaces)
- Collaborative study rooms
- Canvas LTI 1.3 + LTI Advantage (grade passback, roster sync, deep linking) — ~2-4 weeks engineering; required for institutional procurement contracts, not professor-level adoption. Build when first institutional deal is in pipeline. Canvas ~50% enrollment share; one LTI 1.3 certification covers D2L Brightspace, Blackboard, Moodle too.
- SSO via SAML 2.0 / OAuth2 for institutional single sign-on
- Admin console for IT departments (audit logs, user management, data export)
- SOC 2 Type 1 certification (~$40-70K, 4-8 weeks) — start when first institutional conversation begins
- WCAG 2.2 AA accessibility audit + VPAT documentation (required for public institution procurement)
- Purchasing cooperative registration (E&I, OMNIA Partners) — dramatically shortens university sales cycles
- Offline mode
- Blackboard / Moodle integration — only if specific accounts require it (both are declining)
