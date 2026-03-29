# Trello Labels Reference

Use this file when the task involves reading labels, creating labels, updating label metadata, or attaching and detaching labels from cards.

Official references:

- Labels: `https://developer.atlassian.com/cloud/trello/rest/api-group-labels/#api-group-labels`
- Board label creation and board label listing also appear in the Boards group
- Card label attachment and detachment also appear in the Cards group

## Label operations from the Labels group

- `GET /labels/{id}`
  - Read a single label
- `PUT /labels/{id}`
  - Update label metadata such as `name` or `color`
- `DEL /labels/{id}`
  - Delete a label
- `PUT /labels/{id}/{field}`
  - Update a specific label field
- `POST /labels`
  - Create a label directly

## Related board and card operations

- `GET /boards/{id}/labels`
  - Read all labels on a board
- `POST /boards/{id}/labels`
  - Create a label on a board
- `POST /cards/{id}/idLabels`
  - Attach an existing label to a card by label ID
- `POST /cards/{id}/labels`
  - Create and attach a label from card context
- `DEL /cards/{id}/idLabels/{idLabel}`
  - Detach a label from a card

## Recommended usage in this skill

- When the user wants a reusable workflow label such as `Blocked` or `High Priority`, create it at board scope first.
- When the user wants to mark one existing card quickly, attach or detach a label from card scope.
- Resolve the board before creating labels so the new label lands in the correct workflow context.

## Common reads and writes

```bash
"$TRELLO_API" GET /boards/<board_id>/labels "fields=name,color"
"$TRELLO_API" POST /boards/<board_id>/labels "name=Blocked&color=red"
"$TRELLO_API" POST /cards/<card_id>/idLabels "value=<label_id>"
"$TRELLO_API" DEL /cards/<card_id>/idLabels/<label_id> ""
```

## Guardrails

- Do not delete a label unless the user clearly asks for deletion.
- Reuse existing labels when names and colors already match the user's intent.
- Confirm before mass relabeling many cards.
