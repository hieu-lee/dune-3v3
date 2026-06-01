import catalogJson from "./uprising-catalog.generated.json";
import {
  agentBlockConflictDeployment,
  agentCommanderResourceSplit,
  agentDrawCards,
  agentGainResource,
  agentMoveCardToThroneRow,
  agentPayResourceForInfluence,
  agentPlaceSpies,
  agentPlayEffects,
  agentRecruitTroops,
  cloneCardEffects,
  hasAlliance,
  hasConflictUnits,
  hasLeader,
  revealEffects,
  revealGainPersuasion,
  revealGainStrength,
  revealPayResourceForStrength,
  hasRole,
  hasSwordmasterBonus,
  hasTeam,
} from "./effect-specs";
import {
  gurneyHalleckLeaderName,
  ladyAmberMetulliLeaderName,
  ladyMargotFenringLeaderName,
  stabanTuekLeaderName,
} from "./leader-constants";
import type { Card, TeamId } from "./types";

type HubAttribute = [string, number | string | null];
type HubCard = {
  id: number;
  name: string;
  type: string;
  slug: string;
  fullImageUrl: string | null;
  thumbnailImageUrl: string | null;
  localImagePath: string | null;
  localThumbnailPath: string | null;
  attributes: HubAttribute[];
};

type StarterCardSpec = Omit<Card, "id"> & {
  id: string;
  copies?: number;
};

const catalog = catalogJson as unknown as { cards: HubCard[] };

function localOtherCard(filename: string) {
  return `/assets/dune-cards-hub/other/${filename}`;
}

function starterRevealText(persuasion: number, swords: number) {
  if (persuasion === 0 && swords === 0) return "No fixed reveal reward.";
  const parts: string[] = [];
  if (persuasion > 0) parts.push(`+${persuasion} persuasion`);
  if (swords > 0) parts.push(`+${swords} strength`);
  return `${parts.join(" and ")}.`;
}

function expandStarterCard(spec: StarterCardSpec): Card[] {
  const { copies = 1, ...card } = spec;
  return Array.from({ length: copies }, (_, index) => ({
    ...card,
    id: copies > 1 ? `${card.id}-${index + 1}` : card.id,
    effects: cloneCardEffects(card.effects),
    icons: [...card.icons],
    traits: [...(card.traits ?? []), "Starter deck"],
  }));
}

function expectTenCardDeck(name: string, cards: Card[]) {
  if (cards.length !== 10) throw new Error(`${name} must contain 10 cards, found ${cards.length}.`);
  return cards;
}

function catalogCardById(sourceId: number) {
  const card = catalog.cards.find((candidate) => candidate.id === sourceId);
  if (!card) throw new Error(`Missing catalog card ${sourceId}.`);
  return card;
}

function commanderStarterCard(spec: StarterCardSpec & { sourceId: number }): Card[] {
  const source = catalogCardById(spec.sourceId);
  return expandStarterCard({
    ...spec,
    imagePath: source.localImagePath ?? source.fullImageUrl ?? undefined,
    thumbnailPath: source.localThumbnailPath ?? source.thumbnailImageUrl ?? source.localImagePath ?? undefined,
    sourceSlug: source.slug,
    sourceType: source.type,
    traits: [...(spec.traits ?? []), ...source.attributes.map(([name]) => name)],
  });
}

