# Architecture Options

How the orchestrator relates to Daytona sandboxes.

---

## Validated: Option A - Local Orchestrator

```
┌─────────────────┐
│  Local Machine  │
│  (Orchestrator) │
│  bun ralph      │
└────────┬────────┘
         │ creates sandbox
         ▼
┌─────────────────┐
│ Daytona Sandbox │
│  ┌───────────┐  │
│  │   Agent   │  │
│  │ (tsx/npm) │  │
│  └───────────┘  │
└─────────────────┘
```

**Why this works:**

- Simple to implement and debug
- Full control over the loop from local machine
- Agent runs in isolated sandbox
- No callback complexity

**Current flow:**

1. Local orchestrator reads `ralph.json`
2. Creates Daytona sandbox
3. Uploads agent code
4. Installs deps (npm - works on preview tier)
5. Runs agent with task
6. Checks acceptance criteria
7. Loops until done or max iterations
8. Cleans up sandbox

---

## Future Options (Tier 3+)

### Option B: Orchestrator IN Daytona

When we have higher tier access:

- Run orchestrator itself in Daytona
- Use custom snapshots with pre-installed deps
- Faster iteration (~10s saved per run)
- Could spawn sibling sandboxes via API

### Option C: MCP Server Interface

As described in developer-experience.md:

- Claude Code calls MCP tool
- MCP server runs orchestration
- Results stream back to session

---

## Validated Constraints

| Constraint               | Impact                          |
| ------------------------ | ------------------------------- |
| Preview tier internet    | Must use npm, not bun/curl      |
| No snapshot creation     | ~10s npm install each run       |
| Memory limits (10-20 GB) | Single sandbox at a time        |
| Single agent per sandbox | No parallel agents in one box   |

---

## Decision

**Option A is the validated working approach.** Simple, functional, and
works within preview tier constraints. Can evolve to Option B/C when
resources allow.
