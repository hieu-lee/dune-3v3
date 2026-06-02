import assert from "node:assert/strict";

export function verifyCombatIntrigueCatalog({ cards, data, state }) {
  const {
    backedByChoam,
    contingencyPlan,
    devour,
    findWeakness,
    goToGround,
    impress,
    mercenaries,
    questionableMethods,
    reachAgreement,
    spiceIsPower,
    springTheTrap,
    tacticalOption,
    weirdingCombat,
  } = cards;

  assert.equal(impress.combatSwords, 2, "Impress should expose its structured Combat strength");
  assert.equal(state.isImpressIntrigue(impress), true, "Impress should be recognized as a structured Combat Intrigue");
  assert.equal(
    impress.summary,
    "Add 2 strength, then acquire a card that costs 3 or less.",
    "Impress should expose its strength and acquisition effect",
  );
  assert.ok(
    impress.effects?.some((spec) =>
      spec.trigger === "combat-intrigue" &&
      spec.effects.some((effect) =>
        effect.kind === "gain-strength" &&
        effect.selector === "self" &&
        effect.amount === 2
      )
    ),
    "Impress should carry a typed Combat Intrigue strength spec",
  );
  assert.ok(
    impress.effects?.some((spec) =>
      spec.trigger === "combat-intrigue" &&
      spec.effects.some((effect) =>
        effect.kind === "acquire-card" &&
        effect.selector === "self" &&
        effect.maxCost === 3 &&
        effect.destination === "discard" &&
        effect.source === "Impress"
      )
    ),
    "Impress should carry a typed Combat Intrigue acquire-card spec",
  );
  assert.equal(findWeakness.combatSwords, 5, "Find Weakness should expose its maximum structured Combat strength");
  assert.equal(
    findWeakness.summary,
    "Add 2 strength; you may recall 1 spy to add 3 more strength.",
    "Find Weakness should expose its base strength and optional spy recall",
  );
  assert.ok(
    findWeakness.effects?.some((spec) =>
      spec.trigger === "combat-intrigue" &&
      spec.effects.some((effect) =>
        effect.kind === "gain-strength" &&
        effect.selector === "self" &&
        effect.amount === 2
      )
    ),
    "Find Weakness should carry a typed Combat Intrigue base strength spec",
  );
  assert.ok(
    findWeakness.effects?.some((spec) =>
      spec.trigger === "combat-intrigue" &&
      spec.conditions?.some((condition) => condition.kind === "has-spy-posts" && condition.count === 1) &&
      spec.effects.some((effect) =>
        effect.kind === "recall-spy" &&
        effect.selector === "self" &&
        effect.amount === 1 &&
        effect.strengthReward === 3 &&
        effect.optional === true &&
        effect.source === "Find Weakness"
      )
    ),
    "Find Weakness should carry a typed optional Combat spy-recall strength spec",
  );
  assert.equal(goToGround.combatSwords, undefined, "Go To Ground should resolve through its structured retreat and spy flow");
  assert.equal(
    goToGround.summary,
    "Retreat 1 or 2 troops, then optionally place a spy.",
    "Go To Ground should expose its retreat and spy placement effect",
  );
  assert.ok(
    goToGround.effects?.some((spec) =>
      spec.trigger === "combat-intrigue" &&
      spec.choiceId === "retreat-troops" &&
      spec.effects.some((effect) =>
        effect.kind === "retreat-troops" &&
        effect.selector === "self" &&
        effect.min === 1 &&
        effect.max === 2 &&
        effect.source === "Go To Ground"
      )
    ),
    "Go To Ground should carry a typed selected Combat troop-retreat spec",
  );
  assert.ok(
    goToGround.effects?.some((spec) =>
      spec.trigger === "combat-intrigue" &&
      spec.choiceId === "retreat-troops" &&
      spec.effects.some((effect) =>
        effect.kind === "place-spies" &&
        effect.selector === "self" &&
        effect.amount === 1 &&
        effect.source === "Go To Ground"
      )
    ),
    "Go To Ground should carry a typed Combat spy-placement spec",
  );
  assert.equal(springTheTrap.combatSwords, 7, "Spring The Trap should expose its structured Combat strength");
  assert.equal(
    springTheTrap.summary,
    "Recall 2 spies to add 7 strength.",
    "Spring The Trap should expose its two-spy cost and Combat strength",
  );
  assert.ok(
    springTheTrap.effects?.some((spec) =>
      spec.trigger === "combat-intrigue" &&
      spec.conditions?.some((condition) => condition.kind === "has-spy-posts" && condition.count === 2) &&
      spec.effects.some((effect) =>
        effect.kind === "recall-spy" &&
        effect.selector === "self" &&
        effect.amount === 2 &&
        effect.strengthReward === 7 &&
        effect.source === "Spring The Trap" &&
        effect.optional !== true
      )
    ),
    "Spring The Trap should carry a typed required Combat spy-recall strength spec",
  );
  assert.equal(spiceIsPower.combatSwords, 6, "Spice is Power should expose its maximum structured Combat strength");
  assert.equal(
    spiceIsPower.summary,
    "Retreat 3 troops to gain 3 spice OR spend 3 spice to add 6 strength.",
    "Spice is Power should expose both printed Combat branches",
  );
  assert.ok(
    spiceIsPower.effects?.some((spec) =>
      spec.trigger === "combat-intrigue" &&
      spec.choiceId === "retreat-troops" &&
      spec.effects.some((effect) =>
        effect.kind === "retreat-troops" &&
        effect.selector === "self" &&
        effect.min === 3 &&
        effect.max === 3 &&
        effect.source === "Spice is Power"
      )
    ),
    "Spice is Power should carry a typed exact Combat troop-retreat spec",
  );
  assert.ok(
    spiceIsPower.effects?.some((spec) =>
      spec.trigger === "combat-intrigue" &&
      spec.choiceId === "retreat-troops" &&
      spec.effects.some((effect) =>
        effect.kind === "gain-resource" &&
        effect.selector === "self" &&
        effect.resource === "spice" &&
        effect.amount === 3 &&
        effect.source === "Spice is Power"
      )
    ),
    "Spice is Power should carry a typed Combat spice gain spec",
  );
  assert.ok(
    spiceIsPower.effects?.some((spec) =>
      spec.trigger === "combat-intrigue" &&
      spec.choiceId === "spend-spice" &&
      spec.effects.some((effect) =>
        effect.kind === "spend-resource" &&
        effect.selector === "self" &&
        effect.resource === "spice" &&
        effect.amount === 3 &&
        effect.source === "Spice is Power"
      )
    ),
    "Spice is Power should carry a typed Combat spice spend spec",
  );
  assert.ok(
    spiceIsPower.effects?.some((spec) =>
      spec.trigger === "combat-intrigue" &&
      spec.choiceId === "spend-spice" &&
      spec.effects.some((effect) =>
        effect.kind === "gain-strength" &&
        effect.selector === "self" &&
        effect.amount === 6
      )
    ),
    "Spice is Power should carry a typed spend-branch Combat strength spec",
  );
  assert.equal(tacticalOption.combatSwords, 2, "Tactical Option should expose its structured Combat strength");
  assert.equal(
    tacticalOption.summary,
    "Add 2 strength OR retreat any number of your troops.",
    "Tactical Option should expose both printed Combat branches",
  );
  assert.ok(
    tacticalOption.effects?.some((spec) =>
      spec.trigger === "combat-intrigue" &&
      spec.choiceId === "add-strength" &&
      spec.effects.some((effect) =>
        effect.kind === "gain-strength" &&
        effect.selector === "self" &&
        effect.amount === 2
      )
    ),
    "Tactical Option should carry a typed selected Combat strength branch spec",
  );
  assert.ok(
    tacticalOption.effects?.some((spec) =>
      spec.trigger === "combat-intrigue" &&
      spec.choiceId === "retreat-troops" &&
      spec.effects.some((effect) =>
        effect.kind === "retreat-troops" &&
        effect.selector === "self" &&
        effect.min === 1 &&
        effect.max?.kind === "deployed-troops" &&
        effect.source === "Tactical Option"
      )
    ),
    "Tactical Option should carry a typed selected Combat dynamic troop-retreat spec",
  );
  assert.equal(reachAgreement.combatSwords, undefined, "Reach Agreement should resolve through its structured retreat and contract flow");
  assert.equal(
    reachAgreement.summary,
    "Retreat 1 or 2 troops, then take a face-up CHOAM contract.",
    "Reach Agreement should expose its retreat and contract effect",
  );
  assert.ok(
    reachAgreement.effects?.some((spec) =>
      spec.trigger === "combat-intrigue" &&
      spec.choiceId === "retreat-troops" &&
      spec.effects.some((effect) =>
        effect.kind === "retreat-troops" &&
        effect.selector === "self" &&
        effect.min === 1 &&
        effect.max === 2 &&
        effect.source === "Reach Agreement"
      )
    ),
    "Reach Agreement should carry a typed selected Combat troop-retreat spec",
  );
  assert.ok(
    reachAgreement.effects?.some((spec) =>
      spec.trigger === "combat-intrigue" &&
      spec.choiceId === "retreat-troops" &&
      spec.effects.some((effect) =>
        effect.kind === "take-contracts" &&
        effect.selector === "self" &&
        effect.amount === 1 &&
        effect.sourcePool === "public-offer" &&
        effect.source === "Reach Agreement" &&
        effect.optional !== true
      )
    ),
    "Reach Agreement should carry a typed Combat contract pending spec",
  );
  assert.equal(questionableMethods.combatSwords, 5, "Questionable Methods should expose its maximum structured Combat strength");
  assert.equal(
    questionableMethods.summary,
    "Add 1 strength; the recipient may lose 1 Influence, or a Commander may lose personal Influence, to add 4 more strength.",
    "Questionable Methods should expose its base strength and optional Influence loss",
  );
  assert.ok(
    questionableMethods.effects?.some((spec) =>
      spec.trigger === "combat-intrigue" &&
      spec.effects.some((effect) =>
        effect.kind === "gain-strength" &&
        effect.selector === "self" &&
        effect.amount === 1
      )
    ),
    "Questionable Methods should carry a typed Combat Intrigue base strength spec",
  );
  assert.ok(
    questionableMethods.effects?.some((spec) =>
      spec.trigger === "combat-intrigue" &&
      spec.effects.some((effect) =>
        effect.kind === "lose-influence-for-strength" &&
        effect.selector === "self" &&
        effect.amount === 1 &&
        effect.strengthReward === 4 &&
        effect.owner === "combat-recipient" &&
        effect.alternateOwner === "source-commander-personal" &&
        effect.optional === true &&
        effect.source === "Questionable Methods"
      )
    ),
    "Questionable Methods should carry a typed Combat Influence-loss strength spec",
  );
  assert.equal(weirdingCombat.combatSwords, 5, "Weirding Combat should expose its structured Combat strength");
  assert.equal(
    weirdingCombat.summary,
    "Add 3 strength; add 5 instead if you have at least 3 Bene Gesserit Influence.",
    "Weirding Combat should expose its conditional Influence threshold",
  );
  assert.equal(contingencyPlan.combatSwords, 3, "Contingency Plan should expose its printed Combat strength");
  assert.ok(
    contingencyPlan.effects?.some((spec) =>
      spec.trigger === "combat-intrigue" &&
      spec.effects.some((effect) =>
        effect.kind === "gain-strength" &&
        effect.selector === "self" &&
        effect.amount === 3
      )
    ),
    "Contingency Plan should carry a typed Combat Intrigue strength spec",
  );
  assert.equal(devour.combatSwords, 4, "Devour should expose its maximum structured Combat strength");
  assert.equal(
    devour.summary,
    "Add 2 strength; if the recipient has one or more sandworms in the Conflict, add 4 strength instead and they may trash a card.",
    "Devour should expose its sandworm bonus and optional trash text",
  );
  assert.ok(
    devour.effects?.some((spec) =>
      spec.trigger === "combat-intrigue" &&
      spec.conditions?.some((condition) => condition.kind === "has-combat-recipient") &&
      spec.effects.some((effect) =>
        effect.kind === "gain-strength" &&
        effect.selector === "self" &&
        effect.amount === 2
      )
    ),
    "Devour should carry a typed Combat recipient-gated base strength spec",
  );
  assert.ok(
    devour.effects?.some((spec) =>
      spec.trigger === "combat-intrigue" &&
      spec.conditions?.some((condition) => condition.kind === "has-combat-recipient-sandworms" && condition.count === 1) &&
      spec.effects.some((effect) =>
        effect.kind === "gain-strength" &&
        effect.selector === "self" &&
        effect.amount === 2
      )
    ),
    "Devour should carry a typed Combat recipient sandworm strength bonus spec",
  );
  assert.ok(
    devour.effects?.some((spec) =>
      spec.trigger === "combat-intrigue" &&
      spec.conditions?.some((condition) => condition.kind === "has-combat-recipient-sandworms" && condition.count === 1) &&
      spec.effects.some((effect) =>
        effect.kind === "trash-card" &&
        effect.selector === "self" &&
        effect.optional === true
      )
    ),
    "Devour should carry a typed Combat recipient sandworm trash-card spec",
  );
  assert.equal(backedByChoam.combatSwords, 4, "Backed by CHOAM should expose its structured Combat strength");
  assert.ok(
    backedByChoam.effects?.some((spec) =>
      spec.trigger === "combat-intrigue" &&
      spec.conditions?.some((condition) => condition.kind === "has-completed-contracts" && condition.count === 2) &&
      spec.effects.some((effect) =>
        effect.kind === "gain-strength" &&
        effect.selector === "self" &&
        effect.amount === 4
      )
    ),
    "Backed by CHOAM should carry a typed completed-contract Combat strength spec",
  );
  assert.ok(
    weirdingCombat.effects?.some((spec) =>
      spec.trigger === "combat-intrigue" &&
      spec.effects.some((effect) =>
        effect.kind === "gain-strength" &&
        effect.selector === "self" &&
        effect.amount === 3
      )
    ) &&
    weirdingCombat.effects?.some((spec) =>
      spec.trigger === "combat-intrigue" &&
      spec.conditions?.some((condition) =>
        condition.kind === "has-influence" &&
        condition.faction === "bene" &&
        condition.amount === 3
      ) &&
      spec.effects.some((effect) =>
        effect.kind === "gain-strength" &&
        effect.selector === "self" &&
        effect.amount === 2
      )
    ),
    "Weirding Combat should carry typed base and Bene Gesserit threshold Combat strength specs",
  );
  assert.equal(contingencyPlan.automatedCombatSwords, undefined, "Contingency Plan should not rely on automatedCombatSwords");
  assert.equal(impress.automatedCombatSwords, undefined, "Impress should resolve through typed Combat Intrigue specs");
  assert.equal(findWeakness.automatedCombatSwords, undefined, "Find Weakness should resolve through typed Combat spy-recall state");
  assert.equal(goToGround.automatedCombatSwords, undefined, "Go To Ground should resolve through typed Combat retreat and spy-placement specs");
  assert.equal(questionableMethods.automatedCombatSwords, undefined, "Questionable Methods should resolve through typed Combat Influence-loss state");
  assert.equal(spiceIsPower.automatedCombatSwords, undefined, "Spice is Power should resolve through typed Combat resource and retreat branch specs");
  assert.equal(tacticalOption.automatedCombatSwords, undefined, "Tactical Option should resolve through typed Combat branch specs");
  assert.equal(reachAgreement.automatedCombatSwords, undefined, "Reach Agreement should resolve through typed Combat retreat and contract specs");
  assert.equal(springTheTrap.automatedCombatSwords, undefined, "Spring The Trap should resolve through typed Combat spy-recall state");
  assert.equal(weirdingCombat.automatedCombatSwords, undefined, "Weirding Combat should resolve from state-aware Influence");
  assert.equal(devour.automatedCombatSwords, undefined, "Devour should resolve from target sandworm state");
  assert.equal(backedByChoam.automatedCombatSwords, undefined, "Backed by CHOAM should resolve from completed contract state");
  assert.equal(mercenaries.combatSwords, undefined, "Non-Combat Intrigues should not expose Combat strength");
  assert.deepEqual(
    data.intrigueCards
      .filter((card) => card.automatedCombatSwords)
      .map((card) => card.name),
    [],
    "Combat Intrigue strength should resolve through typed specs instead of automatedCombatSwords",
  );
}
