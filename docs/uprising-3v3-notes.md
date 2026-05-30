# Dune: Imperium - Uprising 3v3 Implementation Notes

These notes are implementation scaffolding, not a replacement for the rulebook. Use them to keep code and future subagent tasks aligned with the six-player team mode.

## Primary References

- Official Dire Wolf resource hub: `https://www.direwolfdigital.com/dune-imperium/resources/`
- Official main rulebook PDF: `https://www.direwolfdigital.com/assets/dune/DUNE_IMPERIUM_UPRISING_Main_Rulebook_23-10-12.pdf`
- Official combined rules supplement PDF: `https://d19y2ttatozxjp.cloudfront.net/pdfs/DUNE_IMPERIUM_UPRISING_Rules_Supplements_23-10-12.pdf`
- Official design diary for six-player mode: `https://news.direwolfdigital.com/dune-imperium-uprising-design-diary-5-six-player-mode/`
- RulesPal browsable rulebook reference: `https://www.rulespal.com/dune-imperium-uprising/rulebook`
- Official card sleeve FAQ: `https://d19y2ttatozxjp.cloudfront.net/pdfs/CardSleeve_FAQ.pdf`

## Implementation Requirements

- Six players sit as two teams of three.
- Each team has one Commander and two Allies.
- Allies use the standard 10-card starting deck.
- Commander team identities:
  - Muad'Dib commands the Fremen-aligned team.
  - Shaddam Corrino IV commands the Emperor-aligned team.
- Commanders use their dedicated 10-card Commander starting decks instead of the standard starting deck.
- Use alternating seating. Clockwise from Muad'Dib: Muad'Dib, Shaddam Ally, Muad'Dib Ally, Shaddam, Muad'Dib Ally, Shaddam Ally.
- Commanders start at 4 VP. Allies start at 1 VP.
- Endgame is team-scored: sum all three players on each team.
- Each player tracks victory points individually during play; the team total determines the winner.
- Commanders use personal faction boards while Allies use the main board faction tracks.
- Commanders borrow their effective influence from whichever Ally has more influence on a main-board faction.
- Commanders do not own troops or combat markers directly; their Agent and Reveal turns activate an Ally.
- Activated Allies receive main-board influence changes, recruited troops, deployment choices, and Commander swords.
- Six-player icon mapping adds Great Houses and Fringe Worlds while retaining the normal icon vocabulary.
- Team actions include troop reinforcement and trade of one trade-good type between teammates: Intrigue cards, spice, water, or Solari.
- Swordmaster is single-use in six-player mode and then grants reveal strength each round.
- Spy icons require an owned spy on a connected observation post; the current board model tracks spy posts by nearby board space until scanned board coordinates are available.
- Dune Cards Hub's generic `Spy` attribute appears in reveal text, acquire bonuses, and conditions. Do not treat it as a play-time spy placement unless grouped/detail text confirms that timing.
- Variable printed reveal effects must pause buying/end-turn flow until the table applies the printed persuasion or strength adjustment.
- CHOAM module is mandatory in 6p; contracts and marked cards need first-class data support.
- Current CHOAM implementation uses the 18 public Uprising contracts, reserves Sardaukar I and Sardaukar II for Shaddam, exposes two face-up offers, and gives contract spaces a pending take-contract choice.
- Conflict deck uses 5 Conflict II cards over 4 Conflict III cards; no Conflict I cards.
- Current implementation builds that nine-card six-player conflict deck from the imported Uprising catalog, preserves printed battle icons, and advances it at round setup.
- Current Intrigue implementation builds the 39-card Uprising Intrigue deck from the imported catalog, draws cards into player hands, and keeps Intrigue out of tradeable resource counters.
- Current team-trade implementation transfers normal resource counters or a chosen Intrigue card between teammates.
- Current Throne Row implementation lets Shaddam's Emperor personal board setup and Imperial Tent move non-Fremen Imperium Row cards into Shaddam's team-only market with immediate row refill.
- Current Maker-space implementation tracks bonus spice on Imperial Basin, Habbanya Erg, Hagga Basin, and Deep Desert, then pays and clears that bonus when an Agent visits the space. Hagga Basin and Deep Desert defer their base spice into a spice-or-sandworm choice when a Muad'Dib Ally has Maker Hooks and the Shield Wall allows worms. Sietch Tabr handles Maker Hooks/troop/water or water plus Shield Wall removal.
- Current Objective setup deals the four Objectives valid for six players only to Allies, applies the 4/6P Desert Mouse cross-team trade, and uses the first-player Desert Mouse Objective for the first seat.
- Current Conflict-card implementation awards the won card to the unique winning Ally, pauses for same-team first-place tie concessions, scores immediate non-wild battle-icon pairs against that Ally's face-up Objectives or won Conflicts, and logs sandworm reward-doubling reminders without doubling battle icons or location control.
- Current Endgame implementation triggers during Recall when a player reaches 10 VP or the Conflict deck is empty, then lets Allies score Crysknife, Desert Mouse, and Ornithopter Endgame Intrigues against matching or wild face-up Conflict cards before finalizing team scores.
- Current conditional Endgame Intrigue implementation scores Secure Spice Trade for 1 VP and 2 spice when a player has at least two The Spice Must Flow cards, CHOAM Profits for 1 VP when a player has at least four completed contracts, and Shadow Alliance for 1 VP when a player has 4+ effective Influence on a Faction where the opposing team owns the Alliance.
- Current Alliance implementation lets table players assign the single Alliance token owner for each Faction from player panels and automatically moves the token VP on claim, transfer, or return.
- Current CHOAM contract implementation lets table players manually mark taken contracts complete for printed contract requirements.
- Current Plot Intrigue implementation lets the active player gain 1 spice from the Plot side of Crysknife, Desert Mouse, and Ornithopter during Agent or Reveal turns. Contingency Plan can gain 2 Solari as Plot or add 3 strength as Combat. Weirding Combat adds 3 strength, or 5 with 3+ effective Bene Gesserit Influence. Backed by CHOAM adds 4 strength in Combat once the actor has completed at least two contracts, while its Plot Influence-for-Solari branch remains manual. Detonation can remove the Shield Wall or queue up to four troop deployments from the player's garrison. Unexpected Allies spends 2 water to summon a sandworm without Maker Hooks and can optionally remove the Shield Wall.
- Full leader card images are available from the player seats as table references while icon-heavy leader powers await structured automation.
- Board-space tiles render local location-card art where the catalog has exact name matches; six-player-only and commander personal-board spaces stay text-only until scanned board art is available.

