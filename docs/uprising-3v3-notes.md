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
- Commander team identities:
  - Muad'Dib commands the Fremen-aligned team.
  - Shaddam Corrino IV commands the Emperor-aligned team.
- Use alternating seating. Clockwise from Muad'Dib: Muad'Dib, Shaddam Ally, Muad'Dib Ally, Shaddam, Muad'Dib Ally, Shaddam Ally.
- Commanders start at 4 VP. Allies start at 1 VP.
- Endgame is team-scored: sum all three players on each team.
- Each player tracks victory points individually during play; the team total determines the winner.
- Commanders use personal faction boards while Allies use the main board faction tracks.
- Commanders borrow their effective influence from whichever Ally has more influence on a main-board faction.
- Commanders do not own troops or combat markers directly; their Agent and Reveal turns activate an Ally.
- Activated Allies receive main-board influence changes, recruited troops, deployment choices, and Commander swords.
- Six-player icon mapping adds Great Houses and Fringe Worlds while retaining the normal icon vocabulary.
- Team actions include troop reinforcement and trade of one trade-good type between teammates.
- Swordmaster is single-use in six-player mode and then grants reveal strength each round.
- CHOAM module is mandatory in 6p; contracts and marked cards need first-class data support.
- Conflict deck uses 5 Conflict II cards over 4 Conflict III cards; no Conflict I cards.

## Data Gaps To Fill

- Full starting deck card list and exact card text for Muad'Dib and Shaddam.
- Exact leader roster, signet powers, and commander board values.
- Full Imperium deck, Intrigue deck, Conflict deck, and reserve card data.
- Final board-space coordinates over scanned board art.
- Component images and card fronts/backs from owned scans or approved source assets.
- Throne Row behavior for Shaddam.
- Objective-card distribution and team-balanced Desert Mouse/Crysknife setup.

## Asset Conventions

Expected future paths:

- `public/assets/board/uprising-6p-board.jpg`
- `public/assets/boards/muaddib-board.jpg`
- `public/assets/boards/shaddam-board.jpg`
- `public/assets/cards/imperium/<card-id>.jpg`
- `public/assets/cards/intrigue/<card-id>.jpg`
- `public/assets/cards/conflict/<card-id>.jpg`
- `public/assets/leaders/<leader-id>.jpg`

The UI should stay usable without these files and automatically upgrade when files exist.

## Research Leads For Data Import

- Dune Cards Hub API: `https://dunecardshub.com/api/cards`
- Dune Cards Hub attributes: `https://dunecardshub.com/api/cards/attributes`
- Dune Cards Hub search: `https://dunecardshub.com/api/cards/search?q=Arrakis%20Revolt`
- DuneBlend structured card data: `https://github.com/anttttti/DuneBlend`
- Dune Imperium Assets visual lookup: `https://www.duneimperiumassets.com/`
- TechnoTone Uprising reference app: `https://github.com/TechnoTone/dune-imperium-uprising`
- DuneImmorality TTS implementation architecture: `https://github.com/Chatanga/DuneImmorality`
- Uprising 6p table generator: `https://github.com/kha1ne/diu6p`
- Fan 3v3 FAQ: `https://tesera.ru/images/items/2513457/Dune%20Uprising%203v3%20FAQ.pdf`

Keep official PDFs as the rules authority. Fan JSON, images, and repos are extraction aids for private playgroup asset/data entry.
