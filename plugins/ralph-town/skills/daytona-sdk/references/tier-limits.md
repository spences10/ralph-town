# Tier Limitations

| Feature               | Preview (1-2)         | Tier 3+   |
| --------------------- | --------------------- | --------- |
| Internet access       | Restricted (npm only) | Full      |
| Snapshot creation     | Forbidden             | Available |
| curl to external URLs | Blocked               | Allowed   |
| corepack/pnpm setup   | Available             | Available |

## Preview Tier Workaround

Use Node.js package-manager commands:

```typescript
await sandbox.process.executeCommand(
	'npm init -y && npm install <package>',
);
```

## Pricing Reference

| Resource      | Per Hour  |
| ------------- | --------- |
| vCPU          | $0.0504   |
| Memory (GiB)  | $0.0162   |
| Storage (GiB) | $0.000108 |

- $200 free credits included
- Startups: up to $50k credits available
- Source: daytona.io/pricing

## Notes

- PR #3241 adds Node.js, pnpm + Claude Agent SDK to default image
  (pending)
