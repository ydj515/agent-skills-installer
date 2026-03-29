# Changelog

All notable changes to this project will be documented in this file.

This project follows a simple release-oriented changelog format.

## [0.1.2]

### Highlights

- added a new bundled `trello` skill
- updated the catalog and README to surface Trello in install flows
- improved Trello skill references, setup guidance, and UI metadata
- excluded Python cache artifacts from the published package

### Added

- bundled `trello` skill with scripts, references, and assets for Trello board and card workflows

### Changed

- catalog entries and README install guidance now include Trello in bundled skill flows
- Trello skill references, setup guidance, and interactive metadata were refined for clearer onboarding
- package file filters now exclude `__pycache__` directories and compiled Python artifacts from published tarballs

### Notes

- `v0.1.2` extends the bundled catalog without changing the CLI surface area.

## [0.1.1]

### Highlights

- starter sample entries were replaced with real bundled skills and target-specific layouts
- bundled `gh-address-comments`, `gh-fix-ci`, and `playwright` skills were added to the shipped catalog
- CI verification and release publishing were separated into dedicated GitHub Actions workflows

### Added

- bundled `gh-address-comments`, `gh-fix-ci`, and `playwright` skills
- shared bundled skill packaging adapted into Codex, Claude Code, and Gemini CLI layouts

### Changed

- sample starter bundle entries were removed in favor of real packaged skills
- mainline verification and release publishing now run in separate GitHub Actions workflows
- developer docs were updated to match the bundled skills catalog and release flow

### Fixed

- GitHub Actions runtime defaults were updated to stay aligned with current Node 24-based action execution

### Notes

- `v0.1.1` pivots the installer from sample starter content to a real bundled skills catalog.

## [0.1.0]

### Highlights

- safer per-target installs with atomic rollback on failure
- broader regression coverage for installer edge cases and target-specific layout handling
- v2 skill management commands: `install --skills`, `list`, `remove`, and `update`
- stronger release verification with Node `20`/`22`/`24` CI, local `mise` test matrix support, and packed tarball `npx` smoke tests

### Added

- public npm package scaffold for `agent-skills-installer`
- direct install CLI for `codex`, `claude`, `gemini`, and `all`
- interactive install wizard with target-by-target skill selection
- catalog `schemaVersion=2` with `tags`, `groups`, `hidden`, and `deprecated` metadata support
- install path resolution for Codex, Claude Code, and Gemini CLI
- ownership markers, lock files, stale temp cleanup, and staged installs
- `--scope`, `--cwd`, `--dry-run`, and `--force` support
- `install --skills`, `list`, `remove`, and `update`
- interactive wizard search and filter shortcuts for larger catalogs
- regression coverage for install edge cases and target-specific layout handling
- `mise`-based local development workflow with multi-version Node test tasks
- GitHub Actions verification on Node `20`, `22`, and `24`
- packed tarball `npx` smoke test coverage
- public README and MIT license

### Fixed

- atomic rollback when a target install fails part-way through
- failure summaries and single-target exit codes now reflect actual install results

### Notes

- `v0.1.0` shipped the initial installer, validation, and management command surface using the sample starter catalog.
- later releases replace that starter content with real bundled skills and release-oriented workflow updates.
