# agent-skills-installer

Public npm CLI for installing bundled Agent Skills for Codex, Claude Code, and Gemini CLI.

`agent-skills-installer` gives users a single `npx` entrypoint for installing the same bundled skills across multiple agent CLIs, while keeping each target's install path and safety rules separate.

## Why this package exists

- Install bundled skills without cloning a repository.
- Support both interactive setup and direct CLI usage.
- Keep skill sources in one package while installing to agent-specific locations.
- Protect existing directories with ownership markers, lock files, and staged installs.

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
npx agent-skills-installer install claude
npx agent-skills-installer install gemini
npx agent-skills-installer install all
```

Project-scope install:

```bash
npx agent-skills-installer install codex --scope project
```

Dry run:

```bash
npx agent-skills-installer install all --scope project --dry-run
```

Force reinstall for directories that were previously installed by this tool:

```bash
npx agent-skills-installer install codex --scope project --force
```

## Interactive mode

Run without arguments to start the interactive wizard:

```bash
npx agent-skills-installer
```

The wizard currently supports:

1. Select one target: `codex`, `claude`, `gemini`, or `all`
2. Select one scope: `user` or `project`
3. Select bundled starter skills with checkboxes
4. Review the summary
5. Confirm installation

In interactive mode:

- Single-choice steps use arrow keys and `Enter`
- Multi-select skill steps use `Space` to toggle and `Enter` to continue

## Direct CLI

`v1` supports this command:

```bash
npx agent-skills-installer install <codex|claude|gemini|all> [--scope user|project] [--cwd <path>] [--dry-run] [--force]
```

Notes:

- The default scope is `user`
- `--cwd` only affects `project` scope
- `--dry-run` prints the resolved plan without copying files
- `--force` only works for directories that contain a valid ownership marker created by this package
- `v1` does not support `--skills`, `list`, `remove`, or `update`

## Bundled starter skills

`v1` ships with two starter skills:

- `instruction-only`
- `script-backed`

Direct CLI installs the bundled starter skills that are enabled by default for the selected target.

Interactive mode lets the user choose from the same starter set.

## Install locations

### User scope

Codex:

1. `$CODEX_HOME/skills` if it exists
2. `~/.codex/skills` if it exists
3. `~/.agents/skills`

Claude Code:

- `~/.claude/skills`

Gemini CLI:

- `~/.gemini/skills`

### Project scope

Codex:

- `<cwd>/.agents/skills`

Claude Code:

- `<cwd>/.claude/skills`

Gemini CLI:

- `<cwd>/.gemini/skills`

## Safety model

The installer is intentionally conservative.

- Each installed skill directory gets an ownership marker named `.agent-skills-installer.json`
- Existing directories are not overwritten unless `--force` is used
- `--force` only works when the existing directory contains a valid marker created by this package
- A lock file prevents concurrent installs into the same root
- Files are copied into a temp directory first and then moved into place
- Stale locks and stale temp directories are cleaned up conservatively
- Skill sources that resolve outside the package root are rejected
- Symlinks inside bundled skill sources are rejected in `v1`

## Conflict and overwrite behavior

If a target skill directory already exists:

- Without `--force`: installation fails
- With `--force`: installation only proceeds when the directory was installed by `agent-skills-installer`
- Manually copied or moved directories are treated as unmanaged and are not overwritten automatically

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
- root: /Users/example/.agents/skills
- selected: instruction-only, script-backed
- installed: instruction-only, script-backed
- skipped: none
- failed: none
- note: tool restart may be required to load new skills
```

## Public package positioning

Suggested short package description:

> Public npm CLI for installing bundled Agent Skills for Codex, Claude Code, and Gemini CLI.

Suggested release blurb:

> `agent-skills-installer` is a public npm package that installs bundled Agent Skills with one `npx` command. It supports interactive setup, direct CLI usage, user/project scope installs, and safe overwrite rules for Codex, Claude Code, and Gemini CLI.

Suggested launch message:

> Install bundled skills for Codex, Claude Code, and Gemini CLI with `npx agent-skills-installer`. Start with the interactive wizard or use direct commands like `npx agent-skills-installer install codex`.

## Version scope

`v0.1.0` is the first implementation-focused release.

Current scope:

- Interactive install
- Direct install
- User scope and project scope
- Bundled starter skills
- Ownership markers, lock files, and staged installs
- Atomic per-target installs with rollback on failure
- `install all` best-effort execution with per-target summaries
- `--force` reinstall only for managed directories with valid markers

Current verified coverage:

- Lock conflict handling
- Stale temp cleanup
- Managed-directory `--force` reinstall
- Marker corruption handling
- `CODEX_HOME`-first user-scope resolution
- Interactive wizard selection flow
- Packed tarball `npx` smoke install

Planned after `v1`:

- `install --skills`
- `list`
- `remove`
- `update`
- richer catalog metadata such as groups and tags

## Development

Run the CLI locally:

```bash
node src/cli.js
```

Run a direct command locally:

```bash
node src/cli.js install codex --scope project --dry-run
```

Run the automated test suite:

```bash
npm test
```

Pack the publishable tarball:

```bash
npm pack --dry-run
```

Smoke-test the packed tarball locally:

```bash
TARBALL="$(npm pack --silent)"
npx --yes --package "./$TARBALL" agent-skills-installer install all --scope project --cwd /tmp/agent-skills-installer-smoke
```

The current test suite covers:

- Atomic rollback when a target install fails part-way through
- `install all` partial failure behavior
- CLI summary and error output for single-target failures
- Lock conflicts and stale temp cleanup
- `--force` reinstall and marker validation
- User-scope root resolution for Codex
- Interactive wizard request generation

## CI

GitHub Actions currently verifies the package on:

- Node `20`
- Node `22`

The `verify` job runs on `push`, `pull_request`, `release`, and `workflow_dispatch`, and checks:

- `npm test`
- `npm pack --dry-run`
- packed tarball installation via `npx --package <tarball>`

## Publishing

Recommended release flow:

1. Verify the package contents:

```bash
npm pack --dry-run
```

2. Publish the public package:

```bash
npm publish --access public
```

Before publishing:

- confirm the package name is still available
- confirm the tarball contains `README.md`, `catalog.json`, `skills/`, and `src/`
- confirm the CLI still works with `npx agent-skills-installer`
- confirm your npm account is ready for public publish and any required 2FA flow

GitHub Actions secret:

- create an npm token that can publish this package
- add it to the repository as a GitHub Actions secret named `NPM_TOKEN`
- the publish workflow maps `NPM_TOKEN` to `NODE_AUTH_TOKEN` during `npm publish`

## References

- https://developers.openai.com/codex/skills
- https://geminicli.com/docs/cli/skills/
- https://code.claude.com/docs/ko/skills
