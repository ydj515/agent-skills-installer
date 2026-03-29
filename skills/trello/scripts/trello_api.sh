#!/usr/bin/env bash
set -euo pipefail

usage() {
  cat <<'EOF'
Usage:
  trello_api.sh METHOD PATH [PARAMS_OR_@FILE]

Examples:
  trello_api.sh GET /members/me/boards "fields=name,url"
  trello_api.sh GET /boards/<board_id>/lists "fields=name,pos"
  trello_api.sh POST /cards "idList=<list_id>&name=Write+draft"
  trello_api.sh PUT /cards/<card_id> "idList=<list_id>"
  trello_api.sh POST /cards/<card_id>/actions/comments "text=Looks+good"
  trello_api.sh POST /cards @payload.txt

Notes:
  - Requires TRELLO_API_KEY and TRELLO_TOKEN in the environment.
  - PATH is relative to https://api.trello.com/1.
  - The third argument is appended as query/form data.
  - Use @file to load a prebuilt payload string from a file.
EOF
}

require_env() {
  local name="$1"
  if [[ -z "${!name:-}" ]]; then
    echo "Error: ${name} is required." >&2
    exit 1
  fi
}

if [[ "${1:-}" == "--help" || "${1:-}" == "-h" ]]; then
  usage
  exit 0
fi

if [[ $# -lt 2 || $# -gt 3 ]]; then
  usage >&2
  exit 1
fi

if ! command -v curl >/dev/null 2>&1; then
  echo "Error: curl is required but was not found on PATH." >&2
  exit 1
fi

require_env "TRELLO_API_KEY"
require_env "TRELLO_TOKEN"

method="${1^^}"
path_part="$2"
payload_input="${3:-}"
base_url="${TRELLO_BASE_URL:-https://api.trello.com/1}"
path_part="${path_part#/}"
url="${base_url}/${path_part}"

case "$method" in
  GET|POST|PUT|DELETE) ;;
  *)
    echo "Error: unsupported method '$method'." >&2
    exit 1
    ;;
esac

payload=""
if [[ -n "$payload_input" ]]; then
  if [[ "$payload_input" == @* ]]; then
    payload_file="${payload_input#@}"
    if [[ ! -f "$payload_file" ]]; then
      echo "Error: payload file not found: $payload_file" >&2
      exit 1
    fi
    payload="$(<"$payload_file")"
  else
    payload="$payload_input"
  fi
fi

auth="key=${TRELLO_API_KEY}&token=${TRELLO_TOKEN}"
if [[ -n "$payload" ]]; then
  auth="${auth}&${payload}"
fi

curl_args=(
  --silent
  --show-error
  --fail-with-body
  --request "$method"
  --header "Accept: application/json"
  "$url"
)

if [[ "$method" == "GET" ]]; then
  curl_args+=(--get --data "$auth")
else
  curl_args+=(--data "$auth")
fi

exec curl "${curl_args[@]}"
