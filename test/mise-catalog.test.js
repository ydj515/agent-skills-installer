import assert from "node:assert/strict";
import test from "node:test";
import { loadCatalog } from "../src/lib/catalog.js";

const EXPECTED_MISE_SKILLS = [
  "mise-env",
  "mise-policy",
  "mise-profiles",
  "mise-review",
  "mise-tasks",
  "mise-tools"
];

test("catalog는 mise 스킬 여섯 개를 기본 설치 항목으로 포함한다", async () => {
  const catalog = await loadCatalog();
  const skillsById = new Map(catalog.skills.map((skill) => [skill.id, skill]));

  for (const skillId of EXPECTED_MISE_SKILLS) {
    assert.equal(skillsById.has(skillId), true, `${skillId} missing from catalog`);

    const skill = skillsById.get(skillId);
    assert.equal(skill.enabledByDefault, true);
    assert.deepEqual(skill.targets, ["codex", "claude", "gemini"]);
    assert.match(skill.sourceDir, new RegExp(`^skills/${skillId}$`));
  }
});
