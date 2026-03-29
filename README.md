# agent-skills-installer

Public npm CLI for installing bundled Agent Skills for Codex, Claude Code, and Gemini CLI.

`agent-skills-installer` gives you one `npx` entrypoint for installing the same packaged skills across multiple agent CLIs while keeping each target's install path and safety rules separate.

## What it does

- installs bundled skills without cloning a repository
- supports both interactive setup and direct CLI usage
- supports `user` and `project` scope installs
- uses ownership markers, locks, and staged copies to avoid unsafe overwrites

## Supported agents

- Codex
- Claude Code
- Gemini CLI

## Supported platforms

- macOS
- Linux

Windows is not officially supported in `v0.x`.

## Quick start

Interactive install:

```bash
npx agent-skills-installer
```

Direct install:

```bash
npx agent-skills-installer install codex
npx agent-skills-installer install all
npx agent-skills-installer install codex --skills playwright,trello
npx agent-skills-installer list all
npx agent-skills-installer update all
```

Project-scope install:

```bash
npx agent-skills-installer install codex --scope project
```

Dry run:

```bash
npx agent-skills-installer install all --scope project --dry-run
```

## Bundled skills

The bundled catalog currently includes:

- `gh-address-comments`
- `gh-fix-ci`
- `playwright`
- `trello`

## Node.js support

- runtime support starts at Node `20.0.0`
- CI verifies Node `20`, `22`, and `24`

## Full guide

For detailed usage, install locations, target layouts, safety rules, local development, CI, and release publishing, see:

- [Guide](./docs/GUIDE.md)
- [Implementation plan](./docs/IMPLEMENTATION_PLAN.md)
