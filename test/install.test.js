import assert from "node:assert/strict";
import { spawnSync } from "node:child_process";
import fs from "node:fs/promises";
import os from "node:os";
import path from "node:path";
import test from "node:test";
import { fileURLToPath } from "node:url";
import { loadCatalog } from "../src/lib/catalog.js";
import {
  buildInstallRequestsForDirectCommand,
  installRequests,
  summarizeExitCode
} from "../src/lib/install.js";
import { pathExists } from "../src/lib/utils.js";

const REPO_ROOT = fileURLToPath(new URL("../", import.meta.url));
const CLI_PATH = fileURLToPath(new URL("../src/cli.js", import.meta.url));

test("단일 타깃 실패 시 부분 설치를 롤백하고 상세 종료 코드를 유지한다", async () => {
  const catalog = await loadCatalog();
  const projectDir = await createTempProject();

  await seedProjectConflict(projectDir, "codex", "script-backed");

  const results = await installRequests({
    catalog,
    requests: buildInstallRequestsForDirectCommand(catalog, "codex"),
    scope: "project",
    cwd: projectDir,
    dryRun: false,
    force: false,
    packageVersion: "test-version"
  });

  assert.equal(results.length, 1);
  assert.equal(results[0].ok, false);
  assert.deepEqual(results[0].failed, ["script-backed"]);
  assert.equal(
    await pathExists(path.join(projectDir, ".agents", "skills", "instruction-only")),
    false
  );
  assert.equal(summarizeExitCode(results), 4);
});

test("install all은 실패 타깃을 롤백한 뒤 다른 타깃 설치를 계속 진행한다", async () => {
  const catalog = await loadCatalog();
  const projectDir = await createTempProject();

  await seedProjectConflict(projectDir, "codex", "script-backed");

  const results = await installRequests({
    catalog,
    requests: buildInstallRequestsForDirectCommand(catalog, "all"),
    scope: "project",
    cwd: projectDir,
    dryRun: false,
    force: false,
    packageVersion: "test-version"
  });

  const resultByTarget = new Map(results.map((result) => [result.target, result]));

  assert.equal(resultByTarget.get("codex").ok, false);
  assert.deepEqual(resultByTarget.get("codex").failed, ["script-backed"]);
  assert.equal(
    await pathExists(path.join(projectDir, ".agents", "skills", "instruction-only")),
    false
  );

  assert.equal(resultByTarget.get("claude").ok, true);
  assert.equal(
    await pathExists(path.join(projectDir, ".claude", "skills", "instruction-only")),
    true
  );

  assert.equal(resultByTarget.get("gemini").ok, true);
  assert.equal(
    await pathExists(path.join(projectDir, ".gemini", "skills", "instruction-only")),
    true
  );

  assert.equal(summarizeExitCode(results), 1);
});

test("단일 타깃 실패 시 CLI가 summary와 에러를 함께 출력한다", async () => {
  const projectDir = await createTempProject();

  await seedProjectConflict(projectDir, "codex", "script-backed");

  const result = spawnSync(
    process.execPath,
    [CLI_PATH, "install", "codex", "--scope", "project", "--cwd", projectDir],
    {
      cwd: REPO_ROOT,
      encoding: "utf8"
    }
  );

  assert.equal(result.status, 4);
  assert.match(result.stdout, /\[agent-skills-installer\] install summary/);
  assert.match(result.stdout, /- failed: script-backed/);
  assert.match(result.stderr, /SAFETY_VIOLATION/);
  assert.equal(
    await pathExists(path.join(projectDir, ".agents", "skills", "instruction-only")),
    false
  );
});

async function createTempProject() {
  return fs.mkdtemp(path.join(os.tmpdir(), "agent-skills-installer-test-"));
}

async function seedProjectConflict(projectDir, target, skillId) {
  await fs.mkdir(path.join(projectDir, getProjectInstallRoot(target), skillId), {
    recursive: true
  });
}

function getProjectInstallRoot(target) {
  switch (target) {
    case "codex":
      return path.join(".agents", "skills");
    case "claude":
      return path.join(".claude", "skills");
    case "gemini":
      return path.join(".gemini", "skills");
    default:
      throw new Error(`Unsupported target "${target}".`);
  }
}
