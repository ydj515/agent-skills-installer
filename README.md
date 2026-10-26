# agent-skills-installer

[![CI](https://github.com/ydj515/agent-skills-installer/actions/workflows/ci.yml/badge.svg)](https://github.com/ydj515/agent-skills-installer/actions/workflows/ci.yml)
[![Release Publish Package](https://github.com/ydj515/agent-skills-installer/actions/workflows/release-publish.yml/badge.svg)](https://github.com/ydj515/agent-skills-installer/actions/workflows/release-publish.yml)
[![Sync Development Standards](https://github.com/ydj515/agent-skills-installer/actions/workflows/sync-dev-standards.yml/badge.svg)](https://github.com/ydj515/agent-skills-installer/actions/workflows/sync-dev-standards.yml)
[![npm version](https://img.shields.io/npm/v/agent-skills-installer.svg?logo=npm)](https://www.npmjs.com/package/agent-skills-installer)
[![Node.js](https://img.shields.io/badge/Node.js-24.19.0%20(%3E%3D20.0.0)-339933?logo=nodedotjs&logoColor=white)](./mise.toml)
[![License: MIT](https://img.shields.io/badge/License-MIT-yellow.svg)](./LICENSE)

A public npm CLI that installs and manages bundled Agent Skills for Codex, Claude Code, and Gemini CLI from a single `npx` entrypoint.
It maintains one shared source tree per skill (`skills/<skill-id>/`) and adapts top-level files to each target's supported directory layout for `user` or `project` scope installations.
Ownership markers (`.agent-skills-installer.json`), lock files, and atomic staged copies prevent unsafe overwrites of unmanaged directories.

**Tech Stack:** Node.js (ESM, `>=20.0.0`) · npm CLI · `node:test` · mise · GitHub Actions

## Highlights

- **Multi-Agent Layout Adaptation:** Filters and installs packaged skills into the exact directory structure expected by Codex, Claude Code, and Gemini CLI
- **Interactive Wizard & Filtered CLI:** Provides an interactive terminal wizard with search/group/tag filtering alongside direct `install`, `list`, `update`, and `remove` commands
- **Safe Provisioning Model:** Uses ownership markers, concurrent lock files, and atomic temporary directory swaps to guard against accidental data loss

## Bundled Skills

Bundled skills defined in [`catalog.json`](./catalog.json):

- **Code Review & Collaboration:** `gh-address-comments`, `gh-fix-ci`, `gitlab-mr-review`, `trello`, `hiring-analyzer`
- **Web, UI & Architecture:** `playwright`, `a11y-audit-guide`, `a11y-fix-guide`, `modern-minimal-ui`, `architecture-diagram`
- **Document Automation:** `doc` (DOCX), `pdf` (PDF)
- **Mise Workflows:** `mise-env`, `mise-policy`, `mise-profiles`, `mise-review`, `mise-tasks`, `mise-tools`, `mise-lock`, `mise-ci`

## Requirements

- **CLI Usage:** Node.js `>=20.0.0` on macOS or Linux (Windows is not officially supported in `v0.x`)
- **Local Development:** [mise](https://mise.jdx.dev/) — Node.js (`24.19.0`) is pinned in [`mise.toml`](./mise.toml) and installed by `mise`.

## Quick Start

### Install via `npx`

```bash
# Launch the interactive installation wizard
npx agent-skills-installer

# Direct installation by target, scope, or skill selection
npx agent-skills-installer install codex
npx agent-skills-installer install all --scope project
npx agent-skills-installer install codex --skills playwright,trello
npx agent-skills-installer install all --scope project --dry-run

# Inspect, update, or remove installed skills
npx agent-skills-installer list all
npx agent-skills-installer update all
npx agent-skills-installer remove codex --skills playwright
```

### Local Development

```bash
mise trust       # One-time: review and trust mise.toml
mise install     # Install pinned Node.js (24.19.0)
mise run verify  # Run tests, dry-run tarball pack, and npx smoke test
```

Target directory layouts, install locations, lock/conflict rules, and release workflows are documented in the [Guide](./docs/GUIDE.md).

## Key Commands

| Command | Description |
| --- | --- |
| `mise run start` | Run the CLI locally (`node src/cli.js`) |
| `mise run test` | Run the automated test suite (`npm test`) |
| `mise run test-matrix` | Run the test suite across Node.js `20`, `22`, and `24` |
| `mise run pack` | Dry-run the publishable npm tarball (`npm pack --dry-run`) |
| `mise run smoke` | Pack the tarball and smoke-test installation through `npx` |
| `mise run verify` | Run `test` + `pack` + `smoke` verification gate |

Run `mise tasks` to see the full task list.

## Documentation

- [Usage & Operations Guide](./docs/GUIDE.md)
- [Implementation Plan](./docs/IMPLEMENTATION_PLAN.md)
- [Changelog](./CHANGELOG.md)

## Contributing

Please read the [Contributing Guide](./CONTRIBUTING.md) before submitting changes.
