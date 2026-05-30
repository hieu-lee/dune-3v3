import catalogJson from "./uprising-catalog.generated.json";
import type {
  BattleIconId,
  BoardSpace,
  Card,
  ConflictCard,
  ConflictBattleIconId,
  ContractCard,
  FactionId,
  IconId,
  IntrigueCard,
  LeaderCard,
  ObjectiveCard,
  TeamId,
} from "./types";

type HubAttribute = [string, number | string | null];
type HubCard = {
  id: number;
  name: string;
  type: string;
  displayType: string | null;
  slug: string;
  fullImageUrl: string | null;
  thumbnailImageUrl: string | null;
  localImagePath: string | null;
  localThumbnailPath: string | null;
  attributes: HubAttribute[];
};

const catalog = catalogJson as unknown as { counts: Record<string, number>; cards: HubCard[] };
const iconAttributeMap: Record<string, IconId> = {
  "Agent icon: Emperor": "emperor",
  "Agent icon: Spacing Guild": "spacing",
  "Agent icon: Bene Gesserit": "bene",
  "Agent icon: Fremen": "fremen",
  "Agent icon: Landsraad": "landsraad",
  "Agent icon: City": "city",
  "Agent icon: Spice Trade": "spice",
  "Agent icon: Spy": "spy",
};

const summaryIgnore = new Set(["Persuasion cost", "Persuasion on reveal", "Swords"]);
const conflictLevelAttributes = new Set(["conflict-1", "conflict-2", "conflict-3"]);
const riseOfIxContractNames = new Set([
  "Dreadnought",
  "Harvest 3+ (contract)",
  "Harvest 4+ (contract)",
  "Heighliner III",
  "High Council III",
  "Interstellar Shipping",
  "Smuggling",
  "Tech Negotiation",
]);
const shaddamReservedContractNames = new Set(["Sardaukar I", "Sardaukar II"]);
const automatedCombatSwordValues: Partial<Record<number, number>> = {
  147: 3,
};
const intrigueSummariesByCatalogId: Partial<Record<number, string>> = {
  131: "Remove the Shield Wall OR deploy up to four troops from your garrison to the Conflict.",
  147: "Gain 2 Solari as a Plot Intrigue OR add 3 strength as a Combat Intrigue.",
  137: "Pay 2 water to deploy a sandworm to the Conflict; may remove the Shield Wall.",
  154: "Add 3 strength; add 5 instead if you have at least 3 Bene Gesserit Influence.",
};

export const iconLabels: Record<IconId, string> = {
  emperor: "Emperor",
  spacing: "Spacing Guild",
  bene: "Bene Gesserit",
  fremen: "Fremen / Fringe",
  landsraad: "Landsraad",
  city: "City",
  spice: "Spice Trade",
  spy: "Spy",
};

export const factionLabels: Record<FactionId, string> = {
  emperor: "Emperor",
  spacing: "Spacing Guild",
  bene: "Bene Gesserit",
  fremen: "Fremen",
  greatHouses: "Great Houses",
  fringeWorlds: "Fringe Worlds",
};

export const factionIds = Object.keys(factionLabels) as FactionId[];

export const catalogStats = catalog.counts;

function toLeaderCard(card: HubCard): LeaderCard {
  return {
    id: `leader-${card.id}`,
    name: card.name,
    imagePath: card.localImagePath ?? card.fullImageUrl ?? undefined,
    thumbnailPath: card.localThumbnailPath ?? card.thumbnailImageUrl ?? undefined,
    sourceId: card.id,
    sourceSlug: card.slug,
  };
}

export const leaderCards: LeaderCard[] = catalog.cards
  .filter((card) => card.type === "leader")
  .map(toLeaderCard);

const leaderCardsByName = new Map(leaderCards.map((leader) => [leader.name, leader]));

export function leaderCardByName(name: string) {
  const leader = leaderCardsByName.get(name);
  if (!leader) throw new Error(`Missing Uprising leader card for ${name}.`);
  return leader;
}

