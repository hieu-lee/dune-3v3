import assert from "node:assert/strict";
import { readFileSync } from "node:fs";
import { generatedArtifactNames, isGeneratedArtifactName, scenarioNames, scenarios } from "./browser-debug-artifacts.mjs";

function readProjectFile(path) {
  return readFileSync(new URL(`../${path}`, import.meta.url), "utf8");
}

function assertMentions(text, needle, label) {
  assert.ok(text.includes(needle), `${label} should mention "${needle}"`);
}

function assertScript(packageJson, scriptName, expectedCommand) {
  assert.equal(packageJson.scripts[scriptName], expectedCommand, `package.json script ${scriptName} should stay stable`);
}

const packageJson = JSON.parse(readProjectFile("package.json"));
const docs = readProjectFile("docs/browser-testing-pipeline.md");
const readme = readProjectFile("README.md");
const app = readProjectFile("src/App.tsx");
const commandBar = readProjectFile("src/components/CommandBar.tsx");

assertScript(packageJson, "debug:browser", "node scripts/browser-debug.mjs");
assertScript(packageJson, "debug:browser:help", "node scripts/browser-debug.mjs --help");
assertScript(packageJson, "debug:browser:scenarios", "node scripts/browser-debug.mjs --list-scenarios");
assertScript(packageJson, "debug:browser:headed", "node scripts/browser-debug.mjs --headed --keep-open");
assertScript(packageJson, "debug:browser:manual", "node scripts/browser-debug.mjs --headed --keep-open --scenario manual");
assertScript(
  packageJson,
  "debug:game",
  "node scripts/browser-debug.mjs --headed --keep-open --scenario manual --out artifacts/qa/browser-debug-manual",
);
assertScript(
  packageJson,
  "debug:game:smoke",
  "node scripts/browser-debug.mjs --scenario manual --capture-smoke --out artifacts/qa/browser-debug-manual-smoke --no-trace",
);
assertScript(packageJson, "verify:browser-debug-pipeline", "node scripts/verify-browser-debug-pipeline.mjs");

assert.equal(new Set(scenarioNames).size, scenarioNames.length, "Browser debug scenario names should be unique");
assert.ok(scenarios instanceof Set, "Browser debug scenarios should be exposed as a Set");
for (const scenario of scenarioNames) {
  assert.ok(scenarios.has(scenario), `Scenario set should include ${scenario}`);
}
assert.ok(scenarios.has("manual"), "Browser debug scenarios should include manual play");
assert.ok(scenarios.has("all"), "Browser debug scenarios should include the aggregate all scenario");

const documentedScenarios = [...docs.matchAll(/^\| `([^`]+)` \|/gm)].map((match) => match[1]);
assert.deepEqual(
  [...documentedScenarios].sort(),
  [...scenarioNames].sort(),
  "docs/browser-testing-pipeline.md should document every browser debug scenario exactly once",
);

const requiredArtifactNames = [
  "console.json",
  "request-failures.json",
  "summary.json",
  "manual-ready.png",
  "manual-ready.state.json",
  "manual-final.png",
  "manual-final.state.json",
  "manual-trace.zip",
  "failure.png",
];
for (const artifact of requiredArtifactNames) {
  assert.ok(generatedArtifactNames.has(artifact), `Browser debug artifact contract should include ${artifact}`);
}
for (const scenario of scenarioNames) {
  assert.ok(generatedArtifactNames.has(`${scenario}-final.png`), `Browser debug artifacts should include ${scenario}-final.png`);
  assert.ok(generatedArtifactNames.has(`${scenario}-trace.zip`), `Browser debug artifacts should include ${scenario}-trace.zip`);
}
assert.ok(isGeneratedArtifactName("manual-capture-001-button.png"), "Manual capture screenshots should be allowed artifacts");
assert.ok(isGeneratedArtifactName("manual-capture-001-button.state.json"), "Manual capture state JSON should be allowed artifacts");
assert.ok(!isGeneratedArtifactName("../outside.png"), "Artifact names with directories should not be allowed");

for (const needle of [
  "IAB",
  "Playwright",
  "screenshots",
  "state JSON",
  "console.json",
  "request-failures.json",
  "summary.json",
  "trace",
  "--port",
  "--out",
  "--preserve-out",
  "--capture-smoke",
  "--keep-open",
  "consoleErrorCount",
  "requestFailureCount",
  "summary.error",
  "pnpm run verify:browser-debug-pipeline",
  "pnpm run debug:game:smoke",
  "pnpm run debug:game",
  "window.__DUNE_DEBUG__.capture",
]) {
  assertMentions(docs, needle, "docs/browser-testing-pipeline.md");
}

for (const needle of [
  "docs/browser-testing-pipeline.md",
  "pnpm run debug:browser:scenarios",
  "pnpm run debug:game",
  "pnpm run debug:game:smoke",
  "window.__DUNE_DEBUG__.capture",
]) {
  assertMentions(readme, needle, "README.md");
}

for (const needle of [
  "VITE_DUNE_DEBUG",
  "__DUNE_DEBUG__",
  "__DUNE_DEBUG_CAPTURE__",
  "getGame",
  "setGame",
  "capture",
  "ctrlKey",
  "metaKey",
  "shiftKey",
  'key.toLowerCase() === "s"',
]) {
  assertMentions(app, needle, "src/App.tsx");
}
assertMentions(commandBar, 'data-testid="debug-capture"', "src/components/CommandBar.tsx");

console.log("browser debug pipeline verification passed");
