# Changelog

All notable changes to this project will be documented in this file.

This project follows a simple release-oriented changelog format.

## [0.1.0] - 2026-03-18

### Added

- public npm package scaffold for `agent-skills-installer`
- direct install CLI for `codex`, `claude`, `gemini`, and `all`
- interactive install wizard with single-select and checkbox steps
- `catalog.json` with two bundled starter skills
- starter skill fixtures:
  - `instruction-only`
  - `script-backed`
- install path resolution for Codex, Claude Code, and Gemini CLI
- ownership marker, lock file, stale temp cleanup, and staged install logic
- `--scope`, `--cwd`, `--dry-run`, and `--force` support
- README for public npm usage and release copy
- MIT license file
- GitHub Actions workflow for verify-and-publish npm releases

### Notes

- `v0.1.0` is focused on the installer foundation and starter bundle flow.
- `--skills`, `list`, `remove`, and `update` are planned for a later release.
