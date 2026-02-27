#!/bin/bash
# SessionStart hook - Installation verification + settings file provisioning
set -euo pipefail

# stdin 소비
cat > /dev/null

PLUGIN_ROOT="${CLAUDE_PLUGIN_ROOT:-$(dirname "$(dirname "$0")")}"
PROJECT_DIR="${CLAUDE_PROJECT_DIR:-$(pwd)}"
SETTINGS_DEST="$PROJECT_DIR/.claude/damascus.local.md"
TEMPLATE_SRC="$PLUGIN_ROOT/damascus.template.md"

# --- 1. 설치 검증 ---
MISSING=()
for f in "commands/forge.md" "skills/ForgeOrchestrator/SKILL.md" "scripts/utils.ts"; do
  [ ! -f "$PLUGIN_ROOT/$f" ] && MISSING+=("$f")
done

if [ ${#MISSING[@]} -gt 0 ]; then
  echo "{\"continue\": true, \"systemMessage\": \"[Damascus] Warning: missing files: ${MISSING[*]}\"}"
  exit 0
fi

# --- 2. 설정 파일 확인 및 생성 ---
if [ ! -f "$SETTINGS_DEST" ]; then
  mkdir -p "$PROJECT_DIR/.claude"
  if [ -f "$TEMPLATE_SRC" ]; then
    cp "$TEMPLATE_SRC" "$SETTINGS_DEST"
    echo "{\"continue\": true, \"systemMessage\": \"[Damascus] Settings created at .claude/damascus.local.md — fill in your API keys to enable multi-LLM review.\"}"
  else
    echo "{\"continue\": true, \"systemMessage\": \"[Damascus] Warning: template not found, settings file could not be created.\"}"
  fi
else
  echo "{\"continue\": true, \"systemMessage\": \"[Damascus] Ready.\"}"
fi
