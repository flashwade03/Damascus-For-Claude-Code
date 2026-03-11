#!/bin/bash
# Smoke test: Run the Damascus plugin against the test project fixture
# Uses dry-run mode to avoid real API calls
set -euo pipefail

SCRIPT_DIR="$(cd "$(dirname "$0")" && pwd)"
PLUGIN_ROOT="$(dirname "$SCRIPT_DIR")"
TEST_PROJECT="$PLUGIN_ROOT/__tests__/test-project"
FIXTURES="$PLUGIN_ROOT/__tests__/fixtures"

# Colors
RED='\033[0;31m'
GREEN='\033[0;32m'
YELLOW='\033[0;33m'
CYAN='\033[0;36m'
NC='\033[0m'

PASS=0
FAIL=0

pass() { echo -e "  ${GREEN}PASS${NC} $1"; PASS=$((PASS + 1)); }
fail() { echo -e "  ${RED}FAIL${NC} $1: $2"; FAIL=$((FAIL + 1)); }

# Check output contains expected string
check_contains() {
  local output="$1" expected="$2"
  echo "$output" | grep -q "$expected"
}

# Check output is valid JSON with success=true
check_success() {
  local output="$1"
  echo "$output" | grep -q '"success":true' || echo "$output" | grep -q '"success": true'
}

echo -e "${CYAN}=== Damascus Smoke Test ===${NC}"
echo ""

# ─── 1. Review Scripts (dry-run) ───

echo -e "${CYAN}--- 1. Review Scripts (dry-run) ---${NC}"

OUTPUT=$(CLAUDE_PROJECT_DIR="$TEST_PROJECT" GEMINI_API_KEY=fake DAMASCUS_DRY_RUN=true \
  npx tsx "$PLUGIN_ROOT/scripts/gemini-review.ts" "$FIXTURES/sample-plan.md" </dev/null 2>/dev/null || echo '{"success":false}')
if check_success "$OUTPUT" && check_contains "$OUTPUT" "DRY RUN"; then
  pass "gemini-review.ts dry-run"
else
  fail "gemini-review.ts dry-run" "$(echo "$OUTPUT" | head -c 200)"
fi

OUTPUT=$(CLAUDE_PROJECT_DIR="$TEST_PROJECT" OPENAI_API_KEY=fake DAMASCUS_DRY_RUN=true \
  npx tsx "$PLUGIN_ROOT/scripts/openai-review.ts" "$FIXTURES/sample-plan.md" </dev/null 2>/dev/null || echo '{"success":false}')
if check_success "$OUTPUT" && check_contains "$OUTPUT" "DRY RUN"; then
  pass "openai-review.ts dry-run"
else
  fail "openai-review.ts dry-run" "$(echo "$OUTPUT" | head -c 200)"
fi

# ─── 2. Review Scripts (mock response) ───

echo -e "${CYAN}--- 2. Review Scripts (mock response) ---${NC}"

OUTPUT=$(CLAUDE_PROJECT_DIR="$TEST_PROJECT" GEMINI_API_KEY=fake \
  DAMASCUS_MOCK_RESPONSE_FILE="$FIXTURES/gemini-mock-response.txt" \
  npx tsx "$PLUGIN_ROOT/scripts/gemini-review.ts" "$FIXTURES/sample-plan.md" </dev/null 2>/dev/null || echo '{"success":false}')
if check_success "$OUTPUT" && check_contains "$OUTPUT" "token expiration"; then
  pass "gemini-review.ts mock response"
else
  fail "gemini-review.ts mock response" "$(echo "$OUTPUT" | head -c 200)"
fi

OUTPUT=$(CLAUDE_PROJECT_DIR="$TEST_PROJECT" OPENAI_API_KEY=fake \
  DAMASCUS_MOCK_RESPONSE_FILE="$FIXTURES/openai-mock-response.txt" \
  npx tsx "$PLUGIN_ROOT/scripts/openai-review.ts" "$FIXTURES/sample-plan.md" </dev/null 2>/dev/null || echo '{"success":false}')
