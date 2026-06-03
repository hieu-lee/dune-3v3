#!/usr/bin/env node
import { createRoomServer } from "./room-server.mjs";
import {
  assertCloudflaredAvailable,
  cloudflaredInstallHint,
  publicRoomUrl,
  startTryCloudflareTunnel,
  waitForPublicHttpReady,
} from "./online-tunnel-utils.mjs";

function optionValue(name) {
  const prefix = `--${name}=`;
  return process.argv.find((arg) => arg.startsWith(prefix))?.slice(prefix.length);
}

function numericOption(name, fallback) {
  const raw = optionValue(name);
  if (raw === undefined) return fallback;
  const parsed = Number(raw);
  if (!Number.isInteger(parsed) || parsed < 0) throw new Error(`--${name} must be a non-negative integer`);
  return parsed;
}

function storageFileOption() {
  if (process.argv.includes("--no-storage")) return false;
  return optionValue("storage-file") ?? undefined;
}

async function createInitialRoom(localBaseUrl) {
  const response = await fetch(new URL("/api/rooms", localBaseUrl), { method: "POST" });
  if (!response.ok) {
    const body = await response.text().catch(() => "");
    throw new Error(`Unable to create a room before publishing the tunnel: ${response.status} ${body}`);
  }
  const body = await response.json();
  return body.roomId;
}

const cloudflaredBin = optionValue("cloudflared") ?? process.env.CLOUDFLARED_BIN ?? "cloudflared";
const host = optionValue("host") ?? "127.0.0.1";
const port = numericOption("port", 5188);
const shouldCreateRoom = !process.argv.includes("--no-create-room");
const shouldLogCloudflared = process.argv.includes("--verbose-cloudflared");
let roomServer;
let tunnel;
let shuttingDown = false;

async function shutdown(exitCode = 0) {
  if (shuttingDown) return;
  shuttingDown = true;
  await tunnel?.close().catch((error) => console.error(`failed to stop cloudflared: ${error.message}`));
  await roomServer?.close().catch((error) => console.error(`failed to stop room server: ${error.message}`));
  process.exit(exitCode);
}

process.on("SIGINT", () => {
  void shutdown(0);
});
process.on("SIGTERM", () => {
  void shutdown(0);
});

try {
  console.log("Checking cloudflared...");
  const cloudflaredVersion = await assertCloudflaredAvailable(cloudflaredBin);
  console.log(cloudflaredVersion);

  roomServer = await createRoomServer({
    host,
    port,
    storageFile: storageFileOption(),
  });
  const localUrl = roomServer.resolvedUrls.local[0];
  const roomId = shouldCreateRoom ? await createInitialRoom(localUrl) : undefined;
  console.log(`Private room server ready: ${localUrl}`);
  if (roomServer.storageFile) console.log(`Room storage file: ${roomServer.storageFile}`);

  console.log("Starting free TryCloudflare tunnel...");
  tunnel = startTryCloudflareTunnel({
    cloudflaredBin,
    log: shouldLogCloudflared ? (line) => console.log(line) : () => undefined,
    originUrl: localUrl,
  });
  tunnel.process.once("exit", (code, signal) => {
    if (shuttingDown) return;
    console.error(`cloudflared stopped (${signal ?? code}); closing room server.`);
    void shutdown(code || 1);
  });

  const publicBaseUrl = await tunnel.ready;
  const publicLobbyUrl = publicRoomUrl(publicBaseUrl);
  const publicInviteUrl = roomId ? publicRoomUrl(publicBaseUrl, roomId) : undefined;
  console.log("Waiting for the public tunnel URL to respond...");
  const publicReady = await waitForPublicHttpReady(publicLobbyUrl);

  console.log("");
  console.log("Dune 3v3 online room is ready.");
  console.log("");
  console.log(`Local host URL: ${localUrl}`);
  console.log(`Public DNS:     ${publicReady.hostname} -> ${publicReady.addresses[0]}`);
  console.log(`Public lobby URL: ${publicLobbyUrl}`);
  if (publicInviteUrl) console.log(`Public room URL:  ${publicInviteUrl}`);
  console.log("");
  console.log("Share the public room URL with your friends. Keep this terminal open until the game is over.");
  console.log("The link uses sync=poll because free TryCloudflare quick tunnels do not support Server-Sent Events.");
  console.log("");
} catch (error) {
  console.error(error instanceof Error ? error.message : error);
  if (String(error instanceof Error ? error.message : error).includes("cloudflared")) {
    console.error(cloudflaredInstallHint());
  }
  await shutdown(1);
}
