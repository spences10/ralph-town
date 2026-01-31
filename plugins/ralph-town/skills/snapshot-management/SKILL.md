---
name: snapshot-management
# prettier-ignore
description: Ralph-town snapshot commands. Use for preflight checks and snapshot creation before spawning teammates.
---

# Snapshot Management

## Quick Reference

**Verify snapshot ready:** `ralph-town sandbox preflight`
**Create snapshot:** `ralph-town sandbox snapshot create`

## sandbox preflight

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

**What it checks:**
- `/usr/bin/gh` - GitHub CLI
- `/usr/bin/git` - Git
- `/root/.bun/bin/bun` - Bun runtime
- `/usr/bin/curl` - curl

## sandbox snapshot create

Create a pre-baked snapshot with all required tools.

```bash
# Create default snapshot
ralph-town sandbox snapshot create

# Create with custom name
ralph-town sandbox snapshot create --name my-snapshot

# Force recreate existing
ralph-town sandbox snapshot create --force

# JSON output
ralph-town sandbox snapshot create --json
```

**Flags:**
- `--name <name>` - Snapshot name (default: ralph-town-dev)
- `--force` - Delete existing snapshot and recreate
- `--json` - Output as JSON

**What snapshot includes:**
- Base image: `debian:bookworm-slim`
- Tools: git, curl, gh CLI, bun
- SDK: @anthropic-ai/claude-agent-sdk
- Working dir: /home/daytona

**Build time:** ~2-3 minutes

## When to Use

- Run `preflight` before spawning teammates
- Run `snapshot create` if preflight fails
- Use `--force` to rebuild after tool updates

## SDK Usage

```typescript
import { Daytona, Image } from '@daytonaio/sdk';

const daytona = new Daytona();

// Create snapshot
const image = Image.base('debian:bookworm-slim')
  .runCommands(
    'apt-get update && apt-get install -y curl git',
    'curl -fsSL https://bun.sh/install | bash',
  )
  .env({ PATH: '/root/.bun/bin:$PATH' })
  .workdir('/home/daytona');

await daytona.snapshot.create(
  { name: 'my-snapshot', image },
  { onLogs: console.log, timeout: 300 },
);

// List/check snapshots
const snapshots = await daytona.snapshot.list();
const snapshot = await daytona.snapshot.get('ralph-town-dev');
```

## Known Limitation

`executeCommand()` returns exit code `-1` on snapshot sandboxes.
Use SSH instead. See [daytonaio/daytona#2283](https://github.com/daytonaio/daytona/issues/2283)
