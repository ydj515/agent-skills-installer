#!/usr/bin/env bash

set -euo pipefail

SCRIPT_DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")" && pwd)"
source "${SCRIPT_DIR}/common.sh"

require_env "GITLAB_TOKEN"
require_command "curl"

PROJECT_ID="$(resolve_project_id "${1:-}")"
MR_IID="${2:-}"
COMMENT_FILE="${3:-}"

if [[ -z "${MR_IID}" ]]; then
  echo "mr_iid가 필요합니다." >&2
  echo "예시: scripts/post_review_comment.sh 12345 17 review-comment.md" >&2
  exit 1
fi

if [[ -z "${COMMENT_FILE}" ]]; then
  echo "comment_file 경로가 필요합니다." >&2
  echo "예시: scripts/post_review_comment.sh 12345 17 review-comment.md" >&2
  exit 1
fi

if [[ ! -f "${COMMENT_FILE}" ]]; then
  echo "comment_file '${COMMENT_FILE}' 을(를) 찾을 수 없습니다." >&2
  exit 1
fi

if [[ "${POST_REVIEW:-false}" != "true" ]]; then
  echo "실제 코멘트 등록은 POST_REVIEW=true 일 때만 수행합니다." >&2
  exit 1
fi

COMMENT_BODY="$(cat "${COMMENT_FILE}")"

if [[ -z "${COMMENT_BODY}" ]]; then
  echo "comment_file 이 비어 있습니다." >&2
  exit 1
fi

# GitLab MR 일반 note로 리뷰 초안을 등록한다.
gitlab_post_form \
  "/projects/${PROJECT_ID}/merge_requests/${MR_IID}/notes" \
  --data-urlencode "body=${COMMENT_BODY}" | pretty_json
