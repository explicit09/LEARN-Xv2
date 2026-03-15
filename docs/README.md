# LEARN-X v2 — Documentation Index

> **Status:** Active
> **Last updated:** March 2026
> **Purpose:** Implementation reference. Read before you build, consult during build.

---

## What LEARN-X is

A **learning operating system** that turns course materials into adaptive mastery.

Not an AI notebook. Not a document chatbot. Not a flashcard generator.

The core loop: **Upload → Understand sources → Build concept map → Generate lessons → Study → Detect weakness → Adapt**

The key insight others miss: **personalization must go deeper than pace and difficulty.** If a student understands the world through basketball, music, finance, or gaming, LEARN-X uses those frames to make hard concepts click faster — without sacrificing rigor. This is identity-linked explanation framing, and it is one of LEARN-X's signature differentiators.

---

## Documents

| Doc | What it covers | Read when |
|-----|---------------|-----------|
| [01-architecture.md](./01-architecture.md) | Tech stack, ADRs, non-negotiable rules | Before writing any code |
| [02-domain-model.md](./02-domain-model.md) | Canonical nouns, bounded contexts, entity definitions | Before writing any schema or business logic |
| [03-database.md](./03-database.md) | Full SQL schema, RPC functions, RLS policies | Before creating migrations |
| [04-repo-structure.md](./04-repo-structure.md) | Monorepo layout, package responsibilities, naming | Before scaffolding |
| [05-api-design.md](./05-api-design.md) | tRPC routers, AI SDK streaming routes, API contracts | Before writing API code |
| [06-jobs.md](./06-jobs.md) | Job lifecycle, Trigger.dev patterns, all job types | Before writing any async work |
| [07-ai-pipeline.md](./07-ai-pipeline.md) | Document processing, embeddings, RAG, concept extraction | Before touching AI code |
| [08-mvp-phases.md](./08-mvp-phases.md) | Phase 0–1G scope, sequence, definitions of done | Planning each sprint |
| [09-product-strategy.md](./09-product-strategy.md) | Competitive positioning, feature priority, what NOT to build | When scope decisions arise |
| [10-generative-ui.md](./10-generative-ui.md) | Generative UI system — lesson components, widget framework, chat tool rendering | Before building any lesson UI or chat interface |
| [11-testing-and-quality.md](./11-testing-and-quality.md) | Unit, contract, integration, AI eval, latency budgets, cost budgets | Before writing any tests; when quality regressions appear |
| [12-personalization-engine.md](./12-personalization-engine.md) | Full Personalization Engine spec — 4 layers, Framing Engine, onboarding, persona versioning | Before building any persona logic, lesson generation, or onboarding |
| [13-ai-landscape-research-march-2026.md](./13-ai-landscape-research-march-2026.md) | Initial AI landscape research — model landscape, RAG evolution, memory systems | Reference |
| [14-ai-landscape-research-updated-march-2026.md](./14-ai-landscape-research-updated-march-2026.md) | Updated AI research — exact model specs, 1M context economics, prompt caching, cost projections | Before making AI architecture decisions |

---

## The rules that cannot be broken

1. Every heavy task is a **Job** (never fire-and-forget in request handlers)
2. One retrieval path (single embedding table, single search API)
3. Typed entities, not metadata blobs (chat, quizzes, flashcards get their own tables)
4. One backend contract for all clients (tRPC for TS, OpenAPI for Python)
5. Personalization changes **behavior**, not just wording
6. AI orchestration is a real subsystem (every LLM call is tracked)
7. Files ≤ 400 lines (enforced by pre-commit)

Violating these rules is what v1 taught us. They are not suggestions.

---

## Phase sequence

```
Phase 0: Foundations          (infrastructure, no features)
Phase 1A: Auth + Workspace    (user can sign in, create workspace)
Phase 1B: Document Ingestion  (upload → process → chunks + embeddings)
Phase 1C: Concept Graph       (concepts extracted, graph visible)
Phase 1D: Lessons             (AI-generated, persona-adapted lessons)
Phase 1E: Grounded Chat       (cited, retrieval-grounded conversation)
Phase 1F: Quizzes + Flashcards (FSRS scheduling, adaptive difficulty)
Phase 1G: Mastery Dashboard   (concept heatmap, what to study next)
```

Phase 1 complete = the core loop works. Everything after compounds from here.
