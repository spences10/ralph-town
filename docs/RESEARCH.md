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
- **No parallel branches** - Cannot work on multiple features
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

### 5. executeCommand Limitation on Snapshots

**Critical finding**: `executeCommand()` returns -1 on snapshot-based
sandboxes. This is a known upstream issue.

| Type | Creation | executeCommand |
|------|----------|----------------|
| Default | ~500ms | Works |
| Snapshot | ~1.8s | Broken (-1) |

**Recommended approach**: Use default sandbox + runtime tool install
instead of snapshots when executeCommand is needed. SSH works on both.

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
3. **Safety** - Experiments do not touch real code
4. **Disposable** - Failed attempts just get deleted
5. **Full environment** - Not just command execution, real shell

---

## CLI Commands

### Core Sandbox Commands

```bash
# Create a sandbox
ralph-town sandbox create [--name NAME] [--snapshot NAME] [--env KEY=VALUE]

# Get SSH credentials
ralph-town sandbox ssh <id> [--expires MINUTES]

# List active sandboxes
ralph-town sandbox list [--json]

# Execute command in sandbox
ralph-town sandbox exec <id> <command>

# Delete sandbox
ralph-town sandbox delete <id>
```

### Preflight Command

Verify snapshot has required tools before spawning teammates.

```bash
# Check default snapshot (ralph-town-dev)
ralph-town sandbox preflight

# Check specific snapshot
ralph-town sandbox preflight --snapshot my-snapshot

# JSON output for scripts
ralph-town sandbox preflight --json
```

**Flags:**
- `--snapshot <name>` - Snapshot to test (default: ralph-town-dev)
- `--json` - Output as JSON

**Tools checked:**
- `/usr/bin/gh` - GitHub CLI
- `/usr/bin/git` - Git
- `/root/.bun/bin/bun` - Bun runtime
- `/usr/bin/curl` - curl

**How it works:**
1. Creates a temporary sandbox from the snapshot
2. Gets SSH credentials
3. Checks each tool exists via SSH (`/bin/test -x <path>`)
4. Deletes the temporary sandbox
5. Reports pass/fail

**Use case:** Run before spawning teammates to catch snapshot issues
early. If preflight fails, rebuild snapshot with `sandbox snapshot create --force`.

### Snapshot Commands

Create pre-baked snapshots with all required tools.

```bash
# Create default snapshot (ralph-town-dev)
ralph-town sandbox snapshot create

# Create with custom name
ralph-town sandbox snapshot create --name my-snapshot

# Force recreate existing snapshot
ralph-town sandbox snapshot create --force

# JSON output
ralph-town sandbox snapshot create --json
```

**Flags:**
- `--name <name>` - Snapshot name (default: ralph-town-dev)
- `--force` - Delete existing snapshot and recreate
- `--json` - Output as JSON

**What the snapshot includes:**
- Base image: `debian:bookworm-slim`
- System packages: git, curl, ca-certificates
- GitHub CLI: gh (for PR creation)
- Bun runtime: /root/.bun/bin/bun
- Pre-installed: @anthropic-ai/claude-agent-sdk
- Working directory: /home/daytona
- PATH fixes: /etc/environment, /etc/profile.d/, ~/.bashrc

**Build time:** ~2-3 minutes

**When to rebuild:**
- After changing tool requirements
- If preflight fails
- To update SDK version

---

## Credential Workflow for Teammates

Teammates in sandboxes need credentials to push code and create PRs.
Here is how to set it up.

### Passing Credentials at Sandbox Creation

Use `--env` to inject environment variables:

```bash
# Pass GH_TOKEN for git push/PR workflow
ralph-town sandbox create \
  --snapshot ralph-town-dev \
  --env "GH_TOKEN=$GH_TOKEN"
```

The token is then available inside the sandbox as `$GH_TOKEN`.

### Teammate Git Workflow (Secure)

Inside the sandbox, teammates use the credential helper to avoid
leaking tokens in URLs, logs, or process lists:

```bash
# Setup credential helper (one-time)
git config --global credential.helper store
echo "https://oauth2:$GH_TOKEN@github.com" > ~/.git-credentials

# Clone WITHOUT token in URL (credentials auto-applied)
git clone https://github.com/user/repo.git

# Push works without prompts
git push -u origin feature-branch
```

**Why not embed token in URL?**
Tokens in URLs like `git clone https://$TOKEN@github.com/...` leak via:
- Process list (`ps aux` shows full command line)
- Shell history
- Error messages and logs
- Debug output

The credential helper keeps the token in a protected file instead.

### Creating PRs from Sandbox

The snapshot includes `gh` CLI. Authenticate and create PRs:

```bash
# Auth with token
echo $GH_TOKEN | gh auth login --with-token

# Create PR
gh pr create --title "Feature X" --body "Description"
```

### Security Considerations

1. **Never bake tokens into snapshots** - Pass at runtime via `--env`
2. **Use credential helper** - Never embed tokens in git URLs
3. **Tokens visible in sandbox** - Only pass what teammates need
4. **Use scoped tokens** - Minimum permissions (repo access only)
5. **Sandboxes are ephemeral** - Tokens gone when sandbox deleted

### Known Issues & Workarounds

| Issue | Workaround |
|-------|------------|
| `sandbox exec` returns -1 on snapshot sandboxes | Use SSH instead |
| SSH PATH broken (commands not found) | Use full paths: `/usr/bin/git` |
| Preflight fails | Rebuild snapshot with `--force` |

### Future Improvements

- **#39**: `sandbox env set <id> KEY=VALUE` for running sandboxes

---

## Workflow Example

```bash
# 1. Verify snapshot is ready
ralph-town sandbox preflight
# => Preflight passed!

# 2. Team lead creates sandbox for teammate
ralph-town sandbox create --snapshot ralph-town-dev --env "GH_TOKEN=$GH_TOKEN"
# => Sandbox ID: abc123

# 3. Get SSH access
ralph-town sandbox ssh abc123
# => ssh xyz789@ssh.app.daytona.io

# 4. Teammate SSHs in and works
ssh xyz789@ssh.app.daytona.io
> # Setup credentials (secure)
> git config --global credential.helper store
> echo "https://oauth2:$GH_TOKEN@github.com" > ~/.git-credentials
> git clone https://github.com/user/repo.git
> cd repo
> git checkout -b feature/new-thing
> # ... make changes ...
> git commit -m "Add new feature"
> git push -u origin feature/new-thing
> gh pr create --title "Add feature" --body "Details"

# 5. Cleanup when done
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
- `sandbox_preflight` - Verify snapshot has required tools

---

## Sandbox Resources

Default sandbox specs:

- **CPU**: 1 core
- **Memory**: 1 GB
- **Disk**: 3 GB
- **Auto-stop**: 15 minutes idle
- **Auto-archive**: 7 days

---

## Upstream Issues

Daytona issues affecting this project:

- [#2283](https://github.com/daytonaio/daytona/issues/2283) -
  executeCommand returns -1 on snapshot sandboxes
- [#2535](https://github.com/daytonaio/daytona/issues/2535) -
  Snapshot DX improvements

---

## References

### External
- [Daytona SDK](https://github.com/daytonaio/daytona)
- [Daytona Docs](https://www.daytona.io/docs)

### Internal
- `packages/cli/src/sandbox/` - Sandbox module
- `packages/cli/src/commands/sandbox/` - CLI commands
- `packages/cli/src/commands/sandbox/preflight.ts` - Preflight command
- `packages/cli/src/commands/sandbox/snapshot/` - Snapshot commands
- `packages/mcp-ralph-town/src/tools/sandbox.ts` - MCP tools
