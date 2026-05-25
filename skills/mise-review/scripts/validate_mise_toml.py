#!/usr/bin/env python3
"""Validate mise-related files with a small self-contained ruleset."""

from __future__ import annotations

import argparse
import json
import re
import sys
import tomllib
from pathlib import Path

ERROR_SEVERITIES = {"error", "policy-error"}
LOCAL_CONFIG_PATTERNS = ("mise.local.toml", "mise.*.local.toml")
PRERELEASE_PATTERN = re.compile(r"(?:^|[-.])(alpha|beta|rc|pre)\\d*", re.IGNORECASE)


def parse_args() -> argparse.Namespace:
    parser = argparse.ArgumentParser(
        description="Validate mise.toml against the local mise-review skill rules."
    )
    parser.add_argument(
        "path",
        nargs="?",
        default="mise.toml",
        help="Path to the mise.toml file to review."
    )
    parser.add_argument(
        "--format",
        choices=("text", "json"),
        default="text",
        help="Output format."
    )
    return parser.parse_args()


def main() -> int:
    args = parse_args()
    config_path = Path(args.path).resolve()
    repo_root = config_path.parent
    diagnostics: list[dict[str, object]] = []

    try:
      config = load_toml(config_path)
    except FileNotFoundError:
      diagnostics.append(
          diagnostic(
              "PARSE001",
              "error",
              "mise-review",
              f"Could not find {config_path.name}.",
              "Run the validator from the repository root or pass an explicit path.",
              "references/rules.md",
              config_path,
          )
      )
      return emit(args.format, config_path, diagnostics)
    except tomllib.TOMLDecodeError as error:
      diagnostics.append(
          diagnostic(
              "PARSE001",
              "error",
              "mise-review",
              f"TOML parse failed: {error}",
              "Fix the TOML syntax before applying policy or profile rules.",
              "references/rules.md",
              config_path,
          )
      )
      return emit(args.format, config_path, diagnostics)

    tools = config.get("tools", {})
    if not isinstance(tools, dict):
      tools = {}

    check_version_policy(diagnostics, tools, config_path)
    check_env_policy(diagnostics, config, repo_root, config_path)
    check_profile_rules(diagnostics, tools, repo_root, config_path)
    check_java_vendor_rule(diagnostics, tools, config_path)

    return emit(args.format, config_path, diagnostics)


def load_toml(config_path: Path) -> dict[str, object]:
    with config_path.open("rb") as handle:
      loaded = tomllib.load(handle)
    if not isinstance(loaded, dict):
      return {}
    return loaded


def check_version_policy(
    diagnostics: list[dict[str, object]],
    tools: dict[str, object],
    config_path: Path,
) -> None:
    for tool_name, raw_selector in tools.items():
      selector = extract_selector(raw_selector)
      if selector is None:
        continue

      normalized = selector.strip()
      if normalized == "latest" or normalized.startswith("latest:"):
        diagnostics.append(
            diagnostic(
                "MWV002",
                "policy-error",
                "mise-policy",
                f"Tracked selector for `{tool_name}` uses `latest`.",
                "Store a stable selector in mise.toml and leave exact resolution to mise.lock.",
                "references/version-policy.md",
                config_path,
            )
        )

      if PRERELEASE_PATTERN.search(normalized):
        diagnostics.append(
            diagnostic(
                "MWV002",
                "warning",
                "mise-policy",
                f"Selector for `{tool_name}` looks like a prerelease: `{normalized}`.",
                "Prefer the latest stable selector unless the repository explicitly needs a prerelease.",
                "references/version-policy.md",
                config_path,
            )
        )

      if normalized.startswith("ubi:") or normalized.startswith("asdf:"):
        diagnostics.append(
            diagnostic(
                "MWC002",
                "warning",
                "mise-tools",
                f"Selector for `{tool_name}` uses a legacy or discouraged backend: `{normalized}`.",
                "Prefer a core tool or maintained backend when mise can resolve the tool directly.",
                "references/tools-core.md",
                config_path,
            )
        )


def check_env_policy(
    diagnostics: list[dict[str, object]],
    config: dict[str, object],
    repo_root: Path,
    config_path: Path,
) -> None:
    deprecated_keys = [key for key in ("env_file", "dotenv", "env_path") if key in config]
    if deprecated_keys:
      diagnostics.append(
          diagnostic(
              "MWE001",
              "warning",
              "mise-env",
              f"Deprecated env keys are still present: {', '.join(sorted(deprecated_keys))}.",
              "Move legacy env loading to [env] special directives such as env._.file or env._.source.",
              "references/env-patterns.md",
              config_path,
          )
      )

    local_configs = [
        candidate
        for pattern in LOCAL_CONFIG_PATTERNS
        for candidate in repo_root.glob(pattern)
        if candidate.is_file()
    ]
    if not local_configs:
      return

    gitignore_path = repo_root / ".gitignore"
    gitignore_lines: set[str] = set()
    if gitignore_path.exists():
      gitignore_lines = {
          line.strip()
          for line in gitignore_path.read_text(encoding="utf8").splitlines()
          if line.strip() and not line.strip().startswith("#")
      }

    missing = []
    for candidate in local_configs:
      if candidate.name not in gitignore_lines and "mise.*.local.toml" not in gitignore_lines:
        missing.append(candidate.name)

    if missing:
      diagnostics.append(
          diagnostic(
              "MWE002",
              "warning",
              "mise-env",
              f"Local override files are not ignored by .gitignore: {', '.join(sorted(missing))}.",
              "Ignore local-only mise config before storing secrets or user-specific paths there.",
              "references/env-core.md",
              config_path,
          )
      )


