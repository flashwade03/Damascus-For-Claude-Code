---
name: forge-team
description: Damascus Agent Teams — parallel explorers investigate, a single planner synthesizes, a scribe writes, reviewers judge independently. Teammates stay alive across rounds.
argument-hint: "[-n max] [-o path] <task description>"
---

# Forge Team

Forge a document using Agent Teams. Parallel explorers investigate different codebase areas, a single planner synthesizes findings into a plan, a scribe writes the document, and reviewers (Claude/Gemini/OpenAI) judge independently. Teammates persist across rounds — no resume needed.

## Workflow

1. **Explorers** (N) → Investigate assigned codebase areas, report findings to Planner
2. **Planner** (1) → Synthesize explorer findings, create plan via ExitPlanMode
3. **Scribe** → Polish and write document, inject metadata
4. **Reviewers** → Run reviews independently (Claude/Gemini/OpenAI), send to Lead who determines verdict
5. **Loop** → If NEEDS_REVISION and rounds remaining, planner revises with consolidated feedback

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
