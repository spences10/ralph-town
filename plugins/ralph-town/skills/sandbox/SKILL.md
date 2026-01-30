---
name: sandbox
description: Manage Daytona sandboxes for isolated teammate environments
---

# Sandbox Skill

Manage Daytona sandboxes for isolated teammate environments.

## Commands

### Create Sandbox
```bash
ralph-town sandbox create --name <name> --env "GH_TOKEN=..."
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

1. Create sandbox with GH_TOKEN
2. Install gh CLI: `apt-get update && apt-get install -y gh`
3. Teammate clones repo inside sandbox
4. Teammate makes changes, commits, pushes
5. Teammate creates PR via gh CLI
6. Delete sandbox when done

## SSH Tips

PATH is broken in SSH sessions. Use full paths:
```bash
ssh <token>@ssh.app.daytona.io "export PATH=/usr/bin:/bin:/root/.bun/bin:\$PATH && <command>"
```

Or prefix commands with `/usr/bin/` or `/bin/`.

## Known Issues

| Issue | Workaround |
|-------|------------|
| `exec` returns -1 | Use SSH instead ([upstream#2283](https://github.com/daytonaio/daytona/issues/2283)) |
| `gh` not installed | `apt-get install -y gh` in sandbox |
| PATH broken in SSH | Use full paths |

