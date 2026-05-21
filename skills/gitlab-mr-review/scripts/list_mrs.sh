#!/usr/bin/env bash

set -euo pipefail

SCRIPT_DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")" && pwd)"
# 공통 인증, 입력 처리, API 호출 함수를 재사용한다.
source "${SCRIPT_DIR}/common.sh"

require_env "GITLAB_TOKEN"
require_command "curl"

PROJECT_ID="$(resolve_project_id "${1:-}")"
PAGE="${2:-1}"
PER_PAGE="${3:-20}"
STATE="${GITLAB_MR_STATE:-opened}"
ORDER_BY="${GITLAB_MR_ORDER_BY:-updated_at}"
SORT="${GITLAB_MR_SORT:-desc}"

QUERY="state=${STATE}&order_by=${ORDER_BY}&sort=${SORT}&page=${PAGE}&per_page=${PER_PAGE}"

# 특정 프로젝트의 open MR 목록을 최신 업데이트 순으로 조회한다.
gitlab_get "/projects/${PROJECT_ID}/merge_requests" "${QUERY}" | pretty_json
