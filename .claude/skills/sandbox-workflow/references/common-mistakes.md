# Common Mistakes

## 1. Missing --snapshot Flag

Creates empty sandbox without tools installed.

**BAD:**
```bash
ralph-town sandbox create --json
```

**GOOD:**
```bash
ralph-town sandbox create --snapshot ralph-town-dev --json
```

## 2. GH_TOKEN Not Expanded

If you forget to source .env, the literal string `$GH_TOKEN` is passed.

**BAD:**
```bash
ralph-town sandbox create --env "GH_TOKEN=$GH_TOKEN"
```

**GOOD:**
```bash
source .env
ralph-town sandbox create --env "GH_TOKEN=$GH_TOKEN"
```

## 3. Using Short Commands

PATH is broken in SSH sessions.

**BAD:**
```bash
git status
gh pr list
```

**GOOD:**
```bash
/usr/bin/git status
/usr/bin/gh pr list
```

## 4. Wrong Working Directory

**BAD:**
```bash
cd /workspaces
```

**GOOD:**
```bash
cd /home/daytona
```

## 5. Stale Snapshot

If `gh` or other tools are missing, rebuild snapshot:

```bash
bun run packages/cli/src/core/create-snapshot.ts --force
```
