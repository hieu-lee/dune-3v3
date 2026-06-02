import assert from "node:assert/strict";
import { existsSync, readFileSync, statSync } from "node:fs";
import { isAbsolute, join, relative, resolve, sep } from "node:path";
import { fileURLToPath } from "node:url";
import { createServer } from "vite";

const projectRoot = fileURLToPath(new URL("..", import.meta.url));
const reportPath = join(projectRoot, "docs", "asset-coverage.md");
const publicAssetsRoot = resolve(projectRoot, "public", "assets");

const knownMissingAssets = [];

const seenKnownMissingAssets = new Map();

function knownMissingKey(asset) {
  return `${asset.group}:${asset.sourceId}:${asset.sourceSlug}`;
}

function resolvePublicAssetPath(path, label) {
  const browserPath = new URL(path, "http://assets.local").pathname;
  assert.equal(browserPath, path, `${label} must be a normalized browser path`);
  assert.ok(!path.includes("\\"), `${label} must not include backslashes`);
  assert.doesNotThrow(() => decodeURIComponent(path), `${label} must not contain malformed percent-encoding`);
  assert.equal(decodeURIComponent(path), path, `${label} must not contain percent-encoded path segments`);

  const relativeAssetPath = path.replace(/^\/+/, "");
  const resolvedPath = resolve(projectRoot, "public", relativeAssetPath);
  const publicAssetsRelativePath = relative(publicAssetsRoot, resolvedPath);

  assert.ok(
    !(
      publicAssetsRelativePath === ".." ||
      publicAssetsRelativePath.startsWith(`..${sep}`) ||
      isAbsolute(publicAssetsRelativePath)
    ),
    `${label} must resolve inside public/assets`,
  );

  return resolvedPath;
}

function knownMissing(group, item) {
  return knownMissingAssets.find(
    (asset) =>
      asset.group === group &&
      asset.name === item.name &&
      asset.sourceId === item.sourceId &&
      asset.sourceSlug === item.sourceSlug,
  );
}

function assertLocalAssets(group, items, expectedCount) {
  assert.equal(items.length, expectedCount, `${group} asset group should expose ${expectedCount} entries`);
  for (const item of items) {
    const missingAsset = knownMissing(group, item);
    if (missingAsset) {
      const key = knownMissingKey(missingAsset);
      seenKnownMissingAssets.set(key, (seenKnownMissingAssets.get(key) ?? 0) + 1);
      assert.equal(item.imagePath, undefined, `${group}: ${item.name} should not expose imagePath until sourced`);
      assert.equal(item.thumbnailPath, undefined, `${group}: ${item.name} should not expose thumbnailPath until sourced`);
      continue;
    }
    for (const field of ["imagePath", "thumbnailPath"]) {
      const path = item[field];
      assert.ok(path, `${group}: ${item.name} is missing ${field}`);
      assert.equal(typeof path, "string", `${group}: ${item.name} ${field} must be a string`);
      assert.ok(path.startsWith("/assets/"), `${group}: ${item.name} ${field} must use a local /assets path`);
      const resolvedPath = resolvePublicAssetPath(path, `${group}: ${item.name} ${field}`);
      assert.ok(existsSync(resolvedPath), `${group}: ${item.name} ${field} does not exist at ${path}`);
      assert.ok(statSync(resolvedPath).isFile(), `${group}: ${item.name} ${field} must resolve to a file at ${path}`);
    }
  }
}

function assertKnownMissingAssetsSeen() {
  for (const asset of knownMissingAssets) {
    assert.equal(
      seenKnownMissingAssets.get(knownMissingKey(asset)) ?? 0,
      1,
      `${asset.group}: ${asset.name} (${asset.sourceId}/${asset.sourceSlug}) should exist exactly once as known missing`,
    );
  }
}

function assertReportMentions(report, text) {
  assert.ok(report.includes(text), `asset coverage report should mention "${text}"`);
}

const server = await createServer({
  appType: "custom",
  logLevel: "silent",
  server: { middlewareMode: true },
});

try {
  const data = await server.ssrLoadModule("/src/game/data.ts");
  const report = readFileSync(reportPath, "utf8");

  assertLocalAssets("Imperium cards", data.imperiumDeck, 54);
  assertLocalAssets("Reserve cards", data.reserveMarket, 2);
  assertLocalAssets("Ally starter cards", data.allyStarterCards, 10);
  assertLocalAssets("Muad'Dib Commander cards", data.muadDibCommanderCards, 10);
  assertLocalAssets("Emperor Commander cards", data.emperorCommanderCards, 10);
  assertLocalAssets("Intrigue cards", data.intrigueCards, 39);
  assertLocalAssets("Conflict cards", data.conflictCards, 16);
  assertLocalAssets("Leader cards", data.leaderCards, 10);
  assertLocalAssets("Board spaces", data.boardSpaces, 27);
  assertLocalAssets("Contracts", [...data.standardContracts, ...data.shaddamReservedContracts], 20);
  assertKnownMissingAssetsSeen();

  assertReportMentions(report, "# Asset Coverage");
  assertReportMentions(report, "Dune Cards Hub");
  assertReportMentions(report, "Official Dire Wolf");
  assertReportMentions(report, "Spice Refinery I");
  assertReportMentions(report, "public/assets/dune-cards-hub");
  for (const asset of knownMissingAssets) {
    assertReportMentions(report, asset.name);
    assertReportMentions(report, String(asset.sourceId));
    assertReportMentions(report, asset.sourceSlug);
    assertReportMentions(report, asset.reason);
  }

  console.log("asset coverage verification passed");
} finally {
  await server.close();
}
