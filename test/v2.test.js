import assert from "node:assert/strict";
import { spawnSync } from "node:child_process";
import fs from "node:fs/promises";
import os from "node:os";
import path from "node:path";
import test from "node:test";
import { fileURLToPath } from "node:url";
import {
  CATALOG_SCHEMA_VERSION,
  LOCK_FILE,
  TEMP_ROOT_DIR
} from "../src/lib/constants.js";
import { installRequests } from "../src/lib/install.js";
import { pathExists, removePath } from "../src/lib/utils.js";

const REPO_ROOT = fileURLToPath(new URL("../", import.meta.url));
const CLI_PATH = fileURLToPath(new URL("../src/cli.js", import.meta.url));

test("install --skills는 선택한 스킬만 설치한다", async (t) => {
  const projectDir = await createTempProject(t);

  const result = runCli([
    "install",
    "codex",
    "--scope",
    "project",
    "--cwd",
    projectDir,
    "--skills",
    "instruction-only"
  ]);

  assert.equal(result.status, 0);
  assert.equal(
    await pathExists(path.join(projectDir, ".agents", "skills", "instruction-only", "SKILL.md")),
    true
  );
  assert.equal(
    await pathExists(path.join(projectDir, ".agents", "skills", "script-backed")),
    false
  );
  assert.match(result.stdout, /- selected: instruction-only/);
});

test("install --tag는 카탈로그 태그 필터를 사용한다", async (t) => {
  const projectDir = await createTempProject(t);

  const result = runCli([
    "install",
    "codex",
    "--scope",
    "project",
    "--cwd",
    projectDir,
    "--tag",
    "docs"
  ]);

  assert.equal(result.status, 0);
  assert.equal(
    await pathExists(path.join(projectDir, ".agents", "skills", "instruction-only", "SKILL.md")),
    true
  );
  assert.equal(
    await pathExists(path.join(projectDir, ".agents", "skills", "script-backed")),
    false
  );
});

test("list는 설치 상태와 groups/tags 메타데이터를 출력한다", async (t) => {
  const projectDir = await createTempProject(t);

  const installResult = runCli([
    "install",
    "codex",
    "--scope",
    "project",
    "--cwd",
    projectDir,
    "--skills",
    "instruction-only"
  ]);
  assert.equal(installResult.status, 0);

  const listResult = runCli([
    "list",
    "codex",
    "--scope",
    "project",
    "--cwd",
    projectDir,
    "--group",
    "starter"
  ]);

  assert.equal(listResult.status, 0);
  assert.match(listResult.stdout, /- installed: instruction-only/);
  assert.match(listResult.stdout, /- available: script-backed/);
  assert.match(
    listResult.stdout,
    /skill: instruction-only \| status: installed \| default: yes \| groups: starter, core \| tags: starter, docs/
  );
  assert.match(
    listResult.stdout,
    /skill: script-backed \| status: available \| default: yes \| groups: starter, automation \| tags: starter, scripts/
  );
});

test("remove --skills는 관리 중인 스킬만 안전하게 제거한다", async (t) => {
  const projectDir = await createTempProject(t);

  const installResult = runCli([
    "install",
    "codex",
    "--scope",
    "project",
    "--cwd",
    projectDir
  ]);
  assert.equal(installResult.status, 0);

  const removeResult = runCli([
    "remove",
    "codex",
    "--scope",
    "project",
    "--cwd",
    projectDir,
    "--skills",
    "script-backed"
  ]);

  assert.equal(removeResult.status, 0);
  assert.equal(
    await pathExists(path.join(projectDir, ".agents", "skills", "instruction-only", "SKILL.md")),
    true
  );
  assert.equal(
    await pathExists(path.join(projectDir, ".agents", "skills", "script-backed")),
    false
  );
  assert.match(removeResult.stdout, /- removed: script-backed/);
});

test("update는 설치된 관리 스킬만 재설치하고 누락된 스킬은 건너뛴다", async (t) => {
  const projectDir = await createTempProject(t);
  const skillFile = path.join(projectDir, ".agents", "skills", "instruction-only", "SKILL.md");

  const installResult = runCli([
    "install",
    "codex",
    "--scope",
    "project",
    "--cwd",
    projectDir,
    "--skills",
    "instruction-only"
  ]);
  assert.equal(installResult.status, 0);

  const originalContents = await fs.readFile(skillFile, "utf8");
  await fs.writeFile(skillFile, "tampered\n", "utf8");

  const updateResult = runCli([
    "update",
    "codex",
    "--scope",
    "project",
    "--cwd",
    projectDir,
    "--skills",
    "instruction-only,script-backed"
  ]);

  assert.equal(updateResult.status, 0);
  assert.equal(await fs.readFile(skillFile, "utf8"), originalContents);
  assert.equal(
    await pathExists(path.join(projectDir, ".agents", "skills", "script-backed")),
    false
  );
  assert.match(updateResult.stdout, /- updated: instruction-only/);
  assert.match(updateResult.stdout, /- skipped: script-backed/);
});

