#!/usr/bin/env bash

set -euo pipefail

# GitLab API 호출에 공통으로 사용하는 유틸리티 함수 모음이다.

DEFAULT_OUTPUT_DIR="/Users/dongjin/dev/promptech/gitlab-review-reports"

require_env() {
  local name="$1"
  if [[ -z "${!name:-}" ]]; then
    echo "필수 환경 변수 '$name' 가 설정되어 있지 않습니다." >&2
    exit 1
  fi
}

require_command() {
  local name="$1"
  if ! command -v "$name" >/dev/null 2>&1; then
    echo "필수 명령 '$name' 을(를) 찾을 수 없습니다." >&2
    exit 1
  fi
}

timestamp_for_reports() {
  if [[ -n "${RUN_TIMESTAMP:-}" ]]; then
    printf '%s\n' "${RUN_TIMESTAMP}"
    return
  fi

  date '+%Y-%m-%d-%H%M'
}

resolve_project_id() {
  local arg_project_id="${1:-}"
  if [[ -n "$arg_project_id" ]]; then
    printf '%s\n' "$arg_project_id"
    return
  fi

  if [[ -n "${GITLAB_PROJECT_ID:-}" ]]; then
    printf '%s\n' "$GITLAB_PROJECT_ID"
    return
  fi

  echo "project_id가 필요합니다. 첫 번째 인자로 전달하거나 GITLAB_PROJECT_ID 환경 변수를 설정하세요." >&2
  echo "예시: scripts/list_mrs.sh 12345" >&2
  exit 1
}

gitlab_api_base() {
  require_env "GITLAB_HOST"
  printf '%s/api/v4' "${GITLAB_HOST%/}"
}

gitlab_get() {
  local endpoint="$1"
  local query="${2:-}"
  local url
  url="$(gitlab_api_base)${endpoint}"

  if [[ -n "$query" ]]; then
    url="${url}?${query}"
  fi

  curl --silent --show-error --fail \
    --header "PRIVATE-TOKEN: ${GITLAB_TOKEN}" \
    "$url"
}

gitlab_post_form() {
  local endpoint="$1"
  shift

  local url
  url="$(gitlab_api_base)${endpoint}"

  curl --silent --show-error --fail \
    --request POST \
    --header "PRIVATE-TOKEN: ${GITLAB_TOKEN}" \
    "$@" \
    "$url"
}

report_root_dir() {
  printf '%s\n' "${OUTPUT_DIR:-$DEFAULT_OUTPUT_DIR}"
}

project_report_dir() {
  local project_id="$1"
  printf '%s/project-%s\n' "$(report_root_dir)" "$project_id"
}

ensure_project_report_dir() {
  local project_id="$1"
  local dir
  dir="$(project_report_dir "$project_id")"
  mkdir -p "$dir"
  printf '%s\n' "$dir"
}

mr_report_path() {
  local project_id="$1"
  local mr_iid="$2"
  local ts="$3"
  printf '%s/%s-mr-%s.md\n' "$(project_report_dir "$project_id")" "$ts" "$mr_iid"
}

summary_report_path() {
  local project_id="$1"
  local ts="$2"
  printf '%s/%s-summary.md\n' "$(project_report_dir "$project_id")" "$ts"
}

pretty_json() {
  if command -v jq >/dev/null 2>&1; then
    jq .
  else
    cat
  fi
}
