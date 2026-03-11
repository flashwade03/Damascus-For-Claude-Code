# Round Flow — Detailed Steps

> `[PLUGIN_ROOT]` below refers to the resolved plugin root path from Setup Phase Step 0 in SKILL.md. Substitute the actual path in all SendMessage content.

## Phase 1: Planning

### Round 1 (Initial Draft)

Send the task to the planner. The planner manages explorers internally — Lead does not communicate with explorers directly.

**To planner:**
```
SendMessage(
  type: "message",
  recipient: "planner",
  content: "ROUND 1 — PLANNING PHASE

Task: [TASK_DESCRIPTION]
Mode: [plan|doc]
Explorers: [explorer-1, explorer-2, explorer-3]

Instructions:
1. Assign exploration areas to each explorer — be specific about what to investigate
2. Collect findings from all explorers — wait until all have reported
3. Synthesize findings into a comprehensive plan
4. Call ExitPlanMode to submit your plan to Lead",
  summary: "Round 1 planning"
)
```

**Plan collection:**

The planner manages explorers autonomously. Lead does NOT intervene during planning — just wait for the `plan_approval_request`.

When the planner calls ExitPlanMode, a `plan_approval_request` arrives. **Approve immediately** — Lead does not judge plan content (that's the reviewers' job in Phase 3):

```
SendMessage(
  type: "plan_approval_response",
  request_id: "[REQUEST_ID from plan_approval_request]",
  recipient: "planner",
  approve: true
)
```

Extract the plan content from the `planContent` field. This is the final draft to send to the scribe.

### Round 2+ (Revision)

Include consolidated review feedback from the previous round. Send to the planner:

```
SendMessage(
  type: "message",
  recipient: "planner",
  content: "ROUND [N] — REVISION PHASE

Previous verdict: NEEDS_REVISION

Consolidated feedback:
[CONSOLIDATED_SUMMARY — Critical Issues + Suggestions from .review.md]

Review History:
[REVIEW_HISTORY_TABLE from .review.md]

Instructions:
1. Call EnterPlanMode to re-enter plan mode
2. Address the critical issues — re-assign exploration to explorers if needed
3. Update your plan to incorporate fixes
4. Call ExitPlanMode to submit your revised plan to Lead",
  summary: "Round [N] revision"
)
```

Same plan collection as Round 1 — approve the plan_approval_request immediately.

## Phase 2: Writing

After approving the plan, extract the `planContent` from the plan_approval_request and send it to the scribe for polish + write.

```
SendMessage(
  type: "message",
  recipient: "scribe",
  content: "WRITE PHASE — Round [N]

Output path: [DOCUMENT_PATH]
Session ID: [SHORT_ID]
Plugin root: [PLUGIN_ROOT]

--- PLAN CONTENT ---
[PLAN_CONTENT from planContent field]
--- END ---

Instructions:
1. Polish the plan into a publication-quality document — improve consistency, formatting, flow
2. If the file already exists, Read it first (required before Write)
3. Write the document to [DOCUMENT_PATH] using Write tool
4. Inject metadata:
   echo '{\"file_path\": \"[DOCUMENT_PATH]\"}' | CLAUDE_SESSION_ID=[SHORT_ID] bash [PLUGIN_ROOT]/scripts/plan-metadata.sh
5. Confirm to 'team-lead' with the final file path",
  summary: "Write document round [N]"
)
```

Wait for scribe to confirm the write is complete before proceeding to review.

## Phase 3: Review

Send review instructions to all enabled reviewers simultaneously (single message, parallel calls). Each reviewer works independently and sends their review to Lead.

**To reviewer-claude (if enabled):**
```
SendMessage(
  type: "message",
  recipient: "reviewer-claude",
  content: "REVIEW PHASE — Round [N]

Document: [DOCUMENT_PATH]
Mode: [plan|doc]

Instructions:
1. Read and review the document
2. Evaluate: Codebase Grounding, Clarity, Completeness, Feasibility, Testability
3. Classify each issue as CRITICAL or SUGGESTION
4. Send your full review to 'team-lead' (use EXACTLY recipient: 'team-lead')

Include a scores table and list all issues with severity.",
  summary: "Claude review round [N]"
)
```

