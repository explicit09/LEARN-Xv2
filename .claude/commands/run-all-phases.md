# Run All Phases — Full LEARN-X Build Loop

Runs every phase in `tasks/phases.md` sequentially, one ralph loop per phase.
Each phase gets a fresh context window. The outer loop only advances when the
current phase outputs `PHASE_COMPLETE`. A `PHASE_BLOCKED` result halts
everything and notifies you.

## How to invoke

```bash
/run-all-phases
```

No arguments needed. All state lives in `tasks/phases.md` and `tasks/todo.md`.

---

## Setup (do this once before first run)

Create `tasks/phases.md` listing your phases in order:

```markdown
# LEARN-X Phases

- [ ] phase-0-foundation
- [ ] phase-1-document-ingestion
- [ ] phase-2-lesson-engine
- [ ] phase-3-quiz-and-flashcards
- [ ] phase-4-mastery-tracking
- [ ] phase-5-personalization
- [ ] phase-6-generative-ui
```

Mark phases as `[x]` when complete. The runner reads this file to find the
next unchecked phase each time it starts.

---

## What the runner does

### FOR EACH unchecked phase in `tasks/phases.md`:

**1. Plan gate (fresh context — do not skip)**

Switch to Plan Mode. Before writing a single line of code:
- Read `CLAUDE.md`, `docs/01-architecture.md`, `docs/04-repo-structure.md`
- Read the phase-specific doc that `CLAUDE.md` references
- Open paper.design and note the relevant screens and component specs
- Write a plan: files to touch, rules in play, test strategy, open questions
- Write the plan as checkable items to `tasks/todo.md`
- Commit: `git commit -m "chore: todo for <phase-name>"`
- Clear context: `/clear`

**2. Ralph loop (one loop per phase)**

```bash
/ralph-loop "
Phase: <phase-name>

Read tasks/todo.md.
Implement the current unchecked phase top-to-bottom using TDD:
  - Write failing test → confirm failure → implement → pass → commit → check off
Run all verification: typecheck, lint, unit tests, contract tests,
integration tests, Playwright flows, paper.design cross-check,
architecture rules audit (see .claude/commands/ralph-loop.md for full detail).
Output <promise>PHASE_COMPLETE</promise> only when every check passes.
After 25 iterations without completion: document blockers in tasks/lessons.md
and output <promise>PHASE_BLOCKED</promise>.
" --max-iterations 30 --completion-promise "PHASE_COMPLETE"
```

**3. After `PHASE_COMPLETE`**
- Check off the phase in `tasks/phases.md`: `[x] phase-name`
- Commit: `git commit -m "chore: mark <phase-name> complete"`
- Start next phase (go back to step 1)

**4. On `PHASE_BLOCKED` or max-iterations hit**
- **Stop the entire run-all-phases loop immediately**
- Print a summary of what blocked and where
- Wait for human input before continuing
- Do NOT auto-advance to the next phase

---

## Parallel variant (advanced)

If phases are independent (no shared DB migrations, no shared types),
you can run up to 3 in parallel using separate git worktrees:

```bash
# Terminal 1 — worktree-1
cd repo-1 && /ralph-loop "Phase: phase-2-lesson-engine ..." --max-iterations 30 --completion-promise "PHASE_COMPLETE"

# Terminal 2 — worktree-2
cd repo-2 && /ralph-loop "Phase: phase-3-quiz-and-flashcards ..." --max-iterations 30 --completion-promise "PHASE_COMPLETE"
```

**Only do this when phases share no migration files or schema changes.**
Parallel migration work causes merge conflicts that are hard to resolve cleanly.

---

## Full invocation reference

| Parameter | Purpose | Recommended value |
|-----------|---------|-------------------|
| `"prompt"` | Task description with completion instruction | Include all 4 verification steps + `<promise>` instruction |
| `--max-iterations` | Hard safety cap | `30` per phase |
| `--completion-promise` | Exact string that exits the loop | `"PHASE_COMPLETE"` |
| `/cancel-ralph` | Emergency stop | Run in same session |

**Cost awareness:** Each iteration = one full Claude session.
At 30 iterations × N phases, token cost adds up fast.
Keep phases small (1–3 days of work). Large phases = more iterations = higher cost.
Boris Cherny's rule: multiple small sessions beat one overloaded session.

---

## State files

| File | Purpose |
|------|---------|
| `tasks/phases.md` | Phase checklist — source of truth for what's next |
| `tasks/todo.md` | Per-phase implementation checklist |
| `tasks/lessons.md` | Accumulated patterns — read at start of every session |
| `.claude/commands/ralph-loop.md` | The loop each phase runs |
| `screenshots/<phase>/` | Playwright screenshots from verification |