## Data Gaps To Fill

- Full automation for printed Commander starting-card effects.
- Structured automation for leader powers, signet powers, and commander board values.
- Full automation for Imperium, Intrigue, Conflict, contract, and reserve printed effects.
- Final board-space coordinates over scanned board art.
- Remaining component images and card fronts/backs from owned scans or approved source assets.
- Remaining printed card-driven Maker Hooks, Shield Wall, or other special sandworm effects.
- Structured printed Conflict rewards, including exact rank reward payment and doubled payment application, plus remaining Combat Intrigue effects.

## Asset Conventions

Expected future paths:

- `public/assets/board/uprising-6p-board.jpg`
- `public/assets/boards/muaddib-board.jpg`
- `public/assets/boards/shaddam-board.jpg`
- `public/assets/cards/imperium/<card-id>.jpg`
- `public/assets/cards/intrigue/<card-id>.jpg`
- `public/assets/cards/conflict/<card-id>.jpg`
- `public/assets/dune-cards-hub/leader/<leader-id>.webp`

The UI should stay usable without these files and automatically upgrade when files exist.

## Research Leads For Data Import

- Dune Cards Hub API: `https://dunecardshub.com/api/cards`
- Dune Cards Hub attributes: `https://dunecardshub.com/api/cards/attributes`
- Dune Cards Hub leaders: `https://dunecardshub.com/api/cards/leaders`
- Dune Cards Hub search: `https://dunecardshub.com/api/cards/search?q=Arrakis%20Revolt`
- DuneBlend structured card data: `https://github.com/anttttti/DuneBlend`
- Dune Imperium Assets visual lookup: `https://www.duneimperiumassets.com/`
- TechnoTone Uprising reference app: `https://github.com/TechnoTone/dune-imperium-uprising`
- DuneImmorality TTS implementation architecture: `https://github.com/Chatanga/DuneImmorality`
- Uprising 6p table generator: `https://github.com/kha1ne/diu6p`
- Fan 3v3 FAQ: `https://tesera.ru/images/items/2513457/Dune%20Uprising%203v3%20FAQ.pdf`

Keep official PDFs as the rules authority. Fan JSON, images, and repos are extraction aids for private playgroup asset/data entry.

## Asset Leads

- Dune Cards Hub image paths should come from the API fields, not generated slugs. Some filenames intentionally contain typos.
- Example Dune Cards Hub card image: `https://dunecardshub.com/images/uprising-imperium-guild-envoy.webp`
- Example Dune Cards Hub leader image: `https://dunecardshub.com/images/uprising-leader-muad-dib.webp`
- TechnoTone board image lead: `https://raw.githubusercontent.com/TechnoTone/dune-imperium-uprising/master/static/img/board.jpg`
- Chatanga/DuneImmorality board URL references: `https://raw.githubusercontent.com/Chatanga/DuneImmorality/main/scripts/modules/en/Board.lua`
- No stable public source has been found yet for the Uprising six-player full board or commander personal-board images.
