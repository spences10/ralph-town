# Daytona Sandbox Research

Current findings for Ralph-Town's disposable Daytona sandbox execution
model.

SDK/source review: 2026-11-11 against `@daytona/sdk@0.230.0`. The old
`@daytonaio/sdk` package was renamed with the same API. Version
0.231.1 was available during review but was still inside this
repository's dependency release-age window, so 0.230.0 is retained.

Live sandbox results below are historical: last verified on 2026-04-24
against `@daytonaio/sdk@0.153.0`. They have not been revalidated
against the current production API.

## Integration refresh

- CLI and MCP now call shared functions from `ralph-town/operations`;
  MCP no longer spawns the CLI.
- MCP adds `search` and `execute` with local QuickJS orchestration.
  Existing direct tools remain supported.
- Environment updates use `sandbox.updateEnv()`. New processes,
  sessions and PTYs inherit changes; running processes do not.
  Environment listing reads a new process's environment because
  `sandbox.env` contains creation metadata.
- Whole-operation retries were removed. The current SDK already has
  connection-level retries that distinguish safe retries from
  potentially repeated side effects.
- Creation timeouts can include `DaytonaTimeoutError.sandboxId`.
  Ralph-Town uses it to attempt cleanup and reports cleanup failures.
- Disposable runs enable `ephemeral: true` in addition to explicit
  deletion. `--keep` disables both. Cancellation triggers host-side
  cleanup, which can outlast the Code Mode deadline.
- The stdout/stderr shell wrapper remains. Session execution needs a
  fresh live regression test before replacing it.

