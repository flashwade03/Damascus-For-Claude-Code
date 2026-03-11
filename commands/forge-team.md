---
name: forge-team
description: Damascus Agent Teams — multiple planners debate drafts, reviewers debate reviews, a scribe handles all writes. Teammates stay alive across rounds.
argument-hint: "[-n max] [-o path] <task description>"
---

# Forge Team

Forge a document using Agent Teams. Planners debate drafts together, reviewers discuss reviews, and a dedicated scribe handles all document writes. Teammates persist across rounds — no resume needed.

## Workflow

1. **Planners** (team) → Explore codebase, draft by domain area, discuss and merge
2. **Scribe** → Polish and write document, inject metadata
3. **Reviewers** (team) → Run external reviews (Gemini/OpenAI scripts), discuss together, reach verdict
4. **Loop** → If NEEDS_REVISION and rounds remaining, planners revise with consolidated feedback

## Usage

```
/forge-team [-n max] [-o output_path] [task description]
```

- `-n`: Maximum forging rounds (default: 3)
- `-o`: Output file path (optional — if omitted, determined automatically or asked)

Examples:
```
/forge-team implement user authentication
/forge-team -n 5 refactor the database layer
/forge-team -o docs/plans/auth.md implement authentication
```

---

**Instructions:** Follow the `forge-team-orchestrator` skill to execute this workflow.

**Parse arguments:**
- Extract `-n [number]` if present → `max_rounds` (default: 3)
- Extract `-o [path]` if present → `output_path` (default: none)
- Remaining text → `task_description`

**Mode:** auto
**Output path:** (parsed from -o flag, or empty)
**User input:** $ARGUMENTS
