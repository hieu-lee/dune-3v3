const makerSpiceAssetSpaceIds = new Set([
  "deep-desert",
  "habbanya-erg",
  "hagga-basin",
  "imperial-basin",
]);

export const makerSpiceAssetCounts = [1, 2, 3, 4, 5] as const;

export function makerSpiceAssetPathFor(spaceId: string, bonusSpice: number) {
  if (!makerSpiceAssetSpaceIds.has(spaceId)) return undefined;
  if (!makerSpiceAssetCounts.some((count) => count === bonusSpice)) return undefined;
  return `/assets/dune-cards-hub/location/maker-spice/uprising-location-${spaceId}-${bonusSpice}-extra-spice.webp`;
}