const allyStarterSpecs: StarterCardSpec[] = [
  {
    id: "starter-ally-convincing-argument",
    copies: 2,
    name: "Convincing Argument",
    icons: [],
    persuasion: 2,
    swords: 0,
    effects: [revealGainPersuasion(2)],
    play: "No agent icons.",
    reveal: starterRevealText(2, 0),
    imagePath: localOtherCard("dune-imperium-other-convincing-argument.webp"),
    thumbnailPath: localOtherCard("dune-imperium-other-convincing-argument.webp"),
    sourceId: 530,
    sourceSlug: "dune-imperium-convincing-argument",
    sourceType: "other",
  },
  {
    id: "starter-ally-dagger",
    copies: 2,
    name: "Dagger",
    icons: ["landsraad"],
    persuasion: 0,
    swords: 1,
    effects: [revealGainStrength(1)],
    play: "No printed agent reward.",
    reveal: starterRevealText(0, 1),
    imagePath: localOtherCard("dune-imperium-other-dagger.webp"),
    thumbnailPath: localOtherCard("dune-imperium-other-dagger.webp"),
    sourceId: 528,
    sourceSlug: "dune-imperium-dagger",
    sourceType: "other",
  },
  {
    id: "starter-ally-diplomacy",
    name: "Diplomacy",
    icons: ["emperor", "spacing", "bene", "fremen"],
    persuasion: 1,
    swords: 0,
    effects: [revealGainPersuasion(1)],
    play: "No printed agent reward.",
    reveal: starterRevealText(1, 0),
    imagePath: localOtherCard("dune-imperium-other-diplomacy.webp"),
    thumbnailPath: localOtherCard("dune-imperium-other-diplomacy.webp"),
    sourceId: 533,
    sourceSlug: "dune-imperium-diplomacy",
    sourceType: "other",
  },
  {
    id: "starter-ally-dune-the-desert-planet",
    copies: 2,
    name: "Dune, The Desert Planet",
    icons: ["spice"],
    persuasion: 1,
    swords: 0,
    effects: [revealGainPersuasion(1)],
    play: "No printed agent reward.",
    reveal: starterRevealText(1, 0),
    imagePath: localOtherCard("dune-imperium-other-dune-the-desert-planet.webp"),
    thumbnailPath: localOtherCard("dune-imperium-other-dune-the-desert-planet.webp"),
    sourceId: 527,
    sourceSlug: "dune-imperium-dune-the-desert-planet",
    sourceType: "other",
  },
  {
    id: "starter-ally-reconnaissance",
    name: "Reconnaissance",
    icons: ["city"],
    persuasion: 1,
    swords: 0,
    effects: [revealGainPersuasion(1)],
    play: "No printed agent reward.",
    reveal: starterRevealText(1, 0),
    imagePath: localOtherCard("dune-imperium-other-reconnaissance.webp"),
    thumbnailPath: localOtherCard("dune-imperium-other-reconnaissance.webp"),
    sourceId: 529,
    sourceSlug: "dune-imperium-reconnaissance",
    sourceType: "other",
  },
  {
    id: "starter-ally-seek-allies",
    name: "Seek Allies",
    icons: ["emperor", "spacing", "bene", "fremen"],
    persuasion: 0,
    swords: 0,
    trashOnPlay: true,
    play: "Trash this card.",
    reveal: starterRevealText(0, 0),
    imagePath: localOtherCard("dune-imperium-other-seek-allies.webp"),
    thumbnailPath: localOtherCard("dune-imperium-other-seek-allies.webp"),
    sourceId: 532,
    sourceSlug: "dune-imperium-seek-allies",
    sourceType: "other",
  },
  {
    id: "starter-ally-signet-ring",
    name: "Signet Ring",
    icons: ["landsraad", "city", "spice"],
    persuasion: 1,
    swords: 0,
    effects: [
      agentRecruitTroops(
        "self",
        1,
        { source: "Warmaster" },
        [hasLeader(gurneyHalleckLeaderName), hasRole("Ally")],
      ),
      agentGainResource(
        "solari",
        1,
        { source: "Fill Coffers" },
        [hasLeader(ladyAmberMetulliLeaderName), hasRole("Ally"), hasAlliance()],
      ),
      agentGainResource(
        "spice",
        1,
        { source: "Fill Coffers" },
        [hasLeader(ladyAmberMetulliLeaderName), hasRole("Ally"), hasAlliance()],
      ),
      agentPlaceSpies(
        "self",
        1,
        { source: "Arrakis Informant", placementIcon: "bene", recallForSupply: true },
        [hasLeader(ladyMargotFenringLeaderName), hasRole("Ally")],
      ),
      agentPlaceSpies(
        "self",
        1,
        { source: "Unseen Network", recallForSupply: true, postPlacementAction: "staban-unseen-network" },
        [hasLeader(stabanTuekLeaderName), hasRole("Ally")],
      ),
      revealGainPersuasion(1),
    ],
    play: "Trigger the leader signet ability.",
    reveal: starterRevealText(1, 0),
    imagePath: localOtherCard("dune-imperium-other-signet-ring.webp"),
    thumbnailPath: localOtherCard("dune-imperium-other-signet-ring.webp"),
    sourceId: 531,
    sourceSlug: "dune-imperium-signet-ring",
    sourceType: "other",
  },
];

