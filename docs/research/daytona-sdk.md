# Daytona SDK Capabilities

Research on Daytona SDK features relevant to orchestration.

---

## Core Features for Orchestration

- `daytona.create()` - spawn new sandboxes programmatically
- `sandbox.snapshot()` - checkpoint agent state for restore
- `sandbox.delete()` - cleanup when done
- Volumes - persistent storage shareable between sandboxes
- Multiple sandboxes from one Daytona client instance

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

## To Research

- [ ] Snapshot/restore workflow for checkpointing
- [ ] Volume sharing between sandboxes
- [ ] Sandbox timeout handling
- [ ] Resource limits per sandbox
