# Repository Structure

## Tooling

- **Monorepo:** Turborepo + pnpm workspaces
- **Package manager:** pnpm (enforced via `engines` in root `package.json`)
- **TypeScript:** Strict mode everywhere, shared config in `tooling/typescript/`
- **Linting:** ESLint with shared config in `tooling/eslint/`
- **Pre-commit:** Husky + lint-staged + file size check (≤ 400 lines)

---

## Directory Layout

```
learn-x/
├── apps/
│   └── web/                          # Next.js 15 App Router
│       ├── src/
│       │   ├── app/
│       │   │   ├── (marketing)/      # Landing, pricing, about — public routes
│       │   │   ├── (auth)/           # /login, /register, /verify-email
│       │   │   ├── (dashboard)/      # /dashboard — student home (sidebar layout)
│       │   │   │   ├── layout.tsx    # Sidebar + topbar shell
│       │   │   │   ├── page.tsx      # Dashboard home (mastery summary, activity)
│       │   │   │   └── settings/
│       │   │   ├── (workspace)/      # /workspace/[id] — workspace views
│       │   │   │   ├── layout.tsx
│       │   │   │   ├── page.tsx      # Overview: documents, lessons, concepts
│       │   │   │   ├── lessons/
│       │   │   │   ├── chat/
│       │   │   │   ├── quiz/
│       │   │   │   ├── flashcards/
│       │   │   │   └── mastery/
│       │   │   └── api/
│       │   │       ├── trpc/[trpc]/  # tRPC HTTP handler
│       │   │       │   └── route.ts
│       │   │       ├── chat/         # AI SDK streaming endpoint
│       │   │       │   └── route.ts
│       │   │       └── webhooks/     # Supabase storage webhook, Stripe, etc.
│       │   ├── components/           # App-specific components (not in @learn-x/ui)
│       │   ├── hooks/                # App-specific hooks
│       │   └── lib/
│       │       ├── supabase/         # Supabase client (browser + server + middleware)
│       │       ├── trpc/             # tRPC client + React Query provider
│       │       └── ai/               # AI SDK config, model router
│       ├── public/
│       ├── next.config.ts
│       ├── tailwind.config.ts
│       └── package.json
│
├── services/
│   └── ai-engine/                    # Python FastAPI — Phase 2+
│       ├── src/
│       │   ├── main.py
│       │   ├── routers/
│       │   │   ├── ingestion.py      # /ingestion/parse, /ingestion/chunk
│       │   │   ├── embeddings.py     # /embeddings/batch
│       │   │   ├── generation.py     # /generation/lesson, /generation/quiz
│       │   │   └── health.py
│       │   ├── services/
│       │   │   ├── parser/           # LlamaParse + Docling
│       │   │   ├── chunker/          # Structure-aware chunking
│       │   │   ├── embedder/         # Batch embedding, pgvector storage
│       │   │   ├── retriever/        # Hybrid search, reranking
│       │   │   ├── generator/        # Content generation orchestration
│       │   │   ├── personalization/  # Persona-driven prompt building
│       │   │   ├── knowledge/        # Concept extraction, graph building
│       │   │   └── ai_client/        # Model router, Helicone proxy config
│       │   ├── models/               # Pydantic models
│       │   ├── config/               # settings.py (pydantic-settings)
│       │   └── db/                   # SQLAlchemy async + asyncpg
│       ├── tests/
│       ├── pyproject.toml            # UV package manager
│       ├── Dockerfile
│       └── .env.example
│
├── packages/
│   ├── validators/                   # @learn-x/validators
│   │   └── src/
│   │       ├── user.ts
│   │       ├── workspace.ts
│   │       ├── document.ts
│   │       ├── lesson.ts
│   │       ├── quiz.ts
│   │       ├── flashcard.ts
│   │       ├── mastery.ts
│   │       ├── job.ts
│   │       ├── events.ts             # Canonical event type constants
│   │       └── index.ts
│   │
│   ├── types/                        # @learn-x/types
│   │   └── src/
│   │       └── index.ts              # z.infer<> from validators — never hand-written
│   │
│   ├── ui/                           # @learn-x/ui
│   │   └── src/
│   │       ├── primitives/           # shadcn/ui components (Button, Input, Dialog…)
│   │       ├── patterns/             # ChatBubble, FlashCard, QuizCard, ConceptBadge
│   │       └── layouts/              # Sidebar, TopBar, WorkspaceShell, PageShell
│   │
│   ├── api-client/                   # @learn-x/api-client
│   │   └── src/
│   │       ├── trpc.ts               # tRPC client factory
│   │       └── ai-engine.ts          # Generated FastAPI client (Phase 2)
│   │
│   └── utils/                        # @learn-x/utils
│       └── src/
│           ├── cn.ts                 # Tailwind class merge
│           ├── date.ts               # Date formatting
│           └── fsrs.ts               # FSRS algorithm wrapper (ts-fsrs)
│
├── tooling/
│   ├── eslint/
│   │   └── index.js
│   ├── typescript/
│   │   ├── base.json
│   │   ├── nextjs.json
│   │   └── react-library.json
│   ├── tailwind/
│   │   └── base.ts
│   └── scripts/
│       ├── db-migrate.ts             # Drizzle migration runner
│       ├── db-seed.ts                # Development seed data
│       ├── generate-api-client.ts    # hey-api codegen from FastAPI OpenAPI
│       └── check-file-sizes.sh       # Pre-commit: fail if any file > 400 lines
│
├── trigger/                          # Trigger.dev task definitions
│   ├── src/
│   │   ├── jobs/
│   │   │   ├── process-document.ts
│   │   │   ├── extract-concepts.ts
│   │   │   ├── generate-lessons.ts
│   │   │   ├── generate-quiz.ts
│   │   │   ├── generate-flashcards.ts
│   │   │   ├── generate-audio.ts
│   │   │   └── generate-study-plan.ts
│   │   └── client.ts
│   └── trigger.config.ts
│
├── supabase/
│   ├── migrations/                   # SQL source of truth
│   ├── seed.sql
│   └── config.toml
│
├── .husky/
│   └── pre-commit                    # lint-staged + file size check
├── .github/
│   └── workflows/
│       ├── ci.yml                    # lint, typecheck, test, build
│       └── deploy.yml
├── turbo.json
├── pnpm-workspace.yaml
└── package.json
```

