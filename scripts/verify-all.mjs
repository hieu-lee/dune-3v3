import { spawnSync } from "node:child_process";
import { readFileSync } from "node:fs";

const packageJson = JSON.parse(readFileSync(new URL("../package.json", import.meta.url), "utf8"));

const verifyScripts = Object.keys(packageJson.scripts)
  .filter((name) => name.startsWith("verify:") && name !== "verify:all")
  .sort();

if (process.argv.includes("--list")) {
  console.log(verifyScripts.join("\n"));
  process.exit(0);
}

const startedAt = Date.now();
console.log(`running ${verifyScripts.length} verifier scripts`);

for (const [index, scriptName] of verifyScripts.entries()) {
  const label = `${index + 1}/${verifyScripts.length}`;
  console.log(`\n[${label}] pnpm run ${scriptName}`);
  const result = spawnSync("pnpm", ["run", scriptName], { stdio: "inherit" });

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
