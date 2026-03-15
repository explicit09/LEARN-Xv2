# Architecture

## ADR-001: Modular Monolith

**Decision:** Modular monolith, not microservices.

**Why:** v1's problem was boundary discipline, not service count. The domain is still evolving. Microservices add coordination cost before product truth is stable.

**Consequence:** All bounded contexts live in one deployable Next.js backend (API routes + tRPC). The Python AI service is the **only** separately deployed service — and only because Python owns genuinely different dependencies (Docling, complex RAG, custom rerankers). Extract more services later only when a specific scaling bottleneck demands it.

**Exception for the Python service:** Do not add a second reason to deploy Python. If a new AI feature can be done in TypeScript via the Vercel AI SDK, do it there. Python is for: document parsing, heavy embedding pipelines, and RAG operations that require LangChain/LlamaIndex internals.

---

## ADR-002: Defer the Python Service to Phase 2

**Decision:** Phase 1 uses TypeScript-only for all AI work.

**Why:** Document parsing and embeddings are just HTTP calls. The real Python dependencies (Docling TableFormer, LangChain complex RAG, custom rerankers) don't become necessary until Phase 2. Adding a second deployment in Phase 1 doubles infrastructure complexity before you have a single user.

**Phase 1 AI stack:**
- Reducto via REST API (TypeScript SDK: `reducto-ts`) — replaces LlamaParse (EOL May 2026)
- Claude Sonnet 4.6 via Helicone proxy for lessons, chat, concept extraction
- Gemini 3.1 Flash-Lite via Helicone for quizzes, flashcards, study guides
- OpenAI `text-embedding-3-large` via Helicone for embeddings
- Vercel AI SDK v6 for all generation (provider-agnostic model routing)
- Trigger.dev for orchestration (TypeScript tasks only)

**Phase 2 trigger:** Add Python service when any of these is true:
- Need Docling for table-heavy documents (better than Reducto for complex layouts)
- Need custom reranker (Cohere or local cross-encoder)
- Need LangChain/LlamaIndex internals
- Embedding batch sizes exceed what TypeScript can handle cleanly

---

## ADR-003: Technology Stack

| Layer | Choice | Version | Rationale |
|-------|--------|---------|-----------|
| Framework | Next.js App Router | 15.x | Official Supabase SSR integration, RSC streaming, Vercel AI SDK native |
| AI Interface | Vercel AI SDK | 6.x | `useChat`, `streamText`, `streamObject`, multi-provider, tool calling |
| API Layer | tRPC | 11.x | End-to-end type safety, zero codegen, works in Next.js API routes |
| Database | Supabase (Postgres + pgvector + Auth + Storage + Realtime) | Latest | Single managed service for DB, vectors, auth, storage, real-time |
| ORM | Drizzle | Latest | Native pgvector, SQL-first, tiny bundle, RLS schema support |
| Background Jobs | Trigger.dev v3 | 3.x | No execution timeouts, native Supabase webhooks, TypeScript-first |
| AI Gateway | Helicone | Latest | One-line proxy, cost tracking, semantic caching, failover |
| AI Observability | Langfuse | Latest | Step-level pipeline tracing, prompt management, evaluation |
| Server State | TanStack Query | 5.x | Supabase data fetching, caching, background revalidation |
| Client State | Zustand | 5.x | UI state (sidebar, generation status, theme) |
| Validation | Zod | 3.x | Single source of truth — schemas defined once, types inferred |
| Components | shadcn/ui + Radix | Latest | Copy-paste ownership, WCAG accessible, Tailwind-native |
| Rich Text | Plate (udecode) | Latest | shadcn/ui native, AI integration, 50+ headless plugins |
| Forms | React Hook Form | 7.x | With Zod resolver |
| Monorepo | Turborepo + pnpm | Latest | ~20 lines config, free Vercel remote caching |
| Animations | Framer Motion | 12.x | — |
| Charts | Recharts | Latest | Mastery dashboard, analytics |
| Email | Resend | Latest | Transactional, React email templates |
| Error Tracking | Sentry | Latest | Frontend + backend |
| Deployment (web) | Vercel | — | — |
| Cache / Queues | Redis via Upstash | — | Serverless, rate limiting, exact-match cache |
| Object Storage (audio) | Cloudflare R2 | — | Audio artifacts only; Supabase Storage for documents |

---

## ADR-004: State Management — Three Layers, Not One Store

Do not merge these into a single global store.

| Layer | Tool | Owns |
|-------|------|------|
| Server state | TanStack Query v5 | All Supabase data: workspaces, lessons, concepts, mastery |
| UI / client state | Zustand 5 | Sidebar open, generation status, active workspace, theme, multi-step forms |
| AI streaming state | Vercel AI SDK hooks | `useChat`, `useCompletion` — managed internally, do not duplicate |

---

