# Tools Execution Checklist

## Check First

- Has the profile been decided?
- Does the work follow the shared policy in `policy-core.md` and `version-policy.md`?
- Is the selector floor defined in the relevant ecosystem reference?
- Does the repository need runtime, build tool, and package manager reviewed together?

## Authoring Order

1. Settle the tool name. Use the registry short name when one exists.
2. If you must pick a backend, consider them in this order: `packslip` → `aqua`, `github` → `http` → language packages → plugins.
3. Check real candidates with `mise ls-remote` or `mise latest`.
4. Decide the request. Do not use npm-style ranges or `latest`.
5. Write needed tool options (`minimum_release_age`, `version_order`, and so on) as a table.
6. Decide the lock strategy (`lockfile.md`).
7. If ecosystem-specific rules apply, read the root ecosystem reference.

## Ecosystem Handoff

- Java runtime: `ecosystems/java-runtime.md`
- Gradle build: `ecosystems/java-gradle.md`
- Python runtime: `ecosystems/python-runtime.md`
- uv workflow: `ecosystems/python-uv.md`
- Spring service: `ecosystems/spring-service.md`
