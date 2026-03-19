import fs from "node:fs/promises";
import path from "node:path";
import { getTargetAdapter } from "./adapters.js";
import { getSkillsForTarget, resolveSkillsForTarget } from "./catalog.js";
import {
  MARKER_FILE,
  MARKER_SCHEMA_VERSION,
  PACKAGE_NAME,
  TARGETS,
  TEMP_ROOT_DIR
} from "./constants.js";
import { markerInvalidError } from "./errors.js";
import {
  acquireInstallLock,
  cleanupStaleTemps,
  ensureWritableInstallRoot,
  removeManagedSkillsAtomically
} from "./install-core.js";
import { installTarget } from "./install.js";
import { formatList, pathExists, readJsonFile } from "./utils.js";

export async function listTargets({
  catalog,
  target,
  scope,
  cwd,
  selection
}) {
  return runPerTarget({
    action: "list",
    target,
    scope,
    cwd,
    callback: (entryTarget) => listTarget({ catalog, target: entryTarget, scope, cwd, selection })
  });
}

export async function removeTargets({
  catalog,
  target,
  scope,
  cwd,
  dryRun,
  selection
}) {
  return runPerTarget({
    action: "remove",
    target,
    scope,
    cwd,
    callback: (entryTarget) => removeTarget({ catalog, target: entryTarget, scope, cwd, dryRun, selection })
  });
}

export async function updateTargets({
  catalog,
  target,
  scope,
  cwd,
  dryRun,
  packageVersion,
  selection
}) {
  return runPerTarget({
    action: "update",
    target,
    scope,
    cwd,
    callback: (entryTarget) =>
      updateTarget({
        catalog,
        target: entryTarget,
        scope,
        cwd,
        dryRun,
        packageVersion,
        selection
      })
  });
}

export function formatManageSummary(result) {
  switch (result.action) {
    case "list":
      return formatListSummary(result);
    case "remove":
      return formatRemoveSummary(result);
    case "update":
      return formatUpdateSummary(result);
    default:
      return "";
  }
}

async function listTarget({ catalog, target, scope, cwd, selection }) {
  const adapter = getTargetAdapter(target);
  const installRoot = await adapter.resolveInstallRoot(scope, cwd);
  const skills = resolveSkillsForTarget(catalog, target, selection);
  const knownSkillIds = new Set(getSkillsForTarget(catalog, target).map((skill) => skill.id));
  const entries = [];
  const installed = [];
  const available = [];
  const conflicts = [];

  for (const skill of skills) {
    const state = await inspectSkillState({ installRoot, target, scope, skill });
    entries.push(state);

    if (state.status === "installed") {
      installed.push(skill.id);
      continue;
    }

    if (state.status === "available") {
      available.push(skill.id);
      continue;
    }

    conflicts.push(skill.id);
  }

  return {
    action: "list",
    target,
    scope,
    installRoot,
    skills: skills.map((skill) => skill.id),
    entries,
    installed,
    available,
    conflicts,
    unmanaged: await findUnmanagedDirectories(installRoot, knownSkillIds),
    skipped: [],
    failed: [],
    ok: true
  };
}

async function removeTarget({ catalog, target, scope, cwd, dryRun, selection }) {
  const adapter = getTargetAdapter(target);
  const installRoot = await adapter.resolveInstallRoot(scope, cwd);
  const skills = resolveSkillsForTarget(catalog, target, selection);
  const removable = [];
  const skipped = [];

  for (const skill of skills) {
    const state = await inspectSkillState({ installRoot, target, scope, skill });
    if (state.status === "available") {
      skipped.push(skill.id);
      continue;
    }

    if (state.status === "installed") {
      removable.push(skill);
      continue;
    }

    throw withFailedSkillId(markerInvalidError(state.skillDir), skill.id);
  }

  if (dryRun || removable.length === 0) {
    return {
      action: "remove",
      target,
      scope,
      installRoot,
      skills: skills.map((skill) => skill.id),
      removed: [],
      skipped,
      failed: [],
      ok: true,
      dryRun
    };
  }

  await ensureWritableInstallRoot(installRoot);
  const releaseLock = await acquireInstallLock(installRoot);

  try {
    await cleanupStaleTemps(installRoot);
    const removed = await removeManagedSkillsAtomically({
      entries: removable,
      installRoot,
      target,
      scope
    });

    return {
      action: "remove",
      target,
      scope,
      installRoot,
      skills: skills.map((skill) => skill.id),
      removed,
      skipped,
      failed: [],
      ok: true
    };
  } finally {
    await releaseLock();
  }
}

async function updateTarget({
  catalog,
  target,
  scope,
  cwd,
  dryRun,
  packageVersion,
  selection
}) {
  const adapter = getTargetAdapter(target);
  const installRoot = await adapter.resolveInstallRoot(scope, cwd);
  const skills = resolveSkillsForTarget(catalog, target, selection);
  const updatableSkillIds = [];
  const skipped = [];

  for (const skill of skills) {
    const state = await inspectSkillState({ installRoot, target, scope, skill });
    if (state.status === "available") {
      skipped.push(skill.id);
      continue;
    }

    if (state.status === "installed") {
      updatableSkillIds.push(skill.id);
      continue;
    }

    throw withFailedSkillId(markerInvalidError(state.skillDir), skill.id);
  }

  if (updatableSkillIds.length === 0) {
    return {
      action: "update",
      target,
      scope,
      installRoot,
      skills: skills.map((skill) => skill.id),
      updated: [],
      skipped,
      failed: [],
      ok: true,
      dryRun
    };
  }

  const installResult = await installTarget({
    catalog,
    target,
    selectedSkillIds: updatableSkillIds,
    scope,
    cwd,
    dryRun,
    force: true,
    packageVersion
  });

  return {
    action: "update",
    target,
    scope,
    installRoot,
    skills: skills.map((skill) => skill.id),
    updated: installResult.installed,
    skipped,
    failed: installResult.failed,
    ok: installResult.ok,
    dryRun,
    error: installResult.error
  };
}

