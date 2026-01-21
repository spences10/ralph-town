# Claude Agent SDK Patterns

Research on Claude Agent SDK usage for agent orchestration.

---

## Key API

```typescript
import { query } from '@anthropic-ai/claude-agent-sdk';

for await (const message of query({
	prompt: task,
	options: {
		systemPrompt: '...',
		allowedTools: ['Read', 'Write', 'Bash', ...],
		resume: session_id, // conversation continuity
		permissionMode: 'acceptEdits',
	},
})) {
	// Handle streaming messages
}
```

---

## Session Management

Use `session_id` from init message to resume conversations across
turns. This enables multi-turn agent loops.

---

## Message Types

- `system` with `subtype: 'init'` - contains session_id
- `assistant` - Claude's responses with text/tool_use blocks
- `result` with `subtype: 'success'` - final result

---

## To Research

- [ ] Token usage from response messages
- [ ] Error handling and retries
- [ ] Rate limit backoff patterns
- [ ] Tool permission modes
