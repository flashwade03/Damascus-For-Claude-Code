---
name: forge-team-orchestrator
description: "Internal orchestration procedure for the /forge-team slash command. Only activates when the forge-team command handler explicitly references this skill by name."
---

# forge-team-orchestrator

You are the **Lead** of an Agent Team. You orchestrate rounds of planning, writing, and reviewing — but you do NOT write documents or make review judgments yourself.

## Configuration

Parse from user input:
- `-n [number]` → `max_rounds` (default: 3)
- `-o [path]` → `output_path` (default: none)
- Remaining text → `task_description`

## Mode Selection

The command passes a **Mode** field:

| Mode | Planner Focus | When |
|------|--------------|------|
| `plan` | Implementation plans (codebase exploration first) | Implementation tasks |
| `doc` | Technical documents — API specs, architecture, design docs | Documentation tasks |
| `auto` | Detect from task keywords | Default |

### Auto-Detection

- `plan` for: implement, build, change, refactor, develop, add, fix, migrate, upgrade
- `doc` for: write, document, specify, design doc, API spec, architecture
- Default to `plan` when ambiguous

## Setup Phase

### 0. Resolve Plugin Root

`CLAUDE_PLUGIN_ROOT` is provided by the Claude Code plugin system. Detect it first:
```
Bash(command: "echo $CLAUDE_PLUGIN_ROOT")
```

If empty, derive from this skill file's location — strip `/skills/ForgeTeamOrchestrator/SKILL.md` from the path where this file resides. Store the resolved path as `PLUGIN_ROOT` and use it for all subsequent script invocations.

### 1. Session ID

Retrieve once at startup:
```
Bash(command: "npx tsx ${PLUGIN_ROOT}/scripts/get-session-id.ts")
```
Returns JSON with `shortId` (first 8 characters).

### 2. Read Settings

Read `${CLAUDE_PROJECT_DIR}/.claude/damascus.local.md` to check enabled reviewers:
```yaml
enable_claude_review: true
enable_gemini_review: true
enable_openai_review: false
```

If **no reviewers are enabled**, skip team creation — save the document directly using the v3 sequential workflow and warn the user.

### 3. Determine Team Size & Models

**Explorer count**: Decide based on the task — how many distinct domain areas need exploration.
**Planner**: Always 1 — the planner manages all explorers and creates the final plan.

**Model assignment**: Choose models based on task complexity. Guidelines:
- **reviewer-gemini, reviewer-openai**: Always `haiku` — they only run scripts and relay results.
- **explorers**: Use cheaper models (haiku/sonnet) — they explore and report findings.
- **planner**: Use stronger models (sonnet/opus) — synthesizes findings into a coherent plan.
- **Other roles**: Lead decides based on complexity.

Record your decisions — you will use these exact values in Step 6. Only include reviewers that are **enabled** in settings:
```
Model decisions:
- explorers: [haiku | sonnet | opus]
- planner: [haiku | sonnet | opus]
- scribe: [haiku | sonnet | opus]
- reviewer-claude: [haiku | sonnet | opus]  ← only if enable_claude_review: true
- reviewer-gemini: haiku                     ← only if enable_gemini_review: true
- reviewer-openai: haiku                     ← only if enable_openai_review: true
```

Reviewer count — spawn one teammate per **enabled** reviewer only. Do NOT spawn disabled reviewers.
Scribe is always 1.

### 4. Resolve Output Path

Priority (first round only, then reuse):
1. Explicit `-o` flag
2. Project conventions — `Glob("docs/**/*.md")` to detect existing doc directories
3. Ask user with suggested paths

### 5. Create Team

```
TeamCreate(
  team_name: "damascus-forge",
  description: "Forging: [TASK_DESCRIPTION]"
)
```

### 6. Spawn Teammates

**MANDATORY**: Before spawning, you MUST:
1. `Read("references/teammate-prompts.md")` — Read the file using the Read tool
2. Extract the exact text inside each role's `Spawn prompt:` code block
3. Use that extracted text verbatim as the `prompt` parameter
4. Do NOT write prompts from memory — the file is the single source of truth

Spawn all teammates in a single message (parallel Agent calls). Each joins the team via `team_name`.

Use the model values you recorded in Step 3. You MUST include the `model` parameter — omitting it causes unpredictable model selection.

**Explorers** — `subagent_type: "Explore"` (Read/Glob/Grep/Bash, no plan mode):
```
Agent(
  team_name: "damascus-forge",
  name: "explorer-[N]",
  subagent_type: "Explore",
  model: [your Step 3 explorer model],
  prompt: [EXACT text from ## Explorer spawn prompt code block, with [N] replaced]
)
```
Repeat for each explorer.

**Planner** — `subagent_type: "Explore"`, `mode: "plan"` (plan mode, single instance):
```
Agent(
  team_name: "damascus-forge",
  name: "planner",
  subagent_type: "Explore",
  mode: "plan",
  model: [your Step 3 planner model],
  prompt: [EXACT text from ## Planner spawn prompt code block]
)
```
Only one planner. The planner manages explorers and creates the final plan.

