export function createBrowserDebugCliOptions(argv) {
  let optionError;

  function recordOptionError(message) {
    optionError ??= new Error(message);
  }

  function hasFlag(name) {
    return argv.includes(name);
  }

  function optionValue(name, fallback) {
    const prefix = `${name}=`;
    let value = fallback;
    for (let index = 0; index < argv.length; index += 1) {
      const arg = argv[index];
      if (arg.startsWith(prefix)) {
        const nextValue = arg.slice(prefix.length);
        if (!nextValue || nextValue.startsWith("--")) {
          recordOptionError(`${name} requires a value`);
        } else {
          value = nextValue;
        }
        continue;
      }
      if (arg === name) {
        const nextValue = argv[index + 1];
        if (!nextValue || nextValue.startsWith("--")) {
          recordOptionError(`${name} requires a value`);
        } else {
          value = nextValue;
          index += 1;
        }
      }
    }
    return value;
  }

  function optionNumber(name, fallback) {
    const rawValue = optionValue(name, String(fallback));
    const value = Number(rawValue);
    if (Number.isFinite(value)) return value;
    recordOptionError(`${name} requires a numeric value, got "${rawValue}"`);
    return fallback;
  }

  function optionIsMissingValue(index, arg) {
    if (arg.includes("=")) {
      const nextValue = arg.slice(arg.indexOf("=") + 1);
      return !nextValue || nextValue.startsWith("--");
    }
    const nextValue = argv[index + 1];
    return !nextValue || nextValue.startsWith("--");
  }

  const booleanOptions = new Set([
    "--allow-console-errors",
    "--allow-request-failures",
    "--capture-smoke",
    "--headed",
    "--help",
    "--keep-open",
    "--list-scenarios",
    "--no-trace",
    "--preserve-out",
  ]);
  const valueOptions = new Set(["--out", "--port", "--scenario", "--slow-mo"]);

  for (let index = 2; index < argv.length; index += 1) {
    const arg = argv[index];
    if (arg === "--") continue;
    if (!arg.startsWith("--")) {
      recordOptionError(`Unexpected browser debug argument "${arg}"`);
      continue;
    }
    const optionName = arg.includes("=") ? arg.slice(0, arg.indexOf("=")) : arg;
    if (booleanOptions.has(optionName)) {
      if (arg.includes("=")) recordOptionError(`${optionName} does not take a value`);
      continue;
    }
    if (valueOptions.has(optionName)) {
      if (optionIsMissingValue(index, arg)) {
        recordOptionError(`${optionName} requires a value`);
        continue;
      }
      if (!arg.includes("=")) index += 1;
      continue;
    }
    recordOptionError(`Unknown browser debug option "${optionName}"`);
  }

  return {
    get optionError() {
      return optionError;
    },
    hasFlag,
    optionNumber,
    optionValue,
  };
}

export function printBrowserDebugUsage() {
  console.log(`Usage: pnpm run debug:browser -- [options]

Options:
  --help                         Show this help.
  --list-scenarios               Print supported scenario names and exit.
  --scenario <name>              Scenario to run. Default: all.
  --out <dir>                    Artifact directory. Default: artifacts/qa/browser-debug.
  --port <number>                Requested starting Vite port. Default: 5178.
  --headed                       Show Chromium instead of running headless.
  --keep-open                    Keep browser open until Ctrl+C, then write final artifacts.
  --capture-smoke                In manual mode, click the debug capture button and exit.
  --no-trace                     Skip Playwright trace capture.
  --preserve-out                 Do not clean generated artifacts before the run.
  --slow-mo <ms>                 Delay browser actions for headed debugging.
  --allow-console-errors         Do not fail on browser console/page errors.
  --allow-request-failures       Do not fail on request failures or same-origin 4xx/5xx responses.

Examples:
  pnpm run debug:browser:scenarios
  pnpm run debug:game:smoke
  pnpm run debug:browser -- --scenario commander-reveal
  pnpm run debug:browser:headed -- --scenario all --port 5181
`);
}
