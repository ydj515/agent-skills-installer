# Changelog

All notable changes to this project will be documented in this file.

This project follows a simple release-oriented changelog format.

## [0.1.0]

### Highlights

- safer per-target installs with atomic rollback on failure
- broader regression coverage for installer edge cases and interactive flow
- stronger release verification with Node `20`/`22`/`24` CI, local `mise` test matrix support, and packed tarball `npx` smoke tests

### Added

- public npm package scaffold for `agent-skills-installer`
- direct install CLI for `codex`, `claude`, `gemini`, and `all`
- interactive install wizard with starter skill selection
- bundled starter skills: `instruction-only`, `script-backed`
- install path resolution for Codex, Clude Code, and Gemini CLI
- ownership markers, lock files, stale temp cleanup, and staged installs
- `--scope`, `--cwd`, `--dry-run`, and `--force` support
- regression coverage for install edge cases and interactive flow
- `mise`-based local development workflow with multi-version Node test tasks
- GitHub Actions verification on Node `20`, `22`, and `24`
- packed tarball `npx` smoke test coverage
- public README and MIT license

### Fixed

- atomic rollback when a target install fails part-way through
- failure summaries and single-target exit codes now reflect actual install results

### Notes

- `v0.1.0` focuses on the installer foundation and starter bundle flow.
- `--skills`, `list`, `remove`, and `update` remain planned for a later release.
