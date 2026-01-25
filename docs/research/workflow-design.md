# Ralph-Town Workflow Design

End-to-end workflow for team usage.

---

## Current State (POC)

```
ralph.json → Orchestrator → Fresh Sandbox → Agent works → Sandbox destroyed
                                                ↓
                                        Changes LOST
```

**Problem:** No integration with real projects. Agent works in
isolation.

---

## Target State

```
Ticket → ralph.json → Sandbox clones YOUR repo → Agent works on branch
    → Git commit → Push → Create PR → CI runs → Orchestrator checks criteria
```

---

## Daytona Capabilities (Verified)

### Git Operations

Full SDK support for git workflow:

```typescript
// Clone your repo into sandbox
await sandbox.git.clone(
	'https://github.com/org/repo.git',
	'/home/daytona/workspace',
	undefined, // branch (optional)
	undefined, // commitId (optional)
	'git', // username
	process.env.GITHUB_PAT, // password (PAT)
);

// Create feature branch
await sandbox.git.createBranch(
	'/home/daytona/workspace',
	'feature/ralph-123',
);
await sandbox.git.checkoutBranch(
	'/home/daytona/workspace',
	'feature/ralph-123',
);

// After agent makes changes...
await sandbox.git.add('/home/daytona/workspace', ['.']);
await sandbox.git.commit(
	'/home/daytona/workspace',
	'feat: implement ticket-123',
	'Ralph Agent',
	'ralph@example.com',
);

// Push to remote
await sandbox.git.push(
	'/home/daytona/workspace',
	'git',
	process.env.GITHUB_PAT,
);
```

### Network Access (Tier 1-2)

Even on preview tiers, these are whitelisted:

- GitHub API (`api.github.com`) - gh CLI works!
- npm registry
- PyPI
- Docker registries
- AI APIs (Anthropic, OpenAI)

**Implication:** Can create PRs with `gh pr create` from inside
sandbox.

### Snapshots

Pre-configured environments with dependencies:

```typescript
// Create sandbox from custom snapshot
const sandbox = await daytona.create({
	snapshot: 'team-dev-environment',
	language: 'typescript',
});
```

**Tier limitation:** Cannot CREATE snapshots on Tier 1-2. Can USE
existing ones.

**Workaround:** Use Declarative Builder instead:

```typescript
const image = Image.debianSlim('3.12')
	.runCommands(['apt-get update', 'apt-get install -y gh'])
	.pipInstall(['requests']);

const sandbox = await daytona.create({ image });
```

Images cached 24 hours per runner.

### Volumes

Persistent storage across sandbox lifecycles:

```typescript
const volume = await daytona.volume.get('shared-cache', true);
const sandbox = await daytona.create({
	volumes: [
		{ volumeId: volume.id, mountPath: '/home/daytona/.cache' },
	],
});
```

**Use cases:**

- Shared npm/pip cache across sandboxes
- Persistent test fixtures
- Shared secrets/configs

**Limitations:** FUSE-based, slower than local disk, no databases.

---

## Proposed ralph.json v2

```json
{
	"task": "Implement user authentication endpoint",
	"repository": {
		"url": "https://github.com/org/monorepo.git",
		"branch": "main",
		"working_dir": "packages/api"
	},
	"git": {
		"feature_branch": "feature/ralph-{{ticket_id}}",
		"commit_author": "Ralph Agent",
		"commit_email": "ralph@example.com",
		"create_pr": true,
		"pr_title": "feat: {{task_summary}}",
		"pr_body_template": "Automated by Ralph\n\nTicket: {{ticket_id}}"
	},
	"acceptance_criteria": [
		{
			"type": "command_succeeds",
			"command": "npm test",
			"description": "All tests pass"
		},
		{
			"type": "command_succeeds",
			"command": "npm run typecheck",
			"description": "No type errors"
		},
		{
			"type": "pr_checks_pass",
			"description": "CI pipeline passes"
		}
	],
	"max_iterations": 5,
	"budget": {
		"max_tokens": 50000,
		"max_cost_usd": 5.0
	}
}
```

