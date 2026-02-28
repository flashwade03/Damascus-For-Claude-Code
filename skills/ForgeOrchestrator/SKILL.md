---
name: Forge Orchestrator
description: This skill should be used when the user executes "/forge", "/forge-plan", or "/forge-doc" commands, or asks to "forge a plan", "forge a document", "run the forge workflow", or "review with multiple LLMs". Orchestrates iterative multi-LLM document forging.
---

# Forge Orchestrator

Iteratively improve documents through a repeated refinement loop — draft, review in parallel by multiple LLMs, refine until approved.

## Configuration

Parse from user input:
- `-n [number]` → `max_iterations` (default: 3)
- `-o [path]` → `output_path` (default: none)
- Remaining text → `task_description`

Example: `-n 5 -o docs/api/auth.md implement auth` → max_iterations=5, output_path="docs/api/auth.md", task="implement auth"

## Mode Selection

The command passes a **Mode** field to select the authoring agent:

| Mode | Agent | When |
|------|-------|------|
| `plan` | `damascus:planner` | Implementation plans (Anthropic plan mode) |
| `doc` | `damascus:author` | Technical documents — API specs, architecture, design docs |
| `auto` | Decide based on task | See below |

### Auto-Detection (mode=auto)

- Select `damascus:planner` for tasks about implementing, building, or changing code
- Select `damascus:author` for tasks about writing documents
- Default to `damascus:planner` when ambiguous

## Session ID

Retrieve the session ID for tracking:
```bash
npx tsx ${CLAUDE_PLUGIN_ROOT}/scripts/get-session-id.ts
```

Returns JSON with `shortId` (first 8 characters).

## Workflow Overview

```
  Author ──▶ Save ──▶ Metadata ──▶ Reviewers (parallel) ──▶ Judge
    ▲                                                         │
    └───────────── Needs work ────────────────────────────────┘
```

1. **Draft** — Invoke `damascus:planner` or `damascus:author` via Agent tool (resume on iteration 2+)
2. **Resolve path** — `-o` flag > project conventions > ask user (first iteration only)
3. **Save** — Orchestrator saves directly using Write tool (no writer agent)
4. **Metadata** — Run `plan-metadata.sh` to inject timestamps and session ID
5. **Review** — Launch enabled inspectors in parallel (Claude, Gemini, OpenAI)
6. **Consolidate** — Write all feedback to `.review.md` (always full overwrite)
7. **Judge** — APPROVED (no critical issues from ANY reviewer) or NEEDS_REVISION
8. **Loop** — If NEEDS_REVISION and iteration < max_iterations, return to step 1

For detailed step-by-step procedures and tool invocation examples, consult **`references/workflow.md`**.

For the review file template and output format, consult **`references/review-template.md`**.

## Key Rules

- **Resume authoring agent** — Store the `agentId` from the initial draft call. On iteration 2+, use `Agent(resume: agentId)` to preserve the agent's full codebase exploration context. Do NOT spawn a fresh agent each iteration.
- Resolve output path once on the first iteration, then reuse
- At least one inspector must be enabled — if all are disabled, save the document and end with a warning
- Run inspectors in parallel (**foreground calls in a single message** — never use `run_in_background` or `TaskOutput`)
- When refining, pass the **Consolidated Summary + Review History table** (not raw reviewer outputs)
- Loop ends early if document is APPROVED before max iterations
- Judge objectively — do not soften critical feedback
- Always overwrite `.review.md` completely (Write, not Edit) — compress previous iteration into history row first
