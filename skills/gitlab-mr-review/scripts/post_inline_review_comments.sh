#!/usr/bin/env bash

set -euo pipefail

SCRIPT_DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")" && pwd)"
source "${SCRIPT_DIR}/common.sh"

require_env "GITLAB_TOKEN"
require_env "GITLAB_HOST"
require_command "curl"
require_command "jq"

PROJECT_ID="$(resolve_project_id "${1:-}")"
MR_IID="${2:-}"
FINDINGS_FILE="${3:-}"

if [[ -z "${MR_IID}" ]]; then
  echo "mr_iid가 필요합니다." >&2
  echo "예시: scripts/post_inline_review_comments.sh 12345 17 findings.json" >&2
  exit 1
fi

if [[ -z "${FINDINGS_FILE}" ]]; then
  echo "finding JSON 파일 경로가 필요합니다." >&2
  echo "예시: scripts/post_inline_review_comments.sh 12345 17 findings.json" >&2
  exit 1
fi

if [[ ! -f "${FINDINGS_FILE}" ]]; then
  echo "finding JSON 파일 '${FINDINGS_FILE}' 을(를) 찾을 수 없습니다." >&2
  exit 1
fi

if [[ "${POST_REVIEW:-false}" != "true" ]]; then
  echo "실제 인라인 코멘트 등록은 POST_REVIEW=true 일 때만 수행합니다." >&2
  exit 1
fi

jq -e '.findings and (.findings | type == "array")' "${FINDINGS_FILE}" >/dev/null || {
  echo "finding JSON 형식이 올바르지 않습니다. 최상위에 findings 배열이 필요합니다." >&2
  exit 1
}

TMP_DIR="$(mktemp -d)"
POSTED_JSONL="${TMP_DIR}/posted.jsonl"
SKIPPED_JSONL="${TMP_DIR}/skipped.jsonl"
FAILED_JSONL="${TMP_DIR}/failed.jsonl"
DETAILS_JSON="${TMP_DIR}/details.json"
VERSIONS_JSON="${TMP_DIR}/versions.json"
DISCUSSIONS_JSON="${TMP_DIR}/discussions.json"

cleanup() {
  rm -rf "${TMP_DIR}"
}
trap cleanup EXIT

: > "${POSTED_JSONL}"
: > "${SKIPPED_JSONL}"
: > "${FAILED_JSONL}"

gitlab_get "/projects/${PROJECT_ID}/merge_requests/${MR_IID}" > "${DETAILS_JSON}"
gitlab_get "/projects/${PROJECT_ID}/merge_requests/${MR_IID}/versions" > "${VERSIONS_JSON}"
gitlab_get "/projects/${PROJECT_ID}/merge_requests/${MR_IID}/discussions" "per_page=100" > "${DISCUSSIONS_JSON}"

BASE_SHA="$(jq -r '.[0].base_commit_sha // empty' "${VERSIONS_JSON}")"
START_SHA="$(jq -r '.[0].start_commit_sha // empty' "${VERSIONS_JSON}")"
HEAD_SHA="$(jq -r '.[0].head_commit_sha // empty' "${VERSIONS_JSON}")"

if [[ -z "${BASE_SHA}" || -z "${START_SHA}" || -z "${HEAD_SHA}" ]]; then
  BASE_SHA="$(jq -r '.diff_refs.base_sha // empty' "${DETAILS_JSON}")"
  START_SHA="$(jq -r '.diff_refs.start_sha // empty' "${DETAILS_JSON}")"
  HEAD_SHA="$(jq -r '.diff_refs.head_sha // empty' "${DETAILS_JSON}")"
fi

if [[ -z "${BASE_SHA}" || -z "${START_SHA}" || -z "${HEAD_SHA}" ]]; then
  echo "MR diff refs를 확인할 수 없어 인라인 코멘트를 등록할 수 없습니다." >&2
  exit 1
fi

