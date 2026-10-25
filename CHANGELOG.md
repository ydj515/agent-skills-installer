# Changelog

All notable changes to this project will be documented in this file.

This project follows a simple release-oriented changelog format.

## [0.1.8]

### Highlights

- added a bundled `hiring-analyzer` skill for evidence-based resume reviews from seven reviewer perspectives and fact-preserving rewrites

### Added

- bundled `hiring-analyzer` skill with seven reviewer perspectives, consolidated findings, fact-preserving rebuild, and unresolved-question tracking
- `hiring-analyzer` catalog entry and README and guide listings

## [0.1.7]

### Highlights

- added a bundled `architecture-diagram` skill for standalone HTML architecture diagrams and resource allocation plans
- refreshed the `mise-*` skills against the mise 2026.10 documentation and added `mise-lock` and `mise-ci` skills
- registered the `a11y-audit-guide` and `a11y-fix-guide` skills in the catalog so they can be installed
- translated the `architecture-diagram` and `mise-*` skill content to English

### Added

- bundled `architecture-diagram` skill with an allocation reference and a visual reference HTML sample
- bundled `mise-lock` skill for `mise.lock` creation, platform entries, locked mode, and safe version bumps
- bundled `mise-ci` skill for locked CI installs, download caching, safe mode on untrusted branches, and Docker installs
- lockfile, CI integration, and secrets references for the `mise-*` skills
- a task definition rule that requires `description`, `usage` with `about`, and `run` for every mise task
- a tool execution rule that avoids `mise exec` when a task uses the `[tools]` version
- regression tests for the `architecture-diagram` install layout, the `a11y-*` catalog entries, and the mise task definition rule

### Changed

- updated `mise-*` guidance for backend priority, version request syntax, `minimum_release_age`, Tera v2 templates, `python.uv_venv_auto`, monorepo `//path:task` names, task `skip_if`, `timeout`, and `sources`/`outputs`
- updated starter profile examples to Python `3.14`, uv `0.13`, Java `zulu-25`, and Gradle `9.8`
- replaced the `mise-review` validator with the shared rule set covering deprecated syntax, the task definition rule, and lockfile checks
- renamed skill-local `mise-*` checklists so they no longer collide with shared reference file names
- pinned the repository's mise Node version to `24.19.0` and aligned the repository's own mise tasks with the task rules

### Fixed

- fixed the Java vendor rule in the `mise-review` validator, which never matched because of an escaped regular expression
- fixed invalid TOML and `usage` syntax in `mise-*` examples (unquoted task names with `:` and `choices=[...]`)
- removed absolute paths from the `gitlab-mr-review` skill documentation

## [0.1.6]

### Highlights

- added bundled `a11y-audit-guide` and `a11y-fix-guide` skills to support web accessibility compliance workflows
- resolved catalog alignment issues and testing assertions for default-enabled `mise-*` integration

### Added

- bundled `a11y-audit-guide` skill with runtime automation, axe-core diagnostics, and default configurations
- bundled `a11y-fix-guide` skill with structured patterns for resolving standard accessibility issues

### Fixed

- corrected minor typos and aligned catalog testing rules to reflect that `mise-*` skills are enabled by default

## [0.1.5]

### Highlights

- added six bundled `mise-*` skills for env, policy, profile, review, task, and tool workflows
- converted the new `mise-*` skills to self-contained reference layouts without a shared reference bundle
- updated the catalog and regression coverage for the new default bundled `mise-*` skill set

### Added

- bundled `mise-env`, `mise-policy`, `mise-profiles`, `mise-review`, `mise-tasks`, and `mise-tools` skills
- self-contained `mise-review` validator script with JSON and text diagnostics
- regression tests for `mise-*` catalog entries, self-contained reference resolution, and validator output

### Changed

- catalog updated to surface the six `mise-*` skills in default bundled installation flows
- `mise-*` references were copied into each skill directory so installs no longer depend on a shared `skills/references` tree

### Notes

- the `mise-*` skills are now packaged as self-contained install units across Codex, Claude Code, and Gemini CLI layouts

## [0.1.4]

### Highlights

- added new bundled `gitlab mr review` and `modern minimal ui` skills

### Added

- bundled `gitlab mr review` Review merge requests in internal GitLab using the GitLab API
- bundled `modern minimal ui` skill for Apply a polished modern UI layer to web apps

### Changed

- catalog updated to surface `gitlab mr review` and `modern-minimal-ui` skills in installation flows

### Notes

- `v0.1.4` expands the document processing capabilities of the bundled skills catalog.

## [0.1.3]

### Highlights

- added new bundled `doc` and `pdf` skills
- updated the catalog to include DOCX and PDF document management workflows

### Added

- bundled `doc` skill for reading, creating, and rendering DOCX documents
- bundled `pdf` skill for PDF document extraction, generation, and layout verification

### Changed

- catalog updated to surface `doc` and `pdf` skills in installation flows

### Notes

- `v0.1.3` expands the document processing capabilities of the bundled skills catalog.

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
