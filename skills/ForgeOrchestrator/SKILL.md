---
name: Forge Orchestrator
description: Damascus workflow orchestrator. Used when executing /forge, /forge-plan, or /forge-doc commands. Forges documents through iterative multi-LLM review.
aliases: [forge-orchestrator]
---

# Forge Orchestrator

Like forging Damascus steel, this orchestrator iteratively improves documents through a repeated refinement workflow.

## Configuration

Parse from user input:
- `-n [number]` → `max_iterations` (default: 3)
- `-o [path]` → `output_path` (default: none)
- Remaining text → `task_description`

Example:
- Input: `-n 5 -o docs/api/auth.md implement auth` → max_iterations=5, output_path="docs/api/auth.md", task="implement auth"
- Input: `implement auth` → max_iterations=3, output_path=none, task="implement auth"

## Mode Selection

The command passes a **Mode** field. Use it to select the authoring agent:

| Mode | Agent | When |
|------|-------|------|
| `plan` | `damascus:planner` | Implementation plans (uses Anthropic plan mode) |
| `doc` | `damascus:author` | Technical documents — API specs, architecture, design docs, etc. |
| `auto` | Decide based on task | See auto-detection below |

### Auto-Detection (mode=auto)

Analyze the task description to choose the agent:

- **Use `damascus:planner`** if the task is about implementing, building, or changing code (e.g., "implement auth", "refactor the database layer", "add caching")
- **Use `damascus:author`** if the task is about writing a document (e.g., "write API spec", "architecture document", "design doc for caching strategy")
- **When ambiguous**, default to `damascus:planner`

## Output Path Resolution

Determine where to save the document. Follow this priority:

### Priority 1: Explicit `-o` flag
If the user provided `-o [path]`, use that path exactly.

### Priority 2: Detect project conventions
Use Glob to scan the project for existing document directories:
```
Glob("docs/**/*.md")
Glob("**/README.md")
```

If there's an existing structure (e.g., `docs/api/`, `docs/plans/`, `docs/architecture/`), choose the directory that best fits the document type.

### Priority 3: Ask the user
If you can't determine a good path, use AskUserQuestion. Suggest paths based on the document type and task description:
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

The user can pick a suggestion or type a custom path via "Other".

### Review file
The review file is always saved alongside the document: `{document_dir}/{document_name}.review.md`
- Example: document at `docs/api/payment.md` → review at `docs/api/payment.review.md`

## Session ID

Get the session ID for tracking:
```bash
npx tsx ${CLAUDE_PLUGIN_ROOT}/scripts/get-session-id.ts
```

Returns JSON with `shortId` (first 8 characters of session ID). Used for default file naming and metadata.

## Workflow

