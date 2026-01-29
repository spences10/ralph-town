# ralph-town

CLI for Daytona sandbox orchestration with Claude Code teams.

## Install

```bash
npm install -g ralph-town
# or
npx ralph-town
```

## Features

- Create and manage Daytona sandboxes
- SSH access to sandboxes
- File upload/download
- Git workflow integration

## Packages

| Package                | Description          |
| ---------------------- | -------------------- |
| `packages/cli`         | Main CLI             |
| `packages/mcp-*`       | MCP server (WIP)     |

## Runtimes

| Runtime        | Description            | Requirements         |
| -------------- | ---------------------- | -------------------- |
| `daytona`      | Cloud sandbox          | `DAYTONA_API_KEY`    |
| `local`        | Direct shell execution | None                 |
| `devcontainer` | Docker container       | Running devcontainer |

## Environment Variables

| Variable          | Required        | Description     |
| ----------------- | --------------- | --------------- |
| `DAYTONA_API_KEY` | runtime=daytona | Daytona API key |
| `GITHUB_PAT`      | git workflow    | GitHub token    |

## Development

```bash
bun dev          # Development mode
bun run build    # Compile TypeScript
bun start        # Build + run compiled
```

## Research

See `docs/RESEARCH.md` for architecture notes.