async function runPerTarget({ action, target, scope, cwd, callback }) {
  const results = [];

  for (const entryTarget of target === "all" ? TARGETS : [target]) {
    const adapter = getTargetAdapter(entryTarget);

    try {
      results.push(await callback(entryTarget));
    } catch (error) {
      results.push({
        action,
        target: entryTarget,
        scope,
        installRoot: await adapter.resolveInstallRoot(scope, cwd).catch(() => undefined),
        skills: [],
        installed: [],
        available: [],
        conflicts: [],
        unmanaged: [],
        entries: [],
        skipped: [],
        failed: [],
        ok: false,
        error
      });
    }
  }

  return results;
}

function formatListSummary(result) {
  const lines = [
    "[agent-skills-installer] list summary",
    `- target: ${result.target}`,
    `- scope: ${result.scope}`,
    `- root: ${result.installRoot ?? "unresolved"}`,
    `- selected: ${formatList(result.skills ?? [])}`,
    `- installed: ${formatList(result.installed ?? [])}`,
    `- available: ${formatList(result.available ?? [])}`,
    `- unmanaged-conflicts: ${formatList(result.conflicts ?? [])}`,
    `- extra-directories: ${formatList(result.unmanaged ?? [])}`
  ];

  for (const entry of result.entries ?? []) {
    lines.push(
      `- skill: ${entry.id} | status: ${entry.status} | default: ${entry.enabledByDefault ? "yes" : "no"} | groups: ${formatList(entry.groups)} | tags: ${formatList(entry.tags)}`
    );
  }

  return lines.join("\n");
}

function formatRemoveSummary(result) {
  return [
    "[agent-skills-installer] remove summary",
    `- target: ${result.target}`,
    `- scope: ${result.scope}`,
    `- root: ${result.installRoot ?? "unresolved"}`,
    `- selected: ${formatList(result.skills ?? [])}`,
    `- removed: ${result.dryRun ? "none (dry-run)" : formatList(result.removed ?? [])}`,
    `- skipped: ${formatList(result.skipped ?? [])}`,
    `- failed: ${formatList(result.failed ?? [])}`
  ].join("\n");
}

function formatUpdateSummary(result) {
  return [
    "[agent-skills-installer] update summary",
    `- target: ${result.target}`,
    `- scope: ${result.scope}`,
    `- root: ${result.installRoot ?? "unresolved"}`,
    `- selected: ${formatList(result.skills ?? [])}`,
    `- updated: ${result.dryRun ? "none (dry-run)" : formatList(result.updated ?? [])}`,
    `- skipped: ${formatList(result.skipped ?? [])}`,
    `- failed: ${formatList(result.failed ?? [])}`,
    "- note: tool restart may be required to load updated skills"
  ].join("\n");
}

async function inspectSkillState({ installRoot, target, scope, skill }) {
  const skillDir = path.join(installRoot, skill.id);
  if (!(await pathExists(skillDir))) {
    return {
      ...skill,
      skillDir,
      status: "available"
    };
  }

  const marker = await readMarker(skillDir);
  if (marker && markerMatches(marker, skill.id, target, scope)) {
    return {
      ...skill,
      skillDir,
      status: "installed"
    };
  }

  return {
    ...skill,
    skillDir,
    status: "unmanaged-conflict"
  };
}

async function readMarker(skillDir) {
  const markerPath = path.join(skillDir, MARKER_FILE);
  if (!(await pathExists(markerPath))) {
    return null;
  }

  try {
    return await readJsonFile(markerPath);
  } catch {
    return null;
  }
}

function markerMatches(marker, skillId, target, scope) {
  return (
    marker &&
    typeof marker === "object" &&
    marker.schemaVersion === MARKER_SCHEMA_VERSION &&
    marker.packageName === PACKAGE_NAME &&
    marker.skillId === skillId &&
    marker.installedFor === target &&
    marker.scope === scope
  );
}

async function findUnmanagedDirectories(installRoot, knownSkillIds) {
  if (!(await pathExists(installRoot))) {
    return [];
  }

  const entries = await fs.readdir(installRoot, { withFileTypes: true });
  const unmanaged = [];

  for (const entry of entries) {
    if (!entry.isDirectory()) {
      continue;
    }

    if (entry.name === TEMP_ROOT_DIR) {
      continue;
    }

    if (knownSkillIds.has(entry.name)) {
      continue;
    }

    unmanaged.push(entry.name);
  }

  return unmanaged.sort();
}

function withFailedSkillId(error, failedSkillId) {
  if (!failedSkillId || !error || typeof error !== "object") {
    return error;
  }

  if (!("failedSkillId" in error)) {
    Object.defineProperty(error, "failedSkillId", {
      value: failedSkillId,
      enumerable: false,
      configurable: true,
      writable: true
    });
  }

  return error;
}
