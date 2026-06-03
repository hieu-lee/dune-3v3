import assert from "node:assert/strict";
import { hasCombatEffect } from "./verify-card-effect-spec-helpers.mjs";

export function verifyCardEffectSpecIntrigueCombat({
  cards,
  data,
  effectResolver,
  game,
  players,
}) {
  const { backedByChoam, weirdingCombat } = cards;
  const { p2 } = players;
  assert.ok(
    backedByChoam.effects?.some(
      (spec) =>
        spec.trigger === "plot-intrigue" &&
        spec.choiceId === "bene" &&
        spec.effects.some(
          (effect) =>
            effect.kind === "lose-influence" &&
            effect.selector === "self" &&
            effect.faction === "bene" &&
            effect.amount === 1,
        ) &&
        spec.effects.some(
          (effect) =>
            effect.kind === "gain-resource" &&
            effect.selector === "self" &&
            effect.resource === "solari" &&
            effect.amount === 4,
        ),
    ),
    "Backed by CHOAM should carry a typed Bene Gesserit Influence-loss Plot choice spec",
  );
  assert.ok(
    [
      "emperor",
      "spacing",
      "bene",
      "fremen",
      "greatHouses",
      "fringeWorlds",
    ].every((faction) =>
      backedByChoam.effects?.some(
        (spec) =>
          spec.trigger === "plot-intrigue" &&
          spec.choiceId === faction &&
          spec.effects.some(
            (effect) =>
              effect.kind === "lose-influence" &&
              effect.selector === "self" &&
              effect.faction === faction &&
              effect.amount === 1,
          ) &&
          spec.effects.some(
            (effect) =>
              effect.kind === "gain-resource" &&
              effect.selector === "self" &&
              effect.resource === "solari" &&
              effect.amount === 4,
          ),
      ),
    ),
    "Backed by CHOAM should carry typed Plot choice specs for every influence track",
  );
  const backedNoChoiceResolved = effectResolver.resolveGameEffects(
    backedByChoam.effects,
    {
      trigger: "plot-intrigue",
      source: p2,
      state: game,
    },
  );
  assert.deepEqual(
    backedNoChoiceResolved.influenceLosses,
    {},
    "Backed by CHOAM Plot choice specs should not lose Influence without a selected choice",
  );
  assert.deepEqual(
    backedNoChoiceResolved.revealGain,
    {},
    "Backed by CHOAM Plot choice specs should not gain resources without a selected choice",
  );
  const backedBeneResolved = effectResolver.resolveGameEffects(
    backedByChoam.effects,
    {
      trigger: "plot-intrigue",
      choiceId: "bene",
      source: p2,
      state: game,
    },
  );
  assert.equal(
    backedBeneResolved.influenceLosses.bene,
    1,
    "Backed by CHOAM Bene choice should lose 1 Bene Gesserit Influence",
  );
  assert.equal(
    backedBeneResolved.influenceLosses.spacing,
    undefined,
    "Backed by CHOAM Bene choice should not lose other Influence",
  );
  assert.equal(
    backedBeneResolved.revealGain.solari,
    4,
    "Backed by CHOAM Bene choice should gain 4 Solari",
  );
  const backedSpacingResolved = effectResolver.resolveGameEffects(
    backedByChoam.effects,
    {
      trigger: "plot-intrigue",
      choiceId: "spacing",
      source: p2,
      state: game,
    },
  );
  assert.equal(
    backedSpacingResolved.influenceLosses.spacing,
    1,
    "Backed by CHOAM Spacing Guild choice should lose 1 Spacing Influence",
  );
  assert.equal(
    backedSpacingResolved.influenceLosses.bene,
    undefined,
    "Backed by CHOAM Spacing Guild choice should not lose Bene Gesserit Influence",
  );
  assert.equal(
    backedSpacingResolved.revealGain.solari,
    4,
    "Backed by CHOAM Spacing Guild choice should gain 4 Solari",
  );
  assert.ok(
    backedByChoam.effects?.some(
      (spec) =>
        spec.trigger === "combat-intrigue" &&
        spec.conditions?.some(
          (condition) =>
            condition.kind === "has-completed-contracts" &&
            condition.count === 2,
        ) &&
        spec.effects.some(
          (effect) =>
            effect.kind === "gain-strength" &&
            effect.selector === "self" &&
            effect.amount === 4,
        ),
    ),
    "Backed by CHOAM should carry a typed Combat strength spec gated by completed contracts",
  );
  const backedCombatContracts = data.standardContracts
    .slice(0, 2)
    .map((card, index) => ({
      card,
      completed: true,
      takenRound: index + 1,
    }));
  const backedUncontractedCombat = effectResolver.resolveGameEffects(
    backedByChoam.effects,
    {
      trigger: "combat-intrigue",
      source: { ...p2, contracts: [backedCombatContracts[0]] },
      state: game,
    },
  );
  assert.equal(
    backedUncontractedCombat.swords,
    0,
    "Backed by CHOAM Combat spec should not resolve below two completed contracts",
  );
  const backedContractedCombat = effectResolver.resolveGameEffects(
    backedByChoam.effects,
    {
      trigger: "combat-intrigue",
      source: { ...p2, contracts: backedCombatContracts },
      state: game,
    },
  );
  assert.equal(
    backedContractedCombat.swords,
    4,
    "Backed by CHOAM Combat spec should resolve with two completed contracts",
  );
  assert.ok(
    hasCombatEffect(
      weirdingCombat,
      (effect) =>
        effect.kind === "gain-strength" &&
        effect.selector === "self" &&
        effect.amount === 3,
    ) &&
      weirdingCombat.effects?.some(
        (spec) =>
          spec.trigger === "combat-intrigue" &&
          spec.conditions?.some(
            (condition) =>
              condition.kind === "has-influence" &&
              condition.faction === "bene" &&
              condition.amount === 3,
          ) &&
          spec.effects.some(
            (effect) =>
              effect.kind === "gain-strength" &&
              effect.selector === "self" &&
              effect.amount === 2,
          ),
      ),
    "Weirding Combat should carry typed base and Bene Gesserit threshold Combat strength specs",
  );
  const weirdingBaseCombat = effectResolver.resolveGameEffects(
    weirdingCombat.effects,
    {
      trigger: "combat-intrigue",
      source: p2,
      state: game,
    },
  );
  assert.equal(
    weirdingBaseCombat.swords,
    3,
    "Weirding Combat should resolve its base Combat strength",
  );
  const weirdingThresholdSource = {
    ...p2,
    influence: { ...p2.influence, bene: 3 },
  };
  const weirdingThresholdCombat = effectResolver.resolveGameEffects(
    weirdingCombat.effects,
    {
      trigger: "combat-intrigue",
      source: weirdingThresholdSource,
      state: {
        ...game,
        players: game.players.map((player) =>
          player.id === p2.id ? weirdingThresholdSource : player,
        ),
      },
    },
  );
  assert.equal(
    weirdingThresholdCombat.swords,
    5,
    "Weirding Combat should add its Bene Gesserit threshold strength",
  );
}
