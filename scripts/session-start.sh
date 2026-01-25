#!/bin/bash
# SessionStart hook - Logs diagnostic information when session starts
set -euo pipefail

# 입력 읽기 (stdin 소비)
cat > /dev/null

# 디렉토리 설정
PROJECT_DIR="${CLAUDE_PROJECT_DIR:-$(pwd)}"
PLUGIN_ROOT="${CLAUDE_PLUGIN_ROOT:-$(dirname "$(dirname "$0")")}"
DEBUG_FILE="$PROJECT_DIR/.claude/hook-debug.log"
SETTINGS_FILE="$PLUGIN_ROOT/settings.local.md"

# 디버그 로깅
mkdir -p "$PROJECT_DIR/.claude"
echo "$(date): === SESSION START ===" >> "$DEBUG_FILE"
echo "$(date): CLAUDE_PLUGIN_ROOT=${CLAUDE_PLUGIN_ROOT:-not_set}" >> "$DEBUG_FILE"
echo "$(date): CLAUDE_PROJECT_DIR=${CLAUDE_PROJECT_DIR:-not_set}" >> "$DEBUG_FILE"

# 설정 파일 확인
if [ -f "$SETTINGS_FILE" ]; then
    echo "$(date): Settings file found: $SETTINGS_FILE" >> "$DEBUG_FILE"
else
    echo "$(date): No settings file. Create settings.local.md in plugin directory for configuration." >> "$DEBUG_FILE"
fi

# 성공 출력
echo '{"continue": true, "systemMessage": "workflow-hooks plugin loaded"}'
