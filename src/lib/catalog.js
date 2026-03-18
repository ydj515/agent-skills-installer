import fs from "node:fs/promises";
import path from "node:path";
import {
  CATALOG_SCHEMA_VERSION,
  PACKAGE_ROOT,
  TARGETS
} from "./constants.js";
import { configError } from "./errors.js";
import { pathExists } from "./utils.js";

const CATALOG_PATH = path.join(PACKAGE_ROOT, "catalog.json");

export async function loadCatalog() {
  let rawCatalog;

  try {
    const contents = await fs.readFile(CATALOG_PATH, "utf8");
    rawCatalog = JSON.parse(contents);
  } catch (error) {
    throw configError(`Failed to read catalog at "${CATALOG_PATH}".`, error);
  }

  return validateCatalog(rawCatalog);
}

export function validateCatalog(rawCatalog) {
  if (!rawCatalog || typeof rawCatalog !== "object") {
    throw configError("Catalog root must be an object.");
  }

  if (rawCatalog.schemaVersion !== CATALOG_SCHEMA_VERSION) {
    throw configError(
      `Unsupported catalog schemaVersion "${rawCatalog.schemaVersion}". Expected "${CATALOG_SCHEMA_VERSION}".`
    );
  }

  if (!Array.isArray(rawCatalog.skills) || rawCatalog.skills.length === 0) {
    throw configError("Catalog must contain a non-empty skills array.");
  }

  const seenIds = new Set();
  const skills = rawCatalog.skills.map((skill) => normalizeSkillEntry(skill, seenIds));

  return {
    schemaVersion: rawCatalog.schemaVersion,
    skills
  };
}

function normalizeSkillEntry(skill, seenIds) {
  if (!skill || typeof skill !== "object") {
    throw configError("Each skill entry must be an object.");
  }

  const { id, version, sourceDir, targets, enabledByDefault } = skill;

  if (typeof id !== "string" || id.length === 0) {
    throw configError("Each skill entry must have a non-empty string id.");
  }

  if (seenIds.has(id)) {
    throw configError(`Duplicate skill id "${id}" found in catalog.`);
  }
  seenIds.add(id);

  if (typeof version !== "string" || version.length === 0) {
    throw configError(`Skill "${id}" must have a non-empty string version.`);
  }

  if (typeof sourceDir !== "string" || sourceDir.length === 0) {
    throw configError(`Skill "${id}" must have a non-empty string sourceDir.`);
  }

  if (path.isAbsolute(sourceDir) || sourceDir.split(/[\\/]+/).includes("..")) {
    throw configError(`Skill "${id}" sourceDir must stay inside the package root.`);
  }

  if (!Array.isArray(targets) || targets.length === 0) {
    throw configError(`Skill "${id}" must declare at least one target.`);
  }

  for (const target of targets) {
    if (!TARGETS.includes(target)) {
      throw configError(`Skill "${id}" has unsupported target "${target}".`);
    }
  }

  if (typeof enabledByDefault !== "boolean") {
    throw configError(`Skill "${id}" must declare enabledByDefault as a boolean.`);
  }

  const resolvedSourceDir = path.resolve(PACKAGE_ROOT, sourceDir);
  if (!resolvedSourceDir.startsWith(PACKAGE_ROOT)) {
    throw configError(`Skill "${id}" sourceDir escapes the package root.`);
  }

  return {
    id,
    version,
    sourceDir,
    resolvedSourceDir,
    targets: [...targets],
    enabledByDefault
  };
}

export function getSkillsForTarget(catalog, target, { enabledOnly = false } = {}) {
  return catalog.skills.filter((skill) => {
    if (!skill.targets.includes(target)) {
      return false;
    }

    return enabledOnly ? skill.enabledByDefault : true;
  });
}

export function getSkillMap(catalog) {
  return new Map(catalog.skills.map((skill) => [skill.id, skill]));
}

export async function assertCatalogSourcesExist(catalog) {
  for (const skill of catalog.skills) {
    if (!(await pathExists(skill.resolvedSourceDir))) {
      throw configError(`Catalog sourceDir for "${skill.id}" does not exist: "${skill.sourceDir}".`);
    }
  }
}
