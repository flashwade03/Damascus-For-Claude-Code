#!/bin/bash
# Script to add/update metadata (date, time, session ID) in forge documents
set -euo pipefail

# JSON 출력 함수
output_success() {
    echo "{\"success\": true, \"message\": \"$1\"}"
}

output_error() {
    echo "{\"success\": false, \"error\": \"$1\"}"
}

# 입력 JSON 읽기
input=$(cat)

# 파일 경로 추출
file_path=$(echo "$input" | jq -r '.file_path // empty')
session_id="${CLAUDE_SESSION_ID:-unknown}"

# 파일 경로 검증
if [ -z "$file_path" ]; then
    output_error "No file_path provided"
    exit 0
fi

# 파일이 존재하는지 확인
if [ ! -f "$file_path" ]; then
    output_error "File not found: $file_path"
    exit 0
fi

# 현재 날짜/시간
current_datetime=$(date "+%Y-%m-%d %H:%M")

# 기존 frontmatter 확인
if head -1 "$file_path" | grep -q "^---$"; then
    temp_file=$(mktemp)

    # modified 업데이트 또는 추가
    if grep -q "^modified:" "$file_path"; then
        sed "s/^modified:.*$/modified: $current_datetime/" "$file_path" > "$temp_file"
    else
        sed "2a\\
modified: $current_datetime
" "$file_path" > "$temp_file"
    fi
    mv "$temp_file" "$file_path"

    # session_id 업데이트 또는 추가
    temp_file=$(mktemp)
    if grep -q "^session_id:" "$file_path"; then
        sed "s/^session_id:.*$/session_id: $session_id/" "$file_path" > "$temp_file"
    else
        sed "2a\\
session_id: $session_id
" "$file_path" > "$temp_file"
    fi
    mv "$temp_file" "$file_path"
else
    # frontmatter가 없음 - 새로 추가
    temp_file=$(mktemp)
    cat > "$temp_file" << EOF
---
created: $current_datetime
modified: $current_datetime
session_id: $session_id
---

EOF
    cat "$file_path" >> "$temp_file"
    mv "$temp_file" "$file_path"
fi

# 성공 메시지 출력
output_success "Metadata updated: $current_datetime, session: $session_id"
