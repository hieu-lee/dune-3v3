import { Crown, Eye, FileText, Shield, Sparkles, Swords } from "lucide-react";
import type { CSSProperties } from "react";
import { battleIconLabels, teams } from "../game/data";
import { conflictRewardRows, conflictStakesText } from "../game/conflict-reward-display";
import { playerDoublesConflictRewards } from "../game/state";
import type { GameState, TeamId } from "../game/types";

type TableSidebarProps = {
  game: GameState;
  tableStateLockedByPending: boolean;
  onShieldWallChange: (standing: boolean) => void;
};

export function TableSidebar({ game, tableStateLockedByPending, onShieldWallChange }: TableSidebarProps) {
  const teamScores = (["muaddib", "shaddam"] as TeamId[]).map((team) => ({
    team,
    vp: game.players.filter((player) => player.team === team).reduce((sum, player) => sum + player.vp, 0),
    conflict: game.players
      .filter((player) => player.team === team)
      .reduce((sum, player) => sum + player.conflict, 0),
  }));
  const sandwormRewardDoublers = game.conflict ? game.players.filter(playerDoublesConflictRewards) : [];
  const sandwormRewardLabel = sandwormRewardDoublers.map((player) => player.leader).join(", ");
  const shaddamCommander = game.players.find((player) => player.team === "shaddam" && player.role === "Commander");
  const currentConflictRewardRows = game.conflict ? conflictRewardRows(game.conflict) : [];
  const intrigueDiscardTop = game.intrigueDiscard.at(-1);

  return (
    <aside className="team-column">
      {teamScores.map(({ team, vp, conflict }) => (
        <article className="team-card" key={team} style={{ "--accent": teams[team].accent } as CSSProperties}>
          <div className="team-heading">
            <Crown size={18} />
            <div>
              <h2>{teams[team].name}</h2>
              <p>{teams[team].motto}</p>
            </div>
          </div>
          <div className="team-metrics">
            <span>{vp} VP</span>
            <span>{conflict} strength</span>
          </div>
        </article>
      ))}
      <article className="conflict-card">
        {game.conflict ? (
          <>
            {game.conflict.thumbnailPath && <img className="conflict-art" src={game.conflict.thumbnailPath} alt="" />}
            <div className="team-heading">
              <Swords size={18} />
              <div>
                <div className="conflict-meta">
                  <span className="conflict-level">
                    Conflict {game.conflict.level} - {game.conflictDeck.length} queued
                  </span>
                  <span className="battle-icon-chip" title="Battle icon">
                    {battleIconLabels[game.conflict.battleIcon]}
                  </span>
                </div>
                <h2>{game.conflict.name}</h2>
                <p>{conflictStakesText(game.conflict)}</p>
              </div>
            </div>
            <div className="conflict-rewards">
              {currentConflictRewardRows.map((reward, index) => (
                <span key={`${reward}-${index}`}>{reward}</span>
              ))}
            </div>
            {sandwormRewardDoublers.length > 0 && (
              <div
                className="sandworm-reward-note"
                role="note"
                title="Double printed Conflict-card rewards taken by these players. Battle icons and location control are not doubled."
              >
                <Sparkles size={14} />
                <span>2x printed rewards: {sandwormRewardLabel}; battle icons and location control are not doubled</span>
              </div>
            )}
          </>
        ) : (
          <div className="team-heading">
            <Swords size={18} />
            <div>
              <span className="conflict-level">Conflict deck exhausted</span>
              <h2>No Conflict Remaining</h2>
              <p>The nine-card six-player conflict stack has been resolved.</p>
            </div>
          </div>
        )}
        <div className="shield-state">
          <Shield size={16} />
          <label
            className={[game.shieldWall ? "selected" : "", tableStateLockedByPending ? "disabled" : ""]
              .filter(Boolean)
              .join(" ")}
          >
            <input
              type="checkbox"
              checked={game.shieldWall}
              disabled={tableStateLockedByPending}
              aria-label="Shield Wall standing"
              onChange={(event) => onShieldWallChange(event.currentTarget.checked)}
            />
            <span>Shield Wall {game.shieldWall ? "standing" : "removed"}</span>
          </label>
        </div>
      </article>
      <article className="choam-card">
        <div className="team-heading">
          <FileText size={18} />
          <div>
            <span className="conflict-level">{game.contractOffer.length + game.contractDeck.length} public contracts</span>
            <h2>CHOAM Contracts</h2>
            <p>Take a face-up contract from contract spaces.</p>
          </div>
        </div>
        <div className="contract-offer">
          {game.contractOffer.map((contract) => (
            <div className="contract-preview" key={contract.id}>
              {contract.thumbnailPath && <img src={contract.thumbnailPath} alt="" />}
              <strong>{contract.name}</strong>
            </div>
          ))}
          {game.contractOffer.length === 0 && <p>Contract spaces pay 2 Solari.</p>}
        </div>
        {shaddamCommander && shaddamCommander.reservedContracts.length > 0 && (
          <div className="contract-reserve">
            <span>Sardaukar reserve</span>
            <div className="contract-offer">
              {shaddamCommander.reservedContracts.map((contract) => (
                <div className="contract-preview" key={contract.id}>
                  {contract.thumbnailPath && <img src={contract.thumbnailPath} alt="" />}
                  <strong>{contract.name}</strong>
                </div>
              ))}
            </div>
          </div>
        )}
      </article>
      <article className="intrigue-deck-card">
        <div className="team-heading">
          <Eye size={18} />
          <div>
            <span className="conflict-level">{game.intrigueDeck.length} cards queued</span>
            <h2>Intrigue Deck</h2>
          </div>
        </div>
        <div className="intrigue-deck-preview" aria-label="Intrigue deck and discard">
          <span
            className="intrigue-deck-surface intrigue-deck-stack"
            aria-label={`Face-down Intrigue deck, ${game.intrigueDeck.length} cards`}
            tabIndex={0}
          >
            <span className="card-asset-preview">
              <span className="card-art card-asset-image intrigue-deck-back-art" aria-hidden="true">
                <span>Intrigue</span>
              </span>
              <span className="card-resting-meta" aria-hidden="true">{game.intrigueDeck.length} deck</span>
              <span className="card-hold-details" aria-hidden="true">
                <span className="card-detail-kicker">Face-down deck</span>
                <strong>{game.intrigueDeck.length} Intrigue cards</strong>
                <span className="card-detail-row">
                  <b>Draw</b>
                  <small>Board spaces draw Intrigue cards into the owning player's hand.</small>
                </span>
              </span>
            </span>
          </span>
          <span
            className="intrigue-deck-surface intrigue-discard-stack"
            aria-label={intrigueDiscardTop ? `Intrigue discard, top card ${intrigueDiscardTop.name}` : "Intrigue discard, empty"}
            tabIndex={0}
          >
            <span className="card-asset-preview">
              {intrigueDiscardTop?.thumbnailPath || intrigueDiscardTop?.imagePath ? (
                <img
                  className="card-art card-asset-image"
                  src={intrigueDiscardTop.thumbnailPath ?? intrigueDiscardTop.imagePath}
                  alt=""
                  loading="lazy"
                />
              ) : (
                <span className="card-art card-asset-image intrigue-discard-empty-art" aria-hidden="true">
                  <span>Discard</span>
                </span>
              )}
              <span className="card-resting-meta" aria-hidden="true">{game.intrigueDiscard.length} discard</span>
              <span className="card-hold-details" aria-hidden="true">
                <span className="card-detail-kicker">Intrigue discard</span>
                <strong>{intrigueDiscardTop?.name ?? "Empty discard"}</strong>
                <span className="card-detail-row">
                  <b>{intrigueDiscardTop ? "Effect" : "Status"}</b>
                  <small>{intrigueDiscardTop?.summary ?? "Played and cycled Intrigue cards will appear here."}</small>
                </span>
              </span>
            </span>
          </span>
        </div>
      </article>
    </aside>
  );
}
