# Lessons Learned

Patterns captured after corrections. Review at session start.
Updated by Claude after every correction. Checked into git.

---

## 2026-03-15 Implemented AI pipeline without reading docs/07-ai-pipeline.md

**Pattern:** Wrote Trigger.dev jobs (process-document, extract-concepts, generate-syllabus) and database migrations without reading the relevant documentation first. Inferred model names, SDK choices, schema column names, and RLS patterns from context instead of from the spec.

**Rule:** Read the mandatory doc for the system you are touching BEFORE writing the first line. Say so explicitly. `docs/07-ai-pipeline.md` before any job or LLM call. `docs/03-database.md` before any migration. The table in `CLAUDE.md §Mandatory Doc Reads` is the checklist.

**Why:** The docs contain decisions that are non-obvious and cannot be inferred: the model routing table (Claude Sonnet for concept extraction, Claude Haiku for enrichment — not GPT-4o-mini), the Anthropic Contextual Retrieval caching pattern, exact column names in `concept_relations` (`source_concept_id` not `from_concept_id`), the RLS policy pattern, and the Vercel AI SDK requirement. Every deviation from these creates compounding schema drift and cost/quality regressions.

**Specific mistakes made:**

- All jobs hardcoded `gpt-4o-mini` (raw OpenAI SDK) instead of using `MODEL_ROUTES` (Vercel AI SDK)
- Chunk enrichment used a simple per-chunk call instead of Anthropic's document-caching pattern
- Phase 1C RLS policies used `auth.uid()` directly against `workspaces.user_id` (wrong — needs JOIN through `users.auth_id`)
- `concept_relations` columns named `from_concept_id`/`to_concept_id` instead of `source_concept_id`/`target_concept_id`
- Added `example_of` relation type not in the doc schema
- Prompt files placed in `trigger/src/lib/prompts/` instead of `apps/web/src/lib/ai/prompts/`

**Applies to:** Any Trigger.dev job, any migration, any RLS policy, any AI-related code.

---

## 2026-03-15 Wrote implementation before writing failing tests

**Pattern:** After plan approval, immediately started writing implementation files (package.json, config files, validators, etc.) without first writing failing tests.

**Rule:** For any file containing logic (schemas, utilities, tRPC procedures, DB migrations), write the failing test FIRST. Do not write the implementation until the test exists and is confirmed failing. Config-only files (package.json, tsconfig, turbo.json, .gitignore, .prettierrc) are exempt — they have no logic to test.

**Why:** CLAUDE.md Rule: "Write a FAILING test before writing any implementation. Do NOT write implementation until the test exists and is confirmed failing." Failing tests first means the test defines the contract, not the implementation. It prevents tests being written to match what the code happens to do rather than what it should do.

**Applies to:** validators (Zod schemas), utils (cn, date, fsrs), tRPC procedures (user.getProfile), and DB migration RLS policies. NOT to: package.json, tsconfig, turbo.json, .prettierrc, .gitignore, next.config.ts, supabase/config.toml — these are configuration with no independently testable logic.

---

## UI/UX Review — Phase 0-1G (2026-03-15)

### Screens reviewed

Login, Register, Onboarding, Dashboard, Workspace Detail (all 8 tabs), Chat, Quizzes, Flashcards, Mastery

### Blocking deviations fixed

1. **globals.css wrong theme tokens** — Root had orange primary and off-white background instead of blue `hsl(221 83% 53%)` and proper light/dark separation. Fixed with full light/dark/auto CSS variable system including `--sidebar` tokens and `@media (prefers-color-scheme: dark) { :root:not(.light) }`.
2. **Login page single-column** — paper.design (artboard I3-0) shows two-column: dark marketing panel left + form right. Fixed, including Google OAuth button moved to top of form.
3. **Register page single-column** — Same two-column treatment with feature checklist on left.
4. **Sidebar missing nav items** — Only had Dashboard. paper.design shows: Dashboard, Workspaces, Study Queue, Mastery, Analytics. Added all. Active item now uses blue fill.
5. **Onboarding `min-h-screen` inside flex container** — Caused vertical misalignment. Changed to `flex-1 items-center justify-center`.
6. **FOUC on dark mode** — Fixed with `public/theme-init.js` loaded via `<Script strategy="beforeInteractive">`.

### Non-blocking deviations logged

- Chat API returns 400 (infrastructure: no AI key configured in dev) — UI renders correctly, message appears [severity: low]
- Dashboard empty state is minimal; paper.design shows richer workspace cards with stats — acceptable until workspaces have real data [severity: low]

### Playwright journeys passed

