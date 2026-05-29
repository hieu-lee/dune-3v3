import { mkdir, writeFile } from "node:fs/promises";
import { basename, join } from "node:path";

const HUB_ORIGIN = "https://dunecardshub.com";
const CATALOG_PATH = "src/game/uprising-catalog.generated.json";
const LOCAL_ASSET_ROOT = "public/assets/dune-cards-hub";

const downloadImages = process.argv.includes("--download-images");

async function fetchJson(path) {
  const response = await fetch(`${HUB_ORIGIN}${path}`);
  if (!response.ok) throw new Error(`GET ${path} failed: ${response.status}`);
  return response.json();
}

function attributeValue(value) {
  if (value === null || value === undefined) return null;
  const numberValue = Number(value);
  return Number.isFinite(numberValue) ? numberValue : value;
}

function localAssetPath(card, imagePath) {
  if (!imagePath) return null;
  return `/assets/dune-cards-hub/${card.type}/${basename(imagePath)}`;
}

async function downloadImage(card, imagePath) {
  if (!imagePath) return false;
  const url = `${HUB_ORIGIN}${imagePath}`;
  const outputDir = join(LOCAL_ASSET_ROOT, card.type);
  await mkdir(outputDir, { recursive: true });
  const response = await fetch(url);
  if (!response.ok) {
    console.warn(`Skipping ${url}: ${response.status}`);
    return false;
  }
  await writeFile(join(outputDir, basename(imagePath)), Buffer.from(await response.arrayBuffer()));
  return true;
}

async function imageExists(imagePath) {
  if (!imagePath) return false;
  const response = await fetch(`${HUB_ORIGIN}${imagePath}`, { method: "HEAD" });
  return response.ok;
}

const cards = await fetchJson("/api/cards");
const attributesPayload = await fetchJson("/api/cards/attributes");
const attributesByCard = new Map();

for (const attribute of attributesPayload.attributes ?? []) {
  const list = attributesByCard.get(attribute.cardId) ?? [];
  list.push([attribute.attributeName, attributeValue(attribute.value)]);
  attributesByCard.set(attribute.cardId, list);
}

const uprisingCards = [];

for (const card of cards
  .filter((card) => card.expansionName === "Uprising")
  .sort((left, right) => left.type.localeCompare(right.type) || left.name.localeCompare(right.name))) {
  const fullImageAvailable = card.fullImagePath ? await imageExists(card.fullImagePath) : false;
  const thumbnailAvailable = card.thumbnailImagePath ? await imageExists(card.thumbnailImagePath) : false;
  uprisingCards.push({
    id: card.id,
    name: card.name,
    type: card.type,
    displayType: card.displayType,
    slug: card.slug,
    fullImageUrl: fullImageAvailable ? `${HUB_ORIGIN}${card.fullImagePath}` : null,
    thumbnailImageUrl: thumbnailAvailable ? `${HUB_ORIGIN}${card.thumbnailImagePath}` : null,
    localImagePath: null,
    localThumbnailPath: null,
    attributes: attributesByCard.get(card.id) ?? [],
  });
}

const catalog = {
  source: `${HUB_ORIGIN}/api/cards`,
  attributesSource: `${HUB_ORIGIN}/api/cards/attributes`,
  expansion: "Uprising",
  counts: uprisingCards.reduce((counts, card) => {
    counts[card.type] = (counts[card.type] ?? 0) + 1;
    return counts;
  }, {}),
  cards: uprisingCards,
};

await mkdir("src/game", { recursive: true });
await writeFile(CATALOG_PATH, `${JSON.stringify(catalog)}\n`);

if (downloadImages) {
  for (const card of uprisingCards) {
    if (!card.fullImageUrl) continue;
    const downloaded = await downloadImage(card, new URL(card.fullImageUrl).pathname);
    if (downloaded) {
      const remotePath = new URL(card.fullImageUrl).pathname;
      card.localImagePath = localAssetPath(card, remotePath);
      card.localThumbnailPath = localAssetPath(card, remotePath);
    }
  }
  await writeFile(CATALOG_PATH, `${JSON.stringify(catalog)}\n`);
}

console.log(`Wrote ${uprisingCards.length} Uprising cards to ${CATALOG_PATH}.`);
if (downloadImages) console.log(`Downloaded images to ${LOCAL_ASSET_ROOT}.`);
