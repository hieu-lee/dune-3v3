# Dune 3v3

Private web-table implementation for a six-player `Dune: Imperium - Uprising` team game.

The app is built for one trusted friend group: one person hosts the private room server, six players join by room link or code, each claims a Commander/Ally seat, and the server drives the shared game state, hidden information, pending choices, combat, reconnects, Endgame, and final team scoring.

## Quick Start

Install dependencies once:

```bash
pnpm install
```

Host an online room server:

```bash
pnpm run room:dev
```

Open the room in a browser. The command binds to `0.0.0.0` so other devices can connect; on the host machine, use:

```text
http://127.0.0.1:5188/
```

Other players should use the host machine's LAN address with the same port, for example `http://192.168.1.25:5188/`.

Click **Create**, claim a seat, then share the room link with the other five players. The room server also serves the web app, so you do not need to run `pnpm dev` separately for online play.

For step-by-step player instructions, see [docs/play-guide.md](docs/play-guide.md).

## How To Play Online

1. The host runs `pnpm run room:dev`.
2. The host opens the printed URL, clicks **Create**, and shares the room link or room code.
3. Each player opens the link, enters a player name, and claims one of the six seats.
4. If someone picks the wrong seat, they can switch to an open seat or press **Release**.
5. If someone closes or refreshes the browser, the local reconnect token should restore their seat.
6. If a disconnected seat needs to be recovered from a new browser, click the offline seat to reclaim it.
7. Play from the table UI. Only the active player or pending-choice owner can make the current room action.

Seat layout:

| Seat | Team | Role | Leader |
| --- | --- | --- | --- |
| `p1` | Muad'Dib | Commander | Muad'Dib |
| `p2` | Muad'Dib | Ally | Feyd-Rautha Harkonnen |
| `p3` | Muad'Dib | Ally | Gurney Halleck |
| `p4` | Shaddam | Commander | Shaddam Corrino IV |
| `p5` | Shaddam | Ally | Lady Jessica |
| `p6` | Shaddam | Ally | Princess Irulan |

## Local Hotseat

For one-browser local development or hotseat play:

```bash
pnpm dev
```

Open the Vite URL printed by the command. This mode is useful for local debugging, but it does not create multiplayer rooms or reconnect tokens.

## Room Storage

`pnpm run room:dev` persists rooms outside the served project tree by default:

```text
~/.dune-3v3/room-server/rooms.json
```

Override the storage file:

```bash
pnpm run room:dev -- --storage-file=/path/to/rooms.json
```

Run without persistence:

```bash
pnpm run room:dev -- --no-storage
```

## Useful Commands

```bash
pnpm build
pnpm run verify:all
pnpm run verify:all -- --list
pnpm run debug:room:smoke
pnpm run debug:room:complete
pnpm run debug:room:marathon
pnpm run debug:room:vp-endgame
```

- `pnpm build` runs TypeScript and the production Vite build.
- `pnpm run verify:all` runs every verifier script.
- `pnpm run debug:room:smoke` is the focused room/session smoke.
- `pnpm run debug:room:complete` is the six-browser all-seat coordination smoke.
- `pnpm run debug:room:marathon` drives a natural six-browser game through Conflict-deck Endgame and final team scoring.
- `pnpm run debug:room:vp-endgame` covers the 10 VP Endgame trigger before Conflict-deck exhaustion.

## Browser Debugging

The repo-owned Playwright harness is the default browser test path. See [docs/browser-testing-pipeline.md](docs/browser-testing-pipeline.md) for the full workflow.

Common commands:

```bash
pnpm run debug:browser:scenarios
pnpm run debug:browser -- --scenario all --out artifacts/qa/browser-debug-all-check --no-trace
pnpm run debug:game
pnpm run debug:game:smoke
```

`pnpm run debug:game` opens a headed browser for manual inspection. While it is running, use the camera button, press `Ctrl+Shift+S` or `Cmd+Shift+S`, or run this in the browser console:

```js
window.__DUNE_DEBUG__.capture("short-label")
```

The harness writes screenshots, paired state JSON, `console.json`, `request-failures.json`, and `summary.json` under `artifacts/qa/...`.

## Docs Map

- [docs/play-guide.md](docs/play-guide.md): how to host, join, recover, and play a room.
- [docs/browser-testing-pipeline.md](docs/browser-testing-pipeline.md): Playwright scenarios and artifact contract.
- [docs/uprising-3v3-notes.md](docs/uprising-3v3-notes.md): implementation notes for six-player rules and current automation.
- [docs/card-coverage.md](docs/card-coverage.md): card and effect coverage.
- [docs/card-effect-gaps.md](docs/card-effect-gaps.md): typed effect primitives and follow-up candidates.
- [docs/asset-coverage.md](docs/asset-coverage.md): current local asset coverage.
- [docs/asset-audit.md](docs/asset-audit.md): asset source notes.

## Card Catalog And Assets

Refresh the compact Uprising catalog:

```bash
pnpm sync:cards
```

Refresh catalog metadata and download referenced images for private local play:

```bash
pnpm sync:card-images
```

Six-player-only board-space art is not present in the Dune Cards Hub catalog. Local overrides live under `public/assets/dune-cards-hub/location`, and `pnpm run verify:board-spaces` verifies that every 3v3 board space resolves to a real local asset.
