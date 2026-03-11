# Diagnostic Commands Reference

Copy-paste commands for diagnosing Agent Teams issues. All assume team name is `damascus-forge`.

## Team State

```bash
# Does the team exist?
ls ~/.claude/teams/damascus-forge/ 2>/dev/null || echo "TEAM NOT FOUND"

# Team config
cat ~/.claude/teams/damascus-forge/config.json | jq .

# List all teammates (inbox files = active teammates)
ls ~/.claude/teams/damascus-forge/inboxes/
```

## Inbox Inspection

```bash
# Lead's inbox (correct)
cat ~/.claude/teams/damascus-forge/inboxes/team-lead.json | jq .

# WRONG inbox — should NOT exist. If it does, routing bug present
cat ~/.claude/teams/damascus-forge/inboxes/lead.json 2>/dev/null && echo "⚠ ROUTING BUG: lead.json exists"

# Unread messages in Lead's inbox
cat ~/.claude/teams/damascus-forge/inboxes/team-lead.json | jq '[.[] | select(.read == false)] | length'

# All unread messages across all inboxes
for f in ~/.claude/teams/damascus-forge/inboxes/*.json; do
  unread=$(cat "$f" | jq '[.[] | select(.read == false)] | length')
  [ "$unread" -gt 0 ] && echo "$(basename $f): $unread unread"
done
```

## Message Tracing

```bash
# Full message timeline (all inboxes, sorted by approximate order)
for f in ~/.claude/teams/damascus-forge/inboxes/*.json; do
  inbox=$(basename "$f" .json)
  cat "$f" | jq -r --arg inbox "$inbox" '.[] | "[\($inbox)]\t\(.read)\t\(.type)\t\(.sender // "system")\t\(.content[:100] // .planContent[:100] // "no content")"'
done

# Messages from specific sender
cat ~/.claude/teams/damascus-forge/inboxes/team-lead.json | jq '.[] | select(.sender == "reviewer-claude")'

# Plan approval requests (ExitPlanMode evidence)
cat ~/.claude/teams/damascus-forge/inboxes/team-lead.json | jq '.[] | select(.type == "plan_approval_request")'

# Plan approval responses
cat ~/.claude/teams/damascus-forge/inboxes/planner.json | jq '.[] | select(.type == "plan_approval_response")'
```

## Phase-Specific Checks

### Phase 1: Planning

```bash
# Did planner receive the task?
cat ~/.claude/teams/damascus-forge/inboxes/planner.json | jq '.[] | select(.content | test("PLANNING PHASE|REVISION PHASE"))'

# Did explorers receive assignments?
for n in 1 2 3; do
  echo "--- explorer-$n ---"
  cat ~/.claude/teams/damascus-forge/inboxes/explorer-$n.json 2>/dev/null | jq '.[] | select(.sender == "planner")' || echo "no inbox"
done

# Did explorers report back to planner?
cat ~/.claude/teams/damascus-forge/inboxes/planner.json | jq '.[] | select(.sender | startswith("explorer"))'

# Did planner submit plan? (ExitPlanMode)
cat ~/.claude/teams/damascus-forge/inboxes/team-lead.json | jq '.[] | select(.type == "plan_approval_request") | {type, planContent: .planContent[:200]}'
```

### Phase 2: Writing

```bash
# Did scribe receive write instruction?
cat ~/.claude/teams/damascus-forge/inboxes/scribe.json | jq '.[] | select(.content | test("WRITE PHASE"))'

# Did scribe confirm write?
cat ~/.claude/teams/damascus-forge/inboxes/team-lead.json | jq '.[] | select(.sender == "scribe")'
```

### Phase 3: Review

```bash
# Did reviewers receive instructions?
for r in reviewer-claude reviewer-gemini reviewer-openai; do
  echo "--- $r ---"
  cat ~/.claude/teams/damascus-forge/inboxes/$r.json 2>/dev/null | jq '.[] | select(.content | test("REVIEW PHASE"))' || echo "no inbox"
done

# Did reviews arrive at Lead?
for r in reviewer-claude reviewer-gemini reviewer-openai; do
  echo "--- from $r ---"
  cat ~/.claude/teams/damascus-forge/inboxes/team-lead.json | jq ".[] | select(.sender == \"$r\") | {sender, read, content: .content[:100]}"
done

# CRITICAL: Check for reviews in wrong inbox
cat ~/.claude/teams/damascus-forge/inboxes/lead.json 2>/dev/null | jq '.[] | select(.sender | startswith("reviewer"))' && echo "⚠ Reviews sent to wrong inbox!"
```

### Phase 4: Consolidation

```bash
# Did scribe receive consolidation instruction?
cat ~/.claude/teams/damascus-forge/inboxes/scribe.json | jq '.[] | select(.content | test("CONSOLIDATE PHASE"))'

# Did scribe confirm review file write?
cat ~/.claude/teams/damascus-forge/inboxes/team-lead.json | jq '.[] | select(.sender == "scribe") | {content: .content[:150]}'
```

## Quick Health Check (Run All)

```bash
echo "=== TEAM STATE ==="
ls ~/.claude/teams/damascus-forge/inboxes/ 2>/dev/null || echo "TEAM NOT FOUND"

echo ""
echo "=== ROUTING BUG CHECK ==="
[ -f ~/.claude/teams/damascus-forge/inboxes/lead.json ] && echo "⚠ lead.json EXISTS — routing bug!" || echo "✓ No routing bug"

echo ""
echo "=== UNREAD MESSAGES ==="
for f in ~/.claude/teams/damascus-forge/inboxes/*.json; do
  unread=$(cat "$f" | jq '[.[] | select(.read == false)] | length')
  total=$(cat "$f" | jq 'length')
  echo "$(basename $f): $unread unread / $total total"
done

echo ""
echo "=== PLAN SUBMISSIONS ==="
cat ~/.claude/teams/damascus-forge/inboxes/team-lead.json | jq '[.[] | select(.type == "plan_approval_request")] | length' 2>/dev/null && echo "plan(s) submitted" || echo "no plans"

echo ""
echo "=== REVIEW STATUS ==="
for r in reviewer-claude reviewer-gemini reviewer-openai; do
  has_review=$(cat ~/.claude/teams/damascus-forge/inboxes/team-lead.json 2>/dev/null | jq "[.[] | select(.sender == \"$r\")] | length")
  echo "$r: ${has_review:-0} review(s) received"
done
```
