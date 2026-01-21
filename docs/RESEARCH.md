# Ralph-GAS Research

Research findings and exploration notes for the Ralph Loop + Gas
Town orchestration patterns.

## Project Vision

**Goal**: Use Daytona containers to run an orchestrator that spawns
child agents, iterating until acceptance criteria are met (Ralph
Loop) with resource budgeting (Gas Town).

---

## Daytona SDK Capabilities

### Core Features for Orchestration

- `daytona.create()` - spawn new sandboxes programmatically
- `sandbox.snapshot()` - checkpoint agent state for restore
- `sandbox.delete()` - cleanup when done
- Volumes - persistent storage shareable between sandboxes
- Multiple sandboxes from one Daytona client instance

### Limitation

No native "spawn sandbox from inside sandbox" - orchestrator must
coordinate from outside or use callback pattern.

### SDK Source Structure

Key files in `daytonaio/daytona/libs/sdk-typescript/src`:

- `Daytona.ts` - main client
- `Sandbox.ts` - sandbox instance
- `Process.ts` - command execution
- `FileSystem.ts` - file operations
- `Snapshot.ts` - checkpoint/restore
- `Volume.ts` - persistent storage

---

## Claude Agent SDK Patterns

### Key API

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

### Session Management

Use `session_id` from init message to resume conversations across
turns. This enables multi-turn agent loops.

### Message Types

- `system` with `subtype: 'init'` - contains session_id
- `assistant` - Claude's responses with text/tool_use blocks
- `result` with `subtype: 'success'` - final result

---

## Architecture Options

### Option A: Orchestrator LOCAL → spawns Daytona sandboxes

```
┌─────────────────┐
│  Local Machine  │
│  (Orchestrator) │
└────────┬────────┘
         │ spawns
    ┌────┴────┬────────┐
    ▼         ▼        ▼
┌───────┐ ┌───────┐ ┌───────┐
│Agent 1│ │Agent 2│ │Agent 3│
│Sandbox│ │Sandbox│ │Sandbox│
└───────┘ └───────┘ └───────┘
```

**Pros**: Full control, easy inter-sandbox coordination
**Cons**: Local machine as bottleneck

### Option B: Orchestrator IN Daytona → child processes

```
┌─────────────────────────┐
│    Daytona Sandbox      │
│  ┌───────────────────┐  │
│  │   Orchestrator    │  │
│  └────────┬──────────┘  │
│           │ spawns      │
│     ┌─────┴─────┐       │
│     ▼           ▼       │
│  ┌──────┐  ┌──────┐     │
│  │Proc 1│  │Proc 2│     │
│  └──────┘  └──────┘     │
└─────────────────────────┘
```

**Pros**: Fully containerized
**Cons**: Limited - can't spawn sibling sandboxes

### Option C: Orchestrator IN Daytona → callbacks to spawn siblings

```
┌───────────────────┐     ┌───────────────┐
│  Daytona Sandbox  │     │ Local/API     │
│  (Orchestrator)   │────▶│ (Spawner)     │
└───────────────────┘     └───────┬───────┘
                                  │ spawns
                            ┌─────┴─────┐
                            ▼           ▼
                        ┌───────┐   ┌───────┐
                        │Agent 1│   │Agent 2│
                        │Sandbox│   │Sandbox│
                        └───────┘   └───────┘
```

**Pros**: Best of both worlds
**Cons**: Complex, needs callback mechanism

---

## Ralph Loop Pattern

### Concept

Named after the "Ralph Wiggum loop" - a bash loop that spins up
Claude Code instances and iterates until the task is done.

### Core Loop Structure

```typescript
while (!acceptance_criteria_met(result)) {
	result = await agent.run(task, context);
	iteration++;

	if (iteration >= max_iterations) break;
	if (budget_exhausted()) break;
}
```

### To Research

- [ ] Acceptance criteria file format (ralph.json schema?)
- [ ] How to evaluate "task done" programmatically
- [ ] Backpressure handling: pause/retry on rate limits
- [ ] Exit conditions: success, max iterations, budget exhausted
- [ ] State persistence between iterations

---

## Gas Town Pattern

### Concept

Orchestration and resource management layer. "Gas" represents the
compute/API budget available to agents.

### Resource Types to Track

- API calls (count)
- Tokens consumed (input + output)
- Sandbox compute time
- File operations
- Network requests

### Budget Model

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

### To Research

- [ ] Token counting from Claude API responses
- [ ] Cost calculation per model
- [ ] Budget allocation strategies (per task? per agent?)
- [ ] Graceful degradation when budget exhausted
- [ ] Cost reporting and observability

---

## Open Questions

