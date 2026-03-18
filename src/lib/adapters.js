import os from "node:os";
import path from "node:path";
import { TARGETS } from "./constants.js";
import { usageError } from "./errors.js";
import { pathExists } from "./utils.js";
import { installPreparedSkill } from "./install-core.js";

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
      return entry;
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
        return path.join(cwd, ".agents", "skills");
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

  const dotCodexSkills = path.join(homeDir, ".codex", "skills");
  if (await pathExists(dotCodexSkills)) {
    return dotCodexSkills;
  }

  return path.join(homeDir, ".agents", "skills");
}
