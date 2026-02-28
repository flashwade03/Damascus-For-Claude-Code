# Forge Workflow — Detailed Steps

## Step 1: Create Draft

Invoke the selected authoring agent via the Agent tool.

**Initial draft (iteration 1):**
```
Agent(
  subagent_type: "damascus:planner" or "damascus:author",
  description: "Forge initial draft",
  prompt: "[USER_TASK]

Analyze the codebase and return the complete document as markdown text."
)
```

**IMPORTANT**: Store the `agentId` returned from this call. It will be used to `resume` the agent in subsequent iterations, preserving its full codebase exploration context.

**Refinement (iteration 2+ — resume the agent):**
```
Agent(
  subagent_type: "damascus:planner" or "damascus:author",
  resume: [AGENT_ID from iteration 1],
  prompt: "The document has been reviewed. Refine it based on this feedback:

[CONSOLIDATED_REVIEW — include the Consolidated Summary section (Critical Issues + Suggestions)
from the .review.md file, plus the Review History table. Do NOT include raw reviewer outputs.]

Return the refined document as markdown text."
)
```

The resumed agent retains its full previous context — all codebase files it read, patterns it discovered, and reasoning. You do NOT need to pass the existing document content again. The agent will naturally do targeted re-exploration only for issues raised in the review.

## Step 2: Resolve Output Path

On the first iteration only, determine the output path using the priority chain:

1. **Explicit `-o` flag** — Use the provided path exactly
2. **Project conventions** — Scan with `Glob("docs/**/*.md")` and `Glob("**/README.md")` to detect existing doc directories
3. **Ask the user** — Use AskUserQuestion with suggested paths based on document type

```
AskUserQuestion(
  questions: [{
    question: "Where should this document be saved?",
    header: "Output path",
    options: [
      { label: "docs/{suggested_name}.md", description: "Based on document type" },
      { label: "{another_relevant_path}.md", description: "Alternative location" }
    ]
  }]
)
```

The review file is always saved alongside: `{document_dir}/{document_name}.review.md`

## Step 3: Save to File

Save the document directly (no writer agent — the orchestrator handles this):

1. If the file already exists, **Read it first** (required by the Write tool for overwrites)
2. Use the **Write** tool to save the document to `[DOCUMENT_PATH]`

## Step 4: Inject Metadata

Inject timestamps and session ID into the document's frontmatter.

1. Get the session ID (retrieve once here in Step 4 on the first iteration, then reuse the value for all subsequent iterations):
```
Bash(command: "npx tsx ${CLAUDE_PLUGIN_ROOT}/scripts/get-session-id.ts")
```
This returns JSON with a `shortId` field (first 8 chars of the session ID).

2. Inject metadata using the shortId:
```
Bash(command: "echo '{\"file_path\": \"[DOCUMENT_PATH]\"}' | CLAUDE_SESSION_ID=[SHORT_ID] ${CLAUDE_PLUGIN_ROOT}/scripts/plan-metadata.sh")
```

This adds `created`, `modified`, and `session_id` fields.

> **Note**: `CLAUDE_PLUGIN_ROOT` is provided by the Claude Code plugin system.
> If it is not set in the Bash environment, use the path where this skill file resides
> (strip `/skills/ForgeOrchestrator/SKILL.md` from this file's path).

## Step 5: Collect Reviews (Parallel)

First, read `${CLAUDE_PROJECT_DIR}/.claude/damascus.local.md` to check which inspectors are enabled:

```yaml
enable_claude_review: true
enable_gemini_review: true
enable_openai_review: false
```

If **no inspectors are enabled**, skip the review cycle entirely:
- Save the document (Steps 3-4) and report to the user:
  "No reviewers enabled. Document saved without review. Enable at least one reviewer in `.claude/damascus.local.md` to use the forge workflow."
- Do NOT loop — end the workflow immediately.

Launch enabled inspectors as **foreground parallel calls in a single message**.

> **IMPORTANT**: Do NOT use `run_in_background` for any reviewer.
> Place all tool calls (Agent + Bash + Bash) in the same message —
> the system automatically runs them in parallel and returns all results together.
> Using `run_in_background` causes unnecessary timeouts and complexity.

**Claude Inspector** (if enabled):
```
Agent(
  subagent_type: "damascus:claude-reviewer",
  description: "Claude inspection",
  prompt: "Review the [plan|doc] at: [DOCUMENT_PATH]"
)
```

**Gemini Inspector** (if enabled):
```
Bash(command: "CLAUDE_PLUGIN_ROOT=${CLAUDE_PLUGIN_ROOT} npx tsx ${CLAUDE_PLUGIN_ROOT}/scripts/gemini-review.ts [DOCUMENT_PATH] --mode [plan|doc]")
```

**OpenAI Inspector** (if enabled):
```
Bash(command: "CLAUDE_PLUGIN_ROOT=${CLAUDE_PLUGIN_ROOT} npx tsx ${CLAUDE_PLUGIN_ROOT}/scripts/openai-review.ts [DOCUMENT_PATH] --mode [plan|doc]")
```

All three calls go in a single message. Do NOT use `run_in_background` or `TaskOutput`.

## Step 6: Consolidate Reviews

After all inspections complete, consolidate into `{document_dir}/{document_name}.review.md`.

**IMPORTANT**: Always overwrite the review file completely:
1. If file exists, **Read it first** (required before Write)
2. If this is iteration > 1:
   a. **Preserve all existing rows** in the Review History table
   b. **Append** a new row by compressing the previous "Current Iteration" section (verdict + key issues in ≤15 words)
3. Write the new Current Iteration with full raw reviews + consolidated summary
4. Use Write tool to replace entire content — do NOT use Edit to partially update

See `references/review-template.md` for the exact structure.

## Step 7: Judge

Consolidate all reviews and make a single verdict:

**APPROVED** if:
- No reviewer found critical correctness issues
- All issues are suggestions, style preferences, or documentation improvements

**NEEDS_REVISION** if:
- **ANY** reviewer identified a correctness bug, missing functionality, or architectural gap
- Even one critical issue from one reviewer is enough to require revision
- Claims not grounded in the actual codebase
- Technical feasibility concerns

When reviewers disagree on severity, investigate the claim yourself before judging.
The bar for APPROVED is that ALL critical issues across ALL reviewers are resolved.

## Step 8: Loop or Complete

If **NEEDS_REVISION** and iteration < max_iterations:
- Return to Step 1
- Include the **Consolidated Summary** (Critical Issues + Suggestions) and **Review History table** in the refinement prompt — do NOT include raw reviewer outputs

If **APPROVED** or iteration >= max_iterations:
- Report final status to user
- Provide links to document and review files