export const teams: Record<TeamId, { name: string; accent: string; commander: string; motto: string }> = {
  muaddib: {
    name: "Muad'Dib",
    accent: "#5bc0be",
    commander: "Muad'Dib",
    motto: "Fremen uprising, worms, water discipline",
  },
  shaddam: {
    name: "Shaddam",
    accent: "#f2b84b",
    commander: "Shaddam Corrino IV",
    motto: "Imperial control, Sardaukar pressure, wealth",
  },
};

export const battleIconLabels = {
  crysknife: "Crysknife",
  desertMouse: "Desert Mouse",
  ornithopter: "Ornithopter",
  wild: "Wild",
} satisfies Record<ConflictBattleIconId, string>;

export const sixPlayerObjectiveCards: ObjectiveCard[] = [
  {
    id: "objective-crysknife-1",
    name: "Crysknife Objective",
    battleIcon: "crysknife",
    playerCount: "All",
  },
  {
    id: "objective-crysknife-4-6p",
    name: "Crysknife Objective",
    battleIcon: "crysknife",
    playerCount: "4/6P",
  },
  {
    id: "objective-desert-mouse-first",
    name: "Desert Mouse Objective",
    battleIcon: "desertMouse",
    playerCount: "All",
    firstPlayer: true,
  },
  {
    id: "objective-desert-mouse-4-6p",
    name: "Desert Mouse Objective",
    battleIcon: "desertMouse",
    playerCount: "4/6P",
  },
];

type StarterCardSpec = Omit<Card, "id"> & {
  id: string;
  copies?: number;
};

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
    icons: [...card.icons],
    traits: [...(card.traits ?? []), "Starter deck"],
  }));
}

function expectTenCardDeck(name: string, cards: Card[]) {
  if (cards.length !== 10) throw new Error(`${name} must contain 10 cards, found ${cards.length}.`);
  return cards;
}

const allyStarterSpecs: StarterCardSpec[] = [
  {
    id: "starter-ally-convincing-argument",
    copies: 2,
    name: "Convincing Argument",
    icons: [],
    persuasion: 2,
    swords: 0,
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
    play: "Trigger the leader signet ability.",
    reveal: starterRevealText(1, 0),
    imagePath: localOtherCard("dune-imperium-other-signet-ring.webp"),
    thumbnailPath: localOtherCard("dune-imperium-other-signet-ring.webp"),
    sourceId: 531,
    sourceSlug: "dune-imperium-signet-ring",
    sourceType: "other",
  },
];

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

export const allyStarterCards: Card[] = expectTenCardDeck(
  "Ally starter deck",
  allyStarterSpecs.flatMap(expandStarterCard),
);

const muadDibCommanderSpecs: Array<StarterCardSpec & { sourceId: number }> = [
  {
    id: "starter-muaddib-command-respect",
    sourceId: 546,
    name: "Command Respect",
    icons: ["city"],
    persuasion: 1,
    swords: 0,
    play: "Resolve the printed Swordmaster-bonus trash reward.",
    reveal: starterRevealText(1, 0),
  },
  {
    id: "starter-muaddib-convincing-argument",
    sourceId: 547,
    name: "Convincing Argument",
    icons: [],
    persuasion: 2,
    swords: 0,
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
    play: "Resolve the printed four-influence trash upgrade.",
    reveal: starterRevealText(1, 0),
  },
  {
    id: "starter-muaddib-desert-call",
    sourceId: 549,
    name: "Desert Call",
    icons: ["spice"],
    persuasion: 1,
    swords: 0,
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
    play: "Trigger the leader signet ability.",
    reveal: starterRevealText(1, 0),
  },
  {
    id: "starter-muaddib-threaten-spice-production",
    sourceId: 553,
    name: "Threaten Spice Production",
    icons: ["spice"],
    persuasion: 1,
    swords: 0,
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
    play: "Commander and activated Ally split the printed reward.",
    reveal: starterRevealText(2, 0),
  },
];

export const muadDibCommanderCards: Card[] = expectTenCardDeck(
  "Muad'Dib Commander starter deck",
  muadDibCommanderSpecs.flatMap(commanderStarterCard),
);

