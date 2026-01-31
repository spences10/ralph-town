# Sandbox Teammate Instructions

**DO NOT** check if GH_TOKEN exists. **DO NOT** try workarounds.
**JUST RUN THESE EXACT COMMANDS** via SDK executeCommand.

## Install gh CLI First

```bash
curl -sL https://github.com/cli/cli/releases/download/v2.65.0/gh_2.65.0_linux_amd64.tar.gz | tar -xz -C /tmp && mkdir -p ~/bin && mv /tmp/gh_*/bin/gh ~/bin/
```

## Setup Credentials (SECURE)

```bash
# Configure credential helper (keeps token out of URLs/logs)
git config --global credential.helper store
echo "https://oauth2:$GH_TOKEN@github.com" > ~/.git-credentials
```

## Clone Repository

```bash
# Clone WITHOUT token in URL
git clone https://github.com/spences10/ralph-town.git
cd ralph-town
```

## Create Branch

```bash
git checkout -b fix/your-branch-name
```

## After Making Changes

```bash
git add -A
git commit -m "your message

Co-Authored-By: Claude Opus 4.5 <noreply@anthropic.com>"
git push -u origin fix/your-branch-name
~/bin/gh pr create --title "your title" --body "Fixes #N"
```

## CRITICAL RULES

1. **Use SDK executeCommand** - not SSH
2. **Install gh first** - snapshot may not have it
3. **GH_TOKEN is available** - don't check, just use it
4. **Don't run `which` or `echo $VAR`** - wastes time
5. **Use credential helper** - never put token in git URLs
