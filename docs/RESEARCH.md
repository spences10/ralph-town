# Ralph-GAS Research

Research index for the Ralph Loop + Gas Town orchestration patterns.

---

## Project Vision

**Goal**: Use Daytona containers to run an orchestrator that spawns
child agents, iterating until acceptance criteria are met (Ralph
Loop) with resource budgeting (Gas Town).

**Target users**: Development team working on epics/tickets who want
autonomous agent assistance.

---

## Validation Status

**Core loop validated!** The basic Ralph Loop works:

```
ralph.json → Orchestrator → Daytona Sandbox → Agent → Criteria Check → Success
```

See `bun ralph` to run.

---

## Research Areas

| Area                 | Doc                                                         | Status       |
| -------------------- | ----------------------------------------------------------- | ------------ |
| Architecture         | [architecture.md](research/architecture.md)                 | **Validated** |
| Daytona SDK          | [daytona-sdk.md](research/daytona-sdk.md)                   | **Validated** |
| Cost Projections     | [cost-projections.md](research/cost-projections.md)         | **Validated** |
| Claude Agent SDK     | [claude-agent-sdk.md](research/claude-agent-sdk.md)         | In progress  |
| Ralph Loop           | [ralph-loop.md](research/ralph-loop.md)                     | **Validated** |
| Gas Town             | [gas-town.md](research/gas-town.md)                         | In progress  |
| Developer Experience | [developer-experience.md](research/developer-experience.md) | In progress  |
| Testing              | [testing.md](research/testing.md)                           | In progress  |
| Telemetry            | [telemetry.md](research/telemetry.md)                       | In progress  |
| Git Workflow         | [git-workflow.md](research/git-workflow.md)                 | In progress  |
| Skills Planning      | [skills-planning.md](research/skills-planning.md)           | In progress  |

---

## Answered Questions

1. **Can orchestrator run entirely in Daytona?**
   Not on preview tier. Option A (local orchestrator) works now.
   Option B possible on Tier 3+.

2. **What's the ralph.json acceptance criteria schema?**
   Validated: `file_exists` and `command_succeeds` types work.
   See `src/types.ts`.

3. **How to handle long-running tasks vs sandbox timeouts?**
   120s timeout per command execution. Configurable.

---

## Open Questions

1. How to share state between sibling sandboxes efficiently?
2. Token/cost tracking granularity - per message? per task?
3. How does the original Ralph Wiggum loop work exactly?
4. What existing multi-agent patterns can we learn from?
5. MCP server vs other interface options?
6. Credential management for team usage?

---

## Tier Constraints (Preview)

Currently on Daytona preview tier with restrictions:

- Internet: Restricted (npm allowed, bun.sh blocked)
- Snapshots: Cannot create custom snapshots
- Memory: 10-20 GiB total limit
- Workaround: Use npm instead of bun, accept ~10s install overhead

See [daytona-sdk.md](research/daytona-sdk.md) for details.

---

## References

### External

- [Claude Agent SDK TS](https://github.com/anthropics/claude-agent-sdk-typescript)
- [Daytona SDK](https://github.com/daytonaio/daytona) (monorepo)
- [Daytona Docs](https://www.daytona.io/docs)

### Internal

- `src/orchestrator.ts` - Main Ralph Loop implementation
- `src/sandbox-agent.ts` - Developer agent running in sandbox
- `src/types.ts` - Type definitions for ralph.json
- `ralph.json` - Example task configuration
