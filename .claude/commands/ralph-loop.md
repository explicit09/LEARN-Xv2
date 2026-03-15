# Ralph Loop — Iterative Phase Implementation

Autonomous, gated implementation of LEARN-X phases.
Each iteration starts fresh — state lives in files and git history, not memory.
Boris Cherny's rule #1: always give Claude a concrete way to verify its work.

---

## EVERY ITERATION STARTS HERE — Orient before touching anything

1. Read `tasks/phases.md` — find the first unchecked phase. That is the active phase.
2. Read `tasks/todo.md` — find unchecked items for the active phase.
3. Read `tasks/lessons.md` — load known failure patterns. Do not repeat past mistakes.
4. Read `CLAUDE.md` — confirm rules, mandatory doc reads, and conventions.
5. Run `git status` — understand what has already been changed.

---

## PHASE GATE — Does a plan exist for this phase?

Check `tasks/todo.md` for a checklist under the active phase heading.

### If NO plan exists → PLAN MODE

- Switch to Plan Mode (do not write implementation code in this step)
- Read every doc listed in `CLAUDE.md §Mandatory Doc Reads` that applies to this phase
- Open the LEARN-X UI design file via Playwright:
  - `browser_tabs select index=0` → take screenshot → note all screens for this phase
- Open the LEARN-X Architecture file via Playwright:
  - `browser_tabs select index=1` → take screenshot → note relevant pipeline diagrams
- Write a detailed implementation checklist to `tasks/todo.md`:
  - Validators (test files first, then implementation)
  - DB migration (if needed)
  - Drizzle schema updates (must mirror migration exactly)
  - tRPC routers (contract test first, then implementation)
  - Trigger.dev jobs (if needed)
  - UI components and pages
  - Verification steps
- Commit: `git commit -m "chore: plan for <phase-name>"`
- Output: `Plan written. Starting implementation next iteration.`
- Stop here. Implementation begins next iteration.

### If plan EXISTS → IMPLEMENT

Pick the first unchecked item in `tasks/todo.md` and follow the steps below.

---

## STEP 1 — Write failing test first (for any logic or API item)

- Write the test. Run it. Confirm it **FAILS** before writing any implementation.
- If it passes without implementation — stale code exists. Find and remove it first.
- Commit the failing test: `git commit -m "test: <behavior>"`

Config-only files (package.json, tsconfig, migration SQL, next.config) — no test needed.

---

## STEP 2 — Implement

Write minimal code to make the test pass. Follow all `CLAUDE.md` rules:

- Files ≤ 400 lines — split before hitting the limit
- No async work in request handlers — always Trigger.dev
- No inline prompts — `apps/web/src/lib/ai/prompts/` only, versioned `.v1.ts`
- Every LLM call → row in `ai_requests` — no exceptions
- Zod schemas in `@learn-x/validators` only — never hand-write duplicate types
- Read mandatory doc before touching that system — confirm in response

Run the test. Iterate until green.
Commit: `git commit -m "feat: <what>"`
Check the item off in `tasks/todo.md`.

Repeat STEP 1 → STEP 2 for each unchecked item.

---

## STEP 3 — Verification gate (only after ALL items are checked off)

Run every check in order. Any failure → fix it, re-run from the top of STEP 3.

### 3a — Automated checks

```bash
pnpm typecheck        # zero errors required
pnpm lint             # zero errors required
pnpm test:unit        # all green required
pnpm test:contract    # all green required (supabase must be running)
pnpm test:integration # all green required
```

### 3b — Visual check (Playwright MCP)

For every user-facing screen added or changed in this phase:

1. `browser_tabs select index=0` — navigate to the screen in the running app
2. Assert correct elements are present and interactive
3. Test the primary user flow end-to-end
4. `browser_take_screenshot` → save to `screenshots/<phase-name>/<screen>-<state>.png`

Do not output the completion promise until all screens pass.

### 3c — Design cross-check (Paper.design)

For every screen in this phase:

1. `browser_tabs select index=0` — find the screen in LEARN-X design file
2. Compare: layout, spacing, typography, colors, component variants
3. Check empty state, loading state, and error state designs
4. Blocking deviation (wrong layout, missing component) → fix before promise
5. Minor deviation (slightly off spacing) → log in `tasks/lessons.md` with severity note

For pipeline/architecture changes:

1. `browser_tabs select index=1` — find the relevant diagram in LEARN-X Architecture
2. Verify implementation matches the architecture diagram

### 3d — Architecture rules audit

Verify against `docs/01-architecture.md` and `CLAUDE.md §The 8 Rules`:

- No async work in tRPC handlers or API routes (must use Trigger.dev)
- All search goes through `hybrid_search` only
- No JSONB catch-alls — every entity has its own table
- No hand-written types that duplicate a Zod schema
- Every LLM call has a row in `ai_requests`
- No file over 400 lines
- New tRPC procedures: `camelCase` verb.noun format
- Every new table with `user_id` or `workspace_id` has RLS policies
- Drizzle schema in `schema.ts` exactly mirrors the migration SQL

---

## STEP 4 — Phase complete

When all items checked off and all verification passes:

1. Write phase summary to `tasks/todo.md` under the phase heading
2. Update `tasks/lessons.md` with anything surprising or worth remembering
3. Mark the phase complete in `tasks/phases.md`: `[x] phase-name`
4. Commit: `git commit -m "chore: complete <phase-name>"`
5. Push: `git push origin main`
6. Output exactly: `<promise>PHASE_COMPLETE</promise>`

---

## STEP 5 — All phases complete

When `tasks/phases.md` has no unchecked phases remaining:

1. Output exactly: `<promise>ALL_PHASES_COMPLETE</promise>`

---

## STEP 6 — Blocked

When stuck on the same item for 3+ iterations with no progress:

1. Write a blockers section in `tasks/lessons.md`:
   - What is failing and exact error
   - Every approach attempted
   - Suggested next approach for a human
2. Output exactly: `<promise>PHASE_BLOCKED</promise>`

---

## Iteration behaviour table

| Situation                               | Action                                                                  |
| --------------------------------------- | ----------------------------------------------------------------------- |
| Test fails after fix attempt            | Fix and continue — do NOT modify the test                               |
| Test fails after 3 fix attempts         | Re-read failing test carefully, rewrite implementation from scratch     |
| Design deviation — blocking             | Fix implementation, re-run Step 3b+3c                                   |
| Architecture violation                  | Fix immediately, re-run Step 3d then restart from 3a                    |
| Scope creep discovered                  | Add to `tasks/todo.md` as a new phase item, do NOT expand current phase |
| Typecheck/lint error mid-impl           | Fix before committing anything else                                     |
| Supabase not running for contract tests | Run `supabase start` then retry                                         |
| Iteration limit approaching (≥ max-3)   | Document progress, output `<promise>PHASE_BLOCKED</promise>`            |
