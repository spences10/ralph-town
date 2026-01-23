# Ralph-GAS

Two-agent TypeScript system using Claude Agent SDK with Daytona
sandbox.

**Ralph Loop**: Iterate until acceptance criteria are met. **Gas
Town**: Resource budgeting (tokens, cost, time).

## How it Works

```
ralph.json → Orchestrator → Daytona Sandbox → Agent → Backpressure Check → Loop/Done
```

1. Orchestrator reads `ralph.json` with features and acceptance
   criteria
2. Spins up a Daytona sandbox with Node.js + Claude Agent SDK
3. Clones target repo, creates feature branch
4. For each feature:
   - Runs sandbox agent with the task
   - Checks backpressure (build, tests, file existence)
   - Retries on failure, moves on when passing
5. Commits, pushes, creates PR

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
	"features": [
		{
			"id": "feat-001",
			"description": "Add health endpoint",
			"task": "Create src/routes/api/health/+server.ts...",
			"backpressure": "cd /home/daytona/workspace && npm run build",
			"passes": false
		}
	],
	"max_iterations_per_feature": 3,
	"budget": {
		"max_tokens": 50000
	}
}
```

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
bun ralph          # Run the Ralph Loop
bun dev            # Development mode
bun run build      # Compile TypeScript
bun start          # Build + run
```

## Architecture

- **`src/orchestrator.ts`** - Main loop, sandbox management, git
  workflow
- **`src/sandbox-agent.ts`** - Claude agent running inside Daytona
- **`src/telemetry.ts`** - Langfuse integration for observability
- **`src/types.ts`** - TypeScript types for ralph.json schema

## Telemetry

When Langfuse keys are configured, traces include:

- Per-run trace with metadata (features, budget, iterations)
- Per-iteration spans with feature ID
- Agent execution generations with token usage
- Backpressure check results (pass/fail, output)

## Research

See `docs/RESEARCH.md` for architecture exploration and design
decisions.
