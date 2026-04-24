# Ralph-Town Agent Guide

Ralph-Town provides disposable Daytona sandboxes for LLM evals, CLI
smoke tests, and isolated command execution.

## Keep in Mind

- This project is model-neutral. Avoid adding Claude-specific framing
  to product docs or command descriptions unless documenting
  compatibility.
- Use pnpm. Do not introduce npm, Bun, or package-manager-specific
  lockfiles besides `pnpm-lock.yaml`.
- Keep secrets out of tool output. Use `pnpx nopeek` when inspecting
  or loading `.env` values, and never print raw credentials.
- Do not guess Daytona SDK behavior. Check existing research notes,
  current code, or upstream docs/issues before changing Daytona API
  usage.

## Credential Semantics

Local orchestration credentials and sandbox-forwarded credentials are
intentionally separate:

- `DAYTONA_API_KEY` is local and used by Ralph-Town to create/manage
  sandboxes.
- `GH_TOKEN` and `ANTHROPIC_API_KEY` are local-orchestrator variables.
- `SANDBOX_GH_TOKEN` is forwarded into sandboxes as `GH_TOKEN`.
- `SANDBOX_ANTHROPIC_API_KEY` is forwarded into sandboxes as
  `ANTHROPIC_API_KEY`.
- `GITHUB_PAT` is only a deprecated compatibility alias for
  `SANDBOX_GH_TOKEN`.

Do not collapse these names; the separation limits what disposable
eval runs can access.

## Code Style

- Use `snake_case` for functions and variables.
- Use `PascalCase` for classes.
- Prefer explicit `node:` imports for Node built-ins.
- Follow the Vite+ formatter config in `vite.config.ts` files.

## Verification

Before saying code changes are ready, run the relevant checks:

```bash
pnpm run check
pnpm run test
pnpm run build
```

If a command reports failures, acknowledge them directly instead of
dismissing them.
