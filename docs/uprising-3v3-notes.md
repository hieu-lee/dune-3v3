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

- Browser debugging should use the repo-owned Playwright pipeline documented in `docs/browser-testing-pipeline.md`. Use `pnpm run debug:browser` for scripted headless screenshots, per-capture game-state snapshots, console/request logs, and a Playwright trace under `artifacts/qa/browser-debug`. Use `pnpm run debug:browser:headed -- --scenario all` to watch scripted browser play, or `pnpm run debug:browser:manual` for an interactive Chromium session when the Codex in-app browser is unavailable. During manual debugging, `Ctrl/Cmd+Shift+S` and `window.__DUNE_DEBUG__.capture("label")` write a screenshot plus matching game-state JSON into the active artifact directory.
- The Spice Must Flow uses typed acquire effects for its fixed 1 VP and 1 spice rewards. Interstellar Trade uses typed acquire effects for its Influence choice and face-up CHOAM contract bonus. Price is No Object uses a typed acquire effect for its 2 Solari reward and a typed Agent acquire-card effect for buying a card to hand with Solari, Priority Contracts uses typed Agent effects for its 2 spice, 1 VP, and face-up CHOAM contract rewards, Dangerous Rhetoric uses a typed Agent Influence-choice effect with source-card trash, Subversive Advisor and Overthrow use typed Agent current Faction board-space Influence bonuses (Subversive Advisor trashes itself), Desert Survival uses typed optional Agent source-card trash, Tread in Darkness and Shishakli use typed optional Agent source-card trash with draw rewards, Guild Spy uses typed Agent discard-for-draw with a Spacing Guild discard Intrigue bonus, Long Live the Fighters uses typed Agent top-deck selection to draw, discard, and trash one inspected card each, Branching Path uses typed optional Agent selected-Intrigue trash for an Intrigue draw and spice reward gated by Bene Gesserit Alliance, In High Places uses typed Agent draw and spy placement gated by another Bene Gesserit card in play, Overthrow also uses a typed acquire effect for its Intrigue draw, and Guild Spy, In High Places, Spy Network, Strike Fleet, and Subversive Advisor use typed acquire effects for their spy placement rewards. The acquire resolver treats explicit acquire specs as authoritative, so legacy display fields such as The Spice Must Flow's `acquired` field do not double-count rewards.
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
- During Combat, Commanders play each Combat Intrigue on behalf of one eligible Ally and apply the whole effect to that Ally.
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
- Current Imperium card implementation automates Steersman's typed Recall Agent reward: after resolving board and card rewards, the just-sent Agent returns to ready supply and the visited space is left unoccupied.
- Current Imperium card implementation automates Calculus of Power's typed Agent selected-card trash reward through the shared trash-card pending surface.
- Current Commander starter-card implementation automates Imperial Tent, Command Respect's typed Swordmaster-gated trash-to-trade effect, Demand Attention's typed optional faction Influence payment, Desert Call's typed optional water-for-sandworm trash payment, Threaten Spice Production's typed shared 7-spice VP/trash payment, Usul's Muad'Dib/activated-Ally water-or-spice split, Critical Shipments' Shaddam/activated-Ally water-or-2-Solari split, Demand Results' typed optional 2-Solari public-contract assignment/trash payment, Corrino Might's typed optional 3-spice Reveal troop payment, and Devastating Assault's typed Agent reward and declarative Swordmaster-gated Reveal payment.
- Current Maker-space implementation tracks bonus spice on Imperial Basin, Habbanya Erg, Hagga Basin, and Deep Desert, then pays and clears that bonus when an Agent visits the space. Hagga Basin and Deep Desert defer their base spice into a spice-or-sandworm choice when a Muad'Dib Ally has Maker Hooks and the Shield Wall allows worms. Sietch Tabr handles Maker Hooks/troop/water or water plus Shield Wall removal.
- Current High Council implementation tracks the four persistent Council seats, adds 2 persuasion during each seated player's Reveal turn, and only pays the printed 2nd+ reward on later High Council visits.
- Current Objective setup deals the four Objectives valid for six players only to Allies, applies the 4/6P Desert Mouse cross-team trade, and uses the first-player Desert Mouse Objective for the first seat.
- Current Conflict-card implementation awards the won card to the unique winning Ally, pauses for same-team tie concessions at any reward rank, scores immediate non-wild battle-icon pairs against that Ally's face-up Objectives or won Conflicts, sets critical-location control markers, pays controlled-space visit income, queues optional defensive supply-troop deployment when a controlled-location Conflict is revealed, and automates first-, second-, and third-place printed rewards for the imported Uprising Conflict deck with tie reward rules, same-team concession rewards, sandworm-doubled repeat payments, and undoubled battle icons/location control.
- Current Endgame implementation triggers during Recall when a player reaches 10 VP or the Conflict deck is empty, then lets Allies score Crysknife, Desert Mouse, and Ornithopter Endgame Intrigues against matching or wild face-up Conflict cards before finalizing team scores.
- Current conditional Endgame Intrigue implementation scores Secure Spice Trade for 1 VP and 2 spice when a player has at least two The Spice Must Flow cards, CHOAM Profits for 1 VP when a player has at least four completed contracts, and Shadow Alliance for 1 VP when a player has 4+ effective Influence on a Faction where the opposing team owns the Alliance.
- Current Alliance implementation lets table players assign the single Alliance token owner for each Faction from player panels and automatically moves the token VP on claim, transfer, or return.
- Current CHOAM contract implementation lets table players manually mark taken contracts complete for printed contract requirements.
- Current Imperium-card implementation exposes both Reserve stacks, resolves Smuggler's Harvester's Maker-space Agent spice, Smuggler's Haven's Agent sandworm payment plus Maker-spy Reveal spice, Desert Survival's optional Agent source-card trash, Tread in Darkness's another-Bene-Gesserit source-card trash draw, Shishakli's source-card trash draw plus Fremen Bond Reveal Influence, Guild Spy's Agent discard draw with Spacing Guild discard Intrigue bonus, Long Live the Fighters' top-deck draw/discard/trash selection, Priority Contracts' Agent spice/VP/face-up contract rewards, Branching Path's optional Bene Gesserit Alliance-gated Intrigue trash reward, Subversive Advisor's current Faction board-space Influence bonus and source trash, Overthrow's non-trash current Faction board-space Influence bonus, and Spacing Guild's Favor's Agent draw plus hand-discard spice trigger through typed specs, keeps cleanup discard from triggering Spacing Guild's Favor, resolves Interstellar Trade's Reveal persuasion from completed contracts when the Reveal plan is created, queues Interstellar Trade's acquire Influence choice and face-up CHOAM contract bonus, prompts Calculus of Power's optional Reveal trash for another Emperor card in play before adding its 3 strength, and resolves Prepare The Way's 2+ Bene Gesserit Influence Agent draw with 3v3 shared Influence.
- Current Plot Intrigue implementation lets the active player gain 1 spice from the Plot side of Crysknife, Desert Mouse, and Ornithopter during Agent or Reveal turns. Contingency Plan can gain 2 Solari as Plot or add 3 strength as Combat. Inspire Awe acquires a card that costs 3 or less to discard, or to hand when the player has a sandworm in the Conflict; Commanders can use the activated Ally's sandworm for that threshold. Manipulate removes and replaces an Imperium Row card, then lets that player acquire the removed card for 1 Persuasion less during their Reveal turn that round. Leverage can be played after the active player has gained spice that turn, then gains 1 Solari and may take a face-up CHOAM contract. Distraction can be played after the active player deploys three or more units in a turn, then may place a spy on the same observation post as another player's spy. Intelligence Report draws 1 card, or 2 cards with two or more own spies on the board. Cunning draws 1 card, or spends 1 spice to draw 1 card and then trash 1 card. Sietch Ritual discards a hand card for Bene Gesserit or Fremen/Fringe Influence, with Commander game-board Influence going to the activated Ally and Muad'Dib allowed to use personal Fremen. Change Allegiances loses Influence for Influence, spends 3 spice for Influence, or resolves both rows, with Commander main-board Influence routed through the activated Ally and personal Emperor/Fremen kept by the matching Commander. Special Mission places one of the actor's spies on a City observation post or recalls one of the actor's spies to remove the Shield Wall and gain 2 spice. Opportunism spends 2 Solari and loses any payable pair of Influence for 1 VP. Buy Access spends 5 Solari for two different printed faction-icon Influence bumps, with Commander game-board Influence going to the activated Ally and Shaddam/Muad'Dib allowed to use their matching personal-board Faction. Imperium Politics spends 1 Solari for Emperor/Great Houses or Spacing Guild Influence, with Commander game-board Influence going to the activated Ally and Shaddam allowed to choose personal Emperor Influence. Depart For Arrakis spends 2 spice to recruit 3 troops for the player or Commander's activated Ally, and draws 1 card with 3+ effective Fremen/Fringe Influence. Councilor's Ambition gains 2 water once the player has a High Council seat. Mercenaries spends 3 Solari to draw 1 Intrigue and recruit 2 troops for the player or Commander's activated Ally. Call to Arms makes each card acquired during that Reveal turn recruit 1 troop. Strategic Stockpiling can spend 5 spice for 1 VP, and/or spend 3 water for 1 VP with 3+ effective Spacing Guild Influence. Shaddam's Favor recruits 1 troop for the player or Commander's activated Ally, and gains 3 Solari with 3+ effective Emperor/Great Houses Influence. Market Opportunity exchanges 2 spice for 5 Solari or 5 Solari for 5 spice. Backed by CHOAM can lose 1 chosen Influence for 4 Solari as Plot or add 4 strength in Combat once the actor has completed at least two contracts. Weirding Combat adds 3 strength, or 5 with 3+ effective Bene Gesserit Influence. Impress adds 2 strength and makes the chosen recipient acquire a card that costs 3 or less. Find Weakness adds 2 strength and may recall one of the actor's spies for 3 more strength; Commanders spend their own spy and apply the strength to the chosen Ally. Questionable Methods adds 1 strength and may have the chosen combat recipient lose 1 Influence, or a Commander lose personal Influence, for 4 more strength. Reach Agreement retreats one or two chosen-recipient troops, then makes that recipient take a face-up CHOAM contract or collect the no-contract fallback. Go To Ground retreats one or two chosen-recipient troops, then may place that recipient's spy. Spring The Trap requires recalling two actor-owned spies, then adds 7 strength to the chosen combat recipient after both recalls resolve. Devour adds 2 strength, or 4 with optional card trashing when the recipient has a sandworm in the Conflict. Detonation can remove the Shield Wall or queue up to four troop deployments from the player's or Commander's activated Ally's garrison. Unexpected Allies spends 2 water to summon a sandworm without Maker Hooks and can optionally remove the Shield Wall.
- Current leader implementation automates Muad'Dib's Lead the Way Signet Ring draw, Shaddam's Emperor of the Known Universe Signet Ring deployment block plus Solari troop/Influence choice, Gurney Halleck's Warmaster/Always Smiling abilities, Feyd-Rautha Harkonnen's Devious Strength Reveal-turn spy recall, Lady Amber Metulli's Alliance-gated Fill Coffers Signet reward and Desert Scouts Reveal-turn troop retreat, Lady Margot Fenring's Loyalty Bene Gesserit threshold reward and Arrakis Informant Signet spy placement, Staban Tuek's Limited Allies starter-deck change plus Smuggle Spice and Unseen Network spy rewards, Lady Jessica's typed Spice Agony Intrigue plus troop-memory payment and typed Other Memories leader transition, Reverend Mother Jessica's Water of Life Signet payment and generic `repeat-board-space` Bene/Fremen board-space repeat, the Other Memories repeat follow-up through that same pending primitive, and Princess Irulan's Imperial Birthright plus typed Chronicler's Insight Signet pending choice.
- Full leader card images are available from the player seats as table references while icon-heavy leader powers await structured automation.
- Board-space tiles render local location-card art where the catalog has exact name matches. Six-player-only spaces use extracted official six-player supplement thumbnails named `uprising-location-<space-id>.webp`; six-player `Swordmaster` and Shaddam's personal `Sardaukar` use `-6p` filenames where the catalog image would show the wrong board-side values.

