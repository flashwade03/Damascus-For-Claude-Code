---
name: forge
description: Damascus workflow that forges plans through multi-LLM review
---

# Forge

Like Damascus steel, plans become stronger through repeated forging.

## Workflow

1. **Planner** → Create initial plan draft
2. **Writer** → Save to file
3. **Reviewers** → Gemini + OpenAI + Claude parallel review
4. **Judge**:
   - Needs Work → Return to Step 1 for re-forging
   - Approved → Complete

## Usage

```
/forge [-n max] [task description]
```

- `-n`: Maximum forging iterations (default: 3)
- Early completion if approved

Examples:
```
/forge implement user authentication
/forge -n 5 complex architecture design
/forge -n 2 simple bug fix
```

---

**Instructions:** Follow the `forge-orchestrator` skill to execute this workflow.

**Parse arguments:**
- If `$ARGUMENTS` starts with `-n [number]`, extract `max_iterations` and the rest as `task_description`
- Otherwise, `max_iterations = 3` and `task_description = $ARGUMENTS`

**User input:** $ARGUMENTS
