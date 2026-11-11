# Daytona SDK API Gotchas

## Current sources

Use `@daytona/sdk`. It replaces `@daytonaio/sdk` with the same API.

Check the current
[SDK docs](https://www.daytona.io/docs/en/typescript-sdk/) and
installed package declarations before changing API usage. The old
`daytonaio/daytona` repository stopped receiving updates in June 2026;
its issues and PRs do not establish current behavior.

## Process execution

`executeCommand(command, cwd?, env?, timeout?)` returns combined
output in `result`. Ralph-Town's disposable run wrapper preserves
separate stdout/stderr streams and the command exit code.

Sessions expose separate streams, but the historical April 2026
regressions in `docs/RESEARCH.md` need a new live test before changing
the execution backend. Do not assume the old SSH, PATH or snapshot
failures still apply.

## Environment updates

`sandbox.updateEnv({ KEY: 'value' })` updates the daemon environment
for newly spawned processes, sessions and PTYs. It does not change
already-running processes. A one-off shell `export` does not persist
into later commands, and `sandbox.env` is creation-time metadata.

Local orchestration credentials are not automatically forwarded. Use
`SANDBOX_GH_TOKEN` / `SANDBOX_ANTHROPIC_API_KEY` for sandbox
credentials. Never assume a sandbox has a token just because the local
orchestrator has one.

For credential-dependent commands, load only the required keys with
`pnpx nopeek run`. Do not print credentials, put tokens into clone
URLs, or bake them into snapshots.

## Retries and cleanup

Do not retry whole create or execute operations after an uncertain
network response. The operation may already have run. The SDK provides
connection-level retry handling.

A creation timeout can include `DaytonaTimeoutError.sandboxId`.
Retrieve that sandbox and attempt deletion rather than creating
another one.

`ephemeral: true` means delete when stopped, not delete when a command
finishes. Keep explicit cleanup for disposable runs.

## Filesystem and images

`uploadFile(Buffer.from(content), remote_path)` uploads content. With
a string first argument, the SDK treats it as a local file path.

Tool availability depends on the selected image. Ralph-Town's default
image includes Node, git and pnpm; a custom image may not. Do not
apply old PATH workarounds without checking the selected image.
