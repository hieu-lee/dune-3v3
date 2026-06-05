import assert from "node:assert/strict";
import { playerById } from "./verify-starter-decks-fixtures.mjs";

export function verifyCardEffectSpecMakerFremenValidation({
  boardSpaces,
  cards,
  fixtures,
  game,
  players,
  state,
  turnActions,
  withActivePlayer,
}) {
  const { deliverSupplies, economicSupport, highCouncil, secrets } = boardSpaces;
  const { capturedMentat, convincingArgument, makerKeeper, northernWatermaster, paracompass, reliableInformant, shishakli } = cards;
  const { fremenSupportCard } = fixtures;
  const { p2 } = players;
  const makerKeeperSource = {
    ...p2,
    resources: { solari: 0, spice: 0, water: 0 },
    influence: { ...p2.influence, bene: 2, fringeWorlds: 2 },
  };
  const makerKept = state.applyCardAgentEffect(
    makerKeeper,
    makerKeeperSource,
    makerKeeperSource,
    { ...game, players: game.players.map((player) => player.id === p2.id ? makerKeeperSource : player) },
  );
  assert.deepEqual(
    makerKept.source.resources,
    { solari: 0, spice: 1, water: 1 },
    "Maker Keeper should use Fremen-icon influence for its conditional Agent spice",
  );
  assert.equal(makerKept.sourceSpiceGained, 1, "Maker Keeper Agent spice should be trackable");
  assert.match(makerKept.log ?? "", /Maker Keeper: gains 1 spice and 1 water/);
  const unqualifiedMakerKeeper = state.applyCardAgentEffect(
    makerKeeper,
    { ...makerKeeperSource, influence: p2.influence },
    { ...makerKeeperSource, influence: p2.influence },
    { ...game, players: game.players.map((player) => player.id === p2.id ? { ...makerKeeperSource, influence: p2.influence } : player) },
  );
  assert.deepEqual(
    unqualifiedMakerKeeper.source.resources,
    { solari: 0, spice: 0, water: 0 },
    "Maker Keeper should not gain Agent resources below Influence thresholds",
  );
  assert.equal(unqualifiedMakerKeeper.log, undefined, "Maker Keeper should not log when no Agent spec applies");
  const northernWatermasterEffect = state.applyCardAgentEffect(
    northernWatermaster,
    { ...p2, resources: { solari: 0, spice: 0, water: 0 } },
    p2,
  );
  assert.deepEqual(northernWatermasterEffect.source.resources, { solari: 0, spice: 0, water: 1 }, "Northern Watermaster should gain 1 Agent water");
  assert.match(northernWatermasterEffect.log ?? "", /Northern Watermaster: gains 1 water/);
  const northernSoloReveal = turnActions.revealTurnPlan(
    { ...p2, hand: [northernWatermaster], highCouncilSeat: false },
    game,
  );
  assert.equal(northernSoloReveal.persuasion, 1, "Northern Watermaster should always reveal for 1 persuasion");
  assert.deepEqual(northernSoloReveal.revealGain, {}, "Northern Watermaster Fremen Bond should not trigger by itself");
  const northernHandBondReveal = turnActions.revealTurnPlan(
    { ...p2, hand: [northernWatermaster, fremenSupportCard], highCouncilSeat: false },
    game,
  );
  assert.equal(northernHandBondReveal.persuasion, 1, "Northern Watermaster Fremen Bond support should not add persuasion");
  assert.deepEqual(
    northernHandBondReveal.revealGain,
    { spice: 2 },
    "Northern Watermaster Fremen Bond should gain 2 spice with another revealed Fremen card",
  );
  const northernPlayAreaBondReveal = turnActions.revealTurnPlan(
    { ...p2, hand: [northernWatermaster], playArea: [fremenSupportCard], highCouncilSeat: false },
    game,
  );
  assert.deepEqual(
    northernPlayAreaBondReveal.revealGain,
    { spice: 2 },
    "Northern Watermaster Fremen Bond should count a Fremen card already in play",
  );
  const shishakliSoloReveal = turnActions.revealTurnPlan(
    { ...p2, hand: [shishakli], highCouncilSeat: false },
    game,
  );
  assert.equal(shishakliSoloReveal.swords, 2, "Shishakli should always reveal for 2 strength");
  assert.deepEqual(shishakliSoloReveal.influenceGains, {}, "Shishakli Fremen Bond should not trigger by itself");
  const shishakliHandBondReveal = turnActions.revealTurnPlan(
    { ...p2, hand: [shishakli, fremenSupportCard], highCouncilSeat: false },
    game,
  );
  assert.deepEqual(
    shishakliHandBondReveal.influenceGains,
    { fremen: 1 },
    "Shishakli Fremen Bond should gain 1 Fremen Influence with another revealed Fremen card",
  );
  const shishakliPlayAreaBondReveal = turnActions.revealTurnPlan(
    { ...p2, hand: [shishakli], playArea: [fremenSupportCard], highCouncilSeat: false },
    game,
  );
  assert.deepEqual(
    shishakliPlayAreaBondReveal.influenceGains,
    { fremen: 1 },
    "Shishakli Fremen Bond should count a Fremen card already in play",
  );
  const shishakliRevealFixture = withActivePlayer(game, p2.id, (player) => ({
    ...player,
    agentsReady: 1,
    garrison: 0,
    hand: [shishakli, fremenSupportCard],
    highCouncilSeat: false,
    influence: { ...player.influence, fremen: 1 },
    playArea: [],
    vp: 0,
  }));
  const shishakliRevealPlan = turnActions.revealTurnPlan(
    playerById(shishakliRevealFixture, p2.id),
    shishakliRevealFixture,
  );
  const shishakliRevealed = turnActions.revealTurnAction(
    shishakliRevealFixture,
    { commanderTargets: {}, revealPlan: shishakliRevealPlan },
  );
  assert.equal(playerById(shishakliRevealed, p2.id).influence.fremen, 2, "Shishakli Reveal should apply Fremen Influence");
  assert.equal(playerById(shishakliRevealed, p2.id).vp, 1, "Shishakli Reveal Influence should resolve threshold VP");
  assert.match(shishakliRevealed.log[0], /gains 1 Fremen Influence/, "Shishakli Reveal log should mention Influence gain");
  const sameRevealBeneInfluenceCard = {
    ...convincingArgument,
    id: "captured-mentat-same-reveal-bene-fixture",
    name: "Captured Mentat Same Reveal Bene Fixture",
    effects: [
      {
        trigger: "reveal",
        effects: [{ kind: "gain-influence", selector: "self", faction: "bene", amount: 1 }],
      },
    ],
  };
  const shishakliCapturedMentatFixture = withActivePlayer(game, p2.id, (player) => ({
    ...player,
    agentsReady: 1,
    hand: [sameRevealBeneInfluenceCard, capturedMentat],
    highCouncilSeat: false,
    influence: {
      emperor: 0,
      spacing: 0,
      bene: 0,
      fremen: 0,
      greatHouses: 0,
      fringeWorlds: 0,
    },
    playArea: [],
  }));
  const shishakliCapturedMentatPlan = turnActions.revealTurnPlan(
    playerById(shishakliCapturedMentatFixture, p2.id),
    shishakliCapturedMentatFixture,
  );
  const shishakliCapturedMentatRevealed = turnActions.revealTurnAction(
    shishakliCapturedMentatFixture,
    { commanderTargets: {}, revealPlan: shishakliCapturedMentatPlan },
  );
  assert.equal(
    playerById(shishakliCapturedMentatRevealed, p2.id).influence.bene,
    1,
    "Reveal Influence should apply before same-reveal pending choices are generated",
  );
  assert.equal(
    shishakliCapturedMentatRevealed.pendingAction?.kind,
    "lose-influence-for-influence",
    "Captured Mentat should see Shishakli's same-reveal Influence gain when queuing its pending choice",
  );
  assert.equal(shishakliCapturedMentatRevealed.pendingAction?.source, "Captured Mentat");
  const paracompassEffect = state.applyCardAgentEffect(
    paracompass,
    { ...p2, resources: { solari: 0, spice: 0, water: 0 } },
    p2,
  );
  assert.deepEqual(paracompassEffect.source.resources, { solari: 2, spice: 0, water: 0 }, "Paracompass should gain 2 Agent Solari");
  assert.match(paracompassEffect.log ?? "", /Paracompass: gains 2 Solari/);
  const paracompassNoCouncilReveal = turnActions.revealTurnPlan(
    { ...p2, hand: [paracompass], highCouncilSeat: false, swordmasterBonus: false },
    game,
  );
  assert.equal(paracompassNoCouncilReveal.persuasion, 0, "Paracompass should not reveal for persuasion without High Council");
  const paracompassSwordmasterOnlyReveal = turnActions.revealTurnPlan(
    { ...p2, hand: [paracompass], highCouncilSeat: false, swordmasterBonus: true },
    game,
  );
  assert.equal(paracompassSwordmasterOnlyReveal.persuasion, 0, "Paracompass Swordmaster bonus should require High Council");
  const paracompassCouncilReveal = turnActions.revealTurnPlan(
    { ...p2, hand: [paracompass], highCouncilSeat: true, swordmasterBonus: false },
    game,
  );
  const highCouncilOnlyReveal = turnActions.revealTurnPlan(
    { ...p2, hand: [], highCouncilSeat: true, swordmasterBonus: false },
    game,
  );
  assert.equal(
    paracompassCouncilReveal.persuasion - highCouncilOnlyReveal.persuasion,
    2,
    "Paracompass should add 2 card persuasion with High Council",
  );
  const paracompassCouncilSwordmasterReveal = turnActions.revealTurnPlan(
    { ...p2, hand: [paracompass], highCouncilSeat: true, swordmasterBonus: true },
    game,
  );
  const highCouncilSwordmasterOnlyReveal = turnActions.revealTurnPlan(
    { ...p2, hand: [], highCouncilSeat: true, swordmasterBonus: true },
    game,
  );
  assert.equal(
    paracompassCouncilSwordmasterReveal.persuasion - highCouncilSwordmasterOnlyReveal.persuasion,
    3,
    "Paracompass should add 3 card persuasion with High Council and Swordmaster",
  );
  for (const [space, label] of [
    [economicSupport, "Great Houses"],
    [secrets, "Bene Gesserit"],
    [deliverSupplies, "Spacing Guild"],
  ]) {
    const reliableInformantSource = {
      ...p2,
      resources: { solari: 0, spice: 0, water: 0 },
      playArea: [reliableInformant],
    };
    const [reliableInformantPending] = state.pendingActionsForCard(
      reliableInformant,
      reliableInformantSource,
      {
        ...game,
        players: game.players.map((player) => player.id === p2.id ? reliableInformantSource : player),
      },
      p2,
      space,
    );
    assert.deepEqual(
      {
        kind: reliableInformantPending?.kind,
        remaining: reliableInformantPending?.remaining,
        placementIcon: reliableInformantPending?.placementIcon,
        source: reliableInformantPending?.source,
      },
      { kind: "spy", remaining: 1, placementIcon: space.icon, source: "Reliable Informant" },
      `Reliable Informant should place 1 Agent spy on ${label} spaces`,
    );
  }
  const reliableInformantLandsraadSource = {
    ...p2,
    resources: { solari: 0, spice: 0, water: 0 },
    playArea: [reliableInformant],
  };
  const reliableInformantLandsraadPendings = state.pendingActionsForCard(
    reliableInformant,
    reliableInformantLandsraadSource,
    {
      ...game,
      players: game.players.map((player) => player.id === p2.id ? reliableInformantLandsraadSource : player),
    },
    p2,
    highCouncil,
  );
  assert.deepEqual(
    reliableInformantLandsraadPendings,
    [],
    "Reliable Informant should not place an Agent spy on unrelated board-space icons",
  );
  const reliableInformantReveal = turnActions.revealTurnPlan(
    { ...p2, hand: [reliableInformant], highCouncilSeat: false },
    game,
  );
  assert.equal(reliableInformantReveal.persuasion, 1, "Reliable Informant should reveal for 1 persuasion");
  assert.deepEqual(reliableInformantReveal.revealGain, { solari: 1 }, "Reliable Informant should reveal for 1 Solari");
}
