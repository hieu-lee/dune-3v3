import assert from "node:assert/strict";

export const shaddamSignetPaidRewardOptions = [
  {
    id: "troop",
    resource: "solari",
    cost: 1,
    reward: {
      kind: "recruit-troops",
      selector: "activated-ally",
      amount: 1,
      destination: "garrison",
    },
  },
  {
    id: "emperor",
    resource: "solari",
    cost: 3,
    reward: {
      kind: "gain-influence",
      selector: "self",
      faction: "emperor",
      amount: 1,
    },
  },
  {
    id: "greatHouses",
    resource: "solari",
    cost: 3,
    reward: {
      kind: "gain-influence",
      selector: "activated-ally",
      faction: "greatHouses",
      amount: 1,
    },
  },
  {
    id: "spacing",
    resource: "solari",
    cost: 3,
    reward: {
      kind: "gain-influence",
      selector: "activated-ally",
      faction: "spacing",
      amount: 1,
    },
  },
  {
    id: "bene",
    resource: "solari",
    cost: 3,
    reward: {
      kind: "gain-influence",
      selector: "activated-ally",
      faction: "bene",
      amount: 1,
    },
  },
  {
    id: "fringeWorlds",
    resource: "solari",
    cost: 3,
    reward: {
      kind: "gain-influence",
      selector: "activated-ally",
      faction: "fringeWorlds",
      amount: 1,
    },
  },
];

