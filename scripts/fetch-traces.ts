/**
 * Fetch recent Langfuse traces for analysis
 */
import 'dotenv/config';

const public_key = process.env.LANGFUSE_PUBLIC_KEY;
const secret_key = process.env.LANGFUSE_SECRET_KEY;
const base_url =
	process.env.LANGFUSE_BASE_URL || 'https://cloud.langfuse.com';

if (!public_key || !secret_key) {
	console.error(
		'LANGFUSE_PUBLIC_KEY and LANGFUSE_SECRET_KEY required',
	);
	process.exit(1);
}

const auth = Buffer.from(`${public_key}:${secret_key}`).toString(
	'base64',
);

async function fetch_traces(limit = 5) {
	const url = new URL('/api/public/traces', base_url);
	url.searchParams.set('limit', String(limit));

	const res = await fetch(url.toString(), {
		headers: {
			Authorization: `Basic ${auth}`,
			'Content-Type': 'application/json',
		},
	});

	if (!res.ok) {
		const text = await res.text();
		throw new Error(
			`Failed to fetch traces: ${res.status} - ${text}`,
		);
	}

	return res.json();
}

async function fetch_trace_detail(trace_id: string) {
	const url = new URL(`/api/public/traces/${trace_id}`, base_url);

	const res = await fetch(url.toString(), {
		headers: {
			Authorization: `Basic ${auth}`,
			'Content-Type': 'application/json',
		},
	});

	if (!res.ok) {
		throw new Error(
			`Failed to fetch trace ${trace_id}: ${res.status}`,
		);
	}

	return res.json();
}

async function fetch_observations(trace_id: string) {
	const url = new URL('/api/public/observations', base_url);
	url.searchParams.set('traceId', trace_id);

	const res = await fetch(url.toString(), {
		headers: {
			Authorization: `Basic ${auth}`,
			'Content-Type': 'application/json',
		},
	});

	if (!res.ok) {
		throw new Error(
			`Failed to fetch observations for ${trace_id}: ${res.status}`,
		);
	}

	return res.json();
}

async function main() {
	console.log('Fetching recent traces...\n');

	const { data: traces } = await fetch_traces(3);

	for (const trace of traces) {
		console.log('='.repeat(60));
		console.log(`Trace: ${trace.name} (${trace.id})`);
		console.log(`Time: ${trace.timestamp}`);
		console.log(`Status: ${trace.metadata?.status || 'unknown'}`);
		console.log(
			`Iterations: ${trace.metadata?.iterations || 'unknown'}`,
		);
		console.log(
			`Duration: ${trace.metadata?.duration_ms || trace.latency || 'unknown'}ms`,
		);

		// Fetch observations (spans/generations) for this trace
		const { data: observations } = await fetch_observations(trace.id);

		console.log(`\nObservations (${observations.length}):`);

		for (const obs of observations) {
			const indent = obs.parentObservationId ? '  ' : '';
			const status =
				obs.metadata?.passed !== undefined
					? obs.metadata.passed
						? 'PASS'
						: 'FAIL'
					: '';

			console.log(`${indent}- ${obs.name} [${obs.type}] ${status}`);

			if (
				obs.name === 'backpressure-check' &&
				!obs.metadata?.passed
			) {
				console.log(`${indent}  Command: ${obs.input}`);
				console.log(
					`${indent}  Output: ${obs.output?.slice(0, 200) || 'none'}`,
				);
			}

			if (obs.name === 'agent-execution') {
				console.log(
					`${indent}  Input: ${obs.input?.slice(0, 100)}...`,
				);
			}
		}
		console.log('');
	}
}

main().catch(console.error);
