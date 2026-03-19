# Changelog

All notable changes to this project will be documented in this file.

This project follows a simple release-oriented changelog format.

## [0.1.0]

### Highlights

- safer per-target installs with atomic rollback on failure
- broader regression coverage for installer edge cases and interactive flow
- v2 skill management commands: `install --skills`, `list`, `remove`, and `update`
- stronger release verification with Node `20`/`22`/`24` CI, local `mise` test matrix support, and packed tarball `npx` smoke tests

### Added

- public npm package scaffold for `agent-skills-installer`
- direct install CLI for `codex`, `claude`, `gemini`, and `all`
- interactive install wizard with starter skill selection
- bundled starter skills: `instruction-only`, `script-backed`
- catalog `schemaVersion=2` with `tags`, `groups`, `hidden`, and `deprecated` metadata support
- install path resolution for Codex, Claude Code, and Gemini CLI
- ownership markers, lock files, stale temp cleanup, and staged installs
- `--scope`, `--cwd`, `--dry-run`, and `--force` support
- `install --skills`, `list`, `remove`, and `update`
- regression coverage for install edge cases and interactive flow
- `mise`-based local development workflow with multi-version Node test tasks
- GitHub Actions verification on Node `20`, `22`, and `24`
- packed tarball `npx` smoke test coverage
- public README and MIT license

### Fixed

- atomic rollback when a target install fails part-way through
- failure summaries and single-target exit codes now reflect actual install results

### Notes

- `v0.1.0` now covers the starter bundle flow and the first round of v2 catalog and management features.
- larger catalogs and interactive search/filter UX remain planned for a later release.
