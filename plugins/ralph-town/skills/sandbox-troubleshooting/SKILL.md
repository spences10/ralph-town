---
name: sandbox-troubleshooting
# prettier-ignore
description: Troubleshoot Daytona sandbox runs, SSH access, snapshots, credentials, and command execution failures.
---

# Sandbox Troubleshooting

## Common Issues

| Symptom                         | Likely Cause                              | Fix                                             |
| ------------------------------- | ----------------------------------------- | ----------------------------------------------- |
| `exec` returns `-1`             | Daytona SDK issue on snapshots            | Use SSH-backed `ralph-town run`                 |
| Command not found over SSH      | PATH is limited                           | Use full paths or export PATH                   |
| GitHub auth fails in sandbox    | Wrong token context or missing env        | Use `SANDBOX_GH_TOKEN`, forwarded as `GH_TOKEN` |
| Model API auth fails in sandbox | Local key was not intentionally forwarded | Use `SANDBOX_ANTHROPIC_API_KEY`                 |
| Snapshot command lacks tools    | Snapshot is stale or missing packages     | Run `sandbox preflight`, rebuild if needed      |
| Sandbox costs keep rising       | Kept sandbox not deleted                  | `ralph-town sandbox list`, then delete          |

## Prefer Disposable Runs

For simple evals and smoke tests:

```bash
ralph-town run --json -- pnpx my-pi@latest --help
```

Use `--keep` only when you need to debug interactively.

## Full Path Reference

| Tool | Full Path             |
| ---- | --------------------- |
| git  | `/usr/bin/git`        |
| gh   | `/usr/bin/gh`         |
| pnpm | `/usr/local/bin/pnpm` |
| curl | `/usr/bin/curl`       |

## Credential Checks

Use nopeek locally:

```bash
pnpx nopeek audit
pnpx nopeek load .env --only DAYTONA_API_KEY,SANDBOX_GH_TOKEN,SANDBOX_ANTHROPIC_API_KEY
```

Do not echo token values.

## Snapshot Checks

```bash
ralph-town sandbox preflight
ralph-town sandbox preflight --snapshot <name> --json
```

If preflight fails, recreate the snapshot:

```bash
ralph-town sandbox snapshot create --force
```
