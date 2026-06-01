import assert from "node:assert/strict";

const leaderNames = {
  ladyAmber: "Lady Amber Metulli",
  ladyJessica: "Lady Jessica",
  reverendJessica: "Reverend Mother Jessica",
  staban: "Staban Tuek",
};

export async function runLeaderCharacterChoicesSmoke({
  captures,
  currentGame,
  initialPlayableGame,
  openApp,
  page,
  screenshot,
  server,
  setDebugGameAndWait,
  url,
  waitForNoPending,
  writeJson,
}) {
  await openApp(page, url, 1440, 1100);
  const states = await createLeaderCharacterChoiceStates(server, initialPlayableGame);
  await writeJson("pending-leader-character-choice-states.json", states);

  await setDebugGameAndWait(page, states.stabanUnseenNetwork);
  let pendingText = await page.locator(".pending-panel").innerText();
  assert.match(pendingText, /Unseen Network/i);
  assert.match(pendingText, /Spend 1 spice: \+3 Solari/i);
  await screenshot(page, captures, "pending-staban-unseen-network.png");
  let before = await currentGame(page);
  let ownerBefore = before.players.find((player) => player.id === "p2");
  await page.locator(".pending-panel").getByRole("button", { name: /Spend 1 spice: \+3 Solari/ }).click();
  await waitForNoPending(page);
  let after = await currentGame(page);
  let ownerAfter = after.players.find((player) => player.id === "p2");
  assert.equal(ownerAfter.resources.spice, ownerBefore.resources.spice - 1, "Staban should spend 1 spice");
  assert.equal(ownerAfter.resources.solari, ownerBefore.resources.solari + 3, "Staban should gain 3 Solari");

  await setDebugGameAndWait(page, states.amberDesertScouts);
  pendingText = await page.locator(".pending-panel").innerText();
  assert.match(pendingText, /Desert Scouts/i);
  assert.match(pendingText, /Retreat 1 troop/i);
  await screenshot(page, captures, "pending-amber-desert-scouts.png");
  before = await currentGame(page);
  ownerBefore = before.players.find((player) => player.id === "p3");
  await page.locator(".pending-panel").getByRole("button", { name: /Retreat 1 troop/ }).click();
  await waitForNoPending(page);
  after = await currentGame(page);
  ownerAfter = after.players.find((player) => player.id === "p3");
  assert.equal(ownerAfter.deployedTroops, ownerBefore.deployedTroops - 1, "Desert Scouts should retreat one troop");
  assert.equal(ownerAfter.garrison, ownerBefore.garrison + 1, "Desert Scouts should return the troop to garrison");
  assert.equal(ownerAfter.conflict, ownerBefore.conflict - 2, "Desert Scouts should remove one troop of strength");

  await setDebugGameAndWait(page, states.jessicaSpiceAgony);
  pendingText = await page.locator(".pending-panel").innerText();
  assert.match(pendingText, /Spice Agony/i);
  assert.match(pendingText, /Spend 1 spice: Intrigue \+ memory/i);
  await screenshot(page, captures, "pending-jessica-spice-agony.png");
  before = await currentGame(page);
  ownerBefore = before.players.find((player) => player.id === "p5");
  await page.locator(".pending-panel").getByRole("button", { name: /Spend 1 spice: Intrigue \+ memory/ }).click();
  await waitForNoPending(page);
  after = await currentGame(page);
  ownerAfter = after.players.find((player) => player.id === "p5");
  assert.equal(ownerAfter.resources.spice, ownerBefore.resources.spice - 1, "Spice Agony should spend 1 spice");
  assert.equal(ownerAfter.jessicaMemories, ownerBefore.jessicaMemories + 1, "Spice Agony should add one memory");
  assert.equal(ownerAfter.intrigues.length, ownerBefore.intrigues.length + 1, "Spice Agony should draw one Intrigue");

  await setDebugGameAndWait(page, states.jessicaWaterOfLife);
  pendingText = await page.locator(".pending-panel").innerText();
  assert.match(pendingText, /Water of Life/i);
  assert.match(pendingText, /Spend 1 spice: \+1 water/i);
  await screenshot(page, captures, "pending-jessica-water-of-life.png");
  before = await currentGame(page);
  ownerBefore = before.players.find((player) => player.id === "p5");
  await page.locator(".pending-panel").getByRole("button", { name: /Spend 1 spice: \+1 water/ }).click();
  await waitForNoPending(page);
  after = await currentGame(page);
  ownerAfter = after.players.find((player) => player.id === "p5");
  assert.equal(ownerAfter.resources.spice, ownerBefore.resources.spice - 1, "Water of Life should spend 1 spice");
  assert.equal(ownerAfter.resources.water, ownerBefore.resources.water + 1, "Water of Life should gain 1 water");

  await setDebugGameAndWait(page, states.jessicaReverendMother);
  pendingText = await page.locator(".pending-panel").innerText();
  assert.match(pendingText, /Reverend Mother/i);
  assert.match(pendingText, /repeat Expedition/i);
  await screenshot(page, captures, "pending-jessica-reverend-mother.png");
  before = await currentGame(page);
  ownerBefore = before.players.find((player) => player.id === "p5");
  await page.locator(".pending-panel").getByRole("button", { name: /Spend 1 water: repeat Expedition/ }).click();
  await page.waitForFunction(() => window.__DUNE_DEBUG__?.getGame().pendingAction?.kind === "contract");
  await page.locator(".pending-panel .contract-choice button").first().click();
  await waitForNoPending(page);
  after = await currentGame(page);
  ownerAfter = after.players.find((player) => player.id === "p5");
  assert.equal(ownerAfter.resources.water, ownerBefore.resources.water - 1, "Reverend Mother should spend 1 water");
  assert.equal(ownerAfter.resources.solari, ownerBefore.resources.solari, "Reverend Mother should not gain Expedition fallback Solari while contracts remain");
  assert.equal(ownerAfter.contracts.length, ownerBefore.contracts.length + 1, "Reverend Mother should repeat Expedition's contract pending action");

  await setDebugGameAndWait(page, states.jessicaOtherMemories);
  pendingText = await page.locator(".pending-panel").innerText();
  assert.match(pendingText, /Other Memories/i);
  assert.match(pendingText, /draw and flip/i);
  await screenshot(page, captures, "pending-jessica-other-memories.png");
  await page.locator(".pending-panel").getByRole("button", { name: /draw and flip/ }).click();
  await page.waitForFunction(() => window.__DUNE_DEBUG__?.getGame().pendingAction?.kind === "jessica-reverend-mother");
  after = await currentGame(page);
  ownerAfter = after.players.find((player) => player.id === "p5");
  assert.equal(ownerAfter.leader, leaderNames.reverendJessica, "Other Memories should flip Jessica");
  assert.equal(ownerAfter.jessicaMemories, 0, "Other Memories should return all memories");

  await setDebugGameAndWait(page, states.commandRespect);
  pendingText = await page.locator(".pending-panel").innerText();
  assert.match(pendingText, /Command Respect/i);
  assert.match(pendingText, /Trade with Gurney Halleck/i);
  await screenshot(page, captures, "pending-command-respect.png");
  before = await currentGame(page);
  const commandRespectCommanderBefore = before.players.find((player) => player.id === "p1");
  const commandRespectCardId = before.pendingAction.cardId;
  await page.locator(".pending-panel").getByRole("button", { name: /Trade with Gurney Halleck/ }).click();
  await page.waitForFunction(() => window.__DUNE_DEBUG__?.getGame().pendingAction?.kind === "trade");
  after = await currentGame(page);
  const commandRespectCommanderAfter = after.players.find((player) => player.id === "p1");
  assert.equal(after.pendingAction.partnerId, "p3", "Command Respect should open a locked trade with Gurney");
  assert.equal(after.pendingAction.resource, "intrigue", "Command Respect should open an Intrigue trade");
  assert.equal(after.pendingAction.partnerLocked, true, "Command Respect should lock the chosen partner");
  assert.equal(
    commandRespectCommanderBefore.playArea.some((card) => card.id === commandRespectCardId),
    true,
    "Command Respect should start in play area",
  );
  assert.equal(
    commandRespectCommanderAfter.playArea.some((card) => card.id === commandRespectCardId),
    false,
    "Command Respect should trash the card",
  );

  await setDebugGameAndWait(page, states.demandResults);
  pendingText = await page.locator(".pending-panel").innerText();
  assert.match(pendingText, /Demand Results/i);
  assert.match(pendingText, /assign both contracts/i);
  await screenshot(page, captures, "pending-demand-results.png");
  before = await currentGame(page);
  const demandResultsCommanderBefore = before.players.find((player) => player.id === "p4");
  const demandResultsAllyBefore = before.players.find((player) => player.id === "p2");
  const demandResultsSecondAllyBefore = before.players.find((player) => player.id === "p6");
  const demandResultsContractIds = [...before.pendingAction.contractIds];
  const demandResultsCardId = before.pendingAction.cardId;
  await page.locator(".pending-panel .contract-choice button").first().click();
  await waitForNoPending(page);
  after = await currentGame(page);
  const demandResultsCommanderAfter = after.players.find((player) => player.id === "p4");
  const demandResultsAllyAfter = after.players.find((player) => player.id === "p2");
  const demandResultsSecondAllyAfter = after.players.find((player) => player.id === "p6");
  assert.equal(
    demandResultsCommanderAfter.resources.solari,
    demandResultsCommanderBefore.resources.solari - 2,
    "Demand Results should spend 2 Solari",
  );
  assert.equal(
    demandResultsAllyAfter.contracts.length,
    demandResultsAllyBefore.contracts.length + 1,
    "Demand Results should assign a contract to the first Ally",
  );
  assert.equal(
    demandResultsSecondAllyAfter.contracts.length,
    demandResultsSecondAllyBefore.contracts.length + 1,
    "Demand Results should assign a contract to the second Ally",
  );
  assert.equal(
    demandResultsAllyAfter.contracts.at(-1).card.id,
    demandResultsContractIds[0],
    "Demand Results option 0 should assign the first contract to the first Ally",
  );
  assert.equal(
    demandResultsSecondAllyAfter.contracts.at(-1).card.id,
    demandResultsContractIds[1],
    "Demand Results option 0 should assign the second contract to the second Ally",
  );
  assert.equal(
    demandResultsCommanderAfter.playArea.some((card) => card.id === demandResultsCardId),
    false,
    "Demand Results should trash the card",
  );
  assert.equal(
    after.contractOffer.some((contract) => demandResultsContractIds.includes(contract.id)),
    false,
    "Demand Results should remove assigned contracts from the offer",
  );

  await setDebugGameAndWait(page, states.corrinoMight);
  pendingText = await page.locator(".pending-panel").innerText();
  assert.match(pendingText, /Corrino Might/i);
  assert.match(pendingText, /both Allies \+2 troops/i);
  await screenshot(page, captures, "pending-corrino-might.png");
  before = await currentGame(page);
  const corrinoCommanderBefore = before.players.find((player) => player.id === "p4");
  const corrinoFirstAllyBefore = before.players.find((player) => player.id === "p2");
  const corrinoSecondAllyBefore = before.players.find((player) => player.id === "p6");
  const corrinoCardId = before.pendingAction.cardId;
  await page.locator(".pending-panel").getByRole("button", { name: /both Allies \+2 troops/ }).click();
  await waitForNoPending(page);
  after = await currentGame(page);
  const corrinoCommanderAfter = after.players.find((player) => player.id === "p4");
  const corrinoFirstAllyAfter = after.players.find((player) => player.id === "p2");
  const corrinoSecondAllyAfter = after.players.find((player) => player.id === "p6");
  assert.equal(corrinoCommanderAfter.resources.spice, corrinoCommanderBefore.resources.spice - 3, "Corrino Might should spend 3 spice");
  assert.equal(corrinoFirstAllyAfter.garrison, corrinoFirstAllyBefore.garrison + 2, "Corrino Might should recruit for the first Ally");
  assert.equal(corrinoSecondAllyAfter.garrison, corrinoSecondAllyBefore.garrison + 2, "Corrino Might should recruit for the second Ally");
  assert.equal(
    corrinoCommanderAfter.playArea.some((card) => card.id === corrinoCardId),
    false,
    "Corrino Might should trash the card",
  );

  await setDebugGameAndWait(page, states.devastatingAssault);
  pendingText = await page.locator(".pending-panel").innerText();
  assert.match(pendingText, /Devastating Assault/i);
  assert.match(pendingText, /Spend 3 Solari: .+ \+5 strength/i);
  await screenshot(page, captures, "pending-devastating-assault.png");
  before = await currentGame(page);
  const assaultCommanderBefore = before.players.find((player) => player.id === "p4");
  const assaultRecipientBefore = before.players.find((player) => player.id === "p2");
  await page.locator(".pending-panel").getByRole("button", { name: /Spend 3 Solari: .+ \+5 strength/ }).click();
  await waitForNoPending(page);
  after = await currentGame(page);
  const assaultCommanderAfter = after.players.find((player) => player.id === "p4");
  const assaultRecipientAfter = after.players.find((player) => player.id === "p2");
  assert.equal(assaultCommanderAfter.resources.solari, assaultCommanderBefore.resources.solari - 3, "Devastating Assault should spend 3 Solari");
  assert.equal(assaultRecipientAfter.conflict, assaultRecipientBefore.conflict + 5, "Devastating Assault should add strength to the activated Ally");

  await setDebugGameAndWait(page, states.demandAttention);
  pendingText = await page.locator(".pending-panel").innerText();
  assert.match(pendingText, /Demand Attention/i);
  assert.match(pendingText, /Spend 4 Solari: Gurney Halleck \+1 Bene Gesserit Influence/i);
  await screenshot(page, captures, "pending-demand-attention.png");
  before = await currentGame(page);
  const demandAttentionCommanderBefore = before.players.find((player) => player.id === "p1");
  const demandAttentionRecipientBefore = before.players.find((player) => player.id === "p3");
  const demandAttentionCardId = before.pendingAction.cardId;
  await page.locator(".pending-panel").getByRole("button", { name: /Spend 4 Solari: Gurney Halleck \+1 Bene Gesserit Influence/ }).click();
  await waitForNoPending(page);
  after = await currentGame(page);
  const demandAttentionCommanderAfter = after.players.find((player) => player.id === "p1");
  const demandAttentionRecipientAfter = after.players.find((player) => player.id === "p3");
  assert.equal(
    demandAttentionCommanderAfter.resources.solari,
    demandAttentionCommanderBefore.resources.solari - 4,
    "Demand Attention should spend 4 Solari",
  );
  assert.equal(
    demandAttentionRecipientAfter.influence.bene,
    demandAttentionRecipientBefore.influence.bene + 1,
    "Demand Attention should add Bene Gesserit Influence",
  );
  assert.equal(
    demandAttentionCommanderAfter.playArea.some((card) => card.id === demandAttentionCardId),
    false,
    "Demand Attention should trash the card",
  );

  await setDebugGameAndWait(page, states.desertCall);
  pendingText = await page.locator(".pending-panel").innerText();
  assert.match(pendingText, /Desert Call/i);
  assert.match(pendingText, /Gurney Halleck summons 1 sandworm/i);
  await screenshot(page, captures, "pending-desert-call.png");
  before = await currentGame(page);
  const desertCallCommanderBefore = before.players.find((player) => player.id === "p1");
  const desertCallAllyBefore = before.players.find((player) => player.id === "p3");
  const desertCallCardId = before.pendingAction.cardId;
  await page.locator(".pending-panel").getByRole("button", { name: /Gurney Halleck summons 1 sandworm/ }).click();
  await waitForNoPending(page);
  after = await currentGame(page);
  const desertCallCommanderAfter = after.players.find((player) => player.id === "p1");
  const desertCallAllyAfter = after.players.find((player) => player.id === "p3");
  assert.equal(desertCallCommanderAfter.resources.water, desertCallCommanderBefore.resources.water - 1, "Desert Call should spend 1 water");
  assert.equal(desertCallAllyAfter.deployedSandworms, desertCallAllyBefore.deployedSandworms + 1, "Desert Call should summon one sandworm");
  assert.equal(desertCallAllyAfter.conflict, desertCallAllyBefore.conflict + 3, "Desert Call should add sandworm strength");
  assert.equal(
    desertCallCommanderAfter.playArea.some((card) => card.id === desertCallCardId),
    false,
    "Desert Call should trash the card",
  );

  await setDebugGameAndWait(page, states.threatenSpiceProduction);
  pendingText = await page.locator(".pending-panel").innerText();
  assert.match(pendingText, /Threaten Spice Production/i);
  assert.match(pendingText, /0\/7 spice committed/i);
  assert.match(pendingText, /Gurney Halleck/i);
  await screenshot(page, captures, "pending-threaten-spice-production.png");
  before = await currentGame(page);
  const threatenCommanderBefore = before.players.find((player) => player.id === "p1");
  const threatenFirstAllyBefore = before.players.find((player) => player.id === "p3");
  const threatenSecondAllyBefore = before.players.find((player) => player.id === "p5");
  const threatenCardId = before.pendingAction.cardId;
  await addThreatenSpice(page, "Muad'Dib", 1);
  await addThreatenSpice(page, "Muad'Dib", 2);
  await addThreatenSpice(page, "Muad'Dib", 3);
  await addThreatenSpice(page, "Gurney Halleck", 4);
  await addThreatenSpice(page, "Gurney Halleck", 5);
  await addThreatenSpice(page, "Lady Jessica", 6);
  await addThreatenSpice(page, "Lady Jessica", 7);
  await page.locator(".pending-panel").getByRole("button", { name: /Pay 7: \+1 VP/ }).click();
  await waitForNoPending(page);
  after = await currentGame(page);
  const threatenCommanderAfter = after.players.find((player) => player.id === "p1");
  const threatenFirstAllyAfter = after.players.find((player) => player.id === "p3");
  const threatenSecondAllyAfter = after.players.find((player) => player.id === "p5");
  assert.equal(threatenCommanderAfter.vp, threatenCommanderBefore.vp + 1, "Threaten Spice Production should grant 1 VP");
  assert.equal(threatenCommanderAfter.resources.spice, threatenCommanderBefore.resources.spice - 3, "Threaten Spice Production should spend commander spice");
  assert.equal(threatenFirstAllyAfter.resources.spice, threatenFirstAllyBefore.resources.spice - 2, "Threaten Spice Production should spend first Ally spice");
  assert.equal(threatenSecondAllyAfter.resources.spice, threatenSecondAllyBefore.resources.spice - 2, "Threaten Spice Production should spend second Ally spice");
  assert.equal(
    threatenCommanderAfter.playArea.some((card) => card.id === threatenCardId),
    false,
    "Threaten Spice Production should trash the card",
  );
}

