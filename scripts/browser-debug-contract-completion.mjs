import assert from "node:assert/strict";

const agentCard = {
  id: "debug-contract-city-card",
  name: "Debug Contract City Card",
  icons: ["city"],
  persuasion: 0,
  swords: 0,
  play: "",
  reveal: "",
};

export async function runContractCompletionSmoke({
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
  const states = await createContractCompletionStates(server, initialPlayableGame);
  await writeJson("contract-completion-states.json", states);

  await setDebugGameAndWait(page, states.immediate);
  let pendingText = await page.locator(".pending-panel").innerText();
  assert.match(pendingText, /CHOAM contract/i);
  assert.match(pendingText, /Immediate/i);
  await screenshot(page, captures, "contract-immediate-pending.png");

  let before = await currentGame(page);
  let ownerBefore = playerById(before, "p2");
  await page.locator(".pending-panel").getByRole("button", { name: "Immediate" }).click();
  await waitForNoPending(page);
  let after = await currentGame(page);
  let ownerAfter = playerById(after, "p2");
  assert.equal(ownerAfter.resources.solari, ownerBefore.resources.solari + 2, "Immediate should pay 2 Solari");
  assert.equal(contractByName(ownerAfter, "Immediate").completed, true, "Immediate should complete when taken");
  await assertContractChip(page, "Immediate", "Done");
  await screenshot(page, captures, "contract-immediate-after.png");

  await setDebugGameAndWait(page, states.researchStation);
  await assertContractChip(page, "Research Station I", "Pending");
  await screenshot(page, captures, "contract-board-ready.png");

  await page.getByTestId(`hand-card-${agentCard.id}`).click();
  await page.getByTestId("space-research-station").click();
  const placeAgent = page.getByTestId("place-agent");
  assert.equal(await placeAgent.isEnabled(), true, "Research Station Agent placement should be legal");
  await placeAgent.click();

  await page.waitForFunction(() => {
    const game = window.__DUNE_DEBUG__?.getGame();
    const owner = game?.players.find((player) => player.id === "p2");
    return Boolean(
      game &&
        owner &&
        owner.contracts.some((contract) => contract.card.name === "Research Station I" && contract.completed) &&
        game.agentTurnComplete,
    );
  });
  after = await currentGame(page);
  ownerAfter = playerById(after, "p2");
  assert.equal(contractByName(ownerAfter, "Research Station I").completed, true);
  assert.ok(
    [after.pendingAction, ...after.pendingQueue].some((pending) => pending?.kind === "deploy"),
    "Research Station I troop reward should be available to the same Agent-turn deployment sequence",
  );
  await assertContractChip(page, "Research Station I", "Done");
  await screenshot(page, captures, "contract-board-after.png");
}

async function createContractCompletionStates(server, initialPlayableGame) {
  const data = await server.ssrLoadModule("/src/game/data.ts");
  const state = await server.ssrLoadModule("/src/game/state.ts");
  const game = initialPlayableGame(state);
  const activeSeat = game.players.findIndex((player) => player.id === "p2");
  assert.ok(activeSeat >= 0, "Expected p2 in browser debug game");

  const spaces = { ...game.spaces };
  delete spaces["research-station"];

  const base = {
    ...game,
    activeSeat,
    agentTurnComplete: false,
    pendingAction: undefined,
    pendingQueue: [],
    spaces,
  };

  return {
    immediate: updatePlayer({
      ...base,
      contractOffer: [contractFixture(data, "Immediate"), contractFixture(data, "Acquire")],
      contractDeck: [],
      pendingAction: {
        kind: "contract",
        ownerId: "p2",
        source: "Browser Debug Contract",
        spaceId: "accept-contract",
      },
    }, "p2", (player) => ({
      ...player,
      contracts: [],
    })),
    researchStation: updatePlayer(base, "p2", (player) => ({
      ...player,
      hand: [agentCard],
      playArea: [],
      agentsReady: Math.max(1, player.agentsReady),
      resources: { ...player.resources, water: player.resources.water + 2 },
      contracts: [
        {
          card: contractFixture(data, "Research Station I"),
          completed: false,
          takenRound: base.round,
        },
      ],
    })),
  };
}

function contractFixture(data, name) {
  const contract = [...data.standardContracts, ...data.shaddamReservedContracts]
    .find((candidate) => candidate.name === name);
  assert.ok(contract, `Expected contract fixture: ${name}`);
  return contract;
}

function updatePlayer(game, playerId, updater) {
  return {
    ...game,
    players: game.players.map((player) => player.id === playerId ? updater(player) : player),
  };
}

function playerById(game, playerId) {
  const player = game.players.find((candidate) => candidate.id === playerId);
  assert.ok(player, `Expected player ${playerId}`);
  return player;
}

function contractByName(player, name) {
  const contract = player.contracts.find((candidate) => candidate.card.name === name);
  assert.ok(contract, `Expected ${player.leader} to hold ${name}`);
  return contract;
}

async function assertContractChip(page, contractName, stateLabel) {
  const chip = page.locator(".contract-status-chip").filter({ hasText: contractName });
  assert.equal(await chip.count(), 1, `Expected one automated contract chip for ${contractName}`);
  assert.equal(await chip.locator("input").count(), 0, `${contractName} should not render as a manual checkbox`);
  assert.match(await chip.innerText(), new RegExp(stateLabel, "i"));
}