---

## New Acceptance Criteria Types

| Type               | Fields               | Description                  |
| ------------------ | -------------------- | ---------------------------- |
| `file_exists`      | `path`               | File exists at path          |
| `file_contains`    | `path`, `pattern`    | File contains regex          |
| `command_succeeds` | `command`            | Exit code = 0                |
| `command_output`   | `command`, `pattern` | Output matches regex         |
| `pr_checks_pass`   | -                    | GitHub CI checks green       |
| `pr_approved`      | -                    | PR has approval (human loop) |

---

## Workflow Phases

### Phase 1: Setup

1. Parse ralph.json
2. Create sandbox with Declarative Builder (gh CLI installed)
3. Clone repository into sandbox
4. Create feature branch
5. Set up git credentials

### Phase 2: Agent Loop

1. Run agent with task + context from working_dir
2. Agent makes changes using tools (Read, Write, Edit, Bash)
3. Check acceptance criteria
4. If not met: agent sees failures, retries
5. Repeat until criteria met or limits reached

### Phase 3: Finalize

1. Stage and commit changes
2. Push to remote
3. Create PR (if configured)
4. Wait for CI (if `pr_checks_pass` criterion)
5. Report results

### Phase 4: Human Loop (Optional)

If `pr_approved` criterion:

1. Notify team (Slack/email)
2. Orchestrator polls for approval
3. Continue or abort based on review

---

## Environment Variables

```bash
# Required
ANTHROPIC_API_KEY=sk-ant-...
DAYTONA_API_KEY=...
DAYTONA_SERVER_URL=...

# For git operations
GITHUB_PAT=ghp_...          # Personal Access Token
GIT_AUTHOR_NAME="Ralph Agent"
GIT_AUTHOR_EMAIL="ralph@example.com"

# Optional
SLACK_WEBHOOK_URL=...       # For notifications
```

---

## Orchestrator Changes Needed

1. **Add git setup phase** - clone repo, create branch
2. **Pass repo context to agent** - working directory, file tree
3. **Add new criteria types** - `file_contains`, `pr_checks_pass`
4. **Add git finalize phase** - commit, push, PR creation
5. **Add token tracking** - currently placeholder
6. **Add env validation** - fail fast if keys missing

---

## Testing Plan

### Test 1: Git Clone + Push

```json
{
	"task": "Add a comment to README.md",
	"repository": { "url": "...", "branch": "main" },
	"acceptance_criteria": [
		{
			"type": "file_contains",
			"path": "README.md",
			"pattern": "Ralph was here"
		}
	]
}
```

### Test 2: Full PR Flow

```json
{
	"task": "Fix typo in docs",
	"repository": { "url": "..." },
	"git": { "create_pr": true },
	"acceptance_criteria": [
		{ "type": "command_succeeds", "command": "npm run lint" },
		{ "type": "pr_checks_pass" }
	]
}
```

---

## Open Questions

1. **Credentials management** - How to securely pass GITHUB_PAT to
   sandboxes? Environment variable injection is supported.

2. **Monorepo support** - How to scope agent to specific package?
   `working_dir` field + agent system prompt.

3. **Large repos** - Clone time for big repos? Consider shallow clone
   (`--depth 1`) or sparse checkout.

4. **CI wait time** - How long to poll for PR checks? Configurable
   timeout.

5. **Concurrent sandboxes** - Multiple tasks in parallel? Volume for
   shared cache helps.

---

## Implementation Priority

1. **Git clone/push** - Core workflow
2. **New criteria types** - `file_contains`, `command_output`
3. **PR creation** - `gh pr create` from sandbox
4. **Token tracking** - Fix placeholder
5. **Env validation** - Fail fast
6. **Snapshots/volumes** - Optimization (later)
