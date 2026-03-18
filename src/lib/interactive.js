import readline from "node:readline";
import { TARGETS } from "./constants.js";
import { getSkillsForTarget } from "./catalog.js";
import { usageError } from "./errors.js";

const RESET = "\u001b[0m";
const INVERT = "\u001b[7m";

export async function runInteractiveWizard(catalog, io) {
  const promptIo = resolvePromptIo(io);
  const agent = await selectPrompt({
    message: "Select a target agent",
    items: TARGETS.concat("all").map((target) => ({
      label: target,
      value: target
    })),
    io: promptIo
  });

  const scope = await selectPrompt({
    message: "Select an install scope",
    items: [
      { label: "user", value: "user" },
      { label: "project", value: "project" }
    ],
    io: promptIo
  });

  const skillChoices = buildInteractiveSkillChoices(catalog, agent);
  const selectedValues = await checkboxPrompt({
    message: "Select skills to install",
    items: skillChoices.items,
    initialValues: skillChoices.initialValues,
    io: promptIo
  });

  const requests = agent === "all" ? buildRequestsForAll(selectedValues) : [{ target: agent, selectedSkillIds: selectedValues }];
  const summaryLines = buildSummaryLines(scope, requests);

  const confirmed = await confirmPrompt({
    message: `Confirm installation\n${summaryLines.map((line) => `  ${line}`).join("\n")}`
  }, promptIo);

  if (!confirmed) {
    return null;
  }

  return {
    scope,
    requests
  };
}

function buildInteractiveSkillChoices(catalog, agent) {
  if (agent !== "all") {
    const skills = getSkillsForTarget(catalog, agent);
    return {
      items: skills.map((skill) => ({
        label: skill.id,
        value: skill.id
      })),
      initialValues: skills.filter((skill) => skill.enabledByDefault).map((skill) => skill.id)
    };
  }

  const items = [];
  const initialValues = [];

  for (const target of TARGETS) {
    items.push({
      type: "separator",
      label: `[${target}]`
    });

    for (const skill of getSkillsForTarget(catalog, target)) {
      const value = `${target}:${skill.id}`;
      items.push({
        label: skill.id,
        value
      });

      if (skill.enabledByDefault) {
        initialValues.push(value);
      }
    }
  }

  return { items, initialValues };
}

function buildRequestsForAll(selectedValues) {
  const grouped = new Map();

  for (const target of TARGETS) {
    grouped.set(target, []);
  }

  for (const value of selectedValues) {
    const [target, skillId] = value.split(":");
    if (grouped.has(target) && skillId) {
      grouped.get(target).push(skillId);
    }
  }

  return TARGETS.map((target) => ({
    target,
    selectedSkillIds: grouped.get(target)
  }));
}

function buildSummaryLines(scope, requests) {
  const lines = [`scope: ${scope}`];
  for (const request of requests) {
    lines.push(
      `${request.target}: ${request.selectedSkillIds.length === 0 ? "none" : request.selectedSkillIds.join(", ")}`
    );
  }
  return lines;
}

async function selectPrompt({ message, items, io }) {
  return runKeypressPrompt({
    initialState: { cursor: 0 },
    io,
    render(state) {
      return [
        message,
        "Use Up/Down to move, Enter to confirm.",
        ...items.map((item, index) => {
          const active = index === state.cursor;
          const prefix = active ? `${INVERT}>${RESET}` : " ";
          const label = active ? `${INVERT}${item.label}${RESET}` : item.label;
          return `${prefix} ${label}`;
        })
      ];
    },
    onKeypress(state, key) {
      if (key.name === "up") {
        state.cursor = (state.cursor - 1 + items.length) % items.length;
        return undefined;
      }

      if (key.name === "down") {
        state.cursor = (state.cursor + 1) % items.length;
        return undefined;
      }

      if (key.name === "return") {
        return items[state.cursor].value;
      }

      return undefined;
    }
  });
}

