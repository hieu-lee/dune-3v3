import assert from "node:assert/strict";

export async function createTableChoiceStates(server, initialPlayableGame) {
  const data = await server.ssrLoadModule("/src/game/data.ts");
  const state = await server.ssrLoadModule("/src/game/state.ts");
  const game = initialPlayableGame(state);
  const shaddamSeat = game.players.findIndex((player) => player.id === "p4");
  const feydSeat = game.players.findIndex((player) => player.id === "p2");
  assert.ok(shaddamSeat >= 0, "Expected p4 in browser debug game");
  assert.ok(feydSeat >= 0, "Expected p2 in browser debug game");

  const throneRowCard = game.imperiumRow.find(state.canMoveCardToThroneRow);
  assert.ok(throneRowCard, "Expected an eligible Imperium Row card for Throne Row");
  const conflict = game.conflict ?? game.conflictDeck[0];
  assert.ok(conflict, "Expected a conflict card for same-team tie debug state");
  const chani = data.imperiumDeck.find((card) => card.name === "Chani, Clever Tactician");
  assert.ok(chani, "Expected Chani for Fremen Bond browser debug state");
  const unswervingLoyalty = data.imperiumDeck.find((card) => card.name === "Unswerving Loyalty");
  assert.ok(unswervingLoyalty, "Expected Unswerving Loyalty for Fremen Bond deploy-or-retreat browser debug state");
  const paracompass = data.imperiumDeck.find((card) => card.name === "Paracompass");
  assert.ok(paracompass, "Expected Paracompass for conditional reveal browser debug state");
  const wheelsWithinWheels = data.imperiumDeck.find((card) => card.name === "Wheels Within Wheels");
  assert.ok(wheelsWithinWheels, "Expected Wheels Within Wheels for reveal spy browser debug state");
  const spyNetwork = data.imperiumDeck.find((card) => card.name === "Spy Network");
  assert.ok(spyNetwork, "Expected Spy Network for reveal spy recall browser debug state");
  const spyNetworkRewardIntrigue = data.intrigueCards.find((card) => card.name === "Backed by CHOAM") ?? data.intrigueCards[0];
  assert.ok(spyNetworkRewardIntrigue, "Expected an Intrigue reward card for Spy Network browser debug state");
  const spyNetworkRecallSpaces = ["secrets", "high-council"].map((spaceId) => {
    const space = data.boardSpaces.find((candidate) => candidate.id === spaceId);
    assert.ok(space, `Expected ${spaceId} for Spy Network browser debug state`);
    return space;
  });
  const fremenSupport = data.imperiumDeck.find((card) =>
    card.id !== chani.id && card.traits?.includes("Faction: Fremen")
  );
  assert.ok(fremenSupport, "Expected another Fremen card for Fremen Bond browser debug state");
  const chaniFremenSupport = {
    ...cloneCard(fremenSupport),
    id: "debug-chani-fremen-bond-support",
    name: "Debug Fremen Bond Support",
    persuasion: 0,
    swords: 0,
    revealGain: undefined,
    effects: undefined,
  };
  const calculus = data.imperiumDeck.find((card) => card.name === "Calculus of Power");
  assert.ok(calculus, "Expected Calculus of Power for browser debug state");
  const calculusTrashTarget = data.imperiumDeck.find((card) =>
    card.id !== calculus.id && card.traits?.includes("Faction: Emperor")
  );
  assert.ok(calculusTrashTarget, "Expected an Emperor card for Calculus browser debug state");
  const imperialTent = data.emperorCommanderCards.find((card) => card.name === "Imperial Tent");
  assert.ok(imperialTent, "Expected Imperial Tent for declarative Throne Row browser debug state");
  const manipulate = data.intrigueCards.find((card) => card.name === "Manipulate");
  assert.ok(manipulate, "Expected Manipulate for Plot row-manipulation browser debug state");
  const inspireAwe = data.intrigueCards.find((card) => card.name === "Inspire Awe");
  assert.ok(inspireAwe, "Expected Inspire Awe for Plot acquisition browser debug state");
  const sietchRitual = data.intrigueCards.find((card) => card.name === "Sietch Ritual");
  assert.ok(sietchRitual, "Expected Sietch Ritual for Plot discard-for-Influence browser debug state");
  const specialMission = data.intrigueCards.find((card) => card.name === "Special Mission");
  assert.ok(specialMission, "Expected Special Mission for Plot City spy browser debug state");
  const changeAllegiances = data.intrigueCards.find((card) => card.name === "Change Allegiances");
  assert.ok(changeAllegiances, "Expected Change Allegiances for Plot Influence browser debug state");
  const buyAccess = data.intrigueCards.find((card) => card.name === "Buy Access");
  assert.ok(buyAccess, "Expected Buy Access for Plot Influence browser debug state");
  const imperiumPolitics = data.intrigueCards.find((card) => card.name === "Imperium Politics");
  assert.ok(imperiumPolitics, "Expected Imperium Politics for Plot Influence browser debug state");
  const manipulateRowCard = data.imperiumDeck.find((card) => (card.cost ?? 0) > 0);
  assert.ok(manipulateRowCard, "Expected a priced Imperium Row card for Manipulate browser debug state");
  const manipulateReplacement = data.imperiumDeck.find((card) => card.id !== manipulateRowCard.id);
  assert.ok(manipulateReplacement, "Expected a Manipulate replacement row card for browser debug state");
  const inspireAweAcquireCard = data.imperiumDeck.find((card) => (card.cost ?? 0) <= 3);
  assert.ok(inspireAweAcquireCard, "Expected a low-cost Imperium Row card for Inspire Awe browser debug state");
  const inspireAweReplacement = data.imperiumDeck.find((card) => card.id !== inspireAweAcquireCard.id);
  assert.ok(inspireAweReplacement, "Expected an Inspire Awe replacement row card for browser debug state");
  const baseSietchRitualDiscardCard = data.allyStarterCards.find((card) => card.name === "Dagger");
  assert.ok(baseSietchRitualDiscardCard, "Expected a hand card for Sietch Ritual browser debug state");
  const sietchRitualDiscardCard = {
    ...cloneCard(baseSietchRitualDiscardCard),
    id: "debug-sietch-ritual-discard-card",
    name: "Debug Sietch Card",
  };

  const base = {
    ...game,
    phase: "playing",
    pendingAction: undefined,
    pendingQueue: [],
  };
  const imperialTentCard = cloneCard(imperialTent);
  const imperialTentPlayers = base.players.map((player) =>
    player.id === "p4"
      ? { ...player, playArea: [imperialTentCard], hand: [] }
      : player,
  );
  const imperialTentState = {
    ...base,
    activeSeat: shaddamSeat,
    players: imperialTentPlayers,
  };
  const imperialTentSource = imperialTentPlayers.find((player) => player.id === "p4");
  assert.ok(imperialTentSource, "Expected Shaddam for declarative Throne Row browser debug state");
  const imperialTentPending = state.pendingActionForCard(imperialTentCard, imperialTentSource, imperialTentState);
  assert.deepEqual(
    imperialTentPending,
    { kind: "throne-row", ownerId: "p4", source: "Imperial Tent" },
    "Imperial Tent should create the browser debug Throne Row pending action through card rules",
  );
  const wheelsRevealSpy = {
    ...base,
    activeSeat: feydSeat,
    sharedSpyPosts: {},
    spyPosts: {},
    players: base.players.map((player) =>
      player.id === "p2"
        ? {
            ...player,
            agentsReady: 0,
            conflict: 0,
            deployedTroops: 0,
            discard: [],
            hand: [cloneCard(wheelsWithinWheels)],
            highCouncilSeat: false,
            persuasion: 0,
            playArea: [],
            revealed: false,
            spies: 1,
          }
        : { ...player, conflict: 0, deployedTroops: 0 }
    ),
  };
  const wheelsSpyPending = {
    kind: "spy",
    ownerId: "p2",
    remaining: 1,
    mustPlaceSpy: true,
    source: "Wheels Within Wheels",
  };
  const wheelsSpySpace = state.placeableSpySpaces(wheelsRevealSpy, wheelsSpyPending)[0];
  assert.ok(wheelsSpySpace, "Expected a legal Wheels Within Wheels reveal spy post for browser debug state");
  const spyNetworkRevealRecall = {
    ...base,
    activeSeat: feydSeat,
    intrigueDeck: [cloneCard(spyNetworkRewardIntrigue)],
    intrigueDiscard: [],
    sharedSpyPosts: {},
    spyPosts: Object.fromEntries(spyNetworkRecallSpaces.map((space) => [space.id, "p2"])),
    turnSpyRecalls: {},
    players: base.players.map((player) =>
      player.id === "p2"
        ? {
            ...player,
            agentsReady: 0,
            conflict: 0,
            deployedTroops: 0,
            discard: [],
            hand: [cloneCard(spyNetwork)],
            highCouncilSeat: false,
            intrigues: [],
            persuasion: 0,
            playArea: [],
            revealed: false,
            spies: 0,
          }
        : { ...player, conflict: 0, deployedTroops: 0, intrigues: [] }
    ),
  };
  const specialMissionPlaceSpy = {
    ...base,
    activeSeat: feydSeat,
    intrigueDiscard: [],
    sharedSpyPosts: {},
    spyPosts: {},
    players: base.players.map((player) =>
      player.id === "p2"
        ? {
            ...player,
            hand: [],
            intrigues: [cloneCard(specialMission)],
            revealed: false,
            spies: 1,
          }
        : { ...player, intrigues: [] }
    ),
  };
  const specialMissionPlayer = specialMissionPlaceSpy.players.find((player) => player.id === "p2");
  assert.ok(specialMissionPlayer, "Expected Feyd for Special Mission browser debug state");
  const specialMissionSpySpaces = state.specialMissionCitySpySpaces(specialMissionPlaceSpy, specialMissionPlayer);
  const specialMissionSpySpace = specialMissionSpySpaces.find((space) =>
    state.spyObservationPostLabelForSpace(space.id).includes(" / ")
  ) ?? specialMissionSpySpaces[0];
  assert.ok(specialMissionSpySpace, "Expected a legal Special Mission City spy post for browser debug state");
  const specialMissionRecallSeedSpace =
    data.boardSpaces.find((space) => space.id === "deliver-supplies") ??
    data.boardSpaces.find((space) => space.icon !== "city");
  assert.ok(specialMissionRecallSeedSpace, "Expected a non-City space for Special Mission recall browser debug state");
  const specialMissionRecallSpy = {
    ...base,
    activeSeat: feydSeat,
    intrigueDiscard: [],
    shieldWall: true,
    sharedSpyPosts: {},
    spyPosts: { [state.spyObservationPostIdForSpace(specialMissionRecallSeedSpace.id)]: "p2" },
    turnSpiceGains: {},
    players: base.players.map((player) =>
      player.id === "p2"
        ? {
            ...player,
            hand: [],
            intrigues: [cloneCard(specialMission)],
            resources: { ...player.resources, spice: 0 },
            revealed: false,
            spies: 2,
          }
        : { ...player, intrigues: [] }
    ),
  };
  const specialMissionRecallPlayer = specialMissionRecallSpy.players.find((player) => player.id === "p2");
  assert.ok(specialMissionRecallPlayer, "Expected Feyd for Special Mission recall browser debug state");
  const specialMissionRecallSpace = state.specialMissionRecallSpySpaces(
    specialMissionRecallSpy,
    specialMissionRecallPlayer,
  ).find((space) => space.id === specialMissionRecallSeedSpace.id);
  assert.ok(specialMissionRecallSpace, "Expected a legal Special Mission recall spy post for browser debug state");

  return {
    retreatTroopsForStrength: {
      ...base,
      activeSeat: feydSeat,
      players: base.players.map((player) =>
        player.id === "p2"
          ? { ...player, conflict: 4, deployedTroops: 2, garrison: 0 }
          : { ...player, conflict: 0, deployedTroops: 0 }
      ),
      pendingAction: {
        kind: "retreat-troops-for-strength",
        ownerId: "p2",
        combatRecipientId: "p2",
        troopCount: 2,
        strength: 4,
        optional: true,
        source: "Browser debug retreat",
      },
    },
    chaniFremenBondReveal: {
      ...base,
      activeSeat: feydSeat,
      players: base.players.map((player) =>
        player.id === "p2"
          ? {
              ...player,
              agentsReady: 0,
              conflict: 0,
              deployedTroops: 0,
              discard: [],
              hand: [cloneCard(chani), chaniFremenSupport],
              highCouncilSeat: false,
              persuasion: 0,
              playArea: [],
              revealed: false,
            }
          : { ...player, conflict: 0, deployedTroops: 0 }
      ),
    },
    unswervingLoyaltyRevealDeployOrRetreat: {
      ...base,
      activeSeat: feydSeat,
      players: base.players.map((player) =>
        player.id === "p2"
          ? {
              ...player,
              agentsReady: 0,
              conflict: 2,
              deployedTroops: 1,
              discard: [],
              garrison: 0,
              hand: [cloneCard(unswervingLoyalty), chaniFremenSupport],
              highCouncilSeat: false,
              persuasion: 0,
              playArea: [],
              revealed: false,
            }
          : { ...player, conflict: 0, deployedTroops: 0 }
      ),
    },
    paracompassReveal: {
      ...base,
      activeSeat: feydSeat,
      players: base.players.map((player) =>
        player.id === "p2"
          ? {
              ...player,
              agentsReady: 0,
              conflict: 0,
              deployedTroops: 0,
              discard: [],
              hand: [cloneCard(paracompass)],
              highCouncilSeat: true,
              persuasion: 0,
              playArea: [],
              revealed: false,
              swordmasterBonus: true,
            }
          : { ...player, conflict: 0, deployedTroops: 0 }
      ),
    },
    wheelsWithinWheelsRevealSpy: wheelsRevealSpy,
    wheelsRevealSpyPostId: state.spyObservationPostIdForSpace(wheelsSpySpace.id),
    wheelsRevealSpySpaceName: state.spyObservationPostLabelForSpace(wheelsSpySpace.id),
    spyNetworkRevealRecall,
    spyNetworkRecallPostId: state.spyObservationPostIdForSpace(spyNetworkRecallSpaces[0].id),
    spyNetworkRecallSpaceName: state.spyObservationPostLabelForSpace(spyNetworkRecallSpaces[0].id),
    spyNetworkRewardIntrigueName: spyNetworkRewardIntrigue.name,
    calculusTrashReveal: {
      ...base,
      activeSeat: feydSeat,
      players: base.players.map((player) =>
        player.id === "p2"
          ? {
              ...player,
              agentsReady: 0,
              conflict: 4,
              deployedSandworms: 0,
              deployedTroops: 1,
              discard: [],
              hand: [cloneCard(calculus)],
              highCouncilSeat: false,
              persuasion: 0,
              playArea: [cloneCard(calculusTrashTarget)],
              revealed: false,
            }
          : { ...player, conflict: 0, deployedSandworms: 0, deployedTroops: 0 }
      ),
    },
    calculusTrashTargetId: calculusTrashTarget.id,
    calculusTrashTargetName: calculusTrashTarget.name,
    inspireAweAlly: {
      ...base,
      activeSeat: feydSeat,
      imperiumRow: [cloneCard(inspireAweAcquireCard)],
      intrigueDiscard: [],
      marketDeck: [cloneCard(inspireAweReplacement)],
      players: base.players.map((player) =>
        player.id === "p2"
          ? {
              ...player,
              deployedSandworms: 0,
              discard: [],
              hand: [],
              intrigues: [cloneCard(inspireAwe)],
              revealed: false,
            }
          : { ...player, intrigues: [] }
      ),
    },
    inspireAweCommander: {
      ...base,
      activeSeat: shaddamSeat,
      imperiumRow: [cloneCard(inspireAweAcquireCard)],
      intrigueDiscard: [],
      marketDeck: [cloneCard(inspireAweReplacement)],
      players: base.players.map((player) => {
        if (player.id === "p4") {
          return {
            ...player,
            deployedSandworms: 0,
            discard: [],
            hand: [],
            intrigues: [cloneCard(inspireAwe)],
            revealActivatedAllyId: "p6",
            revealed: true,
          };
        }
        if (player.id === "p6") {
          return {
            ...player,
            deployedSandworms: 1,
            hand: [],
            intrigues: [],
          };
        }
        return { ...player, deployedSandworms: 0, intrigues: [] };
      }),
    },
    inspireAweAcquireCardId: inspireAweAcquireCard.id,
    inspireAweAcquireCardName: inspireAweAcquireCard.name,
    inspireAweReplacementCardId: inspireAweReplacement.id,
    sietchRitualAlly: {
      ...base,
      activeSeat: feydSeat,
      intrigueDiscard: [],
      players: base.players.map((player) =>
        player.id === "p2"
          ? {
              ...player,
              discard: [],
              hand: [cloneCard(sietchRitualDiscardCard)],
              influence: { ...player.influence, bene: 1, fringeWorlds: 1 },
              intrigues: [cloneCard(sietchRitual)],
              revealed: false,
            }
          : { ...player, intrigues: [] }
      ),
    },
    sietchRitualCommander: {
      ...base,
      activeSeat: shaddamSeat,
      intrigueDiscard: [],
      players: base.players.map((player) => {
        if (player.id === "p4") {
          return {
            ...player,
            discard: [],
            hand: [cloneCard(sietchRitualDiscardCard)],
            influence: { ...player.influence, bene: 0 },
            intrigues: [cloneCard(sietchRitual)],
            revealActivatedAllyId: "p6",
            revealed: true,
          };
        }
        if (player.id === "p6") {
          return {
            ...player,
            influence: { ...player.influence, bene: 1 },
            intrigues: [],
          };
        }
        return { ...player, intrigues: [] };
      }),
    },
    sietchRitualDiscardCardId: sietchRitualDiscardCard.id,
    sietchRitualDiscardCardName: sietchRitualDiscardCard.name,
    specialMissionPlaceSpy,
    specialMissionSpySpaceId: state.spyObservationPostIdForSpace(specialMissionSpySpace.id),
    specialMissionSpySpaceName: state.spyObservationPostLabelForSpace(specialMissionSpySpace.id),
    specialMissionRecallSpy,
    specialMissionRecallPostId: state.spyObservationPostIdForSpace(specialMissionRecallSeedSpace.id),
    specialMissionRecallSpaceName: state.spyObservationPostLabelForSpace(specialMissionRecallSpace.id),
    changeAllegiancesAlly: {
      ...base,
      activeSeat: feydSeat,
      intrigueDiscard: [],
      players: base.players.map((player) =>
        player.id === "p2"
          ? {
              ...player,
              hand: [],
              influence: { ...player.influence, greatHouses: 1, spacing: 1, bene: 1 },
              intrigues: [cloneCard(changeAllegiances)],
              resources: { ...player.resources, spice: 3 },
              revealed: false,
            }
          : { ...player, intrigues: [] }
      ),
    },
    changeAllegiancesCommander: {
      ...base,
      activeSeat: shaddamSeat,
      intrigueDiscard: [],
      players: base.players.map((player) => {
        if (player.id === "p4") {
          return {
            ...player,
            hand: [],
            influence: { ...player.influence, emperor: 1, greatHouses: 0 },
            intrigues: [cloneCard(changeAllegiances)],
            resources: { ...player.resources, spice: 3 },
            revealActivatedAllyId: "p6",
            revealed: true,
          };
        }
        if (player.id === "p6") {
          return {
            ...player,
            influence: { ...player.influence, bene: 1, greatHouses: 1 },
            intrigues: [],
          };
        }
        return { ...player, intrigues: [] };
      }),
    },
    buyAccessAlly: {
      ...base,
      activeSeat: feydSeat,
      intrigueDiscard: [],
      players: base.players.map((player) =>
        player.id === "p2"
          ? {
              ...player,
              hand: [],
              influence: { ...player.influence, greatHouses: 1, bene: 1, spacing: 1 },
              intrigues: [cloneCard(buyAccess)],
              resources: { ...player.resources, solari: 5 },
              revealed: false,
            }
          : { ...player, intrigues: [] }
      ),
    },
    buyAccessCommander: {
      ...base,
      activeSeat: shaddamSeat,
      intrigueDiscard: [],
      players: base.players.map((player) => {
        if (player.id === "p4") {
          return {
            ...player,
            hand: [],
            influence: { ...player.influence, emperor: 1, bene: 0 },
            intrigues: [cloneCard(buyAccess)],
            resources: { ...player.resources, solari: 5 },
            revealActivatedAllyId: "p6",
            revealed: true,
          };
        }
        if (player.id === "p6") {
          return {
            ...player,
            influence: { ...player.influence, bene: 1 },
            intrigues: [],
          };
        }
        return { ...player, intrigues: [] };
      }),
    },
    buyAccessCommanderTargetName: "Princess Irulan",
    imperiumPoliticsAlly: {
      ...base,
      activeSeat: feydSeat,
      intrigueDiscard: [],
      players: base.players.map((player) =>
        player.id === "p2"
          ? {
              ...player,
              hand: [],
              influence: { ...player.influence, greatHouses: 1, spacing: 1, emperor: 1 },
              intrigues: [cloneCard(imperiumPolitics)],
              resources: { ...player.resources, solari: 2 },
              revealed: false,
            }
          : { ...player, intrigues: [] }
      ),
    },
    imperiumPoliticsCommander: {
      ...base,
      activeSeat: shaddamSeat,
      intrigueDiscard: [],
      players: base.players.map((player) => {
        if (player.id === "p4") {
          return {
            ...player,
            hand: [],
            influence: { ...player.influence, emperor: 1, greatHouses: 0, spacing: 0 },
            intrigues: [cloneCard(imperiumPolitics)],
            resources: { ...player.resources, solari: 2 },
            revealActivatedAllyId: "p6",
            revealed: true,
          };
        }
        if (player.id === "p6") {
          return {
            ...player,
            influence: { ...player.influence, greatHouses: 1, spacing: 1 },
            intrigues: [],
          };
        }
        return { ...player, intrigues: [] };
      }),
    },
    imperiumPoliticsCommanderTargetName: "Princess Irulan",
    manipulatePlot: {
      ...base,
      activeSeat: feydSeat,
      imperiumRow: [cloneCard(manipulateRowCard)],
      marketDeck: [cloneCard(manipulateReplacement)],
      players: base.players.map((player) =>
        player.id === "p2"
          ? {
              ...player,
              hand: [],
              intrigues: [cloneCard(manipulate)],
              manipulatedCards: [],
              persuasion: 0,
              revealed: false,
            }
          : { ...player, intrigues: [], manipulatedCards: [] }
      ),
    },
    manipulateButtonName: `Remove ${manipulateRowCard.name}`,
    manipulateIntrigueId: manipulate.id,
    manipulateReplacementCardId: manipulateReplacement.id,
    manipulateRowCardId: manipulateRowCard.id,
    manipulateRowCardName: manipulateRowCard.name,
    throneRow: {
      ...base,
      activeSeat: shaddamSeat,
      pendingAction: {
        kind: "throne-row",
        ownerId: "p4",
        source: "Browser debug Throne Row",
      },
    },
    throneRowCardId: throneRowCard.id,
    throneRowCardName: throneRowCard.name,
    imperialTentThroneRow: {
      ...imperialTentState,
      pendingAction: imperialTentPending,
    },
    imperialTentThroneRowCardId: throneRowCard.id,
    imperialTentThroneRowCardName: throneRowCard.name,
    conflictTie: {
      ...base,
      activeSeat: feydSeat,
      phase: "combat",
      conflict,
      conflictDeck: game.conflict === conflict ? game.conflictDeck : game.conflictDeck.slice(1),
      locationControl: {},
      players: base.players.map((player) => {
        if (player.id === "p3" || player.id === "p5") {
          return { ...player, conflict: 4, deployedTroops: 1, deployedSandworms: 0 };
        }
        return { ...player, conflict: 0, deployedTroops: 0, deployedSandworms: 0 };
      }),
      pendingAction: {
        kind: "conflict-tie",
        team: "muaddib",
        tiedPlayerIds: ["p3", "p5"],
        strength: 4,
        rank: 1,
        source: conflict.name,
      },
    },
  };
}

function cloneCard(card) {
  return { ...card, traits: card.traits ? [...card.traits] : undefined };
}
