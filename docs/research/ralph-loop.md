# Ralph Loop Pattern

The iterative acceptance criteria loop with backpressure verification.

---

## Status: Validated

The core loop is implemented and working. See `src/orchestrator.ts`.

---

## Concept

Named after the "Ralph Wiggum loop" - a bash loop that spins up Claude
Code instances and iterates until the task is done.

**Original source:** [ghuntley.com/ralph](https://ghuntley.com/ralph/)

```bash
while :; do cat PROMPT.md | claude-code ; done
```

**Key insight:** "A technique that can replace the majority of
outsourcing at most companies for greenfield projects."

---

## Backpressure Pattern

From
[Anthropic's research](https://www.anthropic.com/engineering/effective-harnesses-for-long-running-agents):

**Backpressure = one feature at a time, verify before moving on.**

The agent:

1. Picks ONE incomplete feature from the list
2. Implements it fully
3. Verifies with end-to-end tests (not just unit tests)
4. Marks as `passes: true`
5. Commits with descriptive message
6. Only then moves to next feature

This prevents:

- Partial implementations across many features
- Untested code accumulating
- Context loss between sessions

---

## Core Loop Structure (Implemented)

```typescript
while (iterations < config.max_iterations) {
	// Run agent
	const output = await run_agent_in_sandbox(sandbox, config.task);

	// Check criteria
	const criteria_met = await check_all_criteria(
		sandbox,
		config.acceptance_criteria,
	);

	// Exit if all pass
	if (criteria_met.every((m) => m)) {
		return { status: 'success', ... };
	}

	// Budget check
	if (tokens_used >= config.budget.max_tokens) {
		return { status: 'budget_exhausted', ... };
	}

	iterations++;
}
return { status: 'max_iterations', ... };
```

---

## ralph.json Schema (Validated)

### Simple Task

```json
{
	"task": "Create a hello.txt file with content 'Hello from Ralph'",
	"acceptance_criteria": [
		{ "type": "file_exists", "path": "/home/daytona/hello.txt" },
		{
			"type": "command_succeeds",
			"command": "grep 'Hello' /home/daytona/hello.txt"
		}
	],
	"max_iterations": 3,
	"budget": { "max_tokens": 10000 }
}
```

### Feature List Pattern (Anthropic)

For larger tasks, use a feature list with individual pass/fail:

```json
{
	"task": "Implement features from the feature list",
	"features": [
		{
			"id": "feat-001",
			"description": "Add health endpoint",
			"steps": [
				"Create /api/health route",
				"Return { status: 'ok' }"
			],
			"backpressure": "curl -sf localhost:3000/api/health | jq .status",
			"passes": false
		},
		{
			"id": "feat-002",
			"description": "Add user auth",
			"steps": [
				"Create login form",
				"Validate credentials",
				"Set session"
			],
			"backpressure": "npm test -- --grep 'auth'",
			"passes": false
		}
	],
	"max_iterations": 10,
	"budget": { "max_tokens": 50000 }
}
```

**Key rules:**

- Features remain unmodified except for `passes` status updates
- "It is unacceptable to remove or edit tests" (Anthropic)
- Agent must verify with `backpressure` command before marking done

See `src/types.ts` for TypeScript definitions.

---

## Acceptance Criteria Types (Implemented)

| Type               | Description                      |
| ------------------ | -------------------------------- |
| `file_exists`      | Check if file exists at path     |
| `command_succeeds` | Run command, check exit code = 0 |

**Future types to add:**

- `tests_pass` - run test suite
- `no_type_errors` - run tsc --noEmit
- `lint_clean` - run linter
- `contains_text` - file contains specific text

---

## Exit Conditions (Implemented)

1. **Success** - all acceptance criteria met
2. **Max iterations** - safety limit reached
3. **Budget exhausted** - token/cost limit hit
4. **Error** - unrecoverable failure

---

## To Do

- [ ] Real token tracking from agent response
- [ ] Context passing between iterations (what failed)
- [ ] Feature list mode with individual pass/fail
- [ ] State persistence via `progress.txt` file
- [ ] Git-based recovery (revert on failure)
- [ ] More acceptance criteria types

---

## References

- [Original Ralph Article](https://ghuntley.com/ralph/) - ghuntley
- [Matt Pocock Video](https://www.youtube.com/watch?v=_IK18goX4X8) -
  Ship code while you sleep
- [Anthropic Engineering](https://www.anthropic.com/engineering/effective-harnesses-for-long-running-agents) -
  Long-running agent harnesses
- [11 Tips for Ralph](https://www.aihero.dev/s/r-wiggum-article) - AI
  Hero