## Data Gaps To Fill

- Remaining automation for printed Commander starting-card effects.
- Structured automation for leader powers, signet powers, and commander board values.
- Full automation for Imperium, Intrigue, Conflict, contract, and reserve printed effects.
- Final board-space coordinates over scanned board art.
- Remaining component images, full boards, and card fronts/backs from owned scans or approved source assets.
- Remaining printed card-driven Maker Hooks, Shield Wall, or other special sandworm effects.
- Remaining structured automation for niche printed Conflict reward interactions and remaining Combat Intrigue effects.

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
- Six-player-only board-space asset exception: the Dune Cards Hub catalog does not include `Carthag`, `Controversial Technology`, `Desert Mastery`, `Economic Support`, `Expedition`, `Habbanya Erg`, `Hardy Warriors`, `Military Support`, `Vast Wealth`, or the 3-spice Shaddam `Sardaukar`; these use local `uprising-location-*.webp` files from the official Dire Wolf six-player supplement/design-diary sources. Six-player `Swordmaster` uses `uprising-location-swordmaster-6p.webp` so the catalog's standard `Swordmaster` image remains unchanged.
- TechnoTone board image lead: `https://raw.githubusercontent.com/TechnoTone/dune-imperium-uprising/master/static/img/board.jpg`
- Chatanga/DuneImmorality board URL references: `https://raw.githubusercontent.com/Chatanga/DuneImmorality/main/scripts/modules/en/Board.lua`
- No stable public source has been found yet for the Uprising six-player full board or commander personal-board images.
