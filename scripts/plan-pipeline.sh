#!/bin/bash
# Plan document processing pipeline - PostToolUse hook (Write|Edit)
# Only processes files in plans directory
# 1. Add metadata
# 2. Gemini AI review
set -euo pipefail

# 플러그인 루트 디렉토리
PLUGIN_ROOT="${CLAUDE_PLUGIN_ROOT:-$(dirname "$(dirname "$0")")}"
SCRIPT_DIR="$PLUGIN_ROOT/scripts"
PROJECT_DIR="${CLAUDE_PROJECT_DIR:-$(pwd)}"
DEBUG_FILE="$PROJECT_DIR/.claude/hook-debug.log"
SETTINGS_FILE="$PLUGIN_ROOT/settings.local.md"

# 디버그 로깅 함수
log_debug() {
    echo "$(date): $1" >> "$DEBUG_FILE"
}

# JSON 출력 함수
output_json() {
    local continue_val="${1:-true}"
    local message="${2:-}"
    if [ -n "$message" ]; then
        # JSON escape the message
        local escaped_msg=$(echo "$message" | jq -Rs .)
        echo "{\"continue\": $continue_val, \"systemMessage\": $escaped_msg}"
    else
        echo "{\"continue\": $continue_val}"
    fi
}

# Hook stdin 읽기
HOOK_INPUT=$(cat)
log_debug "HOOK_INPUT=$HOOK_INPUT"

# Session ID 추출
export CLAUDE_SESSION_ID=$(echo "$HOOK_INPUT" | jq -r '.session_id // "unknown"' 2>/dev/null)
log_debug "CLAUDE_SESSION_ID=$CLAUDE_SESSION_ID"

# PostToolUse stdin JSON에서 tool_input.file_path 추출
FILE_PATH=$(echo "$HOOK_INPUT" | jq -r '.tool_input.file_path // empty' 2>/dev/null)
log_debug "FILE_PATH=$FILE_PATH"

# file_path가 없으면 조용히 종료
if [ -z "$FILE_PATH" ]; then
    output_json true
    exit 0
fi

# plans 디렉토리 파일이 아니면 조용히 종료
if [[ "$FILE_PATH" != *"/docs/plans/"* ]] && [[ "$FILE_PATH" != "./docs/plans/"* ]]; then
    output_json true
    exit 0
fi

log_debug "=== Plan file detected: $FILE_PATH ==="

# 하위 스크립트용 입력 JSON 생성
input_json="{\"file_path\": \"$FILE_PATH\"}"

# 결과 메시지
messages=()

# 1단계: 메타데이터 추가
log_debug "=== Step 1: Adding metadata ==="
if [ -x "$SCRIPT_DIR/plan-metadata.sh" ]; then
    metadata_result=$(echo "$input_json" | "$SCRIPT_DIR/plan-metadata.sh" 2>&1) || true
    log_debug "Metadata result: $metadata_result"

    if echo "$metadata_result" | jq -e '.success == true' > /dev/null 2>&1; then
        messages+=("Metadata updated")
    elif echo "$metadata_result" | jq -e '.error' > /dev/null 2>&1; then
        error_msg=$(echo "$metadata_result" | jq -r '.error')
        messages+=("Metadata error: $error_msg")
    fi
else
    log_debug "Warning: plan-metadata.sh not found or not executable"
fi

# 설정 파일에서 Gemini 활성화 여부 확인
ENABLE_GEMINI=true
if [ -f "$SETTINGS_FILE" ]; then
    FRONTMATTER=$(sed -n '/^---$/,/^---$/{ /^---$/d; p; }' "$SETTINGS_FILE" 2>/dev/null || true)
    if [ -n "$FRONTMATTER" ]; then
        gemini_enabled=$(echo "$FRONTMATTER" | grep '^enable_gemini_review:' | sed 's/enable_gemini_review: *//' || true)
        if [ "$gemini_enabled" = "false" ]; then
            ENABLE_GEMINI=false
            log_debug "Gemini review disabled via settings"
        fi
    fi
fi

# 2단계: Gemini 검토 (설정에서 활성화된 경우)
if [ "$ENABLE_GEMINI" = "true" ]; then
    log_debug "=== Step 2: Gemini review ==="
    if [ -f "$SCRIPT_DIR/gemini-review.ts" ]; then
        gemini_result=$(echo "$input_json" | npx tsx "$SCRIPT_DIR/gemini-review.ts" 2>&1) || true
        log_debug "Gemini result: $gemini_result"

        if echo "$gemini_result" | jq -e '.success == true' > /dev/null 2>&1; then
            review_file=$(echo "$gemini_result" | jq -r '.reviewFile // empty')
            if [ -n "$review_file" ]; then
                messages+=("Gemini review saved: $(basename "$review_file")")
            fi
        elif echo "$gemini_result" | jq -e '.error' > /dev/null 2>&1; then
            error_msg=$(echo "$gemini_result" | jq -r '.error')
            messages+=("Gemini error: $error_msg")
        fi
    else
        log_debug "Warning: gemini-review.ts not found"
    fi
else
    messages+=("Gemini review: disabled")
fi

# 최종 결과 출력
if [ ${#messages[@]} -gt 0 ]; then
    # 메시지 합치기
    combined_msg="Plan processing complete ($(basename "$FILE_PATH")): ${messages[*]}"
    output_json true "$combined_msg"
else
    output_json true "Plan processing complete: $FILE_PATH"
fi
