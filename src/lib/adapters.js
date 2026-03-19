import fs from "node:fs/promises";
import os from "node:os";
import path from "node:path";
import { TARGETS } from "./constants.js";
import { usageError } from "./errors.js";
import { copyDirectoryStrict, pathExists } from "./utils.js";
import { installPreparedSkill } from "./install-core.js";

const IGNORED_SOURCE_NAMES = new Set([".DS_Store"]);
const TARGET_ALLOWED_TOP_LEVEL_NAMES = {
  codex: null,
  claude: new Set(["SKILL.md", "template.md", "examples", "scripts"]),
  gemini: new Set(["SKILL.md", "scripts", "references", "assets"])
};

export function getTargetAdapter(target) {
  if (!TARGETS.includes(target)) {
    throw usageError(`Unsupported target "${target}".`);
  }

  return {
    target,
    resolveInstallRoot(scope, cwd, env = process.env, homeDir = os.homedir()) {
      return resolveInstallRootForTarget(target, scope, cwd, env, homeDir);
    },
    prepareSkill(entry) {
      return prepareSkillForTarget(entry, target);
    },
    installSkill(context) {
      return installPreparedSkill(context);
    }
  };
}

async function resolveInstallRootForTarget(target, scope, cwd, env, homeDir) {
  if (scope === "project") {
    switch (target) {
      case "codex":
        return path.join(cwd, ".codex", "skills");
      case "claude":
        return path.join(cwd, ".claude", "skills");
      case "gemini":
        return path.join(cwd, ".gemini", "skills");
      default:
        throw usageError(`Unsupported target "${target}".`);
    }
  }

  switch (target) {
    case "codex":
      return resolveCodexUserRoot(env, homeDir);
    case "claude":
      return path.join(homeDir, ".claude", "skills");
    case "gemini":
      return path.join(homeDir, ".gemini", "skills");
    default:
      throw usageError(`Unsupported target "${target}".`);
  }
}

async function resolveCodexUserRoot(env, homeDir) {
  const codexHome = env.CODEX_HOME;
  if (typeof codexHome === "string" && codexHome.length > 0) {
    const codexHomeSkills = path.join(codexHome, "skills");
    if (await pathExists(codexHomeSkills)) {
      return codexHomeSkills;
    }
  }

  return path.join(homeDir, ".codex", "skills");
}

export function filterInstallPreviewForTarget(target, relativeFiles) {
  const allowedNames = getAllowedTopLevelNames(target);
  return relativeFiles.filter((relativeFile) => isRelativeFileAllowed(relativeFile, allowedNames));
}

async function prepareSkillForTarget(entry, target) {
  const tempRoot = await fs.mkdtemp(path.join(os.tmpdir(), `agent-skills-installer-${target}-`));
  const preparedDir = path.join(tempRoot, entry.id);

  await fs.mkdir(preparedDir, { recursive: true });
  await copyFilteredSkillSource(entry.resolvedSourceDir, preparedDir, target);

  return {
    ...entry,
    resolvedSourceDir: preparedDir,
    cleanupPath: tempRoot
  };
}

async function copyFilteredSkillSource(sourceDir, destinationDir, target) {
  const allowedNames = getAllowedTopLevelNames(target);
  const entries = await fs.readdir(sourceDir, { withFileTypes: true });

  for (const entry of entries) {
    if (IGNORED_SOURCE_NAMES.has(entry.name)) {
      continue;
    }

    if (allowedNames && !allowedNames.has(entry.name)) {
      continue;
    }

    const sourcePath = path.join(sourceDir, entry.name);
    const destinationPath = path.join(destinationDir, entry.name);
    const stat = await fs.lstat(sourcePath);

    if (stat.isSymbolicLink()) {
      throw new Error(`Symlinks are not supported: ${sourcePath}`);
    }

    if (stat.isDirectory()) {
      await copyDirectoryStrict(sourcePath, destinationPath);
      continue;
    }

    if (!stat.isFile()) {
      throw new Error(`Unsupported file type: ${sourcePath}`);
    }

    await fs.copyFile(sourcePath, destinationPath);
    await fs.chmod(destinationPath, stat.mode);
  }
}

function getAllowedTopLevelNames(target) {
  if (!Object.hasOwn(TARGET_ALLOWED_TOP_LEVEL_NAMES, target)) {
    throw usageError(`Unsupported target "${target}".`);
  }

  return TARGET_ALLOWED_TOP_LEVEL_NAMES[target];
}

function isRelativeFileAllowed(relativeFile, allowedNames) {
  const topLevelName = relativeFile.split("/")[0];

  if (IGNORED_SOURCE_NAMES.has(topLevelName)) {
    return false;
  }

  return allowedNames == null ? true : allowedNames.has(topLevelName);
}