const muadDibCommanderSpecs: Array<StarterCardSpec & { sourceId: number }> = [
  {
    id: "starter-muaddib-command-respect",
    sourceId: 546,
    name: "Command Respect",
    icons: ["city"],
    persuasion: 1,
    swords: 0,
    effects: [revealGainPersuasion(1)],
    play: "If you have a Swordmaster Bonus token, you may trash this card to trade.",
    reveal: starterRevealText(1, 0),
  },
  {
    id: "starter-muaddib-convincing-argument",
    sourceId: 547,
    name: "Convincing Argument",
    icons: [],
    persuasion: 2,
    swords: 0,
    effects: [revealGainPersuasion(2)],
    play: "No agent icons.",
    reveal: starterRevealText(2, 0),
  },
  {
    id: "starter-muaddib-demand-attention",
    sourceId: 548,
    name: "Demand Attention",
    icons: ["emperor", "spacing", "bene", "fremen"],
    persuasion: 1,
    swords: 0,
    effects: [
      agentPayResourceForInfluence(
        "solari",
        4,
        "board-space",
        1,
        { source: "Demand Attention", trashSource: true },
        [hasTeam("muaddib"), hasRole("Commander")],
      ),
      revealGainPersuasion(1),
    ],
    play: "Pay 4 Solari to add 1 more Influence from the visited faction space, then trash this card.",
    reveal: starterRevealText(1, 0),
  },
  {
    id: "starter-muaddib-desert-call",
    sourceId: 549,
    name: "Desert Call",
    icons: ["spice"],
    persuasion: 1,
    swords: 0,
    effects: [revealGainPersuasion(1)],
    play: "Resolve the printed water-to-worm trash effect.",
    reveal: starterRevealText(1, 0),
  },
  {
    id: "starter-muaddib-limited-landsraad-access",
    copies: 2,
    sourceId: 550,
    name: "Limited Landsraad Access",
    icons: ["landsraad"],
    persuasion: 0,
    swords: 1,
    revealGain: { spice: 1 },
    effects: [revealEffects([
      { kind: "gain-strength", selector: "self", amount: 1 },
      { kind: "gain-resource", selector: "self", resource: "spice", amount: 1 },
    ])],
    play: "No printed agent reward.",
    reveal: "+1 spice and +1 strength.",
  },
  {
    id: "starter-muaddib-seek-allies",
    sourceId: 551,
    name: "Seek Allies",
    icons: ["emperor", "spacing", "bene", "fremen"],
    persuasion: 0,
    swords: 0,
    trashOnPlay: true,
    play: "Trash this card.",
    reveal: starterRevealText(0, 0),
  },
  {
    id: "starter-muaddib-signet-ring",
    sourceId: 545,
    name: "Signet Ring",
    icons: ["landsraad", "city", "spice"],
    persuasion: 1,
    swords: 0,
    effects: [
      agentDrawCards(1, { source: "Lead the Way" }, [hasTeam("muaddib"), hasRole("Commander")]),
      revealGainPersuasion(1),
    ],
    play: "Lead the Way: draw 1 card.",
    reveal: starterRevealText(1, 0),
  },
  {
    id: "starter-muaddib-threaten-spice-production",
    sourceId: 553,
    name: "Threaten Spice Production",
    icons: ["spice"],
    persuasion: 1,
    swords: 0,
    effects: [revealGainPersuasion(1)],
    play: "Resolve the printed spice-production trash effect.",
    reveal: starterRevealText(1, 0),
  },
  {
    id: "starter-muaddib-usul",
    sourceId: 552,
    name: "Usul",
    icons: ["city"],
    persuasion: 2,
    swords: 0,
    effects: [
      agentCommanderResourceSplit(
        [
          { commanderResource: "water", commanderAmount: 1, allyResource: "spice", allyAmount: 1 },
          { commanderResource: "spice", commanderAmount: 1, allyResource: "water", allyAmount: 1 },
        ],
        { source: "Usul" },
        [hasTeam("muaddib"), hasRole("Commander")],
      ),
      revealGainPersuasion(2),
    ],
    play: "Commander and activated Ally split the printed reward.",
    reveal: starterRevealText(2, 0),
  },
];

