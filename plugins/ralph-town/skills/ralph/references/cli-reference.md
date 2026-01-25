# CLI Reference

## Commands

```bash
ralph-town init      # Create ralph.json template
ralph-town validate  # Validate config
ralph-town run       # Execute the loop
ralph-town run --runtime local      # Local shell execution
ralph-town run --runtime daytona    # Daytona cloud sandbox
ralph-town run --dry-run            # Validate without executing
```

## Environment Variables

| Variable            | Required        | Description              |
| ------------------- | --------------- | ------------------------ |
| `ANTHROPIC_API_KEY` | Yes             | Claude API key           |
| `DAYTONA_API_KEY`   | runtime=daytona | Daytona sandbox API      |
| `GITHUB_PAT`        | git workflow    | GitHub token for push/PR |

## Execution Modes

| Mode         | Description                 | PRs                |
| ------------ | --------------------------- | ------------------ |
| `sequential` | Criteria run in order       | 1 combined PR      |
| `parallel`   | Criteria run simultaneously | 1 PR per criterion |

## Runtimes

| Runtime        | Description            | Requirements         |
| -------------- | ---------------------- | -------------------- |
| `local`        | Direct shell execution | None                 |
| `daytona`      | Cloud sandbox          | `DAYTONA_API_KEY`    |
| `devcontainer` | Docker container       | Running devcontainer |

## Models

| Model    | Best For                    |
| -------- | --------------------------- |
| `haiku`  | Well-scoped tasks (default) |
| `sonnet` | Complex/ambiguous tasks     |
| `opus`   | Most challenging tasks      |
