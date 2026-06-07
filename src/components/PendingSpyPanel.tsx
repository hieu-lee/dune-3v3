import { MapPinned, RotateCcw } from "lucide-react";
import { boardSpaces } from "../game/data";
import {
  spyObservationPostDetailForSpace,
  spyObservationPostLabelForSpace,
  spyObservationPostSpaceIdsForSpace,
} from "../game/state";
import type { BoardSpace, PendingAction, Player } from "../game/types";

type SpyPendingAction = Extract<PendingAction, { kind: "spy" }>;

type PendingSpyPanelProps = {
  owner: Player;
  pending: SpyPendingAction;
  placementSpaces: BoardSpace[];
  supplyRecallSpaces: BoardSpace[];
  onDone: () => void;
  onPlaceSpy: (spaceId: string) => void;
  onRecallSupplySpy: (spaceId: string) => void;
};

const boardSpaceNameById = new Map(boardSpaces.map((space) => [space.id, space.name]));

export function PendingSpyPanel({
  owner,
  pending,
  placementSpaces,
  supplyRecallSpaces,
  onDone,
  onPlaceSpy,
  onRecallSupplySpy,
}: PendingSpyPanelProps) {
  const spyCountText = `${owner.spies} ${owner.spies === 1 ? "spy" : "spies"} ready`;
  const remainingText = `${pending.remaining} ${pending.remaining === 1 ? "placement" : "placements"} remaining`;
  const placementScope = pending.placementIcon ? `${pending.placementIcon} posts` : "Legal spy posts";
  const needsSupplyRecall = owner.spies <= 0 && supplyRecallSpaces.length > 0;

  return (
    <div className="pending-controls spy-grid">
      <div className="spy-choice-summary">
        <span>{pending.source}</span>
        <strong>{owner.leader}: {spyCountText}</strong>
        <small>{remainingText} - {pending.mustPlaceSpy ? "required placement" : "optional placement"}</small>
      </div>

      <div className="spy-choice-actions">
        {needsSupplyRecall && (
          <div className="spy-choice-note">Recall one spy for supply, then place.</div>
        )}

        {supplyRecallSpaces.length > 0 && (
          <div className="spy-choice-section">
            <div className="spy-choice-section-heading">
              <strong>Supply recall</strong>
              <span>Return a posted spy before placing.</span>
            </div>
            <div className="spy-space-grid">
              {supplyRecallSpaces.map((space) => (
                <button
                  type="button"
                  key={`recall-${space.id}`}
                  className="spy-choice-card spy-choice-secondary"
                  aria-label={spyObservationPostLabelForSpace(space.id)}
                  onClick={() => onRecallSupplySpy(space.id)}
                  title={`Recall spy from ${spyObservationPostLabelForSpace(space.id)} for no effect`}
                >
                  <span className="spy-choice-badge"><RotateCcw size={13} /> Recall</span>
                  <SpyChoiceTitle spaceId={space.id} />
                  <SpyCoverageMap spaceId={space.id} />
                </button>
              ))}
            </div>
          </div>
        )}

        <div className="spy-choice-section">
          <div className="spy-choice-section-heading">
            <strong>Spy placement</strong>
            <span>{placementScope}</span>
          </div>
          {placementSpaces.length > 0 ? (
            <div className="spy-space-grid">
              {placementSpaces.map((space) => (
                <button
                  type="button"
                  key={space.id}
                  className="spy-choice-card spy-choice-primary"
                  aria-label={spyObservationPostLabelForSpace(space.id)}
                  onClick={() => onPlaceSpy(space.id)}
                >
                  <span className="spy-choice-badge">Place</span>
                  <SpyChoiceTitle spaceId={space.id} />
                  <SpyCoverageMap spaceId={space.id} />
                </button>
              ))}
            </div>
          ) : (
            <div className="spy-choice-empty">No legal spy posts</div>
          )}
        </div>
      </div>

      <button
        type="button"
        className="spy-choice-card spy-choice-done"
        aria-label="Done"
        onClick={onDone}
        disabled={pending.mustPlaceSpy}
        title={pending.mustPlaceSpy ? "Place the spy to finish this effect" : undefined}
      >
        <span className="spy-choice-badge">Finish</span>
        <strong>Done</strong>
        <small>{pending.mustPlaceSpy ? "Place the spy first." : "Continue without another placement."}</small>
      </button>
    </div>
  );
}

function SpyChoiceTitle({ spaceId }: { spaceId: string }) {
  const coveredSpaces = coveredSpaceNames(spaceId);
  return (
    <span className="spy-choice-title">
      <strong>{spyObservationPostLabelForSpace(spaceId)}</strong>
      <span>{coveredSpaces.length === 1 ? "1 location" : `${coveredSpaces.length} linked locations`}</span>
    </span>
  );
}

function SpyCoverageMap({ spaceId }: { spaceId: string }) {
  const coveredSpaces = coveredSpaceNames(spaceId);
  return (
    <span className="spy-choice-coverage" aria-label={spyObservationPostDetailForSpace(spaceId)}>
      <MapPinned size={14} aria-hidden="true" />
      <span>
        {coveredSpaces.map((name) => (
          <span className="spy-choice-location" key={name}>{name}</span>
        ))}
      </span>
    </span>
  );
}

function coveredSpaceNames(spaceId: string) {
  return spyObservationPostSpaceIdsForSpace(spaceId)
    .map((observedSpaceId) => boardSpaceNameById.get(observedSpaceId) ?? observedSpaceId);
}
