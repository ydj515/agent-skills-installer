# Trello Lists Reference

Use this file when the task is list-scoped: reading a list, creating a list, moving cards through a list boundary, or performing list-level bulk operations.

Official reference:

- `https://developer.atlassian.com/cloud/trello/rest/api-group-lists/#api-group-lists`

## High-value list operations

- `GET /lists/{id}`
  - Read a single list
- `PUT /lists/{id}`
  - Update list properties such as `name`, `closed`, `idBoard`, or `pos`
- `POST /lists`
  - Create a new list on a board
  - Requires `name` and `idBoard`
- `GET /lists/{id}/cards`
  - Read cards currently in a list
- `POST /lists/{id}/archiveAllCards`
  - Archive every card in the list
- `POST /lists/{id}/moveAllCards`
  - Move every card in the list
- `PUT /lists/{id}/closed`
  - Archive or unarchive a list

## Recommended usage in this skill

- Use list endpoints when the user talks about a workflow stage such as `Backlog`, `In Progress`, `Review`, or `Done`.
- If only a list name is given, resolve the board first. Check `TRELLO_BOARD_ID` before asking the user.
- Treat `archiveAllCards` and `moveAllCards` as destructive or bulk operations that always require confirmation.

## Common reads

```bash
"$TRELLO_API" GET /lists/<list_id> "fields=name,idBoard,pos,closed"
"$TRELLO_API" GET /lists/<list_id>/cards "fields=name,idList,idMembers,due,closed,url&filter=open"
```

## Common writes

```bash
"$TRELLO_API" POST /lists "name=QA+Ready&idBoard=<board_id>&pos=bottom"
"$TRELLO_API" PUT /lists/<list_id> "name=Ready+for+Review"
"$TRELLO_API" PUT /lists/<list_id>/closed "value=true"
```

## Guardrails

- Do not run `archiveAllCards` or `moveAllCards` without previewing candidates and confirming with the user.
- If the user intent is really about one or two cards, switch to card-level endpoints instead of list-level bulk mutations.
- When moving a list across boards with `idBoard`, confirm because it changes surrounding workflow context.
