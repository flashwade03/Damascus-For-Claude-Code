---
name: Forge Orchestrator
description: Damascus workflow orchestrator. Used when executing /forge command. Forges plans and iterates until approved.
aliases: [forge-orchestrator]
---

# Forge Orchestrator

Like forging Damascus steel, this orchestrator iteratively improves plans through a repeated refinement workflow.

## Configuration

**Max Iterations**: Parse from user input. If `-n [number]` is provided, use that number. Otherwise, default to **3**.

Example:
- Input: `-n 5 implement auth` → max_iterations=5, task="implement auth"
- Input: `implement auth` → max_iterations=3, task="implement auth"

## Session-Based File Naming

Before starting, get the session ID:
```bash
npx tsx ${CLAUDE_PLUGIN_ROOT}/scripts/get-session-id.ts
```

Returns JSON with `shortId` (first 8 characters of session ID).

**File naming:**
- Plan file: `docs/plans/{shortId}.md`
- Review file: `docs/plans/{shortId}.review.md`

If the plan file already exists, you are **refining** an existing plan.

## Workflow

```
    ┌─────────────────────────────────────────┐
    │  Get Session ID (get-session-id.ts)     │
    └────────────────┬────────────────────────┘
                     ▼
    ┌─────────────────────────────────────────┐
    │  Task(damascus:planner)                 │◀──────┐
    │  Create plan draft                      │       │
    └────────────────┬────────────────────────┘       │
                     ▼                                │
    ┌─────────────────────────────────────────┐       │
    │  Task(damascus:writer)                  │       │
    │  Save to file                           │       │
    └────────────────┬────────────────────────┘       │
                     ▼                                │
    ┌─────────────────────────────────────────┐       │
    │  Collect Reviews (PARALLEL)             │       │
    │  ├─ Task(damascus:claude-reviewer)      │       │
    │  ├─ Bash(gemini-review.ts)              │       │
    │  └─ Bash(openai-review.ts)              │       │
    └────────────────┬────────────────────────┘       │
                     ▼                                │
    ┌─────────────────────────────────────────┐       │
    │  Consolidate → Write .review.md         │       │
    └────────────────┬────────────────────────┘       │
                     ▼                                │
    ┌─────────────────────────────────────────┐ Needs │
    │  Judge - Approval decision              │───────┘
    └────────────────┬────────────────────────┘ Work
                     │ Approved
                     ▼
                   DONE
```

## Step 1: Call Planner

Use the Task tool to invoke the planner subagent:

**For new plan:**
```
Task(
  subagent_type: "damascus:planner",
  description: "Forge initial plan",
  prompt: "Create a detailed implementation plan for: [USER_TASK]

Analyze the codebase and return the complete plan as markdown text.
The plan will be saved to: docs/plans/{shortId}.md"
)
```

**For refinement (plan file exists):**
```
Task(
  subagent_type: "damascus:planner",
  description: "Refine plan based on feedback",
  prompt: "Refine the implementation plan based on review feedback.

Current plan: docs/plans/{shortId}.md
[EXISTING PLAN CONTENT]

Review feedback:
[REVIEW FEEDBACK]

Return the refined plan as markdown text."
)
```

## Step 2: Call Writer

After planner returns the plan text, call the writer:

```
Task(
  subagent_type: "damascus:writer",
  description: "Record plan to file",
  prompt: "Save the following plan to docs/plans/{shortId}.md:

[PLAN TEXT FROM SMITH]"
)
```

## Step 3: Collect Reviews (Parallel)

First, read `${CLAUDE_PLUGIN_ROOT}/settings.local.md` to check which inspectors are enabled:

```yaml
enable_claude_review: true
enable_gemini_review: true
enable_openai_review: false
```

Then launch enabled inspectors in parallel (single message, multiple tool calls):

**Claude Inspector** (if enabled):
```
Task(
  subagent_type: "damascus:claude-reviewer",
  description: "Claude inspection of plan",
  prompt: "Review the implementation plan at: [PLAN FILE PATH]"
)
```

**Gemini Inspector** (if enabled):
```
Bash(command: "CLAUDE_PLUGIN_ROOT=${CLAUDE_PLUGIN_ROOT} npx tsx ${CLAUDE_PLUGIN_ROOT}/scripts/gemini-review.ts [PLAN FILE PATH]")
```

**OpenAI Inspector** (if enabled):
```
Bash(command: "CLAUDE_PLUGIN_ROOT=${CLAUDE_PLUGIN_ROOT} npx tsx ${CLAUDE_PLUGIN_ROOT}/scripts/openai-review.ts [PLAN FILE PATH]")
```

## Step 4: Consolidate Reviews

After all inspections complete, consolidate them into `docs/plans/{shortId}.review.md`.

**IMPORTANT**: Always overwrite the review file completely with new content:
1. If file exists, use `Read` tool first (required before Write)
2. Then use `Write` tool to replace entire content with new review
3. Do NOT use `Edit` to partially update - always full replacement

```markdown
---
plan_file: docs/plans/{shortId}.md
revision: N
reviewed_at: [timestamp]
reviewers: [gemini, openai, claude]
verdict: [APPROVED | NEEDS_REVISION]
---

# Forge Review - [Plan Title]

## Iteration N

### Claude Inspection
[Claude's feedback]

### Gemini Inspection
[Gemini's feedback]

### OpenAI Inspection (if enabled)
[OpenAI's feedback]

---

## Consolidated Summary

### Critical Issues
- [List of must-fix items from all inspectors]

### Suggestions
- [List of nice-to-have improvements]

---

## Final Verdict: [APPROVED | NEEDS_REVISION]
```

## Step 5: Judge

**APPROVED** if:
- No critical issues mentioned
- Only minor suggestions or style preferences

**NEEDS_REVISION** if:
- Missing required sections
- Unclear requirements
- Technical feasibility concerns
- Missing test plan
- Dependency issues

## Step 6: Loop or Complete

If **NEEDS_REVISION** and iteration < max_iterations:
- Go back to Step 1
- Include the review feedback in the planner prompt

If **APPROVED** or iteration >= max_iterations:
- Report final status to user
- Provide links to plan and review files

## Output Format

After completion, report:

```
## Forge Complete ⚔️

**Session**: {shortId}
**Status**: [APPROVED / NEEDS_REVISION (max iterations reached)]
**Iterations**: N / max_iterations
**Plan**: docs/plans/{shortId}.md
**Review**: docs/plans/{shortId}.review.md

[Brief summary of the plan]
```

## Important

- Maximum iterations configurable via `-n` flag (default: 3)
- Loop ends early if plan is APPROVED before max iterations
- Always pass full review feedback when refining
- Run inspectors in parallel when possible (single message, multiple tool calls)
- Be objective in judging - don't soften critical feedback
