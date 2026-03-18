import assert from "node:assert/strict";
import { spawnSync } from "node:child_process";
import fs from "node:fs/promises";
import os from "node:os";
import path from "node:path";
import test from "node:test";
import { fileURLToPath } from "node:url";
import {
  LOCK_FILE,
  MARKER_FILE,
  STALE_WINDOW_MS,
  TEMP_META_FILE,
  TEMP_ROOT_DIR
} from "../src/lib/constants.js";
import { loadCatalog } from "../src/lib/catalog.js";
import { toCliError } from "../src/lib/errors.js";
import {
  buildInstallRequestsForDirectCommand,
  installRequests,
  summarizeExitCode
} from "../src/lib/install.js";
import { pathExists, removePath } from "../src/lib/utils.js";

const REPO_ROOT = fileURLToPath(new URL("../", import.meta.url));
const CLI_PATH = fileURLToPath(new URL("../src/cli.js", import.meta.url));

test("단일 타깃 실패 시 부분 설치를 롤백하고 상세 종료 코드를 유지한다", async (t) => {
  const catalog = await loadCatalog();
  const projectDir = await createTempProject(t);

  await seedProjectConflict(projectDir, "codex", "script-backed");

  const results = await installForProject(catalog, "codex", projectDir);

  assert.equal(results.length, 1);
  assert.equal(results[0].ok, false);
  assert.deepEqual(results[0].failed, ["script-backed"]);
  assert.equal(
    await pathExists(path.join(projectDir, ".agents", "skills", "instruction-only")),
    false
  );
  assert.equal(summarizeExitCode(results), 4);
});

