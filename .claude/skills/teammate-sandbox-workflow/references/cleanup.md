# Sandbox Lifecycle & Cleanup

## When to Delete

Delete sandbox AFTER:
- PR is merged, OR
- Teammate confirms work complete, OR
- Teammate reports unrecoverable error

## Cleanup Command

```bash
ralph-town sandbox delete <sandbox-id>
```

## Track Active Sandboxes

Keep mapping of teammate -> sandbox-id:

| Teammate | Sandbox ID | Task |
|----------|-----------|------|
| worker-1 | abc-123... | #42 |
| worker-2 | def-456... | #43 |

## Bulk Cleanup

After team completes:

```bash
ralph-town sandbox list
# Delete each sandbox
ralph-town sandbox delete <id-1>
ralph-town sandbox delete <id-2>
```

## Fail Fast Rule

If teammate reports sandbox issues:
1. Delete broken sandbox
2. Create fresh sandbox
3. Re-assign teammate

Don't debug sandbox issues - faster to recreate.