const emperorCommanderSpecs: Array<StarterCardSpec & { sourceId: number }> = [
  {
    id: "starter-emperor-convincing-argument",
    sourceId: 555,
    name: "Convincing Argument",
    icons: [],
    persuasion: 2,
    swords: 0,
    play: "No agent icons.",
    reveal: starterRevealText(2, 0),
  },
  {
    id: "starter-emperor-corrino-might",
    sourceId: 556,
    name: "Corrino Might",
    icons: ["landsraad"],
    persuasion: 0,
    swords: 0,
    conditionalSwords: true,
    play: "No printed agent reward.",
    reveal: "Resolve printed reveal text.",
  },
  {
    id: "starter-emperor-critical-shipments",
    sourceId: 557,
    name: "Critical Shipments",
    icons: ["spice"],
    persuasion: 2,
    swords: 0,
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
    conditionalSwords: true,
    play: "Resolve the printed agent reward.",
    reveal: "Resolve printed reveal text.",
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
    play: "Trigger the leader signet ability.",
    reveal: starterRevealText(1, 0),
  },
];

export const emperorCommanderCards: Card[] = expectTenCardDeck(
  "Emperor Commander starter deck",
  emperorCommanderSpecs.flatMap(commanderStarterCard),
);

export const commanderStarterDecks: Record<TeamId, Card[]> = {
  muaddib: muadDibCommanderCards,
  shaddam: emperorCommanderCards,
};

function attributeNumber(card: HubCard, name: string, fallback = 0) {
  const value = card.attributes.find(([attributeName]) => attributeName === name)?.[1];
  if (typeof value === "number") return value;
  return fallback;
}

function hasConditionalAttribute(card: HubCard, name: string) {
  return card.attributes.some(([attributeName, value]) => attributeName === name && value === null);
}

function summarizeAttributes(card: HubCard) {
  const traits = card.attributes
    .filter(([name]) => !summaryIgnore.has(name) && !name.startsWith("Agent icon:") && !name.includes("Commander deck"))
    .slice(0, 5)
    .map(([name, value]) => (typeof value === "number" ? `${name} ${value}` : name));
  return traits.length ? traits.join(", ") : "Use printed card text from the imported image.";
}

function revealText(persuasion: number, swords: number) {
  const parts = [`+${persuasion} persuasion`];
  if (swords > 0) parts.push(`+${swords} strength`);
  return `${parts.join(" and ")}.`;
}

function toImperiumCard(card: HubCard): Card {
  const persuasion = attributeNumber(card, "Persuasion on reveal");
  const swords = attributeNumber(card, "Swords");
  const conditionalPersuasion = !card.attributes.some(([name]) => name === "Persuasion on reveal");
  const conditionalSwords = hasConditionalAttribute(card, "Swords");
  return {
    id: `hub-${card.id}`,
    name: card.name,
    icons: card.attributes.flatMap(([name]) => iconAttributeMap[name] ?? []),
    acquired: hasConditionalAttribute(card, "Victory Point") ? 1 : undefined,
    persuasion,
    swords,
    conditionalPersuasion,
    conditionalSwords,
    play: summarizeAttributes(card),
    reveal: conditionalPersuasion || conditionalSwords ? "Resolve printed reveal text." : revealText(persuasion, swords),
    cost: attributeNumber(card, "Persuasion cost"),
    imagePath: card.localImagePath ?? card.fullImageUrl ?? undefined,
    thumbnailPath: card.localThumbnailPath ?? card.thumbnailImageUrl ?? undefined,
    sourceId: card.id,
    sourceSlug: card.slug,
    sourceType: card.type,
    traits: card.attributes.map(([name]) => name),
  };
}

export const imperiumDeck: Card[] = catalog.cards
  .filter((card) => card.type === "imperium")
  .map(toImperiumCard);

function conflictLevel(card: HubCard): ConflictCard["level"] {
  if (card.attributes.some(([name]) => name === "conflict-3")) return 3;
  if (card.attributes.some(([name]) => name === "conflict-2")) return 2;
  return 1;
}

