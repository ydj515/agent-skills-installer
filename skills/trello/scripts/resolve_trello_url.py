#!/usr/bin/env python3
"""
Parse common Trello board and card URLs into a small JSON payload.

Examples:
  python3 resolve_trello_url.py https://trello.com/b/abcd1234/platform-roadmap
  python3 resolve_trello_url.py https://trello.com/c/wxyz9876/oauth-rollout
"""

from __future__ import annotations

import argparse
import json
import sys
from urllib.parse import urlparse


def parse_trello_url(url: str) -> dict[str, str]:
    parsed = urlparse(url)
    if parsed.scheme not in {"http", "https"}:
        raise ValueError("URL must start with http:// or https://")
    if parsed.netloc not in {"trello.com", "www.trello.com"}:
        raise ValueError("URL must point to trello.com")

    parts = [part for part in parsed.path.split("/") if part]
    if len(parts) < 2:
        raise ValueError("Unrecognized Trello URL path")

    kind = parts[0]
    short_id = parts[1]
    slug = parts[2] if len(parts) > 2 else ""

    if kind == "b":
        return {
            "resource_type": "board",
            "short_id": short_id,
            "slug": slug,
            "url": url,
        }
    if kind == "c":
        return {
            "resource_type": "card",
            "short_id": short_id,
            "slug": slug,
            "url": url,
        }

    raise ValueError("Only Trello board (/b/...) and card (/c/...) URLs are supported")


def main() -> int:
    parser = argparse.ArgumentParser(description="Parse a Trello URL into a small JSON object.")
    parser.add_argument("url", help="Trello board or card URL")
    args = parser.parse_args()

    try:
        result = parse_trello_url(args.url)
    except ValueError as exc:
        print(f"Error: {exc}", file=sys.stderr)
        return 1

    print(json.dumps(result, indent=2, sort_keys=True))
    return 0


if __name__ == "__main__":
    raise SystemExit(main())
