# Ralph-Town Research

Research notes for Daytona sandbox orchestration.

---

## Project Vision

**Goal**: Use Daytona containers for sandboxed agent execution with
Claude Code teams.

**Target users**: Development teams wanting isolated sandbox
environments for autonomous agents.

---

## Daytona Integration

### Snapshot Support (Tier 3+)

**Snapshots working!** Pre-built images enable instant sandbox
creation with tools pre-installed.

#### Current Setup

- Snapshot `ralph-town-dev` has Bun + Claude Agent SDK
- Create with: `bun src/core/create-snapshot.ts`
- Sandboxes spin up in ~3s instead of ~30s

#### How Snapshots Work

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

---

## References

### External

- [Claude Agent SDK TS](https://github.com/anthropics/claude-agent-sdk-typescript)
- [Daytona SDK](https://github.com/daytonaio/daytona) (monorepo)
- [Daytona Docs](https://www.daytona.io/docs)

### Internal

- `packages/cli/src/sandbox/` - Sandbox module with SSH support
- `packages/cli/src/core/runtime/` - Runtime abstractions
- `packages/cli/src/core/git-workflow.ts` - Git operations
