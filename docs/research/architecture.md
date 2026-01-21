# Architecture Options

How the orchestrator relates to Daytona sandboxes.

---

## Option A: Orchestrator LOCAL → spawns Daytona sandboxes

```
┌─────────────────┐
│  Local Machine  │
│  (Orchestrator) │
└────────┬────────┘
         │ spawns
    ┌────┴────┬────────┐
    ▼         ▼        ▼
┌───────┐ ┌───────┐ ┌───────┐
│Agent 1│ │Agent 2│ │Agent 3│
│Sandbox│ │Sandbox│ │Sandbox│
└───────┘ └───────┘ └───────┘
```

**Pros**: Full control, easy inter-sandbox coordination
**Cons**: Local machine as bottleneck

---

## Option B: Orchestrator IN Daytona → child processes

```
┌─────────────────────────┐
│    Daytona Sandbox      │
│  ┌───────────────────┐  │
│  │   Orchestrator    │  │
│  └────────┬──────────┘  │
│           │ spawns      │
│     ┌─────┴─────┐       │
│     ▼           ▼       │
│  ┌──────┐  ┌──────┐     │
│  │Proc 1│  │Proc 2│     │
│  └──────┘  └──────┘     │
└─────────────────────────┘
```

**Pros**: Fully containerized
**Cons**: Limited - can't spawn sibling sandboxes

---

## Option C: Orchestrator IN Daytona → callbacks to spawn siblings

```
┌───────────────────┐     ┌───────────────┐
│  Daytona Sandbox  │     │ Local/API     │
│  (Orchestrator)   │────▶│ (Spawner)     │
└───────────────────┘     └───────┬───────┘
                                  │ spawns
                            ┌─────┴─────┐
                            ▼           ▼
                        ┌───────┐   ┌───────┐
                        │Agent 1│   │Agent 2│
                        │Sandbox│   │Sandbox│
                        └───────┘   └───────┘
```

**Pros**: Best of both worlds
**Cons**: Complex, needs callback mechanism

---

## Current Leaning

**Option B with orchestrator in Daytona** - fully containerized, no
local bottleneck. Child agents run as processes within the sandbox.

Open question: Can we spawn sibling sandboxes from within a sandbox
if needed?