async function checkboxPrompt({ message, items, initialValues, io }) {
  const selectableIndexes = items
    .map((item, index) => ({ item, index }))
    .filter(({ item }) => item.type !== "separator")
    .map(({ index }) => index);

  const selected = new Set(initialValues);
  return runKeypressPrompt({
    initialState: {
      cursor: selectableIndexes[0] ?? 0,
      hint: ""
    },
    io,
    render(state) {
      const lines = [
        `${message} (Space to toggle, Enter to confirm)`,
        "Use Up/Down to move, Space to toggle, Enter to confirm."
      ];

      for (const [index, item] of items.entries()) {
        if (item.type === "separator") {
          lines.push(`  ${item.label}`);
          continue;
        }

        const active = index === state.cursor;
        const checked = selected.has(item.value);
        const marker = checked ? "[x]" : "[ ]";
        const prefix = active ? `${INVERT}>${RESET}` : " ";
        const label = active ? `${INVERT}${item.label}${RESET}` : item.label;
        lines.push(`${prefix} ${marker} ${label}`);
      }

      if (state.hint) {
        lines.push(state.hint);
      }

      return lines;
    },
    onKeypress(state, key) {
      if (key.name === "up") {
        state.cursor = moveSelectable(selectableIndexes, state.cursor, -1);
        state.hint = "";
        return undefined;
      }

      if (key.name === "down") {
        state.cursor = moveSelectable(selectableIndexes, state.cursor, 1);
        state.hint = "";
        return undefined;
      }

      if (key.name === "space") {
        const current = items[state.cursor];
        if (current && current.type !== "separator") {
          if (selected.has(current.value)) {
            selected.delete(current.value);
          } else {
            selected.add(current.value);
          }
        }
        state.hint = "";
        return undefined;
      }

      if (key.name === "return") {
        if (selected.size === 0) {
          state.hint = "Select at least one skill before continuing.";
          return undefined;
        }

        return items
          .filter((item) => item.type !== "separator" && selected.has(item.value))
          .map((item) => item.value);
      }

      return undefined;
    }
  });
}

async function confirmPrompt({ message }, io) {
  const answer = await selectPrompt({
    message,
    items: [
      { label: "yes", value: true },
      { label: "no", value: false }
    ],
    io
  });

  return answer;
}

function moveSelectable(selectableIndexes, currentIndex, direction) {
  const position = selectableIndexes.indexOf(currentIndex);
  if (position === -1) {
    return selectableIndexes[0] ?? 0;
  }

  const next = (position + direction + selectableIndexes.length) % selectableIndexes.length;
  return selectableIndexes[next];
}

async function runKeypressPrompt({ initialState, render, onKeypress, io }) {
  const { stdin, stdout } = resolvePromptIo(io);
  const rl = readline.createInterface({
    input: stdin,
    output: stdout
  });

  readline.emitKeypressEvents(stdin, rl);
  const previousRawMode = stdin.isRaw;
  stdin.setRawMode(true);
  stdin.resume();
  stdin.setEncoding("utf8");

  let renderedLines = 0;
  const state = structuredClone(initialState);

  const repaint = () => {
    const lines = render(state);
    if (renderedLines > 0) {
      stdout.write(`\u001b[${renderedLines}A`);
      stdout.write("\u001b[J");
    }
    renderedLines = lines.length;
    stdout.write(`${lines.join("\n")}\n`);
  };

  return new Promise((resolve, reject) => {
    const cleanup = () => {
      stdin.removeListener("keypress", onPress);
      stdin.setRawMode(Boolean(previousRawMode));
      rl.close();
    };

    const onPress = (_value, key) => {
      if (key.sequence === "\u0003") {
        cleanup();
        reject(usageError("Interactive prompt cancelled by user."));
        return;
      }

      const result = onKeypress(state, key);
      repaint();

      if (result !== undefined) {
        cleanup();
        resolve(result);
      }
    };

    stdin.on("keypress", onPress);
    repaint();
  });
}

function resolvePromptIo(io) {
  return {
    stdin: io?.stdin ?? process.stdin,
    stdout: io?.stdout ?? process.stdout
  };
}