append_result() {
  local target_file="$1"
  local json_line="$2"
  printf '%s\n' "${json_line}" >> "${target_file}"
}

normalize_priority() {
  local priority="${1:-}"
  local severity="${2:-}"

  if [[ -n "${priority}" ]]; then
    printf '%s\n' "$(printf '%s' "${priority}" | tr '[:lower:]' '[:upper:]')"
    return
  fi

  case "${severity}" in
    blocking) printf 'P1\n' ;;
    suggestion) printf 'P3\n' ;;
    question) printf 'P3\n' ;;
    *) printf 'P3\n' ;;
  esac
}

sanitize_title() {
  local title="${1:-}"
  printf '%s\n' "$(printf '%s' "${title}" | sed -E 's/^\[(P[1-5])\][[:space:]]+//')"
}

build_comment_body() {
  local priority="$1"
  local title="$2"
  local body="$3"
  local file_path="$4"
  local line_start="$5"
  local line_end="$6"
  local suggested_fix="$7"
  local code_context="$8"
  local dedupe_marker="$9"

  local range="${line_start}"
  if [[ -n "${line_end}" && "${line_end}" != "${line_start}" ]]; then
    range="${line_start}-${line_end}"
  fi

  {
    printf '**[%s] %s**\n' "${priority}" "${title}"
    printf '%s\n\n' "${body}"
    printf '파일: `%s:%s`\n' "${file_path}" "${range}"
    if [[ -n "${suggested_fix}" ]]; then
      printf '수정 제안: %s\n' "${suggested_fix}"
    fi
    if [[ -n "${code_context}" ]]; then
      printf '코드 단서: `%s`\n' "${code_context}"
    fi
    printf '<!-- %s -->\n' "${dedupe_marker}"
  }
}

has_duplicate() {
  local marker="$1"
  jq -e --arg marker "${marker}" '[.[] | .notes[]? | .body // ""] | any(contains($marker))' "${DISCUSSIONS_JSON}" >/dev/null
}

