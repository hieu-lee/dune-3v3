import assert from "node:assert/strict";
import { hasPlotEffect } from "./verify-card-effect-spec-helpers.mjs";
import { playerById } from "./verify-starter-decks-fixtures.mjs";

export function verifyCardEffectSpecMercenaries({
  cards,
  effectResolver,
  game,
  players,
  state,
  withActivePlayer,
}) {
  const { backedByChoam, mercenaries } = cards;
  const { p2, p4, p6 } = players;
  assert.ok(
    hasPlotEffect(
      mercenaries,
      (effect) =>
        effect.kind === "spend-resource" &&
        effect.selector === "self" &&
        effect.resource === "solari" &&
        effect.amount === 3,
    ),
    "Mercenaries should carry a typed Plot Solari spend spec",
  );
  assert.ok(
    hasPlotEffect(
      mercenaries,
      (effect) =>
        effect.kind === "draw-intrigues" &&
        effect.selector === "self" &&
        effect.amount === 1,
    ),
    "Mercenaries should carry a typed Plot Intrigue draw spec",
  );
  assert.ok(
    mercenaries.effects?.some(
      (spec) =>
        spec.trigger === "plot-intrigue" &&
        spec.conditions?.some(
          (condition) =>
            condition.kind === "has-role" && condition.role === "Ally",
        ) &&
        spec.effects.some(
          (effect) =>
            effect.kind === "recruit-troops" &&
            effect.selector === "self" &&
            effect.amount === 2,
        ),
    ),
    "Mercenaries should carry a typed Plot self troop recruit spec for Allies",
  );
  assert.ok(
    mercenaries.effects?.some(
      (spec) =>
        spec.trigger === "plot-intrigue" &&
        spec.conditions?.some(
          (condition) =>
            condition.kind === "has-role" && condition.role === "Commander",
        ) &&
        spec.effects.some(
          (effect) =>
            effect.kind === "recruit-troops" &&
            effect.selector === "activated-ally" &&
            effect.amount === 2,
        ),
    ),
    "Mercenaries should carry a typed Plot activated-Ally troop recruit spec for Commanders",
  );
  const mercenariesAllyResolved = effectResolver.resolveGameEffects(
    mercenaries.effects,
    {
      trigger: "plot-intrigue",
      source: p2,
      state: game,
    },
  );
  assert.equal(
    mercenariesAllyResolved.spentResources.solari,
    3,
    "Mercenaries Plot spec should spend 3 Solari",
  );
  assert.equal(
    mercenariesAllyResolved.intriguesToDraw,
    1,
    "Mercenaries Plot spec should draw 1 Intrigue",
  );
  assert.equal(
    mercenariesAllyResolved.recruitedTroops,
    2,
    "Mercenaries Plot spec should recruit for Ally actors",
  );
  const mercenariesCommanderResolved = effectResolver.resolveGameEffects(
    mercenaries.effects,
    {
      trigger: "plot-intrigue",
      source: p4,
      target: p6,
      state: game,
    },
  );
  assert.equal(
    mercenariesCommanderResolved.spentResources.solari,
    3,
    "Commander Mercenaries Plot spec should spend Commander Solari",
  );
  assert.equal(
    mercenariesCommanderResolved.intriguesToDraw,
    1,
    "Commander Mercenaries Plot spec should draw an Intrigue for the Commander",
  );
  assert.equal(
    mercenariesCommanderResolved.activatedAlly.recruitedTroops,
    2,
    "Mercenaries Plot spec should route Commander troop recruitment to the activated Ally",
  );
  const mercenariesNoSupplyCard = {
    ...mercenaries,
    id: "mercenaries-no-supply-fixture",
  };
  const mercenariesNoSupplyDraw = {
    ...backedByChoam,
    id: "mercenaries-no-supply-draw",
  };
  const mercenariesNoSupplyFixture = {
    ...withActivePlayer(game, p2.id, () => ({
      deployedTroops: 0,
      garrison: 12,
      intrigues: [mercenariesNoSupplyCard],
      jessicaMemories: 0,
      resources: { ...p2.resources, solari: 3 },
    })),
    intrigueDeck: [mercenariesNoSupplyDraw],
    intrigueDiscard: [],
  };
  const mercenariesNoSupplyPlayed = state.playMercenariesPlotIntrigue(
    mercenariesNoSupplyFixture,
    p2.id,
    mercenariesNoSupplyCard.id,
  );
  const mercenariesNoSupplyOwner = playerById(mercenariesNoSupplyPlayed, p2.id);
  assert.equal(
    mercenariesNoSupplyOwner.garrison,
    12,
    "Mercenaries should not recruit beyond the Ally troop supply",
  );
  assert.equal(
    mercenariesNoSupplyOwner.resources.solari,
    0,
    "Mercenaries should still spend Solari when troop supply is capped",
  );
  assert.equal(
    mercenariesNoSupplyOwner.intrigues.some(
      (card) => card.id === mercenariesNoSupplyCard.id,
    ),
    false,
    "Mercenaries should discard the played Intrigue when troop supply is capped",
  );
  assert.equal(
    mercenariesNoSupplyOwner.intrigues.some(
      (card) => card.id === mercenariesNoSupplyDraw.id,
    ),
    true,
    "Mercenaries should still draw its Intrigue when troop supply is capped",
  );
  assert.match(
    mercenariesNoSupplyPlayed.log[0] ?? "",
    /plays Mercenaries, spends 3 Solari\./,
  );
  assert.equal(
    mercenariesNoSupplyPlayed.log[0]?.includes("recruits"),
    false,
    "Mercenaries should not log unplaced Ally troops",
  );
  const mercenariesCommanderNoSupplyCard = {
    ...mercenaries,
    id: "mercenaries-commander-no-supply-fixture",
  };
  const mercenariesCommanderNoSupplyDraw = {
    ...backedByChoam,
    id: "mercenaries-commander-no-supply-draw",
  };
  const mercenariesCommanderNoSupplyBase = withActivePlayer(
    game,
    p4.id,
    () => ({
      garrison: 0,
      intrigues: [mercenariesCommanderNoSupplyCard],
      resources: { ...p4.resources, solari: 3 },
    }),
  );
  const mercenariesCommanderNoSupplyFixture = {
    ...mercenariesCommanderNoSupplyBase,
    intrigueDeck: [mercenariesCommanderNoSupplyDraw],
    intrigueDiscard: [],
    players: mercenariesCommanderNoSupplyBase.players.map((player) =>
      player.id === p6.id
        ? { ...player, deployedTroops: 0, garrison: 12, jessicaMemories: 0 }
        : player,
    ),
  };
  const mercenariesCommanderNoSupplyPlayed = state.playMercenariesPlotIntrigue(
    mercenariesCommanderNoSupplyFixture,
    p4.id,
    mercenariesCommanderNoSupplyCard.id,
    p6.id,
  );
  assert.equal(
    playerById(mercenariesCommanderNoSupplyPlayed, p4.id).garrison,
    0,
    "Commander Mercenaries should not recruit troops to the Commander",
  );
  assert.equal(
    playerById(mercenariesCommanderNoSupplyPlayed, p6.id).garrison,
    12,
    "Commander Mercenaries should not recruit beyond the activated Ally troop supply",
  );
  assert.equal(
    playerById(mercenariesCommanderNoSupplyPlayed, p4.id).resources.solari,
    0,
    "Commander Mercenaries should still spend Commander Solari when activated Ally supply is capped",
  );
  assert.equal(
    playerById(mercenariesCommanderNoSupplyPlayed, p4.id).intrigues.some(
      (card) => card.id === mercenariesCommanderNoSupplyDraw.id,
    ),
    true,
    "Commander Mercenaries should still draw its Intrigue when activated Ally supply is capped",
  );
  assert.equal(
    mercenariesCommanderNoSupplyPlayed.log[0]?.includes(
      `${p6.leader} recruits`,
    ),
    false,
    "Commander Mercenaries should not log unplaced activated-Ally troops",
  );
}
