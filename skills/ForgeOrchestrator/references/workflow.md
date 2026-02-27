# Forge Workflow — Detailed Steps

## Step 1: Create Draft

Invoke the selected authoring agent via the Task tool.

**Initial draft:**
```
Task(
  subagent_type: "damascus:planner" or "damascus:author",
  description: "Forge initial draft",
  prompt: "[USER_TASK]

Analyze the codebase and return the complete document as markdown text."
)
```

**Refinement (subsequent iterations):**
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

Call the writer agent:

```
Task(
  subagent_type: "damascus:writer",
  description: "Save document to file",
  prompt: "Save the following content to [DOCUMENT_PATH]:

[DOCUMENT TEXT]"
)
```

## Step 4: Inject Metadata

Inject timestamps and session ID into the document's frontmatter:

```
Bash(command: "echo '{\"file_path\": \"[DOCUMENT_PATH]\"}' | CLAUDE_SESSION_ID=[SESSION_ID] ${CLAUDE_PLUGIN_ROOT}/scripts/plan-metadata.sh")
```

This adds `created`, `modified`, and `session_id` fields.

## Step 5: Collect Reviews (Parallel)

First, read `${CLAUDE_PROJECT_DIR}/.claude/damascus.local.md` to check which inspectors are enabled:

```yaml
enable_claude_review: true
enable_gemini_review: true
enable_openai_review: false
```

Launch enabled inspectors in parallel (single message, multiple tool calls):

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

After all inspections complete, consolidate into `{document_dir}/{document_name}.review.md`.

**IMPORTANT**: Always overwrite the review file completely:
1. If file exists, read it first (required before Write)
2. Use Write tool to replace entire content
3. Do NOT use Edit to partially update

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
- Return to Step 1
- Include the review feedback in the agent prompt

If **APPROVED** or iteration >= max_iterations:
- Report final status to user
- Provide links to document and review files
