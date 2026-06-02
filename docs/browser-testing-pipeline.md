# Browser Testing Pipeline

Use this pipeline whenever the Codex in-app browser (`iab`) is unavailable or too limited. In this environment, treat IAB as optional and untrusted unless it is explicitly advertised at runtime. The repo-owned harness is the source of truth for browser testing because it starts the app, controls Chromium, captures screenshots, saves matching game-state JSON, and fails on browser console errors, page errors, failed network requests, or same-origin HTTP errors.

## Default Choice

Use Playwright through `scripts/browser-debug.mjs`.

- Playwright is already installed in this repo and drives Chromium directly from Node.
- The harness controls the Vite dev server lifecycle, so agents do not need to reserve or clean up a separate server process.
- Every screenshot capture waits for fonts/images, writes a full-page PNG, and writes a matching `*.state.json` snapshot from `window.__DUNE_DEBUG__`.
- The default run records `console.json`, `request-failures.json`, `summary.json`, and a trace zip unless `--no-trace` is set.
- Browser console errors, page errors, failed network requests, and same-origin HTTP 4xx/5xx responses fail the run by default.

Puppeteer is a good browser automation library, but it would duplicate the local Playwright harness without adding game-state capture or existing scenario coverage. Browser-use is useful for natural-language web agents, but it adds a Python/LLM layer and is not the deterministic default for this local game UI.

References checked while choosing this: Playwright supports screenshots and trace capture; Puppeteer supports browser UI automation and screenshots; browser-use is an agent layer built around browser automation and offers its own CLI/cloud path.

## IAB Status

Do not block browser testing on IAB. If a Codex browser backend is exposed, it can be used for ad hoc inspection, but the commit-quality path remains the repo Playwright harness.

Current expected behavior in this workspace:

- `iab` may not be exposed.
- If no browser backend is advertised, continue with `scripts/browser-debug.mjs`.
- A passing Playwright harness run is stronger evidence than a manual IAB inspection because it writes reproducible screenshots, state JSON, console logs, request failures, and a run summary.

When reporting browser verification, say whether IAB was available only if it materially affected the work. Otherwise report the harness command, output directory, screenshot count, console error count, and request failure count.

## Quick Commands

Use a unique concrete `--out` directory for each scripted task. Headed/manual helper commands may use their package-script defaults; rename output directories for side-by-side scripted artifacts.

```bash
pnpm run verify:browser-debug-pipeline
pnpm run debug:browser:help
pnpm run debug:browser:scenarios
pnpm run debug:game:smoke
pnpm run debug:browser -- --scenario all --out artifacts/qa/browser-debug-all-check --no-trace
pnpm run debug:browser -- --scenario commander-reveal --out artifacts/qa/browser-debug-commander-reveal --no-trace
pnpm run debug:browser:headed -- --scenario all --out artifacts/qa/browser-debug-headed-all
pnpm run debug:game
```

`pnpm run verify:browser-debug-pipeline` is a static contract check that keeps the package scripts, scenario inventory, generated artifact names, debug globals, README, and this document aligned. It is included in `pnpm run verify`, but it does not replace a real browser smoke run when the browser pipeline itself changes.

Use `debug:game:smoke` before every gameplay/browser-debug commit. It runs the manual scenario with `--capture-smoke`, is short and headless, and proves the manual capture bridge still works.

Use `debug:browser -- --scenario all` when a change may affect several pending-action surfaces. It creates many scenario screenshots under the selected `--out` directory and records a trace unless `--no-trace` is passed.

Use `debug:game` when you need to actually play in a headed browser. It runs the manual scenario with `--keep-open` and keeps Chromium open until `Ctrl+C`.

## Artifact Contract

For normal agent and subagent runs, write browser artifacts under `artifacts/qa/browser-debug` or `artifacts/qa/browser-debug-*`, which are ignored by git and receive the harness's repo-owned cleanup checks. The CLI accepts other `--out` paths, but use them only for deliberate one-off debugging.

Expected files:

- `summary.json`: scenario, URL, timing, screenshots, state snapshots, trace path, selected run options, output directory, `consoleErrorCount`, `requestFailureCount`, and `error` when the harness failed after creating artifacts.
- `console.json`: browser console messages and page errors.
- `request-failures.json`: failed network requests from any origin, plus same-origin HTTP 4xx/5xx responses.
- `*.png`: full-page screenshots.
- `*.state.json`: game-state snapshot paired with the screenshot stem.
- `*-trace.zip`: Playwright trace for scripted/headed debugging unless `--no-trace` was passed.

On success, the CLI prints each screenshot path, its paired state snapshot path when present, screenshot/state counts, console error count, request failure count, the summary path, and the actual app URL.

