# Contributing to agent-skills-installer

Thank you for contributing to `agent-skills-installer`. Please review the environment setup and verification steps below before submitting changes. For detailed target layouts and safety rules, see the [Usage & Operations Guide](./docs/GUIDE.md).

## 1. Development Setup

Node.js (`24.19.0`) and common tasks are defined in [`mise.toml`](./mise.toml). Runtime compatibility is verified across Node.js `20`, `22`, and `24`.

```bash
mise trust
mise install
mise tasks
```

## 2. Code & Skill Bundle Guidelines

- **Skill Source Structure:** Place each bundled skill under [`skills/<skill-id>/`](./skills) with a required `SKILL.md` and optional `scripts/`, `references/`, `assets/`, or `agents/` directories. Symbolic links inside skill sources are rejected.
- **Catalog Registration:** When adding or updating a skill, keep its metadata entry (`id`, `title`, `description`, `version`, `sourceDir`, `targets`, `tags`, `groups`) in [`catalog.json`](./catalog.json) synchronized.
- **Commit Messages:** Follow Conventional Commits (`feat:`, `fix:`, `docs:`, `chore:`, `build:`, `test:`).

## 3. Required Verification

All changes must pass the local verification gate before opening a pull request:

```bash
mise run verify
```

If your changes affect runtime compatibility or packaging behavior, also run the multi-version Node.js test matrix:

```bash
mise run test-matrix
```

## 4. References

- [Usage & Operations Guide](./docs/GUIDE.md)
- [Implementation Plan](./docs/IMPLEMENTATION_PLAN.md)
- [Changelog](./CHANGELOG.md)
