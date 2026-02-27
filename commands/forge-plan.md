---
name: forge-plan
description: Damascus workflow that forges implementation plans through multi-LLM review. Uses plan mode for deep codebase exploration before planning.
argument-hint: "[-n max] [-o path] <task description>"
---

# Forge Plan

Forge an implementation plan using Anthropic's plan mode agent.
The planner deeply explores the codebase first, then creates a grounded plan — not a generic template.

## Workflow

1. **Planner** (Opus, plan mode) → Explore codebase and create implementation plan
2. **Writer** → Save to file
3. **Reviewers** → Multi-LLM parallel review (Claude / Gemini / OpenAI)
4. **Judge** → Approve or request re-forging (up to `-n` iterations)

## Usage

```
/forge-plan [-n max] [-o output_path] [task description]
```

- `-n`: Maximum forging iterations (default: 3)
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
