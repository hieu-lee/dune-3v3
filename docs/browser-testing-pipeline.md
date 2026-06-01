# Browser Testing Pipeline

Use this pipeline whenever the Codex in-app browser (`iab`) is unavailable or too limited. The repo-owned harness is the source of truth for browser testing because it starts the app, controls Chromium, captures screenshots, saves matching game-state JSON, and fails on browser console errors, page errors, failed network requests, or same-origin HTTP errors.

## Default Choice

Use Playwright through `scripts/browser-debug.mjs`.

- Playwright is already installed in this repo and drives Chromium directly from Node.
- The harness controls the Vite dev server lifecycle, so agents do not need to reserve or clean up a separate server process.
- Every screenshot capture waits for fonts/images, writes a full-page PNG, and writes a matching `*.state.json` snapshot from `window.__DUNE_DEBUG__`.
- The default run records `console.json`, `request-failures.json`, `summary.json`, and a trace zip unless `--no-trace` is set.
- Browser console errors, page errors, failed network requests, and same-origin HTTP 4xx/5xx responses fail the run by default.

Puppeteer is a good browser automation library, but it would duplicate the local Playwright harness without adding game-state capture or existing scenario coverage. Browser-use is useful for natural-language web agents, but it adds a Python/LLM layer and is not the deterministic default for this local game UI.

References checked while choosing this: Playwright supports screenshots and trace capture; Puppeteer supports browser UI automation and screenshots; browser-use is an agent layer built around browser automation and offers its own CLI/cloud path.

## Quick Commands

```bash
pnpm run debug:browser:help
pnpm run debug:browser:scenarios
pnpm run debug:game:smoke
pnpm run debug:browser -- --scenario all
pnpm run debug:browser -- --scenario commander-reveal
pnpm run debug:browser:headed -- --scenario all
pnpm run debug:game
```

Use `debug:game:smoke` before every gameplay/browser-debug commit. It is short, headless, and proves the manual capture bridge still works.

Use `debug:browser -- --scenario all` when a change may affect several pending-action surfaces. It creates many scenario screenshots and traces under `artifacts/qa/browser-debug`.

Use `debug:game` when you need to actually play in a headed browser. It keeps Chromium open until `Ctrl+C`.

## Artifact Contract

For normal agent and subagent runs, write browser artifacts under `artifacts/qa/browser-debug*`, which is ignored by git and receives the harness's repo-owned cleanup checks. The CLI accepts other `--out` paths, but use them only for deliberate one-off debugging.

Expected files:

- `summary.json`: scenario, URL, timing, screenshots, state snapshots, trace path, console error count, request failure count.
- `console.json`: browser console messages and page errors.
- `request-failures.json`: failed network requests from any origin, plus same-origin HTTP 4xx/5xx responses.
- `*.png`: full-page screenshots.
- `*.state.json`: game-state snapshot paired with the screenshot stem.
- `*-trace.zip`: Playwright trace for scripted/headed debugging unless `--no-trace` was passed.

Inside the recommended `artifacts/qa/browser-debug*` tree, the harness refuses unexpected artifact names and symlinked output paths. Reusing the same output directory can still overwrite generated files from the previous run; use a task-specific `--out` directory when you need side-by-side artifacts.

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
pnpm run debug:browser -- --scenario <scenario> --port <unique-port> --out artifacts/qa/browser-debug-<task>

Inspect summary.json, console.json, request-failures.json, and the generated screenshots.
Report the artifact paths and any visual or runtime issues. Do not edit files unless asked.
```

Keep `--out` inside `artifacts/qa/browser-debug*` unless the parent agent explicitly asks for a different path.

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

## Troubleshooting

- If a port is busy, pass `--port <free-port>` or check `summary.json` for the actual selected URL. The Vite server uses `strictPort: false`, but unique ports keep logs clear.
- If a screenshot looks incomplete, check `console.json`; the capture helper logs image-readiness warnings there.
- If `summary.json` reports console or request failures, treat the run as failed even when screenshots exist.
- If a headed run is interrupted, rerun the smoke command afterward to confirm the bridge still exits cleanly.
- If IAB becomes exposed later, it can supplement manual inspection, but this Playwright harness remains the commit gate because it is reproducible and artifact-backed.
