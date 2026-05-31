import type { ConflictBattleIconId, FactionId, IconId, ObjectiveCard, TeamId } from "./types";

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