```
    ┌─────────────────────────────────────────┐
    │  Get Session ID                         │
    └────────────────┬────────────────────────┘
                     ▼
    ┌─────────────────────────────────────────┐
    │  Select Mode (plan / doc / auto)        │
    └────────────────┬────────────────────────┘
                     ▼
    ┌─────────────────────────────────────────┐
    │  Task(damascus:planner or :author)      │◀──────┐
    │  Create draft                           │       │
    └────────────────┬────────────────────────┘       │
                     ▼                                │
    ┌─────────────────────────────────────────┐       │
    │  Resolve output path                    │       │
    │  (-o flag > convention > ask user)      │       │
    └────────────────┬────────────────────────┘       │
                     ▼                                │
    ┌─────────────────────────────────────────┐       │
    │  Task(damascus:writer)                  │       │
    │  Save to file                           │       │
    └────────────────┬────────────────────────┘       │
                     ▼                                │
    ┌─────────────────────────────────────────┐       │
    │  Inject metadata (plan-metadata.sh)     │       │
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

**Note:** Output path resolution happens only once (first iteration). On subsequent iterations, the same path is reused.

## Step 1: Create Draft

Use the Task tool to invoke the selected agent:

**For new document:**
```
Task(
  subagent_type: "damascus:planner" or "damascus:author",
  description: "Forge initial draft",
  prompt: "[USER_TASK]

Analyze the codebase and return the complete document as markdown text."
)
```

**For refinement (subsequent iterations):**
```
Task(
  subagent_type: "damascus:planner" or "damascus:author",
  description: "Refine draft based on feedback",
  prompt: "Refine the document based on review feedback.

Current document: [DOCUMENT_PATH]
[EXISTING DOCUMENT CONTENT]

Review feedback:
[REVIEW FEEDBACK]

Return the refined document as markdown text."
)
```

## Step 2: Resolve Output Path

On the first iteration only, determine the output path using the priority chain described above (-o flag > project conventions > ask user).

## Step 3: Save to File

After resolving the path, call the writer:

```
Task(
  subagent_type: "damascus:writer",
  description: "Save document to file",
  prompt: "Save the following content to [DOCUMENT_PATH]:

[DOCUMENT TEXT]"
)
```

## Step 4: Inject Metadata

After the writer saves the file, inject metadata (timestamps, session ID):

```
Bash(command: "echo '{\"file_path\": \"[DOCUMENT_PATH]\"}' | CLAUDE_SESSION_ID=[SESSION_ID] ${CLAUDE_PLUGIN_ROOT}/scripts/plan-metadata.sh")
```

This adds `created`, `modified`, and `session_id` fields to the document's frontmatter.

## Step 5: Collect Reviews (Parallel)

First, read `${CLAUDE_PROJECT_DIR}/.claude/damascus.local.md` to check which inspectors are enabled:

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
  description: "Claude inspection",
  prompt: "Review the document at: [DOCUMENT_PATH]"
)
```

**Gemini Inspector** (if enabled):
```
Bash(command: "CLAUDE_PLUGIN_ROOT=${CLAUDE_PLUGIN_ROOT} npx tsx ${CLAUDE_PLUGIN_ROOT}/scripts/gemini-review.ts [DOCUMENT_PATH]")
```

**OpenAI Inspector** (if enabled):
```
Bash(command: "CLAUDE_PLUGIN_ROOT=${CLAUDE_PLUGIN_ROOT} npx tsx ${CLAUDE_PLUGIN_ROOT}/scripts/openai-review.ts [DOCUMENT_PATH]")
```

## Step 6: Consolidate Reviews

After all inspections complete, consolidate them into `{document_dir}/{document_name}.review.md`.

**IMPORTANT**: Always overwrite the review file completely with new content:
1. If file exists, use `Read` tool first (required before Write)
2. Then use `Write` tool to replace entire content with new review
3. Do NOT use `Edit` to partially update - always full replacement

```markdown
---
document_file: [DOCUMENT_PATH]
mode: [plan | doc]
revision: N
reviewed_at: [timestamp]
reviewers: [gemini, openai, claude]
verdict: [APPROVED | NEEDS_REVISION]
---

# Forge Review - [Document Title]

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

## Step 7: Judge

**APPROVED** if:
- No critical issues mentioned
- Only minor suggestions or style preferences

**NEEDS_REVISION** if:
- Critical gaps identified by reviewers
- Claims not grounded in the actual codebase
- Technical feasibility concerns
- Important aspects left unaddressed

## Step 8: Loop or Complete

If **NEEDS_REVISION** and iteration < max_iterations:
- Go back to Step 1
- Include the review feedback in the agent prompt

If **APPROVED** or iteration >= max_iterations:
- Report final status to user
- Provide links to document and review files

## Output Format

After completion, report:

```
## Forge Complete

**Session**: {shortId}
**Mode**: [plan | doc]
**Status**: [APPROVED / NEEDS_REVISION (max iterations reached)]
**Iterations**: N / max_iterations
**Document**: [DOCUMENT_PATH]
**Review**: [REVIEW_PATH]

[Brief summary of the document]
```

## Important

- Maximum iterations configurable via `-n` flag (default: 3)
- Loop ends early if document is APPROVED before max iterations
- Always pass full review feedback when refining
- Run inspectors in parallel when possible (single message, multiple tool calls)
- Be objective in judging - don't soften critical feedback
- Output path is resolved once on first iteration, then reused
