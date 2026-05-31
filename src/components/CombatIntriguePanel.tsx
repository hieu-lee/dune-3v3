import { Swords } from "lucide-react";
import { Fragment } from "react";
import {
  isBackedByChoamIntrigue,
  isDevourIntrigue,
  isFindWeaknessIntrigue,
  isGoToGroundIntrigue,
  isImpressIntrigue,
  isQuestionableMethodsIntrigue,
  isReachAgreementIntrigue,
  isSpiceIsPowerIntrigue,
  isSpringTheTrapIntrigue,
  isTacticalOptionIntrigue,
} from "../game/card-identifiers";
import { boardSpaces } from "../game/data";
import { canPlaceSpyPost, combatIntrigueStrength, combatIntrigueTargets } from "../game/state";
import type { CombatIntrigueChoice } from "../game/state";
import type { GameState, IntrigueCard, Player } from "../game/types";

type CombatIntriguePanelProps = {
  actor: Player;
  game: GameState;
  onPass: () => void;
  onPlay: (intrigueId: string, targetId?: string, combatChoice?: CombatIntrigueChoice) => void;
};

export function CombatIntriguePanel({
  actor,
  game,
  onPass,
  onPlay,
}: CombatIntriguePanelProps) {
  const targets = combatIntrigueTargets(game, actor.id)
    .map((playerId) => game.players.find((player) => player.id === playerId))
    .filter((player): player is Player => Boolean(player));
  const cards = actor.intrigues.filter((card) =>
    card.combatSwords ||
    combatIntrigueStrength(game, actor, card) ||
    isDevourIntrigue(card) ||
    isGoToGroundIntrigue(card) ||
    isReachAgreementIntrigue(card)
  );

  return (
    <div className="pending-panel combat-panel">
      <div>
        <p className="eyebrow">Combat Intrigues</p>
        <h2>{actor.leader}</h2>
      </div>
      <div className="pending-controls support-grid combat-grid">
        {cards.map((card) => (
          <CombatIntrigueTarget
            actor={actor}
            card={card}
            game={game}
            key={card.id}
            targets={targets}
            onPlay={onPlay}
          />
        ))}
        {cards.length === 0 && <span>No structured Combat Intrigues.</span>}
        <button className="combat-pass" type="button" onClick={onPass}>
          Pass
        </button>
      </div>
    </div>
  );
}

type CombatIntrigueTargetProps = {
  actor: Player;
  card: IntrigueCard;
  game: GameState;
  targets: Player[];
  onPlay: (intrigueId: string, targetId?: string, combatChoice?: CombatIntrigueChoice) => void;
};

