import { factionLabels } from "../game/data";
import {
  PendingPayResourceForContractsPanel,
  PendingPayResourceForDrawCardsPanel,
  PendingPayResourceForHighCouncilSeatPanel,
  PendingPayResourceForInfluencePanel,
  PendingPayResourceForSandwormsPanel,
  PendingPayResourceForStrengthPanel,
  PendingPayResourceForTroopsPanel,
} from "./PendingLeaderChoicePanels";
import type { PendingActionPanelProps } from "./PendingActionPanel.types";

type PendingResourcePaymentPanelsProps = Pick<
  PendingActionPanelProps,
  | "game"
  | "pendingAction"
  | "choosePayResourceForContracts"
  | "choosePayResourceForDrawCards"
  | "choosePayResourceForHighCouncilSeat"
  | "choosePayResourceForInfluence"
  | "choosePayResourceForSandworms"
  | "choosePayResourceForStrength"
  | "choosePayResourceForTroops"
  | "skipPayResourceForContractsChoice"
  | "skipPayResourceForDrawCardsChoice"
  | "skipPayResourceForHighCouncilSeatChoice"
  | "skipPayResourceForInfluenceChoice"
  | "skipPayResourceForSandwormsChoice"
  | "skipPayResourceForStrengthChoice"
  | "skipPayResourceForTroopsChoice"
>;

