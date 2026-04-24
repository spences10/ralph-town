# Contributing to Ralph-Town

## Reporting Issues

- Search existing issues before opening a new one
- Include steps to reproduce the problem
- Provide relevant environment info (OS, Node/pnpm version)

## Submitting Pull Requests

1. Fork the repo and create a branch from `main`
2. Make your changes
3. Run `pnpm run build` to verify the build passes
4. Submit a PR with a clear description

## Code Style

- **snake_case** for functions and variables
- **PascalCase** for classes
- **SCREAMING_SNAKE_CASE** for constants
- Use Prettier formatting (tabs, single quotes, trailing commas)

## Development Setup

Use pnpm:

```bash
pnpm install
pnpm dev          # Development mode
pnpm run build    # Compile TypeScript
```

## Before Submitting

- Run `pnpm run build` to ensure no TypeScript errors
- Keep commits focused and atomic
- Use conventional commit messages (e.g., `feat:`, `fix:`, `docs:`)