Inside the recommended `artifacts/qa/browser-debug` or `artifacts/qa/browser-debug-*` tree, the harness refuses unexpected artifact names and symlinked output paths. Reusing the same output directory can still overwrite generated files from the previous run; use a task-specific `--out` directory when you need side-by-side artifacts.

Inspect a summary quickly:

```bash
node -e 'const fs=require("fs"); const s=JSON.parse(fs.readFileSync("artifacts/qa/browser-debug-all-check/summary.json","utf8")); console.log({scenario:s.scenario, screenshots:s.screenshots?.length, consoleErrorCount:s.consoleErrorCount, requestFailureCount:s.requestFailureCount, error:s.error?.message, url:s.url, trace:s.trace});'
```

Do not claim a clean browser run unless the command exited with status `0`, `summary.error` is absent, and `consoleErrorCount` and `requestFailureCount` are both `0`.

## Manual Browser Play

Run:

```bash
pnpm run debug:game
```

The command prints the local URL and opens a headed Chromium session with a deterministic playable game. While the browser is open, capture the current state in any of these ways:

- Click the camera button in the top bar.
- Press `Ctrl+Shift+S` or `Cmd+Shift+S`.
- In the browser console, run:

```js
window.__DUNE_DEBUG__.capture("short-label")
```

Each capture writes `manual-capture-###[-label].png` plus `manual-capture-###[-label].state.json`.

When done, press `Ctrl+C` in the terminal. The harness writes final artifacts and exits cleanly.

## Scripted Scenario Playbook

List supported scenarios:

```bash
pnpm run debug:browser:scenarios
```

Current scenarios:

| Scenario | Main coverage |
| --- | --- |
| `home` | Desktop/mobile first-load layout. |
| `agent-placement` | Legal card/space selection and placed Agent state transition. |
| `card-choices` | Contract, acquire, Price is No Object Solari acquire, Interstellar Trade acquire Influence/contract bonuses, Dangerous Rhetoric Influence choice, Subversive Advisor board-space Influence, Desert Survival and Tread in Darkness source trash, Captured Mentat, Space-time Folding, Guild Envoy, Covert Operation, Ecological Testing Station, In High Places and Bene Gesserit Operative spy, and empty acquire pending surfaces. |
| `combat-intrigues` | Combat Intrigue targeting/play flow, Go To Ground retreat plus optional spy placement, Spice is Power spend branch, Impress pending acquisition, Find Weakness optional spy recall, Spring The Trap required spy recall, Devour optional trash, Questionable Methods optional Influence loss, Reach Agreement retreat plus contract pending, Tactical Option dynamic retreat and strength branches, plus a mobile layout screenshot. |
| `commander-reveal` | Commander reveal targeting, Call to Arms, and acquire follow-up. |
| `control-defense` | Critical-location control defense on desktop/mobile. |
| `conflict-vp` | Conflict VP conversion resource and spy branches. |
| `military-choices` | Deploy, reinforce, and blocked reinforce surfaces. |
| `pending-choices` | Recall spy, lose Influence, conflict Influence, and fixed-choice conflict Influence surfaces. |
| `space-choices` | Maker, Sietch Tabr, resource split, optional-space payment, and board Influence choice panels. |
| `signet-choices` | Muad'Dib, Gurney, and Amber immediate Signet log/state captures plus Margot, Staban, Shaddam paid reward, and Irulan Signet pending choices. |
| `table-choices` | Reveal adjust, retreat-for-strength, Chani Fremen Bond, Paracompass reveal, Wheels Within Wheels reveal spy, Calculus trash, Inspire Awe acquisition, Sietch Ritual selected discards, Special Mission City spy placement and spy recall, Change Allegiances Influence shifts/routed losses, Buy Access and Imperium Politics Influence routing, Throne Row, and conflict tie surfaces. |
| `trade-choices` | Resource and Intrigue trade surfaces. |
| `leader-modal` | Leader-card modal focus and close behavior. |
| `leader-character-choices` | Leader-specific pending choices and Commander starter-card choices. |
| `manual` | Manual-ready setup. It becomes a headed playable browser with manual captures when run through `debug:game` or `debug:browser:manual`; `debug:game:smoke` runs it headlessly with capture-smoke. |
| `all` | Every scripted non-manual scenario. It does not cover the manual scenario's `manual-ready.png` capture or the manual capture bridge; run `pnpm run debug:game:smoke` for that. |

Run one scenario:

```bash
pnpm run debug:browser -- --scenario pending-choices
```

Run a headed scenario on a specific port:

```bash
pnpm run debug:browser:headed -- --scenario leader-character-choices --port 5188
```

The `--port` option is the requested starting Vite port. If that port is busy, Vite may choose another port; always use the URL printed by the harness or recorded in `summary.json`.

