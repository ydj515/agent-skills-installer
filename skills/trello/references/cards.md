# Trello Cards Reference

Use this file when the task is card-scoped: creating cards, reading cards, updating card fields, moving cards between lists, or enriching cards with owners and due dates.

Official reference:

- `https://developer.atlassian.com/cloud/trello/rest/api-group-cards/#api-group-cards`

## High-value card operations

- `POST /cards`
  - Create a new card
  - The official docs note that query parameters may also be replaced with a JSON request body
- `GET /cards/{id}`
  - Read a single card
- `PUT /cards/{id}`
  - Update card properties such as `name`, `desc`, `idList`, `due`, `closed`, or membership-related fields
- `DEL /cards/{id}`
  - Delete a card
- `GET /cards/{id}/board`
  - Resolve the parent board of a card
- `GET /cards/{id}/list`
  - Resolve the current list of a card
- `GET /cards/{id}/members`
  - Inspect card members

## Recommended usage in this skill

- Use card endpoints for the smallest safe write unit.
- Prefer `PUT /cards/{id}` for rename, due date, move, or close operations instead of larger board or list mutations.
- When the user asks for comments, checklists, or labels, use this file together with `references/comments-checklists.md` or `references/labels.md`.

## Common reads

```bash
"$TRELLO_API" GET /cards/<card_id> "fields=name,desc,idList,idMembers,due,closed,url"
"$TRELLO_API" GET /cards/<card_id>/board ""
"$TRELLO_API" GET /cards/<card_id>/list ""
"$TRELLO_API" GET /cards/<card_id>/members ""
```

## Common writes

```bash
"$TRELLO_API" POST /cards "idList=<list_id>&name=Write+draft&desc=First+pass"
"$TRELLO_API" PUT /cards/<card_id> "idList=<destination_list_id>"
"$TRELLO_API" PUT /cards/<card_id> "due=2026-03-30T09:00:00.000Z"
"$TRELLO_API" PUT /cards/<card_id> "closed=true"
```

## Common create and update fields

- `idList`
- `name`
- `desc`
- `due`
- `pos`
- `idMembers`
- `closed`

## Guardrails

- Do not delete cards unless the user explicitly asks for deletion.
- Prefer close or archive semantics over deletion when the user intent is ambiguous.
- Re-read the card after writes and report the final `url`, `list`, and changed fields.
