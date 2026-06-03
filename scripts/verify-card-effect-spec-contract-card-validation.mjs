import assert from "node:assert/strict";
import { playerById } from "./verify-starter-decks-fixtures.mjs";

export function verifyCardEffectSpecContractCardValidation({
  boardSpaces,
  cards,
  data,
  effectResolver,
  game,
  players,
  state,
  turnActions,
  withActivePlayer,
}) {
  const { acceptContract, deliverSupplies, imperialBasin } = boardSpaces;
  const { dagger, interstellarTrade, priorityContracts, smuggler } = cards;
  const { p2 } = players;
  const noMakerReveal = turnActions.revealTurnPlan({ ...p2, hand: [smuggler], highCouncilSeat: false }, game);
  assert.equal(noMakerReveal.persuasion, 1, "Smuggler's Harvester spec should include base persuasion");
  assert.equal(noMakerReveal.revealGain.spice ?? 0, 0, "Smuggler's Harvester should not gain spice on Reveal");
  const makerReveal = turnActions.revealTurnPlan(
    { ...p2, hand: [smuggler], highCouncilSeat: false },
    { ...game, roundMakerSpaceVisits: { [p2.id]: [imperialBasin.id] } },
  );
  assert.equal(makerReveal.revealGain.spice ?? 0, 0, "Smuggler's Harvester Maker-space spice should stay on Agent play");
  const smugglerMakerAgentEffect = state.applyCardAgentEffect(
    smuggler,
    { ...p2, resources: { solari: 0, spice: 0, water: 0 } },
    p2,
    game,
    imperialBasin,
  );
  assert.deepEqual(
    smugglerMakerAgentEffect.source.resources,
    { solari: 0, spice: 1, water: 0 },
    "Smuggler's Harvester should gain 1 Agent spice on a Maker space",
  );
  assert.equal(
    smugglerMakerAgentEffect.sourceSpiceGained,
    1,
    "Smuggler's Harvester Agent spice should be tracked as turn spice gain",
  );
  assert.match(smugglerMakerAgentEffect.log ?? "", /Smuggler's Harvester: gains 1 spice/);
  const smugglerNonMakerAgentEffect = state.applyCardAgentEffect(
    smuggler,
    { ...p2, resources: { solari: 0, spice: 0, water: 0 } },
    p2,
    game,
    deliverSupplies,
  );
  assert.deepEqual(
    smugglerNonMakerAgentEffect.source.resources,
    { solari: 0, spice: 0, water: 0 },
    "Smuggler's Harvester should not gain Agent spice on a non-Maker space",
  );
  assert.equal(smugglerNonMakerAgentEffect.log, undefined, "Smuggler's Harvester should not log on non-Maker spaces");

  const completedContracts = data.standardContracts.slice(0, 2).map((card, index) => ({
    card,
    completed: true,
    takenRound: index + 1,
  }));
  const interstellarReveal = turnActions.revealTurnPlan({
    ...p2,
    contracts: [...completedContracts, { card: data.standardContracts[2], completed: false, takenRound: 1 }],
    hand: [interstellarTrade],
    highCouncilSeat: false,
  }, game);
  assert.equal(interstellarReveal.persuasion, 2, "Interstellar Trade should use completed-contract amount specs");
  assert.match(interstellarTrade.play, /No Agent effect/i);
  assert.doesNotMatch(interstellarTrade.play, /Acquire bonus|Gain one Influence|Take a face-up contract/i);
  assert.deepEqual(
    effectResolver.resolveGainInfluenceChoices(interstellarTrade.effects, {
      trigger: "acquire",
      source: p2,
      state: game,
    }),
    [{ selector: "self", amount: 1, trashSource: false, source: "Interstellar Trade" }],
    "Interstellar Trade acquire Influence choice should resolve from typed specs",
  );
  assert.deepEqual(
    effectResolver.resolveTakeContracts(interstellarTrade.effects, {
      trigger: "acquire",
      source: p2,
      state: game,
    }),
    [{ selector: "self", amount: 1, sourcePool: "public-offer", optional: false, source: "Interstellar Trade" }],
    "Interstellar Trade acquire contract bonus should resolve from typed specs",
  );
  const priorityContractsAgentResult = effectResolver.resolveGameEffects(priorityContracts.effects, {
    trigger: "agent-play",
    source: p2,
    state: game,
  });
  assert.equal(
    priorityContractsAgentResult.revealGain.spice,
    2,
    "Priority Contracts Agent spice bonus should resolve from typed specs",
  );
  assert.equal(
    priorityContractsAgentResult.vp,
    1,
    "Priority Contracts Agent VP bonus should resolve from typed specs",
  );
  assert.deepEqual(
    effectResolver.resolveTakeContracts(priorityContracts.effects, {
      trigger: "agent-play",
      source: p2,
      state: game,
    }),
    [{ selector: "self", amount: 1, sourcePool: "public-offer", optional: false, source: "Priority Contracts" }],
    "Priority Contracts contract bonus should resolve from typed Agent specs",
  );
  const priorityContractsAcquireReplacement = data.imperiumDeck.find((card) => card.id !== priorityContracts.id);
  assert.ok(priorityContractsAcquireReplacement, "Expected an Imperium Row replacement for Priority Contracts acquisition coverage");
  const priorityContractsAcquired = state.acquireMarketCard(
    {
      ...withActivePlayer(game, p2.id, () => ({
        discard: [],
        hand: [],
        persuasion: priorityContracts.cost,
        playArea: [],
        revealed: true,
        resources: { solari: 0, spice: 0, water: 0 },
        vp: 0,
      })),
      imperiumRow: [priorityContracts],
      marketDeck: [priorityContractsAcquireReplacement],
    },
    p2.id,
    priorityContracts.id,
  );
  assert.equal(playerById(priorityContractsAcquired, p2.id).vp, 0, "Acquiring Priority Contracts should not award its Agent VP");
  assert.equal(playerById(priorityContractsAcquired, p2.id).discard.at(-1)?.id, priorityContracts.id);
  assert.equal(priorityContractsAcquired.pendingAction, undefined, "Acquiring Priority Contracts should not queue Agent contract effects");
  const priorityContractsSpace = {
    id: "priority-contracts-test-space",
    name: "Priority Contracts Test Space",
    zone: "Landsraad",
    icon: "landsraad",
    detail: "Verifier-only Landsraad space without board pending rewards.",
  };
  const priorityContractsOffer = data.standardContracts[6];
  const priorityContractsReplacement = data.standardContracts[7];
  assert.ok(priorityContractsOffer && priorityContractsReplacement, "Expected standard contracts for Priority Contracts coverage");
  const priorityContractsPlaced = turnActions.placeAgentAction(
    {
      ...withActivePlayer(game, p2.id, () => ({
        agentsReady: 1,
        contracts: [],
        discard: [],
        hand: [priorityContracts],
        playArea: [],
        resources: { solari: 0, spice: 1, water: 0 },
        vp: 0,
      })),
      contractOffer: [priorityContractsOffer],
      contractDeck: [priorityContractsReplacement],
    },
    {
      commanderTargets: {},
      selectedCard: priorityContracts,
      selectedSpace: priorityContractsSpace,
    },
  );
  assert.deepEqual(
    priorityContractsPlaced.pendingAction,
    { kind: "contract", ownerId: p2.id, source: "Priority Contracts", publicOnly: true },
    "Priority Contracts should queue a public CHOAM contract after Agent placement",
  );
  assert.equal(playerById(priorityContractsPlaced, p2.id).resources.spice, 3, "Priority Contracts should grant 2 spice immediately");
  assert.equal(playerById(priorityContractsPlaced, p2.id).vp, 1, "Priority Contracts should grant 1 VP immediately");
  assert.match(priorityContractsPlaced.log[0], /Priority Contracts: gains 2 spice; gains 1 VP/);
  const priorityContractsResolved = state.takeChoamContract(
    priorityContractsPlaced,
    priorityContractsPlaced.pendingAction,
    priorityContractsOffer.id,
  );
  assert.equal(priorityContractsResolved.pendingAction, undefined);
  assert.equal(playerById(priorityContractsResolved, p2.id).contracts.at(-1)?.card.id, priorityContractsOffer.id);
  assert.deepEqual(
    priorityContractsResolved.contractOffer.map((contract) => contract.id),
    [priorityContractsReplacement.id],
    "Priority Contracts should refill the public contract offer after taking a contract",
  );
  const priorityContractsAcceptOffer = data.standardContracts[8];
  const priorityContractsAcceptRefillOffer = data.standardContracts[9];
  const priorityContractsAcceptReplacement = data.standardContracts[10];
  assert.ok(
    priorityContractsAcceptOffer && priorityContractsAcceptRefillOffer && priorityContractsAcceptReplacement,
    "Expected standard contracts for Priority Contracts Accept Contract coverage",
  );
  const priorityContractsAcceptPlaced = turnActions.placeAgentAction(
    {
      ...withActivePlayer(game, p2.id, () => ({
        agentsReady: 1,
        contracts: [],
        deck: [dagger],
        discard: [],
        hand: [priorityContracts],
        playArea: [],
        resources: { solari: 0, spice: 1, water: 0 },
        vp: 0,
      })),
      contractOffer: [priorityContractsAcceptOffer],
      contractDeck: [],
    },
    {
      commanderTargets: {},
      selectedCard: priorityContracts,
      selectedSpace: acceptContract,
    },
  );
  assert.deepEqual(
    priorityContractsAcceptPlaced.pendingAction,
    { kind: "contract", ownerId: p2.id, source: "Accept Contract", spaceId: "accept-contract" },
    "Accept Contract should queue its board contract choice before Priority Contracts",
  );
  assert.deepEqual(
    priorityContractsAcceptPlaced.pendingQueue,
    [{ kind: "contract", ownerId: p2.id, source: "Priority Contracts", publicOnly: true }],
    "Priority Contracts should queue behind the board contract choice",
  );
  const priorityContractsAcceptResolved = state.takeChoamContract(
    priorityContractsAcceptPlaced,
    priorityContractsAcceptPlaced.pendingAction,
    priorityContractsAcceptOffer.id,
  );
  assert.equal(
    priorityContractsAcceptResolved.pendingAction,
    undefined,
    "Priority Contracts should not leave a stale public-only contract pending when Accept Contract consumes the last offer",
  );
  assert.equal(priorityContractsAcceptResolved.pendingQueue.length, 0);
  assert.equal(playerById(priorityContractsAcceptResolved, p2.id).contracts.at(-1)?.card.id, priorityContractsAcceptOffer.id);
  assert.match(
    priorityContractsAcceptResolved.log[0],
    /cannot take a face-up CHOAM contract from Priority Contracts; no face-up CHOAM contracts remain/,
  );
  const priorityContractsAcceptRefillPlaced = turnActions.placeAgentAction(
    {
      ...withActivePlayer(game, p2.id, () => ({
        agentsReady: 1,
        contracts: [],
        deck: [dagger],
        discard: [],
        hand: [priorityContracts],
        playArea: [],
        resources: { solari: 0, spice: 1, water: 0 },
        vp: 0,
      })),
      contractOffer: [priorityContractsAcceptRefillOffer],
      contractDeck: [priorityContractsAcceptReplacement],
    },
    {
      commanderTargets: {},
      selectedCard: priorityContracts,
      selectedSpace: acceptContract,
    },
  );
  const priorityContractsAcceptRefilled = state.takeChoamContract(
    priorityContractsAcceptRefillPlaced,
    priorityContractsAcceptRefillPlaced.pendingAction,
    priorityContractsAcceptRefillOffer.id,
  );
  assert.deepEqual(
    priorityContractsAcceptRefilled.pendingAction,
    { kind: "contract", ownerId: p2.id, source: "Priority Contracts", publicOnly: true },
    "Priority Contracts should remain pending when Accept Contract refills a public contract",
  );
  assert.deepEqual(priorityContractsAcceptRefilled.contractOffer.map((contract) => contract.id), [
    priorityContractsAcceptReplacement.id,
  ]);
  const priorityContractsAcceptRefilledResolved = state.takeChoamContract(
    priorityContractsAcceptRefilled,
    priorityContractsAcceptRefilled.pendingAction,
    priorityContractsAcceptReplacement.id,
  );
  assert.equal(priorityContractsAcceptRefilledResolved.pendingAction, undefined);
  assert.deepEqual(
    playerById(priorityContractsAcceptRefilledResolved, p2.id).contracts.slice(-2).map((contract) => contract.card.id),
    [priorityContractsAcceptRefillOffer.id, priorityContractsAcceptReplacement.id],
    "Accept Contract plus Priority Contracts should take both contracts when the public offer refills",
  );
  const priorityContractsNoOffer = turnActions.placeAgentAction(
    {
      ...withActivePlayer(game, p2.id, () => ({
        agentsReady: 1,
        contracts: [],
        discard: [],
        hand: [priorityContracts],
        playArea: [],
        resources: { solari: 0, spice: 1, water: 0 },
        vp: 0,
      })),
      contractOffer: [],
      contractDeck: [],
    },
    {
      commanderTargets: {},
      selectedCard: priorityContracts,
      selectedSpace: priorityContractsSpace,
    },
  );
  assert.equal(priorityContractsNoOffer.pendingAction, undefined, "Priority Contracts should not queue when no public contracts remain");
  assert.equal(playerById(priorityContractsNoOffer, p2.id).resources.spice, 3, "Priority Contracts no-offer path should still grant spice");
  assert.equal(playerById(priorityContractsNoOffer, p2.id).vp, 1, "Priority Contracts no-offer path should still grant VP");

}
