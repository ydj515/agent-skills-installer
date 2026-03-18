#!/usr/bin/env bash
set -euo pipefail

printf 'cwd=%s\n' "$PWD"
printf 'entries:\n'
find . -maxdepth 2 -mindepth 1 | sort
