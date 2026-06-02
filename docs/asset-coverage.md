# Asset Coverage

This report tracks the private-play visual assets currently wired into the game. The verifier for this report is `pnpm run verify:assets`.

## Source Policy

- Dune Cards Hub is the primary catalog source for card, leader, contract, conflict, intrigue, and standard board-space images.
- Official Dire Wolf six-player supplement and design-diary images are the authority for six-player-only board-space tiles when the catalog image is missing or represents the non-3v3 board.
- Local runtime paths should live under `public/assets/dune-cards-hub` and be referenced through `/assets/...` paths in game data.
- Remote URLs in the generated catalog are source metadata only; runtime UI should not depend on remote image loading.

## Coverage Summary

| Asset class | Runtime entries | Local image coverage | Notes |
| --- | ---: | --- | --- |
| Imperium cards | 54 | 54 / 54 | Dune Cards Hub `imperium` images. |
| Reserve cards | 2 | 2 / 2 | Dune Cards Hub `other` images. |
| Ally starter cards | 10 | 10 / 10 | Dune Imperium/Uprising `other` images. |
| Muad'Dib Commander cards | 10 | 10 / 10 | Dune Cards Hub `other` images. |
| Emperor Commander cards | 10 | 10 / 10 | Dune Cards Hub `other` images. |
| Intrigue cards | 39 | 39 / 39 | Dune Cards Hub `intrigue` images. |
| Conflict cards | 16 | 16 / 16 | Dune Cards Hub `conflict` images. |
| Leader cards | 10 | 10 / 10 | Dune Cards Hub `leader` images. |
| Board spaces | 27 | 27 / 27 | Catalog art plus six-player official overrides. |
| CHOAM contracts | 20 | 20 / 20 | `Spice Refinery I` uses the Dune Cards Hub card-page image override. |

## Board-Space Overrides

The following six-player board-space tiles intentionally use local override files instead of plain catalog location art:

- `carthag`: `/assets/dune-cards-hub/location/uprising-location-carthag.webp`
- `controversial-tech`: `/assets/dune-cards-hub/location/uprising-location-controversial-technology.webp`
- `desert-mastery`: `/assets/dune-cards-hub/location/uprising-location-desert-mastery.webp`
- `economic-support`: `/assets/dune-cards-hub/location/uprising-location-economic-support.webp`
- `expedition`: `/assets/dune-cards-hub/location/uprising-location-expedition.webp`
- `habbanya-erg`: `/assets/dune-cards-hub/location/uprising-location-habbanya-erg.webp`
- `hardy-warriors`: `/assets/dune-cards-hub/location/uprising-location-hardy-warriors.webp`
- `military-support`: `/assets/dune-cards-hub/location/uprising-location-military-support.webp`
- `sardaukar`: `/assets/dune-cards-hub/location/uprising-location-sardaukar-6p.webp`
- `swordmaster`: `/assets/dune-cards-hub/location/uprising-location-swordmaster-6p.webp`
- `vast-wealth`: `/assets/dune-cards-hub/location/uprising-location-vast-wealth.webp`

These are also covered by `pnpm run verify:board-spaces`.

## Manual Asset Overrides

- `Spice Refinery I` CHOAM contract (`sourceId` 513, `sourceSlug` `uprising-spice-refinery-i`): the Dune Cards Hub API entry still needs the local override path, but the public card page exposes the image used at `/assets/dune-cards-hub/contract/uprising-contract-spice-refinery-i.png`.

## Verification

- `pnpm run verify:assets` loads `src/game/data.ts` through Vite, checks the expected runtime counts for every asset class, verifies every `imagePath` and `thumbnailPath` is a normalized local browser path that resolves to a file under `public/assets`, and confirms this report documents the manual `Spice Refinery I` contract image override.
- `pnpm run verify:board-spaces` separately checks exact six-player board-space override filenames.
- `pnpm run verify` includes `verify:assets` through `scripts/verify-all.mjs`.