test("install all은 실패 타깃을 롤백한 뒤 다른 타깃 설치를 계속 진행한다", async (t) => {
  const catalog = await loadCatalog();
  const projectDir = await createTempProject(t);

  await seedProjectConflict(projectDir, "codex", "script-backed");

  const results = await installForProject(catalog, "all", projectDir);
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

test("단일 타깃 실패 시 CLI가 summary와 에러를 함께 출력한다", async (t) => {
  const projectDir = await createTempProject(t);

  await seedProjectConflict(projectDir, "codex", "script-backed");

  const result = runCli(["install", "codex", "--scope", "project", "--cwd", projectDir]);

  assert.equal(result.status, 4);
  assert.match(result.stdout, /\[agent-skills-installer\] install summary/);
  assert.match(result.stdout, /- failed: script-backed/);
  assert.match(result.stderr, /SAFETY_VIOLATION/);
  assert.equal(
    await pathExists(path.join(projectDir, ".agents", "skills", "instruction-only")),
    false
  );
});

test("lock 파일이 존재하면 설치를 충돌로 중단한다", async (t) => {
  const catalog = await loadCatalog();
  const projectDir = await createTempProject(t);
  const installRoot = path.join(projectDir, ".agents", "skills");

  await fs.mkdir(installRoot, { recursive: true });
  await fs.writeFile(
    path.join(installRoot, LOCK_FILE),
    `${JSON.stringify({ pid: process.pid, startedAt: new Date().toISOString() }, null, 2)}\n`,
    "utf8"
  );

  const results = await installForProject(catalog, "codex", projectDir);

  assert.equal(results[0].ok, false);
  assert.equal(toCliError(results[0].error).codeName, "LOCK_CONFLICT");
  assert.equal(summarizeExitCode(results), 4);
  assert.equal(
    await pathExists(path.join(projectDir, ".agents", "skills", "instruction-only")),
    false
  );
});

test("stale temp 디렉터리는 새 설치 전에 정리된다", async (t) => {
  const catalog = await loadCatalog();
  const projectDir = await createTempProject(t);
  const installRoot = path.join(projectDir, ".agents", "skills");
  const staleTempDir = path.join(installRoot, TEMP_ROOT_DIR, "tmp-stale-entry");

  await fs.mkdir(staleTempDir, { recursive: true });
  await fs.writeFile(
    path.join(staleTempDir, TEMP_META_FILE),
    `${JSON.stringify(
      {
        pid: 999999,
        startedAt: new Date(Date.now() - STALE_WINDOW_MS - 60_000).toISOString(),
        skillId: "instruction-only"
      },
      null,
      2
    )}\n`,
    "utf8"
  );

  const results = await installForProject(catalog, "codex", projectDir);

  assert.equal(results[0].ok, true);
  assert.equal(await pathExists(staleTempDir), false);
  assert.equal(
    await pathExists(path.join(projectDir, ".agents", "skills", "instruction-only")),
    true
  );
});

test("관리 중인 디렉터리는 --force로 재설치할 수 있다", async (t) => {
  const catalog = await loadCatalog();
  const projectDir = await createTempProject(t);
  const skillFile = path.join(projectDir, ".agents", "skills", "instruction-only", "SKILL.md");

  const initialResults = await installForProject(catalog, "codex", projectDir);
  assert.equal(initialResults[0].ok, true);

  const originalContents = await fs.readFile(skillFile, "utf8");
  await fs.writeFile(skillFile, "tampered\n", "utf8");

  const forceResults = await installForProject(catalog, "codex", projectDir, { force: true });

  assert.equal(forceResults[0].ok, true);
  assert.equal(await fs.readFile(skillFile, "utf8"), originalContents);
});

test("손상된 marker가 있으면 --force 재설치를 거부한다", async (t) => {
  const catalog = await loadCatalog();
  const projectDir = await createTempProject(t);
  const markerPath = path.join(
    projectDir,
    ".agents",
    "skills",
    "instruction-only",
    MARKER_FILE
  );
  const skillFile = path.join(projectDir, ".agents", "skills", "instruction-only", "SKILL.md");

  const initialResults = await installForProject(catalog, "codex", projectDir);
  assert.equal(initialResults[0].ok, true);

  const beforeContents = await fs.readFile(skillFile, "utf8");
  await fs.writeFile(markerPath, "{broken json\n", "utf8");

  const forceResults = await installForProject(catalog, "codex", projectDir, { force: true });

  assert.equal(forceResults[0].ok, false);
  assert.deepEqual(forceResults[0].failed, ["instruction-only"]);
  assert.equal(toCliError(forceResults[0].error).codeName, "MARKER_INVALID");
  assert.equal(await fs.readFile(skillFile, "utf8"), beforeContents);
});

test("user scope 설치는 CODEX_HOME/skills 우선순위를 따른다", async (t) => {
  const homeDir = await createTempDir(t, "agent-skills-installer-home-");
  const codexHome = path.join(homeDir, "custom-codex-home");

  await fs.mkdir(path.join(codexHome, "skills"), { recursive: true });

  const result = runCli(["install", "codex", "--scope", "user"], {
    env: {
      ...process.env,
      HOME: homeDir,
      CODEX_HOME: codexHome
    }
  });

  assert.equal(result.status, 0);
  assert.equal(
    await pathExists(path.join(codexHome, "skills", "instruction-only", "SKILL.md")),
    true
  );
  assert.equal(
    await pathExists(path.join(homeDir, ".agents", "skills", "instruction-only", "SKILL.md")),
    false
  );
  assert.match(result.stdout, new RegExp(`- root: ${escapeForRegExp(path.join(codexHome, "skills"))}`));
});

async function installForProject(catalog, target, projectDir, { force = false } = {}) {
  return installRequests({
    catalog,
    requests: buildInstallRequestsForDirectCommand(catalog, target),
    scope: "project",
    cwd: projectDir,
    dryRun: false,
    force,
    packageVersion: "test-version"
  });
}

function runCli(args, { env } = {}) {
  return spawnSync(process.execPath, [CLI_PATH, ...args], {
    cwd: REPO_ROOT,
    encoding: "utf8",
    env: env ?? process.env
  });
}

async function createTempProject(t) {
  return createTempDir(t, "agent-skills-installer-test-");
}

async function createTempDir(t, prefix) {
  const tempDir = await fs.mkdtemp(path.join(os.tmpdir(), prefix));
  t.after(async () => {
    await removePath(tempDir).catch(() => {});
  });
  return tempDir;
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

function escapeForRegExp(value) {
  return value.replace(/[.*+?^${}()|[\]\\]/g, "\\$&");
}
