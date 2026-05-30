# Dune 3v3

Private web-table implementation for a six-player `Dune: Imperium - Uprising` team game.

## Current Slice

- Vite + React + TypeScript client.
- Six seats split into Muad'Dib and Shaddam teams.
- Hotseat turn flow for agent turns and reveal turns.
- Board space model for the 6-player surface.
- Resource, influence, conflict, hand, and Imperium row UI foundations.
- Imported Uprising Imperium cards with local WebP card art.
- Exact standard Ally and Commander starting decks with local card fronts.
- Catalog-backed Uprising leader roster with local leader card art.
- Full leader-card reference modal from each seat.
- Catalog-backed six-player Conflict deck display.
- CHOAM contract bank with two face-up offers, contract-space pickup flow, and Shaddam's reserved Sardaukar contracts.
- Catalog-backed Intrigue deck with physical card draws and active-player references.
- Team trade flow supports spice, water, Solari, and chosen Intrigue-card transfers.
- Shaddam Throne Row support for Emperor-board setup, Imperial Tent movement, and Shaddam-team acquisition.
- Catalog-backed board-space art on matching placement tiles.
- Printed reveal adjustments and spy-post targeting for cards whose text is not reducible to a fixed number.
- Asset pipeline conventions for owned scans or public reference images.

## Run

```bash
pnpm install
pnpm dev
```

Open the URL printed by Vite.

## Asset Policy

The app is designed to use local physical-copy scans or other assets the play group supplies in `public/assets`. The first checked-in version uses generated CSS treatments and structured metadata so the game can run before final board/card art is wired in.

## Card Catalog

```bash
pnpm sync:cards
pnpm sync:card-images
```

`sync:cards` refreshes the compact Uprising catalog from Dune Cards Hub. `sync:card-images` also downloads referenced images into `public/assets/dune-cards-hub` for private local play.
