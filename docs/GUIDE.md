# Guide

Detailed usage, layout, safety, development, CI, and publishing reference for `agent-skills-installer`.

## Interactive mode

Run without arguments to start the interactive wizard:

```bash
npx agent-skills-installer
```

The wizard currently supports:

1. Select one or more targets: `codex`, `claude`, `gemini`, or toggle `all`
2. Select one scope: `user` or `project`
3. Choose skills one target at a time from the bundled catalog
4. Search and filter larger target-specific skill lists
5. Review the summary
6. Confirm installation

In interactive mode:

- target selection uses arrow keys, `Space`, and `Enter`
- choosing `all` toggles every individual target on or off
- each selected target gets its own step, for example `Select skills for codex`
- the current bundled catalog exposes the same skills in both interactive and direct CLI flows
- custom skill selection uses `Space` to toggle and `Enter` to continue
- only the current step is shown on screen, so long lists do not stack across steps
- custom skill selection also supports:
- `/` search by skill id, title, description, tag, group, or target
- `g` cycle group filters
- `t` cycle tag filters
- `h` toggle hidden skills
- `d` toggle deprecated skills
- `a` select all currently visible skills
- `x` clear all currently visible selections
- `r` reset search and filter state

## Direct CLI

The CLI currently supports these commands:

```bash
npx agent-skills-installer install <codex|claude|gemini|all> [--scope user|project] [--cwd <path>] [--dry-run] [--force] [--skills <a,b>] [--tag <tag>] [--group <group>] [--include-hidden] [--include-deprecated]
npx agent-skills-installer list <codex|claude|gemini|all> [--scope user|project] [--cwd <path>] [--skills <a,b>] [--tag <tag>] [--group <group>] [--include-hidden] [--include-deprecated]
npx agent-skills-installer remove <codex|claude|gemini> [--scope user|project] [--cwd <path>] [--dry-run] (--skills <a,b> | --tag <tag> | --group <group>)
npx agent-skills-installer update <codex|claude|gemini|all> [--scope user|project] [--cwd <path>] [--dry-run] [--skills <a,b>] [--tag <tag>] [--group <group>] [--include-hidden] [--include-deprecated]
```

Notes:

- the default scope is `user`
- `--cwd` only affects `project` scope
- `--dry-run` is supported for `install`, `remove`, and `update`
- `--force` only works for directories that contain a valid ownership marker created by this package
- `--skills` selects explicit skill ids
- `--tag` and `--group` filter catalog metadata
- `remove` requires at least one selector: `--skills`, `--tag`, or `--group`
- `update` refreshes only currently installed managed skills and skips missing ones
- `list` reports installed, available, unmanaged-conflict, and extra unmanaged directories per target
- `--include-hidden` and `--include-deprecated` opt into metadata-hidden entries when they exist

## Bundled skills

The bundled catalog currently ships with these skills:

- `gh-address-comments`: address GitHub PR comments with bundled scripts and UI assets
- `gh-fix-ci`: inspect failing GitHub Actions checks and guide CI fixes
- `playwright`: browser automation with a bundled CLI wrapper and references
- `trello`: problem-first Trello workflow automation with bundled API helpers and references

`catalog.json` is the source of truth for the bundled skill list.

The installer keeps one shared source tree per bundled skill in this package, then adapts the copied top-level files to each target's supported skill layout.

## Target skill directory layouts

Bundled skills are copied into each target's install root as normal directories.
The installer filters the top-level contents per target before copying, so one packaged skill can install into multiple target-specific layouts safely.

### Codex

Codex keeps the full packaged skill directory, except ignored junk files such as `.DS_Store`.

```text
skill-name/
├── SKILL.md          # Required: metadata + instructions
├── scripts/          # Optional: executable code
├── references/       # Optional: documentation
├── assets/           # Optional: templates, resources
├── agents/
│   └── openai.yaml   # Optional: appearance and dependencies
└── ...               # Optional: additional files or directories
```

### Gemini CLI

Gemini CLI keeps only `SKILL.md`, `scripts/`, `references/`, and `assets/`.

```text
my-skill/
├── SKILL.md          # Required: instructions and metadata
├── scripts/          # Optional: executable scripts
├── references/       # Optional: static documentation
└── assets/           # Optional: templates and other resources
```

### Claude Code

Claude Code keeps only `SKILL.md`, `template.md`, `examples/`, and `scripts/`.

```text
my-skill/
├── SKILL.md          # Required: main instructions
├── template.md       # Optional: template for Claude to fill in
├── examples/
│   └── sample.md     # Optional: example output showing expected format
└── scripts/
    └── validate.sh   # Optional: script Claude can execute
```

The current bundled skills do not ship `template.md` or `examples/`, so Claude installs typically contain `SKILL.md` plus any bundled `scripts/`.

## Install locations

### User scope

Codex:

1. `$CODEX_HOME/skills` if it exists
2. `~/.codex/skills`

Claude Code:

- `~/.claude/skills`

Gemini CLI:

- `~/.gemini/skills`

### Project scope

Codex:

- `<cwd>/.codex/skills`

Claude Code:

- `<cwd>/.claude/skills`

Gemini CLI:

- `<cwd>/.gemini/skills`

## Safety model

The installer is intentionally conservative.

- each installed skill directory gets an ownership marker named `.agent-skills-installer.json`
- existing directories are not overwritten unless `--force` is used
- `--force` only works when the existing directory contains a valid marker created by this package
- a lock file prevents concurrent installs into the same root
- files are copied into a temp directory first and then moved into place
- stale locks and stale temp directories are cleaned up conservatively
- skill sources that resolve outside the package root are rejected
- symlinks inside bundled skill sources are rejected