def check_profile_rules(
    diagnostics: list[dict[str, object]],
    tools: dict[str, object],
    repo_root: Path,
    config_path: Path,
) -> None:
    tool_names = set(tools.keys())
    has_pyproject = (repo_root / "pyproject.toml").exists()
    has_uv_lock = (repo_root / "uv.lock").exists()
    has_gradle = any((repo_root / name).exists() for name in ("build.gradle", "build.gradle.kts"))
    has_spring_signal = detect_spring_signal(repo_root)

    if (has_pyproject or has_uv_lock) and not {"python", "uv"}.issubset(tool_names):
      diagnostics.append(
          diagnostic(
              "MWP001",
              "warning",
              "mise-profiles",
              "The repository looks like a python-uv profile, but [tools] is missing `python` or `uv`.",
              "Add both `python` and `uv`, or document why the repository should not use the python-uv profile.",
              "references/profile-catalog.md",
              config_path,
          )
      )

    if has_gradle and has_spring_signal and not {"java", "gradle"}.issubset(tool_names):
      diagnostics.append(
          diagnostic(
              "MWP003",
              "warning",
              "mise-profiles",
              "The repository looks like a java-spring-service profile, but [tools] is missing `java` or `gradle`.",
              "Add both `java` and `gradle`, or switch to a different documented profile.",
              "references/profile-catalog.md",
              config_path,
          )
      )
      return

    if has_gradle and not {"java", "gradle"}.issubset(tool_names):
      diagnostics.append(
          diagnostic(
              "MWP002",
              "warning",
              "mise-profiles",
              "The repository looks like a java-gradle-app profile, but [tools] is missing `java` or `gradle`.",
              "Add both `java` and `gradle`, or switch to a different documented profile.",
              "references/profile-catalog.md",
              config_path,
          )
      )


def check_java_vendor_rule(
    diagnostics: list[dict[str, object]],
    tools: dict[str, object],
    config_path: Path,
) -> None:
    selector = extract_selector(tools.get("java"))
    if selector is None:
      return

    normalized = selector.strip()
    if re.fullmatch(r"\\d+(?:\\.\\d+)?", normalized):
      diagnostics.append(
          diagnostic(
              "MWJ001",
              "policy-error",
              "mise-tools",
              f"Java selector `{normalized}` does not declare a vendor.",
              "Prefer a vendor-qualified selector such as `zulu-21` in tracked config.",
              "references/ecosystems/java-runtime.md",
              config_path,
          )
      )


def detect_spring_signal(repo_root: Path) -> bool:
    for name in ("application.yml", "application.yaml", "application.properties"):
      if any(repo_root.rglob(name)):
        return True

    for gradle_name in ("build.gradle", "build.gradle.kts"):
      gradle_path = repo_root / gradle_name
      if not gradle_path.exists():
        continue
      contents = gradle_path.read_text(encoding="utf8", errors="ignore")
      if "spring-boot" in contents or "org.springframework.boot" in contents:
        return True

    java_src_dir = repo_root / "src"
    if not java_src_dir.exists():
      return False

    for java_file in java_src_dir.rglob("*.java"):
      contents = java_file.read_text(encoding="utf8", errors="ignore")
      if "@SpringBootApplication" in contents:
        return True

    return False


def extract_selector(raw_value: object) -> str | None:
    if isinstance(raw_value, str):
      return raw_value

    if isinstance(raw_value, dict):
      version = raw_value.get("version")
      if isinstance(version, str):
        return version

      for key in ("ref", "path", "prefix"):
        candidate = raw_value.get(key)
        if isinstance(candidate, str):
          return candidate

    return None


def diagnostic(
    rule_id: str,
    severity: str,
    owner_skill: str,
    why: str,
    fix_hint: str,
    docs: str,
    config_path: Path,
) -> dict[str, object]:
    return {
        "rule_id": rule_id,
        "severity": severity,
        "owner_skill": owner_skill,
        "path": str(config_path),
        "why": why,
        "fix_hint": fix_hint,
        "docs": docs,
    }


def emit(output_format: str, config_path: Path, diagnostics: list[dict[str, object]]) -> int:
    payload = {
        "path": str(config_path),
        "diagnostics": diagnostics,
    }

    if output_format == "json":
      print(json.dumps(payload, ensure_ascii=False, indent=2))
    else:
      print(format_text_report(payload))

    return 1 if any(item["severity"] in ERROR_SEVERITIES for item in diagnostics) else 0


def format_text_report(payload: dict[str, object]) -> str:
    diagnostics = payload["diagnostics"]
    if not diagnostics:
      return (
          "[mise-review] no diagnostics\n"
          f"- path: {payload['path']}\n"
          "- status: clean"
      )

    lines = [
        "[mise-review] diagnostics",
        f"- path: {payload['path']}",
        f"- count: {len(diagnostics)}",
    ]

    for item in diagnostics:
      lines.extend(
          [
              f"* {item['severity']} {item['rule_id']} ({item['owner_skill']})",
              f"  why: {item['why']}",
              f"  fix: {item['fix_hint']}",
              f"  docs: {item['docs']}",
          ]
      )

    return "\n".join(lines)


if __name__ == "__main__":
    raise SystemExit(main())
