import type { CSSProperties } from "react";
import { Archive, Trash2 } from "lucide-react";
import type { Player } from "../game/types";

export const VAULT_DECK_BACKS = {
  playing: "/assets/dune-cards-hub/imperium/playing-card-backside.png",
  intrigue: "/assets/dune-cards-hub/intrigue/intrigue-back-side.png",
  contract: "/assets/dune-cards-hub/contract/choam-contract-backside.png",
} as const;

export type VaultPileId = "graveyard" | "trash";

export function graveyardCards(player: Player) {
  return [...player.discard, ...player.playArea];
}

export function trashCards(player: Player) {
  return player.trash ?? [];
}

type DeckId = keyof typeof VAULT_DECK_BACKS;

type VaultDeckProps = {
  deck: DeckId;
  label: string;
  count: number;
  noun: string;
};

function VaultDeck({ deck, label, count, noun }: VaultDeckProps) {
  const empty = count === 0;
  const hoverLabel = `${count} ${count === 1 ? noun : `${noun}s`} remaining`;
  return (
    <div
      className={`vault-deck vault-deck--${deck} ${empty ? "is-empty" : ""}`}
      data-deck={deck}
      role="img"
      aria-label={`${label}: ${hoverLabel}`}
      title={`${label}: ${hoverLabel}`}
    >
      <span className="vault-deck-stack" aria-hidden="true">
        {empty ? (
          <span className="vault-deck-empty" />
        ) : (
          <img className="vault-deck-art" src={VAULT_DECK_BACKS[deck]} alt="" loading="lazy" />
        )}
      </span>
      <span className="vault-slot-label" aria-hidden="true">{label}</span>
      <span className="vault-slot-count" aria-hidden="true">{count}</span>
    </div>
  );
}

type VaultHoleProps = {
  pile: VaultPileId;
  label: string;
  count: number;
  Icon: typeof Archive;
  onOpen?: (pile: VaultPileId) => void;
};

function VaultHole({ pile, label, count, Icon, onOpen }: VaultHoleProps) {
  const empty = count === 0;
  const hoverLabel = `${count} ${count === 1 ? "card" : "cards"}`;
  const className = `vault-hole vault-hole--${pile} ${empty ? "is-empty" : ""}`;
  const inner = (
    <>
      <span className="vault-hole-well" aria-hidden="true">
        <Icon className="vault-hole-icon" size={16} />
      </span>
      <span className="vault-slot-label" aria-hidden="true">{label}</span>
      <span className="vault-slot-count" aria-hidden="true">{count}</span>
    </>
  );

  if (!onOpen) {
    return (
      <div className={className} data-pile={pile} role="img" title={`${label}: ${hoverLabel}`} aria-label={`${label}: ${hoverLabel}`}>
        {inner}
      </div>
    );
  }

  return (
    <button
      type="button"
      className={className}
      data-pile={pile}
      title={`${label}: ${hoverLabel}`}
      aria-label={`${label}: ${hoverLabel}. Open pile`}
      onClick={() => onOpen(pile)}
    >
      {inner}
    </button>
  );
}

type PlayerVaultProps = {
  player: Player;
  onOpenPile?: (playerId: string, pile: VaultPileId) => void;
};

export function PlayerVault({ player, onOpenPile }: PlayerVaultProps) {
  const graveyard = graveyardCards(player);
  const trash = trashCards(player);
  const openPile = onOpenPile ? (pile: VaultPileId) => onOpenPile(player.id, pile) : undefined;

  return (
    <div className="player-vault" style={{ "--player": player.color } as CSSProperties} role="group" aria-label={`${player.leader} card piles`}>
      <VaultDeck deck="playing" label="Deck" count={player.deck.length} noun="card" />
      <VaultDeck deck="intrigue" label="Intrigue" count={player.intrigues.length} noun="intrigue" />
      <VaultDeck deck="contract" label="Contracts" count={player.contracts.length} noun="contract" />
      <VaultHole pile="graveyard" label="Graveyard" count={graveyard.length} Icon={Archive} onOpen={openPile} />
      <VaultHole pile="trash" label="Trash" count={trash.length} Icon={Trash2} onOpen={openPile} />
    </div>
  );
}
