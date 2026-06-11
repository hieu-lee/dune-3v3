# Play Guide

This guide is for the private six-player online table. It assumes the group already knows the physical `Dune: Imperium - Uprising` rules and needs to know how to run and use this web version.

## Requirements

- Node.js and `pnpm`.
- One host computer that the other players can reach over the network, or `cloudflared` for a free public TryCloudflare tunnel.
- Six players, one for each fixed 3v3 seat.

Install dependencies once:

```bash
pnpm install
```

## Host A Room

For players on different networks, use the one-command public tunnel:

```bash
pnpm run play:online
```

It starts the room server, starts a free TryCloudflare tunnel, creates one room, and prints a public room URL. Share the printed `https://...trycloudflare.com/?sync=poll&room=...` link and keep the terminal open. See [online-play.md](online-play.md) for install steps, Cloudflare limitations, and the public-tunnel verification command.

For LAN-only play, start the private room server directly:

```bash
pnpm run room:dev
```

The command binds to `0.0.0.0` so other devices can connect. It prints a URL and storage path like:

```text
private room server ready: http://0.0.0.0:5188/
room storage file: /Users/<you>/.dune-3v3/room-server/rooms.json
```

On the host machine, open `http://127.0.0.1:5188/`. If other players are on different machines on the same LAN, give them a URL that reaches the host computer on the same port. For a home LAN this is usually the host machine's local IP address, such as `http://192.168.1.25:5188/`.

Room state is saved by default outside the project tree:

```text
~/.dune-3v3/room-server/rooms.json
```

Use a custom storage file when you want a specific save location:

```bash
pnpm run room:dev -- --storage-file=/path/to/rooms.json
```

Use no persistence for a throwaway test room:

```bash
pnpm run room:dev -- --no-storage
```

## Create And Share

1. Open the room server URL.
2. Click **Create**.
3. The browser URL gains a `?room=<code>` parameter.
4. Share that full URL with the group, or share just the room code.

Players can paste either the full invite link or the code into the **Room code or link** field and click **Join**. For TryCloudflare links, keep the `sync=poll` parameter in the shared URL so browsers use polling instead of Server-Sent Events.

## Claim Seats

Each player enters a name and clicks their seat. Seats are fixed:

| Seat | Team | Role | Leader |
| --- | --- | --- | --- |
| `p1` | Muad'Dib | Commander | Muad'Dib |
| `p2` | Muad'Dib | Ally | Feyd-Rautha Harkonnen |
| `p3` | Muad'Dib | Ally | Gurney Halleck |
| `p4` | Shaddam | Commander | Shaddam Corrino IV |
| `p5` | Shaddam | Ally | Lady Jessica |
| `p6` | Shaddam | Ally | Princess Irulan |

After claiming a seat, the private panel shows that player's own hand. Other players' hands, Intrigues, Objectives, draw decks, and hidden shared decks stay masked in normal room views.

If a player claims the wrong seat:

- Click an unclaimed seat to switch to it.
- Or click **Release**, then claim another seat.

If a player disconnects:

- Refreshing the same browser should reclaim the seat using the locally stored reconnect token.
- If the original browser is gone and the reconnect token is unavailable, the seat stays locked to protect that player's private hand. Release the seat before switching devices.

## Playing A Turn

The room server owns the authoritative game state. Buttons are enabled only for the player who can legally act.

Normal flow:

1. The active player selects a card from hand.
2. Legal board spaces highlight.
3. The active player selects a legal space and sends the Agent.
4. If the action creates a pending choice, the appropriate player resolves the pending panel.
5. The active player ends the Agent turn, or reveals when they cannot or do not want to place another Agent.
6. During Reveal, the active player buys cards if possible, then ends Reveal.
7. Combat opens when the round reaches combat timing. Players pass or play Combat Intrigues in order.
8. Conflict rewards, cleanup, Endgame triggers, and final team scoring are automated through the room action flow.

Commanders must choose an activated Ally when a card or action routes troops, Influence, combat strength, sandworms, or other team effects through an Ally. The UI shows Commander target controls where they are needed.

## Pending Choices

Pending choices are normal. They represent decisions that the physical game would ask a player to make, such as:

- choosing a CHOAM contract
- choosing a Faction Influence target
- placing or recalling a spy
- deploying or reinforcing troops
- resolving card trash/discard choices
- choosing Commander/Ally split rewards
- resolving Plot or Combat Intrigue follow-up effects
- scoring Endgame Intrigues

When a pending action belongs to another player, the table shows that the room is waiting and your controls stay disabled.

## Team Trade

When a trade action is open, teammates can trade one supported good type:

- spice
- water
- Solari
- one chosen Intrigue card

The room view keeps private Intrigue information masked from non-owners except where a player must choose their own card to trade.

## Endgame

Endgame starts when a player reaches 10 VP during Recall or when the Conflict deck is empty. The room then exposes any available Endgame Intrigue scoring choices to their owners. After all scoring is done, each player marks Endgame ready/finalizes, and the server records the final team score.

## Local Hotseat Mode

Use local hotseat mode for one-browser development or manual table inspection:

```bash
pnpm dev
```

This starts Vite only. It does not create online rooms, reconnect tokens, or server-side persistence.

For a headed browser with capture controls:

```bash
pnpm run debug:game
```

While it is running, capture the current browser state with the camera button, `Ctrl+Shift+S` / `Cmd+Shift+S`, or:

```js
window.__DUNE_DEBUG__.capture("short-label")
```

## Verification Commands

Use these when checking that the table still works:

```bash
pnpm build
pnpm run verify:all
pnpm run debug:room:online
pnpm run debug:room:smoke
pnpm run debug:room:complete
pnpm run debug:room:marathon
pnpm run debug:room:vp-endgame
pnpm run debug:game:smoke
```

For UI and pending-action surfaces:

```bash
pnpm run debug:browser:scenarios
pnpm run debug:browser -- --scenario all --out artifacts/qa/browser-debug-all-check --no-trace
```

Every browser run writes artifacts under `artifacts/qa/...`, including screenshots, state JSON, console logs, request failures, and a `summary.json`.

## Troubleshooting

- **Friends are not on the same Wi-Fi:** use `pnpm run play:online` and share the printed TryCloudflare public room URL.
- **`pnpm run play:online` cannot find `cloudflared`:** install `cloudflared`, then confirm `cloudflared --version` works in the same terminal.
- **Players cannot open the host URL:** make sure they are using the host machine's reachable network address, not `127.0.0.1` from their own machine.
- **A TryCloudflare room looks stale:** make sure the URL includes `sync=poll`, then refresh.
- **A player sees only hidden cards:** they probably have not claimed a seat, lost their local token, or are viewing as an unclaimed spectator. Reconnect from the browser with the stored token, or release the seat before switching devices.
- **A button is disabled:** it is probably not that player's turn, a pending action belongs to someone else, or the move is illegal.
- **A player chose the wrong seat:** use **Release** or click an unclaimed seat to switch.
- **The room looks stale after reconnecting:** refresh the page. If the old browser was closed and its stored token is unavailable, the seat cannot be reclaimed from a fresh browser.
- **You want to discard a test room:** stop the server and remove the configured room storage file, or run with `--no-storage` next time.
