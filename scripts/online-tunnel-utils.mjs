import { spawn } from "node:child_process";
import dns from "node:dns/promises";
import { request } from "node:https";

const tryCloudflareUrlPattern = /https:\/\/[-a-z0-9]+\.trycloudflare\.com/iu;

export function cloudflaredInstallHint() {
  if (process.platform === "darwin") return "Install cloudflared with: brew install cloudflared";
  if (process.platform === "win32") {
    return "Install cloudflared from the Cloudflare Tunnel downloads page, then make cloudflared.exe available on PATH.";
  }
  return "Install cloudflared from the Cloudflare Tunnel downloads page or Cloudflare package repository, then make it available on PATH.";
}

export async function assertCloudflaredAvailable(cloudflaredBin = "cloudflared") {
  return await new Promise((resolve, reject) => {
    const child = spawn(cloudflaredBin, ["--version"], { stdio: ["ignore", "pipe", "pipe"] });
    let output = "";
    let errorOutput = "";
    child.stdout.on("data", (chunk) => {
      output += chunk.toString();
    });
    child.stderr.on("data", (chunk) => {
      errorOutput += chunk.toString();
    });
    child.once("error", (error) => {
      reject(new Error(`Unable to run ${cloudflaredBin}: ${error.message}`));
    });
    child.once("exit", (code, signal) => {
      if (code === 0) {
        resolve(output.trim() || errorOutput.trim() || `${cloudflaredBin} is available`);
        return;
      }
      reject(new Error(`${cloudflaredBin} --version exited with ${signal ?? code}: ${errorOutput.trim()}`));
    });
  });
}

export function publicRoomUrl(publicBaseUrl, roomId) {
  const url = new URL(publicBaseUrl);
  url.searchParams.set("sync", "poll");
  if (roomId) url.searchParams.set("room", roomId);
  return url.toString();
}

export function publicHostname(publicBaseUrl) {
  return new URL(publicBaseUrl).hostname;
}

function sleep(ms) {
  return new Promise((resolve) => setTimeout(resolve, ms));
}

async function resolvePublicAddresses(hostname) {
  const [ipv4Result, ipv6Result] = await Promise.allSettled([dns.resolve4(hostname), dns.resolve6(hostname)]);
  const ipv4 = ipv4Result.status === "fulfilled" ? ipv4Result.value : [];
  const ipv6 = ipv6Result.status === "fulfilled" ? ipv6Result.value : [];
  const addresses = [...ipv4, ...ipv6];
  if (addresses.length) return { addresses, hostname, ipv4, ipv6 };

  const errors = [ipv4Result, ipv6Result]
    .filter((result) => result.status === "rejected")
    .map((result) => result.reason instanceof Error ? result.reason.message : String(result.reason));
  throw new Error(errors.join("; ") || "no DNS addresses published yet");
}

export async function waitForPublicDnsReady(publicBaseUrl, { intervalMs = 1000, requireIpv4 = false, timeoutMs = 45_000 } = {}) {
  const hostname = publicHostname(publicBaseUrl);
  const startedAt = Date.now();
  let lastError;
  while (Date.now() - startedAt < timeoutMs) {
    try {
      const resolved = await resolvePublicAddresses(hostname);
      if (!requireIpv4 || resolved.ipv4.length) return resolved;
      lastError = new Error("no IPv4 addresses published yet");
    } catch (error) {
      lastError = error;
    }
    await sleep(intervalMs);
  }
  const detail = lastError instanceof Error ? lastError.message : String(lastError ?? "no response");
  throw new Error(`Timed out waiting for DNS records for ${hostname}: ${detail}`);
}

