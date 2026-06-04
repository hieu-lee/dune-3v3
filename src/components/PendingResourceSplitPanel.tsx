import { Sparkles } from "lucide-react";
import { resourceChoiceLabel, resources } from "../app-helpers";
import type { PendingAction, Player } from "../game/types";

type CommanderResourceSplitPendingAction = Extract<PendingAction, { kind: "commander-resource-split" }>;

type PendingResourceSplitPanelProps = {
  ally: Player;
  commander: Player;
  pending: CommanderResourceSplitPendingAction;
  onChoose: (optionIndex: number) => void;
};

function resourceIcon(resourceId: CommanderResourceSplitPendingAction["options"][number]["commanderResource"]) {
  return resources.find((resource) => resource.id === resourceId)?.Icon ?? Sparkles;
}

export function PendingResourceSplitPanel({
  ally,
  commander,
  pending,
  onChoose,
}: PendingResourceSplitPanelProps) {
  return (
    <div className="pending-controls resource-split-choice">
      <div className="resource-split-participants">
        <span>Commander / Ally</span>
        <strong>{commander.leader} / {ally.leader}</strong>
      </div>
      <div className="resource-split-options">
        {pending.options.map((option, index) => {
          const CommanderIcon = resourceIcon(option.commanderResource);
          const AllyIcon = resourceIcon(option.allyResource);
          const commanderLabel = resourceChoiceLabel(option.commanderAmount, option.commanderResource);
          const allyLabel = resourceChoiceLabel(option.allyAmount, option.allyResource);
          return (
            <button
              type="button"
              key={`${option.commanderResource}-${option.allyResource}`}
              className="resource-split-option"
              aria-label={`Commander ${commanderLabel} / Ally ${allyLabel}`}
              onClick={() => onChoose(index)}
            >
              <span className="resource-split-lane">
                <span>Commander</span>
                <strong><CommanderIcon size={15} />{commanderLabel}</strong>
              </span>
              <span className="resource-split-divider">/</span>
              <span className="resource-split-lane">
                <span>Ally</span>
                <strong><AllyIcon size={15} />{allyLabel}</strong>
              </span>
            </button>
          );
        })}
      </div>
    </div>
  );
}
