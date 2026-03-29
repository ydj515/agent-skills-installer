# Trello Workflow Recipes

Use this file when the task needs a more explicit recipe, expected output shape, or a concrete mapping from a user request to Trello operations.

## Contents

- Shared entry points
- Board summary and blocker review
- Card creation from a short brief
- Card move for sprint progress
- Backlog cleanup and archive preview
- Comment and checklist enrichment

## Shared entry points

Before any workflow:

- If credentials are missing, open `references/setup.md`
- If the write path is unclear or failing, open `references/troubleshooting.md`
- If the user gives only a board-scoped hint, start from `references/boards.md`
- If the user gives only a list name, combine this file with `references/lists.md`
- If the user gives a specific card or wants a precise mutation, combine this file with `references/cards.md`

## Board summary and blocker review

Typical user requests:

- "이 Trello 보드 지금 상태 요약해줘"
- "이번 스프린트 막힌 카드 뭐야?"
- "Done 직전까지 얼마나 남았는지 정리해줘"

Recommended flow:

1. Resolve the board from URL or name.
2. Read lists and open cards.
3. Group by list.
4. Identify overdue cards, unassigned cards, and likely blockers.
5. Return a summary in this shape:

Reference flow:

- Start with `references/boards.md` for board resolution and board-level reads
- Pull `references/cards.md` only if you need deeper per-card inspection after the board summary

```text
Board: <name>
Active lists:
- <list>: <count>
- <list>: <count>
Likely blockers:
- <card> because <reason>
Due soon or overdue:
- <card> due <date>
Recommended next actions:
- <action>
```

Useful reads:

```bash
"$TRELLO_API" GET /boards/<board_id>/lists "fields=name,pos,closed"
"$TRELLO_API" GET /boards/<board_id>/cards "fields=name,idList,idMembers,due,closed,url&filter=open"
```

## Card creation from a short brief

Typical user requests:

- "Backlog에 'OAuth 롤아웃 문서화' 카드 만들어줘"
- "QA Ready 리스트에 테스트 카드 하나 추가해줘"
- "이 작업을 Trello 카드로 정리해줘"

Recommended flow:

1. Resolve the destination board and list.
2. Create the card with a clean title and only requested metadata.
3. Add description, due date, members, or checklist only if the user asked for them.
4. Re-read the card and report the URL plus final metadata.

Reference flow:

- Use `references/lists.md` to resolve the destination list safely
- Use `references/cards.md` for create and update fields
- Open `references/comments-checklists.md` only if the user explicitly wants checklist enrichment
- Open `references/labels.md` only if the card should be tagged as part of creation

Useful writes:

```bash
"$TRELLO_API" POST /cards "idList=<list_id>&name=OAuth+rollout+documentation"
"$TRELLO_API" PUT /cards/<card_id> "due=2026-04-03T09:00:00.000Z"
```

## Card move for sprint progress

Typical user requests:

- "이 카드 Done으로 옮겨줘"
- "In Review에 있는 OAuth 카드들을 QA Ready로 이동해줘"
- "카드 이름은 그대로 두고 due date만 내일로 바꿔줘"

Recommended flow:

1. Resolve the exact card or candidate set.
2. Inspect current list and due date first.
3. If multiple cards match, ask for confirmation unless the filter is explicit and safe.
4. Apply one logical update at a time.
5. Re-read and show before/after state.

Reference flow:

- Use `references/cards.md` for the actual move or due date update
- Use `references/lists.md` when the list boundary itself is the important part of the workflow

Useful writes:

```bash
"$TRELLO_API" PUT /cards/<card_id> "idList=<destination_list_id>"
"$TRELLO_API" PUT /cards/<card_id> "name=Updated+title&due=2026-03-30T09:00:00.000Z"
```

## Backlog cleanup and archive preview

Typical user requests:

- "오래된 Backlog 카드 정리해줘"
- "닫힌 카드들 아카이브해도 되는지 먼저 보여줘"
- "이번 분기 전 카드들 중 stale한 것만 골라줘"

Recommended flow:

1. Resolve the board or list.
2. Gather candidates using explicit rules such as closed state, due date, or list location.
3. Produce a preview before any write.
4. Ask for confirmation for archive or bulk move.
5. Apply small batches and verify each batch.

Reference flow:

- Use `references/boards.md` when the cleanup scope is the whole board
- Use `references/lists.md` when the cleanup starts from a specific list
- Use `references/cards.md` for final per-card close or move actions instead of overusing bulk operations

Suggested preview shape:

```text
Cleanup candidates:
- <card> because <rule>
- <card> because <rule>
Proposed action:
- Archive N cards
- Move N cards to <list>
Needs confirmation: yes
```

## Comment and checklist enrichment

Typical user requests:

- "이 카드에 진행 상황 코멘트 남겨줘"
- "릴리즈 체크리스트 추가해줘"
- "체크리스트 항목 3개만 넣어줘"

Recommended flow:

1. Resolve the card.
2. Read the card once if context is unclear.
3. Add the comment or checklist.
4. Re-read or summarize the added artifact.

Reference flow:

- Use `references/cards.md` to confirm the target card
- Use `references/comments-checklists.md` for the write path
- Open `references/labels.md` only if the user also wants label-based tagging as part of the same update

Useful writes:

```bash
"$TRELLO_API" POST /cards/<card_id>/actions/comments "text=Blocked+by+staging+deploy"
"$TRELLO_API" POST /cards/<card_id>/checklists "name=Release+checklist"
```