const conflictBattleIconsByCatalogId: Partial<Record<number, ConflictBattleIconId>> = {
  451: "crysknife",
  452: "ornithopter",
  453: "desertMouse",
  454: "crysknife",
  455: "crysknife",
  456: "ornithopter",
  457: "crysknife",
  458: "ornithopter",
  459: "ornithopter",
  460: "desertMouse",
  461: "desertMouse",
  462: "desertMouse",
  463: "wild",
  464: "ornithopter",
  465: "crysknife",
  466: "desertMouse",
};

function toConflictCard(card: HubCard): ConflictCard {
  const rewards = card.attributes
    .filter(([name]) => !conflictLevelAttributes.has(name))
    .map(([name, value]) => (typeof value === "number" ? `${name} ${value}` : name));
  const battleIcon = conflictBattleIconsByCatalogId[card.id];
  if (!battleIcon) {
    throw new Error(`Missing battle icon for conflict card ${card.id} (${card.name})`);
  }

  return {
    id: `conflict-${card.id}`,
    name: card.name,
    level: conflictLevel(card),
    battleIcon,
    rewards,
    stakes: rewards.length ? rewards.join(", ") : "Resolve printed conflict rewards.",
    imagePath: card.localImagePath ?? card.fullImageUrl ?? undefined,
    thumbnailPath: card.localThumbnailPath ?? card.thumbnailImageUrl ?? undefined,
    sourceId: card.id,
    sourceSlug: card.slug,
  };
}

export const conflictCards: ConflictCard[] = catalog.cards
  .filter((card) => card.type === "conflict")
  .map(toConflictCard);

function toIntrigueCard(card: HubCard): IntrigueCard {
  const battleIcon = intrigueBattleIconsByCatalogId[card.id];
  const combatSwords = attributeNumber(card, "Swords");
  const automatedCombatSwords = automatedCombatSwordValues[card.id];
  return {
    id: `intrigue-${card.id}`,
    name: card.name,
    summary: intrigueSummariesByCatalogId[card.id] ?? summarizeAttributes(card),
    battleIcon,
    combatSwords: combatSwords > 0 ? combatSwords : undefined,
    automatedCombatSwords,
    imagePath: card.localImagePath ?? card.fullImageUrl ?? undefined,
    thumbnailPath: card.localThumbnailPath ?? card.thumbnailImageUrl ?? undefined,
    sourceId: card.id,
    sourceSlug: card.slug,
    traits: card.attributes.map(([name]) => name),
  };
}

const intrigueBattleIconsByCatalogId: Partial<Record<number, BattleIconId>> = {
  157: "desertMouse",
  158: "ornithopter",
  159: "crysknife",
};

export const intrigueCards: IntrigueCard[] = catalog.cards
  .filter((card) => card.type === "intrigue")
  .map(toIntrigueCard);

function toContractCard(card: HubCard): ContractCard {
  return {
    id: `contract-${card.id}`,
    name: card.name,
    imagePath: card.localImagePath ?? card.fullImageUrl ?? undefined,
    thumbnailPath: card.localThumbnailPath ?? card.thumbnailImageUrl ?? undefined,
    sourceId: card.id,
    sourceSlug: card.slug,
  };
}

export const standardContracts: ContractCard[] = catalog.cards
  .filter((card) => card.type === "contract")
  .filter((card) => !riseOfIxContractNames.has(card.name))
  .filter((card) => !shaddamReservedContractNames.has(card.name))
  .map(toContractCard);

export const shaddamReservedContracts: ContractCard[] = catalog.cards
  .filter((card) => card.type === "contract")
  .filter((card) => shaddamReservedContractNames.has(card.name))
  .map(toContractCard);

const locationCardsByName = new Map(catalog.cards.filter((card) => card.type === "location").map((card) => [card.name, card]));

function withBoardSpaceArt(space: BoardSpace): BoardSpace {
  if (space.personal) return space;
  const card = locationCardsByName.get(space.name);
  if (!card) return space;
  return {
    ...space,
    imagePath: card.localImagePath ?? card.fullImageUrl ?? undefined,
    thumbnailPath: card.localThumbnailPath ?? card.thumbnailImageUrl ?? card.localImagePath ?? undefined,
    sourceId: card.id,
    sourceSlug: card.slug,
  };
}

