# Daytona SDK Capabilities

Research on Daytona SDK features relevant to orchestration.

---

## Tier Limitations (Validated)

**Preview tiers (1-2) have restrictions:**

| Feature           | Tier 1-2 (Preview) | Tier 3+           |
| ----------------- | ------------------ | ----------------- |
| Internet access   | Restricted         | Full              |
| Snapshot creation | Forbidden          | Available         |
| Memory limit      | 10-20 GiB total    | Higher            |
| bun.sh access     | Blocked            | Allowed           |
| npm registry      | Allowed            | Allowed           |

**Implications for Ralph-Town:**

- Use npm/node instead of bun (npm registry is allowed)
- Can't create custom snapshots on preview tier
- ~10s npm install overhead per sandbox creation
- Must work within memory limits

---

## Core Features for Orchestration

- `daytona.create()` - spawn new sandboxes programmatically
- `sandbox.process.executeCommand()` - run commands in sandbox
- `sandbox.fs.uploadFile()` - upload files to sandbox
- `daytona.delete()` - cleanup when done
- Volumes - persistent storage shareable between sandboxes

---

## API Gotchas (Validated)

```typescript
// uploadFile: (Buffer, path) - NOT (path, content)
await sandbox.fs.uploadFile(Buffer.from(code), '/home/daytona/app.ts');

// executeCommand returns { result, exitCode } - NOT { output }
const { result, exitCode } = await sandbox.process.executeCommand('cmd');

// executeCommand signature: (command, cwd?, env?, timeout?)
await sandbox.process.executeCommand('cmd', undefined, undefined, 120);

// delete, not remove
await daytona.delete(sandbox);
```

---

## Snapshot API (For Tier 3+)

When snapshot creation is available:

```typescript
import { Image } from '@daytonaio/sdk';

// Create image with pre-installed deps
const image = Image.base('node:24-slim').runCommands(
	'npm install -g tsx @anthropic-ai/claude-agent-sdk',
);

// Create snapshot
await daytona.snapshot.create(
	{ name: 'ralph-agent', image },
	{ onLogs: console.log },
);

// Use snapshot
await daytona.create({ snapshot: 'ralph-agent' });
```

---

## Limitation

No native "spawn sandbox from inside sandbox" - orchestrator must
coordinate from outside or use callback pattern.

---

## SDK Source Structure

Key files in `daytonaio/daytona/libs/sdk-typescript/src`:

- `Daytona.ts` - main client
- `Sandbox.ts` - sandbox instance
- `Process.ts` - command execution
- `FileSystem.ts` - file operations
- `Snapshot.ts` - checkpoint/restore
- `Volume.ts` - persistent storage

---

## Validated Working Setup

Current setup that works on preview tier:

1. Create sandbox with `language: 'typescript'`
2. Upload agent code via `fs.uploadFile()`
3. Install deps via npm (allowed on preview)
4. Run agent via `npx tsx`
5. Clean up sandbox

Total time: ~20s (10s npm install + 10s agent run)
