# Dune Uprising 3v3 Asset Audit

Current asset status is tracked in `docs/asset-coverage.md`; this audit records source research and board-space-specific decisions.

## Sources Checked

- Official Dire Wolf six-player rules supplement: source of the exact six-player board-space guide thumbnails.
- Official Dire Wolf design diary 5: source for the visible 3-spice Shaddam `Sardaukar` personal-board tile.
- Dune Cards Hub API: source for catalog location/card images where exact 3v3 board-side values match.
- GitHub search: checked public Uprising projects and asset trees for direct `Economic Support` / `Military Support` assets; the usable exact missing board-space thumbnails came from official Dire Wolf sources instead.

## Board-Space Asset Coverage

Every `boardSpaces` entry now resolves to a local image under `public/assets/dune-cards-hub/location`.

Six-player-only overrides:

- `uprising-location-carthag.webp`
- `uprising-location-controversial-technology.webp`
- `uprising-location-desert-mastery.webp`
- `uprising-location-economic-support.webp`
- `uprising-location-expedition.webp`
- `uprising-location-habbanya-erg.webp`
- `uprising-location-hardy-warriors.webp`
- `uprising-location-military-support.webp`
- `uprising-location-swordmaster-6p.webp`
- `uprising-location-vast-wealth.webp`
- `uprising-location-sardaukar-6p.webp`

The `-6p` suffix is used where the catalog image exists but is not the six-player board-side value.

## Contract Asset Coverage

All 20 runtime CHOAM contract entries now resolve to local images under `public/assets/dune-cards-hub/contract`.

Manual override:

- `Spice Refinery I` (`sourceId` 513, `sourceSlug` `uprising-spice-refinery-i`) uses the Dune Cards Hub public card-page image at `/images/contract_uprising_15.png`, stored locally as `uprising-contract-spice-refinery-i.png`. The generated catalog and `scripts/sync-dune-catalog.mjs` keep this override because the API image fields can lag the card page.

## Verification

`pnpm run verify:board-spaces` loads `src/game/data.ts` through Vite and verifies:

- the six-player model exposes 28 placement spaces;
- catalog-backed spaces keep catalog source metadata;
- six-player-only spaces use the expected override filenames;
- every board space has a local `/assets/...` image path that exists on disk.