const boardSpaceSpecs: BoardSpace[] = [
  {
    id: "dutiful-service",
    name: "Dutiful Service",
    zone: "Faction",
    icon: "emperor",
    influence: "emperor",
    contract: true,
    detail: "Emperor influence and a face-up CHOAM contract.",
  },
  {
    id: "economic-support",
    name: "Economic Support",
    zone: "Faction",
    icon: "emperor",
    influence: "greatHouses",
    gain: { spice: 1 },
    team: "trade",
    detail: "Great Houses influence, spice, then teammate trade.",
  },
  {
    id: "military-support",
    name: "Military Support",
    zone: "Faction",
    icon: "emperor",
    cost: { spice: 2 },
    influence: "greatHouses",
    troops: 3,
    team: "reinforce",
    detail: "Recruit three troops split across allied teammates.",
  },
  {
    id: "vast-wealth",
    name: "Vast Wealth",
    zone: "Faction",
    icon: "emperor",
    influence: "emperor",
    gain: { solari: 3 },
    team: "commander",
    personal: "shaddam",
    detail: "Commander-side Emperor pressure and Solari.",
  },
  {
    id: "sardaukar",
    name: "Sardaukar",
    zone: "Faction",
    icon: "emperor",
    cost: { spice: 3 },
    influence: "emperor",
    gain: { intrigue: 1 },
    troops: 4,
    team: "commander",
    personal: "shaddam",
    detail: "Shaddam personal-board space; 3 spice in six-player mode.",
  },
  {
    id: "hardy-warriors",
    name: "Hardy Warriors",
    zone: "Faction",
    icon: "fremen",
    cost: { water: 1 },
    influence: "fremen",
    troops: 2,
    combat: true,
    team: "commander",
    personal: "muaddib",
    detail: "Fremen influence and two recruited troops.",
  },
  {
    id: "expedition",
    name: "Expedition",
    zone: "Faction",
    icon: "fremen",
    influence: "fringeWorlds",
    gain: { solari: 2 },
    detail: "Fringe Worlds influence and contract fallback value.",
  },
  {
    id: "controversial-tech",
    name: "Controversial Technology",
    zone: "Faction",
    icon: "fremen",
    cost: { spice: 2 },
    influence: "fringeWorlds",
    draw: 1,
    gain: { intrigue: 1 },
    detail: "Fringe influence, intrigue, draw, and trash hook.",
  },
  {
    id: "desert-mastery",
    name: "Desert Mastery",
    zone: "Faction",
    icon: "fremen",
    influence: "fremen",
    gain: { spice: 1 },
    draw: 1,
    combat: true,
    team: "commander",
    personal: "muaddib",
    detail: "Fremen influence, card draw, spice, combat.",
  },
  {
    id: "sietch-tabr",
    name: "Sietch Tabr",
    zone: "City",
    icon: "city",
    requirement: { faction: "fringeWorlds", amount: 2 },
    combat: true,
    sietchTabr: true,
    detail: "Requires 2 Fremen/Fringe influence; choose Hooks, troop, water or water and remove the Shield Wall.",
  },
  {
    id: "arrakeen",
    name: "Arrakeen",
    zone: "City",
    icon: "city",
    gain: { solari: 1 },
    troops: 1,
    draw: 1,
    combat: true,
    detail: "Recruit, draw, and city control income.",
  },
  {
    id: "carthag",
    name: "Carthag",
    zone: "City",
    icon: "city",
    gain: { intrigue: 1 },
    troops: 1,
    combat: true,
    detail: "Recruit a troop and take an Intrigue.",
  },
  {
    id: "research-station",
    name: "Research Station",
    zone: "City",
    icon: "city",
    cost: { water: 2 },
    troops: 2,
    draw: 2,
    combat: true,
    detail: "High-value draw and deployment point.",
  },
  {
    id: "swordmaster",
    name: "Swordmaster",
    zone: "Landsraad",
    icon: "landsraad",
    cost: { solari: 8 },
    detail: "Six-player single-use Swordmaster, then +2 reveal strength.",
  },
  {
    id: "high-council",
    name: "High Council",
    zone: "Landsraad",
    icon: "landsraad",
    cost: { solari: 5 },
    gain: { spice: 2, intrigue: 1 },
    troops: 3,
    detail: "Council seat or repeat reward shell.",
  },
  {
    id: "gather-support",
    name: "Gather Support",
    zone: "Landsraad",
    icon: "landsraad",
    cost: { solari: 2 },
    gain: { water: 1 },
    troops: 2,
    detail: "Recruit two; paid version gains water.",
  },
  {
    id: "secrets",
    name: "Secrets",
    zone: "Faction",
    icon: "bene",
    influence: "bene",
    gain: { intrigue: 1 },
    detail: "Bene Gesserit influence and intrigue pressure.",
  },
  {
    id: "espionage",
    name: "Espionage",
    zone: "Faction",
    icon: "bene",
    cost: { spice: 1 },
    influence: "bene",
    draw: 1,
    gain: { intrigue: 1 },
    spy: 1,
    detail: "Influence, draw, and place a spy.",
  },
  {
    id: "deliver-supplies",
    name: "Deliver Supplies",
    zone: "Faction",
    icon: "spacing",
    influence: "spacing",
    gain: { water: 1 },
    detail: "Spacing Guild influence and water.",
  },
  {
    id: "accept-contract",
    name: "Accept Contract",
    zone: "Spice Trade",
    icon: "spice",
    draw: 1,
    contract: true,
    detail: "Draw a card and take a face-up CHOAM contract.",
  },
  {
    id: "shipping",
    name: "Shipping",
    zone: "Spice Trade",
    icon: "spice",
    cost: { spice: 3 },
    requirement: { faction: "spacing", amount: 2 },
    influence: "spacing",
    gain: { solari: 5 },
    detail: "Requires 2 Spacing Guild Influence, then gains Guild influence and Solari.",
  },
  {
    id: "spice-refinery",
    name: "Spice Refinery",
    zone: "City",
    icon: "city",
    cost: { spice: 1 },
    gain: { solari: 4 },
    combat: true,
    detail: "Convert spice to Solari and contest city control.",
  },
  {
    id: "heighliner",
    name: "Heighliner",
    zone: "Faction",
    icon: "spacing",
    cost: { spice: 5 },
    influence: "spacing",
    troops: 5,
    combat: true,
    detail: "Guild influence and a heavy troop deployment.",
  },
  {
    id: "imperial-basin",
    name: "Imperial Basin",
    zone: "Desert",
    icon: "spice",
    gain: { spice: 1 },
    combat: true,
    maker: true,
    detail: "Maker space with bonus spice.",
  },
  {
    id: "habbanya-erg",
    name: "Habbanya Erg",
    zone: "Desert",
    icon: "spice",
    cost: { water: 1 },
    gain: { spice: 2 },
    draw: 1,
    combat: true,
    maker: true,
    detail: "Six-player Maker space with draw.",
  },
  {
    id: "hagga-basin",
    name: "Hagga Basin",
    zone: "Desert",
    icon: "spice",
    cost: { water: 1 },
    gain: { spice: 2 },
    combat: true,
    maker: true,
    makerWorms: 1,
    detail: "Maker space; choose 2 spice or a sandworm with Maker Hooks.",
  },
  {
    id: "deep-desert",
    name: "Deep Desert",
    zone: "Desert",
    icon: "spice",
    cost: { water: 3 },
    gain: { spice: 4 },
    combat: true,
    maker: true,
    makerWorms: 2,
    detail: "Deep maker space; choose 4 spice or two sandworms with Maker Hooks.",
  },
];

export const boardSpaces: BoardSpace[] = boardSpaceSpecs.map(withBoardSpaceArt);

export const reserveMarket: Card[] = catalog.cards
  .filter((card) => card.name === "The Spice Must Flow")
  .map(toImperiumCard);
