/**
 * Telemetry module for ralph-gas
 *
 * Uses Langfuse + OpenTelemetry for observability
 */

import { Langfuse } from 'langfuse';

// Initialize Langfuse client
let langfuse: Langfuse | null = null;

/**
 * Initialize telemetry
 * Call this at startup before any tracing
 */
export function init_telemetry(): void {
	const public_key = process.env.LANGFUSE_PUBLIC_KEY;
	const secret_key = process.env.LANGFUSE_SECRET_KEY;

	if (!public_key || !secret_key) {
		console.log(
			'[Telemetry] Langfuse keys not set, telemetry disabled',
		);
		return;
	}

	langfuse = new Langfuse({
		publicKey: public_key,
		secretKey: secret_key,
		baseUrl:
			process.env.LANGFUSE_BASE_URL || 'https://cloud.langfuse.com',
	});

	console.log('[Telemetry] Langfuse initialized');
}

/**
 * Flush telemetry data
 * Call this before process exit
 */
export async function flush_telemetry(): Promise<void> {
	if (langfuse) {
		await langfuse.flushAsync();
	}
}

/**
 * Shutdown telemetry
 */
export async function shutdown_telemetry(): Promise<void> {
	if (langfuse) {
		await langfuse.shutdownAsync();
	}
}

/**
 * Create a trace for a Ralph loop run
 */
export function create_ralph_trace(config: {
	task?: string;
	features?: Array<{ id: string; description: string }>;
	max_iterations: number;
	budget_tokens: number;
}) {
	if (!langfuse) return null;

	const trace = langfuse.trace({
		name: 'ralph-loop',
		metadata: {
			task: config.task,
			feature_count: config.features?.length || 0,
			max_iterations: config.max_iterations,
			budget_tokens: config.budget_tokens,
		},
		tags: ['ralph-gas', 'orchestrator'],
	});

	return trace;
}

/**
 * Create a span for a single iteration
 */
export function create_iteration_span(
	trace: ReturnType<typeof create_ralph_trace>,
	iteration: number,
	feature_id?: string,
) {
	if (!trace) return null;

	return trace.span({
		name: `iteration-${iteration}`,
		metadata: {
			iteration,
			feature_id,
		},
	});
}

/**
 * Create a generation span for agent execution
 */
export function create_agent_generation(
	parent: ReturnType<typeof create_iteration_span>,
	task: string,
) {
	if (!parent) return null;

	return parent.generation({
		name: 'agent-execution',
		input: task,
		model: 'claude-sonnet-4-5', // TODO: make configurable
	});
}

/**
 * Record backpressure check result
 */
export function record_backpressure(
	parent: ReturnType<typeof create_iteration_span>,
	command: string,
	passed: boolean,
	output?: string,
) {
	if (!parent) return;

	parent.span({
		name: 'backpressure-check',
		input: command,
		output: output?.slice(0, 1000),
		metadata: {
			passed,
		},
	});
}

/**
 * Finalize trace with results
 */
export function finalize_trace(
	trace: ReturnType<typeof create_ralph_trace>,
	result: {
		status: string;
		iterations: number;
		tokens_used: number;
		duration_ms: number;
		features_completed?: number;
		pr_url?: string | null;
	},
) {
	if (!trace) return;

	trace.update({
		output: result,
		metadata: {
			status: result.status,
			iterations: result.iterations,
			tokens_used: result.tokens_used,
			duration_ms: result.duration_ms,
			features_completed: result.features_completed,
			pr_url: result.pr_url,
		},
	});
}

// Export for testing
export { langfuse as _langfuse_client };
