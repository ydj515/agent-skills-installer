#!/usr/bin/env bash

set -euo pipefail

SCRIPT_DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")" && pwd)"
source "${SCRIPT_DIR}/common.sh"

require_command "jq"

PROJECT_ID="$(resolve_project_id "${1:-}")"
MR_IID="${2:-}"
FINDINGS_FILE="${3:-}"
OUTPUT_FILE="${4:-}"

if [[ -z "${MR_IID}" ]]; then
  echo "mr_iid가 필요합니다." >&2
  echo "예시: scripts/generate_review_markdown_from_findings.sh 12345 17 findings.json review.md" >&2
  exit 1
fi

if [[ -z "${FINDINGS_FILE}" ]]; then
  echo "finding JSON 파일 경로가 필요합니다." >&2
  echo "예시: scripts/generate_review_markdown_from_findings.sh 12345 17 findings.json review.md" >&2
  exit 1
fi

if [[ ! -f "${FINDINGS_FILE}" ]]; then
  echo "finding JSON 파일 '${FINDINGS_FILE}' 을(를) 찾을 수 없습니다." >&2
  exit 1
fi

if [[ -z "${OUTPUT_FILE}" ]]; then
  OUTPUT_FILE="$(mktemp)"
fi

jq -e '.findings and (.findings | type == "array")' "${FINDINGS_FILE}" >/dev/null || {
  echo "finding JSON 형식이 올바르지 않습니다. 최상위에 findings 배열이 필요합니다." >&2
  exit 1
}

render_section() {
  local severity="$1"
  local heading="$2"

  printf '## %s\n' "${heading}" >> "${OUTPUT_FILE}"

  local count
  count="$(jq --arg severity "${severity}" '[.findings[] | select((.severity // "") == $severity)] | length' "${FINDINGS_FILE}")"

  if [[ "${count}" == "0" ]]; then
    printf -- '- 없음\n\n' >> "${OUTPUT_FILE}"
    return
  fi

  jq -r --arg severity "${severity}" '
    .findings[]
    | select((.severity // "") == $severity)
    | (
        "### "
        + (if (.priority // "") != "" then "[" + .priority + "] " else "" end)
        + ((.title // "제목 없음") | sub("^[[]P[1-5][]][[:space:]]+"; "")) + "\n"
        + "- ID: `" + (.id // "") + "`\n"
        + (if (.priority // "") != "" then "- Priority: `" + .priority + "`\n" else "" end)
        + (if (.category // "") != "" then "- Category: `" + .category + "`\n" else "" end)
        + (if (.confidence // "") != "" then "- Confidence: `" + .confidence + "`\n" else "" end)
        + (if (.file_path // "") != "" then
            "- 위치: `" + .file_path + ":" + ((.line_start // .anchor_line // "?")|tostring)
            + (if (.line_end // .line_start // .anchor_line // "") != (.line_start // .anchor_line // "") then "-" + ((.line_end // "")|tostring) else "" end)
            + "`\n"
          else
            "- 위치: `미지정`\n"
          end)
        + "- 내용: " + (.body // "") + "\n"
        + (if (.suggested_fix // "") != "" then "- 수정 제안: " + .suggested_fix + "\n" else "" end)
        + (if (.code_context // "") != "" then "- 코드 단서: `" + .code_context + "`\n" else "" end)
      )
  ' "${FINDINGS_FILE}" >> "${OUTPUT_FILE}"

  printf '\n' >> "${OUTPUT_FILE}"
}

summary="$(jq -r '.summary // "요약 없음"' "${FINDINGS_FILE}")"
generated_at="$(jq -r '.generated_at // empty' "${FINDINGS_FILE}")"
mr_url="$(jq -r '.mr_url // empty' "${FINDINGS_FILE}")"
findings_count="$(jq '.findings | length' "${FINDINGS_FILE}")"

{
  printf '# MR !%s 리뷰 초안\n\n' "${MR_IID}"
  printf '## Summary\n'
  printf -- '- %s\n' "${summary}"
  printf -- '- 대상 프로젝트: `%s`\n' "${PROJECT_ID}"
  printf -- '- 대상 MR: `!%s`\n' "${MR_IID}"
  printf -- '- finding 수: `%s`\n' "${findings_count}"
  if [[ -n "${generated_at}" ]]; then
    printf -- '- 생성 시각: `%s`\n' "${generated_at}"
  fi
  if [[ -n "${mr_url}" ]]; then
    printf -- '- MR URL: %s\n' "${mr_url}"
  fi
  printf '\n'
} > "${OUTPUT_FILE}"

render_section "blocking" "Blocking issues"
render_section "suggestion" "Non-blocking suggestions"
render_section "question" "Open questions"

printf '%s\n' "${OUTPUT_FILE}"
