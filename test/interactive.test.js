import assert from "node:assert/strict";
import { PassThrough } from "node:stream";
import test from "node:test";
import { loadCatalog } from "../src/lib/catalog.js";
import { runInteractiveWizard } from "../src/lib/interactive.js";

test("interactive wizard는 선택값을 설치 요청 구조로 변환한다", async () => {
  const catalog = await loadCatalog();
  const stdin = new FakeTty();
  const stdout = new PassThrough();
  const outputChunks = [];

  stdout.isTTY = true;
  stdout.on("data", (chunk) => {
    outputChunks.push(chunk.toString("utf8"));
  });

  const wizardPromise = runInteractiveWizard(catalog, { stdin, stdout });

  await playKeySequence(stdin, [
    "\r",
    "\u001b[B",
    "\r",
    "\r",
    "\r"
  ]);

  const selection = await wizardPromise;

  assert.deepEqual(selection, {
    scope: "project",
    requests: [
      {
        target: "codex",
        selectedSkillIds: ["instruction-only", "script-backed"]
      }
    ]
  });

  const renderedOutput = outputChunks.join("");
  assert.match(renderedOutput, /Select a target agent/);
  assert.match(renderedOutput, /Select an install scope/);
  assert.match(renderedOutput, /Confirm installation/);
  assert.match(renderedOutput, /codex: instruction-only, script-backed/);
});

class FakeTty extends PassThrough {
  constructor() {
    super();
    this.isTTY = true;
    this.isRaw = false;
  }

  setRawMode(value) {
    this.isRaw = value;
  }
}

async function playKeySequence(stdin, sequence) {
  await waitForTurn();

  for (const key of sequence) {
    stdin.write(key);
    await waitForTurn();
  }
}

async function waitForTurn() {
  await new Promise((resolve) => {
    setTimeout(resolve, 0);
  });
}
