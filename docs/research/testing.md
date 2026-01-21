# Testing & Provable Results

Test scenarios and metrics for decision makers.

---

## Why This Matters

Decision makers need concrete evidence:

- Does it work?
- What does it cost?
- How does it compare to alternatives?

---

## Test 1: Basic Orchestration (Proof of Concept)

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

---

## Test 2: Ralph Loop (Iteration)

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

---

## Test 3: Multi-Agent (Parallel)

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

---

## Test 4: Gas Town (Budget Enforcement)

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

---

## Results Template for Decision Makers

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

---

## Next Steps

1. Run Test 1 (Basic Orchestration) with current codebase
2. Capture metrics programmatically
3. Document results
4. Iterate based on findings
