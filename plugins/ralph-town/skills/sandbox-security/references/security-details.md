# Sandbox Security Details

## Why Full Paths?

Daytona SSH sessions have a broken PATH environment variable. Commands
like `git` or `gh` won't resolve. This is a known issue
(daytonaio/daytona#2283).

**Common tool paths:**
```
/usr/bin/git
/usr/bin/gh
/usr/bin/curl
/root/.bun/bin/bun
/bin/ls
/bin/cat
/bin/echo
/bin/chmod
```

## Why Tokens in URLs Are Dangerous

When you embed a token in a git URL:
```bash
git clone https://$GH_TOKEN@github.com/owner/repo.git
```

The token becomes visible in:

1. **Process list** - `ps aux` shows full command lines
2. **Shell history** - Stored in ~/.bash_history or similar
3. **Git error messages** - Failed clones may log the URL
4. **Debug logs** - GIT_TRACE and similar expose URLs

**The credential helper approach** stores the token in a file with
restricted permissions (600), keeping it out of process arguments.

## Env Var Security Model

### How `--env` Works

When you create a sandbox with `--env GH_TOKEN=xxx`, the variable is
set in the sandbox's environment. This means:

1. **Any process can read it** - Not just your code
2. **`/proc/*/environ` exposes it** - Any user can read process env
3. **Child processes inherit it** - Spawned processes get the token

### Threat Model

If you run untrusted code in the sandbox:
- It can read `$GH_TOKEN` via `env` command
- It can read `/proc/1/environ` to get all env vars
- It can exfiltrate tokens to external servers

### Mitigation Strategies

1. **Minimize token scope** - Use tokens with only needed permissions
2. **Short-lived tokens** - GitHub PATs can have expiration dates
3. **Delete promptly** - Don't leave sandboxes running unnecessarily
4. **Trusted code only** - Don't run untrusted code with sensitive env

## SSH Quoting

### Why Double Quotes Matter

```bash
# BAD - single quotes prevent $GH_TOKEN expansion
ssh ... '/bin/echo "https://oauth2:$GH_TOKEN@github.com"'
# Result: literal "$GH_TOKEN" string, not the value

# GOOD - double quotes allow local expansion
ssh ... "/bin/echo 'https://oauth2:$GH_TOKEN@github.com'"
# Result: token value sent to remote
```

The outer quotes determine whether your local shell expands variables.
Double quotes = expand locally. Single quotes = literal string.

### Why Team-Lead Sets Credentials

SSH sessions don't inherit `--env` vars from sandbox creation. The
team-lead must:

1. Source `.env` locally to get `$GH_TOKEN`
2. Run SSH command with double quotes
3. Token expands locally before being sent to remote

Teammates can't do this because they don't have access to the token
value in their SSH session.

## Complete Credential Setup

```bash
# 1. Source .env locally
source .env

# 2. Create sandbox
ralph-town sandbox create --snapshot ralph-town-dev
# Returns: <sandbox-id>

# 3. Get SSH token
ralph-town sandbox ssh <sandbox-id> --show-secrets
# Returns: ssh <token>@ssh.app.daytona.io

# 4. Configure credentials via SSH
# Note: $GH_TOKEN expands LOCALLY
ssh <token>@ssh.app.daytona.io "
  /usr/bin/git config --global credential.helper store &&
  /bin/echo 'https://oauth2:$GH_TOKEN@github.com' > ~/.git-credentials &&
  /bin/chmod 600 ~/.git-credentials
"

# 5. Now spawn teammate - credentials already configured
```