Current references:
[SDK migration](https://www.npmjs.com/package/@daytonaio/sdk),
[Sandbox API](https://www.daytona.io/docs/en/typescript-sdk/sandbox/),
[Process API](https://www.daytona.io/docs/en/typescript-sdk/process/).

The old `daytonaio/daytona` repository stopped receiving updates in
June 2026. Prefer current docs and installed SDK source over its old
issues when checking current behavior.

## Current conclusion

Use Daytona's process API for `ralph-town run`, with a small wrapper
that captures stdout, stderr, exit code, and timeout status. Keep SSH
as a manual debugging escape hatch, not as the primary execution
backend.

The older assumption that `sandbox.process.executeCommand()` is broken
on snapshot-created sandboxes is stale. In current tests,
`executeCommand()` worked on both Daytona's default snapshot and a
custom snapshot.

## Verified Daytona SDK API surface

### Client and sandbox creation

```ts
import { Daytona, Image } from '@daytona/sdk';

const daytona = new Daytona(); // reads DAYTONA_API_KEY by default

const sandbox = await daytona.create(
	{
		snapshot: 'daytonaio/sandbox:0.6.0',
		name: 'my-sandbox',
		language: 'typescript',
		envVars: { NODE_ENV: 'test' },
		labels: { project: 'ralph-town' },
		autoStopInterval: 15,
		autoArchiveInterval: 10080,
		autoDeleteInterval: -1,
	},
	{ timeout: 120 },
);
```

Creating from an image is also supported. If the `image` is a Daytona
`Image` object, Daytona builds a snapshot from it and then starts the
sandbox:

```ts
const image = Image.base('node:22-bookworm-slim').runCommands(
	'apt-get update && apt-get install -y git curl ca-certificates && rm -rf /var/lib/apt/lists/*',
	'corepack enable && corepack prepare pnpm@latest --activate',
);

const sandbox = await daytona.create(
	{ image, language: 'typescript' },
	{ timeout: 120, onSnapshotCreateLogs: console.log },
);
```

### Snapshots

```ts
const snapshot = await daytona.snapshot.create(
	{ name: 'my-snapshot', image },
	{ timeout: 300, onLogs: console.log },
);

const existing = await daytona.snapshot.get('my-snapshot');
const snapshots = await daytona.snapshot.list(1, 50);
await daytona.snapshot.delete(existing);
```

Empirical snapshot list for this account included Daytona's active
general snapshots:

- `daytonaio/sandbox:0.6.0`
- `daytona-small`
- `daytona-medium`
- `daytona-large`
- older `daytonaio/sandbox:*` versions

Inactive snapshots cannot be used until reactivated according to the
current docs.

### Process execution

`executeCommand(command, cwd?, env?, timeout?)` currently executes
shell commands and returns `{ exitCode, result, artifacts }`. It
supports pipes and heredocs in current tests.

Important limitation: `executeCommand()` returns a combined output
stream in `result` / `artifacts.stdout`; stderr is not separated.
Ralph-Town now wraps commands so the remote shell redirects stdout and
stderr to temp files, base64-encodes them, and returns parseable
markers.

`executeSessionCommand()` separates stdout and stderr. In the April
2026 tests it worked for pipes and heredocs but timed out on a command
that printed to both streams and exited non-zero. That historical
failure is why the wrapper remains; it is not a claim that the current
production session API is still broken.

### Filesystem

Current TypeScript SDK supports:

- `sandbox.fs.uploadFile(Buffer | localPath, remotePath, timeout?)`
- `sandbox.fs.uploadFiles(files, timeout?)`
- `sandbox.fs.downloadFile(remotePath, timeout?)`
- `sandbox.fs.downloadFile(remotePath, localPath, timeout?)`
- `sandbox.fs.downloadFiles(files, timeout?)`
- `listFiles`, `searchFiles`, `findFiles`, `getFileDetails`,
  `createFolder`, `deleteFile`, `moveFiles`, `replaceInFiles`, and
  `setFilePermissions`

Empirical upload/download of a small file succeeded on both default
and custom snapshot sandboxes.

### Git

Current TypeScript SDK supports:

- `sandbox.git.clone(url, path, branch?, commitId?, username?, password?)`
- `add`, `commit`, `push`, `pull`, `status`
- branch helpers such as `branches`, `createBranch`, `checkoutBranch`,
  and `deleteBranch`

Empirical clone/status against
`https://github.com/octocat/Hello-World.git` succeeded.

### Lifecycle

Observed states/properties:

- Sandboxes created for validation were returned as
  `state: "started"`.
- Default work dir for Daytona's `daytonaio/sandbox:0.6.0` is
  `/home/daytona`.
- `autoStopInterval: 0` disables auto-stop.
- `autoArchiveInterval` defaulted to `10080` minutes (7 days).
- `autoDeleteInterval: -1` disables auto-delete.
- `ephemeral: true` is documented to set auto-delete-on-stop behavior.
- `sandbox.delete(timeout)` deletes the sandbox, but an immediate
  `daytona.get(id)` may still return an object while deletion
  propagates.

Available lifecycle methods include `start`, `stop`, `archive`,
`recover`, `refreshData`, `refreshActivity`, `setAutostopInterval`,
`setAutoArchiveInterval`, `setAutoDeleteInterval`, and `resize`.

## Empirical results

### `executeCommand()` on snapshot sandboxes

Validated on:

1. Daytona default snapshot `daytonaio/sandbox:0.6.0`
2. A custom `node:22-bookworm-slim` snapshot with Corepack/pnpm

Results:

| Case                       | Default snapshot | Custom snapshot |
| -------------------------- | ---------------- | --------------- |
| stdout + stderr + exit 7   | exit 7           | exit 7          |
| missing command            | exit 127         | exit 127        |
| `bash -lc` missing command | exit 127         | exit 127        |
| pipe                       | exit 0           | exit 0          |
| env var from `envVars`     | available        | available       |
| filesystem upload/download | passed           | passed          |
| git clone/status           | passed           | passed          |

Conclusion: the old `executeCommand returns -1 on snapshot sandboxes`
claim is no longer valid for these scenarios.

### SSH execution

SSH access still exists via
`sandbox.createSshAccess(expiresInMinutes)` and can be useful for
humans debugging kept sandboxes.

Empirically, SSH was not as reliable for programmatic execution:

- On Daytona's default snapshot, a remote command that exited `7`
  returned SSH exit code `255` while still producing stdout.
- On the custom snapshot, the same command returned an unexpected
  `127` in one test.
- stderr handling was inconsistent in these SSH tests.

Conclusion: SSH should not be the default `ralph-town run` backend.

### `node:22-bookworm-slim` + Corepack/pnpm

A custom snapshot based on `node:22-bookworm-slim` with:

```dockerfile
RUN apt-get update && apt-get install -y git curl ca-certificates && rm -rf /var/lib/apt/lists/*
RUN corepack enable && corepack prepare pnpm@latest --activate
```

worked as expected:

- `node` was available at `/usr/local/bin/node`
- `corepack` was available at `/usr/local/bin/corepack`
- `pnpm` was available at `/usr/local/bin/pnpm`
- `pnpx my-pi@latest --help` succeeded through `ralph-town run`

The extra PATH edits previously baked into Ralph-Town snapshots were
not needed for this tested custom snapshot.

Daytona's default `daytonaio/sandbox:0.6.0` is different: it had Node
`v25.6.0` via nvm/corepack but did not have `pnpm`/`pnpx` available
until Corepack/pnpm setup was added by the image/snapshot.

## Ralph-Town execution architecture

Shared `ralph-town run` / MCP `sandbox_run` flow:

```text
CLI or MCP (direct tools / Code Mode)
└── Shared host-side run operation
    ├── Creates ephemeral Daytona sandbox
    ├── Optionally clones a repository in the sandbox
    ├── Runs a wrapped shell command via sandbox.process.executeCommand()
    ├── Parses stdout, stderr, exit code, and timeout status
    └── Deletes sandbox unless --keep is set
```

The wrapper is needed because Daytona's direct command API currently
combines stdout and stderr. The wrapper redirects each stream to a
file in `mktemp -d`, base64-encodes both files, prints marker lines,
and exits zero so Ralph-Town can parse the real command exit code.

## Credentials

Local orchestration credentials and sandbox credentials are
intentionally separate.

| Variable                    | Where used | Purpose                            |
| --------------------------- | ---------- | ---------------------------------- |
| `DAYTONA_API_KEY`           | local      | Create/manage Daytona sandboxes    |
| `GH_TOKEN`                  | local      | Local GitHub CLI or automation     |
| `ANTHROPIC_API_KEY`         | local      | Local Anthropic/API calls          |
| `SANDBOX_GH_TOKEN`          | sandbox    | Forwarded as `GH_TOKEN` in sandbox |
| `SANDBOX_ANTHROPIC_API_KEY` | sandbox    | Forwarded as `ANTHROPIC_API_KEY`   |

`GITHUB_PAT` is a deprecated compatibility alias for
`SANDBOX_GH_TOKEN`.

Never bake tokens into snapshots. Pass only the per-run sandbox
secrets a command needs.

## MCP execution policy notes

`mcp-ralph-town` currently exposes both:

- `sandbox_run`: one-shot disposable execution. This is the safer
  default because it creates and deletes a fresh sandbox for the
  command.
- `sandbox_exec`: command execution in an existing sandbox with a
  static allowlist.

The static allowlist is only a partial guard. For model-neutral
sandbox orchestration, a better policy would likely distinguish
between:

1. Disposable one-shot runs, where arbitrary commands are expected and
   the sandbox is deleted by default.
2. Long-lived sandbox sessions, where command policy may need explicit
   user/client approval, labels, rate limits, audit logs, and
   configurable deny/allow rules.

## Sources checked

- Daytona docs: `https://www.daytona.io/docs/en/sandboxes/`
- Daytona docs: `https://www.daytona.io/docs/en/snapshots/`
- Daytona docs:
  `https://www.daytona.io/docs/en/process-code-execution/`
- Daytona TypeScript SDK docs for `Daytona`, `Sandbox`, `Process`,
  `FileSystem`, and `Git`
- Local installed `@daytonaio/sdk@0.153.0` `.d.ts` files
- GitHub issue `daytonaio/daytona#2283` — still open, but its current
  scope is missing-command exit behavior; current empirical tests
  returned exit 127, not -1
- GitHub issue `daytonaio/daytona#4230` — session command hanging edge
  cases; closed, but session execution still showed timeout behavior
  in local validation
