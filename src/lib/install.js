import { TARGETS } from "./constants.js";
import { getTargetAdapter } from "./adapters.js";
import { resolveSkillsForTarget } from "./catalog.js";
import {
  acquireInstallLock,
  cleanupStaleTemps,
  ensureWritableInstallRoot,
  installPreparedSkillsAtomically
} from "./install-core.js";
import { toCliError } from "./errors.js";
import { formatList, removePath } from "./utils.js";

export function buildInstallRequestsForDirectCommand(catalog, target, selection = {}) {
  const useDefaults =
    selection.selectedSkillIds == null && !selection.tag && !selection.group;

  if (target === "all") {
    return TARGETS.map((entryTarget) => ({
      target: entryTarget,
      selectedSkillIds: resolveSkillsForTarget(catalog, entryTarget, {
        ...selection,
        enabledOnly: useDefaults
      }).map((skill) => skill.id)
    }));
  }

  return [
    {
      target,
      selectedSkillIds: resolveSkillsForTarget(catalog, target, {
        ...selection,
        enabledOnly: useDefaults
      }).map((skill) => skill.id)
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
        action: "install",
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
      action: "install",
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
  const preparedSkills = [];

  try {
    await cleanupStaleTemps(installRoot);

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
        action: "install",
        ...plan,
        installed,
        skipped: [],
        failed: [],
        ok: true
      };
    } catch (error) {
      return {
        action: "install",
        ...plan,
        installed: [],
        skipped: [],
        failed: resolveFailedSkillIds(plan.skills, error),
        ok: false,
        error
      };
    }
  } finally {
    await cleanupPreparedSkills(preparedSkills);
    await releaseLock();
  }
}

function resolveRequestedSkills(catalog, target, selectedSkillIds) {
  return resolveSkillsForTarget(catalog, target, {
    selectedSkillIds,
    enabledOnly: selectedSkillIds == null
  });
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
    `- selected: ${formatList(result.skills ?? [])}`,
    `- installed: ${result.dryRun ? "none (dry-run)" : formatList(result.installed ?? [])}`,
    `- skipped: ${formatList(result.skipped ?? [])}`,
    `- failed: ${formatList(result.failed ?? [])}`,
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

async function cleanupPreparedSkills(preparedSkills) {
  const cleanupTargets = new Set(
    preparedSkills
      .map((entry) => entry.cleanupPath)
      .filter((cleanupPath) => typeof cleanupPath === "string" && cleanupPath.length > 0)
  );

  await Promise.all(
    [...cleanupTargets].map(async (cleanupPath) => {
      await removePath(cleanupPath).catch(() => {});
    })
  );
}
