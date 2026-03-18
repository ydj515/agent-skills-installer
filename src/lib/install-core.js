import fs from "node:fs/promises";
import path from "node:path";
import {
  LOCK_FILE,
  MARKER_FILE,
  MARKER_SCHEMA_VERSION,
  PACKAGE_NAME,
  STALE_WINDOW_MS,
  TEMP_META_FILE,
  TEMP_ROOT_DIR
} from "./constants.js";
import {
  installError,
  lockConflictError,
  markerInvalidError,
  permissionError,
  safetyError
} from "./errors.js";
import {
  copyDirectoryStrict,
  isProcessAlive,
  pathExists,
  readJsonFile,
  removePath,
  writeJsonFile
} from "./utils.js";

export async function ensureWritableInstallRoot(installRoot) {
  try {
    await fs.mkdir(installRoot, { recursive: true });
    const probePath = path.join(installRoot, `.agent-skills-installer-probe-${process.pid}`);
    const handle = await fs.open(probePath, "w");
    await handle.close();
    await fs.rm(probePath, { force: true });
  } catch (error) {
    if (
      error &&
      typeof error === "object" &&
      "code" in error &&
      (error.code === "EACCES" || error.code === "EPERM")
    ) {
      throw permissionError(installRoot);
    }

    throw installError(`Failed to prepare install root "${installRoot}".`, error);
  }
}

export async function acquireInstallLock(installRoot) {
  const lockPath = path.join(installRoot, LOCK_FILE);
  const metadata = {
    pid: process.pid,
    startedAt: new Date().toISOString()
  };

  try {
    const handle = await fs.open(lockPath, "wx");
    await handle.writeFile(`${JSON.stringify(metadata, null, 2)}\n`, "utf8");
    await handle.close();
  } catch (error) {
    if (!error || typeof error !== "object" || !("code" in error) || error.code !== "EEXIST") {
      throw installError(`Failed to create lock file "${lockPath}".`, error);
    }

    const stale = await tryRecoverStaleLock(lockPath);
    if (!stale) {
      throw lockConflictError(installRoot);
    }

    const retryHandle = await fs.open(lockPath, "wx");
    await retryHandle.writeFile(`${JSON.stringify(metadata, null, 2)}\n`, "utf8");
    await retryHandle.close();
  }

  return async function releaseLock() {
    await fs.rm(lockPath, { force: true });
  };
}

async function tryRecoverStaleLock(lockPath) {
  let metadata;

  try {
    metadata = await readJsonFile(lockPath);
  } catch (error) {
    if (await isFreshLockFile(lockPath)) {
      return false;
    }

    throw safetyError(`Lock metadata is corrupted: "${lockPath}". Remove it manually and retry.`, error);
  }

  if (
    !metadata ||
    typeof metadata !== "object" ||
    !Number.isInteger(metadata.pid) ||
    typeof metadata.startedAt !== "string"
  ) {
    if (await isFreshLockFile(lockPath)) {
      return false;
    }

    throw safetyError(`Lock metadata is incomplete: "${lockPath}". Remove it manually and retry.`);
  }

  const startedAt = Date.parse(metadata.startedAt);
  if (!Number.isFinite(startedAt)) {
    throw safetyError(`Lock metadata has an invalid startedAt timestamp: "${lockPath}".`);
  }

  const stale = !isProcessAlive(metadata.pid) && Date.now() - startedAt >= STALE_WINDOW_MS;
  if (!stale) {
    return false;
  }

  await fs.rm(lockPath, { force: true });
  return true;
}

async function isFreshLockFile(lockPath) {
  try {
    const stat = await fs.stat(lockPath);
    return Date.now() - stat.mtimeMs < 2000;
  } catch {
    return false;
  }
}

