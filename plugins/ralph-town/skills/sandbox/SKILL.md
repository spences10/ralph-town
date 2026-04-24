---
name: sandbox
description:
  Manage Daytona sandboxes for isolated evals, smoke tests, and
  command execution.
---

# Sandbox Skill

Manage Daytona sandboxes for isolated command execution.

## Preferred One-Shot Command

```bash
ralph-town run --json -- pnpx my-pi@latest --help
ralph-town run --repo https://github.com/owner/repo -- pnpm test
```

## Reusable Sandbox Commands

### Create Sandbox

```bash
ralph-town sandbox create --name <name>
```

### List Sandboxes

```bash
ralph-town sandbox list
```

### Get SSH Access

```bash
ralph-town sandbox ssh <id>
```

### Execute Command In Existing Sandbox

```bash
ralph-town sandbox exec <id> <command>
```

### Delete Sandbox

```bash
ralph-town sandbox delete <id>
```

## SSH Tips

PATH can be limited in SSH sessions. Use full paths when commands are
not found:

```bash
ssh <token>@ssh.app.daytona.io "export PATH=/usr/bin:/bin:/usr/local/bin:\$PATH && <command>"
```

## Known Issues

| Issue              | Workaround                                                                                          |
| ------------------ | --------------------------------------------------------------------------------------------------- |
| `exec` returns -1  | Use SSH-backed `ralph-town run` ([upstream#2283](https://github.com/daytonaio/daytona/issues/2283)) |
| PATH broken in SSH | Use full paths                                                                                      |
