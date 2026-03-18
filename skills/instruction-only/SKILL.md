---
name: instruction-only
description: Use when you need a lightweight planning skill that turns a rough implementation request into constraints, steps, and a verification checklist before coding.
---

# Instruction-Only Planning Helper

## When To Use
- The request needs a quick implementation plan before code changes.
- You want a checklist that can be followed by Codex, Claude Code, or Gemini CLI.
- The task does not need helper scripts or external assets.

## Workflow
1. Restate the user goal in one short sentence.
2. Extract constraints, assumptions, and risks.
3. Propose an ordered implementation plan.
4. End with a verification checklist and follow-up questions if needed.

## Output Style
- Keep the plan easy to scan.
- Prefer concrete file paths and explicit next actions.
- Call out any blocking uncertainty before implementation starts.
