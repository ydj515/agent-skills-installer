#!/usr/bin/env node

import fs from "node:fs/promises";
import path from "node:path";
import { PACKAGE_ROOT, SCOPES, TARGETS } from "./lib/constants.js";
import { assertCatalogSourcesExist, loadCatalog } from "./lib/catalog.js";
import { interactiveTtyError, toCliError, usageError } from "./lib/errors.js";
import {
  buildInstallRequestsForDirectCommand,
  formatSummary,
  installRequests,
  summarizeExitCode
} from "./lib/install.js";
import { runInteractiveWizard } from "./lib/interactive.js";

async function main() {
  const packageVersion = await readPackageVersion();
  const catalog = await loadCatalog();
  await assertCatalogSourcesExist(catalog);

  const args = process.argv.slice(2);

  if (args.length === 0) {
    if (!process.stdin.isTTY || !process.stdout.isTTY) {
      throw interactiveTtyError();
    }

    const selection = await runInteractiveWizard(catalog);
    if (!selection) {
      process.stdout.write("[agent-skills-installer] Cancelled.\n");
      return 0;
    }

    const results = await installRequests({
      catalog,
      requests: selection.requests,
      scope: selection.scope,
      cwd: process.cwd(),
      dryRun: false,
      force: false,
      packageVersion
    });

    printResults(results);
    return summarizeExitCode(results);
  }

  if (args.includes("--help") || args.includes("-h")) {
    process.stdout.write(`${buildUsage()}\n`);
    return 0;
  }

  if (args[0] !== "install") {
    throw usageError(`Unknown command "${args[0]}".\n${buildUsage()}`);
  }

  const parsed = parseInstallArgs(args.slice(1));
  const requests = buildInstallRequestsForDirectCommand(catalog, parsed.target);
  const results = await installRequests({
    catalog,
    requests,
    scope: parsed.scope,
    cwd: parsed.cwd,
    dryRun: parsed.dryRun,
    force: parsed.force,
    packageVersion
  });

  printResults(results);
  return summarizeExitCode(results);
}

function parseInstallArgs(args) {
  const [target, ...rest] = args;
  if (!target) {
    throw usageError(`Missing install target.\n${buildUsage()}`);
  }

  if (target !== "all" && !TARGETS.includes(target)) {
    throw usageError(`Unsupported install target "${target}".\n${buildUsage()}`);
  }

  const parsed = {
    target,
    scope: "user",
    cwd: process.cwd(),
    dryRun: false,
    force: false
  };

  for (let index = 0; index < rest.length; index += 1) {
    const argument = rest[index];

    if (argument === "--scope") {
      const nextValue = rest[index + 1];
      if (!SCOPES.includes(nextValue)) {
        throw usageError(`Invalid value for --scope: "${nextValue}".`);
      }
      parsed.scope = nextValue;
      index += 1;
      continue;
    }

    if (argument === "--cwd") {
      const nextValue = rest[index + 1];
      if (!nextValue) {
        throw usageError("Missing value for --cwd.");
      }
      parsed.cwd = path.resolve(nextValue);
      index += 1;
      continue;
    }

    if (argument === "--dry-run") {
      parsed.dryRun = true;
      continue;
    }

    if (argument === "--force") {
      parsed.force = true;
      continue;
    }

    throw usageError(`Unknown option "${argument}".\n${buildUsage()}`);
  }

  return parsed;
}

function buildUsage() {
  return [
    "Usage:",
    "  npx agent-skills-installer",
    "  npx agent-skills-installer install <codex|claude|gemini|all> [--scope user|project] [--cwd <path>] [--dry-run] [--force]"
  ].join("\n");
}

function printResults(results) {
  for (const result of results) {
    process.stdout.write(`${formatSummary(result)}\n`);
    if (!result.ok && result.error) {
      const cliError = toCliError(result.error);
      process.stderr.write(`${cliError.message}\n`);
    }
  }
}

async function readPackageVersion() {
  const packageJsonPath = path.join(PACKAGE_ROOT, "package.json");
  const contents = await fs.readFile(packageJsonPath, "utf8");
  return JSON.parse(contents).version;
}

main()
  .then((exitCode) => {
    process.exitCode = exitCode;
  })
  .catch((error) => {
    const cliError = toCliError(error);
    process.stderr.write(`${cliError.message}\n`);
    process.exitCode = cliError.exitCode;
  });
