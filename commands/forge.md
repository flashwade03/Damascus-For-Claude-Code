---
name: forge
description: Damascus workflow that forges documents through multi-LLM review. Auto-detects whether to create a plan or a document.
---

# Forge

Like Damascus steel, documents become stronger through repeated forging.

## Workflow

1. **Author/Planner** → Create initial draft
2. **Writer** → Save to file
3. **Reviewers** → Multi-LLM parallel review
4. **Judge**:
   - Needs Work → Return to Step 1 for re-forging
   - Approved → Complete

## Usage

```
/forge [-n max] [-o output_path] [task description]
```

- `-n`: Maximum forging iterations (default: 3)
- `-o`: Output file path (optional — if omitted, determined automatically or asked)
- Early completion if approved

Examples:
```
/forge implement user authentication
/forge write API spec for the payment module
/forge -n 5 architecture document for the notification system
/forge -o docs/api/payment.md write API spec for payment
```

---

**Instructions:** Follow the `forge-orchestrator` skill to execute this workflow.

**Parse arguments:**
- Extract `-n [number]` if present → `max_iterations` (default: 3)
- Extract `-o [path]` if present → `output_path` (default: none)
- Remaining text → `task_description`

**Mode:** auto
**Output path:** (parsed from -o flag, or empty)
**User input:** $ARGUMENTS
