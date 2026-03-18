import { TARGETS } from "./constants.js";
import { getTargetAdapter } from "./adapters.js";
import { getSkillMap, getSkillsForTarget } from "./catalog.js";
import {
  acquireInstallLock,
  cleanupStaleTemps,
  ensureWritableInstallRoot,
  installPreparedSkillsAtomically
} from "./install-core.js";
import { configError, toCliError, usageError } from "./errors.js";

export function buildInstallRequestsForDirectCommand(catalog, target) {
  if (target === "all") {
    return TARGETS.map((entryTarget) => ({
      target: entryTarget,
      selectedSkillIds: getSkillsForTarget(catalog, entryTarget, { enabledOnly: true }).map(
        (skill) => skill.id
      )
    }));
  }

  return [
    {
      target,
      selectedSkillIds: getSkillsForTarget(catalog, target, { enabledOnly: true }).map(
        (skill) => skill.id
      )
    }
  ];
}

export async function installRequests({
  catalog,
  requests,
  scope,
  cwd,
  dryRun,
  force,
  packageVersion
}) {
  const results = [];

  for (const request of requests) {
    const adapter = getTargetAdapter(request.target);

    try {
      const result = await installTarget({
        catalog,
        target: request.target,
        selectedSkillIds: request.selectedSkillIds,
        scope,
        cwd,
        dryRun,
        force,
        packageVersion
      });
      results.push(result);
    } catch (error) {
      const installRoot = await adapter.resolveInstallRoot(scope, cwd).catch(() => undefined);
      results.push({
        target: request.target,
        scope,
        installRoot,
        skills: request.selectedSkillIds ?? [],
        installed: [],
        skipped: [],
        failed: request.selectedSkillIds ?? [],
        ok: false,
        error
      });
    }
  }

  return results;
}

export async function installTarget({
  catalog,
  target,
  selectedSkillIds,
  scope,
  cwd,
  dryRun,
  force,
  packageVersion
}) {
  const adapter = getTargetAdapter(target);
  const installRoot = await adapter.resolveInstallRoot(scope, cwd);
  const skills = resolveRequestedSkills(catalog, target, selectedSkillIds);

  const plan = {
    target,
    scope,
    installRoot,
    skills: skills.map((skill) => skill.id)
  };

  if (dryRun) {
    return {
      ...plan,
      installed: [],
      skipped: [],
      failed: [],
      ok: true,
      dryRun: true
    };
  }

  await ensureWritableInstallRoot(installRoot);
  const releaseLock = await acquireInstallLock(installRoot);

  try {
    await cleanupStaleTemps(installRoot);
    const preparedSkills = [];

    for (const skill of skills) {
      preparedSkills.push(await adapter.prepareSkill(skill));
    }

    try {
      const installed = await installPreparedSkillsAtomically({
        entries: preparedSkills,
        installRoot,
        target,
        scope,
        packageVersion,
        force
      });

      return {
        ...plan,
        installed,
        skipped: [],
        failed: [],
        ok: true
      };
    } catch (error) {
      return {
        ...plan,
        installed: [],
        skipped: [],
        failed: resolveFailedSkillIds(plan.skills, error),
        ok: false,
        error
      };
    }
  } finally {
    await releaseLock();
  }
}

function resolveRequestedSkills(catalog, target, selectedSkillIds) {
  const supportedSkills = getSkillsForTarget(catalog, target);
  if (selectedSkillIds == null) {
    return supportedSkills.filter((skill) => skill.enabledByDefault);
  }

  const skillMap = getSkillMap(catalog);
  const resolved = [];

  for (const skillId of selectedSkillIds) {
    const skill = skillMap.get(skillId);
    if (!skill) {
      throw configError(`Unknown skill "${skillId}" requested for "${target}".`);
    }

    if (!skill.targets.includes(target)) {
      throw usageError(`Skill "${skillId}" is not supported for target "${target}".`);
    }

    resolved.push(skill);
  }

  return resolved;
}

export function summarizeExitCode(results) {
  if (results.every((result) => result.ok)) {
    return 0;
  }

  if (results.length === 1) {
    return toCliError(results[0].error).exitCode;
  }

  return 1;
}

export function formatSummary(result) {
  return [
    "[agent-skills-installer] install summary",
    `- target: ${result.target}`,
    `- scope: ${result.scope}`,
    `- root: ${result.installRoot ?? "unresolved"}`,
    `- selected: ${result.skills && result.skills.length > 0 ? result.skills.join(", ") : "none"}`,
    `- installed: ${result.dryRun ? "none (dry-run)" : result.installed.length === 0 ? "none" : result.installed.join(", ")}`,
    `- skipped: ${result.skipped.length === 0 ? "none" : result.skipped.join(", ")}`,
    `- failed: ${result.failed.length === 0 ? "none" : result.failed.join(", ")}`,
    "- note: tool restart may be required to load new skills"
  ].join("\n");
}

function resolveFailedSkillIds(requestedSkillIds, error) {
  if (
    error &&
    typeof error === "object" &&
    "failedSkillId" in error &&
    typeof error.failedSkillId === "string"
  ) {
    return [error.failedSkillId];
  }

  return requestedSkillIds;
}
