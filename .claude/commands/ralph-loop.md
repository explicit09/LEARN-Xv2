# Ralph Loop — Single Phase Implementation

Autonomous, gated implementation of one LEARN-X phase.
Uses the Stop Hook to keep looping until all checks pass or max-iterations is hit.

## How to invoke

```bash
/ralph-loop "
Phase: <phase-name>

Read tasks/todo.md.
Implement the current unchecked phase top-to-bottom using the process below.
Run all verification checks.
Output <promise>PHASE_COMPLETE</promise> only when every check passes.
After 25 iterations without completion: document blockers in tasks/lessons.md,
list everything attempted, and output <promise>PHASE_BLOCKED</promise>.
" --max-iterations 30 --completion-promise "PHASE_COMPLETE"
```

> **Note on `--completion-promise`:** uses exact string matching.
> Claude must literally output `<promise>PHASE_COMPLETE</promise>` for the loop to exit.
> `--max-iterations` is your hard safety net — always set it.
> Cancel at any time with `/cancel-ralph`.

---

## What Claude does each iteration

### STEP 1 — Orient (every iteration starts here)
- Read `tasks/todo.md` — find the current phase and its unchecked items
- Read `tasks/lessons.md` — load known failure patterns before touching anything
- Read `CLAUDE.md` — confirm rules and relevant docs
- Check `git status` — understand what has already been changed

### STEP 2 — Write failing test first (if item is implementation work)
- Write the test. Run it. Confirm it **FAILS** before writing any implementation.
- If the test accidentally passes, the implementation already exists — check for stale code.
- Commit the failing test: `git commit -m "test: <behavior>"`

### STEP 3 — Implement
- Write minimal code to make the test pass.
- Follow all `CLAUDE.md` conventions:
  - Files ≤ 400 lines — split before hitting the limit
  - No async work in request handlers — always Trigger.dev
  - No inline prompts — `apps/web/src/lib/ai/prompts/` only
  - Every LLM call inserts into `ai_requests`
  - Zod schemas in `@learn-x/validators`, never duplicate types
- Run the test. Iterate until green. Commit: `git commit -m "feat: <what>"`
- Check the item off in `tasks/todo.md`.

### STEP 4 — Verification gate (run after ALL items are checked off)

Run every check in order. **Any failure → fix it, restart from STEP 1.**

```bash
# 4a — Automated
pnpm typecheck                # must be zero errors
pnpm lint                     # must be zero errors
pnpm test:unit                # must be all green
supabase start
pnpm test:contract            # must be all green
pnpm test:integration         # must be all green
```

```bash
# 4b — Visual (Playwright MCP)
# For every user-facing screen changed in this phase:
# 1. Navigate to the screen
# 2. Assert correct elements are visible
# 3. Assert interactions behave correctly
# 4. Take a screenshot named: screenshots/<phase>/<screen>-<state>.png
# Do NOT output the promise until all Playwright flows pass.
```

```bash
# 4c — Design cross-check (paper.design)
# Open paper.design and locate screens for this phase.
# For each screen, compare: layout, spacing, typography, component variants,
# color, empty states, loading states, error states.
# Blocking deviations → fix before promise.
# Non-blocking deviations → log in tasks/lessons.md with severity note.
```

```bash
# 4d — Architecture rules audit
# Verify against docs/01-architecture.md:
# - Rule 1: No async in request handlers
# - Rule 2: Search only via hybrid_search
# - Rule 3: No JSONB catch-alls
# - Rule 4: No hand-written types duplicating schemas
# - Rule 6: Every LLM call tracked in ai_requests
# - Rule 7: No file over 400 lines
# - New tRPC procedures: verb.noun camelCase
# - New tables with user_id/workspace_id: RLS policies present
# - Drizzle schema matches migrations exactly
```

### STEP 5 — Done or blocked

**All checks pass:**
1. Write phase summary at bottom of `tasks/todo.md`
2. Update `tasks/lessons.md` with anything that surprised you
3. `git push origin feat/<phase-name>`
4. Output exactly: `<promise>PHASE_COMPLETE</promise>`

**Iteration limit approaching (≥25 iterations, still not done):**
1. Write a blockers section in `tasks/lessons.md`:
   - What is failing and why
   - Everything attempted
   - Suggested next approach
2. Output exactly: `<promise>PHASE_BLOCKED</promise>`

---

## Iteration behaviour

| State | Action |
|-------|--------|
| Test failure after fix attempt | Fix and continue — do NOT modify the test |
| Test failure after 2 fix attempts | `/clear`, re-read failing test, rewrite implementation from scratch |
| Design deviation (blocking) | Fix, re-run Step 4b |
| Architecture violation | Fix, re-run Step 4d then restart from 4a |
| Scope creep discovered | Park in `tasks/todo.md` as a new phase, do NOT expand current phase |
| Build/typecheck error mid-impl | Fix before committing anything else |