## Conflict and overwrite behavior

If a target skill directory already exists:

- without `--force`: installation fails
- with `--force`: installation only proceeds when the directory was installed by `agent-skills-installer`
- manually copied or moved directories are treated as unmanaged and are not overwritten automatically

## Running agents may need a restart

If Codex, Claude Code, or Gemini CLI is already running, it may not detect newly installed skills immediately.

After installation, restart the target tool if the new skills do not appear right away.

## Non-interactive environments

Interactive mode requires a TTY.

In CI or other non-interactive environments, use the direct command:

```bash
npx agent-skills-installer install codex --scope user
```

## Error handling examples

Permission error:

```text
[agent-skills-installer] EACCES: Cannot write to "/Users/example/.gemini/skills".
The current user does not have permission to modify this directory.
Run `sudo chown -R "$USER" "/Users/example/.gemini/skills"` and try again, or use `--scope project`.
```

Lock conflict:

```text
[agent-skills-installer] LOCK_CONFLICT: Another installation is already running for "/Users/example/.gemini/skills".
Wait for the other process to finish and try again.
If you believe the lock is stale, remove it only after confirming that no installer process is still running.
```

Non-TTY interactive usage:

```text
[agent-skills-installer] USAGE_ERROR: Interactive mode requires a TTY.
Run `npx agent-skills-installer install <codex|claude|gemini|all> --scope user|project` in non-interactive environments.
```

## Example output

```text
[agent-skills-installer] install summary
- target: codex
- scope: user
- root: /Users/example/.codex/skills
- selected: gh-address-comments, gh-fix-ci, playwright, trello
- installed: gh-address-comments, gh-fix-ci, playwright, trello
- skipped: none
- failed: none
- note: tool restart may be required to load new skills
```

## Development

Supported Node.js versions:

- runtime support starts at Node `20.0.0` as declared in `package.json#engines`
- supported and verified Node versions are `20`, `22`, and `24`
- local `mise` development defaults to Node `24`
- CI verifies Node `20`, `22`, and `24`

Set up the local toolchain with `mise`:

```bash
mise trust
mise install
mise tasks ls
```

`mise trust` is required once per clone before `mise` will execute this repository's tasks.

Run the CLI locally:

```bash
node src/cli.js
```

Run the CLI locally through `mise`:

```bash
mise run start --raw
```

Run a direct command locally:

```bash
node src/cli.js install codex --scope project --dry-run
```

Run the automated test suite:

```bash
npm test
```

Run the automated test suite through `mise`:

```bash
mise run test
```

Run the automated test suite across the supported CI Node versions:

```bash
mise run test-node20
mise run test-node22
mise run test-node24
mise run test-matrix
```

`test-node20`, `test-node24`, or `test-matrix` may download missing Node runtimes on first use.

Pack the publishable tarball:

```bash
npm pack --dry-run
```

Pack the publishable tarball through `mise`:

```bash
mise run pack
```

Smoke-test the packed tarball locally:

```bash
TARBALL="$(npm pack --silent)"
npx --yes --package "./$TARBALL" agent-skills-installer install all --scope project --cwd /tmp/agent-skills-installer-smoke
```

Smoke-test the packed tarball through `mise`:

```bash
mise run smoke
```

Run the default local verification flow:

```bash
mise run verify
```

Equivalent npm script shortcuts are also available:

```bash
npm run smoke
npm run verify
npm run test:matrix
```

The current test suite covers:

- atomic rollback when a target install fails part-way through
- `install all` partial failure behavior
- CLI summary and error output for single-target failures
- lock conflicts and stale temp cleanup
- `--force` reinstall and marker validation
- user-scope root resolution for Codex
- target-specific layout adaptation for Codex, Claude Code, and Gemini CLI

## CI

GitHub Actions currently verifies the package on:

- Node `20`
- Node `22`
- Node `24`

The CI workflow runs on `push`, `pull_request`, and `workflow_dispatch`, and checks:

- `npm test`
- `npm pack --dry-run`
- packed tarball installation via `npx --package <tarball>`

That means:

- runtime compatibility is guaranteed from Node `20`
- contributors can reproduce the supported Node test matrix locally with `mise`
- full pack and tarball smoke verification is enforced in CI on Node `20`, `22`, and `24`
- release publishing re-runs the same verification in a separate release workflow before `npm publish`

## Publishing

Recommended release flow:

1. Update `package.json` and `CHANGELOG.md` for the release version, then merge that release commit into `main`.
2. Wait for the `verify` workflow on `main` to pass.
3. Create a GitHub Release whose tag matches the package version, for example `v0.1.1`.
4. The `release` event will trigger the dedicated release workflow, which re-runs verification and then publishes automatically.

If you want to reproduce the release checks locally first:

```bash
npm run verify
```

Before publishing:

- confirm the package name is still available
- confirm the tarball contains `README.md`, `catalog.json`, `skills/`, and `src/`
- confirm the CLI still works with `npx agent-skills-installer`
- confirm `package.json` version and the GitHub release tag match exactly
- confirm npm package settings include a trusted publisher for `ydj515/agent-skills-installer`
- confirm the trusted publisher workflow filename is `release-publish.yml`

Trusted publishing setup:

- add a GitHub Actions trusted publisher in the npm package settings
- use `ydj515` as the owner, `agent-skills-installer` as the repository, and `release-publish.yml` as the workflow filename
- keep the workflow on GitHub-hosted runners with `id-token: write` enabled
- after the first successful trusted publish, remove any legacy `NPM_TOKEN` secret and switch package publishing access to disallow tokens

## References

- https://developers.openai.com/codex/skills
- https://geminicli.com/docs/cli/skills/
- https://code.claude.com/docs/ko/skills