## ADR-005: API Design — tRPC + AI SDK Hybrid

- **tRPC** for all CRUD operations (type-safe, zero codegen, works in Next.js)
- **Vercel AI SDK route handlers** (`/api/chat/route.ts`) for all streaming AI responses
- **REST** for Python service communication (OpenAPI → `@hey-api/openapi-ts` for typed TS clients)
- **No GraphQL** — tRPC gives better type safety with less complexity

---

## ADR-006: Zod Schemas Are the Single Source of Truth

Define schemas once in `@learn-x/validators`. Infer TypeScript types in `@learn-x/types`. Use for:
- Frontend form validation
- tRPC input/output validation
- Backend business logic validation

One schema change propagates type errors everywhere. Never define the same shape twice.

---

## ADR-007: pgvector Inside Supabase — No Separate Vector Database

pgvector with HNSW indexing handles ~10M vectors with 2.5ms baseline query latency. That is well beyond Phase 1–3 scale. A dedicated vector database (Pinecone, Weaviate, Qdrant) adds HTTP overhead and another managed service. Do not add one until Supabase pgvector becomes a measured bottleneck.

**Critical implementation note:** All embedding columns use `halfvec(3072)`, not `vector(3072)`. pgvector's HNSW index supports a maximum of 2,000 dimensions for the `vector` type and 4,000 for `halfvec`. At 3,072 dimensions (`text-embedding-3-large`), `halfvec` is required or the HNSW index will not build. Use `halfvec_cosine_ops` in the index definition.

---

## ADR-008: SSE for All AI Streaming

Server-Sent Events (SSE) is the correct choice. OpenAI's API, Vercel AI SDK, and production teams universally use SSE. It works over standard HTTP, has native browser auto-reconnect, and handles the unidirectional server→client flow AI responses require. Reserve WebSockets for collaborative editing only (Phase 3+).

---

## Non-Negotiable Technical Rules

### Rule 1: Every heavy task is a Job
No hidden `Promise.all` or fire-and-forget in request handlers. Any operation that:
- Calls an LLM
- Processes a document
- Generates embeddings
- Takes more than ~2 seconds

...must go through the Job system (Trigger.dev). This makes failures visible, retryable, and auditable.

### Rule 2: One retrieval path
Single `chunk_embeddings` table. Single `hybrid_search` RPC function. No secondary embedding stores, no parallel retrieval strategies, no "quick hack" direct pgvector calls in application code. All retrieval goes through the one path.

### Rule 3: Typed entities, not metadata blobs
These get their own tables — not JSONB columns on another table:
- Chat sessions and messages
- Quiz questions, attempts, responses
- Flashcards and review history
- Mastery records
- Audio generations

The acceptable JSONB fields are: `lesson.structured_sections`, `job.input_data`, `job.output_data`, `workspace.settings`, `persona.learning_style`, `voice_config`. Watch these and don't add to the list.

### Rule 4: One backend contract
tRPC for TypeScript clients. OpenAPI (auto-generated by FastAPI) for Python service. Never hand-write API types that could be derived from the schema.

### Rule 5: Personalization changes behavior, not just wording
The `Persona` entity must affect: lesson order, explanation depth, pacing, remediation triggers, example style, quiz difficulty, study schedule. A persona that only changes system prompt wording is not a persona — it's a theme.

### Rule 6: AI orchestration is a real subsystem
Every LLM call creates an `ai_requests` record with: task_type, provider, model, prompt_version, input_tokens, output_tokens, latency_ms, cost_cents, was_cached, validation_passed. No exceptions. This is how you debug quality regressions and manage costs.

### Rule 7: Files ≤ 400 lines
Enforced by pre-commit hook. Long files signal missing boundaries. Split them.

---

## Three-Layer Caching Strategy

**Layer 1 — Provider-level prompt caching**
OpenAI, Anthropic, and Google all cache repeated prompt prefixes automatically. Structure system prompts to maximize cache hits (shared prefix + user-specific suffix).

**Layer 2 — Semantic caching via Helicone**
Store query embeddings + responses. On new queries, if cosine similarity > 0.95, return cached response. Expected 20–40% hit rate for Q&A. Configured at the Helicone gateway level — no application code changes.

**Layer 3 — Redis exact-match cache**
For deterministic operations: quiz generation for a specific `(topic, difficulty, question_count)` tuple with `temperature=0`. TTL: 24 hours.

---

## Infrastructure Environments

| Environment | Web | Database | Jobs | AI Workers |
|-------------|-----|----------|------|------------|
| Local dev | Next.js dev server | Supabase local (Docker) | Trigger.dev dev CLI | Python FastAPI (Docker, Phase 2+) |
| Preview | Vercel preview | Supabase staging branch | Trigger.dev staging | Railway staging (Phase 2+) |
| Production | Vercel | Supabase production | Trigger.dev production | Railway production (Phase 2+) |
