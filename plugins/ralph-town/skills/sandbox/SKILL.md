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