export async function cleanupStaleTemps(installRoot) {
  const tempRoot = path.join(installRoot, TEMP_ROOT_DIR);
  if (!(await pathExists(tempRoot))) {
    return;
  }

  const entries = await fs.readdir(tempRoot, { withFileTypes: true });
  for (const entry of entries) {
    if (!entry.name.startsWith("tmp-")) {
      continue;
    }

    const tempPath = path.join(tempRoot, entry.name);
    const entryStat = await fs.lstat(tempPath);
    if (entryStat.isSymbolicLink()) {
      throw safetyError(`Refusing to inspect symlink temp entry "${tempPath}".`);
    }

    if (!entryStat.isDirectory()) {
      continue;
    }

    const metaPath = path.join(tempPath, TEMP_META_FILE);
    if (!(await pathExists(metaPath))) {
      continue;
    }

    let metadata;
    try {
      metadata = await readJsonFile(metaPath);
    } catch {
      continue;
    }

    const startedAt = Date.parse(metadata.startedAt);
    if (!Number.isFinite(startedAt) || isProcessAlive(metadata.pid)) {
      continue;
    }

    if (Date.now() - startedAt < STALE_WINDOW_MS) {
      continue;
    }

    await removePath(tempPath);
  }
}

export async function installPreparedSkillsAtomically({
  entries,
  installRoot,
  target,
  scope,
  packageVersion,
  force
}) {
  const sessionTimestamp = Date.now();
  const tempRoot = path.join(installRoot, TEMP_ROOT_DIR);
  const sessionDir = path.join(tempRoot, `tmp-${process.pid}-${sessionTimestamp}-batch`);
  const payloadRoot = path.join(sessionDir, "payload");
  const backupRoot = path.join(sessionDir, "backup");
  const tempMetaPath = path.join(sessionDir, TEMP_META_FILE);
  const stagedEntries = [];

  await fs.mkdir(payloadRoot, { recursive: true });
  await writeJsonFile(tempMetaPath, {
    pid: process.pid,
    startedAt: new Date().toISOString(),
    target,
    scope,
    skillIds: entries.map((entry) => entry.id)
  });

  try {
    for (const entry of entries) {
      const finalSkillDir = path.join(installRoot, entry.id);
      const stagedPayloadDir = path.join(payloadRoot, entry.id);

      await copyDirectoryStrict(entry.resolvedSourceDir, stagedPayloadDir);
      await writeJsonFile(path.join(stagedPayloadDir, MARKER_FILE), {
        schemaVersion: MARKER_SCHEMA_VERSION,
        packageName: PACKAGE_NAME,
        packageVersion,
        skillId: entry.id,
        installedFor: target,
        scope,
        installedAt: new Date().toISOString()
      });

      const existing = await inspectExistingSkill({
        entry,
        finalSkillDir,
        target,
        scope,
        force
      });

      stagedEntries.push({
        entry,
        finalSkillDir,
        stagedPayloadDir,
        backupDir: path.join(backupRoot, entry.id),
        needsBackup: existing.exists
      });
    }

    await commitStagedEntries(stagedEntries, backupRoot);
    await removePath(sessionDir);
    return entries.map((entry) => entry.id);
  } catch (error) {
    await removePath(sessionDir).catch(() => {});
    throw error;
  }
}

export async function installPreparedSkill({
  entry,
  installRoot,
  target,
  scope,
  packageVersion,
  force
}) {
  const finalSkillDir = path.join(installRoot, entry.id);
  const tempRoot = path.join(installRoot, TEMP_ROOT_DIR);
  const tempDir = path.join(tempRoot, `tmp-${process.pid}-${Date.now()}-${entry.id}`);
  const payloadDir = path.join(tempDir, "payload");
  const tempMetaPath = path.join(tempDir, TEMP_META_FILE);

  await fs.mkdir(payloadDir, { recursive: true });
  await writeJsonFile(tempMetaPath, {
    pid: process.pid,
    startedAt: new Date().toISOString(),
    skillId: entry.id
  });

  try {
    await copyDirectoryStrict(entry.resolvedSourceDir, payloadDir);
    await writeJsonFile(path.join(payloadDir, MARKER_FILE), {
      schemaVersion: MARKER_SCHEMA_VERSION,
      packageName: PACKAGE_NAME,
      packageVersion,
      skillId: entry.id,
      installedFor: target,
      scope,
      installedAt: new Date().toISOString()
    });

    const alreadyExists = await pathExists(finalSkillDir);
    if (!alreadyExists) {
      await fs.rename(payloadDir, finalSkillDir);
      await removePath(tempDir);
      return;
    }

    if (!force) {
      throw safetyError(
        `Skill directory "${finalSkillDir}" already exists. Re-run with --force only if it was installed by ${PACKAGE_NAME}.`
      );
    }

    const marker = await readMarkerOrThrow(finalSkillDir);
    assertMarkerMatches({ marker, targetDir: finalSkillDir, entry, target, scope });

    const backupDir = path.join(tempRoot, `backup-${process.pid}-${Date.now()}-${entry.id}`);
    await fs.rename(finalSkillDir, backupDir);

    try {
      await fs.rename(payloadDir, finalSkillDir);
      await removePath(backupDir);
      await removePath(tempDir);
    } catch (error) {
      if (await pathExists(backupDir)) {
        await fs.rename(backupDir, finalSkillDir).catch(() => {});
      }

      throw installError(`Failed to replace existing skill directory "${finalSkillDir}".`, error);
    }
  } catch (error) {
    await removePath(tempDir).catch(() => {});
    throw error;
  }
}

