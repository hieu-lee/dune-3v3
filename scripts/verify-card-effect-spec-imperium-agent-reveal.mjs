import assert from "node:assert/strict";
import {
  agentSpec,
  hasAgentEffect,
  hasRevealEffect,
} from "./verify-card-effect-spec-helpers.mjs";

export function verifyCardEffectSpecImperiumAgentReveal({
  cards,
  effectResolver,
  game,
  players,
}) {
  const {
    beneGesseritOperative,
    calculus,
    capturedMentat,
    cargoRunner,
    chani,
    covertOperation,
    dangerousRhetoric,
    desertSurvival,
    fedaykinStilltent,
    hiddenMissive,
    makerKeeper,
    maulaPistol,
    shishakli,
    spyNetwork,
    treadInDarkness,
    truthtrance,
    unswervingLoyalty,
  } = cards;
  const { p2 } = players;
  assert.ok(
    makerKeeper.effects?.some(
      (spec) =>
        spec.trigger === "agent-play" &&
        spec.conditions?.some(
          (condition) =>
            condition.kind === "has-influence" &&
            condition.faction === "bene" &&
            condition.amount === 2,
        ) &&
        spec.effects.some(
          (effect) =>
            effect.kind === "gain-resource" &&
            effect.resource === "water" &&
            effect.amount === 1,
        ),
    ),
    "Maker Keeper should carry a Bene Gesserit Influence-gated water Agent spec",
  );
  assert.ok(
    makerKeeper.effects?.some(
      (spec) =>
        spec.trigger === "agent-play" &&
        spec.conditions?.some(
          (condition) =>
            condition.kind === "has-influence" &&
            condition.faction === "fremen" &&
            condition.amount === 2,
        ) &&
        spec.effects.some(
          (effect) =>
            effect.kind === "gain-resource" &&
            effect.resource === "spice" &&
            effect.amount === 1,
        ),
    ),
    "Maker Keeper should carry a Fremen Influence-gated spice Agent spec",
  );
  assert.ok(
    hasRevealEffect(
      makerKeeper,
      (effect) => effect.kind === "gain-persuasion" && effect.amount === 2,
    ),
    "Maker Keeper should carry a fixed Reveal persuasion spec",
  );
  assert.ok(
    cargoRunner.effects?.some(
      (spec) =>
        spec.trigger === "agent-play" &&
        spec.conditions?.some(
          (condition) =>
            condition.kind === "has-completed-contracts" &&
            condition.count === 2,
        ) &&
        spec.effects.some(
          (effect) => effect.kind === "draw-cards" && effect.amount === 1,
        ),
    ) &&
      cargoRunner.effects?.some(
        (spec) =>
          spec.trigger === "agent-play" &&
          spec.conditions?.some(
            (condition) =>
              condition.kind === "has-completed-contracts" &&
              condition.count === 4,
          ) &&
          spec.effects.some(
            (effect) => effect.kind === "draw-cards" && effect.amount === 1,
          ),
      ),
    "Cargo Runner should carry stacked completed-contract Agent draw specs",
  );
  assert.ok(
    hasRevealEffect(
      cargoRunner,
      (effect) => effect.kind === "gain-persuasion" && effect.amount === 1,
    ),
    "Cargo Runner should carry a fixed Reveal persuasion spec",
  );
  assert.ok(
    maulaPistol.effects?.some(
      (spec) =>
        spec.trigger === "agent-play" &&
        spec.effects.some(
          (effect) => effect.kind === "draw-cards" && effect.amount === 1,
        ),
    ),
    "Maula Pistol should carry an unconditional Agent draw spec",
  );
  assert.ok(
    hasRevealEffect(
      maulaPistol,
      (effect) => effect.kind === "gain-persuasion" && effect.amount === 1,
    ) &&
      hasRevealEffect(
        maulaPistol,
        (effect) => effect.kind === "gain-strength" && effect.amount === 1,
      ),
    "Maula Pistol should carry fixed Reveal persuasion and strength specs",
  );
  assert.ok(
    chani.effects?.some(
      (spec) =>
        spec.trigger === "agent-play" &&
        spec.conditions?.some(
          (condition) =>
            condition.kind === "has-conflict-units" && condition.count === 3,
        ) &&
        spec.effects.some(
          (effect) => effect.kind === "draw-intrigues" && effect.amount === 1,
        ),
    ),
    "Chani should carry a conflict-unit-gated Agent Intrigue draw spec",
  );
  assert.ok(
    chani.effects?.some(
      (spec) =>
        spec.trigger === "reveal" &&
        spec.conditions?.some(
          (condition) =>
            condition.kind === "has-card-trait-in-play" &&
            condition.trait === "Faction: Fremen" &&
            condition.count === 2,
        ) &&
        spec.effects.some(
          (effect) => effect.kind === "gain-persuasion" && effect.amount === 2,
        ),
    ),
    "Chani should carry a declarative Fremen Bond Reveal persuasion spec",
  );
  assert.ok(
    chani.effects?.some(
      (spec) =>
        spec.trigger === "reveal" &&
        spec.effects.some(
          (effect) =>
            effect.kind === "retreat-troops-for-strength" &&
            effect.amount === 2 &&
            effect.strength === 4 &&
            effect.optional === true,
        ),
    ),
    "Chani should carry a declarative Reveal troop-retreat strength spec",
  );
  assert.equal(
    unswervingLoyalty.cost,
    1,
    "Unswerving Loyalty should cost 1 persuasion",
  );
  assert.deepEqual(
    unswervingLoyalty.icons,
    [],
    "Unswerving Loyalty should have no Agent icons",
  );
  assert.equal(
    unswervingLoyalty.persuasion,
    1,
    "Unswerving Loyalty should reveal for 1 base persuasion",
  );
  assert.equal(
    unswervingLoyalty.swords,
    0,
    "Unswerving Loyalty should not reveal for printed strength",
  );
  assert.deepEqual(
    unswervingLoyalty.traits,
    ["Faction: Fremen"],
    "Unswerving Loyalty should keep its Fremen trait",
  );
  assert.ok(
    hasRevealEffect(
      unswervingLoyalty,
      (effect) =>
        effect.kind === "gain-persuasion" &&
        effect.selector === "self" &&
        effect.amount === 1,
    ),
    "Unswerving Loyalty should carry its base persuasion as a typed Reveal effect",
  );
  assert.ok(
    hasRevealEffect(
      unswervingLoyalty,
      (effect) =>
        effect.kind === "recruit-troops" &&
        effect.selector === "self" &&
        effect.amount === 1,
    ),
    "Unswerving Loyalty should carry its printed troop recruit as a typed Reveal effect",
  );
  assert.ok(
    unswervingLoyalty.effects?.some(
      (spec) =>
        spec.trigger === "reveal" &&
        spec.conditions?.some(
          (condition) =>
            condition.kind === "has-card-trait-in-play" &&
            condition.trait === "Faction: Fremen" &&
            condition.count === 2,
        ) &&
        spec.effects.some(
          (effect) =>
            effect.kind === "deploy-or-retreat-troops" &&
            effect.selector === "self" &&
            effect.amount === 1 &&
            effect.optional === true,
        ),
    ),
    "Unswerving Loyalty should model its Fremen Bond deploy-or-retreat choice as a typed Reveal pending effect",
  );
  assert.deepEqual(
    effectResolver.resolveRevealDeployOrRetreatTroops(
      unswervingLoyalty.effects,
      {
        trigger: "reveal",
        source: { ...p2, playArea: [unswervingLoyalty, fedaykinStilltent] },
        state: game,
      },
    ),
    [{ selector: "self", troopCount: 1, optional: true, source: undefined }],
    "Unswerving Loyalty should resolve its deploy-or-retreat pending effect after Fremen Bond is active",
  );
  assert.deepEqual(
    effectResolver.resolveRevealDeployOrRetreatTroops(
      unswervingLoyalty.effects,
      {
        trigger: "reveal",
        source: { ...p2, playArea: [unswervingLoyalty] },
        state: game,
      },
    ),
    [],
    "Unswerving Loyalty should not resolve its deploy-or-retreat pending effect before Fremen Bond is active",
  );
  assert.match(unswervingLoyalty.play, /No agent icons/i);
  assert.match(
    unswervingLoyalty.reveal,
    /\+1 persuasion.*Recruit 1 troop.*Fremen Bond.*deploy or retreat 1 troop/i,
  );
  assert.match(truthtrance.play, /No Agent effect/i);
  assert.doesNotMatch(truthtrance.play, /Faction|Bene Geserit/i);
  assert.deepEqual(
    truthtrance.traits,
    ["Faction: Bene Gesserit"],
    "Truthtrance should expose only its normalized Bene Gesserit card trait",
  );
  assert.match(spyNetwork.play, /No agent icons/i);
  assert.doesNotMatch(spyNetwork.play, /Acquire bonus|Intrigue 1|Spy 1/i);
  assert.deepEqual(
    spyNetwork.traits,
    ["Faction: Emperor", "Faction: Spacing Guild"],
    "Spy Network should expose only its printed faction card traits",
  );
  assert.ok(
    calculus.effects?.some(
      (spec) =>
        spec.trigger === "reveal" &&
        spec.effects.some(
          (effect) => effect.kind === "gain-persuasion" && effect.amount === 2,
        ),
    ),
    "Calculus of Power should carry its printed persuasion in Reveal specs",
  );
  assert.ok(
    calculus.effects?.some(
      (spec) =>
        spec.trigger === "reveal" &&
        spec.effects.some(
          (effect) =>
            effect.kind === "trash-card" &&
            effect.optional === true &&
            effect.excludeSource === true &&
            effect.requiredTrait === "Faction: Emperor" &&
            effect.strengthReward === 3 &&
            effect.zones?.length === 1 &&
            effect.zones[0] === "playArea",
        ),
    ),
    "Calculus of Power should carry a declarative Reveal trash-card strength spec",
  );
  assert.ok(
    hasAgentEffect(
      calculus,
      (effect) =>
        effect.kind === "trash-card" &&
        effect.optional === true &&
        effect.sourceOnly !== true,
    ),
    "Calculus of Power should use a typed Agent selected-card trash effect",
  );
  assert.ok(
    capturedMentat.effects?.some(
      (spec) =>
        spec.trigger === "reveal" &&
        spec.effects.some(
          (effect) => effect.kind === "gain-persuasion" && effect.amount === 1,
        ),
    ),
    "Captured Mentat should carry its printed persuasion in Reveal specs",
  );
  assert.ok(
    capturedMentat.effects?.some(
      (spec) =>
        spec.trigger === "reveal" &&
        spec.effects.some(
          (effect) =>
            effect.kind === "lose-influence-for-influence" &&
            effect.loseAmount === 1 &&
            effect.gainAmount === 1 &&
            effect.optional === true,
        ),
    ),
    "Captured Mentat should carry a declarative Reveal Influence-for-Influence spec",
  );
  assert.ok(
    capturedMentat.effects?.some(
      (spec) =>
        spec.trigger === "agent-play" &&
        spec.effects.some(
          (effect) =>
            effect.kind === "discard-card-for-draw" &&
            effect.selector === "self" &&
            effect.drawCards === 1 &&
            effect.drawIntrigues === 1 &&
            effect.optional === false,
        ),
    ),
    "Captured Mentat should carry a declarative Agent discard-for-card-and-Intrigue draw spec",
  );
  assert.ok(
    dangerousRhetoric.effects?.some(
      (spec) =>
        spec.trigger === "agent-play" &&
        spec.effects.some(
          (effect) =>
            effect.kind === "gain-influence-choice" &&
            effect.selector === "self" &&
            effect.amount === 1 &&
            effect.trashSource === true,
        ),
    ),
    "Dangerous Rhetoric should carry a declarative Agent gain-Influence choice spec",
  );
  assert.equal(
    dangerousRhetoric.play,
    "Gain 1 Influence and trash this card.",
    "Dangerous Rhetoric play text should expose its automated Influence choice",
  );
  assert.ok(
    desertSurvival.effects?.some(
      (spec) =>
        spec.trigger === "agent-play" &&
        spec.effects.some(
          (effect) =>
            effect.kind === "trash-card" &&
            effect.selector === "self" &&
            effect.optional === true &&
            effect.sourceOnly === true &&
            effect.zones?.length === 1 &&
            effect.zones[0] === "playArea",
        ),
    ),
    "Desert Survival should carry a typed optional Agent source-trash spec",
  );
  assert.ok(
    desertSurvival.effects?.some(
      (spec) =>
        spec.trigger === "reveal" &&
        spec.effects.some(
          (effect) => effect.kind === "gain-persuasion" && effect.amount === 1,
        ),
    ),
    "Desert Survival should carry its printed persuasion in Reveal specs",
  );
  assert.ok(
    desertSurvival.effects?.some(
      (spec) =>
        spec.trigger === "reveal" &&
        spec.effects.some(
          (effect) => effect.kind === "gain-strength" && effect.amount === 1,
        ),
    ),
    "Desert Survival should carry its printed strength in Reveal specs",
  );
  assert.equal(
    desertSurvival.play,
    "You may trash this card.",
    "Desert Survival play text should expose source trash",
  );
  assert.equal(
    desertSurvival.reveal,
    "+1 persuasion and +1 strength.",
    "Desert Survival reveal text should stay fixed",
  );
  assert.deepEqual(
    treadInDarkness.traits?.filter((trait) => trait.startsWith("Faction:")),
    ["Faction: Bene Gesserit"],
    "Tread in Darkness should normalize its Bene Gesserit trait",
  );
  assert.ok(
    treadInDarkness.effects?.some(
      (spec) =>
        spec.trigger === "agent-play" &&
        spec.conditions?.some(
          (condition) =>
            condition.kind === "has-card-trait-in-play" &&
            condition.trait === "Faction: Bene Gesserit" &&
            condition.count === 2,
        ) &&
        spec.effects.some(
          (effect) =>
            effect.kind === "trash-card" &&
            effect.selector === "self" &&
            effect.optional === true &&
            effect.sourceOnly === true &&
            effect.drawCardsReward === 1 &&
            effect.zones?.length === 1 &&
            effect.zones[0] === "playArea",
        ),
    ),
    "Tread in Darkness should carry a typed Agent source-trash draw spec gated by another Bene Gesserit card",
  );
  assert.ok(
    hasRevealEffect(
      treadInDarkness,
      (effect) => effect.kind === "gain-persuasion" && effect.amount === 2,
    ) &&
      hasRevealEffect(
        treadInDarkness,
        (effect) => effect.kind === "gain-strength" && effect.amount === 1,
      ),
    "Tread in Darkness should carry fixed Reveal persuasion and strength specs",
  );
  assert.equal(
    treadInDarkness.play,
    "If you have another Bene Gesserit card in play, you may trash this card to draw 1 card.",
    "Tread in Darkness play text should expose source trash for draw",
  );
  assert.equal(
    treadInDarkness.reveal,
    "+2 persuasion and +1 strength.",
    "Tread in Darkness reveal text should stay fixed",
  );
  assert.deepEqual(
    shishakli.effects?.filter((spec) => spec.trigger === "agent-play"),
    [
      agentSpec([
        {
          kind: "trash-card",
          selector: "self",
          optional: true,
          zones: ["playArea"],
          sourceOnly: true,
          drawCardsReward: 1,
        },
      ]),
    ],
    "Shishakli should only carry a typed Agent source-trash draw spec",
  );
  assert.ok(
    hasRevealEffect(
      shishakli,
      (effect) => effect.kind === "gain-strength" && effect.amount === 2,
    ),
    "Shishakli should carry its fixed Reveal strength spec",
  );
  assert.ok(
    shishakli.effects?.some(
      (spec) =>
        spec.trigger === "reveal" &&
        spec.conditions?.some(
          (condition) =>
            condition.kind === "has-card-trait-in-play" &&
            condition.trait === "Faction: Fremen" &&
            condition.count === 2,
        ) &&
        spec.effects.some(
          (effect) =>
            effect.kind === "gain-influence" &&
            effect.selector === "self" &&
            effect.faction === "fremen" &&
            effect.amount === 1,
        ),
    ),
    "Shishakli should carry a typed Fremen Bond Reveal Fremen Influence spec",
  );
  assert.equal(
    shishakli.play,
    "You may trash this card to draw 1 card.",
    "Shishakli play text should expose source trash for draw",
  );
  assert.equal(
    shishakli.reveal,
    "+2 strength. Fremen Bond: gain 1 Fremen Influence.",
    "Shishakli reveal text should describe its Fremen Bond Influence reward",
  );
  assert.deepEqual(
    hiddenMissive.traits?.filter((trait) => trait.startsWith("Faction:")),
    ["Faction: Bene Gesserit"],
    "Imported Bene Gesserit traits should normalize for Tread in Darkness card-in-play checks",
  );
  assert.equal(
    covertOperation.play,
    "Each opponent discards a card.",
    "Covert Operation play text should preserve its printed opponent discard effect",
  );
  assert.equal(
    covertOperation.reveal,
    "Place 2 spies.",
    "Covert Operation reveal text should preserve its printed spy reveal",
  );
  assert.ok(
    covertOperation.effects?.some(
      (spec) =>
        spec.trigger === "reveal" &&
        spec.effects.some(
          (effect) =>
            effect.kind === "place-spies" &&
            effect.selector === "self" &&
            effect.amount === 2 &&
            effect.recallForSupply === true &&
            effect.mustPlace === true,
        ),
    ),
    "Covert Operation should carry a reveal spy-placement spec",
  );
  assert.ok(
    covertOperation.effects?.some(
      (spec) =>
        spec.trigger === "agent-play" &&
        spec.effects.some(
          (effect) =>
            effect.kind === "opponents-discard-cards" &&
            effect.selector === "self" &&
            effect.amount === 1,
        ),
    ),
    "Covert Operation should carry a declarative Agent opponents-discard spec",
  );
  assert.equal(
    hasAgentEffect(covertOperation, (effect) => effect.kind === "place-spies"),
    false,
    "Covert Operation should not treat its Reveal spy icons as Agent spy placement",
  );
  assert.ok(
    beneGesseritOperative.effects?.some(
      (spec) =>
        spec.trigger === "agent-play" &&
        spec.effects.some(
          (effect) =>
            effect.kind === "place-spies" &&
            effect.selector === "self" &&
            effect.amount === 1 &&
            effect.recallForSupply === true &&
            effect.mustPlace === true,
        ),
    ),
    "Bene Gesserit Operative should carry a mandatory Agent spy-placement spec",
  );
}
