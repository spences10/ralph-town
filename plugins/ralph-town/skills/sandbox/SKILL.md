---
name: sandbox
description: Manage Daytona sandboxes for isolated teammate environments
---

# Sandbox Skill

Manage Daytona sandboxes for isolated teammate environments.

## Commands

### Create Sandbox
```bash
ralph-town sandbox create --snapshot ralph-town-dev --name <name> --env "GH_TOKEN=..."
```

### List Sandboxes
```bash
ralph-town sandbox list
```

### Get SSH Access
```bash
ralph-town sandbox ssh <id>
```

### Execute Command
```bash
ralph-town sandbox exec <id> -- <command>
```

### Delete Sandbox
```bash
ralph-town sandbox delete <id>
```

## Teammate Workflow

1. Create sandbox with snapshot and GH_TOKEN
2. Teammate clones repo inside sandbox
3. Teammate makes changes, commits, pushes
4. Teammate creates PR via gh CLI
5. Delete sandbox when done

## SSH Tips

PATH is broken in SSH sessions. Use full paths:
```bash
ssh <token>@ssh.app.daytona.io "export PATH=/usr/bin:/bin:/root/.bun/bin:\$PATH && <command>"
```

Or prefix commands with `/usr/bin/` or `/bin/`.

## Known Issues

| Issue | Workaround |
|-------|------------|
| `exec` returns -1 | Use SSH instead (#31) |
| `gh` not installed | `apt-get install -y gh` in sandbox (#32) |
| PATH broken in SSH | Use full paths (#33) |
| `--name` ignored | Use `--env` for labels (#34) |

## First-Time Setup

Create snapshot once (takes ~3 min):
```bash
bun run packages/cli/src/core/create-snapshot.ts
```

This installs Bun, TypeScript, and Claude Agent SDK.
