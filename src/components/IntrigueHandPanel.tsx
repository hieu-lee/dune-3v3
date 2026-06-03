import { Eye } from "lucide-react";
import { IntrigueCardArticle } from "./IntrigueCardArticle";
import type { IntrigueHandPanelProps } from "./IntrigueHandPanel.types";

export function IntrigueHandPanel(props: IntrigueHandPanelProps) {
  const { activePlayer } = props;

  if (activePlayer.intrigues.length === 0) return null;

  return (
    <section className="intrigue-hand" aria-label={`${activePlayer.leader} Intrigue cards`}>
      <div className="intrigue-heading">
        <Eye size={15} />
        <span>{activePlayer.intrigues.length} Intrigue</span>
      </div>
      <div className="intrigue-row">
        {activePlayer.intrigues.map((card) => (
          <IntrigueCardArticle
            {...props}
            card={card}
            key={card.id}
          />
        ))}
      </div>
    </section>
  );
}
