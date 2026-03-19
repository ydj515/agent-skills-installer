import fs from "node:fs/promises";
import path from "node:path";
import {
  CATALOG_SCHEMA_VERSION,
  PACKAGE_ROOT,
  TARGETS
} from "./constants.js";
import { configError, usageError } from "./errors.js";
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

  const {
    id,
    version,
    sourceDir,
    targets,
    enabledByDefault,
    title,
    description,
    tags,
    groups,
    hidden,
    deprecated
  } = skill;

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

  if (title != null && (typeof title !== "string" || title.trim().length === 0)) {
    throw configError(`Skill "${id}" title must be a non-empty string when provided.`);
  }

  if (description != null && typeof description !== "string") {
    throw configError(`Skill "${id}" description must be a string when provided.`);
  }

  if (hidden != null && typeof hidden !== "boolean") {
    throw configError(`Skill "${id}" hidden must be a boolean when provided.`);
  }

  if (deprecated != null && typeof deprecated !== "boolean") {
    throw configError(`Skill "${id}" deprecated must be a boolean when provided.`);
  }

  const resolvedSourceDir = path.resolve(PACKAGE_ROOT, sourceDir);
  if (!resolvedSourceDir.startsWith(PACKAGE_ROOT)) {
    throw configError(`Skill "${id}" sourceDir escapes the package root.`);
  }

  return {
    id,
    title: title?.trim() ?? id,
    description: description?.trim() ?? "",
    version,
    sourceDir,
    resolvedSourceDir,
    targets: [...targets],
    enabledByDefault,
    tags: normalizeStringList(tags, `Skill "${id}" tags`),
    groups: normalizeStringList(groups, `Skill "${id}" groups`),
    hidden: hidden ?? false,
    deprecated: deprecated ?? false
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

export function resolveSkillsForTarget(catalog, target, options = {}) {
  const {
    selectedSkillIds,
    enabledOnly = false,
    tag,
    group,
    includeHidden = false,
    includeDeprecated = false,
    ignoreUnsupported = false
  } = options;

  if (selectedSkillIds != null) {
    return resolveExplicitSkills(catalog, target, selectedSkillIds, {
      includeHidden,
      includeDeprecated,
      ignoreUnsupported
    });
  }

  let skills = getSkillsForTarget(catalog, target);
  skills = applyVisibilityFilters(skills, { includeHidden, includeDeprecated });

  if (tag) {
    skills = skills.filter((skill) => skill.tags.includes(tag));
  }

  if (group) {
    skills = skills.filter((skill) => skill.groups.includes(group));
  }

  if (enabledOnly) {
    skills = skills.filter((skill) => skill.enabledByDefault);
  }

  return skills;
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

function resolveExplicitSkills(catalog, target, selectedSkillIds, visibility) {
  const skillMap = getSkillMap(catalog);
  const resolved = [];
  const seenIds = new Set();

  for (const skillId of selectedSkillIds) {
    if (seenIds.has(skillId)) {
      continue;
    }
    seenIds.add(skillId);

    const skill = skillMap.get(skillId);
    if (!skill) {
      throw configError(`Unknown skill "${skillId}" requested for "${target}".`);
    }

    if (!skill.targets.includes(target)) {
      if (visibility.ignoreUnsupported) {
        continue;
      }
      throw usageError(`Skill "${skillId}" is not supported for target "${target}".`);
    }

    if (skill.hidden && !visibility.includeHidden) {
      throw usageError(
        `Skill "${skillId}" is hidden for target "${target}". Re-run with --include-hidden to select it explicitly.`
      );
    }

    if (skill.deprecated && !visibility.includeDeprecated) {
      throw usageError(
        `Skill "${skillId}" is deprecated for target "${target}". Re-run with --include-deprecated to select it explicitly.`
      );
    }

    resolved.push(skill);
  }

  return resolved;
}

function applyVisibilityFilters(skills, { includeHidden, includeDeprecated }) {
  return skills.filter((skill) => {
    if (!includeHidden && skill.hidden) {
      return false;
    }

    if (!includeDeprecated && skill.deprecated) {
      return false;
    }

    return true;
  });
}

function normalizeStringList(values, label) {
  if (values == null) {
    return [];
  }

  if (!Array.isArray(values)) {
    throw configError(`${label} must be an array of non-empty strings when provided.`);
  }

  const normalized = [];
  const seen = new Set();

  for (const value of values) {
    if (typeof value !== "string" || value.trim().length === 0) {
      throw configError(`${label} must contain only non-empty strings.`);
    }

    const trimmed = value.trim();
    if (!seen.has(trimmed)) {
      seen.add(trimmed);
      normalized.push(trimmed);
    }
  }

  return normalized;
}
