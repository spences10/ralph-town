# ralph-gas

Two-agent TypeScript system using Claude Agent SDK with Daytona
sandboxes.

**Ralph Loop**: Iterate until acceptance criteria are met. **Gas
Town**: Resource budgeting (tokens, cost, time).

## How it Works

```
ralph.json → Orchestrator → Daytona Sandbox(es) → Agent → Backpressure Check → Loop/Done → PR(s)
```

1. Orchestrator reads `ralph.json` with acceptance criteria
2. Spins up Daytona sandbox(es) with Node.js + Claude Agent SDK
3. Clones target repo, creates feature branch(es)
4. For each criterion:
   - Runs sandbox agent with the task steps
   - Checks backpressure (build, tests, file existence)
   - Retries on failure, moves on when passing
5. Commits, pushes, creates PR(s)

## Quick Start

```bash
# Install dependencies
bun install

# Set up environment
cp .env.example .env
# Add: ANTHROPIC_API_KEY, DAYTONA_API_KEY, GITHUB_PAT
# Optional: LANGFUSE_PUBLIC_KEY, LANGFUSE_SECRET_KEY

# Run the Ralph Loop
bun ralph
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
		"create_pr": true,
		"pr_title": "feat: automated improvements"
	},
	"execution": {
		"mode": "parallel",
		"max_concurrent": 3,
		"model": "haiku"
	},
	"acceptance_criteria": [
		{
			"id": "ac-001",
			"description": "Add health endpoint",
			"steps": [
				"Create src/routes/api/health/+server.ts",
				"Export GET handler returning json({ status: 'ok' })",
				"Import json from @sveltejs/kit"
			],
			"backpressure": "pnpm run build",
			"passes": false
		}
	],
	"max_iterations_per_criterion": 3,
	"budget": {
		"max_tokens": 50000
	}
}
```

### Execution Modes

| Mode         | Description                                     | PRs Created        |
| ------------ | ----------------------------------------------- | ------------------ |
| `sequential` | One sandbox, criteria run in order              | 1 combined PR      |
| `parallel`   | Multiple sandboxes, criteria run simultaneously | 1 PR per criterion |

### Model Selection

| Model    | Best For                              | Cost     |
| -------- | ------------------------------------- | -------- |
| `haiku`  | Well-scoped tasks with clear steps    | Default  |
| `sonnet` | Complex tasks, ambiguous requirements | ~5x more |
| `opus`   | Most challenging tasks                | Premium  |

### Environment Variables

| Variable              | Required | Description                                 |
| --------------------- | -------- | ------------------------------------------- |
| `ANTHROPIC_API_KEY`   | Yes      | Claude API key                              |
| `DAYTONA_API_KEY`     | Yes      | Daytona sandbox API key                     |
| `GITHUB_PAT`          | Yes      | GitHub token for clone/push/PR              |
| `LANGFUSE_PUBLIC_KEY` | No       | Langfuse telemetry                          |
| `LANGFUSE_SECRET_KEY` | No       | Langfuse telemetry                          |
| `LANGFUSE_BASE_URL`   | No       | Langfuse host (default: cloud.langfuse.com) |

## Scripts

```bash
bun ralph              # Run the Ralph Loop
bun dev                # Development mode
bun run build          # Compile TypeScript
bun start              # Build + run
bun scripts/fetch-traces.ts  # View Langfuse traces
```

## Architecture

```
src/
├── orchestrator.ts    # Main loop, sandbox management, git workflow
├── sandbox-agent.ts   # Claude agent running inside Daytona
├── telemetry.ts       # Langfuse integration for observability
├── types.ts           # TypeScript types for ralph.json schema
└── utils.ts           # Shared utilities

skills/
└── ralph-discovery/   # Codebase discovery skill
    ├── SKILL.md
    ├── references/
    └── scripts/
```

## Discovery (Optional)

Before creating ralph.json, run discovery to understand the target
codebase:

```bash
# Use the discovery skill to explore a repo
# Outputs: project type, paths, package manager, build commands
```

This helps generate accurate backpressure commands and avoid path
mismatches.

See `skills/ralph-discovery/` for details.

## Telemetry

When Langfuse keys are configured, traces include:

- Per-run trace with metadata (criteria, budget, iterations)
- Per-iteration spans with criterion ID
- Agent execution generations with token usage
- Backpressure check results (pass/fail, output)

Fetch traces programmatically:

```bash
bun scripts/fetch-traces.ts
```

## Acceptance Criteria Format

Each criterion has:

| Field          | Description                                  |
| -------------- | -------------------------------------------- |
| `id`           | Unique identifier (e.g., `ac-001`)           |
| `description`  | What this criterion achieves                 |
| `steps`        | Array of implementation steps for the agent  |
| `backpressure` | Command to verify completion (exit 0 = pass) |
| `passes`       | Boolean, set to true when criterion passes   |

### Backpressure Patterns

```bash
# Build passes
pnpm run build

# File exists
test -f src/lib/components/MyComponent.svelte

# File contains string
grep -q 'pattern' path/to/file

# Combined checks
test -f src/lib/theme.svelte.ts && \
  grep -q 'ThemeToggle' src/routes/+layout.svelte && \
  pnpm run build
```

## Research

See `docs/RESEARCH.md` for architecture exploration and design
decisions.