const emperorCommanderSpecs: Array<StarterCardSpec & { sourceId: number }> = [
  {
    id: "starter-emperor-convincing-argument",
    sourceId: 555,
    name: "Convincing Argument",
    icons: [],
    persuasion: 2,
    swords: 0,
    effects: [revealGainPersuasion(2)],
    play: "No agent icons.",
    reveal: starterRevealText(2, 0),
  },
  {
    id: "starter-emperor-corrino-might",
    sourceId: 556,
    name: "Corrino Might",
    icons: ["landsraad"],
    persuasion: 0,
    swords: 1,
    effects: [revealGainStrength(1)],
    play: "No printed agent reward.",
    reveal: "+1 strength. Spend 3 spice: each Ally gains 2 troops, then trash this card.",
  },
  {
    id: "starter-emperor-critical-shipments",
    sourceId: 557,
    name: "Critical Shipments",
    icons: ["spice"],
    persuasion: 2,
    swords: 0,
    effects: [
      agentCommanderResourceSplit(
        [
          { commanderResource: "water", commanderAmount: 1, allyResource: "solari", allyAmount: 2 },
          { commanderResource: "solari", commanderAmount: 2, allyResource: "water", allyAmount: 1 },
        ],
        { source: "Critical Shipments" },
        [hasTeam("shaddam"), hasRole("Commander")],
      ),
      revealGainPersuasion(2),
    ],
    play: "Commander and activated Ally split the printed reward.",
    reveal: starterRevealText(2, 0),
  },
  {
    id: "starter-emperor-demand-results",
    sourceId: 558,
    name: "Demand Results",
    icons: ["landsraad"],
    persuasion: 0,
    swords: 1,
    effects: [revealGainStrength(1)],
    play: "Resolve the printed contract-distribution trash effect.",
    reveal: starterRevealText(0, 1),
  },
  {
    id: "starter-emperor-devastating-assault",
    sourceId: 559,
    name: "Devastating Assault",
    icons: ["spice"],
    persuasion: 1,
    swords: 0,
    effects: [
      agentPlayEffects([
        { kind: "gain-resource", selector: "self", resource: "solari", amount: 1 },
        { kind: "recruit-troops", selector: "activated-ally", amount: 1 },
      ]),
      revealGainPersuasion(1),
      revealPayResourceForStrength(
        "solari",
        3,
        5,
        { source: "Devastating Assault" },
        [hasTeam("shaddam"), hasRole("Commander"), hasSwordmasterBonus(), hasConflictUnits(1)],
      ),
    ],
    play: "Gain 1 Solari; the activated Ally recruits 1 troop.",
    reveal: "+1 persuasion. If you have a Swordmaster bonus token, you may spend 3 Solari to add 5 strength.",
  },
  {
    id: "starter-emperor-imperial-ornithopter",
    copies: 2,
    sourceId: 560,
    name: "Imperial Ornithopter",
    icons: ["city"],
    persuasion: 1,
    swords: 0,
    revealGain: { solari: 1 },
    effects: [revealEffects([
      { kind: "gain-persuasion", selector: "self", amount: 1 },
      { kind: "gain-resource", selector: "self", resource: "solari", amount: 1 },
    ])],
    play: "No printed agent reward.",
    reveal: "+1 persuasion and +1 solari.",
  },
  {
    id: "starter-emperor-imperial-tent",
    sourceId: 561,
    name: "Imperial Tent",
    icons: ["emperor", "spacing", "bene", "fremen"],
    persuasion: 1,
    swords: 0,
    effects: [
      agentMoveCardToThroneRow({ source: "Imperial Tent" }, [hasTeam("shaddam"), hasRole("Commander")]),
      revealGainPersuasion(1),
    ],
    play: "Move a non-Fremen card from the Imperium Row to the Throne Row.",
    reveal: starterRevealText(1, 0),
  },
  {
    id: "starter-emperor-seek-allies",
    sourceId: 562,
    name: "Seek Allies",
    icons: ["emperor", "spacing", "bene", "fremen"],
    persuasion: 0,
    swords: 0,
    trashOnPlay: true,
    play: "Trash this card.",
    reveal: starterRevealText(0, 0),
  },
  {
    id: "starter-emperor-signet-ring",
    sourceId: 554,
    name: "Signet Ring",
    icons: ["landsraad", "city", "spice"],
    persuasion: 1,
    swords: 0,
    effects: [
      agentBlockConflictDeployment(
        { source: "Emperor of the Known Universe" },
        [hasTeam("shaddam"), hasRole("Commander")],
      ),
      revealGainPersuasion(1),
    ],
    play: "Emperor of the Known Universe: no Conflict deployment this turn; pay 1 Solari for 1 Ally troop or 3 Solari for 1 Influence.",
    reveal: starterRevealText(1, 0),
  },
];

export const allyStarterCards: Card[] = expectTenCardDeck(
  "Ally starter deck",
  allyStarterSpecs.flatMap(expandStarterCard),
);

export const muadDibCommanderCards: Card[] = expectTenCardDeck(
  "Muad'Dib Commander starter deck",
  muadDibCommanderSpecs.flatMap(commanderStarterCard),
);

export const emperorCommanderCards: Card[] = expectTenCardDeck(
  "Emperor Commander starter deck",
  emperorCommanderSpecs.flatMap(commanderStarterCard),
);

export const commanderStarterDecks: Record<TeamId, Card[]> = {
  muaddib: muadDibCommanderCards,
  shaddam: emperorCommanderCards,
};
