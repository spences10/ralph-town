# Ralph-Town Research

Research index for the Ralph Loop + Gas Town orchestration patterns.

---

## Project Vision

**Goal**: Use Daytona containers to run an orchestrator that spawns
child agents, iterating until acceptance criteria are met (Ralph Loop)
with resource budgeting (Gas Town).

**Target users**: Development team working on epics/tickets who want
autonomous agent assistance.

---

## Validation Status

**Core loop validated!** The basic Ralph Loop works:

```
ralph.json → Orchestrator → Daytona Sandbox → Agent → Criteria Check → Success
```

See `ralph-town run` to execute.

---

## Research Areas

| Area                 | Doc                                                         | Status        |
| -------------------- | ----------------------------------------------------------- | ------------- |
| Architecture         | [architecture.md](research/architecture.md)                 | **Validated** |
| Daytona SDK          | [daytona-sdk.md](research/daytona-sdk.md)                   | **Validated** |
| Cost Projections     | [cost-projections.md](research/cost-projections.md)         | **Validated** |
| Claude Agent SDK     | [claude-agent-sdk.md](research/claude-agent-sdk.md)         | In progress   |
| Ralph Loop           | [ralph-loop.md](research/ralph-loop.md)                     | **Validated** |
| Gas Town             | [gas-town.md](research/gas-town.md)                         | In progress   |
| Developer Experience | [developer-experience.md](research/developer-experience.md) | In progress   |
| Testing              | [testing.md](research/testing.md)                           | In progress   |
| Telemetry            | [telemetry.md](research/telemetry.md)                       | In progress   |
| Git Workflow         | [git-workflow.md](research/git-workflow.md)                 | In progress   |
| Skills Planning      | [skills-planning.md](research/skills-planning.md)           | In progress   |
| Runtime Abstraction  | [runtime-abstraction.md](research/runtime-abstraction.md)   | Design draft  |

---

## Answered Questions

1. **Can orchestrator run entirely in Daytona?** Not on preview tier.
   Option A (local orchestrator) works now. Option B possible on Tier
   3+.

2. **What's the ralph.json acceptance criteria schema?** Validated:
   `file_exists` and `command_succeeds` types work. See
   `src/types.ts`.

3. **How to handle long-running tasks vs sandbox timeouts?** 120s
   timeout per command execution. Configurable.

4. **Does Claude Agent SDK require special API access?** No. Standard
   `ANTHROPIC_API_KEY` works. Also supports Bedrock/Vertex/Foundry.

---

## Open Questions

1. How to share state between sibling sandboxes efficiently?
2. Token/cost tracking granularity - per message? per task?
3. ~~How does the original Ralph Wiggum loop work exactly?~~
   **Answered** - see `docs/ralph-pocock/`
4. What existing multi-agent patterns can we learn from?
5. MCP server vs other interface options?
6. Credential management for team usage?
7. Runtime abstraction: clone fresh or assume pre-cloned for local?
8. Worktree cleanup strategy after parallel runs?
9. Test Ralph-style prompting with devcontainer and local runtimes

---

## Snapshot Support (Tier 3+)

**Snapshots now working!** Pre-built images enable instant sandbox
creation with tools pre-installed.

### Current Setup

- Snapshot `ralph-town-dev` has Bun + Claude Agent SDK
- Create with: `bun src/create-snapshot.ts`
- Sandboxes spin up in ~3s instead of ~30s

### How Snapshots Work

Daytona snapshots are pre-built images (like Dockerfiles), NOT live VM
checkpoints. You define the image declaratively, Daytona builds it
once, then spawns sandboxes from it instantly.

```typescript
// Create sandbox from snapshot
const sandbox = await daytona.create({
	snapshot: 'ralph-town-dev',
	language: 'typescript',
});
```

See `.claude/skills/daytona-sdk/SKILL.md` for full API details.

---

## Ralph-Style Agent Prompting

**Validated approach** for getting agents to make actual changes:

### Problem

Initial agent prompts were too minimal. Haiku agents would:

- Skip exploration, dive straight into coding
- Not run feedback loops (build/typecheck)
- Leave code in broken state
- Not report progress

### Solution: Structured Prompt

Agent system prompt now follows Ralph methodology:

1. **EXPLORATION** - Explore codebase before coding
   - `ls -la`, read package.json, find config files
   - Understand existing patterns first

2. **EXECUTION** - Make smallest possible change
   - One task per execution
   - If task too big, break it down

3. **FEEDBACK LOOPS** - Mandatory before finishing
   - Run `pnpm run build` / `pnpm run check`
   - Fix any errors before declaring done

4. **PROGRESS REPORT** - Structured output
   ```
   DONE: [what completed]
   FILES: [files changed]
   VERIFIED: [feedback commands passed]
   NEXT: [remaining work]
   BLOCKERS: [issues]
   ```

### Progress Tracking

- `progress.txt` created in working directory
- Appended after each iteration
- Passed to agent as context for continuity
- Included in PRs for visibility

### Task Format

Enhanced task prompt includes:

- Task description + steps
- Backpressure command to pass
- Feedback commands to run
- Previous failure context
- Recent progress history

See `packages/cli/src/core/sandbox-agent.ts` and
`packages/cli/src/core/orchestrator.ts`.

---

## TODO: Test Other Runtimes

The Ralph-style prompting works with Daytona. Need to validate:

- [ ] **devcontainer** runtime - Does progress.txt work?
- [ ] **local** runtime - Git worktree + progress tracking?
- [ ] Performance comparison across runtimes
- [ ] Snapshot equivalent for devcontainer?

---

## References

### External

- [Claude Agent SDK TS](https://github.com/anthropics/claude-agent-sdk-typescript)
- [Daytona SDK](https://github.com/daytonaio/daytona) (monorepo)
- [Daytona Docs](https://www.daytona.io/docs)

### Internal

- `packages/cli/src/core/orchestrator.ts` - Main Ralph Loop
  implementation
- `packages/cli/src/core/sandbox-agent.ts` - Developer agent running
  in sandbox
- `packages/cli/src/core/types.ts` - Type definitions for ralph.json
