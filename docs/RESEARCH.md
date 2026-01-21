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

## Research Areas

| Area                  | Doc                                                      | Status      |
| --------------------- | -------------------------------------------------------- | ----------- |
| Architecture          | [architecture.md](research/architecture.md)              | In progress |
| Daytona SDK           | [daytona-sdk.md](research/daytona-sdk.md)                | In progress |
| Claude Agent SDK      | [claude-agent-sdk.md](research/claude-agent-sdk.md)      | In progress |
| Ralph Loop            | [ralph-loop.md](research/ralph-loop.md)                  | In progress |
| Gas Town              | [gas-town.md](research/gas-town.md)                      | In progress |
| Developer Experience  | [developer-experience.md](research/developer-experience.md) | In progress |
| Testing               | [testing.md](research/testing.md)                        | In progress |
| Telemetry             | [telemetry.md](research/telemetry.md)                    | In progress |
| Skills Planning       | [skills-planning.md](research/skills-planning.md)        | In progress |

---

## Open Questions

1. Can orchestrator itself run entirely in Daytona?
2. How to share state between sibling sandboxes efficiently?
3. What's the ralph.json acceptance criteria schema?
4. How to handle long-running tasks vs sandbox timeouts?
5. Token/cost tracking granularity - per message? per task?
6. How does the original Ralph Wiggum loop work exactly?
7. What existing multi-agent patterns can we learn from?
8. MCP server vs other interface options?
9. Credential management for team usage?

---

## References

### External

- [Claude Agent SDK TS](https://github.com/anthropics/claude-agent-sdk-typescript)
- [Daytona SDK](https://github.com/daytonaio/daytona) (monorepo)
- [Multi-Agent Orchestration Article](https://dev.to/bredmond1019/multi-agent-orchestration-running-10-claude-instances-in-parallel-part-3-29da)

### Internal

- `src/index.ts` - Current two-agent implementation
- `src/sandbox-agent.ts` - Developer agent running in sandbox
