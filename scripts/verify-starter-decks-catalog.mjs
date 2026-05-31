import assert from "node:assert/strict";
import { existsSync } from "node:fs";
import { join } from "node:path";

const projectRoot = new URL("..", import.meta.url);

function countNames(cards) {
  return cards.reduce((counts, card) => {
    counts[card.name] = (counts[card.name] ?? 0) + 1;
    return counts;
  }, {});
}

function allPlayerStarterCards(player) {
  return [...player.deck, ...player.hand, ...player.discard, ...player.playArea];
}

function assertLocalArt(cards, label) {
  for (const card of cards) {
    const artPath = card.thumbnailPath ?? card.imagePath;
    assert.ok(artPath, `${label}: ${card.name} is missing an art path`);
    assert.ok(artPath.startsWith("/assets/"), `${label}: ${card.name} art must be a local asset path`);
    assert.ok(
      existsSync(join(projectRoot.pathname, "public", artPath)),
      `${label}: ${card.name} art does not exist at ${artPath}`,
    );
  }
}

export function verifyStarterDeckCatalog({ data, state }) {
  assert.equal(data.allyStarterCards.length, 10, "Ally deck should contain 10 cards");
  assert.deepEqual(countNames(data.allyStarterCards), {
    "Convincing Argument": 2,
    Dagger: 2,
    Diplomacy: 1,
    "Dune, The Desert Planet": 2,
    Reconnaissance: 1,
    "Seek Allies": 1,
    "Signet Ring": 1,
  });
  assert.deepEqual(
    data.allyStarterCards.filter((card) => card.name === "Dagger").map((card) => card.icons),
    [["landsraad"], ["landsraad"]],
  );
  assert.equal(data.allyStarterCards.find((card) => card.name === "Seek Allies")?.trashOnPlay, true);
  assertLocalArt(data.allyStarterCards, "Ally deck");

  assert.equal(data.muadDibCommanderCards.length, 10, "Muad'Dib Commander deck should contain 10 cards");
  assert.deepEqual(countNames(data.muadDibCommanderCards), {
    "Command Respect": 1,
    "Convincing Argument": 1,
    "Demand Attention": 1,
    "Desert Call": 1,
    "Limited Landsraad Access": 2,
    "Seek Allies": 1,
    "Signet Ring": 1,
    "Threaten Spice Production": 1,
    Usul: 1,
  });
  assert.deepEqual(
    data.muadDibCommanderCards.filter((card) => card.name === "Limited Landsraad Access").map((card) => ({
      swords: card.swords,
      revealGain: card.revealGain,
    })),
    [
      { swords: 1, revealGain: { spice: 1 } },
      { swords: 1, revealGain: { spice: 1 } },
    ],
  );
  assert.equal(data.muadDibCommanderCards.find((card) => card.name === "Seek Allies")?.trashOnPlay, true);
  assert.match(
    data.muadDibCommanderCards.find((card) => card.name === "Command Respect")?.play ?? "",
    /trash this card to trade/i,
    "Command Respect should expose its automated Swordmaster trade payment",
  );
  assertLocalArt(data.muadDibCommanderCards, "Muad'Dib Commander deck");

  assert.equal(data.emperorCommanderCards.length, 10, "Emperor Commander deck should contain 10 cards");
  assert.deepEqual(countNames(data.emperorCommanderCards), {
    "Convincing Argument": 1,
    "Corrino Might": 1,
    "Critical Shipments": 1,
    "Demand Results": 1,
    "Devastating Assault": 1,
    "Imperial Ornithopter": 2,
    "Imperial Tent": 1,
    "Seek Allies": 1,
    "Signet Ring": 1,
  });
  assert.equal(data.emperorCommanderCards.find((card) => card.name === "Corrino Might")?.swords, 1);
  assert.equal(data.emperorCommanderCards.find((card) => card.name === "Corrino Might")?.conditionalSwords, undefined);
  assert.match(
    data.emperorCommanderCards.find((card) => card.name === "Corrino Might")?.reveal ?? "",
    /Spend 3 spice/,
    "Corrino Might should expose its automated reveal payment",
  );
  assert.equal(data.emperorCommanderCards.find((card) => card.name === "Demand Results")?.swords, 1);
  assert.deepEqual(
    data.emperorCommanderCards.filter((card) => card.name === "Imperial Ornithopter").map((card) => ({
      persuasion: card.persuasion,
      revealGain: card.revealGain,
    })),
    [
      { persuasion: 1, revealGain: { solari: 1 } },
      { persuasion: 1, revealGain: { solari: 1 } },
    ],
  );
  assert.equal(data.emperorCommanderCards.find((card) => card.name === "Seek Allies")?.trashOnPlay, true);
  assertLocalArt(data.emperorCommanderCards, "Emperor Commander deck");

  const game = state.initialGame();
  const [muadDib, shaddamAlly, muadDibAllyA, emperor, muadDibAllyB, shaddamAllyB] = game.players;
  const commanderDeckNames = countNames(allPlayerStarterCards(muadDib));
  assert.equal(commanderDeckNames["Command Respect"], 1, "Muad'Dib should use the Muad'Dib Commander deck");
  assert.equal(commanderDeckNames["Dune, The Desert Planet"] ?? 0, 0, "Muad'Dib should not use the Ally deck");
  assert.equal(countNames(allPlayerStarterCards(emperor))["Corrino Might"], 1, "Shaddam should use the Emperor deck");

  for (const player of game.players) {
    const cards = allPlayerStarterCards(player);
    assert.equal(cards.length, 10, `${player.id} should have 10 total starter cards`);
    assert.equal(new Set(cards.map((card) => card.id)).size, 10, `${player.id} physical card ids should be unique`);
  }

  for (const player of [shaddamAlly, muadDibAllyA, muadDibAllyB, shaddamAllyB]) {
    const names = countNames(allPlayerStarterCards(player));
    assert.equal(names["Dune, The Desert Planet"], 2, `${player.id} should use the Ally deck`);
    assert.equal(names["Seek Allies"], 1, `${player.id} should use the Ally deck`);
    assert.equal(names["Command Respect"] ?? 0, 0, `${player.id} should not use a Commander deck`);
  }

  return {
    game,
    players: { muadDib, shaddamAlly, muadDibAllyA, emperor, muadDibAllyB, shaddamAllyB },
  };
}
