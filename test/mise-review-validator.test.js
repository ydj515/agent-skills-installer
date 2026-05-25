import assert from "node:assert/strict";
import { spawnSync } from "node:child_process";
import fs from "node:fs/promises";
import os from "node:os";
import path from "node:path";
import test from "node:test";
import { fileURLToPath } from "node:url";

const VALIDATOR_PATH = fileURLToPath(
  new URL("../skills/mise-review/scripts/validate_mise_toml.py", import.meta.url)
);

test("mise-review validator는 python-uv profile 누락 도구를 JSON으로 보고한다", async (t) => {
  if (!hasPython3()) {
    t.skip("python3가 없어 validator 테스트를 건너뜁니다.");
    return;
  }

  const repoDir = await fs.mkdtemp(path.join(os.tmpdir(), "mise-review-validator-"));
  t.after(async () => {
    await fs.rm(repoDir, { recursive: true, force: true });
  });

  await fs.writeFile(
    path.join(repoDir, "mise.toml"),
    '[tools]\npython = "3.12"\n',
    "utf8"
  );
  await fs.writeFile(path.join(repoDir, "pyproject.toml"), "[project]\nname = 'demo'\n", "utf8");
  await fs.writeFile(path.join(repoDir, "uv.lock"), "# lockfile\n", "utf8");

  const result = spawnSync(
    "python3",
    [VALIDATOR_PATH, "--format", "json", "mise.toml"],
    {
      cwd: repoDir,
      encoding: "utf8"
    }
  );

  assert.equal(result.status, 0, result.stderr);

  const payload = JSON.parse(result.stdout);
  const ruleIds = payload.diagnostics.map((diagnostic) => diagnostic.rule_id);

  assert.ok(ruleIds.includes("MWP001"));
  assert.match(
    payload.diagnostics.find((diagnostic) => diagnostic.rule_id === "MWP001").why,
    /python-uv profile/
  );
});

function hasPython3() {
  const result = spawnSync("python3", ["--version"], { encoding: "utf8" });
  return result.status === 0;
}
