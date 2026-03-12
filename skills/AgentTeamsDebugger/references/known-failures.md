# Known Failure Catalog

Each entry documents a real failure encountered during Damascus v4 development with root cause, diagnosis, and fix.

---

## F-001: Lead Never Reads Reviews (Inbox Routing)

**Severity:** Critical — Session hangs after Phase 3
**Discovered:** 2026-03-11, confirmed across 9+ sessions

### Symptoms
- All 3 reviewers complete their reviews
- Lead never acknowledges receiving them
- Session hangs indefinitely after Phase 3
- `lead.json` exists with unread messages, `team-lead.json` has no reviews

### Root Cause
Teammate prompts used `recipient: "lead"` in SendMessage examples. But the Lead is spawned with `name: "team-lead"`, so its inbox is `team-lead.json`. Messages to `"lead"` create a separate `lead.json` file that Lead never polls.

### Diagnosis
```bash
# This file should NOT exist
ls ~/.claude/teams/damascus-forge/inboxes/lead.json
# If it does, check for unread messages
cat ~/.claude/teams/damascus-forge/inboxes/lead.json | jq '[.[] | select(.read == false)] | length'
```

### Fix
All SendMessage examples in prompts must use `recipient: "team-lead"`:
- `skills/ForgeTeamOrchestrator/references/teammate-prompts.md` — all reviewer prompts
- `skills/ForgeTeamOrchestrator/references/round-flow.md` — all message templates

### Prevention
Test `__tests__/v4-plugins/protocol.test.ts` validates that all `recipient:` values in prompts match valid teammate names.

---

## F-002: Planner Never Submits Plan (ExitPlanMode Missing)

**Severity:** Critical — Session hangs in Phase 1
**Discovered:** 2026-03-11, 100% correlation across 9 sessions

### Symptoms
- Planner explores and gathers findings
- Planner synthesizes content but never submits
- No `plan_approval_request` in Lead's inbox
- Session stuck in Phase 1

### Root Cause
The planner prompt did not mention `ExitPlanMode`. Setting `mode: "plan"` on the Agent tool enables plan mode (`planModeRequired: true`), but the agent needs an explicit instruction to call `ExitPlanMode` to submit the plan.

### Diagnosis
```bash
# No plan submissions
cat ~/.claude/teams/damascus-forge/inboxes/team-lead.json | jq '[.[] | select(.type == "plan_approval_request")] | length'
# Returns 0
```

### Fix
Planner spawn prompt MUST contain both:
1. "You operate in plan mode"
2. "Call ExitPlanMode to submit your plan to Lead"

### Prevention
Test `__tests__/v4-plugins/teammates.test.ts` — `planner uses ExitPlanMode` test verifies the prompt contains `ExitPlanMode`.

---

## F-003: N-Planner DONE Synchronization Failure

**Severity:** Architecture-level — Caused redesign
**Discovered:** 2026-03-10

### Symptoms
- Multiple planners (planner-1, planner-2) each submit partial plans
- Planner sends DONE signal, then receives late messages from other planners
- Receiving a message reactivates the "done" planner, causing duplicate or conflicting submissions
- Coordinator pattern fails because coordinator also suffers reactivation

### Root Cause
Agent Teams has no atomic "I'm done, stop sending me messages" operation. Any `SendMessage` to a teammate reactivates it, even after it considers itself finished.

### Fix
**Architecture change:** Replace N planners + coordinator with single Planner + N Explorers.
- Explorers report findings to the single Planner
- Planner has no sync problem because it's the only one synthesizing
- ExitPlanMode provides a clean submission boundary

### Prevention
This is why the architecture uses a single planner. NEVER revert to multiple planners.

---

## F-004: Explorer Cross-Talk Not Occurring

**Severity:** Low — Feature not working but not blocking
**Discovered:** 2026-03-11

### Symptoms
- Explorer prompts encourage discussing findings with other explorers
- In practice, explorers only communicate with planner
- No explorer-to-explorer messages observed

