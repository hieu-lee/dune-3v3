import assert from "node:assert/strict";
import {
  agentSpec,
  hasAgentEffect,
  hasRevealEffect,
} from "./verify-card-effect-spec-helpers.mjs";

export function verifyCardEffectSpecImperiumContractAlliance({
  cards,
  effectResolver,
  game,
  players,
}) {
  const {
    branchingPath,
    corrinthCity,
    deliveryAgreement,
    junctionHeadquarters,
    longLiveTheFighters,
    spacingGuildFavor,
  } = cards;
  const { p2 } = players;
  assert.equal(
    corrinthCity.play,
    "Discard 2 cards and spend 5 Solari to gain 1 VP.",
    "Corrinth City play text should expose its Agent discard-cost VP reward",
  );
  assert.equal(
    corrinthCity.reveal,
    "+5 persuasion, or spend 5 Solari to take your High Council seat.",
    "Corrinth City reveal text should preserve its High Council branch",
  );
  assert.deepEqual(
    corrinthCity.effects?.filter((spec) => spec.trigger === "agent-play"),
    [
      agentSpec([
        {
          kind: "discard-cards-for-reward",
          selector: "self",
          amount: 2,
          cost: { solari: 5 },
          gainVp: 1,
          source: "Corrinth City",
        },
      ]),
    ],
    "Corrinth City should model its Agent discard-cost VP reward as a typed effect",
  );
  assert.ok(
    hasRevealEffect(
      corrinthCity,
      (effect) =>
        effect.kind === "pay-resource-for-high-council-seat" &&
        effect.resource === "solari" &&
        effect.cost === 5 &&
        effect.persuasionCost === 5 &&
        effect.persuasionReward === 2 &&
        effect.source === "Corrinth City",
    ),
    "Corrinth City should model its paid High Council Reveal branch as a typed effect",
  );
  assert.equal(
    deliveryAgreement.play,
    "Discard 1 card to take a face-up CHOAM contract.",
    "Delivery Agreement play text should expose its Agent discard-contract reward",
  );
  assert.equal(
    deliveryAgreement.reveal,
    "Gain 1 spice. If you have completed four or more contracts, trash this card to gain 1 VP.",
    "Delivery Agreement reveal text should preserve its conditional VP branch",
  );
  assert.deepEqual(
    deliveryAgreement.effects?.filter((spec) => spec.trigger === "agent-play"),
    [
      agentSpec([
        {
          kind: "discard-cards-for-reward",
          selector: "self",
          amount: 1,
          takeContracts: {
            amount: 1,
            sourcePool: "public-offer",
          },
          source: "Delivery Agreement",
        },
      ]),
    ],
    "Delivery Agreement should model its Agent discard-contract reward as a typed effect",
  );
  assert.ok(
    deliveryAgreement.effects?.some(
      (spec) =>
        spec.trigger === "reveal" &&
        spec.conditions?.some(
          (condition) =>
            condition.kind === "has-completed-contracts" &&
            condition.count === 4,
        ) &&
        spec.effects.some(
          (effect) =>
            effect.kind === "trash-card" &&
            effect.sourceOnly === true &&
            effect.vpReward === 1,
        ),
    ),
    "Delivery Agreement should model its completed-contract Reveal source-trash VP branch as a typed effect",
  );
  assert.equal(
    longLiveTheFighters.play,
    "If your deck has three or more cards, look at the top three cards. Draw one, discard one, and trash one.",
    "Long Live the Fighters play text should preserve its top-deck selection effect",
  );
  assert.equal(
    longLiveTheFighters.reveal,
    "+2 persuasion and +3 strength.",
    "Long Live the Fighters should keep its fixed reveal rewards",
  );
  assert.ok(
    longLiveTheFighters.effects?.some(
      (spec) =>
        spec.trigger === "agent-play" &&
        spec.effects.some(
          (effect) =>
            effect.kind === "select-top-deck-cards" &&
            effect.selector === "self" &&
            effect.lookCards === 3 &&
            effect.drawCards === 1 &&
            effect.discardCards === 1 &&
            effect.trashCards === 1 &&
            effect.minimumDeckCards === 3,
        ),
    ),
    "Long Live the Fighters should carry a declarative Agent top-deck selection spec",
  );
  assert.ok(
    longLiveTheFighters.effects?.some(
      (spec) =>
        spec.trigger === "reveal" &&
        spec.effects.some(
          (effect) => effect.kind === "gain-persuasion" && effect.amount === 2,
        ),
    ) &&
      longLiveTheFighters.effects?.some(
        (spec) =>
          spec.trigger === "reveal" &&
          spec.effects.some(
            (effect) => effect.kind === "gain-strength" && effect.amount === 3,
          ),
      ),
    "Long Live the Fighters should carry typed Reveal persuasion and strength specs",
  );
  assert.deepEqual(
    branchingPath.effects?.filter((spec) => spec.trigger === "agent-play"),
    [
      agentSpec(
        [
          {
            kind: "trash-intrigue-for-reward",
            selector: "self",
            drawIntrigues: 1,
            gain: { spice: 2 },
            optional: true,
          },
        ],
        [{ kind: "has-alliance", faction: "bene" }],
      ),
    ],
    "Branching Path should model its Bene Gesserit Alliance Intrigue trash reward as a typed Agent effect",
  );
  assert.equal(
    branchingPath.play,
    "Bene Gesserit Alliance: may trash 1 Intrigue to draw 1 Intrigue card and gain 2 spice.",
    "Branching Path play text should expose its Alliance-gated Intrigue trash reward",
  );
  assert.equal(
    branchingPath.reveal,
    "+2 persuasion.",
    "Branching Path should keep its fixed reveal persuasion",
  );
  assert.deepEqual(
    junctionHeadquarters.effects?.filter(
      (spec) => spec.trigger === "agent-play",
    ),
    [
      agentSpec(
        [
          {
            kind: "trash-intrigue-for-reward",
            selector: "self",
            cost: { spice: 2 },
            gainVp: 1,
            optional: true,
          },
        ],
        [{ kind: "has-alliance", faction: "spacing" }],
      ),
    ],
    "Junction Headquarters should model its Spacing Guild Alliance Intrigue trash VP reward as a typed Agent effect",
  );
  assert.ok(
    hasRevealEffect(
      junctionHeadquarters,
      (effect) =>
        effect.kind === "gain-persuasion" &&
        effect.selector === "self" &&
        effect.amount === 1,
    ) &&
      hasRevealEffect(
        junctionHeadquarters,
        (effect) =>
          effect.kind === "gain-resource" &&
          effect.selector === "self" &&
          effect.resource === "water" &&
          effect.amount === 1,
      ) &&
      hasRevealEffect(
        junctionHeadquarters,
        (effect) =>
          effect.kind === "recruit-troops" &&
          effect.selector === "self" &&
          effect.amount === 1,
      ),
    "Junction Headquarters should carry typed Reveal persuasion, water, and troop rewards",
  );
  assert.equal(
    junctionHeadquarters.play,
    "Spacing Guild Alliance: may trash 1 Intrigue and pay 2 spice to gain 1 VP.",
    "Junction Headquarters play text should expose its costed Intrigue trash VP reward",
  );
  assert.equal(
    junctionHeadquarters.reveal,
    "+1 persuasion. Gain 1 water and recruit 1 troop.",
    "Junction Headquarters reveal text should expose all typed reveal rewards",
  );
  assert.equal(
    spacingGuildFavor.play,
    "Draw 1 card. When discarded from hand, gain 2 spice.",
    "Spacing Guild's Favor play text should preserve its Agent draw and discard trigger",
  );
  assert.equal(
    spacingGuildFavor.reveal,
    "+2 persuasion.",
    "Spacing Guild's Favor should keep its fixed reveal persuasion",
  );
  assert.ok(
    spacingGuildFavor.effects?.some(
      (spec) =>
        spec.trigger === "reveal" &&
        spec.effects.some(
          (effect) => effect.kind === "gain-persuasion" && effect.amount === 2,
        ),
    ),
    "Spacing Guild's Favor should carry its printed persuasion in Reveal specs",
  );
  assert.ok(
    hasAgentEffect(
      spacingGuildFavor,
      (effect) =>
        effect.kind === "draw-cards" &&
        effect.selector === "self" &&
        effect.amount === 1,
    ),
    "Spacing Guild's Favor should carry a declarative Agent draw-card spec",
  );
  assert.ok(
    spacingGuildFavor.effects?.some(
      (spec) =>
        spec.trigger === "discard" &&
        spec.effects.some(
          (effect) =>
            effect.kind === "gain-resource" &&
            effect.selector === "self" &&
            effect.resource === "spice" &&
            effect.amount === 2,
        ),
    ),
    "Spacing Guild's Favor should carry a declarative discard-trigger spice spec",
  );
  const spacingGuildFavorDiscardResolved = effectResolver.resolveGameEffects(
    spacingGuildFavor.effects,
    {
      trigger: "discard",
      source: p2,
      state: game,
    },
  );
  assert.equal(
    spacingGuildFavorDiscardResolved.revealGain.spice,
    2,
    "Spacing Guild's Favor discard trigger should resolve its spice gain",
  );
}
