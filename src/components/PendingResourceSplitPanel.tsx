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

export function PendingResourceSplitPanel({
  ally,
  commander,
  pending,
  onChoose,
}: PendingResourceSplitPanelProps) {
  return (
    <div className="pending-controls">
      <span>{commander.leader} / {ally.leader}</span>
      {pending.options.map((option, index) => {
        const Icon = resources.find((resource) => resource.id === option.commanderResource)?.Icon ?? Sparkles;
        return (
          <button
            type="button"
            key={`${option.commanderResource}-${option.allyResource}`}
            onClick={() => onChoose(index)}
          >
            <Icon size={15} />
            Commander {resourceChoiceLabel(option.commanderAmount, option.commanderResource)} / Ally {resourceChoiceLabel(option.allyAmount, option.allyResource)}
          </button>
        );
      })}
    </div>
  );
}
