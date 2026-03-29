#!/usr/bin/env python3
"""
Find boards, lists, or cards by name through the Trello REST API.

Examples:
  python3 trello_find.py boards "Platform Roadmap"
  python3 trello_find.py lists "In Progress" --board 67ea1234
  python3 trello_find.py cards "OAuth rollout" --board 67ea1234
  python3 trello_find.py cards "OAuth rollout" --list 67ea9999 --exact
"""

from __future__ import annotations

import argparse
import json
import os
import sys
from typing import Any
from urllib.error import HTTPError, URLError
from urllib.parse import urlencode
from urllib.request import urlopen


BASE_URL = os.environ.get("TRELLO_BASE_URL", "https://api.trello.com/1").rstrip("/")


def require_env(name: str) -> str:
    value = os.environ.get(name, "").strip()
    if not value:
        raise RuntimeError(f"{name} is required")
    return value


def optional_env(name: str) -> str:
    return os.environ.get(name, "").strip()


def trello_get(path: str, params: dict[str, Any]) -> list[dict[str, Any]]:
    key = require_env("TRELLO_API_KEY")
    token = require_env("TRELLO_TOKEN")

    query = dict(params)
    query["key"] = key
    query["token"] = token

    url = f"{BASE_URL}/{path.lstrip('/')}?{urlencode(query)}"
    try:
        with urlopen(url) as response:
            payload = response.read().decode("utf-8")
    except HTTPError as exc:
        body = exc.read().decode("utf-8", errors="replace")
        raise RuntimeError(f"HTTP {exc.code}: {body}") from exc
    except URLError as exc:
        raise RuntimeError(f"Request failed: {exc}") from exc

    data = json.loads(payload)
    if not isinstance(data, list):
        raise RuntimeError("Expected a JSON list response")
    return data


def score_name(name: str, query: str) -> tuple[int, str]:
    normalized = name.lower()
    target = query.lower()
    if not target:
        return (3, normalized)
    if normalized == target:
        return (0, normalized)
    if normalized.startswith(target):
        return (1, normalized)
    if target in normalized:
        return (2, normalized)
    return (9, normalized)


def filter_items(items: list[dict[str, Any]], query: str, exact: bool, limit: int) -> list[dict[str, Any]]:
    if query:
        lowered = query.lower()
        if exact:
            items = [item for item in items if str(item.get("name", "")).lower() == lowered]
        else:
            items = [item for item in items if lowered in str(item.get("name", "")).lower()]

    items.sort(key=lambda item: score_name(str(item.get("name", "")), query))
    return items[:limit]


def board_fields() -> str:
    return "name,url,closed,id,shortLink"


def list_fields() -> str:
    return "name,id,idBoard,pos,closed"


def card_fields() -> str:
    return "name,id,idList,idMembers,due,closed,url,shortLink"


def parse_args() -> argparse.Namespace:
    parser = argparse.ArgumentParser(description="Find Trello boards, lists, or cards by name.")
    parser.add_argument("scope", choices=["boards", "lists", "cards"], help="Resource type to search")
    parser.add_argument("query", nargs="?", default="", help="Case-insensitive name query")
    parser.add_argument("--board", help="Board ID for list or card search. Falls back to TRELLO_BOARD_ID when unset.")
    parser.add_argument("--list", dest="list_id", help="List ID for card search")
    parser.add_argument("--exact", action="store_true", help="Require an exact case-insensitive name match")
    parser.add_argument("--include-closed", action="store_true", help="Include closed boards, lists, or cards")
    parser.add_argument("--limit", type=int, default=20, help="Maximum number of results to return")
    return parser.parse_args()


def main() -> int:
    args = parse_args()
    board_id = args.board or optional_env("TRELLO_BOARD_ID")

    if args.limit < 1:
        print("Error: --limit must be at least 1", file=sys.stderr)
        return 1

    if args.scope == "lists" and not board_id:
        print("Error: board_id is required for list search. Pass --board, set TRELLO_BOARD_ID, or ask the user to choose a board.", file=sys.stderr)
        return 1

    if args.scope == "cards" and not (board_id or args.list_id):
        print("Error: board_id or list_id is required for card search. Pass --board/--list, set TRELLO_BOARD_ID, or ask the user to choose a board.", file=sys.stderr)
        return 1

    try:
        if args.scope == "boards":
            items = trello_get(
                "/members/me/boards",
                {
                    "fields": board_fields(),
                    "filter": "all" if args.include_closed else "open",
                },
            )
        elif args.scope == "lists":
            items = trello_get(
                f"/boards/{board_id}/lists",
                {
                    "fields": list_fields(),
                    "filter": "all" if args.include_closed else "open",
                },
            )
        else:
            if args.list_id:
                path = f"/lists/{args.list_id}/cards"
            else:
                path = f"/boards/{board_id}/cards"
            items = trello_get(
                path,
                {
                    "fields": card_fields(),
                    "filter": "all" if args.include_closed else "open",
                },
            )
    except RuntimeError as exc:
        print(f"Error: {exc}", file=sys.stderr)
        return 1

    matches = filter_items(items, args.query, args.exact, args.limit)
    print(json.dumps(matches, indent=2, sort_keys=True))
    return 0


if __name__ == "__main__":
    raise SystemExit(main())
