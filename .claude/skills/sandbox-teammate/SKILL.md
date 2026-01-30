# Sandbox Teammate Instructions

**DO NOT** check if GH_TOKEN exists. **DO NOT** try workarounds.
**JUST RUN THESE EXACT COMMANDS.**

## Setup (copy-paste exactly)

```bash
cd /home/daytona
/usr/bin/git clone https://$GH_TOKEN@github.com/spences10/ralph-town.git
cd ralph-town
```

## Create Branch

```bash
/usr/bin/git checkout -b fix/your-branch-name
```

## After Making Changes

```bash
/usr/bin/git add -A
/usr/bin/git commit -m "your message

Co-Authored-By: Claude Opus 4.5 <noreply@anthropic.com>"
/usr/bin/git push -u origin fix/your-branch-name
/usr/bin/gh pr create --title "your title" --body "Fixes #N"
```

## CRITICAL RULES

1. **ALWAYS use full paths** - `/usr/bin/git` not `git`
2. **Work dir is `/home/daytona`** - not /workspaces
3. **GH_TOKEN is available** - don't check, just use it
4. **Don't run `which` or `echo $VAR`** - wastes time
