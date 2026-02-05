---
name: forge-plan
description: Damascus workflow that forges implementation plans through multi-LLM review. Uses plan mode.
---

# Forge Plan

Forge an implementation plan using Anthropic's plan mode agent.

## Usage

```
/forge-plan [-n max] [-o output_path] [task description]
```

- `-o`: Output file path (optional — if omitted, determined automatically or asked)

Examples:
```
/forge-plan implement user authentication
/forge-plan -n 5 refactor the database layer
/forge-plan -o docs/plans/auth.md implement authentication
```

---

**Instructions:** Follow the `forge-orchestrator` skill to execute this workflow.

**Parse arguments:**
- Extract `-n [number]` if present → `max_iterations` (default: 3)
- Extract `-o [path]` if present → `output_path` (default: none)
- Remaining text → `task_description`

**Mode:** plan
**Output path:** (parsed from -o flag, or empty)
**User input:** $ARGUMENTS