test("손상된 lock 메타데이터가 오래된 경우 자동 회수하지 않고 실패한다", async (t) => {
  const projectDir = await createTempProject(t);
  const installRoot = path.join(projectDir, ".agents", "skills");
  const lockPath = path.join(installRoot, LOCK_FILE);

  await fs.mkdir(installRoot, { recursive: true });
  await fs.writeFile(lockPath, "{broken json\n", "utf8");
  const staleDate = new Date(Date.now() - 10_000);
  await fs.utimes(lockPath, staleDate, staleDate);

  const result = runCli([
    "install",
    "codex",
    "--scope",
    "project",
    "--cwd",
    projectDir
  ]);

  assert.equal(result.status, 4);
  assert.match(result.stderr, /Lock metadata is corrupted/);
});

test("쓰기 권한이 없는 install root는 EACCES로 실패한다", async (t) => {
  const projectDir = await createTempProject(t);
  const installRoot = path.join(projectDir, ".agents", "skills");

  await fs.mkdir(installRoot, { recursive: true });
  await fs.chmod(installRoot, 0o500);
  t.after(async () => {
    await fs.chmod(installRoot, 0o700).catch(() => {});
  });

  const result = runCli([
    "install",
    "codex",
    "--scope",
    "project",
    "--cwd",
    projectDir
  ]);

  assert.equal(result.status, 3);
  assert.match(result.stderr, /EACCES/);
});

test("symlink temp entry가 있으면 안전하게 실패한다", async (t) => {
  const projectDir = await createTempProject(t);
  const installRoot = path.join(projectDir, ".agents", "skills");
  const tempRoot = path.join(installRoot, TEMP_ROOT_DIR);
  const outsideDir = await createTempDir(t, "agent-skills-installer-outside-");

  await fs.mkdir(tempRoot, { recursive: true });
  await fs.symlink(outsideDir, path.join(tempRoot, "tmp-symlink"));

  const result = runCli([
    "install",
    "codex",
    "--scope",
    "project",
    "--cwd",
    projectDir
  ]);

  assert.equal(result.status, 4);
  assert.match(result.stderr, /Refusing to inspect symlink temp entry/);
});

test("symlink source가 있는 카탈로그 엔트리는 설치를 거부한다", async (t) => {
  const projectDir = await createTempProject(t);
  const sourceDir = await createTempDir(t, "agent-skills-installer-source-");
  const targetFile = path.join(sourceDir, "target.txt");
  const linkPath = path.join(sourceDir, "linked.txt");

  await fs.writeFile(targetFile, "hello\n", "utf8");
  await fs.symlink(targetFile, linkPath);

  const catalog = {
    schemaVersion: CATALOG_SCHEMA_VERSION,
    skills: [
      {
        id: "symlinked-skill",
        title: "Symlinked Skill",
        description: "",
        version: "1.0.0",
        sourceDir: "skills/symlinked-skill",
        resolvedSourceDir: sourceDir,
        targets: ["codex"],
        enabledByDefault: true,
        tags: [],
        groups: [],
        hidden: false,
        deprecated: false
      }
    ]
  };

  const results = await installRequests({
    catalog,
    requests: [{ target: "codex", selectedSkillIds: ["symlinked-skill"] }],
    scope: "project",
    cwd: projectDir,
    dryRun: false,
    force: false,
    packageVersion: "test-version"
  });

  assert.equal(results[0].ok, false);
  assert.deepEqual(results[0].failed, ["symlinked-skill"]);
  assert.match(String(results[0].error?.message), /Symlinks are not supported/);
  assert.equal(
    await pathExists(path.join(projectDir, ".agents", "skills", "symlinked-skill")),
    false
  );
});

function runCli(args, { env } = {}) {
  return spawnSync(process.execPath, [CLI_PATH, ...args], {
    cwd: REPO_ROOT,
    encoding: "utf8",
    env: env ?? process.env
  });
}

async function createTempProject(t) {
  return createTempDir(t, "agent-skills-installer-v2-");
}

async function createTempDir(t, prefix) {
  const tempDir = await fs.mkdtemp(path.join(os.tmpdir(), prefix));
  t.after(async () => {
    await removePath(tempDir).catch(() => {});
  });
  return tempDir;
}
