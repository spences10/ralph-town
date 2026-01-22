# Ralph Loop Pattern

The iterative acceptance criteria loop with backpressure verification.

---

## Status: Implemented

Ralph + Gas Town hybrid with orchestrator-managed state.

---

## Core Concept

Named after the "Ralph Wiggum loop" - a bash loop that spins up Claude
Code instances and iterates until the task is done.

**Original source:** [ghuntley.com/ralph](https://ghuntley.com/ralph/)
(Geoffrey Huntley)

```bash
while :; do cat PROMPT.md | claude-code ; done
```

**Key insight:** "Ralph is deterministically bad in a
non-deterministic world." The technique embraces limitations - fresh
context each iteration, external memory through files, enough
repetition that even Ralph eventually gets it right.

---

## Critical: Fresh Context Per Iteration

> "**The fundamental mechanism of Ralph is that each iteration starts
> a new session with fresh context.** If you're implementing Ralph as
> part of the agent harness via skill/command/etc you are missing the
> point of Ralph which is to use always a fresh context."
>
> — Michael Arnaldi

This means:

- Each loop iteration = new Claude session
- No memory of previous attempts within the agent
- External state persists via git and spec files

In canonical Ralph, the agent reads `fix_plan.md` to understand state.
In ralph-gas, the orchestrator passes state via task arguments instead.

---

## Architecture (Matt Pocock / Geoffrey Huntley)

### Core Files

| File           | Purpose                                          |
| -------------- | ------------------------------------------------ |
| `PROMPT.md`    | Instructions fed to agent each iteration         |
| `specs/*`      | One spec file per feature (static requirements)  |
| `fix_plan.md`  | Dynamic task tracker, updated by agent each loop |
| `AGENT.md`     | Project conventions, "signs" for the agent       |
| `progress.txt` | Append-only learnings from iterations (optional) |

### The "Signs" Metaphor

Ralph is given instructions to build a playground but comes home
bruised because he fell off the slide. You tune Ralph by adding a
sign: "SLIDE DOWN, DON'T JUMP, LOOK AROUND."

Signs live in `AGENT.md` files. They're progressively discoverable -
nested `routes/AGENT.md` for route-specific conventions.

---

## The Loop Mechanism

Each iteration follows this pattern:

1. Read `fix_plan.md` to understand current state
2. Pick the most important item (Ralph decides, not you)
3. Pull relevant spec(s) for that specific task
4. Implement the change
5. Run tests/validation (backpressure)
6. Update `fix_plan.md` with results
7. Commit changes to git
8. Session ends → fresh context → repeat

### One Item Per Loop

> "One item per loop. I need to repeat myself here—one item per loop.
> You may relax this restriction as the project progresses, but if it
> starts going off the rails, then you need to narrow it down to just
> one item."
>
> — Geoffrey Huntley

---

## Backpressure Pattern

**Backpressure = validation that forces corrections.**

Code generation is cheap; ensuring correctness is hard. The validation
wheel must turn fast.

### Types of Backpressure

| Type             | Example                          | Speed  |
| ---------------- | -------------------------------- | ------ |
| Type systems     | `tsc --noEmit`                   | Fast   |
| Linters          | `npm run lint`                   | Fast   |
| Unit tests       | `npm test`                       | Medium |
| E2E tests        | `npm run test:e2e`               | Slow   |
| HTTP checks      | `curl -sf localhost:3000/health` | Fast   |
| Static analyzers | Pyrefly, Dialyzer                | Medium |

### Good vs Bad Backpressure

**Good** (runtime verification):

```json
"backpressure": "npm run build && npm run typecheck"
```

```json
"backpressure": "curl -sf http://localhost:5173/api/health | jq -e '.status == \"ok\"'"
```

**Bad** (just file existence):

```json
"backpressure": "test -f src/routes/api/health/+server.ts"
```

File existence doesn't verify the code works!

---

## Planning Mode vs Building Mode

Ralph operates in two modes:

**Planning mode:** Reads all specs, compares implementation against
specifications, generates/updates `fix_plan.md`. Context-heavy, run
once before building.

**Building mode:** Reads `fix_plan.md`, picks one item, implements it,
updates the plan, commits. Lean loop that runs repeatedly.

> **Warning:** Drift detection requires active monitoring. You must
> watch Ralph's progress and switch to planning mode when
> implementation no longer matches specs.

---

## Specs vs Plan Separation

### `specs/*` (Static)

- What should be built
- Source of truth for requirements
- Updated when requirements change
- Loaded on-demand per task

### `fix_plan.md` (Dynamic)

- What still needs to be done
- Discovered bugs and issues
- Items marked complete/incomplete
- Periodically regenerated or cleaned

---

## Implementation: ralph-gas

### Our Approach (Ralph + Gas Town)

Unlike canonical Ralph (which uses file-based state via `fix_plan.md`),
ralph-gas uses **orchestrator-managed state**:

- **Orchestrator** tracks feature status in memory (`config.features[].passes`)
- **Orchestrator** picks the next feature and passes task as CLI argument
- **Agent** executes the task (fresh Claude session each time)
- **Orchestrator** checks backpressure and updates state
- **Gas Town** budget controls limit iterations and token usage

This is a hybrid: Ralph's fresh-context-per-iteration pattern combined
with Gas Town's resource management, but without file-based state passing.

The agent receives only the task string - no fix_plan.md, no specs folder.
State lives in the orchestrator, not in the sandbox filesystem.

### ralph.json Schema

```json
{
	"repository": {
		"url": "https://github.com/user/repo.git",
		"branch": "main"
	},
	"git": {
		"feature_branch": "feature/my-feature",
		"create_pr": true
	},
	"features": [
		{
			"id": "feat-001",
			"description": "Add health check API endpoint",
			"task": "Create /api/health endpoint returning { status: 'ok' }",
			"backpressure": "cd /home/daytona/workspace && npm run build && curl -sf http://localhost:5173/api/health",
			"passes": false
		}
	],
	"max_iterations_per_feature": 3,
	"budget": { "max_tokens": 50000 }
}
```

---

## Exit Conditions

1. **Success** - all features pass backpressure
2. **Max iterations** - safety limit reached
3. **Budget exhausted** - token/cost limit hit
4. **Error** - unrecoverable failure

---

## Evidence & Case Studies

### CURSED Programming Language

Geoffrey Huntley built a complete programming language (lexer, parser,
LLVM codegen, stdlib) over 3 months of autonomous Ralph operation.

### YC Hackathon Results

- **Output:** 6 repos shipped overnight, ~1,100 commits
- **Cost:** ~$800 total (~$10.50/hour per agent)
- **Completion:** ~90% automated, 10% human cleanup
- **Finding:** 103-word prompts outperformed 1,500-word prompts

### $50k Contract for $297

VentureBeat documented a developer completing a $50k contract for $297
in API costs using Ralph.

---

## References

### Primary Sources

- [ghuntley.com/ralph](https://ghuntley.com/ralph/) - Geoffrey
  Huntley's original article
- [ZeroSync Technical Deep Dive](https://www.zerosync.co/blog/ralph-loop-technical-deep-dive) -
  Comprehensive technical guide
- [Matt Pocock Video](https://www.youtube.com/watch?v=_IK18goX4X8) -
  Ship code while you sleep

### Tutorials

- [11 Tips for Ralph](https://www.aihero.dev/tips-for-ai-coding-with-ralph-wiggum) -
  Matt Pocock / AI Hero
- [Getting Started with Ralph](https://www.aihero.dev/getting-started-with-ralph) -
  AI Hero

### Anthropic

- [Effective Harnesses for Long-Running Agents](https://www.anthropic.com/engineering/effective-harnesses-for-long-running-agents)

### Social

- [Michael Arnaldi on fresh context](https://x.com/MichaelArnaldi/status/2009592577482453411)
- [Huntley on context rot](https://x.com/GeoffreyHuntley/status/2009593902505013354)
