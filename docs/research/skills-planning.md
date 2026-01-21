# Skills Planning

Claude skills to create once patterns are proven.

---

## Philosophy

Skills encode **proven patterns** for future Claude sessions. Create
skills only after patterns are validated through testing.

---

## Current Skills

| Skill         | Location                      | Status                     |
| ------------- | ----------------------------- | -------------------------- |
| `daytona-sdk` | `.claude/skills/daytona-sdk/` | Exists - basic SDK gotchas |

---

## Planned Skills

| Skill                  | Purpose                                  | When to Create              |
| ---------------------- | ---------------------------------------- | --------------------------- |
| `daytona-sdk` (expand) | Orchestration patterns (snapshots, etc.) | After testing orchestration |
| `ralph-loop`           | Acceptance criteria loop, exit conditions | After nailing criteria format |
| `agent-orchestration`  | Multi-agent coordination, state sharing  | If reusable patterns emerge |
| `gas-town`             | Resource tracking, budget enforcement    | After budget model validated |

---

## Skill Creation Criteria

Create a skill when:

- Pattern is **tested and working**
- Knowledge will be **reused across sessions**
- Instructions are **procedural, not conceptual**

---

## Skill Structure Reference

```
my-skill/
├── SKILL.md          # Core instructions + YAML frontmatter
├── references/       # Detailed documentation
├── scripts/          # Executable operations
└── assets/           # Templates, files
```

See `toolkit-skills:skill-creator` for detailed guidance.