async function createLeaderCharacterChoiceStates(server, initialPlayableGame) {
  const data = await server.ssrLoadModule("/src/game/data.ts");
  const state = await server.ssrLoadModule("/src/game/state.ts");
  const game = initialPlayableGame(state);
  const genericSignet = findCard(data.allyStarterCards, 531, "generic Ally Signet Ring");
  const commandRespect = findCard(data.commanderStarterDecks.muaddib, 546, "Command Respect");
  const demandAttention = findCard(data.commanderStarterDecks.muaddib, 548, "Demand Attention");
  const desertCall = findCard(data.commanderStarterDecks.muaddib, 549, "Desert Call");
  const threatenSpice = findCard(data.commanderStarterDecks.muaddib, 553, "Threaten Spice Production");
  const corrinoMight = findCard(data.commanderStarterDecks.shaddam, 556, "Corrino Might");
  const demandResults = findCard(data.commanderStarterDecks.shaddam, 558, "Demand Results");
  const devastatingAssault = findCard(data.commanderStarterDecks.shaddam, 559, "Devastating Assault");
  assert.ok(game.contractOffer[0] && game.contractOffer[1], "Expected two public contracts");

  const p1Seat = seatFor(game, "p1");
  const p2Seat = seatFor(game, "p2");
  const p3Seat = seatFor(game, "p3");
  const p4Seat = seatFor(game, "p4");
  const p5Seat = seatFor(game, "p5");

  const base = {
    ...game,
    phase: "playing",
    pendingAction: undefined,
    pendingQueue: [],
    turnReverendMotherJessicaRepeats: {},
  };
  const secrets = findSpace(data.boardSpaces, "secrets", "Secrets");
  const debugDevastatingAssault = { ...devastatingAssault, id: "debug-devastating-assault" };
  const devastatingAssaultState = {
    ...base,
    activeSeat: p4Seat,
    players: base.players.map((player) => {
      if (player.id === "p4") {
        return {
          ...player,
          resources: { ...player.resources, solari: 3 },
          swordmasterBonus: true,
          playArea: [debugDevastatingAssault, ...player.playArea],
        };
      }
      if (player.id === "p2") {
        return { ...player, conflict: 4, deployedSandworms: 0, deployedTroops: 1 };
      }
      return player;
    }),
  };
  const devastatingAssaultPending = state.pendingActionsForRevealPayResourceForStrength(
    debugDevastatingAssault,
    devastatingAssaultState.players.find((player) => player.id === "p4"),
    devastatingAssaultState,
    "p2",
  )[0];
  assert.ok(devastatingAssaultPending, "Expected a derived Devastating Assault payment pending action");
  const debugDemandAttention = { ...demandAttention, id: "debug-demand-attention" };
  const demandAttentionState = {
    ...base,
    activeSeat: p1Seat,
    players: base.players.map((player) => {
      if (player.id === "p1") {
        return {
          ...player,
          resources: { ...player.resources, solari: 4 },
          playArea: [debugDemandAttention, ...player.playArea],
        };
      }
      if (player.id === "p3") {
        return { ...player, influence: { ...player.influence, bene: 1 } };
      }
      return player;
    }),
  };
  const demandAttentionPending = state.pendingActionForCard(
    debugDemandAttention,
    demandAttentionState.players.find((player) => player.id === "p1"),
    demandAttentionState,
    demandAttentionState.players.find((player) => player.id === "p3"),
    secrets,
  );
  assert.ok(demandAttentionPending, "Expected a derived Demand Attention payment pending action");

  return {
    stabanUnseenNetwork: {
      ...base,
      activeSeat: p2Seat,
      players: base.players.map((player) =>
        player.id === "p2"
          ? withLeader(data, {
              ...player,
              resources: { ...player.resources, spice: 2, solari: 0 },
            }, leaderNames.staban)
          : player,
      ),
      pendingAction: {
        kind: "staban-unseen-network",
        ownerId: "p2",
        spaceId: "swordmaster",
        reward: "landsraad",
        source: "Unseen Network",
      },
    },
    amberDesertScouts: {
      ...base,
      activeSeat: p3Seat,
      players: base.players.map((player) =>
        player.id === "p3"
          ? withLeader(data, { ...player, conflict: 4, deployedTroops: 2, garrison: 1 }, leaderNames.ladyAmber)
          : { ...player, conflict: 0, deployedTroops: 0 },
      ),
      pendingAction: {
        kind: "amber-desert-scouts",
        ownerId: "p3",
        source: "Desert Scouts",
      },
    },
    jessicaSpiceAgony: {
      ...base,
      activeSeat: p5Seat,
      players: base.players.map((player) =>
        player.id === "p5"
          ? withLeader(data, {
              ...player,
              resources: { ...player.resources, spice: 2 },
              jessicaMemories: 1,
              playArea: [{ ...genericSignet, id: "debug-jessica-spice-agony-signet" }, ...player.playArea],
            }, leaderNames.ladyJessica)
          : player,
      ),
      pendingAction: {
        kind: "jessica-spice-agony",
        ownerId: "p5",
        cardId: "debug-jessica-spice-agony-signet",
        source: "Spice Agony",
      },
    },
    jessicaWaterOfLife: {
      ...base,
      activeSeat: p5Seat,
      players: base.players.map((player) =>
        player.id === "p5"
          ? withLeader(data, {
              ...player,
              resources: { ...player.resources, spice: 2, water: 0 },
              playArea: [{ ...genericSignet, id: "debug-jessica-water-of-life-signet" }, ...player.playArea],
            }, leaderNames.reverendJessica)
          : player,
      ),
      pendingAction: {
        kind: "jessica-water-of-life",
        ownerId: "p5",
        cardId: "debug-jessica-water-of-life-signet",
        source: "Water of Life",
      },
    },
    jessicaReverendMother: {
      ...base,
      activeSeat: p5Seat,
      players: base.players.map((player) =>
        player.id === "p5"
          ? withLeader(data, {
              ...player,
              resources: { ...player.resources, water: 1, solari: 0 },
            }, leaderNames.reverendJessica)
          : player,
      ),
      pendingAction: {
        kind: "jessica-reverend-mother",
        ownerId: "p5",
        spaceId: "expedition",
        source: "Reverend Mother",
      },
    },
    jessicaOtherMemories: {
      ...base,
      activeSeat: p5Seat,
      players: base.players.map((player) =>
        player.id === "p5"
          ? withLeader(data, {
              ...player,
              resources: { ...player.resources, water: 1 },
              jessicaMemories: 2,
            }, leaderNames.ladyJessica)
          : player,
      ),
      pendingAction: {
        kind: "jessica-other-memories",
        ownerId: "p5",
        source: "Other Memories",
        spaceId: "secrets",
      },
    },
    commandRespect: {
      ...base,
      activeSeat: p1Seat,
      players: base.players.map((player) =>
        player.id === "p1"
          ? {
              ...player,
              swordmasterBonus: true,
              playArea: [{ ...commandRespect, id: "debug-command-respect" }, ...player.playArea],
            }
          : player,
      ),
      pendingAction: {
        kind: "command-respect",
        commanderId: "p1",
        partnerIds: ["p3", "p5"],
        cardId: "debug-command-respect",
        source: "Command Respect",
      },
    },
    demandResults: {
      ...base,
      activeSeat: p4Seat,
      players: base.players.map((player) =>
        player.id === "p4"
          ? {
              ...player,
              resources: { ...player.resources, solari: 2 },
              playArea: [{ ...demandResults, id: "debug-demand-results" }, ...player.playArea],
            }
          : player,
      ),
      pendingAction: {
        kind: "demand-results",
        commanderId: "p4",
        allyIds: ["p2", "p6"],
        contractIds: [game.contractOffer[0].id, game.contractOffer[1].id],
        cardId: "debug-demand-results",
        source: "Demand Results",
      },
    },
    corrinoMight: {
      ...base,
      activeSeat: p4Seat,
      players: base.players.map((player) =>
        player.id === "p4"
          ? {
              ...player,
              resources: { ...player.resources, spice: 3 },
              playArea: [{ ...corrinoMight, id: "debug-corrino-might" }, ...player.playArea],
            }
          : player,
      ),
      pendingAction: {
        kind: "corrino-might",
        commanderId: "p4",
        allyIds: ["p2", "p6"],
        cost: 3,
        cardId: "debug-corrino-might",
        source: "Corrino Might",
      },
    },
    devastatingAssault: {
      ...devastatingAssaultState,
      pendingAction: devastatingAssaultPending,
    },
    demandAttention: {
      ...demandAttentionState,
      pendingAction: demandAttentionPending,
    },
    desertCall: {
      ...base,
      activeSeat: p1Seat,
      shieldWall: false,
      players: base.players.map((player) =>
        player.id === "p1"
          ? {
              ...player,
              resources: { ...player.resources, water: 1 },
              playArea: [{ ...desertCall, id: "debug-desert-call" }, ...player.playArea],
            }
          : player.id === "p3"
            ? { ...player, makerHooks: true, conflict: 0, deployedSandworms: 0 }
          : player,
      ),
      pendingAction: {
        kind: "desert-call",
        commanderId: "p1",
        allyId: "p3",
        cardId: "debug-desert-call",
        source: "Desert Call",
      },
    },
    threatenSpiceProduction: {
      ...base,
      activeSeat: p1Seat,
      players: base.players.map((player) => {
        if (player.id === "p1") {
          return {
            ...player,
            resources: { ...player.resources, spice: 3 },
            playArea: [{ ...threatenSpice, id: "debug-threaten-spice-production" }, ...player.playArea],
          };
        }
        if (player.id === "p3" || player.id === "p5") {
          return { ...player, resources: { ...player.resources, spice: 3 } };
        }
        return player;
      }),
      pendingAction: {
        kind: "threaten-spice-production",
        commanderId: "p1",
        contributorIds: ["p1", "p3", "p5"],
        contributions: {},
        cost: 7,
        cardId: "debug-threaten-spice-production",
        source: "Threaten Spice Production",
      },
    },
  };
}

function findCard(cards, sourceId, label) {
  const card = cards.find((candidate) => candidate.sourceId === sourceId);
  assert.ok(card, `Expected ${label}`);
  return card;
}

function findSpace(spaces, id, label) {
  const space = spaces.find((candidate) => candidate.id === id);
  assert.ok(space, `Expected ${label}`);
  return space;
}

function seatFor(game, playerId) {
  const seat = game.players.findIndex((player) => player.id === playerId);
  assert.ok(seat >= 0, `Expected player ${playerId}`);
  return seat;
}

function withLeader(data, player, leaderName) {
  return {
    ...player,
    leader: leaderName,
    leaderCard: data.leaderCardByName(leaderName),
  };
}

async function addThreatenSpice(page, leaderName, expectedTotal) {
  await page.locator(".pending-panel").getByLabel(`Add 1 spice from ${leaderName}`).click();
  await page.waitForFunction(
    (total) => {
      const pending = window.__DUNE_DEBUG__?.getGame().pendingAction;
      if (pending?.kind !== "threaten-spice-production") return false;
      return Object.values(pending.contributions).reduce((sum, amount) => sum + amount, 0) === total;
    },
    expectedTotal,
  );
}