**To reviewer-gemini (if enabled):**
```
SendMessage(
  type: "message",
  recipient: "reviewer-gemini",
  content: "REVIEW PHASE — Round [N]

Document: [DOCUMENT_PATH]
Mode: [plan|doc]
Plugin root: [PLUGIN_ROOT]

Instructions:
1. Run the Gemini review script:
   CLAUDE_PLUGIN_ROOT=[PLUGIN_ROOT] npx tsx [PLUGIN_ROOT]/scripts/gemini-review.ts [DOCUMENT_PATH] --mode [plan|doc]
2. Parse the JSON output — extract the review text
3. Send the results to 'team-lead' (use EXACTLY recipient: 'team-lead')",
  summary: "Gemini review round [N]"
)
```

**To reviewer-openai (if enabled):**
```
SendMessage(
  type: "message",
  recipient: "reviewer-openai",
  content: "REVIEW PHASE — Round [N]

Document: [DOCUMENT_PATH]
Mode: [plan|doc]
Plugin root: [PLUGIN_ROOT]

Instructions:
1. Run the OpenAI review script:
   CLAUDE_PLUGIN_ROOT=[PLUGIN_ROOT] npx tsx [PLUGIN_ROOT]/scripts/openai-review.ts [DOCUMENT_PATH] --mode [plan|doc]
2. Parse the JSON output — extract the review text
3. Send the results to 'team-lead' (use EXACTLY recipient: 'team-lead')",
  summary: "OpenAI review round [N]"
)
```

**Review collection — Lead collects all reviews and determines verdict:**

Track received reviews:
- reviewer-claude: ☐ → ☑
- reviewer-gemini: ☐ → ☑
- reviewer-openai: ☐ → ☑

Only when ALL enabled reviewers have sent their review, Lead determines the verdict:

**APPROVED** if: No CRITICAL issues from any reviewer. All issues are suggestions.
**NEEDS_REVISION** if: ANY reviewer flagged a CRITICAL issue (correctness bugs, missing functionality, architectural gaps). Even one critical issue from one reviewer is enough.

## Phase 4: Consolidate Review File

After determining the verdict, Lead consolidates all reviews and sends them to the scribe.

```
SendMessage(
  type: "message",
  recipient: "scribe",
  content: "CONSOLIDATE PHASE — Round [N]

Document path: [DOCUMENT_PATH]
Review file path: [DOCUMENT_DIR]/[DOCUMENT_NAME].review.md
Document title: [TITLE]
Mode: [plan|doc]
Round: [N]
Active reviewers: [claude, gemini, openai — only those enabled]
Verdict: [APPROVED | NEEDS_REVISION]

--- CLAUDE REVIEW ---
[CLAUDE_REVIEW_CONTENT]
--- END ---

--- GEMINI REVIEW ---
[GEMINI_REVIEW_CONTENT]
--- END ---

--- OPENAI REVIEW ---
[OPENAI_REVIEW_CONTENT]
--- END ---

Review file template reference: [PLUGIN_ROOT]/skills/ForgeOrchestrator/references/review-template.md

Instructions:
1. Read the review template reference for exact format
2. [If round > 1]: Read existing .review.md — preserve all Review History rows, compress previous Current Iteration into a new history row (verdict + key issues in ≤15 words)
3. Write the .review.md with:
   - Frontmatter: document_file, mode, revision, reviewed_at, reviewers, verdict
   - Review History table (round 2+)
   - Current Iteration with individual reviews + consolidated summary + verdict
4. Confirm to 'team-lead'",
  summary: "Write review file round [N]"
)
```

Wait for scribe to confirm.

## Phase 5: Loop or Complete

**If APPROVED:**
→ Proceed to shutdown.

**If NEEDS_REVISION and round < max_rounds:**
→ Return to Phase 1 with revision instructions including consolidated feedback.

**If max rounds reached (any verdict):**
→ Proceed to shutdown. Report final status with the last verdict.

## Edge Cases

- **Single reviewer**: Lead collects one review and determines the verdict alone.
- **Explorer disagreement**: Planner resolves conflicting explorer findings when synthesizing the plan.
- **Script failure**: If reviewer-gemini or reviewer-openai's script fails, they send the error to Lead. Lead proceeds with available reviews and determines verdict from those.
