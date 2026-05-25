import assert from "node:assert/strict";
import fs from "node:fs/promises";
import path from "node:path";
import test from "node:test";
import { fileURLToPath } from "node:url";

const REPO_ROOT = fileURLToPath(new URL("../", import.meta.url));
const SKILLS_ROOT = path.join(REPO_ROOT, "skills");

test("mise 스킬 문서의 상대 참조가 모두 실제 파일을 가리킨다", async () => {
  const brokenRefs = [];
  const skillDirs = (await fs.readdir(SKILLS_ROOT, { withFileTypes: true }))
    .filter((entry) => entry.isDirectory() && entry.name.startsWith("mise-"))
    .map((entry) => path.join(SKILLS_ROOT, entry.name));

  for (const skillDir of skillDirs) {
    const docs = await collectDocs(skillDir);

    for (const docPath of docs) {
      const contents = await fs.readFile(docPath, "utf8");
      const refs = [
        ...extractBacktickRefs(contents),
        ...extractMarkdownLinkRefs(contents)
      ];

      for (const ref of refs) {
        const resolved = path.resolve(path.dirname(docPath), ref);
        if (!(await pathExists(resolved))) {
          brokenRefs.push({
            file: path.relative(REPO_ROOT, docPath),
            ref,
            resolved: path.relative(REPO_ROOT, resolved)
          });
          continue;
        }

        if (!resolved.startsWith(`${skillDir}${path.sep}`)) {
          brokenRefs.push({
            file: path.relative(REPO_ROOT, docPath),
            ref,
            resolved: path.relative(REPO_ROOT, resolved)
          });
        }
      }
    }
  }

  assert.deepEqual(brokenRefs, []);
});

test("mise 스킬은 공용 reference 디렉터리에 의존하지 않는다", async () => {
  assert.equal(await pathExists(path.join(SKILLS_ROOT, "references")), false);
});

async function collectDocs(dirPath) {
  const docs = [];
  const entries = await fs.readdir(dirPath, { withFileTypes: true });

  for (const entry of entries) {
    const fullPath = path.join(dirPath, entry.name);
    if (entry.isDirectory()) {
      docs.push(...(await collectDocs(fullPath)));
      continue;
    }

    if (entry.name === "SKILL.md" || entry.name.endsWith(".md")) {
      docs.push(fullPath);
    }
  }

  return docs;
}

function extractBacktickRefs(contents) {
  return [...contents.matchAll(/`([^`]+)`/g)]
    .map((match) => match[1])
    .filter(isDocRef);
}

function extractMarkdownLinkRefs(contents) {
  return [...contents.matchAll(/\[[^\]]+\]\(([^)]+)\)/g)]
    .map((match) => match[1])
    .filter(isDocRef);
}

function isDocRef(ref) {
  if (ref.startsWith("http://") || ref.startsWith("https://")) {
    return false;
  }

  return (
    ref.endsWith(".md") ||
    ref.endsWith("/") ||
    ref.startsWith("./") ||
    ref.startsWith("../") ||
    ref.startsWith("references/") ||
    ref.startsWith("ecosystems/") ||
    ref.startsWith("examples/")
  );
}

async function pathExists(targetPath) {
  try {
    await fs.access(targetPath);
    return true;
  } catch {
    return false;
  }
}
