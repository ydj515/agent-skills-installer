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
  echo "예시: scripts/fetch_mr_details.sh 12345 17" >&2
  exit 1
fi

# 단일 MR의 핵심 메타데이터를 조회한다.
gitlab_get "/projects/${PROJECT_ID}/merge_requests/${MR_IID}" | pretty_json
