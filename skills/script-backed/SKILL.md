---
name: script-backed
description: Use when you need a small bundled helper script to inspect the current workspace and summarize the environment before making changes.
---

# Script-Backed Workspace Helper

## When To Use
- The task needs a quick repository snapshot before implementation.
- You want a reproducible helper command bundled with the skill.
- You need the same skill to work across multiple agent CLIs.

## Workflow
1. Run the bundled script to capture the current working directory and visible files.
2. Use the output as lightweight context before editing.
3. Continue with the main task using the gathered summary.

## Bundled Script
- `scripts/print_context.sh`

## Notes
- The script is intentionally small so installers can verify script copying and executable permissions.