export function PendingResourcePaymentPanels({
  game,
  pendingAction,
  choosePayResourceForContracts,
  choosePayResourceForDrawCards,
  choosePayResourceForHighCouncilSeat,
  choosePayResourceForInfluence,
  choosePayResourceForSandworms,
  choosePayResourceForStrength,
  choosePayResourceForTroops,
  skipPayResourceForContractsChoice,
  skipPayResourceForDrawCardsChoice,
  skipPayResourceForHighCouncilSeatChoice,
  skipPayResourceForInfluenceChoice,
  skipPayResourceForSandwormsChoice,
  skipPayResourceForStrengthChoice,
  skipPayResourceForTroopsChoice,
}: PendingResourcePaymentPanelsProps) {
  const pendingPayResourceContractsOwner =
    pendingAction.kind === "pay-resource-for-contracts"
      ? game.players.find((player) => player.id === pendingAction.ownerId)
      : undefined;
  const pendingPayResourceContractsRecipients =
    pendingAction.kind === "pay-resource-for-contracts"
      ? pendingAction.recipientIds.map((recipientId) => game.players.find((player) => player.id === recipientId))
      : [];
  const pendingPayResourceContractsContracts =
    pendingAction.kind === "pay-resource-for-contracts"
      ? pendingAction.contractIds.map((contractId) => game.contractOffer.find((contract) => contract.id === contractId))
      : [];
  const pendingPayResourceStrengthOwner =
    pendingAction.kind === "pay-resource-for-strength"
      ? game.players.find((player) => player.id === pendingAction.ownerId)
      : undefined;
  const pendingPayResourceStrengthRecipient =
    pendingAction.kind === "pay-resource-for-strength"
      ? game.players.find((player) => player.id === pendingAction.combatRecipientId)
      : undefined;
  const pendingPayResourceInfluenceOwner =
    pendingAction.kind === "pay-resource-for-influence"
      ? game.players.find((player) => player.id === pendingAction.ownerId)
      : undefined;
  const pendingPayResourceInfluenceRecipient =
    pendingAction.kind === "pay-resource-for-influence"
      ? game.players.find((player) => player.id === pendingAction.influenceOwnerId)
      : undefined;
  const pendingPayResourceTroopsOwner =
    pendingAction.kind === "pay-resource-for-troops"
      ? game.players.find((player) => player.id === pendingAction.ownerId)
      : undefined;
  const pendingPayResourceTroopsRecipients =
    pendingAction.kind === "pay-resource-for-troops"
      ? (Array.isArray(pendingAction.recipientIds) ? pendingAction.recipientIds : [])
          .map((recipientId) => game.players.find((player) => player.id === recipientId))
      : [];
  const pendingPayResourceDrawCardsOwner =
    pendingAction.kind === "pay-resource-for-draw-cards"
      ? game.players.find((player) => player.id === pendingAction.ownerId)
      : undefined;
  const pendingPayResourceHighCouncilSeatOwner =
    pendingAction.kind === "pay-resource-for-high-council-seat"
      ? game.players.find((player) => player.id === pendingAction.ownerId)
      : undefined;
  const pendingPayResourceSandwormsOwner =
    pendingAction.kind === "pay-resource-for-sandworms"
      ? game.players.find((player) => player.id === pendingAction.ownerId)
      : undefined;
  const pendingPayResourceSandwormsRecipient =
    pendingAction.kind === "pay-resource-for-sandworms"
      ? game.players.find((player) => player.id === pendingAction.recipientId)
      : undefined;

  return (
    <>
      {pendingAction.kind === "pay-resource-for-contracts" && (
        <PendingPayResourceForContractsPanel
          contracts={pendingPayResourceContractsContracts}
          cost={pendingAction.cost}
          owner={pendingPayResourceContractsOwner}
          recipients={pendingPayResourceContractsRecipients}
          resource={pendingAction.resource}
          source={pendingAction.source}
          trashSource={pendingAction.trashSource}
          onChoose={choosePayResourceForContracts}
          onSkip={skipPayResourceForContractsChoice}
        />
      )}

      {pendingAction.kind === "pay-resource-for-strength" && (
        <PendingPayResourceForStrengthPanel
          cost={pendingAction.cost}
          onChoose={choosePayResourceForStrength}
          onSkip={skipPayResourceForStrengthChoice}
          optional={pendingAction.optional}
          owner={pendingPayResourceStrengthOwner}
          recipient={pendingPayResourceStrengthRecipient}
          resource={pendingAction.resource}
          strength={pendingAction.strength}
        />
      )}

      {pendingAction.kind === "pay-resource-for-troops" && (
        <PendingPayResourceForTroopsPanel
          cost={pendingAction.cost}
          onChoose={choosePayResourceForTroops}
          onSkip={skipPayResourceForTroopsChoice}
          owner={pendingPayResourceTroopsOwner}
          recipients={pendingPayResourceTroopsRecipients}
          resource={pendingAction.resource}
          source={pendingAction.source}
          troops={pendingAction.troops}
          trashSource={pendingAction.trashSource}
        />
      )}

      {pendingAction.kind === "pay-resource-for-draw-cards" && (
        <PendingPayResourceForDrawCardsPanel
          cost={pendingAction.cost}
          drawCards={pendingAction.drawCards}
          onChoose={choosePayResourceForDrawCards}
          onSkip={skipPayResourceForDrawCardsChoice}
          owner={pendingPayResourceDrawCardsOwner}
          resource={pendingAction.resource}
          source={pendingAction.source}
        />
      )}

      {pendingAction.kind === "pay-resource-for-high-council-seat" && (
        <PendingPayResourceForHighCouncilSeatPanel
          cost={pendingAction.cost}
          onChoose={choosePayResourceForHighCouncilSeat}
          onSkip={skipPayResourceForHighCouncilSeatChoice}
          owner={pendingPayResourceHighCouncilSeatOwner}
          persuasionCost={pendingAction.persuasionCost}
          persuasionReward={pendingAction.persuasionReward}
          resource={pendingAction.resource}
          source={pendingAction.source}
        />
      )}

      {pendingAction.kind === "pay-resource-for-influence" && (
        <PendingPayResourceForInfluencePanel
          amount={pendingAction.amount}
          cost={pendingAction.cost}
          factionLabel={factionLabels[pendingAction.faction]}
          onChoose={choosePayResourceForInfluence}
          onSkip={skipPayResourceForInfluenceChoice}
          owner={pendingPayResourceInfluenceOwner}
          recipient={pendingPayResourceInfluenceRecipient}
          resource={pendingAction.resource}
        />
      )}

      {pendingAction.kind === "pay-resource-for-sandworms" && (
        <PendingPayResourceForSandwormsPanel
          cost={pendingAction.cost}
          onChoose={choosePayResourceForSandworms}
          onSkip={skipPayResourceForSandwormsChoice}
          owner={pendingPayResourceSandwormsOwner}
          persuasionCost={pendingAction.persuasionCost}
          recipient={pendingPayResourceSandwormsRecipient}
          resource={pendingAction.resource}
          sandworms={pendingAction.sandworms}
          source={pendingAction.source}
          strength={pendingAction.strength}
          trashSource={pendingAction.trashSource}
        />
      )}
    </>
  );
}
