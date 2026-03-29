# Trello Credential Setup

Use this file when `TRELLO_API_KEY` or `TRELLO_TOKEN` is missing and the user needs instructions for issuing credentials.

## Contents

- What the skill needs
- Get an API key
- Generate a token
- Export environment variables
- Verify access
- Security notes

## What the skill needs

For API-first Trello automation, the skill expects these environment variables:

```bash
export TRELLO_API_KEY="your-api-key"
export TRELLO_TOKEN="your-token"
```

Optional convenience variable for board-scoped workflows:

```bash
export TRELLO_BOARD_ID="your-default-board-id"
```

Use `TRELLO_BOARD_ID` only when the user repeatedly works in one primary board. Do not assume it is always correct for every request.

## Get an API key

1. Open `https://trello.com/power-ups/admin`
2. Open an existing Power-Up or create a simple private one
3. Open the `API key` tab
4. Copy the API key

Some Trello guides and community posts still mention `https://trello.com/app-key`. If that page works in the user's environment, it is fine to use, but prefer the Power-Up admin flow because that is what the current official guide describes.

## Generate a token

The simplest path is to click the `Token` link shown next to the API key in the same `API key` tab.

If a direct URL is more convenient, use:

```text
https://trello.com/1/authorize?key=<TRELLO_API_KEY>&name=trello-workflow&scope=read,write&expiration=30days&response_type=token
```

Recommended parameters:

- `scope=read,write`
  - Use for this skill because it needs both inspection and safe updates.
- `expiration=30days`
  - Safer default for local automation.
- `expiration=never`
  - Acceptable only when the user explicitly wants a long-lived local token and understands the risk.
- `name=trello-workflow`
  - Human-readable token label shown in Trello authorization screens.

Use `scope=read,write,account` only if the workflow truly needs account-level details. Do not request broader access by default.

## Export environment variables

For the current shell session:

```bash
export TRELLO_API_KEY="your-api-key"
export TRELLO_TOKEN="your-token"
export TRELLO_BOARD_ID="your-default-board-id"
```

`TRELLO_BOARD_ID` is optional. Set it only if a default board helps reduce repeated prompts.

For repeated local use, add the same lines to the user's shell profile such as `~/.zshrc` or `~/.bashrc`, then reload the shell.

## Verify access

Run a harmless read first:

```bash
"$TRELLO_API" GET /members/me/boards "fields=name,url"
```

If the skill path is not set yet, a direct check also works:

```bash
curl --silent --show-error --fail-with-body \
  --get "https://api.trello.com/1/members/me/boards" \
  --data "key=${TRELLO_API_KEY}" \
  --data "token=${TRELLO_TOKEN}" \
  --data "fields=name,url"
```

## Security notes

- Never paste the token into issue comments, commits, screenshots, or shared chat.
- Treat the token like a password.
- If the token leaks, revoke it from Trello and create a new one.
- Prefer short-lived tokens unless there is a clear reason to keep a long-lived token.
