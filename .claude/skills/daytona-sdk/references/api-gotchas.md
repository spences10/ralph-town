# Daytona SDK API Gotchas

## SANDBOX SSH - READ THIS FIRST

When working in a sandbox via SSH:

1. **GH_TOKEN IS AVAILABLE** - don't check, just use `$GH_TOKEN`
2. **USE FULL PATHS** - `/usr/bin/git` not `git`
3. **WORK DIR** - `/home/daytona` not `/workspaces`

**JUST RUN:**
```bash
cd /home/daytona
/usr/bin/git clone https://$GH_TOKEN@github.com/owner/repo.git
```

**DON'T WASTE TIME ON:**
- `echo $GH_TOKEN` - it's there, trust it
- `which git` - PATH is broken, use full paths
- checking if commands exist - just run them

## CLI: Environment Variables Must Be Sourced

The `--env` flag uses shell expansion. Variables in `.env` won't expand
unless sourced first.

**WRONG:**

```bash
# $GH_TOKEN is in .env but not exported - expands to empty string
ralph-town sandbox create --env "GH_TOKEN=$GH_TOKEN"
# Sandbox created with GH_TOKEN="" (empty!)
```

**CORRECT:**

```bash
# Source .env first so variables are in shell environment
source .env
ralph-town sandbox create --env "GH_TOKEN=$GH_TOKEN"
# Sandbox created with actual token value
```

## uploadFile Parameter Order

**WRONG:**

```typescript
// This will fail with ENOENT
await sandbox.fs.uploadFile('/path/to/file', content);
```

**CORRECT:**

```typescript
// Signature: uploadFile(content: Buffer, destination: string)
await sandbox.fs.uploadFile(Buffer.from(content), '/path/to/file');
```

## CodeLanguage Enum

From `libs/sdk-typescript/src/Daytona.ts`:

```typescript
export enum CodeLanguage {
	PYTHON = 'python',
	TYPESCRIPT = 'typescript',
	JAVASCRIPT = 'javascript',
}
```

No `bun`, `go`, `rust`, etc.

## Research Commands

Before implementing unfamiliar SDK features:

```bash
# Search issues
gh search issues --repo daytonaio/daytona <query>

# View specific issue
gh issue view <number> --repo daytonaio/daytona

# Search PRs
gh pr list --repo daytonaio/daytona --search "<query>" --state all

# View PR
gh pr view <number> --repo daytonaio/daytona

# Search code
mcp__mcp-omnisearch__github_search query="repo:daytonaio/daytona <term>"
```

## Bun Support Status

- **Issue #3238**: "Add bun to default Daytona Snapshot" (open)
- **PR #3241**: Adds Bun + Claude Agent SDK to default image (open, changes
  requested)

Until merged, install Bun manually in sandbox.
