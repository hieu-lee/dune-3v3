# Online Play With A Free Tunnel

This is the recommended path when the six players are not on the same Wi-Fi. One host runs the room server locally, `cloudflared` publishes it through a free TryCloudflare quick tunnel, and friends join the printed public room link.

## Why Cloudflare Tunnel

Cloudflare Tunnel lets a local HTTP server receive public HTTPS traffic without opening router ports or sharing a public IP. The `cloudflared` process makes outbound connections from the host computer to Cloudflare, and Cloudflare proxies public requests back to the local room server.

References:

- Cloudflare Tunnel overview: https://developers.cloudflare.com/cloudflare-one/networks/connectors/cloudflare-tunnel/
- Local preview command: https://developers.cloudflare.com/pages/how-to/preview-with-cloudflare-tunnel/
- TryCloudflare quick tunnels: https://developers.cloudflare.com/cloudflare-one/networks/connectors/cloudflare-tunnel/do-more-with-tunnels/trycloudflare/

TryCloudflare quick tunnels are free and do not require moving a domain to Cloudflare, but they are intended for testing/development. Cloudflare documents two relevant quick-tunnel limits: no uptime/SLA guarantee and no Server-Sent Events support. The game normally uses Server-Sent Events for live room updates, so public quick-tunnel links force `sync=poll` and the app refreshes room snapshots through regular HTTPS API requests instead.

## Install Once

Install the app dependencies:

```bash
pnpm install
```

Install `cloudflared` and make sure it is on your `PATH`:

```bash
cloudflared --version
```

On macOS with Homebrew:

```bash
brew install cloudflared
```

For Windows or Linux, use Cloudflare's current download/package instructions:

```text
https://developers.cloudflare.com/cloudflare-one/networks/connectors/cloudflare-tunnel/downloads/
```

## Start A Public Room

Run:

```bash
pnpm run play:online
```

The command:

1. Checks that `cloudflared` is available.
2. Starts the private room server on `127.0.0.1:5188`.
3. Creates one room.
4. Starts `cloudflared tunnel --url http://127.0.0.1:5188/`.
5. Prints a public `https://<random>.trycloudflare.com/?sync=poll&room=<code>` room URL.

Share the public room URL with the other five players and keep the terminal open until the game is over. The public URL is temporary; stopping the command closes the tunnel, and the next run gets a new random hostname.

Useful options:

```bash
pnpm run play:online -- --port=5199
pnpm run play:online -- --storage-file=/path/to/rooms.json
pnpm run play:online -- --no-storage
pnpm run play:online -- --no-create-room
pnpm run play:online -- --cloudflared=/path/to/cloudflared
pnpm run play:online -- --verbose-cloudflared
```

## Verify The Public Tunnel

Run the tunnel browser test when changing room sync, hosting scripts, or docs that describe the online path:

```bash
pnpm run debug:room:online
```

This test requires `cloudflared` and internet access. It starts a real local room server, publishes it through a real TryCloudflare quick tunnel, opens the public URL in two isolated Playwright browser contexts, creates a room, confirms `sync=poll`, claims two seats, verifies polling convergence across the public URL, verifies hidden-hand projection, reloads one browser to prove reconnect-token recovery, and checks for zero browser console errors and zero request failures.

Artifacts are written to:

```text
artifacts/qa/browser-room-online-tunnel/
```

The important files are:

- `summary.json`: public tunnel URL, room code, sync mode, screenshot count, console error count, and request failure count.
- `cloudflared.log`: raw tunnel startup and connection diagnostics from the test run.
- `online-tunnel-lobby-loaded.png` and `.state.json`: public lobby loaded through the tunnel before room creation.
- `online-tunnel-alice-claimed.png` and `.state.json`: first public browser claimed seat.
- `online-tunnel-bob-claimed.png` and `.state.json`: second public browser claimed seat and first browser observed the update through polling.
- `online-tunnel-bob-reclaimed.png` and `.state.json`: fresh public browser reclaimed the second seat after polling stopped and the seat went offline.
- `online-tunnel-alice-reconnected.png` and `.state.json`: reconnect-token recovery over the public tunnel.
- `console.json` and `request-failures.json`: raw browser diagnostics.

For broader room confidence, run:

```bash
pnpm run verify:room-server
pnpm run debug:room:smoke
pnpm run debug:room:complete
```

## Troubleshooting

- **`cloudflared` is not found:** install it, then confirm `cloudflared --version` works in the same terminal.
- **Cloudflare does not print a public URL:** check the terminal output. TryCloudflare quick tunnels may fail if a `config.yaml` or `config.yml` file is present under `.cloudflared`; temporarily move that config or use a named Cloudflare Tunnel.
- **Friends see stale room state:** make sure the shared URL includes `sync=poll`. This is required for free TryCloudflare quick tunnels because they do not support Server-Sent Events.
- **The link stops working:** the host command must stay running. If it stops, run `pnpm run play:online` again and share the new public room URL.
- **You want a stable hostname:** create a normal Cloudflare account and a remotely managed Cloudflare Tunnel with your own hostname. Start the room server with that hostname allowed, for example `DUNE_ALLOWED_HOSTS=table.example.com pnpm run room:dev`, then point your named tunnel at the printed local origin. That is more setup than the free one-command friend-game path.