---

## Package Responsibilities

### `@learn-x/validators`
The single source of truth for all data shapes. Zod schemas only.
- No imports from other `@learn-x/*` packages
- No business logic
- Must be usable in both browser and Node.js environments

### `@learn-x/types`
TypeScript types inferred from validators. Zero hand-written types.
```typescript
export type Workspace = z.infer<typeof workspaceSchema>
export type CreateWorkspaceInput = z.infer<typeof createWorkspaceInputSchema>
```

### `@learn-x/ui`
Shared component library. Components are presentational — no data fetching, no tRPC calls.
- `primitives/` — direct shadcn/ui installs (own the code)
- `patterns/` — composite components for LEARN-X-specific UI patterns
- `layouts/` — shell layouts used across workspace and dashboard views

### `@learn-x/api-client`
The tRPC client factory and (Phase 2) the generated FastAPI TypeScript client.
- `trpc.ts` sets up the typed tRPC client using `@learn-x/validators` inferred types
- Consumers import from here, not directly from `@trpc/client`

### `@learn-x/utils`
Pure utility functions. No React. No tRPC. No Supabase.
- `fsrs.ts` wraps `ts-fsrs` so FSRS logic is in one place

### `trigger/`
Not a package — a separate Trigger.dev project that deploys independently.
Imports from `@learn-x/validators` and `@learn-x/types` but not from `apps/web`.

---

## tRPC Module Structure (inside `apps/web`)

```
src/server/
├── trpc.ts                # createTRPCRouter, publicProcedure, protectedProcedure
├── context.ts             # createTRPCContext: Supabase client, user session, Drizzle db
├── middleware/
│   ├── auth.ts            # requireAuth — throws UNAUTHORIZED if no session
│   └── rateLimit.ts       # Redis-backed rate limiting per user
├── routers/
│   ├── _app.ts            # appRouter = mergeRouters(...)
│   ├── user.ts
│   ├── workspace.ts
│   ├── document.ts
│   ├── lesson.ts
│   ├── chat.ts
│   ├── quiz.ts
│   ├── flashcard.ts
│   ├── studyGuide.ts
│   ├── audio.ts
│   ├── mastery.ts
│   ├── concept.ts
│   ├── job.ts
│   └── analytics.ts
└── db/
    ├── schema.ts           # Drizzle schema (mirrors SQL migrations)
    ├── index.ts            # Drizzle client instance
    └── migrations/         # Generated by Drizzle Kit
```

---

## Naming Conventions

| Thing | Convention | Example |
|-------|-----------|---------|
| Database tables | `snake_case` plural | `flashcard_sets`, `quiz_responses` |
| Database columns | `snake_case` | `created_at`, `workspace_id` |
| TypeScript types | `PascalCase` | `FlashcardSet`, `QuizResponse` |
| Zod schemas | `camelCase` + `Schema` suffix | `flashcardSetSchema`, `createWorkspaceSchema` |
| tRPC routers | `camelCase` | `flashcard`, `workspace` |
| tRPC procedures | `camelCase` verb.noun | `flashcard.generateSet`, `workspace.create` |
| React components | `PascalCase` | `FlashCard`, `QuizCard` |
| Hooks | `use` prefix | `useWorkspace`, `useDueCards` |
| Trigger.dev tasks | `kebab-case` | `process-document`, `generate-quiz` |
| Files | `kebab-case` | `process-document.ts`, `flashcard-router.ts` |
| Env variables | `SCREAMING_SNAKE_CASE` | `SUPABASE_SERVICE_ROLE_KEY` |

---

## Environment Variables

```bash
# apps/web/.env.local
NEXT_PUBLIC_SUPABASE_URL=
NEXT_PUBLIC_SUPABASE_ANON_KEY=
SUPABASE_SERVICE_ROLE_KEY=        # server-only, never NEXT_PUBLIC_

OPENAI_API_KEY=
HELICONE_API_KEY=                 # Helicone proxy — wraps OpenAI

TRIGGER_SECRET_KEY=

UPSTASH_REDIS_REST_URL=
UPSTASH_REDIS_REST_TOKEN=

LANGFUSE_PUBLIC_KEY=
LANGFUSE_SECRET_KEY=
LANGFUSE_HOST=                    # https://cloud.langfuse.com

NEXT_PUBLIC_APP_URL=              # https://learn-x.app (or localhost:3000)

# Phase 2+ (Python AI service)
AI_ENGINE_URL=                    # http://localhost:8000 in dev
AI_ENGINE_SECRET=                 # shared secret for internal calls
```
