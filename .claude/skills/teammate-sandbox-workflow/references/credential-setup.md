# Secure Git Credential Setup

## Why Credential Helper

NEVER embed tokens in git URLs:

```bash
# BAD - tokens leak via process list, logs, errors
/usr/bin/git clone https://$GH_TOKEN@github.com/owner/repo.git
```

Tokens in URLs are visible in:
- `ps aux` process list
- Shell history
- Git error messages
- Debug logs

## Correct Setup

```bash
# Configure credential helper
/usr/bin/git config --global credential.helper store

# Store credentials securely
/bin/echo "https://oauth2:$GH_TOKEN@github.com" > ~/.git-credentials
/bin/chmod 600 ~/.git-credentials

# Now clone without token in URL
/usr/bin/git clone https://github.com/owner/repo.git
```

## Verify Setup

```bash
/bin/cat ~/.git-credentials
# Should show: https://oauth2:<token>@github.com
```

Git automatically uses stored credentials for github.com URLs.