1. Can orchestrator itself run entirely in Daytona?
2. How to share state between sibling sandboxes efficiently?
3. What's the ralph.json acceptance criteria schema?
4. How to handle long-running tasks vs sandbox timeouts?
5. Token/cost tracking granularity - per message? per task?
6. How does the original Ralph Wiggum loop work exactly?
7. What existing multi-agent patterns can we learn from?

---

## Skills Planning

Skills encode **proven patterns** for future Claude sessions. Create
skills only after patterns are validated through testing.

### Current Skills

| Skill         | Location                       | Status                    |
| ------------- | ------------------------------ | ------------------------- |
| `daytona-sdk` | `.claude/skills/daytona-sdk/`  | Exists - basic SDK gotchas |

### Planned Skills

| Skill                   | Purpose                                    | When to Create               |
| ----------------------- | ------------------------------------------ | ---------------------------- |
| `daytona-sdk` (expand)  | Orchestration patterns (snapshots, etc.)   | After testing orchestration  |
| `ralph-loop`            | Acceptance criteria loop, exit conditions  | After nailing criteria format |
| `agent-orchestration`   | Multi-agent coordination, state sharing    | If reusable patterns emerge  |
| `gas-town`              | Resource tracking, budget enforcement      | After budget model validated |

### Skill Creation Criteria

Create a skill when:

- Pattern is **tested and working**
- Knowledge will be **reused across sessions**
- Instructions are **procedural, not conceptual**

---

## Testing & Provable Results

Decision makers need concrete evidence. This section defines tests
and the metrics to capture.

### Test 1: Basic Orchestration (Proof of Concept)

**Goal**: Orchestrator spawns 1 agent, agent completes task, reports
back.

**Task**: "Create hello.txt with 'Hello World'"

**Success criteria**:

- [ ] Sandbox created successfully
- [ ] Agent executes task
- [ ] Result returned to orchestrator
- [ ] Sandbox cleaned up

**Metrics**:

- Time to sandbox creation
- Time to task completion
- Total API calls
- Tokens consumed

### Test 2: Ralph Loop (Iteration)

**Goal**: Agent iterates until acceptance criteria met.

**Task**: "Create a function that passes these tests: [test cases]"

**Success criteria**:

- [ ] Loop detects incomplete work
- [ ] Agent iterates (max 5 iterations)
- [ ] Tests pass OR max iterations reached
- [ ] Iteration count logged

**Metrics**:

- Iterations needed
- Tokens per iteration
- Total cost
- Success rate

### Test 3: Multi-Agent (Parallel)

**Goal**: Orchestrator spawns 2+ agents on related tasks.

**Task**: Agent A builds API, Agent B builds tests for that API.

**Success criteria**:

- [ ] Both sandboxes created
- [ ] Agents share state (volume or file exchange)
- [ ] Work is coordinated (B waits for A)
- [ ] Combined result is coherent

**Metrics**:

- Parallel speedup vs sequential
- Coordination overhead
- Resource usage per agent

### Test 4: Gas Town (Budget Enforcement)

**Goal**: Agent stops gracefully when budget exhausted.

**Setup**: Low token budget, complex task.

**Success criteria**:

- [ ] Token usage tracked accurately
- [ ] Agent warned as budget approaches limit
- [ ] Agent stops before exceeding budget
- [ ] Partial work preserved

**Metrics**:

- Budget accuracy (predicted vs actual)
- Graceful degradation behavior

### Results Template for Decision Makers

```markdown
## Proof of Concept Results

### Executive Summary

[1-2 sentences: Did it work? Is it viable?]

### Test Results

| Test   | Status | Iterations | Tokens | Cost  | Time |
| ------ | ------ | ---------- | ------ | ----- | ---- |
| Basic  | ✅     | 1          | 2,340  | $0.02 | 45s  |
| Loop   | ✅     | 3          | 8,120  | $0.08 | 2m   |
| Multi  | ⚠️     | -          | 12,400 | $0.12 | 3m   |
| Budget | ✅     | 2          | 5,000  | $0.05 | 1m   |

### Key Findings

- [Finding 1]
- [Finding 2]

### Recommendation

[Go/No-Go with reasoning]
```

### Next Steps

1. Run Test 1 (Basic Orchestration) with current codebase
2. Capture metrics programmatically
3. Document results
4. Iterate based on findings

---

## References

### External

- [Claude Agent SDK TS](https://github.com/anthropics/claude-agent-sdk-typescript)
- [Daytona SDK](https://github.com/daytonaio/daytona) (monorepo)
- [Multi-Agent Orchestration Article](https://dev.to/bredmond1019/multi-agent-orchestration-running-10-claude-instances-in-parallel-part-3-29da)

### Internal

- `src/index.ts` - Current two-agent implementation
- `src/sandbox-agent.ts` - Developer agent running in sandbox
