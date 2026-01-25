# Telemetry & Observability

Capturing data from sandbox agents to improve the workflow.

**Status: Implemented** - See `src/telemetry.ts`

---

## Why Telemetry Matters

For testing and iteration:

- **Prove it works** - concrete metrics for decision makers
- **Debug issues** - trace what went wrong
- **Optimize costs** - see where tokens are spent
- **Improve prompts** - identify patterns in agent behavior

---

## Options

### 1. Langfuse (Recommended for LLM-specific)

Purpose-built LLM observability. Has direct Claude Agent SDK
integration.

**Pros:**

- Native Claude Agent SDK support
- LLM-specific metrics (tokens, costs, latency)
- Nice UI for exploring traces
- Can self-host or use cloud

**Integration:**

```typescript
import { observe, propagate_attributes, get_client } from 'langfuse';

const langfuse = get_client();

@observe()
async function run_agent(task: string) {
	with propagate_attributes({
		user_id: 'user_123',
		session_id: 'session_abc',
		tags: ['ralph-town', 'test-run'],
		metadata: { task_type: 'refactor' },
	}) {
		// Agent code here
		const result = await agent.run(task);

		langfuse.update_current_trace({
			input: task,
			output: result,
		});

		return result;
	}
}
```

**Docs:**
https://langfuse.com/integrations/frameworks/claude-agent-sdk

---

### 2. OpenTelemetry (Standard, Flexible)

Industry-standard observability. More backends, more control.

**Pros:**

- Works with any OTEL backend (Jaeger, Grafana, Datadog, etc.)
- Not locked to one vendor
- Rich ecosystem

**Libraries:**

- **OpenLLMetry** (Traceloop) - OTEL extensions for LLMs
- **OpenLIT** - Auto-instrumentation for Anthropic

**Integration:**

```typescript
import { trace } from '@opentelemetry/api';
import { OTLPTraceExporter } from '@opentelemetry/exporter-trace-otlp-http';

const tracer = trace.getTracer('ralph-town');

async function run_agent(task: string) {
	return tracer.startActiveSpan('agent.run', async (span) => {
		span.setAttribute('task', task);
		span.setAttribute('agent.type', 'developer');

		const result = await agent.run(task);

		span.setAttribute('tokens.used', result.tokens);
		span.setAttribute('iterations', result.iterations);
		span.end();

		return result;
	});
}
```

---

### 3. Both: OTEL → Langfuse

Use standard OTEL, export to Langfuse for the nice UI.

Langfuse accepts OTEL data via their collector endpoint:

```yaml
exporters:
  otlphttp/langfuse:
    endpoint: 'https://cloud.langfuse.com/api/public/otel'
    headers:
      Authorization: 'Basic ${AUTH_STRING}'
```

---

## What to Capture

### Per Agent Call

| Metric          | Type    | Purpose                   |
| --------------- | ------- | ------------------------- |
| `tokens_input`  | counter | Track input costs         |
| `tokens_output` | counter | Track output costs        |
| `duration_ms`   | gauge   | Latency measurement       |
| `tool_calls`    | counter | How many tools used       |
| `iteration`     | gauge   | Which loop iteration      |
| `success`       | boolean | Did it complete correctly |

### Per Task (Ralph Loop)

| Metric             | Type    | Purpose                 |
| ------------------ | ------- | ----------------------- |
| `total_iterations` | counter | How many loops needed   |
| `total_tokens`     | counter | Full task token cost    |
| `total_cost_usd`   | gauge   | Estimated dollar cost   |
| `criteria_met`     | boolean | Did acceptance pass     |
| `exit_reason`      | string  | success/max_iter/budget |

### Trace Structure

```
ralph_task (trace)
├── iteration_1 (span)
│   ├── agent_call (span)
│   │   ├── tool: Read (span)
│   │   ├── tool: Write (span)
│   │   └── tool: Bash (span)
│   └── evaluate_criteria (span)
├── iteration_2 (span)
│   └── ...
└── final_result (span)
```

---

## Recommendation

**Start with Langfuse Cloud** for these reasons:

1. Already has Claude Agent SDK integration
2. LLM-specific metrics out of the box
3. Easy to set up for testing
4. Can migrate to pure OTEL later if needed

**Decision:** Cloud for POC, self-host later if needed.

**Environment setup:**

```bash
# .env
LANGFUSE_SECRET_KEY=sk-lf-...
LANGFUSE_PUBLIC_KEY=pk-lf-...
LANGFUSE_HOST=https://cloud.langfuse.com
```

---

## Current Implementation

See `src/telemetry.ts` for the implementation.

**Approach:** Orchestrator-side telemetry only. Decided against passing
Langfuse credentials into sandbox - adds complexity for minimal
benefit since orchestrator already captures agent execution data.

**Actual trace structure:**

```
ralph-loop (trace)
├── iteration-1 (span)
│   ├── agent-execution (generation)
│   └── backpressure-check (span)
├── iteration-2 (span)
│   └── ...
└── final metadata (status, tokens, duration)
```

---

## Querying Data

### SDK Methods (TypeScript)

```typescript
import { LangfuseClient } from '@langfuse/client';

const langfuse = new LangfuseClient();

// List traces with filters
const traces = await langfuse.api.trace.list({
	tags: ['ralph-town'],
	limit: 100,
	fromTimestamp: '2025-01-01T00:00:00Z',
	orderBy: 'timestamp.desc',
});

// Get single trace with full details
const trace = await langfuse.api.trace.get('trace-id');
```

**Available filters:** `userId`, `sessionId`, `name`, `tags`,
`version`, `release`, `environment`, `fromTimestamp`, `toTimestamp`,
plus advanced JSON filters for latency, tokens, costs.

### Metrics API (aggregated)

```bash
curl -H "Authorization: Basic <AUTH>" \
  -G --data-urlencode 'query={
    "view": "traces",
    "metrics": [{"measure": "count", "aggregation": "count"}],
    "dimensions": [{"field": "name"}],
    "fromTimestamp": "...",
    "toTimestamp": "..."
  }' \
  https://cloud.langfuse.com/api/public/metrics
```

Gets p50/p90 latency, token totals, costs grouped by dimensions.

---

## To Research

- [x] Langfuse Claude Agent SDK integration - using direct API
- [x] How to pass telemetry into sandbox - decided: don't, orchestrator
      captures agent output
- [ ] Self-hosting Langfuse vs cloud
- [ ] Cost of Langfuse cloud for team usage
- [ ] Correlation IDs across orchestrator → agent
