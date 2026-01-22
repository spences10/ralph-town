# Ralph Loop Pattern

The iterative acceptance criteria loop.

---

## Status: Validated

The core loop is implemented and working. See `src/orchestrator.ts`.

---

## Concept

Named after the "Ralph Wiggum loop" - a bash loop that spins up
Claude Code instances and iterates until the task is done.

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

```json
{
	"task": "Create a hello.txt file with content 'Hello from Ralph'",
	"acceptance_criteria": [
		{
			"type": "file_exists",
			"path": "/home/daytona/hello.txt"
		}
	],
	"max_iterations": 3,
	"budget": {
		"max_tokens": 10000
	}
}
```

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
- [ ] Backpressure handling: pause/retry on rate limits
- [ ] State persistence between iterations
- [ ] More acceptance criteria types