export function verifyCardEffectSpecShaddamCommander({
  cards,
  effectResolver,
  game,
  players,
}) {
  const {
    corrinoMight,
    criticalShipments,
    demandResults,
    devastatingAssault,
    emperorSignet,
    imperialTent,
  } = cards;
  const { p1, p2, p4, p6 } = players;
  assert.ok(
    corrinoMight.effects?.some(
      (spec) =>
        spec.trigger === "reveal" &&
        spec.conditions?.some(
          (condition) =>
            condition.kind === "has-team" && condition.team === "shaddam",
        ) &&
        spec.conditions?.some(
          (condition) =>
            condition.kind === "has-role" && condition.role === "Commander",
        ) &&
        spec.effects.some(
          (effect) =>
            effect.kind === "pay-resource-for-troops" &&
            effect.selector === "self" &&
            effect.resource === "spice" &&
            effect.cost === 3 &&
            effect.troops === 2 &&
            effect.recipient === "same-team-allies" &&
            effect.destination === "garrison" &&
            effect.trashSource === true &&
            effect.source === "Corrino Might",
        ),
    ),
    "Corrino Might should carry a typed reveal troop-payment spec",
  );
  assert.ok(
    devastatingAssault.effects?.some(
      (spec) =>
        spec.trigger === "agent-play" &&
        spec.effects.some(
          (effect) =>
            effect.kind === "gain-resource" &&
            effect.selector === "self" &&
            effect.resource === "solari" &&
            effect.amount === 1,
        ) &&
        spec.effects.some(
          (effect) =>
            effect.kind === "recruit-troops" &&
            effect.selector === "activated-ally" &&
            effect.amount === 1,
        ),
    ),
    "Devastating Assault should carry a routed Agent recruit spec",
  );
  assert.ok(
    devastatingAssault.effects?.some(
      (spec) =>
        spec.trigger === "reveal" &&
        spec.conditions?.some(
          (condition) =>
            condition.kind === "has-team" && condition.team === "shaddam",
        ) &&
        spec.conditions?.some(
          (condition) =>
            condition.kind === "has-role" && condition.role === "Commander",
        ) &&
        spec.conditions?.some(
          (condition) => condition.kind === "has-swordmaster-bonus",
        ) &&
        spec.conditions?.some(
          (condition) =>
            condition.kind === "has-conflict-units" && condition.count === 1,
        ) &&
        spec.effects.some(
          (effect) =>
            effect.kind === "pay-resource-for-strength" &&
            effect.selector === "self" &&
            effect.resource === "solari" &&
            effect.cost === 3 &&
            effect.strength === 5 &&
            effect.source === "Devastating Assault",
        ),
    ),
    "Devastating Assault should carry a typed reveal payment spec",
  );
  assert.ok(
    criticalShipments.effects?.some(
      (spec) =>
        spec.trigger === "agent-play" &&
        spec.conditions?.some(
          (condition) =>
            condition.kind === "has-team" && condition.team === "shaddam",
        ) &&
        spec.conditions?.some(
          (condition) =>
            condition.kind === "has-role" && condition.role === "Commander",
        ) &&
        spec.effects.some(
          (effect) =>
            effect.kind === "commander-resource-split" &&
            effect.selector === "self" &&
            effect.source === "Critical Shipments" &&
            effect.options.length === 2 &&
            effect.options.some(
              (option) =>
                option.commanderResource === "water" &&
                option.commanderAmount === 1 &&
                option.allyResource === "solari" &&
                option.allyAmount === 2,
            ) &&
            effect.options.some(
              (option) =>
                option.commanderResource === "solari" &&
                option.commanderAmount === 2 &&
                option.allyResource === "water" &&
                option.allyAmount === 1,
            ),
        ),
    ),
    "Critical Shipments should carry a declarative Commander resource-split spec",
  );
  assert.ok(
    demandResults.effects?.some(
      (spec) =>
        spec.trigger === "agent-play" &&
        spec.conditions?.some(
          (condition) =>
            condition.kind === "has-team" && condition.team === "shaddam",
        ) &&
        spec.conditions?.some(
          (condition) =>
            condition.kind === "has-role" && condition.role === "Commander",
        ) &&
        spec.effects.some(
          (effect) =>
            effect.kind === "pay-resource-for-contracts" &&
            effect.selector === "self" &&
            effect.resource === "solari" &&
            effect.cost === 2 &&
            effect.contractCount === 2 &&
            effect.recipient === "same-team-allies" &&
            effect.sourcePool === "public-offer" &&
            effect.optional === true &&
            effect.trashSource === true &&
            effect.source === "Demand Results",
        ),
    ),
    "Demand Results should carry a typed Agent public-contract payment spec",
  );
  assert.ok(
    imperialTent.effects?.some(
      (spec) =>
        spec.trigger === "agent-play" &&
        spec.conditions?.some(
          (condition) =>
            condition.kind === "has-team" && condition.team === "shaddam",
        ) &&
        spec.conditions?.some(
          (condition) =>
            condition.kind === "has-role" && condition.role === "Commander",
        ) &&
        spec.effects.some(
          (effect) =>
            effect.kind === "move-card-to-throne-row" &&
            effect.selector === "self" &&
            effect.source === "Imperial Tent",
        ),
    ),
    "Imperial Tent should carry a declarative Agent Throne Row movement spec",
  );
  assert.ok(
    emperorSignet.effects?.some(
      (spec) =>
        spec.trigger === "agent-play" &&
        spec.conditions?.some(
          (condition) =>
            condition.kind === "has-team" && condition.team === "shaddam",
        ) &&
        spec.conditions?.some(
          (condition) =>
            condition.kind === "has-role" && condition.role === "Commander",
        ) &&
        spec.effects.some(
          (effect) =>
            effect.kind === "block-conflict-deployment" &&
            effect.selector === "self" &&
            effect.source === "Emperor of the Known Universe",
        ),
    ),
    "Shaddam Signet Ring should carry a declarative Agent deployment-block spec",
  );
  const shaddamSignetPaidRewardSpec = emperorSignet.effects?.find(
    (spec) =>
      spec.trigger === "agent-play" &&
      spec.conditions?.some(
        (condition) =>
          condition.kind === "has-team" && condition.team === "shaddam",
      ) &&
      spec.conditions?.some(
        (condition) =>
          condition.kind === "has-role" && condition.role === "Commander",
      ) &&
      spec.effects.some((effect) => effect.kind === "paid-reward-choice"),
  );
  assert.ok(
    shaddamSignetPaidRewardSpec,
    "Shaddam Signet Ring should carry a typed paid reward choice spec",
  );
  const shaddamSignetPaidReward = shaddamSignetPaidRewardSpec.effects.find(
    (effect) => effect.kind === "paid-reward-choice",
  );
  assert.deepEqual(
    shaddamSignetPaidReward,
    {
      kind: "paid-reward-choice",
      selector: "self",
      source: "Emperor of the Known Universe",
      requiredRecipient: "activated-ally",
      options: shaddamSignetPaidRewardOptions,
    },
    "Shaddam Signet Ring paid reward spec should encode troop and Influence payment branches",
  );
  assert.deepEqual(
    effectResolver.resolveAgentPaidRewardChoices(emperorSignet.effects, {
      trigger: "agent-play",
      source: p4,
      target: p6,
      state: game,
    }),
    [
      {
        selector: "self",
        source: "Emperor of the Known Universe",
        requiredRecipient: "activated-ally",
        options: shaddamSignetPaidRewardOptions,
      },
    ],
    "Shaddam Signet Ring paid reward resolver should expose all Solari payment branches",
  );
  assert.deepEqual(
    effectResolver.resolveAgentPaidRewardChoices(emperorSignet.effects, {
      trigger: "agent-play",
      source: p2,
      target: p1,
      state: game,
    }),
    [],
    "Shaddam Signet Ring paid reward spec should be Shaddam Commander gated",
  );
}
