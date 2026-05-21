#!/usr/bin/env bash

set -euo pipefail

SCRIPT_DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")" && pwd)"
source "${SCRIPT_DIR}/common.sh"

require_env "GITLAB_TOKEN"
require_command "curl"

PROJECT_ID="$(resolve_project_id "${1:-}")"
MR_IID="${2:-}"
PER_PAGE="${3:-100}"

if [[ -z "${MR_IID}" ]]; then
  echo "mr_iid가 필요합니다." >&2
  echo "예시: scripts/fetch_mr_discussions.sh 12345 17" >&2
  exit 1
fi

# 기존 discussion과 note를 조회해 중복 코멘트 여부를 판단한다.
gitlab_get "/projects/${PROJECT_ID}/merge_requests/${MR_IID}/discussions" "per_page=${PER_PAGE}" | pretty_json
