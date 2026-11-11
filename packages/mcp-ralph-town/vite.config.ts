import { fileURLToPath } from 'node:url';
import { defineConfig } from 'vite-plus';

export default defineConfig({
	pack: {
		entry: ['src/index.ts'],
		format: ['esm'],
		sourcemap: true,
		dts: false,
		outExtensions: () => ({ js: '.js' }),
	},
	test: {
		alias: {
			'ralph-town/operations': fileURLToPath(
				new URL('../cli/src/operations.ts', import.meta.url),
			),
		},
		include: ['src/**/*.test.ts'],
	},
	fmt: {
		useTabs: true,
		singleQuote: true,
		printWidth: 70,
		trailingComma: 'all',
		proseWrap: 'always',
	},
	lint: {
		options: {
			typeAware: true,
			typeCheck: true,
		},
	},
});
