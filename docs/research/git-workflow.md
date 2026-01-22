# Git Workflow in Sandbox

Research on how sandbox agents interact with git repositories.

---

## Key Finding: Daytona SDK Has Built-in Git

**Verified from source:**
`daytonaio/daytona/libs/sdk-typescript/src/Git.ts`

The Daytona SDK provides full git operations **with per-operation
authentication**. No need to store credentials in the sandbox.

---

## Available Git Methods

| Method         | Signature                                               | Auth Support |
| -------------- | ------------------------------------------------------- | ------------ |
| `clone`        | `(url, path, branch?, commitId?, username?, password?)` | ✅           |
| `add`          | `(path, files[])`                                       | N/A          |
| `commit`       | `(path, message, author, email, allowEmpty?)`           | N/A          |
| `createBranch` | `(path, name)`                                          | N/A          |
| `push`         | `(path, username?, password?)`                          | ✅           |
| `pull`         | `(path, username?, password?)`                          | ✅           |
| `status`       | `(path)`                                                | N/A          |
| `branches`     | `(path)`                                                | N/A          |

**Source:** Verified from actual SDK source code.

---

## Authentication Pattern

Credentials are passed **per-operation**, not stored in sandbox:

```typescript
// Clone private repo - pass token at clone time
await sandbox.git.clone(
	'https://github.com/user/private-repo.git',
	'workspace/repo',
	'main', // branch
	undefined, // commitId
	'username', // git username
	'ghp_xxxx', // GitHub token
);

// Push changes - pass token at push time
await sandbox.git.push('workspace/repo', 'username', 'ghp_xxxx');
```

**Implication:** Orchestrator holds credentials, passes them to
sandbox for each git operation. Credentials never stored in sandbox
environment variables.

---

## Workflow Options (Revised)

### Option A: Sandbox Uses SDK Git (Recommended)

```
Orchestrator                    Sandbox
    │                              │
    │  git.clone(url, creds)       │
    ├─────────────────────────────▶│
    │                              │ SDK clones repo
    │                              │ Agent works...
    │                              │ git.add(), git.commit()
    │  git.push(creds)             │
    ├─────────────────────────────▶│ SDK pushes
    │                              │
    │  gh pr create (orchestrator) │
```

**Pros:**

- Credentials passed per-operation, not stored
- Uses SDK methods, not shell commands
- Clean audit trail (SDK logs operations)

**Cons:**

- Orchestrator must coordinate git operations

---

### Option B: Orchestrator Handles All Git

```
Orchestrator                    Sandbox
    │                              │
    │  clone locally               │
    │  upload files to sandbox     │
    ├─────────────────────────────▶│
    │                              │ Agent works on files...
    │  download changed files      │
    │◀─────────────────────────────┤
    │                              │
    │  git diff, commit, push      │
```

**Pros:**

- Zero credential exposure to sandbox
- Orchestrator has full git control

**Cons:**

- File sync overhead
- More complex orchestrator logic

---

## Recommendation

**Use Option A with SDK git methods.**

Rationale:

1. Daytona SDK provides native git support
2. Credentials are per-operation, not persistent
3. Simpler than file sync approach
4. Maintains audit trail via SDK

---

## Credential Flow

```
┌─────────────────────────────────────────────────────────┐
│  Environment (secure)                                   │
│  GH_TOKEN stored in orchestrator env or secret manager  │
└───────────────────────┬─────────────────────────────────┘
                        │
                        ▼
┌─────────────────────────────────────────────────────────┐
│  Orchestrator                                           │
│  - Reads GH_TOKEN from env                              │
│  - Passes to sandbox.git.clone()/push() as parameter    │
└───────────────────────┬─────────────────────────────────┘
                        │ per-operation
                        ▼
┌─────────────────────────────────────────────────────────┐
│  Sandbox                                                │
│  - Receives creds as method parameters                  │
│  - Creds NOT stored in sandbox env                      │
│  - SDK uses creds for single operation, then discards   │
└─────────────────────────────────────────────────────────┘
```

---

## Known Issues

From GitHub issues research:

1. **Issue #3272**: GitHub connection refused on Tier 1 sandboxes
   - Network restrictions may block github.com
   - Check sandbox tier/network policy

2. **Issue #2041**: Clone fails if default branch is not 'main'
   - Must specify branch explicitly for repos with 'master' default

3. **Issue #2624**: No `git.fetch()` method yet (feature request)
   - Workaround: use `sandbox.process.executeCommand('git fetch')`

---

## PR Creation (Researched)

**GitHub API is whitelisted on all tiers** including preview.

From
[Daytona network docs](https://www.daytona.io/docs/en/network-limits/):
`api.github.com` is in the essential services allowlist.

**Options:**

1. **gh CLI from sandbox** - requires gh installed in image
2. **Orchestrator creates PR** - uses gh CLI locally after push

Recommended: Orchestrator creates PR after successful push.

```typescript
// After sandbox.git.push() succeeds
await exec(
	`gh pr create --repo ${repo} --head ${branch} --title "${title}"`,
);
```

---

## Network Access by Tier (Researched)

| Tier | Git Access | GitHub API | Notes                    |
| ---- | ---------- | ---------- | ------------------------ |
| 1-2  | ✅         | ✅         | Whitelisted domains only |
| 3-4  | ✅         | ✅         | Full internet access     |

**Whitelisted for all tiers:**

- `github.com`, `api.github.com`
- `gitlab.com`, `bitbucket.org`
- npm, PyPI, Docker registries
- Anthropic, OpenAI APIs

---

## Token Scopes (Researched)

For GitHub fine-grained PAT:

| Scope          | Needed For  |
| -------------- | ----------- |
| Contents: R/W  | Clone, push |
| Pull requests  | Create PR   |
| Metadata: Read | Repo info   |

---

## To Do

- [ ] Implement git workflow in orchestrator
- [ ] Handle git conflicts in the loop
- [ ] Add PR template support
