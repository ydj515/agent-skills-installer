# Trello Troubleshooting

Use this file when the Trello workflow is failing, over-triggering, or producing uncertain matches.

## Contents

- Authentication and access failures
- Ambiguous resource matches
- Write validation failures
- Bulk change safety
- Trigger boundaries

## Authentication and access failures

Symptoms:

- `401` or `403` responses
- Reads fail before any mutation starts
- A known board or card cannot be opened through the API

Checklist:

1. Confirm `TRELLO_API_KEY` and `TRELLO_TOKEN` are set.
2. Run a simple read:

```bash
"$TRELLO_API" GET /members/me/boards "fields=name,url"
```

3. If the read fails, stop and fix credentials before attempting writes.
4. If one board fails but others work, treat it as a scope or permission issue.

## Ambiguous resource matches

Symptoms:

- Multiple boards have similar names
- A list such as `Done` exists on several boards
- Card search returns near-duplicate titles

Recommended action:

1. Narrow the scope to a board first.
2. Show the candidate set with names and URLs.
3. Ask the user to choose when more than one candidate remains.

Never guess from partial name matches when a write is involved.

## Write validation failures

Symptoms:

- A write returns an error after a previous step succeeded
- It is unclear whether the mutation applied partially
- The board view looks stale compared with the last read

Recommended action:

1. Re-read the exact resource that was supposed to change.
2. Compare the intended fields with the actual current state.
3. Retry only if the current state proves the write did not apply.
4. If repeated failures continue, reduce the mutation to a single field.

## Bulk change safety

Before bulk archive, close, or move operations:

1. Preview candidate resources.
2. State the filtering rule explicitly.
3. Ask for confirmation.
4. Apply in small batches if the count is large.
5. Re-read and summarize results after each batch.

## Trigger boundaries

This skill should trigger for:

- Trello board summaries
- Trello card creation, move, update, comment, checklist, due date work
- Backlog grooming or sprint triage tied to actual Trello artifacts

This skill should not trigger for:

- Generic project management advice with no Trello board, list, card, or URL
- Requests that are really about Jira, Notion, Linear, or GitHub Projects
- Free-form brainstorming that does not need Trello reads or writes