function CombatIntrigueTarget({
  actor,
  card,
  game,
  targets,
  onPlay,
}: CombatIntrigueTargetProps) {
  const devourCard = isDevourIntrigue(card);
  const findWeaknessCard = isFindWeaknessIntrigue(card);
  const goToGroundCard = isGoToGroundIntrigue(card);
  const impressCard = isImpressIntrigue(card);
  const questionableMethodsCard = isQuestionableMethodsIntrigue(card);
  const reachAgreementCard = isReachAgreementIntrigue(card);
  const spiceIsPowerCard = isSpiceIsPowerIntrigue(card);
  const springTheTrapCard = isSpringTheTrapIntrigue(card);
  const tacticalOptionCard = isTacticalOptionIntrigue(card);
  const automatedStrength = combatIntrigueStrength(game, actor, card);
  const hasSpiceIsPowerBranch = targets.some(
    (target) => target.resources.spice >= 3 || target.deployedTroops >= 3,
  );
  const canAutoResolve = Boolean(
    automatedStrength || devourCard || findWeaknessCard || (spiceIsPowerCard && hasSpiceIsPowerBranch),
  );

  return (
    <div className="support-target combat-target">
      <strong>{card.name}</strong>
      <span title={combatCardSummaryTitle({
        goToGroundCard,
        impressCard,
        questionableMethodsCard,
        reachAgreementCard,
        spiceIsPowerCard,
        tacticalOptionCard,
      })}>
        <Swords size={14} />
        {combatCardStrengthLabel({
          automatedStrength,
          card,
          devourCard,
          findWeaknessCard,
          goToGroundCard,
          impressCard,
          questionableMethodsCard,
          reachAgreementCard,
          spiceIsPowerCard,
          springTheTrapCard,
          tacticalOptionCard,
        })}
      </span>
      {impressCard
        ? targets.map((target) => (
            <button
              type="button"
              key={target.id}
              onClick={() => onPlay(card.id, target.id)}
              title={`Add 2 strength to ${target.leader}; ${target.leader} acquires a card that costs 3 or less`}
            >
              {actor.role === "Commander" ? `${target.leader}: +2 + acquire` : "+2 + acquire"}
            </button>
          ))
      : goToGroundCard
        ? targets.length > 0
          ? targets.map((target) => (
              <Fragment key={target.id}>
                {target.deployedTroops > 0
                  ? Array.from({ length: Math.min(2, target.deployedTroops) }, (_, index) => index + 1).map((count) => {
                      const targetCanPlaceSpy = target.spies > 0 && boardSpaces.some((space) => canPlaceSpyPost(game, space, target));
                      return (
                        <button
                          type="button"
                          key={`${target.id}-ground-retreat-${count}`}
                          onClick={() => onPlay(card.id, target.id, { kind: "retreat-troops", count })}
                          title={`Retreat ${count} ${count === 1 ? "troop" : "troops"} from ${target.leader}${targetCanPlaceSpy ? ", then optionally place a spy" : ""}`}
                        >
                          {actor.role === "Commander"
                            ? `${target.leader}: retreat ${count}${targetCanPlaceSpy ? " + spy" : ""}`
                            : `Retreat ${count}${targetCanPlaceSpy ? " + spy" : ""}`}
                        </button>
                      );
                    })
                  : (
                      <span>
                        {actor.role === "Commander"
                          ? `${target.leader}: requires deployed troops.`
                          : "Requires 1 or 2 deployed troops."}
                      </span>
                    )}
              </Fragment>
            ))
          : <span>Requires 1 or 2 deployed troops.</span>
      : reachAgreementCard
        ? targets.length > 0
          ? targets.map((target) => (
              <Fragment key={target.id}>
                {target.deployedTroops > 0
                  ? Array.from({ length: Math.min(2, target.deployedTroops) }, (_, index) => index + 1).map((count) => (
                      <button
                        type="button"
                        key={`${target.id}-contract-retreat-${count}`}
                        onClick={() => onPlay(card.id, target.id, { kind: "retreat-troops", count })}
                        title={`Retreat ${count} ${count === 1 ? "troop" : "troops"} from ${target.leader}, then take a CHOAM contract`}
                      >
                        {actor.role === "Commander"
                          ? `${target.leader}: retreat ${count} + contract`
                          : `Retreat ${count} + contract`}
                      </button>
                    ))
                  : (
                      <span>
                        {actor.role === "Commander"
                          ? `${target.leader}: requires deployed troops.`
                          : "Requires 1 or 2 deployed troops."}
                      </span>
                    )}
              </Fragment>
            ))
          : <span>Requires 1 or 2 deployed troops.</span>
      : tacticalOptionCard
        ? targets.map((target) => (
            <Fragment key={target.id}>
              <button
                type="button"
                onClick={() => onPlay(card.id, target.id, "add-strength")}
                title={`Play ${card.name} for ${target.leader}`}
              >
                {actor.role === "Commander" ? `${target.leader}: +2` : "Add +2"}
              </button>
              {Array.from({ length: target.deployedTroops }, (_, index) => index + 1).map((count) => (
                <button
                  type="button"
                  key={`${target.id}-retreat-${count}`}
                  onClick={() => onPlay(card.id, target.id, { kind: "retreat-troops", count })}
                  title={`Retreat ${count} ${count === 1 ? "troop" : "troops"} from ${target.leader}`}
                >
                  {actor.role === "Commander" ? `${target.leader}: retreat ${count}` : `Retreat ${count}`}
                </button>
              ))}
            </Fragment>
          ))
      : spiceIsPowerCard
        ? hasSpiceIsPowerBranch
          ? targets.map((target) => (
              <Fragment key={target.id}>
                {target.resources.spice >= 3 && (
                  <button
                    type="button"
                    onClick={() => onPlay(card.id, target.id, "spend-spice")}
                    title={`Spend 3 spice from ${target.leader} for 6 strength`}
                  >
                    {actor.role === "Commander" ? `${target.leader}: spend 3 (+6)` : "Spend 3 spice (+6)"}
                  </button>
                )}
                {target.deployedTroops >= 3 && (
                  <button
                    type="button"
                    onClick={() => onPlay(card.id, target.id, "retreat-troops")}
                    title={`Retreat 3 troops from ${target.leader} to gain 3 spice`}
                  >
                    {actor.role === "Commander" ? `${target.leader}: retreat 3` : "Retreat 3 troops (+3 spice)"}
                  </button>
                )}
              </Fragment>
            ))
          : <span>Requires 3 spice or 3 deployed troops.</span>
      : canAutoResolve
        ? targets.map((target) => {
            const targetStrength = combatIntrigueStrength(game, actor, card, target);
            if (!targetStrength) return null;
            return (
              <button
                type="button"
                key={target.id}
                onClick={() => onPlay(card.id, target.id)}
                title={`Play ${card.name} for ${target.leader}`}
              >
                {actor.role === "Commander"
                  ? `${target.leader}${devourCard || findWeaknessCard || questionableMethodsCard || springTheTrapCard ? ` (+${targetStrength})` : ""}`
                  : "Play"}
              </button>
            );
          })
        : <span>
            {isBackedByChoamIntrigue(card)
              ? "Requires 2 completed contracts."
              : springTheTrapCard
                ? "Requires 2 own spy posts."
                : "Resolve printed card text."}
          </span>}
    </div>
  );
}

