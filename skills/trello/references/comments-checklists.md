# Trello Comments and Checklists Reference

Use this file when the task needs conversational updates on a card, checklist creation, checklist item management, or comment editing and removal.

Official references:

- Cards: `https://developer.atlassian.com/cloud/trello/rest/api-group-cards/#api-group-cards`
- Checklists: `https://developer.atlassian.com/cloud/trello/rest/api-group-checklists/#api-group-checklists`

## Comment operations from the Cards group

- `POST /cards/{id}/actions/comments`
  - Add a new comment to a card
- `PUT /cards/{id}/actions/{idAction}/comments`
  - Update an existing card comment
- `DEL /cards/{id}/actions/{idAction}/comments`
  - Delete a card comment

## Checklist operations from the Cards group

- `GET /cards/{id}/checklists`
  - Read checklists attached to a card
- `POST /cards/{id}/checklists`
  - Attach or create a checklist on a card
- `GET /cards/{id}/checkItem/{idCheckItem}`
  - Read a specific check item from card context
- `PUT /cards/{id}/checkItem/{idCheckItem}`
  - Update check item state from card context
- `DEL /cards/{id}/checkItem/{idCheckItem}`
  - Remove a check item from card context
- `DEL /cards/{id}/checklists/{idChecklist}`
  - Remove a checklist from a card

## Checklist operations from the Checklists group

- `POST /checklists`
  - Create a checklist
  - Requires `idCard`
- `GET /checklists/{id}`
  - Read a checklist
- `PUT /checklists/{id}`
  - Update checklist properties such as `name` or `pos`
- `DEL /checklists/{id}`
  - Delete a checklist
- `GET /checklists/{id}/checkItems`
  - Read items in a checklist
- `POST /checklists/{id}/checkItems`
  - Add a check item
- `DEL /checklists/{id}/checkItems/{idCheckItem}`
  - Delete a check item

## Recommended usage in this skill

- Use card comment endpoints when the user wants a status update, note, handoff, or blocker explanation added to a card.
- Use card-level checklist endpoints when you are already working from a known card.
- Use checklist-level endpoints when you already have the checklist ID and need item-by-item management.

## Common writes

```bash
"$TRELLO_API" POST /cards/<card_id>/actions/comments "text=Blocked+by+staging+deploy"
"$TRELLO_API" POST /cards/<card_id>/checklists "name=Release+checklist"
"$TRELLO_API" POST /checklists/<checklist_id>/checkItems "name=Ship+docs&checked=false"
"$TRELLO_API" PUT /cards/<card_id>/checkItem/<check_item_id> "state=complete"
```

## Guardrails

- Do not delete comments or checklists unless the user explicitly asks for it.
- When modifying comments, preserve meaning and author intent; do not silently rewrite someone else's status note.
- For large checklist changes, preview the plan before adding or removing many items.
