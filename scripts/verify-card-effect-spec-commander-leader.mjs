import assert from "node:assert/strict";

export function verifyCardEffectSpecCommanderLeader({
  cards,
  effectResolver,
  game,
  leaderEffectData,
  players,
  spaces,
}) {
  const {
    allySignet,
    commandRespect,
    demandAttention,
    desertCall,
    muadDibSignet,
    threatenSpiceProduction,
    usul,
  } = cards;
  const { p5, p6 } = players;
  const { arrakeen, secrets } = spaces;
  assert.ok(
    muadDibSignet.effects?.some(
      (spec) =>
        spec.trigger === "agent-play" &&
        spec.conditions?.some(
          (condition) =>
            condition.kind === "has-team" && condition.team === "muaddib",
        ) &&
        spec.conditions?.some(
          (condition) =>
            condition.kind === "has-role" && condition.role === "Commander",
        ) &&
        spec.effects.some(
          (effect) =>
            effect.kind === "draw-cards" &&
            effect.selector === "self" &&
            effect.amount === 1 &&
            effect.source === "Lead the Way",
        ),
    ),
    "Muad'Dib Signet Ring should carry a declarative Agent draw spec",
  );
  assert.ok(
    demandAttention.effects?.some(
      (spec) =>
        spec.trigger === "agent-play" &&
        spec.conditions?.some(
          (condition) =>
            condition.kind === "has-team" && condition.team === "muaddib",
        ) &&
        spec.conditions?.some(
          (condition) =>
            condition.kind === "has-role" && condition.role === "Commander",
        ) &&
        spec.effects.some(
          (effect) =>
            effect.kind === "pay-resource-for-influence" &&
            effect.selector === "self" &&
            effect.resource === "solari" &&
            effect.cost === 4 &&
            effect.faction === "board-space" &&
            effect.amount === 1 &&
            effect.recipient === "board-effect-recipient" &&
            effect.trashSource === true &&
            effect.source === "Demand Attention",
        ),
    ),
    "Demand Attention should carry a declarative Agent resource-for-Influence payment spec",
  );
  assert.ok(
    commandRespect.effects?.some(
      (spec) =>
        spec.trigger === "agent-play" &&
        spec.conditions?.some(
          (condition) =>
            condition.kind === "has-team" && condition.team === "muaddib",
        ) &&
        spec.conditions?.some(
          (condition) =>
            condition.kind === "has-role" && condition.role === "Commander",
        ) &&
        spec.conditions?.some(
          (condition) => condition.kind === "has-swordmaster-bonus",
        ) &&
        spec.effects.some(
          (effect) =>
            effect.kind === "trash-source-for-trade" &&
            effect.selector === "self" &&
            effect.partner === "same-team-allies" &&
            effect.resource === "intrigue" &&
            effect.optional === true &&
            effect.partnerLocked === true &&
            effect.source === "Command Respect",
        ),
    ),
    "Command Respect should carry a declarative Agent trash-source-for-trade spec",
  );
  assert.ok(
    desertCall.effects?.some(
      (spec) =>
        spec.trigger === "agent-play" &&
        spec.conditions?.some(
          (condition) =>
            condition.kind === "has-team" && condition.team === "muaddib",
        ) &&
        spec.conditions?.some(
          (condition) =>
            condition.kind === "has-role" && condition.role === "Commander",
        ) &&
        spec.conditions?.some(
          (condition) =>
            condition.kind === "visited-space-icon" &&
            condition.icon === "spice",
        ) &&
        spec.effects.some(
          (effect) =>
            effect.kind === "pay-resource-for-sandworms" &&
            effect.selector === "self" &&
            effect.resource === "water" &&
            effect.cost === 1 &&
            effect.sandworms === 1 &&
            effect.recipient === "activated-ally" &&
            effect.destination === "conflict" &&
            effect.trashSource === true &&
            effect.source === "Desert Call",
        ),
    ),
    "Desert Call should carry a typed Agent sandworm-payment spec",
  );
  assert.ok(
    threatenSpiceProduction.effects?.some(
      (spec) =>
        spec.trigger === "agent-play" &&
        spec.conditions?.some(
          (condition) =>
            condition.kind === "has-team" && condition.team === "muaddib",
        ) &&
        spec.conditions?.some(
          (condition) =>
            condition.kind === "has-role" && condition.role === "Commander",
        ) &&
        spec.conditions?.some(
          (condition) =>
            condition.kind === "visited-space-icon" &&
            condition.icon === "spice",
        ) &&
        spec.effects.some(
          (effect) =>
            effect.kind === "pay-team-resource-for-vp" &&
            effect.selector === "self" &&
            effect.resource === "spice" &&
            effect.cost === 7 &&
            effect.vp === 1 &&
            effect.contributors === "self-and-same-team-allies" &&
            effect.recipient === "self" &&
            effect.optional === true &&
            effect.trashSource === true &&
            effect.source === "Threaten Spice Production",
        ),
    ),
    "Threaten Spice Production should carry a typed Agent team resource-for-VP payment spec",
  );
  assert.ok(
    usul.effects?.some(
      (spec) =>
        spec.trigger === "agent-play" &&
        spec.conditions?.some(
          (condition) =>
            condition.kind === "has-team" && condition.team === "muaddib",
        ) &&
        spec.conditions?.some(
          (condition) =>
            condition.kind === "has-role" && condition.role === "Commander",
        ) &&
        spec.effects.some(
          (effect) =>
            effect.kind === "commander-resource-split" &&
            effect.selector === "self" &&
            effect.source === "Usul" &&
            effect.options.length === 2 &&
            effect.options.some(
              (option) =>
                option.commanderResource === "water" &&
                option.commanderAmount === 1 &&
                option.allyResource === "spice" &&
                option.allyAmount === 1,
            ) &&
            effect.options.some(
              (option) =>
                option.commanderResource === "spice" &&
                option.commanderAmount === 1 &&
                option.allyResource === "water" &&
                option.allyAmount === 1,
            ),
        ),
    ),
    "Usul should carry a declarative Commander resource-split spec",
  );
  assert.ok(
    allySignet.effects?.some(
      (spec) =>
        spec.trigger === "agent-play" &&
        spec.conditions?.some(
          (condition) =>
            condition.kind === "has-leader" &&
            condition.leader === "Gurney Halleck",
        ) &&
        spec.conditions?.some(
          (condition) =>
            condition.kind === "has-role" && condition.role === "Ally",
        ) &&
        spec.effects.some(
          (effect) =>
            effect.kind === "recruit-troops" &&
            effect.selector === "self" &&
            effect.amount === 1 &&
            effect.source === "Warmaster",
        ),
    ),
    "Generic Ally Signet Ring should carry a declarative Gurney Warmaster recruit spec",
  );
  assert.ok(
    allySignet.effects?.some(
      (spec) =>
        spec.trigger === "agent-play" &&
        spec.conditions?.some(
          (condition) =>
            condition.kind === "has-leader" &&
            condition.leader === "Lady Amber Metulli",
        ) &&
        spec.conditions?.some(
          (condition) =>
            condition.kind === "has-role" && condition.role === "Ally",
        ) &&
        spec.conditions?.some(
          (condition) =>
            condition.kind === "has-alliance" &&
            condition.faction === undefined,
        ) &&
        spec.effects.some(
          (effect) =>
            effect.kind === "gain-resource" &&
            effect.selector === "self" &&
            effect.resource === "solari" &&
            effect.amount === 1 &&
            effect.source === "Fill Coffers",
        ),
    ) &&
      allySignet.effects?.some(
        (spec) =>
          spec.trigger === "agent-play" &&
          spec.conditions?.some(
            (condition) =>
              condition.kind === "has-leader" &&
              condition.leader === "Lady Amber Metulli",
          ) &&
          spec.conditions?.some(
            (condition) =>
              condition.kind === "has-alliance" &&
              condition.faction === undefined,
          ) &&
          spec.effects.some(
            (effect) =>
              effect.kind === "gain-resource" &&
              effect.selector === "self" &&
              effect.resource === "spice" &&
              effect.amount === 1 &&
              effect.source === "Fill Coffers",
          ),
      ),
    "Generic Ally Signet Ring should carry declarative Amber Fill Coffers resource specs",
  );
  assert.ok(
    allySignet.effects?.some(
      (spec) =>
        spec.trigger === "agent-play" &&
        spec.conditions?.some(
          (condition) =>
            condition.kind === "has-leader" &&
            condition.leader === "Lady Margot Fenring",
        ) &&
        spec.conditions?.some(
          (condition) =>
            condition.kind === "has-role" && condition.role === "Ally",
        ) &&
        spec.effects.some(
          (effect) =>
            effect.kind === "place-spies" &&
            effect.selector === "self" &&
            effect.amount === 1 &&
            effect.source === "Arrakis Informant" &&
            effect.placementIcon === "bene" &&
            effect.recallForSupply === true,
        ),
    ),
    "Generic Ally Signet Ring should carry declarative Margot Arrakis Informant spy spec",
  );
  assert.ok(
    allySignet.effects?.some(
      (spec) =>
        spec.trigger === "agent-play" &&
        spec.conditions?.some(
          (condition) =>
            condition.kind === "has-leader" &&
            condition.leader === "Staban Tuek",
        ) &&
        spec.conditions?.some(
          (condition) =>
            condition.kind === "has-role" && condition.role === "Ally",
        ) &&
        spec.effects.some(
          (effect) =>
            effect.kind === "place-spies" &&
            effect.selector === "self" &&
            effect.amount === 1 &&
            effect.source === "Unseen Network" &&
            effect.recallForSupply === true &&
            effect.postPlacementAction === "staban-unseen-network",
        ),
    ),
    "Generic Ally Signet Ring should carry declarative Staban Unseen Network spy spec",
  );
  const irulanPendingActionChoiceOptions = [
    {
      id: "acquire",
      label: "Acquire cost-1 card to hand",
      effect: {
        kind: "acquire-card",
        selector: "self",
        minCost: 1,
        maxCost: 1,
        destination: "hand",
      },
    },
    {
      id: "trash",
      label: "Trash hand card",
      effect: {
        kind: "trash-card",
        selector: "self",
        optional: false,
        zones: ["hand"],
        spiceRewardCostThreshold: 1,
        spiceReward: 2,
      },
    },
  ];
  const irulanPendingActionChoiceSpec = allySignet.effects?.find(
    (spec) =>
      spec.trigger === "agent-play" &&
      spec.conditions?.some(
        (condition) =>
          condition.kind === "has-leader" &&
          condition.leader === "Princess Irulan",
      ) &&
      spec.conditions?.some(
        (condition) =>
          condition.kind === "has-role" && condition.role === "Ally",
      ) &&
      spec.effects.some(
        (effect) =>
          effect.kind === "pending-action-choice" &&
          effect.source === "Chronicler's Insight",
      ),
  );
  assert.ok(
    irulanPendingActionChoiceSpec,
    "Generic Ally Signet Ring should carry a typed Irulan Chronicler's Insight pending action choice spec",
  );
  assert.deepEqual(
    irulanPendingActionChoiceSpec.effects.find(
      (effect) => effect.kind === "pending-action-choice",
    ),
    {
      kind: "pending-action-choice",
      selector: "self",
      source: "Chronicler's Insight",
      options: irulanPendingActionChoiceOptions,
    },
    "Irulan Chronicler's Insight spec should encode acquire and trash pending branches",
  );
  assert.deepEqual(
    effectResolver.resolveAgentPendingActionChoices(allySignet.effects, {
      trigger: "agent-play",
      source: { ...p6, leader: "Princess Irulan", role: "Ally" },
      target: p6,
      state: game,
    }),
    [
      {
        selector: "self",
        source: "Chronicler's Insight",
        options: [
          {
            id: "acquire",
            label: "Acquire cost-1 card to hand",
            effect: {
              kind: "acquire-card",
              selector: "self",
              minCost: 1,
              maxCost: 1,
              destination: "hand",
              optional: false,
            },
          },
          {
            id: "trash",
            label: "Trash hand card",
            effect: {
              kind: "trash-card",
              selector: "self",
              optional: false,
              zones: ["hand"],
              excludeSource: false,
              spiceRewardCostThreshold: 1,
              spiceReward: 2,
            },
          },
        ],
      },
    ],
    "Irulan Chronicler's Insight resolver should expose its acquire and trash pending branches",
  );
  assert.ok(
    allySignet.effects?.some(
      (spec) =>
        spec.trigger === "agent-play" &&
        spec.conditions?.some(
          (condition) =>
            condition.kind === "has-leader" &&
            condition.leader === "Reverend Mother Jessica",
        ) &&
        spec.conditions?.some(
          (condition) =>
            condition.kind === "has-role" && condition.role === "Ally",
        ) &&
        spec.effects.some(
          (effect) =>
            effect.kind === "paid-reward-choice" &&
            effect.selector === "self" &&
            effect.source === "Water of Life" &&
            effect.requirePayableOption === true &&
            effect.options.length === 1 &&
            effect.options[0].id === "water" &&
            effect.options[0].resource === "spice" &&
            effect.options[0].cost === 1 &&
            effect.options[0].reward.kind === "gain-resource" &&
            effect.options[0].reward.selector === "self" &&
            effect.options[0].reward.resource === "water" &&
            effect.options[0].reward.amount === 1,
        ),
    ),
    "Generic Ally Signet Ring should carry a typed Reverend Mother Jessica Water of Life payment spec",
  );
  assert.deepEqual(
    effectResolver.resolveAgentPaidRewardChoices(allySignet.effects, {
      trigger: "agent-play",
      source: { ...p5, leader: "Reverend Mother Jessica", role: "Ally" },
      target: p5,
      state: game,
    }),
    [
      {
        selector: "self",
        source: "Water of Life",
        requirePayableOption: true,
        options: [
          {
            id: "water",
            resource: "spice",
            cost: 1,
            reward: {
              kind: "gain-resource",
              selector: "self",
              resource: "water",
              amount: 1,
            },
          },
        ],
      },
    ],
    "Water of Life paid reward spec should resolve its spice-for-water branch",
  );
  assert.ok(
    allySignet.effects?.some(
      (spec) =>
        spec.trigger === "agent-play" &&
        spec.conditions?.some(
          (condition) =>
            condition.kind === "has-leader" &&
            condition.leader === "Lady Jessica",
        ) &&
        spec.conditions?.some(
          (condition) =>
            condition.kind === "has-role" && condition.role === "Ally",
        ) &&
        spec.effects.some(
          (effect) =>
            effect.kind === "paid-reward-choice" &&
            effect.selector === "self" &&
            effect.source === "Spice Agony" &&
            effect.requirePayableOption === true &&
            effect.options.length === 1 &&
            effect.options[0].id === "spice-agony" &&
            effect.options[0].resource === "spice" &&
            effect.options[0].cost === 1 &&
            effect.options[0].reward.kind === "bundle" &&
            effect.options[0].reward.rewards.some(
              (reward) =>
                reward.kind === "draw-intrigues" &&
                reward.selector === "self" &&
                reward.amount === 1,
            ) &&
            effect.options[0].reward.rewards.some(
              (reward) =>
                reward.kind === "gain-leader-counter" &&
                reward.selector === "self" &&
                reward.counter === "jessicaMemories" &&
                reward.amount === 1 &&
                reward.troopSupplyCost === 1,
            ),
        ),
    ),
    "Generic Ally Signet Ring should carry a typed Lady Jessica Spice Agony payment spec",
  );
  assert.deepEqual(
    effectResolver.resolveAgentPaidRewardChoices(allySignet.effects, {
      trigger: "agent-play",
      source: { ...p5, leader: "Lady Jessica", role: "Ally" },
      target: p5,
      state: game,
    }),
    [
      {
        selector: "self",
        source: "Spice Agony",
        requirePayableOption: true,
        options: [
          {
            id: "spice-agony",
            resource: "spice",
            cost: 1,
            reward: {
              kind: "bundle",
              rewards: [
                { kind: "draw-intrigues", selector: "self", amount: 1 },
                {
                  kind: "gain-leader-counter",
                  selector: "self",
                  counter: "jessicaMemories",
                  amount: 1,
                  troopSupplyCost: 1,
                },
              ],
            },
          },
        ],
      },
    ],
    "Spice Agony paid reward spec should resolve its spice-for-Intrigue-and-memory branch",
  );
  assert.deepEqual(
    effectResolver.resolveLeaderTransitionChoices(
      leaderEffectData.leaderPlacementEffectSpecs,
      {
        trigger: "agent-placement",
        source: {
          ...p5,
          leader: "Lady Jessica",
          role: "Ally",
          jessicaMemories: 2,
        },
        state: game,
        space: secrets,
      },
    ),
    [
      {
        selector: "self",
        source: "Other Memories",
        fromLeader: "Lady Jessica",
        toLeader: "Reverend Mother Jessica",
        counter: "jessicaMemories",
        counterAmount: "all",
        drawCardsPerCounter: 1,
        followUp: {
          kind: "repeat-board-space",
          sameSpace: true,
          ability: "reverend-mother-jessica",
          source: "Reverend Mother",
          resource: "water",
          cost: 1,
        },
      },
    ],
    "Other Memories leader placement spec should resolve its leader transition branch",
  );
  const validLeaderTransitionChoiceEffect = {
    kind: "leader-transition-choice",
    selector: "self",
    source: "Other Memories",
    fromLeader: "Lady Jessica",
    toLeader: "Reverend Mother Jessica",
    counter: "jessicaMemories",
    counterAmount: "all",
    drawCardsPerCounter: 1,
    followUp: {
      kind: "repeat-board-space",
      sameSpace: true,
      ability: "reverend-mother-jessica",
      source: "Reverend Mother",
      resource: "water",
      cost: 1,
    },
  };
  const leaderTransitionChoiceContext = {
    trigger: "agent-placement",
    source: { ...p5, leader: "Lady Jessica", role: "Ally", jessicaMemories: 2 },
    state: game,
    space: secrets,
  };
  [
    [
      "fromLeader",
      { fromLeader: "" },
      /Invalid leader-transition-choice fromLeader ""/,
    ],
    [
      "toLeader",
      { toLeader: "" },
      /Invalid leader-transition-choice toLeader ""/,
    ],
    [
      "same toLeader",
      { toLeader: "Lady Jessica" },
      /Invalid leader-transition-choice toLeader "Lady Jessica"/,
    ],
    [
      "counter",
      { counter: "otherMemories" },
      /Invalid leader-transition-choice counter "otherMemories"/,
    ],
    [
      "counterAmount",
      { counterAmount: 1 },
      /Invalid leader-transition-choice counterAmount "1"/,
    ],
    [
      "drawCardsPerCounter",
      { drawCardsPerCounter: 0 },
      /Invalid leader-transition-choice drawCardsPerCounter "0"/,
    ],
    ["source", { source: "" }, /Invalid leader-transition-choice source ""/],
    [
      "followUp kind",
      {
        followUp: {
          ...validLeaderTransitionChoiceEffect.followUp,
          kind: "gain-resource",
        },
      },
      /Unsupported leader-transition-choice followUp "gain-resource"/,
    ],
    [
      "followUp sameSpace",
      {
        followUp: {
          ...validLeaderTransitionChoiceEffect.followUp,
          sameSpace: false,
        },
      },
      /Invalid leader-transition-choice followUp sameSpace "false"/,
    ],
    [
      "followUp ability",
      {
        followUp: {
          ...validLeaderTransitionChoiceEffect.followUp,
          ability: "other-memory",
        },
      },
      /Invalid leader-transition-choice followUp ability "other-memory"/,
    ],
    [
      "followUp source",
      {
        followUp: { ...validLeaderTransitionChoiceEffect.followUp, source: "" },
      },
      /Invalid leader-transition-choice followUp source ""/,
    ],
    [
      "followUp resource",
      {
        followUp: {
          ...validLeaderTransitionChoiceEffect.followUp,
          resource: "intrigue",
        },
      },
      /Unsupported effect resource "intrigue"/,
    ],
    [
      "followUp cost",
      { followUp: { ...validLeaderTransitionChoiceEffect.followUp, cost: 0 } },
      /Invalid leader-transition-choice followUp cost "0"/,
    ],
  ].forEach(([label, effectPatch, expectedError]) => {
    assert.throws(
      () =>
        effectResolver.resolveLeaderTransitionChoices(
          [
            {
              trigger: "agent-placement",
              effects: [
                { ...validLeaderTransitionChoiceEffect, ...effectPatch },
              ],
            },
          ],
          leaderTransitionChoiceContext,
        ),
      expectedError,
      `Leader transition choice specs should reject invalid ${label}`,
    );
  });
  assert.deepEqual(
    effectResolver.resolveLeaderTransitionChoices(
      leaderEffectData.leaderPlacementEffectSpecs,
      {
        trigger: "agent-placement",
        source: {
          ...p5,
          leader: "Lady Jessica",
          role: "Ally",
          jessicaMemories: 0,
        },
        state: game,
        space: secrets,
      },
    ),
    [],
    "Other Memories leader placement spec should require memories",
  );
  assert.deepEqual(
    effectResolver.resolveLeaderTransitionChoices(
      leaderEffectData.leaderPlacementEffectSpecs,
      {
        trigger: "agent-placement",
        source: {
          ...p5,
          leader: "Lady Jessica",
          role: "Ally",
          jessicaMemories: 2,
        },
        state: game,
        space: arrakeen,
      },
    ),
    [],
    "Other Memories leader placement spec should require a Bene Gesserit space",
  );
  assert.throws(
    () =>
      effectResolver.resolveLeaderTransitionChoices(
        [
          {
            trigger: "agent-placement",
            effects: [
              {
                kind: "gain-resource",
                selector: "self",
                resource: "water",
                amount: 1,
              },
            ],
          },
        ],
        {
          trigger: "agent-placement",
          source: {
            ...p5,
            leader: "Lady Jessica",
            role: "Ally",
            jessicaMemories: 2,
          },
          state: game,
          space: secrets,
        },
      ),
    /Unsupported effect "gain-resource" for agent-placement/,
    "Agent placement specs should stay scoped to leader-transition choices until runtime semantics exist",
  );
}
