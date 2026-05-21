#!/usr/bin/env bash

set -euo pipefail

SCRIPT_DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")" && pwd)"
source "${SCRIPT_DIR}/common.sh"

PROJECT_ID="$(resolve_project_id "${1:-}")"
MR_IID="${2:-}"
SOURCE_FILE="${3:-}"
RUN_TS="$(timestamp_for_reports)"

if [[ -z "${MR_IID}" ]]; then
  echo "mr_iid가 필요합니다." >&2
  echo "예시: scripts/write_mr_review_markdown.sh 12345 17 review.md" >&2
  exit 1
fi

if [[ -z "${SOURCE_FILE}" ]]; then
  echo "에러: 저장할 소스 마크다운(review) 파일 경로가 필요합니다." >&2
  echo "사용법: scripts/write_mr_review_markdown.sh <project_id> <mr_iid> <source_review.md>" >&2
  exit 1
fi

if [[ ! -f "${SOURCE_FILE}" ]]; then
  echo "에러: 소스 마크다운 파일 '${SOURCE_FILE}' 을(를) 찾을 수 없습니다." >&2
  exit 1
fi

TARGET_DIR="$(ensure_project_report_dir "${PROJECT_ID}")"
TARGET_PATH="$(mr_report_path "${PROJECT_ID}" "${MR_IID}" "${RUN_TS}")"

# 실행 시점 타임스탬프와 MR IID 규칙으로 리뷰 markdown을 저장한다.
cp "${SOURCE_FILE}" "${TARGET_PATH}"

printf '%s\n' "${TARGET_PATH}"