1. Auth login ✓
2. Workspace creation ✓
3. Document upload (shows "processing" status) ✓
4. Concepts tab — empty state ✓
5. Syllabus tab — empty state ✓
6. Lessons tab — empty state with Generate button ✓
7. Chat — session created, message input works, UI renders ✓
8. Quizzes — empty state ✓
9. Flashcards — due/sets sections render ✓
10. Mastery — stats grid (all zeros) ✓

### Theme system

Auth pages are permanently dark (hardcoded panel backgrounds). App pages follow light/dark/auto via CSS custom properties. ThemeToggle component (Light | System | Dark) available for manual override.

---

## UI/UX Review — Phase 0-1G (2026-03-16, second pass)

### Screens reviewed

Login, Dashboard, Workspace Detail (all 8 tabs), Lesson Reader, Chat, Quizzes, Flashcards, Mastery

### Blocking deviations fixed

1. **Flashcards tab missing from workspace** — TABS array in workspace page only had 7 entries. Added Flashcards tab with Layers icon.
2. **Default tab was Mastery** — Workspace page defaulted to `mastery` tab. Changed to `documents` (first tab, most logical default).
3. **Document pipeline broken** — Reducto API URL wrong (`v2.reductoai.com` → `platform.reducto.ai`), two-step upload flow fixed, env vars added to trigger/.env.
4. **Lessons never auto-generated** — `generate-syllabus` job never chained to `generate-lessons`. Added trigger at end of syllabus job.
5. **generate-lessons extremely slow and unreliable** — Zero-filled embedding vector (70% weight on garbage), no retries, sequential processing. Fixed: real OpenAI embeddings, batch-parallel (7 concurrent), retry logic, switched to Claude Haiku (60s → 1s per concept). Result: 14/14 lessons in 60s (was 2/14 in 14 min).
6. **Dashboard "New Workspace" button non-functional** — Was a plain `<div>`. Replaced with `<CreateWorkspaceModal />`.
7. **DocumentList no real-time updates** — Required manual refresh. Added `refetchInterval` polling every 3s while docs are processing.

### Non-blocking deviations logged

- Login form missing "Forgot password?" link and "Terms of Service" footer vs Paper spec [severity: low]
- Login form card has no visible border vs Paper spec border [severity: low]
- Dashboard workspace cards show "No content yet" instead of mastery/lesson counts — data-dependent [severity: low]
- Sidebar missing user profile at bottom (shows "Sign out" instead) [severity: low]
- Paper spec shows dark theme, live app defaults to light — both work [severity: low]

### Playwright journeys

1. Auth login → dashboard ✓
2. Workspace detail — all 8 tabs visible (Documents, Concepts, Syllabus, Lessons, Mastery, AI Chat, Quizzes, Flashcards) ✓
3. Documents tab — upload dropzone + document list with READY status ✓
4. Concepts tab — 14 concepts with descriptions and tags ✓
5. Lessons tab — 14 lessons with progress bar (0/14), titles and summaries ✓
6. Lesson Reader — renders text, concept_definition, analogy_card, process_flow, mini_quiz, comparison_table, timeline, concept_bridge, key_takeaway sections. Mark Complete + Next Lesson buttons. ✓
7. Chat — AI Coach interface with sources panel, message input ✓
8. Quizzes — empty state with "Generate Quizzes" button ✓
9. Flashcards — "Due for Review" + "All Sets" sections with empty states ✓
10. Mastery — stats grid (14 concepts, 0 mastered, 0 struggling, 0 due), Up Next + Struggling Concepts sections ✓

### Pipeline fixes

- `trigger/src/jobs/process-document.ts` — Reducto two-step upload/parse flow
- `trigger/src/jobs/generate-syllabus.ts` — Chain to generate-lessons
- `trigger/src/jobs/generate-lessons.ts` — Real embeddings, batch-parallel, Haiku model, retries
- `trigger/src/lib/ai.ts` — LESSON_GENERATION model → claude-haiku-4-5
- `apps/web/src/components/document/DocumentList.tsx` — Auto-polling
- `apps/web/src/app/(app)/dashboard/page.tsx` — CreateWorkspaceModal
- `apps/web/src/app/(app)/workspace/[id]/page.tsx` — Flashcards tab, default to documents

---

## 2026-03-20 Declared Paper alignment too early

**Pattern:** Marked the dashboard/workspaces UI revamp complete after code-level improvements and targeted checks, but before re-comparing the live app against the canonical Paper artboards in the browser. The implementation was cleaner, yet it still looked materially different from the approved Paper direction.

**Rule:** For any Paper-led UI task, do not call the slice done until the live route has been visually compared against the matching Paper artboard in-browser. Verify layout density, contrast, dark/light translation, and card tone with screenshots, not just code review.

**Why:** Paper is the visual source of truth in this repo. A route can satisfy the plan semantically while still missing the intended visual language. Browser verification against the actual artboards is required to catch drift in light mode, surface contrast, and composition.
