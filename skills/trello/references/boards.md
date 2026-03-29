# Trello Boards Reference

Use this file when the task is board-scoped: resolving a board, reading board-level status, listing lists/cards/labels on a board, or creating board-scoped resources.

Official reference:

- `https://developer.atlassian.com/cloud/trello/rest/api-group-boards/#api-group-boards`

## High-value board operations

- `GET /boards/{id}`
  - Read a single board
  - Prefer narrow query parameters such as `fields`, `lists`, `cards`, `labels`, or `members` only when needed
- `GET /boards/{id}/lists`
  - Read lists on a board
- `GET /boards/{id}/cards`
  - Read cards on a board
- `GET /boards/{id}/labels`
  - Read labels on a board
- `POST /boards/{id}/lists`
  - Create a new list on a board
- `POST /boards/{id}/labels`
  - Create a new label on a board
- `POST /boards/`
  - Create a board

## Recommended usage in this skill

- Use board endpoints first when the user asks for board summaries, sprint status, backlog health, or list-level navigation.
- Check `TRELLO_BOARD_ID` before asking the user for a board ID when the request is clearly board-scoped but no explicit board is supplied.
- Prefer `GET /boards/{id}/lists` and `GET /boards/{id}/cards` over loading a fully expanded board unless the task really needs multiple embedded collections in one response.

## Common reads

```bash
"$TRELLO_API" GET /boards/<board_id> "fields=name,url,closed"
"$TRELLO_API" GET /boards/<board_id>/lists "fields=name,pos,closed"
"$TRELLO_API" GET /boards/<board_id>/cards "fields=name,idList,idMembers,due,closed,url&filter=open"
"$TRELLO_API" GET /boards/<board_id>/labels "fields=name,color"
```

## Common writes

```bash
"$TRELLO_API" POST /boards/<board_id>/lists "name=QA+Ready&pos=bottom"
"$TRELLO_API" POST /boards/<board_id>/labels "name=Blocked&color=red"
```

## Guardrails

- Do not request heavy board expansions by default. Pull only the collections the workflow needs.
- Treat board creation and board deletion as explicit user-confirmed operations.
- Board-scoped bulk views are useful for summaries, but writes should usually move down to list or card scope for safety.
