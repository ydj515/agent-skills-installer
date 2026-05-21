#!/usr/bin/env bash

set -euo pipefail

SCRIPT_DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")" && pwd)"
source "${SCRIPT_DIR}/common.sh"

require_env "GITLAB_TOKEN"
require_command "curl"

PROJECT_ID="$(resolve_project_id "${1:-}")"
MR_IID="${2:-}"

if [[ -z "${MR_IID}" ]]; then
  echo "mr_iid가 필요합니다." >&2
  echo "예시: scripts/fetch_mr_changes.sh 12345 17" >&2
  exit 1
fi

# MR의 변경 파일과 diff를 조회한다.
# GitLab 버전에 따라 changes API 응답 크기가 클 수 있으므로, 필요시 상위 호출자가 파일 우선순위만 사용한다.
gitlab_get "/projects/${PROJECT_ID}/merge_requests/${MR_IID}/changes" | pretty_json