function requestWithResolvedAddress(url, publicDns, timeoutMs) {
  const target = new URL(url);
  if (target.protocol !== "https:") throw new Error(`Expected an https URL, got ${url}`);
  const address = publicDns.ipv4[0] ?? publicDns.ipv6[0];
  const family = publicDns.ipv4.length ? 4 : 6;

  return new Promise((resolve, reject) => {
    const req = request({
      headers: { host: target.host, "user-agent": "dune-3v3-tunnel-check" },
      hostname: target.hostname,
      lookup: (_hostname, options, callback) => {
        if (typeof options === "function") {
          options(null, address, family);
          return;
        }
        if (options?.all) {
          callback(null, [{ address, family }]);
          return;
        }
        callback(null, address, family);
      },
      method: "GET",
      path: `${target.pathname}${target.search}`,
      port: target.port || 443,
      servername: target.hostname,
      timeout: timeoutMs,
    }, (response) => {
      response.resume();
      resolve(response.statusCode ?? 0);
    });
    req.once("error", reject);
    req.once("timeout", () => {
      req.destroy(new Error(`Timed out after ${timeoutMs}ms`));
    });
    req.end();
  });
}

export async function waitForPublicHttpReady(url, {
  intervalMs = 1000,
  requireIpv4 = false,
  timeoutMs = 45_000,
} = {}) {
  const startedAt = Date.now();
  let lastError;
  while (Date.now() - startedAt < timeoutMs) {
    try {
      const publicDns = await waitForPublicDnsReady(url, {
        intervalMs,
        requireIpv4,
        timeoutMs: Math.min(intervalMs, Math.max(1, timeoutMs - (Date.now() - startedAt))),
      });
      const status = await requestWithResolvedAddress(url, publicDns, Math.min(intervalMs, 5000));
      if (status < 400) return { ...publicDns, status };
      lastError = new Error(`HTTP ${status}`);
    } catch (error) {
      lastError = error;
    }
    await sleep(intervalMs);
  }
  const detail = lastError instanceof Error ? lastError.message : String(lastError ?? "no response");
  throw new Error(`Timed out waiting for ${url} to respond through the tunnel: ${detail}`);
}

export function startTryCloudflareTunnel({
  cloudflaredBin = "cloudflared",
  log = () => undefined,
  originUrl,
  timeoutMs = 60_000,
} = {}) {
  if (!originUrl) throw new Error("originUrl is required");
  const child = spawn(cloudflaredBin, ["tunnel", "--url", originUrl], {
    stdio: ["ignore", "pipe", "pipe"],
  });
  let publicUrl;
  let readySettled = false;
  let outputTail = "";
  let resolveReady;
  let rejectReady;
  const ready = new Promise((resolve, reject) => {
    resolveReady = resolve;
    rejectReady = reject;
  });
  const timeout = setTimeout(() => {
    if (readySettled) return;
    readySettled = true;
    rejectReady(new Error(`Timed out waiting for a trycloudflare.com URL from ${cloudflaredBin}`));
  }, timeoutMs);

  function settleReady(url) {
    if (readySettled) return;
    readySettled = true;
    clearTimeout(timeout);
    resolveReady(url);
  }

  function failReady(error) {
    if (readySettled) return;
    readySettled = true;
    clearTimeout(timeout);
    rejectReady(error);
  }

  function handleOutput(prefix, chunk) {
    const text = chunk.toString();
    outputTail = `${outputTail}${text}`.slice(-4000);
    for (const line of text.split(/\r?\n/).filter(Boolean)) log(`${prefix} ${line}`);
    const match = outputTail.match(tryCloudflareUrlPattern);
    if (match) {
      publicUrl = match[0];
      settleReady(publicUrl);
    }
  }

  child.stdout.on("data", (chunk) => handleOutput("cloudflared |", chunk));
  child.stderr.on("data", (chunk) => handleOutput("cloudflared |", chunk));
  child.once("error", (error) => {
    failReady(new Error(`Unable to start ${cloudflaredBin}: ${error.message}`));
  });
  child.once("exit", (code, signal) => {
    clearTimeout(timeout);
    if (!publicUrl) {
      failReady(new Error(`${cloudflaredBin} exited before publishing a URL (${signal ?? code}).\n${outputTail.trim()}`));
    }
  });

  async function close() {
    clearTimeout(timeout);
    if (child.exitCode !== null || child.signalCode !== null) return;
    await new Promise((resolve) => {
      const killTimer = setTimeout(() => {
        if (child.exitCode === null && child.signalCode === null) child.kill("SIGKILL");
      }, 3000);
      child.once("exit", () => {
        clearTimeout(killTimer);
        resolve();
      });
      child.kill("SIGTERM");
    });
  }

  return { close, process: child, ready };
}
