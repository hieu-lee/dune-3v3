import { spawnSync } from "node:child_process";
import { readFileSync } from "node:fs";

const packageJson = JSON.parse(readFileSync(new URL("../package.json", import.meta.url), "utf8"));

const verifyScripts = Object.keys(packageJson.scripts)
  .filter((name) => name.startsWith("verify:") && name !== "verify:all")
  .sort();

function commandForScript(scriptName) {
  const scriptCommand = packageJson.scripts[scriptName];
  const nodeScriptMatch = /^node\s+(\S+)(?:\s+(.*))?$/.exec(scriptCommand);
  if (!nodeScriptMatch) return { command: "pnpm", args: ["run", scriptName], label: `pnpm run ${scriptName}` };
  return {
    command: process.execPath,
    args: [nodeScriptMatch[1], ...(nodeScriptMatch[2]?.trim().split(/\s+/).filter(Boolean) ?? [])],
    label: scriptCommand,
  };
}

if (process.argv.includes("--list")) {
  console.log(verifyScripts.join("\n"));
  process.exit(0);
}

const startedAt = Date.now();
console.log(`running ${verifyScripts.length} verifier scripts`);

for (const [index, scriptName] of verifyScripts.entries()) {
  const label = `${index + 1}/${verifyScripts.length}`;
  const command = commandForScript(scriptName);
  console.log(`\n[${label}] ${command.label}`);
  const result = spawnSync(command.command, command.args, { stdio: "inherit" });

  if (result.error) {
    console.error(`\n${scriptName} failed to start: ${result.error.message}`);
    process.exit(1);
  }

  if (result.status !== 0) {
    console.error(`\n${scriptName} failed with exit code ${result.status ?? "unknown"}`);
    process.exit(result.status ?? 1);
  }
}

const durationSeconds = ((Date.now() - startedAt) / 1000).toFixed(1);
console.log(`\nall verifier scripts passed in ${durationSeconds}s`);
