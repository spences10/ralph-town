# ralph-town

CLI for autonomous agent orchestration using Claude Agent SDK.

**Ralph Loop**: Iterate until acceptance criteria are met. **Gas
Town**: Resource budgeting (tokens, cost, time).

## Install

```bash
npm install -g ralph-town
# or
npx ralph-town
```

## Quick Start

```bash
# Initialize config in your project
ralph-town init

# Edit ralph.json with your task and repo

# Run the loop
ralph-town run
```

## How it Works

```
ralph.json → Orchestrator → Sandbox → Agent → Backpressure Check → Loop/Done → PR
```

1. Reads `ralph.json` with acceptance criteria
2. Spins up sandbox (Daytona, local, or devcontainer)
3. Clones target repo, creates feature branch
4. For each criterion:
   - Runs agent with the task steps
   - Checks backpressure (build, tests, etc.)
   - Retries on failure, moves on when passing
5. Commits, pushes, creates PR

## Commands

```bash
ralph-town init      # Create ralph.json template
ralph-town validate  # Validate config
ralph-town run       # Execute the loop
ralph-town run --runtime local      # Use local runtime
ralph-town run --runtime daytona    # Use Daytona sandbox
ralph-town run --dry-run            # Validate without executing
```

## Configuration

### ralph.json

```json
{
	"repository": {
		"url": "https://github.com/user/repo.git",
		"branch": "main"
	},
	"git": {
		"feature_branch": "feature/my-changes",
		"create_pr": true
	},
	"execution": {
		"mode": "sequential",
		"model": "haiku"
	},
	"acceptance_criteria": [
		{
			"id": "ac-001",
			"description": "Add health endpoint",
			"steps": [
				"Create src/routes/api/health/+server.ts",
				"Export GET handler returning json({ status: 'ok' })"
			],
			"backpressure": "pnpm run build",
			"passes": false
		}
	],
	"max_iterations_per_criterion": 3
}
```

### Execution Modes

| Mode         | Description                 | PRs Created        |
| ------------ | --------------------------- | ------------------ |
| `sequential` | Criteria run in order       | 1 combined PR      |
| `parallel`   | Criteria run simultaneously | 1 PR per criterion |

### Runtimes

| Runtime        | Description            | Requirements         |
| -------------- | ---------------------- | -------------------- |
| `local`        | Direct shell execution | None                 |
| `daytona`      | Cloud sandbox          | `DAYTONA_API_KEY`    |
| `devcontainer` | Docker container       | Running devcontainer |

### Model Selection

| Model    | Best For          | Cost     |
| -------- | ----------------- | -------- |
| `haiku`  | Well-scoped tasks | Default  |
| `sonnet` | Complex tasks     | ~5x more |
| `opus`   | Most challenging  | Premium  |

### Environment Variables

| Variable              | Required        | Description     |
| --------------------- | --------------- | --------------- |
| `ANTHROPIC_API_KEY`   | Yes             | Claude API key  |
| `DAYTONA_API_KEY`     | runtime=daytona | Daytona API key |
| `GITHUB_PAT`          | git workflow    | GitHub token    |
| `LANGFUSE_PUBLIC_KEY` | No              | Telemetry       |
| `LANGFUSE_SECRET_KEY` | No              | Telemetry       |

## Acceptance Criteria Format

| Field          | Description                        |
| -------------- | ---------------------------------- |
| `id`           | Unique identifier (e.g., `ac-001`) |
| `description`  | What this criterion achieves       |
| `steps`        | Implementation steps for agent     |
| `backpressure` | Command to verify (exit 0 = pass)  |
| `passes`       | Set to true when passing           |

### Backpressure Patterns

```bash
# Build passes
pnpm run build

# File exists
test -f src/lib/MyComponent.svelte

# Combined checks
test -f src/lib/theme.ts && pnpm run build
```

## Research

See `docs/RESEARCH.md` for architecture and design decisions.