if check_success "$OUTPUT" && check_contains "$OUTPUT" "CORS"; then
  pass "openai-review.ts mock response"
else
  fail "openai-review.ts mock response" "$(echo "$OUTPUT" | head -c 200)"
fi

# ─── 3. Hook Tests ───

echo -e "${CYAN}--- 3. SessionStart Hook ---${NC}"

TEMP_PROJECT=$(mktemp -d)
trap "rm -rf $TEMP_PROJECT" EXIT

OUTPUT=$(echo '' | CLAUDE_PLUGIN_ROOT="$PLUGIN_ROOT" CLAUDE_PROJECT_DIR="$TEMP_PROJECT" \
  bash "$PLUGIN_ROOT/scripts/session-start.sh" 2>/dev/null || echo '{}')
if check_contains "$OUTPUT" '"continue"'; then
  pass "session-start.sh returns continue"
else
  fail "session-start.sh" "$(echo "$OUTPUT" | head -c 200)"
fi

if [ -f "$TEMP_PROJECT/.claude/damascus.local.md" ]; then
  pass "session-start.sh creates settings file"
else
  fail "session-start.sh creates settings file" "File not found"
fi

# ─── 4. Metadata Script ───

echo -e "${CYAN}--- 4. Metadata Injection ---${NC}"

TEMP_DOC="$TEMP_PROJECT/test-plan.md"
echo "# Test Plan" > "$TEMP_DOC"

echo "{\"file_path\": \"$TEMP_DOC\"}" | CLAUDE_SESSION_ID=smoke-test \
  bash "$PLUGIN_ROOT/scripts/plan-metadata.sh" >/dev/null 2>&1 || true

if grep -q "session_id: smoke-test" "$TEMP_DOC" 2>/dev/null; then
  pass "plan-metadata.sh injects session_id"
else
  fail "plan-metadata.sh injects session_id" "$(cat "$TEMP_DOC" 2>/dev/null)"
fi

if grep -q "created:" "$TEMP_DOC" 2>/dev/null; then
  pass "plan-metadata.sh injects created timestamp"
else
  fail "plan-metadata.sh injects created timestamp" "$(cat "$TEMP_DOC" 2>/dev/null)"
fi

# ─── 5. Session ID ───

echo -e "${CYAN}--- 5. Session ID ---${NC}"

OUTPUT=$(CLAUDE_SESSION_ID=test-session-12345678 \
  npx tsx "$PLUGIN_ROOT/scripts/get-session-id.ts" </dev/null 2>/dev/null || echo '{"success":false}')
if check_contains "$OUTPUT" "test-ses"; then
  pass "get-session-id.ts reads env var"
else
  fail "get-session-id.ts reads env var" "$(echo "$OUTPUT" | head -c 200)"
fi

OUTPUT=$(npx tsx "$PLUGIN_ROOT/scripts/get-session-id.ts" 2>/dev/null || echo '{"success":false}')
if check_success "$OUTPUT"; then
  pass "get-session-id.ts fallback works"
else
  fail "get-session-id.ts fallback" "$(echo "$OUTPUT" | head -c 200)"
fi

# ─── 6. Claude CLI (optional) ───

echo -e "${CYAN}--- 6. Claude CLI Integration (manual) ---${NC}"

if command -v claude &>/dev/null; then
  echo -e "  ${YELLOW}Claude CLI found. Run manually:${NC}"
  echo "    cd $TEST_PROJECT"
  echo "    DAMASCUS_DRY_RUN=true claude -p '/forge-plan -n 1 implement auth module'"
else
  echo -e "  ${YELLOW}SKIP${NC} Claude CLI not in PATH"
fi

# ─── Summary ───

echo ""
echo -e "${CYAN}=== Results ===${NC}"
echo -e "  ${GREEN}$PASS passed${NC}, ${RED}$FAIL failed${NC}"
echo ""

if [ $FAIL -gt 0 ]; then
  exit 1
fi
