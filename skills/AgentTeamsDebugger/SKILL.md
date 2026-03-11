---
name: Agent Teams Debugger
description: This skill should be used when the user reports that a /forge-team session is stuck, not progressing, or producing unexpected behavior. Also use when the user says "debug agent teams", "team is stuck", "messages not arriving", "planner won't submit", "reviewers not responding", or asks to diagnose an Agent Teams issue. Provides diagnostic procedures and known failure patterns for Claude Code Agent Teams.
---

# Agent Teams Debugger

Diagnose and resolve issues in Damascus `/forge-team` Agent Teams sessions. This skill encodes hard-won debugging knowledge from real production failures.

## Quick Triage

When the user reports a stuck session, identify which phase is stuck:

| Symptom | Likely Phase | Jump To |
|---------|-------------|---------|
| "Nothing happening after start" | Phase 1 — Planning | [Planner Issues](#planner-issues) |
| "Explorers finished but plan not submitted" | Phase 1 — ExitPlanMode | [ExitPlanMode Failures](#exitplanmode-failures) |
| "Plan submitted but file not written" | Phase 2 — Writing | [Scribe Issues](#scribe-issues) |
| "File written but reviews not arriving" | Phase 3 — Review | [Message Routing](#message-routing) |
| "Reviews done but no verdict / no next round" | Phase 4 — Consolidation | [Message Routing](#message-routing) |
| "Session just hangs indefinitely" | Any | [Full Diagnostic](#full-diagnostic-procedure) |

## Full Diagnostic Procedure

Run these steps in order. Stop when you find the issue.

### Step 1: Check Team Exists

```bash
ls ~/.claude/teams/damascus-forge/
```

Expected: `config.json` + `inboxes/` directory. If missing → team was never created or was already deleted.

### Step 2: Check Inbox State

```bash
# List all inboxes
ls ~/.claude/teams/damascus-forge/inboxes/

# Check Lead's inbox for unread messages
cat ~/.claude/teams/damascus-forge/inboxes/team-lead.json | jq '.[] | select(.read == false)'

# Check specific teammate inbox
cat ~/.claude/teams/damascus-forge/inboxes/planner.json | jq '.[] | select(.read == false)'
```

Key insight: **Lead's inbox is `team-lead.json`**, NOT `lead.json`. This is the #1 routing bug — see [Message Routing](#message-routing).

### Step 3: Trace Message Flow

```bash
# See all messages in order
for f in ~/.claude/teams/damascus-forge/inboxes/*.json; do
  echo "=== $(basename $f) ==="
  cat "$f" | jq -r '.[] | "\(.read)\t\(.type)\t\(.sender // "system")\t\(.content[:80])"'
done
```

Look for:
- Messages with `read: false` — these are undelivered/unread
- Messages in `lead.json` (wrong) instead of `team-lead.json` (correct)
- Missing expected messages (e.g., explorer findings never sent to planner)

## Known Failure Patterns

### Message Routing

**The `'lead'` vs `'team-lead'` Bug** — CRITICAL, confirmed in 9+ sessions

The Lead teammate is spawned with `name: "team-lead"`. Its inbox file is `team-lead.json`. However, it's natural to use `recipient: "lead"` in SendMessage — this creates a **separate `lead.json`** file that Lead never reads.

**Diagnosis:**
```bash
# If this file exists, you have the routing bug
ls ~/.claude/teams/damascus-forge/inboxes/lead.json

# Check for unread messages in wrong inbox
cat ~/.claude/teams/damascus-forge/inboxes/lead.json | jq 'length'
```

**Fix:** All teammate prompts must use `recipient: "team-lead"` (not `"lead"`). Check `skills/ForgeTeamOrchestrator/references/teammate-prompts.md` — every SendMessage example must specify `recipient: "team-lead"`.

### ExitPlanMode Failures

**ExitPlanMode not mentioned in prompt → plan mode never works**

100% correlation across 9 sessions: if the planner's spawn prompt does not explicitly mention `ExitPlanMode`, the planner never submits a plan. The `mode: "plan"` on the Agent tool sets `planModeRequired: true`, but the planner needs to know it must call ExitPlanMode.

**Diagnosis:**
```bash
# Check if planner has been in plan mode
cat ~/.claude/teams/damascus-forge/inboxes/team-lead.json | jq '.[] | select(.type == "plan_approval_request")'
```

If no `plan_approval_request` exists → planner never called ExitPlanMode.

**Fix:** Ensure the planner prompt contains:
1. "You operate in plan mode"
2. "Call ExitPlanMode to submit your plan to Lead"
3. Both phrases — one alone is insufficient

### Planner Issues

**Planner waiting for explorers that finished**

The planner prompt says "wait until all have reported." If an explorer sends findings but the planner doesn't receive them, it waits indefinitely.

**Diagnosis:**
```bash
# Check explorer messages to planner
cat ~/.claude/teams/damascus-forge/inboxes/planner.json | jq '.[] | select(.sender | startswith("explorer"))'
```

**Planner stuck in revision loop (Round 2+)**

On Round 2+, the planner must call `EnterPlanMode` before `ExitPlanMode`. If it doesn't, it can't submit the revised plan.

**Diagnosis:** Check if planner received the revision message from team-lead and whether a `plan_approval_request` was generated.

### Scribe Issues

**Scribe not writing**

The scribe is the ONLY agent with write access (`subagent_type: "general-purpose"`). If it's stuck, the file won't be written.

**Diagnosis:**
```bash
# Check if scribe received instructions
cat ~/.claude/teams/damascus-forge/inboxes/scribe.json | jq '.[] | select(.read == false)'

# Check if scribe confirmed write
cat ~/.claude/teams/damascus-forge/inboxes/team-lead.json | jq '.[] | select(.sender == "scribe")'
```

### N-Planner Sync (Architecture Warning)

**Never use multiple planners.** When a planner sends a DONE message and then receives any new message, it reactivates and may send conflicting plans. This was solved by using a single Planner + N Explorers architecture. If you see multiple `planner-N` teammates, the architecture is wrong.

## Diagnostic Commands Reference

See [references/diagnostic-commands.md](references/diagnostic-commands.md) for copy-paste diagnostic commands.

## Recovery Actions

| Problem | Recovery |
|---------|----------|
| Wrong inbox routing | Fix prompts, restart session |
| ExitPlanMode not called | Cannot fix mid-session — restart with corrected prompt |
| Single teammate stuck | Send a nudge message via SendMessage |
| Team state corrupted | `TeamDelete("damascus-forge")`, restart session |
| Max rounds reached but not approved | Normal behavior — report final verdict to user |
