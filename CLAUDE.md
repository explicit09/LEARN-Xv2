# LEARN-X v2

A learning operating system that turns course materials into adaptive mastery.
Full documentation: `docs/` — read the relevant doc before touching a system.

## Commands

```bash
pnpm dev                          # start web app + trigger dev watcher
pnpm build                        # build all packages
pnpm typecheck                    # tsc --noEmit across all packages
pnpm lint                         # eslint across all packages
pnpm test:unit                    # vitest unit tests (no external services)
pnpm test:contract                # tRPC contract tests (requires supabase start)
pnpm test:integration             # RLS + RPC tests (requires supabase start)
supabase start                    # start local Supabase (Docker required)
supabase stop                     # stop local Supabase
supabase db reset                 # reset local DB and re-run all migrations
pnpm db:migrate                   # run pending Drizzle migrations
pnpm db:seed                      # seed development data
pnpm eval:retrieval               # run retrieval quality evaluation
```

## Architecture

Modular monolith. One Next.js backend (tRPC + API routes). One Python FastAPI service (Phase 2+, not yet built). All heavy AI work runs as Trigger.dev jobs — never fire-and-forget in request handlers.

See `docs/01-architecture.md` for all ADRs and `docs/04-repo-structure.md` for directory layout.

## Design Files

Two Paper.design files are the source of truth for all UI and architecture visuals. Both are pre-logged-in via Playwright (tabs 0 and 1). See `docs/15-design-files.md` for full details.

| File | Purpose | Playwright Tab | Paper MCP |
|------|---------|----------------|-----------|
| LEARN-X | UI designs — all app screens and components | Tab 0 | Switch focus to this file |
| LEARN-X Architecture | System architecture, pipelines, flowcharts | Tab 1 | Default MCP file |

Before touching any UI component or page, check the LEARN-X design file. Before touching any pipeline or architecture decision, check LEARN-X Architecture.

## Mandatory Doc Reads — Do This Before Writing Code

These are not suggestions. Read the specified doc **before** writing the first line of code for that system. Confirm in your response that you have read it.

| You are about to touch… | Read this first |
|-------------------------|-----------------|
| Any database migration or Drizzle schema | `docs/03-database.md` — verify every column name, type, constraint, and index matches exactly |
| Any Trigger.dev job or LLM call | `docs/07-ai-pipeline.md` — verify model, SDK, enrichment pattern, and prompt file location |
| Any tRPC router or API route | `docs/05-api-design.md` |
| Any lesson or generative UI component | `docs/10-generative-ui.md` |
| Any personalization or persona logic | `docs/12-personalization-engine.md` |
| Any RLS policy | `docs/03-database.md §Row Level Security` — use the exact pattern shown, do not invent your own |

## The 8 Rules That Cannot Be Broken

1. **Every heavy task is a Job.** No async work in request handlers. Always Trigger.dev.
2. **One retrieval path.** `chunk_embeddings` is the only embeddings table. `hybrid_search` is the only search function. Nothing bypasses it.
3. **Typed entities, not metadata blobs.** Chat messages, quiz questions, flashcards, mastery records all have their own tables. Do not add JSONB catch-alls.
4. **One backend contract.** tRPC for TypeScript. OpenAPI for Python. Never hand-write types that can be derived.
5. **Personalization changes behavior, not just wording.** It must affect lesson order, explanation depth, quiz difficulty, study schedule, and — critically — the analogy/example domain used to explain hard concepts. See `docs/12-personalization-engine.md`.
6. **Every LLM call is tracked.** Every `generateText`/`generateObject`/`streamText` call inserts a row in `ai_requests`. No exceptions.
7. **Files ≤ 400 lines.** Pre-commit hook enforces this. If you're approaching the limit, split first.
8. **Every non-trivial task has a verification step.** Run `pnpm test:unit`, `pnpm typecheck`, or `pnpm lint` after implementation. Do not declare a task done without a passing check.

## Domain Language

Use these exact terms. Do not invent synonyms.

`User` `Persona` `Workspace` `Document` `Chunk` `Concept` `Lesson` `Artifact` `MasteryRecord` `Job` `ChatSession` `ChatMessage`

`Workspace` is the aggregate root. Everything belongs to a Workspace.
See `docs/02-domain-model.md`.

## Database

- Migrations live in `supabase/migrations/` as SQL files. Never edit schema in the Supabase dashboard.
- Drizzle schema in `apps/web/src/server/db/schema.ts` must mirror migrations exactly.
- Every table with `user_id` or `workspace_id` requires RLS policies.
- `service_role` key is server-only. Never expose it to the client or put it in `NEXT_PUBLIC_*`.
- See `docs/03-database.md` for full schema.

## Code Conventions

- Package imports: `@learn-x/validators`, `@learn-x/types`, `@learn-x/ui`, `@learn-x/utils`
- Zod schemas defined once in `@learn-x/validators`. TypeScript types inferred via `z.infer<>`. Never hand-write types that duplicate a schema.
- File naming: `kebab-case` for files, `PascalCase` for components, `camelCase` for functions
- tRPC procedures: `camelCase` verb.noun — e.g. `workspace.create`, `flashcard.submitReview`
- Database tables: `snake_case` plural — e.g. `flashcard_sets`, `quiz_responses`
- Trigger.dev tasks: `kebab-case` — e.g. `process-document`, `generate-quiz`

## Testing

- **Write a FAILING test before writing any implementation.** Do NOT write implementation until the test exists and is confirmed failing.
- Never modify a test to make it pass — fix the implementation instead.
- Unit tests: pure functions only. No mocking the database. No mocking HTTP calls.
- Contract tests: tRPC procedures via `createCallerFactory` against real `supabase start`.
- Never run tests against staging or production.
- After writing implementation, run `pnpm test:unit` and iterate until all tests pass before considering the task done.
- See `docs/11-testing-and-quality.md` for full testing strategy, latency budgets, and cost budgets.

## AI Pipeline

- All embeddings: `text-embedding-3-large`, 3072 dimensions. Stored in `chunk_embeddings` only.
- All LLM calls go through Helicone proxy. Never call OpenAI/Anthropic directly.
- Lesson sections are component specs (generative UI), not markdown. See `docs/10-generative-ui.md`.
- Prompt files live in `apps/web/src/lib/ai/prompts/`. Never inline prompts in job or route files.
- See `docs/07-ai-pipeline.md`.

## Git Workflow

- Remote: https://github.com/explicit09/LEARN-Xv2
- Branch naming: `feat/`, `fix/`, `chore/`, `docs/` prefix
- Commit style: Conventional Commits (`feat:`, `fix:`, `chore:`, `test:`)
- Never commit `.env` files or secrets
- Never push directly to `main`

## Task Management

Before any non-trivial task (3+ steps or touches multiple files):
1. Write plan to `tasks/todo.md` with checkable items
2. Confirm approach before starting implementation
3. Mark items complete as you go
4. After any correction from the user: update `tasks/lessons.md` with the pattern
5. For any PR-ready task: open a second Claude session with a clean context to review the diff before marking complete — it won't be biased toward code it just wrote.

After the task: add a brief summary to `tasks/todo.md` and check it in.

## Self-Improvement

**IMPORTANT:** After any correction — update `tasks/lessons.md` immediately. Write the rule that would have prevented the mistake. This is how the project improves. Review `tasks/lessons.md` at the start of each session.

See `tasks/lessons.md` for learned patterns for this project.
