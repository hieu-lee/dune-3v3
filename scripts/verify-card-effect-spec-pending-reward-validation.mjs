import assert from "node:assert/strict";
import { agentSpec } from "./verify-card-effect-spec-helpers.mjs";
import { shaddamSignetPaidRewardOptions } from "./verify-card-effect-spec-shaddam-commander.mjs";
import { playerById } from "./verify-starter-decks-fixtures.mjs";

export function verifyCardEffectSpecPendingRewardValidation({
  boardSpaces,
  cards,
  game,
  groups,
  players,
  state,
}) {
  const { arrakeen } = boardSpaces;
  const {
    allySignet,
    convincingArgument,
    dagger,
    emperorSignet,
    publicSpectacle,
    theacherousManeuver,
    undercoverAsset,
  } = cards;
  const { marketAndImperiumCards } = groups;
  const { p2, p4, p5, p6 } = players;
  const pendingPrimitiveSource = (card, patch = {}) => ({
    ...p2,
    hand: [],
    influence: { ...p2.influence, bene: 1 },
    playArea: [card],
    spies: 1,
    ...patch,
  });
  const pendingPrimitiveFixture = (source) => ({
    ...game,
    pendingAction: undefined,
    pendingQueue: [],
    sharedSpyPosts: {},
    spyPosts: {},
    players: game.players.map((player) => player.id === source.id ? source : player),
  });

  const undercoverSource = pendingPrimitiveSource(undercoverAsset);
  const undercoverPendings = state.pendingActionsForCard(
    undercoverAsset,
    undercoverSource,
    pendingPrimitiveFixture(undercoverSource),
  );
  assert.deepEqual(
    undercoverPendings.map((pending) => pending.kind),
    ["spy"],
    "Undercover Asset should queue a typed spy placement",
  );
  assert.equal(undercoverPendings[0].ownerId, p2.id, "Undercover Asset spy placement should target the source player");
  assert.equal(undercoverPendings[0].source, "Undercover Asset");

  const publicSpectacleSource = pendingPrimitiveSource(publicSpectacle);
  const publicSpectaclePendings = state.pendingActionsForCard(
    publicSpectacle,
    publicSpectacleSource,
    pendingPrimitiveFixture(publicSpectacleSource),
  );
  assert.deepEqual(
    publicSpectaclePendings.map((pending) => pending.kind),
    ["spy", "board-influence-choice"],
    "Public Spectacle should compose spy placement before its typed Influence choice",
  );
  assert.equal(publicSpectaclePendings[0].ownerId, p2.id, "Public Spectacle spy placement should target the source player");
  assert.equal(publicSpectaclePendings[0].source, "Public Spectacle");
  assert.equal(publicSpectaclePendings[1].source, "Public Spectacle");
  assert.equal(publicSpectaclePendings[1].sourceEffect, "gain-influence-choice");
  assert.equal(publicSpectaclePendings[1].amount, 1);
  assert.equal(publicSpectaclePendings[1].cardId, publicSpectacle.id);
  assert.equal(publicSpectaclePendings[1].cardOwnerId, p2.id);
  assert.equal(publicSpectaclePendings[1].trashSource, undefined, "Public Spectacle should not trash itself after Influence");
  assert.ok(publicSpectaclePendings[1].choices.length > 0, "Public Spectacle should expose at least one Influence choice");

  const theacherousManeuverSource = pendingPrimitiveSource(theacherousManeuver);
  const theacherousManeuverPendings = state.pendingActionsForCard(
    theacherousManeuver,
    theacherousManeuverSource,
    pendingPrimitiveFixture(theacherousManeuverSource),
  );
  assert.deepEqual(
    theacherousManeuverPendings.map((pending) => pending.kind),
    ["board-influence-choice"],
    "Theacherous Maneuver should queue a typed Influence choice",
  );
  assert.equal(theacherousManeuverPendings[0].source, "Theacherous Maneuver");
  assert.equal(theacherousManeuverPendings[0].sourceEffect, "gain-influence-choice");
  assert.equal(theacherousManeuverPendings[0].amount, 1);
  assert.equal(theacherousManeuverPendings[0].cardId, theacherousManeuver.id);
  assert.equal(theacherousManeuverPendings[0].cardOwnerId, p2.id);
  assert.ok(theacherousManeuverPendings[0].choices.length > 0, "Theacherous Maneuver should expose Influence choices");

  const shaddamSignetPaidRewardSource = {
    ...p4,
    playArea: [emperorSignet],
    resources: { ...p4.resources, solari: 3 },
  };
  const shaddamSignetPaidRewardTarget = { ...p6, garrison: 0 };
  const shaddamSignetPaidRewardFixture = {
    ...game,
    pendingAction: undefined,
    pendingQueue: [],
    players: game.players.map((player) => {
      if (player.id === shaddamSignetPaidRewardSource.id) return shaddamSignetPaidRewardSource;
      if (player.id === shaddamSignetPaidRewardTarget.id) return shaddamSignetPaidRewardTarget;
      return player;
    }),
  };
  const shaddamSignetPaidRewardPendingOptions = shaddamSignetPaidRewardOptions.map((option) => {
    if (option.reward.kind === "recruit-troops") {
      return {
        id: option.id,
        resource: option.resource,
        cost: option.cost,
        reward: {
          kind: "recruit-troops",
          recipientId: shaddamSignetPaidRewardTarget.id,
          amount: option.reward.amount,
          destination: option.reward.destination,
        },
      };
    }
    return {
      id: option.id,
      resource: option.resource,
      cost: option.cost,
      reward: {
        kind: "gain-influence",
        recipientId: option.reward.selector === "self"
          ? shaddamSignetPaidRewardSource.id
          : shaddamSignetPaidRewardTarget.id,
        faction: option.reward.faction,
        amount: option.reward.amount,
      },
    };
  });
  assert.deepEqual(
    state.pendingActionsForCard(
      emperorSignet,
      shaddamSignetPaidRewardSource,
      shaddamSignetPaidRewardFixture,
      shaddamSignetPaidRewardTarget,
    ),
    [{
      kind: "paid-reward-choice",
      ownerId: shaddamSignetPaidRewardSource.id,
      cardId: emperorSignet.id,
      source: "Emperor of the Known Universe",
      options: shaddamSignetPaidRewardPendingOptions,
    }],
    "Shaddam Signet Ring should queue a generic paid reward choice pending action",
  );
  const shaddamSignetTroopRewardOption = shaddamSignetPaidRewardPendingOptions.find((option) =>
    option.reward.kind === "recruit-troops"
  );
  assert.ok(shaddamSignetTroopRewardOption, "Expected Shaddam Signet Ring to expose a troop paid-reward option");
  const shaddamSignetNoSupplyPending = {
    kind: "paid-reward-choice",
    ownerId: shaddamSignetPaidRewardSource.id,
    cardId: emperorSignet.id,
    source: "Emperor of the Known Universe",
    options: [shaddamSignetTroopRewardOption],
  };
  const shaddamSignetNoSupplyState = {
    ...shaddamSignetPaidRewardFixture,
    pendingAction: shaddamSignetNoSupplyPending,
    players: shaddamSignetPaidRewardFixture.players.map((player) =>
      player.id === shaddamSignetPaidRewardTarget.id
        ? { ...player, deployedTroops: 0, garrison: 12, jessicaMemories: 0 }
        : player
    ),
  };
  assert.equal(
    state.resolvePaidRewardChoice(
      shaddamSignetNoSupplyState,
      shaddamSignetNoSupplyPending,
      shaddamSignetTroopRewardOption.id,
    ),
    shaddamSignetNoSupplyState,
    "Paid reward troop choices should reject stale resolution when the recipient lacks troop supply",
  );
  assert.deepEqual(
    state.pendingActionsForCard(emperorSignet, shaddamSignetPaidRewardSource, shaddamSignetPaidRewardFixture),
    [],
    "Shaddam Signet Ring paid reward choice should require a valid activated Ally target",
  );
  const irulanPendingActionChoiceAcquireCard = marketAndImperiumCards.find((card) => card.cost === 1);
  assert.ok(irulanPendingActionChoiceAcquireCard, "Expected at least one cost-1 market or Imperium card for Irulan pending choice coverage");
  const irulanPendingActionChoiceTrashCard = { ...dagger, id: "irulan-pending-action-choice-trash-card" };
  const irulanPendingActionChoiceSource = {
    ...p6,
    leader: "Princess Irulan",
    role: "Ally",
    hand: [irulanPendingActionChoiceTrashCard],
    playArea: [allySignet],
  };
  const irulanPendingActionChoiceFixture = {
    ...game,
    imperiumRow: [irulanPendingActionChoiceAcquireCard],
    reserveMarket: [],
    throneRow: [],
    pendingAction: undefined,
    pendingQueue: [],
    players: game.players.map((player) =>
      player.id === irulanPendingActionChoiceSource.id ? irulanPendingActionChoiceSource : player
    ),
  };
  assert.deepEqual(
    state.pendingActionsForCard(
      allySignet,
      irulanPendingActionChoiceSource,
      irulanPendingActionChoiceFixture,
      irulanPendingActionChoiceSource,
      arrakeen,
    ),
    [{
      kind: "pending-action-choice",
      ownerId: irulanPendingActionChoiceSource.id,
      cardId: allySignet.id,
      source: "Chronicler's Insight",
      options: [
        {
          id: "acquire",
          label: "Acquire cost-1 card to hand",
          pending: {
            kind: "acquire-card",
            ownerId: irulanPendingActionChoiceSource.id,
            source: "Chronicler's Insight",
            minCost: 1,
            maxCost: 1,
            destination: "hand",
            optional: false,
          },
        },
        {
          id: "trash",
          label: "Trash hand card",
          pending: {
            kind: "trash-card",
            ownerId: irulanPendingActionChoiceSource.id,
            source: "Chronicler's Insight",
            optional: false,
            zones: ["hand"],
            spiceRewardCostThreshold: 1,
            spiceReward: 2,
          },
        },
      ],
    }],
    "Irulan Signet Ring should queue a generic pending action choice with acquire and trash branches",
  );
  const mixedPaidRewardCard = {
    ...convincingArgument,
    id: "effect-spec-mixed-paid-reward-card",
    name: "Effect Spec Mixed Paid Reward",
    effects: [agentSpec([{
      kind: "paid-reward-choice",
      selector: "self",
      source: "Mixed Paid Reward",
      options: [
        {
          id: "self-emperor",
          resource: "solari",
          cost: 2,
          reward: { kind: "gain-influence", selector: "self", faction: "emperor", amount: 1 },
        },
        {
          id: "ally-troop",
          resource: "solari",
          cost: 1,
          reward: { kind: "recruit-troops", selector: "activated-ally", amount: 1, destination: "garrison" },
        },
      ],
    }])],
  };
  const mixedPaidRewardSource = {
    ...p4,
    playArea: [mixedPaidRewardCard],
    resources: { ...p4.resources, solari: 2 },
  };
  const mixedPaidRewardFixture = {
    ...game,
    pendingAction: undefined,
    pendingQueue: [],
    players: game.players.map((player) => player.id === mixedPaidRewardSource.id ? mixedPaidRewardSource : player),
  };
  assert.deepEqual(
    state.pendingActionsForCard(mixedPaidRewardCard, mixedPaidRewardSource, mixedPaidRewardFixture),
    [{
      kind: "paid-reward-choice",
      ownerId: mixedPaidRewardSource.id,
      cardId: mixedPaidRewardCard.id,
      source: "Mixed Paid Reward",
      options: [{
        id: "self-emperor",
        resource: "solari",
        cost: 2,
        reward: {
          kind: "gain-influence",
          recipientId: mixedPaidRewardSource.id,
          faction: "emperor",
          amount: 1,
        },
      }],
    }],
    "Generic paid reward choices should keep valid self options when no activated Ally recipient is required",
  );
  const paidSpiceRewardCard = {
    ...convincingArgument,
    id: "effect-spec-paid-spice-reward-card",
    name: "Effect Spec Paid Spice Reward",
    effects: [agentSpec([{
      kind: "paid-reward-choice",
      selector: "self",
      source: "Paid Spice Reward",
      options: [{
        id: "spice",
        resource: "water",
        cost: 1,
        reward: { kind: "gain-resource", selector: "self", resource: "spice", amount: 2 },
      }],
    }])],
  };
  const paidSpiceRewardSource = {
    ...p4,
    playArea: [paidSpiceRewardCard],
    resources: { ...p4.resources, water: 1, spice: 0 },
  };
  const paidSpiceRewardFixture = {
    ...game,
    pendingAction: undefined,
    pendingQueue: [],
    turnSpiceGains: {},
    players: game.players.map((player) => player.id === paidSpiceRewardSource.id ? paidSpiceRewardSource : player),
  };
  const [paidSpiceRewardPending] = state.pendingActionsForCard(
    paidSpiceRewardCard,
    paidSpiceRewardSource,
    paidSpiceRewardFixture,
    paidSpiceRewardSource,
  );
  assert.deepEqual(
    paidSpiceRewardPending,
    {
      kind: "paid-reward-choice",
      ownerId: paidSpiceRewardSource.id,
      cardId: paidSpiceRewardCard.id,
      source: "Paid Spice Reward",
      options: [{
        id: "spice",
        resource: "water",
        cost: 1,
        reward: {
          kind: "gain-resource",
          recipientId: paidSpiceRewardSource.id,
          resource: "spice",
          amount: 2,
        },
      }],
    },
    "Generic paid reward choices should queue resource reward branches",
  );
  const paidSpiceRewardResolved = state.resolvePaidRewardChoice(
    { ...paidSpiceRewardFixture, pendingAction: paidSpiceRewardPending },
    paidSpiceRewardPending,
    "spice",
  );
  assert.equal(playerById(paidSpiceRewardResolved, paidSpiceRewardSource.id).resources.water, 0, "Paid spice reward should spend the payment resource");
  assert.equal(playerById(paidSpiceRewardResolved, paidSpiceRewardSource.id).resources.spice, 2, "Paid spice reward should gain spice");
  assert.equal(paidSpiceRewardResolved.turnSpiceGains[paidSpiceRewardSource.id], 2, "Paid spice rewards should count as turn spice gains");

  const bundledPaidRewardCard = {
    ...convincingArgument,
    id: "effect-spec-bundled-paid-reward-card",
    name: "Effect Spec Bundled Paid Reward",
    effects: [agentSpec([{
      kind: "paid-reward-choice",
      selector: "self",
      source: "Bundled Paid Reward",
      requirePayableOption: true,
      options: [{
        id: "bundle",
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
      }],
    }])],
  };
  const bundledPaidRewardSource = {
    ...p5,
    leader: "Lady Jessica",
    role: "Ally",
    playArea: [bundledPaidRewardCard],
    resources: { ...p5.resources, spice: 1 },
    intrigues: [],
    jessicaMemories: 0,
  };
  const bundledPaidRewardFixture = {
    ...game,
    pendingAction: undefined,
    pendingQueue: [],
    players: game.players.map((player) => player.id === bundledPaidRewardSource.id ? bundledPaidRewardSource : player),
  };
  const [bundledPaidRewardPending] = state.pendingActionsForCard(
    bundledPaidRewardCard,
    bundledPaidRewardSource,
    bundledPaidRewardFixture,
    bundledPaidRewardSource,
  );
  assert.deepEqual(
    bundledPaidRewardPending,
    {
      kind: "paid-reward-choice",
      ownerId: bundledPaidRewardSource.id,
      cardId: bundledPaidRewardCard.id,
      source: "Bundled Paid Reward",
      requirePayableOption: true,
      options: [{
        id: "bundle",
        resource: "spice",
        cost: 1,
        reward: {
          kind: "bundle",
          rewards: [
            { kind: "draw-intrigues", recipientId: bundledPaidRewardSource.id, amount: 1 },
            {
              kind: "gain-leader-counter",
              recipientId: bundledPaidRewardSource.id,
              counter: "jessicaMemories",
              amount: 1,
              troopSupplyCost: 1,
            },
          ],
        },
      }],
    },
    "Generic paid reward choices should queue bundled Intrigue and leader-counter rewards",
  );
  const bundledPaidRewardSupplyBefore = state.playerTroopSupply(bundledPaidRewardSource);
  const bundledPaidRewardResolved = state.resolvePaidRewardChoice(
    { ...bundledPaidRewardFixture, pendingAction: bundledPaidRewardPending },
    bundledPaidRewardPending,
    "bundle",
  );
  const bundledPaidRewardPlayer = playerById(bundledPaidRewardResolved, bundledPaidRewardSource.id);
  assert.equal(bundledPaidRewardPlayer.resources.spice, 0, "Bundled paid reward should spend the payment resource");
  assert.equal(bundledPaidRewardPlayer.jessicaMemories, 1, "Bundled paid reward should add a Jessica memory");
  assert.equal(
    state.playerTroopSupply(bundledPaidRewardPlayer),
    bundledPaidRewardSupplyBefore - 1,
    "Bundled paid reward leader-counter costs should consume troop supply",
  );
  assert.equal(bundledPaidRewardPlayer.intrigues.length, 1, "Bundled paid reward should draw Intrigues");
  const malformedLeaderCounterPending = {
    ...bundledPaidRewardPending,
    options: [{
      ...bundledPaidRewardPending.options[0],
      reward: {
        kind: "bundle",
        rewards: [
          { kind: "draw-intrigues", recipientId: bundledPaidRewardSource.id, amount: 1 },
          {
            kind: "gain-leader-counter",
            recipientId: bundledPaidRewardSource.id,
            counter: "jessicaMemories",
            amount: 2,
            troopSupplyCost: 1,
          },
        ],
      },
    }],
  };
  const malformedLeaderCounterState = {
    ...bundledPaidRewardFixture,
    pendingAction: malformedLeaderCounterPending,
  };
  assert.equal(
    state.resolvePaidRewardChoice(malformedLeaderCounterState, malformedLeaderCounterPending, "bundle"),
    malformedLeaderCounterState,
    "Paid reward resolver should reject malformed leader-counter rewards with mismatched troop costs",
  );
  const nestedBundlePending = {
    ...bundledPaidRewardPending,
    options: [{
      ...bundledPaidRewardPending.options[0],
      reward: {
        kind: "bundle",
        rewards: [
          {
            kind: "bundle",
            recipientId: bundledPaidRewardSource.id,
            rewards: [{ kind: "draw-intrigues", recipientId: bundledPaidRewardSource.id, amount: 1 }],
          },
          { kind: "draw-intrigues", recipientId: bundledPaidRewardSource.id, amount: 1 },
        ],
      },
    }],
  };
  const nestedBundleState = {
    ...bundledPaidRewardFixture,
    pendingAction: nestedBundlePending,
  };
  assert.equal(
    state.resolvePaidRewardChoice(nestedBundleState, nestedBundlePending, "bundle"),
    nestedBundleState,
    "Paid reward resolver should reject malformed nested bundle pendings instead of resolving partially",
  );
  const doubleMemoryPaidRewardCard = {
    ...convincingArgument,
    id: "effect-spec-double-memory-paid-reward-card",
    name: "Effect Spec Double Memory Paid Reward",
    effects: [agentSpec([{
      kind: "paid-reward-choice",
      selector: "self",
      source: "Double Memory Paid Reward",
      requirePayableOption: true,
      options: [{
        id: "double-memory",
        resource: "spice",
        cost: 1,
        reward: {
          kind: "bundle",
          rewards: [
            {
              kind: "gain-leader-counter",
              selector: "self",
              counter: "jessicaMemories",
              amount: 1,
              troopSupplyCost: 1,
            },
            {
              kind: "gain-leader-counter",
              selector: "self",
              counter: "jessicaMemories",
              amount: 1,
              troopSupplyCost: 1,
            },
          ],
        },
      }],
    }])],
  };
  const oneSupplyJessica = {
    ...p5,
    leader: "Lady Jessica",
    role: "Ally",
    garrison: 11,
    deployedTroops: 0,
    jessicaMemories: 0,
    playArea: [doubleMemoryPaidRewardCard],
    resources: { ...p5.resources, spice: 1 },
  };
  const oneSupplyJessicaFixture = {
    ...game,
    pendingAction: undefined,
    pendingQueue: [],
    players: game.players.map((player) => player.id === oneSupplyJessica.id ? oneSupplyJessica : player),
  };
  assert.deepEqual(
    state.pendingActionsForCard(doubleMemoryPaidRewardCard, oneSupplyJessica, oneSupplyJessicaFixture, oneSupplyJessica),
    [],
    "Paid reward pending creation should aggregate bundled leader-counter troop costs by recipient",
  );
}