while IFS= read -r finding; do
  finding_id="$(jq -r '.id // empty' <<<"${finding}")"
  severity="$(jq -r '.severity // "suggestion"' <<<"${finding}")"
  priority="$(jq -r '.priority // empty' <<<"${finding}")"
  raw_title="$(jq -r '.title // empty' <<<"${finding}")"
  title="$(sanitize_title "${raw_title}")"
  body="$(jq -r '.body // empty' <<<"${finding}")"
  file_path="$(jq -r '.file_path // empty' <<<"${finding}")"
  old_path="$(jq -r '.old_path // empty' <<<"${finding}")"
  new_path="$(jq -r '.new_path // empty' <<<"${finding}")"
  line_start="$(jq -r '.line_start // empty' <<<"${finding}")"
  line_end="$(jq -r '.line_end // empty' <<<"${finding}")"
  anchor_line="$(jq -r '.anchor_line // empty' <<<"${finding}")"
  line_side="$(jq -r '.line_side // empty' <<<"${finding}")"
  suggested_fix="$(jq -r '.suggested_fix // empty' <<<"${finding}")"
  code_context="$(jq -r '.code_context // empty' <<<"${finding}")"
  dedupe_key="$(jq -r '.dedupe_key // empty' <<<"${finding}")"

  if [[ -z "${finding_id}" ]]; then
    finding_id="unknown-$(date +%s%N)"
  fi

  if [[ -z "${title}" || -z "${body}" ]]; then
    append_result "${FAILED_JSONL}" "$(jq -cn --arg id "${finding_id}" --arg reason "title/body 누락" '{id:$id, reason:$reason}')"
    continue
  fi

  if [[ -z "${file_path}" || -z "${anchor_line}" || -z "${line_side}" ]]; then
    append_result "${SKIPPED_JSONL}" "$(jq -cn --arg id "${finding_id}" --arg reason "인라인 위치 정보 부족" '{id:$id, reason:$reason}')"
    continue
  fi

  if [[ -z "${line_start}" ]]; then
    line_start="${anchor_line}"
  fi

  if [[ -z "${line_end}" ]]; then
    line_end="${anchor_line}"
  fi

  if [[ -z "${new_path}" ]]; then
    new_path="${file_path}"
  fi

  if [[ -z "${old_path}" ]]; then
    old_path="${file_path}"
  fi

  dedupe_marker="codex-dedupe:${dedupe_key:-${finding_id}}"
  normalized_priority="$(normalize_priority "${priority}" "${severity}")"

  if has_duplicate "${dedupe_marker}"; then
    append_result "${SKIPPED_JSONL}" "$(jq -cn --arg id "${finding_id}" --arg reason "기존 discussion 중복" '{id:$id, reason:$reason}')"
    continue
  fi

  comment_body="$(build_comment_body "${normalized_priority}" "${title}" "${body}" "${file_path}" "${line_start}" "${line_end}" "${suggested_fix}" "${code_context}" "${dedupe_marker}")"

  CURL_ARGS=(
    --silent
    --show-error
    --fail
    --request POST
    --header "PRIVATE-TOKEN: ${GITLAB_TOKEN}"
    --form-string "body=${comment_body}"
    --form "position[position_type]=text"
    --form "position[base_sha]=${BASE_SHA}"
    --form "position[start_sha]=${START_SHA}"
    --form "position[head_sha]=${HEAD_SHA}"
    --form "position[old_path]=${old_path}"
    --form "position[new_path]=${new_path}"
  )

  case "${line_side}" in
    new)
      CURL_ARGS+=(--form "position[new_line]=${anchor_line}")
      ;;
    old)
      CURL_ARGS+=(--form "position[old_line]=${anchor_line}")
      ;;
    *)
      append_result "${SKIPPED_JSONL}" "$(jq -cn --arg id "${finding_id}" --arg reason "line_side는 new/old만 지원" '{id:$id, reason:$reason}')"
      continue
      ;;
  esac

  if response="$(curl "${CURL_ARGS[@]}" "$(gitlab_api_base)/projects/${PROJECT_ID}/merge_requests/${MR_IID}/discussions" 2>&1)"; then
    append_result "${POSTED_JSONL}" "$(jq -cn --arg id "${finding_id}" --arg file_path "${file_path}" --argjson anchor_line "${anchor_line}" --arg severity "${severity}" --arg priority "${normalized_priority}" '{id:$id, file_path:$file_path, anchor_line:$anchor_line, severity:$severity, priority:$priority}')"
  else
    append_result "${FAILED_JSONL}" "$(jq -cn --arg id "${finding_id}" --arg reason "${response}" '{id:$id, reason:$reason}')"
  fi
done < <(jq -c '.findings[]' "${FINDINGS_FILE}")

POSTED_JSON="$(jq -s '.' "${POSTED_JSONL}")"
SKIPPED_JSON="$(jq -s '.' "${SKIPPED_JSONL}")"
FAILED_JSON="$(jq -s '.' "${FAILED_JSONL}")"
TOTAL_FINDINGS="$(jq '.findings | length' "${FINDINGS_FILE}")"

jq -n \
  --argjson project_id "${PROJECT_ID}" \
  --argjson mr_iid "${MR_IID}" \
  --arg findings_file "${FINDINGS_FILE}" \
  --argjson total_findings "${TOTAL_FINDINGS}" \
  --argjson posted "${POSTED_JSON}" \
  --argjson skipped "${SKIPPED_JSON}" \
  --argjson failed "${FAILED_JSON}" \
  '{
    project_id: $project_id,
    mr_iid: $mr_iid,
    findings_file: $findings_file,
    total_findings: $total_findings,
    posted_count: ($posted | length),
    skipped_count: ($skipped | length),
    failed_count: ($failed | length),
    posted: $posted,
    skipped: $skipped,
    failed: $failed
  }'
