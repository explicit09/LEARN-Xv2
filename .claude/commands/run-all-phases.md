# Run All Phases — Full LEARN-X Build Loop

Runs every unchecked phase in `tasks/phases.md` sequentially using the
ralph-loop process defined in `.claude/commands/ralph-loop.md`.

State lives entirely in files and git — not in model memory.
Each iteration re-reads `tasks/phases.md` and `tasks/todo.md` to orient itself.

---

## Invoke with

```
/ralph-loop "
Read .claude/commands/ralph-loop.md and follow every instruction exactly.
Run all unchecked phases in tasks/phases.md one by one.
Output <promise>ALL_PHASES_COMPLETE</promise> when tasks/phases.md has no unchecked phases.
Output <promise>PHASE_BLOCKED</promise> if stuck on the same item for 3+ iterations with no progress.
" --max-iterations 80 --completion-promise "ALL_PHASES_COMPLETE"
```

---

## Pre-flight checklist (do these before running)

- [ ] `supabase start` is running (required for contract + integration tests)
- [ ] `.env.local` has valid `ANTHROPIC_API_KEY`, `OPENAI_API_KEY`, `SUPABASE_SERVICE_ROLE_KEY`
- [ ] `pnpm install` is up to date
- [ ] `git status` is clean — no uncommitted changes
- [ ] Playwright browser has both Paper.design files open:
  - Tab 0: LEARN-X (UI designs) — https://app.paper.design/file/01KKNJ7304493HFTR1K1N1NF9Z
  - Tab 1: LEARN-X Architecture — https://app.paper.design/file/01KKQW93XBGNEJ71527ADGGWN0

---

## What happens each iteration

The loop re-reads `.claude/commands/ralph-loop.md` every iteration and follows it.
No state is in model memory — everything is on disk. This is intentional.

1. Reads `tasks/phases.md` → finds first unchecked phase
2. Reads `tasks/todo.md` → checks if a plan exists for that phase
3. **If no plan** → enters Plan Mode, reads all mandatory docs + Paper.design, writes checklist to `tasks/todo.md`, commits, stops iteration (plan appears next iteration)
4. **If plan exists** → picks first unchecked item, writes failing test, implements, commits
5. When all items checked off → runs full verification gate:
   - `pnpm typecheck` + `pnpm lint` + `pnpm test:unit` + `pnpm test:contract` + `pnpm test:integration`
   - Playwright: navigate each new screen, assert elements, screenshot
   - Paper.design cross-check: layout, spacing, colors, states vs. LEARN-X file
   - Architecture audit: 8 rules from `CLAUDE.md`
6. All verification passes → marks phase `[x]` in `tasks/phases.md`, pushes, moves to next phase
7. No unchecked phases remain → outputs `ALL_PHASES_COMPLETE`

---

## Cost awareness

Each iteration = one full Claude context window.
Estimate: ~5-15 iterations per phase × 4 remaining phases = 20-60 iterations.
`--max-iterations 80` is your hard cost circuit breaker.

---

## Stopping and resuming

**Cancel mid-run:** `/cancel-ralph`

**Resume after cancel or block:** Re-run the same command above.
The loop re-reads `tasks/phases.md` and resumes from the first unchecked phase.
Completed items in `tasks/todo.md` stay checked — no work is repeated.

**After `PHASE_BLOCKED`:** Read `tasks/lessons.md` for the blocker, fix it manually, then re-run.

---

## State files

| File                             | Purpose                                                           |
| -------------------------------- | ----------------------------------------------------------------- |
| `tasks/phases.md`                | Phase checklist — source of truth for what's done and what's next |
| `tasks/todo.md`                  | Per-phase implementation checklist with checkboxes                |
| `tasks/lessons.md`               | Accumulated failure patterns — read every iteration               |
| `.claude/commands/ralph-loop.md` | Full loop instructions — read every iteration                     |
| `screenshots/<phase>/`           | Playwright screenshots from verification                          |
