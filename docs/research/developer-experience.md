# Developer Experience

How developers will actually use this system.

---

## The Real Workflow

```
1. Dev has ticket/epic in their repo (e.g., company-app/)
2. Dev is in Claude Code session in that repo
3. Dev (or Claude) creates ralph.json with acceptance criteria
4. Dev invokes ralph-town orchestration
5. Orchestration runs in Daytona
6. Agents do work
7. Results come back as PR
```

---

## Interface Options

| Approach          | How dev invokes                       | Where ralph-town lives |
| ----------------- | ------------------------------------- | ---------------------- |
| **MCP server**    | Claude Code calls MCP tool            | Running locally/remote |
| CLI tool          | `npx ralph-town run`                  | npm package            |
| Claude Code skill | `/ralph` in their Claude session      | Skill in their project |
| API endpoint      | `curl https://ralph-town.company.com` | Deployed service       |
| VS Code extension | Button/command in editor              | Extension              |

---

## Current Leaning: MCP Server

**Why MCP?**

- Claude Code can call MCP tools directly
- Structured input/output (not just text)
- Claude creates the ralph.json, so CLI isn't primary interface
- Fits naturally into Claude Code workflow

**Flow:**

```
┌─────────────────────────────────────────────────────────┐
│  Dev's repo (company-app/)                              │
│  ┌─────────────────┐                                    │
│  │  Claude Code    │                                    │
│  │  session        │                                    │
│  └────────┬────────┘                                    │
│           │ creates                                     │
│           ▼                                             │
│  ┌─────────────────┐                                    │
│  │  ralph.json     │                                    │
│  └────────┬────────┘                                    │
│           │ calls MCP tool                              │
└───────────┼─────────────────────────────────────────────┘
            ▼
┌─────────────────────────────────────────────────────────┐
│  ralph-town MCP server                                   │
│  ┌─────────────────┐                                    │
│  │  Orchestrator   │───▶ Spins up Daytona sandboxes     │
│  └─────────────────┘                                    │
└───────────┬─────────────────────────────────────────────┘
            │ results
            ▼
┌─────────────────────────────────────────────────────────┐
│  Output                                                 │
│  - PR created                                           │
│  - Status updates streamed back                         │
│  - Metrics/cost reported                                │
└─────────────────────────────────────────────────────────┘
```

---

## Key Design Questions

### Where does ralph.json live?

In the dev's repo. It's ticket/task-specific.

### Where does orchestration run?

In Daytona. Fully containerized, no local bottleneck.

### How do results get back?

- **PR** to the target repo (primary output)
- **Streaming status** back to Claude Code session
- **Metrics** reported at end

### Auth/credentials flow

- Dev's ANTHROPIC_API_KEY for Claude calls
- DAYTONA_API_KEY for sandbox creation
- GH_TOKEN for PR creation

**To think through:**

- [ ] How to pass credentials securely to MCP server?
- [ ] Shared team keys vs individual keys?
- [ ] Rate limiting per user/team?

---

## MCP Tool Design (Draft)

```typescript
// Tool: ralph_run
interface RalphRunInput {
	ralph_json_path: string; // Path to ralph.json in repo
	repo_url: string; // Git repo to work on
	branch?: string; // Base branch (default: main)
	pr_target?: string; // PR target branch
}

interface RalphRunOutput {
	status: 'success' | 'partial' | 'failed';
	iterations: number;
	pr_url?: string;
	metrics: {
		tokens_used: number;
		cost_usd: number;
		duration_ms: number;
	};
	summary: string;
}
```

---

## To Research

- [ ] MCP server implementation patterns
- [ ] Streaming progress updates via MCP
- [ ] Credential management best practices
- [ ] PR creation from Daytona sandbox
