# Ralph Loop Pattern

The iterative acceptance criteria loop.

---

## Concept

Named after the "Ralph Wiggum loop" - a bash loop that spins up
Claude Code instances and iterates until the task is done.

---

## Core Loop Structure

```typescript
while (!acceptance_criteria_met(result)) {
	result = await agent.run(task, context);
	iteration++;

	if (iteration >= max_iterations) break;
	if (budget_exhausted()) break;
}
```

---

## ralph.json Schema (Draft)

```json
{
	"task": "Refactor authentication module",
	"acceptance_criteria": [
		"All tests pass",
		"No TypeScript errors",
		"Code review checklist complete"
	],
	"max_iterations": 5,
	"budget": {
		"max_tokens": 50000,
		"max_cost_usd": 1.0
	}
}
```

---

## Exit Conditions

1. **Success** - all acceptance criteria met
2. **Max iterations** - safety limit reached
3. **Budget exhausted** - token/cost limit hit
4. **Error** - unrecoverable failure

---

## To Research

- [ ] Acceptance criteria file format (ralph.json schema?)
- [ ] How to evaluate "task done" programmatically
- [ ] Backpressure handling: pause/retry on rate limits
- [ ] State persistence between iterations
- [ ] How does the original Ralph Wiggum loop work exactly?