Keep generated artifacts from a previous run while experimenting in the same directory:

```bash
pnpm run debug:browser -- --scenario table-choices --out artifacts/qa/browser-debug-table-choices --preserve-out
```

`--preserve-out` skips pre-run cleanup, but same-named artifacts in the same directory can still be overwritten by the new run. Use a unique `--out` directory when comparing two runs side by side.

Slow visible interaction:

```bash
pnpm run debug:browser:headed -- --scenario agent-placement --slow-mo 150
```

## Subagent Instructions

When asking a subagent to browser-test a patch, give it a distinct output directory and port:

```text
Use the repo-owned Playwright harness, not IAB. Run:
pnpm run debug:browser -- --scenario pending-choices --port 5181 --out artifacts/qa/browser-debug-pending-choices-check

Inspect summary.json, console.json, request-failures.json, and the generated screenshots.
Report the artifact paths and any visual or runtime issues. Do not edit files unless asked.
```

Replace the scenario, port, and output directory with values assigned by the parent agent.

Keep `--out` inside `artifacts/qa/browser-debug` or `artifacts/qa/browser-debug-*` unless the parent agent explicitly asks for a different path.

Preserve exit status while inspecting the summary:

```bash
pnpm run debug:browser -- --scenario pending-choices --port 5181 --out artifacts/qa/browser-debug-pending-choices-check --no-trace
exit_status=$?
node -e 'const fs=require("fs"); const s=JSON.parse(fs.readFileSync("artifacts/qa/browser-debug-pending-choices-check/summary.json","utf8")); console.log({scenario:s.scenario, screenshots:s.screenshots?.length, consoleErrorCount:s.consoleErrorCount, requestFailureCount:s.requestFailureCount, error:s.error?.message, url:s.url});'
printf 'exit_status=%s\n' "$exit_status"
exit "$exit_status"
```

For visual or pending-action changes, the subagent report should include:

- command run
- selected scenario
- actual URL from `summary.json`
- screenshot count
- `consoleErrorCount`
- `requestFailureCount`
- whether `summary.error` is absent
- command exit status
- relevant screenshot paths
- any state assertion failures or visual issues

Suggested port ranges:

- Parent agent: `5178`.
- First browser-testing subagent: `5181`.
- Second browser-testing subagent: `5182`.
- Additional subagents: increment from there.

## Adding Coverage

For a new UI surface:

1. Add a focused scenario module under `scripts/browser-debug-*.mjs`.
2. Add the scenario name and expected artifact names to `scripts/browser-debug-artifacts.mjs`.
3. Wire the scenario in `scripts/browser-debug.mjs`.
4. Use `setDebugGameAndWait` or a purpose-built fixture so the scenario is deterministic.
5. Capture before and after the key interaction.
6. Assert game state through `window.__DUNE_DEBUG__.getGame()`, not only through pixels.
7. Run the new scenario, `debug:game:smoke`, and the relevant rules verifier.

For a scenario that clicks UI, assert both sides of the interaction:

- before click: the expected pending panel, labels, enabled/disabled controls, and screenshot
- after click: no pending action when appropriate, changed player/game state, and screenshot if the visual state matters

Prefer deterministic fixture state over long setup flows. Use real UI clicks for the behavior under test; direct `setGame` is for setup, not for the interaction being verified.

## Commit Gate Checklist

For UI or pending-action work, run:

```bash
pnpm run verify &&
pnpm run verify:browser-debug-pipeline &&
pnpm run build &&
git diff --check &&
pnpm run debug:game:smoke &&
pnpm run debug:browser -- --scenario pending-choices --out artifacts/qa/browser-debug-pending-choices-check --no-trace
```

Replace `pending-choices` with the focused scenario for the changed UI surface.

Run the full browser suite when a change touches shared pending panels, app state wiring, debug helpers, or layout used across several scenarios:

```bash
pnpm run debug:browser -- --scenario all --out artifacts/qa/browser-debug-all-check --no-trace
```

Before committing, inspect every `summary.json` produced by the browser commands you ran. A successful run with screenshots is not clean unless the command exited with status `0`, `summary.error` is absent, and both failure counts are `0`.

## Troubleshooting

- If a port is busy, pass `--port <free-port>` or check `summary.json` for the actual selected URL. The Vite server uses `strictPort: false`, but unique ports keep logs clear.
- If a screenshot looks incomplete, check `console.json`; the capture helper logs image-readiness warnings there.
- If `summary.json` reports console or request failures, treat the run as failed even when screenshots exist.
- If a headed run is interrupted, rerun the smoke command afterward to confirm the bridge still exits cleanly.
- If IAB becomes exposed later, it can supplement manual inspection, but this Playwright harness remains the commit gate because it is reproducible and artifact-backed.