**Scribe** — `subagent_type: "general-purpose"` (needs Write tool):
```
Agent(
  team_name: "damascus-forge",
  name: "scribe",
  subagent_type: "general-purpose",
  model: [your Step 3 scribe model],
  prompt: [EXACT text from ## Scribe spawn prompt code block]
)
```

**Reviewers** — Only spawn reviewers that are **enabled** in settings (Step 2). Skip disabled ones entirely — do not spawn them.

Reviewer-claude (only if `enable_claude_review: true`):
```
Agent(
  team_name: "damascus-forge",
  name: "reviewer-claude",
  subagent_type: "Explore",
  model: [your Step 3 reviewer-claude model],
  prompt: [EXACT text from ## Reviewer — Claude spawn prompt code block]
)
```

Reviewer-gemini (only if `enable_gemini_review: true`):
```
Agent(
  team_name: "damascus-forge",
  name: "reviewer-gemini",
  subagent_type: "Explore",
  model: "haiku",
  prompt: [EXACT text from ## Reviewer — Gemini spawn prompt code block]
)
```

Reviewer-openai (only if `enable_openai_review: true`):
```
Agent(
  team_name: "damascus-forge",
  name: "reviewer-openai",
  subagent_type: "Explore",
  model: "haiku",
  prompt: [EXACT text from ## Reviewer — OpenAI spawn prompt code block]
)
```

**Verification**: After spawning, the prompts in each Agent call must match the file content. Key checks:
- Planner: "call ExitPlanMode to submit your plan to Lead"
- Planner must have `mode: "plan"` set
- Explorers: "report findings to 'planner'" and "preliminary and final"
- Reviewers: "review independently" and "Lead collects all reviews and determines the verdict"
- No prompt should contain "COORDINATOR" or "coordinator"

### No Coordinators

No coordinator roles among reviewers.
- **Planner**: Single planner manages explorers and submits plan to Lead.
- **Reviewers**: Each sends their review to Lead. Lead determines the verdict.

## Round Execution

For detailed step-by-step procedures and tool invocations for each round phase, consult **`references/round-flow.md`**.

### Workflow Overview

```
  Setup → Create Team → Spawn Teammates (planner in plan mode)
       │
       ▼
  ┌─── Round N ──────────────────────────────────────────────────┐
  │                                                              │
  │  Lead ──msg──▶ Planner (task + explorer list)                │
  │  Planner ──msg──▶ Explorers (assign areas)                   │
  │  Explorers ──msg──▶ Planner (preliminary findings)           │
  │  Planner ──msg──▶ Explorers (cross-findings + gap check)     │
  │  Explorers ──msg──▶ Planner (final findings)                 │
  │  Planner ──ExitPlanMode──▶ Lead (plan_approval_request)      │
  │  Lead ──plan_approval_response──▶ Planner (approve)          │
  │                                                              │
  │  Lead ──msg──▶ Scribe (polish plan, write)                   │
  │  Scribe ──msg──▶ Lead (write confirmed)                      │
  │                                                              │
  │  Lead ──msg──▶ Reviewers (review independently)              │
  │  Each reviewer ──msg──▶ Lead (own review)                    │
  │  Lead: collect all reviews, determine verdict                │
  │                                                              │
  │  Lead ──msg──▶ Scribe (write .review.md)                     │
  │  Scribe ──msg──▶ Lead (review file confirmed)                │
  │                                                              │
  └──────────────────────────────────────────────────────────────┘
       │
       ▼  APPROVED or max rounds
  Shutdown → TeamDelete → Report to user
```

## Shutdown

After final round (APPROVED or max rounds reached):

1. Send `shutdown_request` to each teammate:
```
SendMessage(
  type: "shutdown_request",
  recipient: "[TEAMMATE_NAME]",
  content: "Forge complete. Shutting down."
)
```

2. Wait for all shutdown responses.

3. Delete the team:
```
TeamDelete()
```

4. Report final status to user:
```
## Forge Complete

**Session**: {shortId}
**Mode**: [plan | doc]
**Status**: [APPROVED / NEEDS_REVISION (max rounds reached)]
**Rounds**: N / max_rounds
**Document**: [DOCUMENT_PATH]
**Review**: [REVIEW_PATH]

[Brief summary of the document]
```

## Key Rules

- **Lead does NOT write files** — Only the Scribe uses Write tool on documents and .review.md.
- **Lead determines the verdict** — Lead collects all reviews and applies the verdict rule: any CRITICAL issue → NEEDS_REVISION, otherwise → APPROVED.
- **Phases are sequential** — Plan → Write → Review → Consolidate. Each completes before the next begins.
- **Teammates stay alive** — Do NOT shut down teammates between rounds. Context is naturally preserved.
- **Planner uses plan mode** — Single planner operates in plan mode. Manages explorers internally. Calls ExitPlanMode to submit plan (approve immediately). Lead does NOT intervene during planning.
- **Reviewers are equal** — No coordinator. Each reviewer sends their review to Lead. Lead determines the verdict.
- **Resolve output path once** — First round only, then reuse.
- **At least one reviewer must be enabled** — If all disabled, skip team workflow entirely.
- **Scribe handles all file writes** — Both the target document and the .review.md file.
