import { factionIds } from "./data";
import { commanderPersonalFaction } from "./commander-rules";
import type { FactionId, Player } from "./types";

export type InfluenceLossPair = [FactionId, FactionId];
export type BuyAccessChoice = [FactionId, FactionId];
export type SietchRitualChoice = "bene" | "fremen" | "fringeWorlds";
export type ImperiumPoliticsChoice = "greatHouses" | "emperor" | "fringeWorlds" | "fremen";

export const mainBoardInfluenceChoices: FactionId[] = ["greatHouses", "spacing", "bene", "fringeWorlds"];

export function influenceLossChoices(player: Player) {
  return factionIds.filter((faction) => player.influence[faction] > 0);
}

export function sietchRitualFactionChoices(player: Player): SietchRitualChoice[] {
  if (player.role === "Commander" && player.team === "muaddib") {
    return ["bene", "fremen", "fringeWorlds"];
  }
  return ["bene", "fringeWorlds"];
}

export function validSietchRitualChoice(player: Player, faction: SietchRitualChoice) {
  return sietchRitualFactionChoices(player).includes(faction);
}

export function changeAllegiancesGainChoices(player: Player): FactionId[] {
  if (player.role === "Commander" && player.team === "shaddam") {
    return ["emperor", ...mainBoardInfluenceChoices];
  }
  if (player.role === "Commander" && player.team === "muaddib") {
    return ["greatHouses", "spacing", "bene", "fremen", "fringeWorlds"];
  }
  return mainBoardInfluenceChoices;
}

export function influenceLossPairChoices(player: Player): InfluenceLossPair[] {
  const pairs: InfluenceLossPair[] = [];
  factionIds.forEach((first, firstIndex) => {
    factionIds.slice(firstIndex).forEach((second) => {
      const requiredFirst = first === second ? 2 : 1;
      const requiredSecond = first === second ? 0 : 1;
      if (player.influence[first] >= requiredFirst && player.influence[second] >= requiredSecond) {
        pairs.push([first, second]);
      }
    });
  });
  return pairs;
}

export function validInfluenceLossPair(player: Player, choice: InfluenceLossPair) {
  if (!Array.isArray(choice) || choice.length !== 2) return false;
  const [first, second] = choice;
  if (!factionIds.includes(first) || !factionIds.includes(second)) return false;
  if (first === second) return player.influence[first] >= 2;
  return player.influence[first] > 0 && player.influence[second] > 0;
}

export function imperiumPoliticsFactionChoices(player: Player): ImperiumPoliticsChoice[] {
  if (player.role === "Commander") {
    const personalFaction = commanderPersonalFaction(player);
    return personalFaction === "fremen"
      ? ["greatHouses", "fremen", "fringeWorlds"]
      : ["emperor", "greatHouses", "fringeWorlds"];
  }
  return ["greatHouses", "fringeWorlds"];
}

function buyAccessFactionChoices(player: Player): FactionId[] {
  if (player.role === "Commander" && player.team === "shaddam") {
    return ["emperor", "greatHouses", "fringeWorlds", "bene", "spacing"];
  }
  if (player.role === "Commander" && player.team === "muaddib") {
    return ["greatHouses", "fremen", "fringeWorlds", "bene", "spacing"];
  }
  return ["greatHouses", "fringeWorlds", "bene", "spacing"];
}

function buyAccessPrintedIcon(faction: FactionId) {
  if (faction === "emperor" || faction === "greatHouses") return "emperor";
  if (faction === "fremen" || faction === "fringeWorlds") return "fremen";
  return faction;
}

export function buyAccessPairChoices(player: Player): BuyAccessChoice[] {
  const choices = buyAccessFactionChoices(player);
  const pairs: BuyAccessChoice[] = [];
  choices.forEach((first, firstIndex) => {
    choices.slice(firstIndex + 1).forEach((second) => {
      if (buyAccessPrintedIcon(first) !== buyAccessPrintedIcon(second)) {
        pairs.push([first, second]);
      }
    });
  });
  return pairs;
}

export function validBuyAccessChoice(player: Player, choice: BuyAccessChoice) {
  if (!Array.isArray(choice) || choice.length !== 2) return false;
  const [first, second] = choice;
  const choices = buyAccessFactionChoices(player);
  return (
    first !== second &&
    choices.includes(first) &&
    choices.includes(second) &&
    buyAccessPrintedIcon(first) !== buyAccessPrintedIcon(second)
  );
}