type CombatCardTitleFlags = {
  goToGroundCard: boolean;
  impressCard: boolean;
  questionableMethodsCard: boolean;
  reachAgreementCard: boolean;
  spiceIsPowerCard: boolean;
  tacticalOptionCard: boolean;
};

function combatCardSummaryTitle({
  goToGroundCard,
  impressCard,
  questionableMethodsCard,
  reachAgreementCard,
  spiceIsPowerCard,
  tacticalOptionCard,
}: CombatCardTitleFlags) {
  if (questionableMethodsCard) {
    return "Add 1 strength; the recipient may lose Influence, or a Commander may lose personal Influence, for 4 more strength.";
  }
  if (goToGroundCard) return "Retreat 1 or 2 troops from the chosen recipient, then optionally place a spy for that recipient.";
  if (reachAgreementCard) return "Retreat 1 or 2 troops from the chosen recipient, then take a CHOAM contract for that recipient.";
  if (impressCard) return "Add 2 strength to the chosen recipient; that recipient acquires a card that costs 3 or less.";
  if (spiceIsPowerCard) return "Choose one branch: retreat 3 of the recipient's troops for 3 spice, or spend 3 spice for 6 strength.";
  if (tacticalOptionCard) return "Choose either 2 strength or a troop count to retreat from the chosen recipient.";
  return undefined;
}

type CombatCardStrengthLabelFlags = {
  automatedStrength?: number;
  card: IntrigueCard;
  devourCard: boolean;
  findWeaknessCard: boolean;
  goToGroundCard: boolean;
  impressCard: boolean;
  questionableMethodsCard: boolean;
  reachAgreementCard: boolean;
  spiceIsPowerCard: boolean;
  springTheTrapCard: boolean;
  tacticalOptionCard: boolean;
};

function combatCardStrengthLabel({
  automatedStrength,
  card,
  devourCard,
  findWeaknessCard,
  goToGroundCard,
  impressCard,
  questionableMethodsCard,
  reachAgreementCard,
  spiceIsPowerCard,
  springTheTrapCard,
  tacticalOptionCard,
}: CombatCardStrengthLabelFlags) {
  if (findWeaknessCard) return "+2 / recall spy for +3";
  if (questionableMethodsCard) return "+1 / lose Ally/Cmdr personal Inf. for +4";
  if (goToGroundCard) return "Retreat 1-2 troops / optional spy";
  if (reachAgreementCard) return "Retreat 1-2 troops / take contract";
  if (impressCard) return "+2 strength / acquire <=3";
  if (spiceIsPowerCard) return "Retreat 3 for +3 spice / spend 3 for +6";
  if (springTheTrapCard) return "Recall 2 spies for +7";
  if (tacticalOptionCard) return "+2 strength OR retreat troops";
  if (devourCard && !automatedStrength) return "+2 / +4 with worm";
  if (isBackedByChoamIntrigue(card) && !automatedStrength) return "2+ completed contracts";
  return `+${automatedStrength ?? card.combatSwords} strength`;
}
