# Daytona Sandbox Research

Research notes and findings from exploring Daytona SDK integration
for Claude Code teams.

---

## Problem Statement

When Claude Code spawns teammates (via the Task tool), all agents
share the same filesystem. This creates problems:

- **Collisions** - Two agents editing the same file conflict
- **No isolation** - One agent's changes affect others
- **Risk** - Experimental code runs on user's actual codebase
- **No parallel branches** - Can't work on multiple features
  simultaneously

**Solution**: Give each teammate their own Daytona sandbox.

---

## Key Findings

### 1. Sandbox Creation Times

Tested with pre-baked Node.js image:

| Sandbox | Time | Notes |
|---------|------|-------|
| First | ~18s | Builds/caches image |
| Second | **~1.3s** | Uses cached image |
| Third | **~1.3s** | Cached |

**Conclusion**: 14x speedup after first run. Cached sandboxes are fast
enough for practical use.

### 2. SSH Access Works

Daytona provides token-based SSH access:

```typescript
const ssh_access = await sandbox.createSshAccess(60); // 60 min expiry
// Returns: { token, command, expires_at }
// Connect with: ssh <token>@ssh.app.daytona.io
```

**Tested and verified** - Full shell access, can run any command.

### 3. Pre-baked Images

Default image includes:
- `node:22-slim` base
- `git`, `curl` installed
- `typescript`, `tsx` globally installed

Custom images can add more tools via dockerfile commands.

### 4. SDK Capabilities

The `@daytonaio/sdk` provides:

- `sandbox.process.executeCommand()` - Run commands
- `sandbox.fs.uploadFile()` / `downloadFile()` - File operations
- `sandbox.git.*` - Clone, branch, commit, push
- `sandbox.createSshAccess()` - Get SSH credentials
- `sandbox.delete()` - Cleanup

---

## Architecture

### Claude Code Team + Daytona Sandboxes

```
Claude Code Team Lead (local)
├── Creates sandbox (1.3s with cached image)
├── Gets SSH credentials
│
├── Teammate A ──SSH──> Sandbox A ──> feature-branch-a
├── Teammate B ──SSH──> Sandbox B ──> feature-branch-b
└── Teammate C ──SSH──> Sandbox C ──> feature-branch-c

Each teammate works in complete isolation.
Push branches, create PRs when done.
Delete sandboxes to clean up.
```

### Why This Architecture?

1. **Isolation** - Each sandbox is independent
2. **Parallel work** - Multiple features simultaneously
3. **Safety** - Experiments don't touch real code
4. **Disposable** - Failed attempts just get deleted
5. **Full environment** - Not just command execution, real shell

---

## CLI Commands

```bash
# Create a sandbox
ralph-town sandbox create [--name NAME]

# Get SSH credentials
ralph-town sandbox ssh <id> [--expires MINUTES]

# List active sandboxes
ralph-town sandbox list [--json]

# Execute command in sandbox
ralph-town sandbox exec <id> <command>

# Delete sandbox
ralph-town sandbox delete <id>
```

---

## Workflow Example

```bash
# Team lead creates sandbox for teammate
ralph-town sandbox create --name feature-work
# => Sandbox ID: abc123

# Get SSH access
ralph-town sandbox ssh abc123
# => ssh xyz789@ssh.app.daytona.io

# Teammate SSHs in and works
ssh xyz789@ssh.app.daytona.io
> git clone https://github.com/user/repo.git
> cd repo
> git checkout -b feature/new-thing
> # ... make changes ...
> git commit -m "Add new feature"
> git push -u origin feature/new-thing

# Cleanup when done
ralph-town sandbox delete abc123
```

---

## MCP Tools

The MCP server exposes these tools for Claude Code:

- `sandbox_create` - Create sandbox, returns ID
- `sandbox_ssh` - Get SSH credentials
- `sandbox_list` - List active sandboxes
- `sandbox_exec` - Run command in sandbox
- `sandbox_delete` - Delete sandbox

---

## Sandbox Resources

Default sandbox specs (Daytona tier dependent):

- **CPU**: 1 core
- **Memory**: 1 GB
- **Disk**: 3 GB
- **Auto-stop**: 15 minutes idle
- **Auto-archive**: 7 days

---

## References

### External
- [Daytona SDK](https://github.com/daytonaio/daytona)
- [Daytona Docs](https://www.daytona.io/docs)

### Internal
- `packages/cli/src/sandbox/` - Sandbox module
- `packages/cli/src/commands/sandbox/` - CLI commands
- `packages/mcp-ralph-town/src/tools/sandbox.ts` - MCP tools