async function inspectExistingSkill({ entry, finalSkillDir, target, scope, force }) {
  const exists = await pathExists(finalSkillDir);
  if (!exists) {
    return { exists: false };
  }

  if (!force) {
    throw withFailedSkillId(
      safetyError(
        `Skill directory "${finalSkillDir}" already exists. Re-run with --force only if it was installed by ${PACKAGE_NAME}.`
      ),
      entry.id
    );
  }

  const marker = await readMarkerOrThrow(finalSkillDir).catch((error) => {
    throw withFailedSkillId(error, entry.id);
  });

  try {
    assertMarkerMatches({ marker, targetDir: finalSkillDir, entry, target, scope });
  } catch (error) {
    throw withFailedSkillId(error, entry.id);
  }

  return { exists: true };
}

async function commitStagedEntries(stagedEntries, backupRoot) {
  const committedEntries = [];

  try {
    for (const stagedEntry of stagedEntries) {
      if (stagedEntry.needsBackup) {
        await fs.mkdir(backupRoot, { recursive: true });
        await fs.rename(stagedEntry.finalSkillDir, stagedEntry.backupDir).catch((error) => {
          throw withFailedSkillId(
            installError(
              `Failed to back up existing skill directory "${stagedEntry.finalSkillDir}".`,
              error
            ),
            stagedEntry.entry.id
          );
        });
      }

      await fs.rename(stagedEntry.stagedPayloadDir, stagedEntry.finalSkillDir).catch((error) => {
        throw withFailedSkillId(
          installError(
            `Failed to move staged skill directory into "${stagedEntry.finalSkillDir}".`,
            error
          ),
          stagedEntry.entry.id
        );
      });

      committedEntries.push(stagedEntry);
    }

    if (await pathExists(backupRoot)) {
      await removePath(backupRoot);
    }
  } catch (error) {
    await rollbackCommittedEntries(committedEntries, stagedEntries).catch((rollbackError) => {
      throw withFailedSkillId(
        installError("Failed to roll back target installation after an error.", rollbackError),
        error && typeof error === "object" && "failedSkillId" in error ? error.failedSkillId : undefined
      );
    });

    throw error;
  }
}

async function rollbackCommittedEntries(committedEntries, stagedEntries) {
  for (const stagedEntry of [...stagedEntries].reverse()) {
    if (await pathExists(stagedEntry.finalSkillDir)) {
      await removePath(stagedEntry.finalSkillDir);
    }

    if (stagedEntry.needsBackup && (await pathExists(stagedEntry.backupDir))) {
      await fs.rename(stagedEntry.backupDir, stagedEntry.finalSkillDir);
    }
  }

  for (const stagedEntry of committedEntries) {
    if (await pathExists(stagedEntry.stagedPayloadDir)) {
      await removePath(stagedEntry.stagedPayloadDir);
    }
  }
}

async function readMarkerOrThrow(targetDir) {
  const markerPath = path.join(targetDir, MARKER_FILE);
  if (!(await pathExists(markerPath))) {
    throw markerInvalidError(targetDir);
  }

  try {
    return await readJsonFile(markerPath);
  } catch (error) {
    throw markerInvalidError(targetDir, error);
  }
}

function assertMarkerMatches({ marker, targetDir, entry, target, scope }) {
  if (
    !marker ||
    typeof marker !== "object" ||
    marker.schemaVersion !== MARKER_SCHEMA_VERSION ||
    marker.packageName !== PACKAGE_NAME ||
    marker.skillId !== entry.id ||
    marker.installedFor !== target ||
    marker.scope !== scope
  ) {
    throw markerInvalidError(targetDir);
  }
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
