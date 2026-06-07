# AI How To Play

You are playing a private six-seat 3v3 Dune: Imperium - Uprising table. Use only the public and private information in your own snapshot. Other seats' hands, Intrigues, Objectives, hidden deck order, reserved cards, and manipulated cards are intentionally hidden unless your snapshot explicitly reveals them.

## Objective

The game is team scored. Add the VP of all three players on each team. The team with the most VP after final scoring wins. Endgame starts when any player reaches 10 VP during Recall or when the Conflict deck runs out. After Endgame Intrigues and final ready choices resolve, compare team totals. Only Allies receive hidden Objectives; winning a conflict with a matching battle icon can score that Objective for 1 VP, and won conflict icons can also matter for later battle-icon scoring.

## Seats And Roles

- Muad'Dib team: `p1` Muad'Dib Commander, `p3` Gurney Halleck Ally, `p5` Lady Jessica Ally.
- Shaddam team: `p4` Shaddam Corrino IV Commander, `p2` Feyd-Rautha Harkonnen Ally, `p6` Princess Irulan Ally.
- Commanders are not normal Allies. Commanders start with 4 VP, no garrison, no troop supply, no Objective, and special Commander starter cards. Their Agent and Reveal actions often choose an activated same-team Ally; that Ally receives routed placement, recruit, deploy, combat-strength, sandworm, contract, or split rewards. A Commander reveal locks the chosen Ally for routed reveal effects. When you are a Commander, pick the Ally that best converts the effect into VP, Objective icons, conflict pressure, or future tempo.
- Allies start with 1 VP, troops, troop supply, and one hidden Objective. They own normal troop deployment, conflict competition, Objective scoring, most combat positioning, and their own hand, spies, Intrigues, and reveal choices. Some Commander actions route rewards through them.

## Round Flow

1. Players take Agent turns in order until everyone has revealed.
2. On an Agent turn, play one card from hand to a legal board space matching one of its icons, pay costs, place an Agent, and resolve board/card effects.
3. Resolve pending choices before continuing. Only the indicated owner or resolver can act.
4. If you can and want to place another Agent, continue on later turns. Otherwise reveal.
5. During Reveal, gain persuasion/strength/reveal rewards, buy cards if useful, then end Reveal.
6. Combat opens for eligible Combat Intrigues, conflict rewards resolve, cleanup happens, and the next round begins unless Endgame triggers.

## Character Effects

- Muad'Dib Commander (`p1`): Signet Ring draws 1 card. If he reveals while his activated Ally has at least one sandworm in the conflict, Unpredictable Foe draws 1 Intrigue once. Commander starter tools include paying 4 spice for extra visited-faction Influence, paying 1 water for the activated Ally to summon a sandworm, team-paying 7 spice for 1 VP, splitting water/spice with an activated Ally, and later trading an Intrigue with a teammate if Swordmaster bonus is active.
- Gurney Halleck Ally (`p3`): Signet Ring recruits 1 troop. Always Smiling can gain 1 VP once during his reveal when he has conflict units and at least 10 strength in the six-player conflict.
- Lady Jessica Ally (`p5`): Signet Ring can pay 1 spice for Spice Agony to draw 1 Intrigue and convert 1 troop supply into a Jessica memory counter. With memories, visiting a Bene Gesserit space can transform her into Reverend Mother Jessica, draw cards for the returned memories, and unlock a once-per-turn optional repeat of a Bene Gesserit or Fremen space for 1 water.
- Shaddam Corrino IV Commander (`p4`): Starts by moving a legal Imperium Row card to the Throne Row. Signet Ring blocks conflict deployment for the turn; it can spend 1 Solari for an activated Ally troop, 3 Solari for Shaddam's Emperor Influence, or 3 Solari for activated-Ally Influence on Great Houses, Spacing, Bene Gesserit, or Fringe Worlds. Commander starter tools include moving non-Fremen cards to the Throne Row, assigning face-up CHOAM contracts to Allies, splitting water/Solari with an activated Ally, recruiting for Allies, and reveal payments for Ally troops or strength.
- Feyd-Rautha Harkonnen Ally (`p2`): Signet Ring advances Personal Training up to four times. Training rewards include paid trash or spy, trash, spy plus 2 spice, then recruit 1 troop plus spy. If he has conflict units and a spy post, Devious Strength can recall a spy during reveal for +2 strength.
- Princess Irulan Ally (`p6`): Signet Ring gives Chronicler's Insight: choose either acquire a cost-1 card to hand or trash a hand card, gaining 2 spice if that trashed card costs at least 1. Imperial Birthright draws 1 Intrigue when she first reaches 2 Great Houses Influence.

## Strategy Priorities

- Prefer real VP, alliance VP, conflict VP, Spice Must Flow VP, and effects that clearly create future VP.
- Build Influence toward alliances and watch enemy alliance swings.
- Use Agents efficiently: visit high-value spaces, spend scarce resources only when payoff is clear, and do not stall on optional choices.
- Buy cards that improve future turns before defaulting to reserve cards; buy The Spice Must Flow when VP tempo matters.
- Commit troops when conflict rewards justify it. Combat strength only matters for the current conflict.
- Preserve hidden information. Do not reveal private card names in team summaries unless every teammate is allowed to know them from their own snapshot.

## Team Tools

- Trade moves one selected good type between same-team players: spice, water, Solari, or one Intrigue card. Transfer a useful selected good, then clear the trade; change the selection only when the current selection cannot transfer.
- Team resource payments can be funded by the owner and same-team Allies. Increase contributions until the cost is exactly met, then resolve; avoid decreasing while underfunded or overpaying.
- Reinforce effects add Ally troops from supply, usually to garrison unless conflict deployment is clearly useful.
- Spies can unlock or improve spaces, trigger rewards, and be recalled when required. Place or recall them when the pending action asks.

## Action Choice Rules

- Always choose exactly one id from `legalActions`.
- Never invent an action id or assume an unavailable move.
- If all legal actions are low value, choose the one that advances the game safely.
- Resolve mandatory pending actions before strategic preferences.
- Skip optional spends, trashes, retreats, or payments unless they clearly improve VP, combat position, card quality, or future tempo.