### Root Cause
Unknown. Theories:
1. Small test project doesn't produce enough conflicting findings to trigger discussion
2. sonnet model may not be proactive about peer discussion
3. The instruction "Share preliminary findings with other explorers" may not be strong enough

### Current Status
Prompts kept as-is. Will verify on a larger project. Not a blocking issue — the planner still receives all findings and can resolve conflicts.

---

## F-005: Scribe Write Failure (File Not Read First)

**Severity:** Medium — Write tool rejects operation
**Discovered:** During development

### Symptoms
- Scribe receives write instruction
- Write tool fails with "must read file first" error
- Document not created/updated

### Root Cause
Claude Code's Write tool requires reading the file first if it already exists. On Round 2+, the scribe must Read the existing document before overwriting.

### Fix
Scribe prompt includes: "If the file already exists, Read it first (required before Write)". The round-flow.md Write Phase instructions also remind the scribe.

---

## F-006: Review Script Returns Error JSON

**Severity:** Low — Graceful degradation exists
**Discovered:** During development

### Symptoms
- reviewer-gemini or reviewer-openai sends error text instead of review
- Lead receives fewer useful reviews

### Root Cause
- Missing or invalid API key in `damascus.local.md`
- Network timeout
- API rate limiting

### Fix
Lead proceeds with available reviews. Even one reviewer is sufficient for a verdict. The round-flow.md specifies: "If reviewer-gemini or reviewer-openai's script fails, they send the error to Lead. Lead proceeds with available reviews."

---

## F-007: Metadata Injection Fails Silently

**Severity:** Low — Metadata missing but document exists
**Discovered:** During development

### Symptoms
- Document written successfully
- No `created:` or `modified:` timestamps in frontmatter
- `session_id:` missing

### Root Cause
`plan-metadata.sh` receives malformed JSON input, or `CLAUDE_SESSION_ID` env var not set.

### Diagnosis
```bash
# Test metadata script directly
echo '{"file_path": "/tmp/test.md"}' | CLAUDE_SESSION_ID=test123 bash scripts/plan-metadata.sh
```

### Fix
Verify the scribe's metadata injection command matches the format in `round-flow.md` Phase 2.

---

## F-008: Setup Phase Skipped (Teammates Never Spawned)

**Severity:** Critical — Session hangs in Phase 1
**Discovered:** 2026-03-12, during eval testing

### Symptoms
- Session starts but nothing happens
- Only `team-lead.json` and `planner.json` inboxes exist
- No explorer, scribe, or reviewer inboxes
- Planner received task but has no explorers to assign work to

### Root Cause
The Lead jumped directly to sending PLANNING PHASE to the planner without first spawning all required teammates (explorers, scribe, reviewers) during the Setup Phase. The planner's workflow requires an explorer list in the task message to assign investigation areas. Without explorers, it stalls.

This can also manifest as a **malformed task message** — the Lead spawns teammates but sends an incomplete message that lacks the explorer list, mode, or ExitPlanMode reinforcement. Compare the actual message to the required format in `skills/ForgeTeamOrchestrator/references/round-flow.md`.

### Diagnosis
```bash
# Check which inboxes exist
ls ~/.claude/teams/damascus-forge/inboxes/

# Expected: team-lead.json, planner.json, explorer-1.json, explorer-2.json, scribe.json, reviewer-*.json
# If only team-lead.json + planner.json → Setup Phase was skipped

# Check what message the planner received
cat ~/.claude/teams/damascus-forge/inboxes/planner.json | jq '.[0].content'
# Should include "Explorers: [explorer-1, explorer-2, ...]" and "ExitPlanMode"
```

### Fix
Delete team and restart. Ensure the Lead follows ForgeTeamOrchestrator's Setup Phase:
1. Spawn all teammates first (explorers, planner, scribe, reviewers)
2. Use the structured task message format from round-flow.md
3. Include explorer list and ExitPlanMode instruction in the planner message

### Prevention
Verify the ForgeTeamOrchestrator SKILL.md Setup Phase instructions are being followed. The Lead should never send Phase messages before all teammates are spawned.
