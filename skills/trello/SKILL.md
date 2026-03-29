---
name: trello
description: Problem-first Trello workflow for summarizing boards, creating or updating cards, moving work across lists, adding comments or checklists, and cleaning up backlogs through safe Trello API automation. Use when users say things like "summarize this Trello board", "create a Trello card in Backlog", "move these cards to Done", "add a checklist/comment", "find the right card", or "clean up stale Trello cards". Prefer this skill when Trello URLs, board names, list names, card names, sprint grooming, or backlog triage are mentioned. Do not use for generic planning advice with no Trello artifact or for non-Trello tools such as Jira or Notion.
---

# Trello Workflow

Treat this skill as a problem-first workflow layer over the Trello REST API. The user describes the outcome they want; the skill chooses the smallest safe read and write sequence needed to finish the job.

## What good looks like

Consider the task complete only when all of these are true:

- Resolve the correct board, list, or card without guessing.
- Inspect current state before writing.
- Apply the smallest safe mutation that satisfies the request.
- Re-read the changed resource and summarize the result.
- Ask for confirmation before destructive or bulk changes.

## Supported workflows

This skill is optimized for a small set of high-value repeated workflows:

1. Summarize board state and blockers.
2. Create or triage cards from a short request.
3. Move cards across lists for sprint or backlog management.
4. Add comments, due dates, members, or checklists to an existing card.
5. Clean up stale or closed work after previewing candidates.

For richer examples and expected outputs, read `references/workflows.md`.

## Prerequisite check

Before making Trello calls, verify credentials and required tools:

```bash
test -n "${TRELLO_API_KEY:-}" && test -n "${TRELLO_TOKEN:-}"
command -v curl >/dev/null 2>&1
command -v python3 >/dev/null 2>&1
```

If credentials are missing, pause and ask the user to provide them or confirm a browser-based fallback. Never print secrets or hardcode them in files.

If the user does not already have a key and token, direct them to `references/setup.md` for the issuance flow.

## Skill path

Set these once in the shell:

```bash
export CODEX_HOME="${CODEX_HOME:-$HOME/.codex}"
export TRELLO_SKILL_DIR="$CODEX_HOME/skills/trello"
export TRELLO_API="$TRELLO_SKILL_DIR/scripts/trello_api.sh"
export TRELLO_FIND="$TRELLO_SKILL_DIR/scripts/trello_find.py"
export TRELLO_URL_INFO="$TRELLO_SKILL_DIR/scripts/resolve_trello_url.py"
# Optional board-level default when one board is used repeatedly
export TRELLO_BOARD_ID="<default-board-id>"
```

If the skill is installed in project scope instead, point `TRELLO_SKILL_DIR` at that copy.

## Operating mode

- Prefer API-first automation for repeatable and auditable work.
- Prefer problem-first reasoning over tool-first chatter. Start from the user's outcome, then choose the needed board, list, card, and endpoint.
- Prefer short, narrow reads with `fields=...` and scoped endpoints before reading an entire board.
- Fall back to browser automation only when credentials are unavailable, the user explicitly wants a visual check, or the needed detail is not exposed cleanly through the API.

## Standard operating procedure

1. Classify the request.
   - Decide whether the user wants inspection, creation, mutation, or cleanup.
2. Resolve the target.
   - If the user provides a Trello URL, parse it with `scripts/resolve_trello_url.py`.
   - If the user provides only names, search with `scripts/trello_find.py` before mutating.
   - If a board-scoped API call needs `board_id` and it is still unknown, check `TRELLO_BOARD_ID` first. If that is unset, ask the user for the board ID or for an explicit board choice.
3. Inspect current state.
   - Read the smallest board, list, or card payload that can validate intent.
4. Sanity-check the mutation.
   - For destructive, bulk, or ambiguous changes, summarize the impact and ask for confirmation.
5. Apply the mutation.
   - Change one scope at a time so failures are easier to explain and recover from.
6. Verify and report.
   - Re-read the mutated resource and summarize what changed, what remains, and any follow-up risk.

## Target resolution patterns

### Resolve from a Trello URL

Use the parser script first:

```bash
python3 "$TRELLO_URL_INFO" "https://trello.com/c/abcd1234/card-title"
```

Then use the returned `short_id` to fetch the canonical resource and continue with its full `id`.

### Resolve from board, list, or card names

Search by name before mutating:

```bash
python3 "$TRELLO_FIND" boards "Platform Roadmap"
python3 "$TRELLO_FIND" lists "In Progress" --board <board_id>
python3 "$TRELLO_FIND" cards "OAuth rollout" --board <board_id>
```

If `board_id` is required but not passed explicitly, `scripts/trello_find.py` should fall back to `TRELLO_BOARD_ID`. If both are missing, stop and ask the user for the board ID or for the intended board.

If multiple matches remain, stop and ask the user which resource is intended. Do not guess from partial matches.

## Common workflow recipes

### Summarize a board

Use this when the user asks for status, blockers, workload distribution, or sprint readiness.

1. Resolve the board.
2. Read lists and open cards.
3. Group cards by list, due date, or assignee as needed.
4. Return a concise summary with blockers, overdue items, and suggested next actions.

Core commands:

```bash
"$TRELLO_API" GET /boards/<board_id>/lists "fields=name,pos,closed"
"$TRELLO_API" GET /boards/<board_id>/cards "fields=name,idList,idMembers,due,closed,url&filter=open"
```

### Create or triage a card

Use this when the user provides a short task description and wants a card created in the right list.

1. Resolve the destination board and list.
2. Create the card with only the fields the user actually requested.
3. Optionally add due date, checklist, members, or a comment if explicitly asked.
4. Re-read the card and return the final URL.

Core command:

```bash
"$TRELLO_API" POST /cards "idList=<list_id>&name=Write+draft&desc=First+pass"
```

### Move or update a card

Use this for list moves, renames, due date changes, or ownership updates.

1. Resolve the exact card.
2. Read current card fields before changing them.
3. Apply only the requested fields.
4. Re-read and confirm the old and new state.

Core commands:

```bash
"$TRELLO_API" GET /cards/<card_id> "fields=name,idList,idMembers,due,closed,url"
"$TRELLO_API" PUT /cards/<card_id> "idList=<destination_list_id>"
```

### Comment, checklist, or enrichment updates

Use this when the user wants context added to an existing card without changing its list placement.

Core commands:

```bash
"$TRELLO_API" POST /cards/<card_id>/actions/comments "text=Status+updated+from+Codex"
"$TRELLO_API" POST /cards/<card_id>/checklists "name=Launch+checklist"
```

### Backlog or stale-card cleanup

Use this for archive, close, or bulk moves only after previewing candidates.

1. Resolve the board or list.
2. Preview candidate cards with evidence such as closed state, due date, or inactivity signal.
3. Summarize impact and get confirmation.
4. Apply changes in small batches.
5. Re-read and report exactly what changed.

## Failure handling

- Authentication failure:
  - Re-check `TRELLO_API_KEY` and `TRELLO_TOKEN`.
  - Verify the request works with a simple read before retrying writes.
- Ambiguous matches:
  - Show the candidate boards, lists, or cards and ask the user to choose.
- Failed write after partial success:
  - Re-read the target resource first; do not assume the mutation failed cleanly.
- Repeated API errors:
  - Stop retrying blind writes.
  - Reduce scope to a single resource and inspect the raw response body.

Open only what the workflow needs:

- `references/setup.md`
- `references/workflows.md`
- `references/troubleshooting.md`
- `references/boards.md`
- `references/lists.md`
- `references/cards.md`
- `references/comments-checklists.md`
- `references/labels.md`

## Guardrails

- Resolve canonical IDs before mutating resources. Names and short links are not enough for reliable writes.
- Prefer one logical write at a time unless the user explicitly requests bulk automation.
- Confirm destructive or hard-to-reverse operations such as archive, close, bulk move, or checklist rewrite.
- Re-read the changed board, list, or card after every write and explain the outcome.
- Keep secrets out of logs, summaries, payload files, and code samples.
- If the request is really about planning advice rather than Trello state, do not force this skill into the flow.
