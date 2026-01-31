# ralph-town

Daytona sandbox management for Claude Code teams.

## Why?

When Claude Code spawns teammates, they all share the same filesystem.
This causes problems:

- Two agents editing the same file conflict
- Experimental code runs on your actual codebase
- Can't work on multiple features in parallel

**Solution**: Give each teammate their own isolated Daytona sandbox.

## How It Works

```
Claude Code Team Lead (local)
├── Creates sandbox (~1.3s with cached image)
├── Gets SSH credentials for teammate
│
├── Teammate A ──SSH──> Sandbox A ──> feature-branch-a
├── Teammate B ──SSH──> Sandbox B ──> feature-branch-b
└── Teammate C ──SSH──> Sandbox C ──> feature-branch-c
```

Each teammate works in complete isolation. Push branches, create PRs,
delete sandboxes when done.

## Install

```bash
npm install -g ralph-town
```

## CLI Commands

```bash
# Create a sandbox
ralph-town sandbox create [--name NAME]

# Get SSH credentials
ralph-town sandbox ssh <id>

# List active sandboxes
ralph-town sandbox list

# Execute command in sandbox
ralph-town sandbox exec <id> <command>

# Delete sandbox
ralph-town sandbox delete <id>
```

## Example Workflow

```bash
# Create sandbox for teammate
ralph-town sandbox create --name feature-work
# => Sandbox ID: abc123

# Get SSH access
ralph-town sandbox ssh abc123
# => ssh xyz789@ssh.app.daytona.io

# Teammate SSHs in and works
ssh xyz789@ssh.app.daytona.io
$ git clone https://github.com/user/repo.git
$ cd repo && git checkout -b feature/new-thing
$ # ... make changes ...
$ git push -u origin feature/new-thing

# Cleanup
ralph-town sandbox delete abc123
```

## Performance

| Operation | Time |
|-----------|------|
| First sandbox (builds image) | ~18s |
| Subsequent sandboxes (cached) | ~1.3s |

14x speedup after first run.

## Requirements

- `DAYTONA_API_KEY` - Get from [daytona.io](https://daytona.io)
- `GH_TOKEN` - For git push operations (optional)

## Packages

| Package | Description |
|---------|-------------|
| `packages/cli` | Main CLI tool |
| `packages/mcp-ralph-town` | MCP server for Claude Code |

## Development

```bash
bun dev          # Development mode
bun run build    # Compile TypeScript
```

## Research

See [docs/RESEARCH.md](docs/RESEARCH.md) for architecture notes and
findings from our exploration.
