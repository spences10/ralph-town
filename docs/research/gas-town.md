# Gas Town Pattern

Resource management and budgeting for agents.

---

## Concept

Orchestration and resource management layer. "Gas" represents the
compute/API budget available to agents.

---

## Resource Types to Track

- API calls (count)
- Tokens consumed (input + output)
- Sandbox compute time
- File operations
- Network requests

---

## Budget Model

```typescript
interface Budget {
	max_tokens: number;
	max_api_calls: number;
	max_duration_ms: number;
	current: {
		tokens_used: number;
		api_calls: number;
		started_at: number;
	};
}
```

---

## Enforcement Strategies

1. **Hard limit** - stop immediately when budget hit
2. **Soft limit** - warn agent, allow graceful wind-down
3. **Proportional** - allocate budget per subtask

---

## To Research

- [ ] Token counting from Claude API responses
- [ ] Cost calculation per model
- [ ] Budget allocation strategies (per task? per agent?)
- [ ] Graceful degradation when budget exhausted
- [ ] Cost reporting and observability
