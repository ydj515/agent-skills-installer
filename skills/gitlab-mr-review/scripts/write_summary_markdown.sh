#!/usr/bin/env bash

set -euo pipefail

SCRIPT_DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")" && pwd)"
source "${SCRIPT_DIR}/common.sh"

PROJECT_ID="$(resolve_project_id "${1:-}")"
SOURCE_FILE="${2:-}"
RUN_TS="$(timestamp_for_reports)"

if [[ -z "${SOURCE_FILE}" ]]; then
  echo "에러: 저장할 소스 마크다운(summary) 파일 경로가 필요합니다." >&2
  echo "사용법: scripts/write_summary_markdown.sh <project_id> <source_summary.md>" >&2
  exit 1
fi

if [[ ! -f "${SOURCE_FILE}" ]]; then
  echo "에러: 소스 마크다운 파일 '${SOURCE_FILE}' 을(를) 찾을 수 없습니다." >&2
  exit 1
fi

TARGET_DIR="$(ensure_project_report_dir "${PROJECT_ID}")"
TARGET_PATH="$(summary_report_path "${PROJECT_ID}" "${RUN_TS}")"

# 같은 실행 타임스탬프를 사용해 summary 파일을 저장한다.
cp "${SOURCE_FILE}" "${TARGET_PATH}"

printf '%s\n' "${TARGET_PATH}"
