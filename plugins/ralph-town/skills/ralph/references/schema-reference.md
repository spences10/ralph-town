# Schema Reference

## Full ralph.json Schema

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
		"runtime": "local",
		"model": "haiku"
	},
	"acceptance_criteria": [
		{
			"id": "ac-001",
			"description": "What this criterion achieves",
			"steps": ["Step 1 for the agent", "Step 2 for the agent"],
			"backpressure": "pnpm run build",
			"passes": false
		}
	],
	"max_iterations_per_criterion": 3
}
```

## Acceptance Criteria Fields

| Field          | Description                         |
| -------------- | ----------------------------------- |
| `id`           | Unique identifier (e.g., `ac-001`)  |
| `description`  | What this criterion achieves        |
| `steps`        | Array of instructions for the agent |
| `backpressure` | Command to verify (exit 0 = pass)   |
| `passes`       | Boolean, starts false               |

## Workflow

1. `ralph-town init` to create ralph.json
2. Edit with task, repo, acceptance criteria
3. Set required env vars
4. `ralph-town run`
5. Loop iterates until criteria pass or max iterations
6. PR created if configured
