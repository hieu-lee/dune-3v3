import {
  BookOpen,
  CircleDollarSign,
  Crown,
  Droplets,
  Eye,
  FileText,
  HandCoins,
  Minus,
  RotateCcw,
  Shield,
  Sparkles,
  Swords,
  Users,
  X,
} from "lucide-react";
import {
  factionShortLabels,
  selectedFactionChoice,
  type ChangeAllegiancesSelection,
} from "../app-helpers";
import {
  isBackedByChoamIntrigue,
  isBuyAccessIntrigue,
  isCallToArmsIntrigue,
  isChangeAllegiancesIntrigue,
  isContingencyPlanIntrigue,
  isCunningIntrigue,
  isCouncilorsAmbitionIntrigue,
  isDepartForArrakisIntrigue,
  isDetonationIntrigue,
  isDevourIntrigue,
  isDistractionIntrigue,
  isFindWeaknessIntrigue,
  isGoToGroundIntrigue,
  isImperiumPoliticsIntrigue,
  isInspireAweIntrigue,
  isIntelligenceReportIntrigue,
  isLeverageIntrigue,
  isManipulateIntrigue,
  isMarketOpportunityIntrigue,
  isMercenariesIntrigue,
  isOpportunismIntrigue,
  isQuestionableMethodsIntrigue,
  isReachAgreementIntrigue,
  isShaddamsFavorIntrigue,
  isSietchRitualIntrigue,
  isSpecialMissionIntrigue,
  isSpiceIsPowerIntrigue,
  isSpringTheTrapIntrigue,
  isStrategicStockpilingIntrigue,
  isTacticalOptionIntrigue,
  isUnexpectedAlliesIntrigue,
  isWeirdingCombatIntrigue,
} from "../game/card-identifiers";
import { conflictProtectedByShieldWall } from "../game/critical-locations";
import { battleIconLabels, factionLabels } from "../game/data";
import {
  buyAccessPairChoices,
  canResolveDepartForArrakisSpiceChoice,
  canPlayDistractionPlotIntrigue,
  canPlaySpecialMissionPlaceSpy,
  changeAllegiancesGainChoices,
  changeAllegiancesLossChoices,
  combatIntrigueStrength,
  conflictDeploymentBlockedFor,
  effectiveEmperorIconInfluence,
  effectiveFremenIconInfluence,
  effectiveRequirementInfluence,
  hasDeployedThreeOrMoreUnitsThisTurn,
  hasGainedSpiceThisTurn,
  imperiumPoliticsFactionChoices,
  influenceLossChoices,
  influenceLossPairChoices,
  playerTroopSupply,
  sietchRitualFactionChoices,
  specialMissionCitySpySpaces,
  specialMissionRecallSpySpaces,
  spyPostCount,
} from "../game/state";
import type {
  BuyAccessChoice,
  ChangeAllegiancesChoice,
  ImperiumPoliticsChoice,
  InfluenceLossPair,
  SietchRitualChoice,
  SpecialMissionChoice,
} from "../game/state";
import type { FactionId, GameState, Player } from "../game/types";

type IntrigueHandPanelProps = {
  activePlayer: Player;
  activatedAlly: Player;
  changeAllegiancesSelections: Record<string, ChangeAllegiancesSelection>;
  game: GameState;
  plotIntrigueLocked: boolean;
  playBackedByChoamPlot: (intrigueId: string, faction: FactionId) => void;
  playBuyAccessPlot: (intrigueId: string, choice: BuyAccessChoice) => void;
  playCallToArmsPlot: (intrigueId: string) => void;
  playChangeAllegiancesPlot: (intrigueId: string, choice: ChangeAllegiancesChoice) => void;
  playContingencyPlanPlot: (intrigueId: string) => void;
  playCouncilorsAmbitionPlot: (intrigueId: string) => void;
  playCunningPlot: (intrigueId: string, choice: "draw" | "paid-trash") => void;
  playDepartForArrakisPlot: (intrigueId: string, choice: "draw" | "spend-spice") => void;
  playDetonation: (intrigueId: string, choice: "shield-wall" | "deploy") => void;
  playDistractionPlot: (intrigueId: string) => void;
  playImperiumPoliticsPlot: (intrigueId: string, faction: ImperiumPoliticsChoice) => void;
  playInspireAwePlot: (intrigueId: string) => void;
  playIntelligenceReportPlot: (intrigueId: string) => void;
  playLeveragePlot: (intrigueId: string) => void;
  playManipulatePlot: (intrigueId: string, cardId: string) => void;
  playMarketOpportunityPlot: (intrigueId: string, choice: "spice-to-solari" | "solari-to-spice") => void;
  playMercenariesPlot: (intrigueId: string) => void;
  playOpportunismPlot: (intrigueId: string, choice: InfluenceLossPair) => void;
  playShaddamsFavorPlot: (intrigueId: string) => void;
  playSietchRitualPlot: (intrigueId: string, discardCardId: string, faction: SietchRitualChoice) => void;
  playSpecialMissionPlot: (intrigueId: string, choice: SpecialMissionChoice) => void;
  playStrategicStockpilingPlot: (intrigueId: string, choice: "spice" | "water" | "both") => void;
  playUnexpectedAllies: (intrigueId: string, removeShieldWall: boolean) => void;
  scorePlotIntrigue: (intrigueId: string) => void;
  updateChangeAllegiancesSelection: (intrigueId: string, selection: ChangeAllegiancesSelection) => void;
};

export function IntrigueHandPanel({
  activePlayer,
  activatedAlly,
  changeAllegiancesSelections,
  game,
  plotIntrigueLocked,
  playBackedByChoamPlot,
  playBuyAccessPlot,
  playCallToArmsPlot,
  playChangeAllegiancesPlot,
  playContingencyPlanPlot,
  playCouncilorsAmbitionPlot,
  playCunningPlot,
  playDepartForArrakisPlot,
  playDetonation,
  playDistractionPlot,
  playImperiumPoliticsPlot,
  playInspireAwePlot,
  playIntelligenceReportPlot,
  playLeveragePlot,
  playManipulatePlot,
  playMarketOpportunityPlot,
  playMercenariesPlot,
  playOpportunismPlot,
  playShaddamsFavorPlot,
  playSietchRitualPlot,
  playSpecialMissionPlot,
  playStrategicStockpilingPlot,
  playUnexpectedAllies,
  scorePlotIntrigue,
  updateChangeAllegiancesSelection,
}: IntrigueHandPanelProps) {
  if (activePlayer.intrigues.length === 0) return null;

  const detonationDeployOwner = activePlayer.role === "Commander" ? activatedAlly : activePlayer;
  const unexpectedAlliesOwner = activePlayer.role === "Commander" ? activatedAlly : activePlayer;
  const detonationDeploymentBlocked = conflictDeploymentBlockedFor(game, activePlayer.id, detonationDeployOwner.id);
  const unexpectedAlliesDeploymentBlocked = conflictDeploymentBlockedFor(game, activePlayer.id, unexpectedAlliesOwner.id);
  const shaddamsFavorOwner = activePlayer.role === "Commander" ? activatedAlly : activePlayer;
  const mercenariesOwner = activePlayer.role === "Commander" ? activatedAlly : activePlayer;
  const departForArrakisOwner = activePlayer.role === "Commander" ? activatedAlly : activePlayer;
  const imperiumPoliticsOwner = activePlayer.role === "Commander" ? activatedAlly : activePlayer;
  const currentConflictProtected = conflictProtectedByShieldWall(game.conflict);
  const unexpectedAlliesCanPay = activePlayer.resources.water >= 2;
  const unexpectedAlliesBlockedByShieldWall = Boolean(game.conflict && game.shieldWall && currentConflictProtected);
  const unexpectedAlliesCanSummonWithoutWall = Boolean(game.conflict && (!game.shieldWall || !currentConflictProtected));
  const unexpectedAlliesDisabled =
    plotIntrigueLocked || !game.conflict || !unexpectedAlliesCanPay || unexpectedAlliesDeploymentBlocked;

  return (
    <section className="intrigue-hand" aria-label={`${activePlayer.leader} Intrigue cards`}>
      <div className="intrigue-heading">
        <Eye size={15} />
        <span>{activePlayer.intrigues.length} Intrigue</span>
      </div>
      <div className="intrigue-row">
        {activePlayer.intrigues.map((card) => {
          const activeCombatStrength = combatIntrigueStrength(game, activePlayer, card);
          const backedByChoamPlotChoices = isBackedByChoamIntrigue(card) ? influenceLossChoices(activePlayer) : [];
          const intelligenceReportDrawCount = spyPostCount(game, activePlayer.id) >= 2 ? 2 : 1;
          const inspireAweToHand =
            activePlayer.deployedSandworms > 0 ||
            (activePlayer.role === "Commander" && activatedAlly.deployedSandworms > 0);
          const manipulateChoices = isManipulateIntrigue(card) ? game.imperiumRow : [];
          const leverageCanPlay = hasGainedSpiceThisTurn(game, activePlayer.id);
          const distractionTriggerMet = hasDeployedThreeOrMoreUnitsThisTurn(game, activePlayer.id);
          const distractionCanPlay = isDistractionIntrigue(card)
            ? canPlayDistractionPlotIntrigue(game, activePlayer)
            : false;
          const councilorsAmbitionCanPlay = activePlayer.highCouncilSeat;
          const strategicStockpilingCanSpice = activePlayer.resources.spice >= 5;
          const strategicStockpilingCanWater =
            activePlayer.resources.water >= 3 &&
            effectiveRequirementInfluence(activePlayer, "spacing", game.players) >= 3;
          const shaddamsFavorGainsSolari = effectiveEmperorIconInfluence(activePlayer, game.players) >= 3;
          const shaddamsFavorCanRecruit = playerTroopSupply(shaddamsFavorOwner) > 0;
          const shaddamsFavorCanResolve = shaddamsFavorCanRecruit || shaddamsFavorGainsSolari;
          const marketOpportunityCanSellSpice = activePlayer.resources.spice >= 2;
          const marketOpportunityCanBuySpice = activePlayer.resources.solari >= 5;
          const mercenariesCanPay = activePlayer.resources.solari >= 3;
          const cunningCanPay = activePlayer.resources.spice >= 1;
          const sietchRitualChoices = isSietchRitualIntrigue(card)
            ? sietchRitualFactionChoices(activePlayer)
            : [];
          const changeAllegiancesInfluenceOwnerId = activePlayer.role === "Commander" ? activatedAlly.id : undefined;
          const changeAllegiancesGainOptions = isChangeAllegiancesIntrigue(card)
            ? changeAllegiancesGainChoices(activePlayer)
            : [];
          const changeAllegiancesLossOptions = isChangeAllegiancesIntrigue(card)
            ? changeAllegiancesLossChoices(game, activePlayer, changeAllegiancesInfluenceOwnerId)
            : [];
          const changeAllegiancesSelection = changeAllegiancesSelections[card.id] ?? {};
          const selectedChangeLoss = selectedFactionChoice(
            changeAllegiancesSelection.loseFaction,
            changeAllegiancesLossOptions,
          );
          const selectedChangeShiftGain = selectedFactionChoice(
            changeAllegiancesSelection.shiftGainFaction,
            changeAllegiancesGainOptions,
          );
          const selectedChangeSpiceGain = selectedFactionChoice(
            changeAllegiancesSelection.spiceGainFaction,
            changeAllegiancesGainOptions,
          );
          const changeAllegiancesCanPaySpice = activePlayer.resources.spice >= 3;
          const changeAllegiancesPersonalFaction = activePlayer.role === "Commander"
            ? activePlayer.team === "muaddib" ? "fremen" : "emperor"
            : undefined;
          const changeAllegiancesOwnerLabel = (faction: FactionId) =>
            activePlayer.role === "Commander" && faction !== changeAllegiancesPersonalFaction
              ? `: ${activatedAlly.leader}`
              : "";
          const specialMissionCanPlaceSpy = isSpecialMissionIntrigue(card)
            ? canPlaySpecialMissionPlaceSpy(game, activePlayer)
            : false;
          const specialMissionCitySpaces = isSpecialMissionIntrigue(card)
            ? specialMissionCitySpySpaces(game, activePlayer)
            : [];
          const specialMissionRecallSpaces = isSpecialMissionIntrigue(card)
            ? specialMissionRecallSpySpaces(game, activePlayer)
            : [];
          const opportunismCanPay = activePlayer.resources.solari >= 2;
          const opportunismChoices = isOpportunismIntrigue(card) ? influenceLossPairChoices(activePlayer) : [];
          const buyAccessCanPay = activePlayer.resources.solari >= 5;
          const buyAccessChoices = isBuyAccessIntrigue(card) ? buyAccessPairChoices(activePlayer) : [];
          const imperiumPoliticsCanPay = activePlayer.resources.solari >= 1;
          const imperiumPoliticsChoices = isImperiumPoliticsIntrigue(card)
            ? imperiumPoliticsFactionChoices(activePlayer)
            : [];
          const departForArrakisCanDraw = effectiveFremenIconInfluence(activePlayer, game.players) >= 3;
          const departForArrakisCanRecruit = playerTroopSupply(departForArrakisOwner) > 0;
          const departForArrakisCanActuallyDraw = departForArrakisCanDraw &&
            activePlayer.deck.length + activePlayer.discard.length > 0;
          const departForArrakisTroopOwnerId = activePlayer.role === "Commander"
            ? departForArrakisOwner.id
            : undefined;
          const departForArrakisCanPay = canResolveDepartForArrakisSpiceChoice(
            game,
            activePlayer.id,
            card.id,
            departForArrakisTroopOwnerId,
          );
          const departForArrakisSpendTitle = !departForArrakisCanPay
            ? "Requires 2 spice and troop supply or an available card draw"
            : departForArrakisCanRecruit
              ? departForArrakisCanDraw
                ? "Spend 2 spice to recruit 3 troops, and draw 1 card"
                : "Spend 2 spice to recruit 3 troops"
              : "Spend 2 spice to draw 1 card";
          const departForArrakisSpendRewardLabel = departForArrakisCanRecruit || !departForArrakisCanActuallyDraw
            ? "3 Troops"
            : "Draw";
          return (
            <article className="intrigue-card" key={card.id}>
              {card.thumbnailPath && <img className="card-art" src={card.thumbnailPath} alt="" loading="lazy" />}
              <span>
                {isContingencyPlanIntrigue(card)
                  ? "Plot / Combat / +3 strength"
                  : isCallToArmsIntrigue(card)
                    ? "Plot / reveal acquisitions recruit"
                  : isIntelligenceReportIntrigue(card)
                    ? `Plot / draw ${intelligenceReportDrawCount}`
                  : isInspireAweIntrigue(card)
                    ? `Plot / acquire <=3${inspireAweToHand ? " to hand" : ""}`
                  : isManipulateIntrigue(card)
                    ? "Plot / row replace + discount"
                  : isLeverageIntrigue(card)
                    ? "Plot / spice turn contract"
                  : isDistractionIntrigue(card)
                    ? "Plot / 3-unit shared spy"
                  : isCunningIntrigue(card)
                    ? "Plot / draw or pay to trash"
                  : isSietchRitualIntrigue(card)
                    ? "Plot / discard for Influence"
                  : isChangeAllegiancesIntrigue(card)
                    ? "Plot / shift or buy Influence"
                  : isSpecialMissionIntrigue(card)
                    ? "Plot / City spy or wall spice"
                  : isOpportunismIntrigue(card)
                    ? "Plot / cash Influence for VP"
                  : isBuyAccessIntrigue(card)
                    ? "Plot / buy two Influence"
                  : isImperiumPoliticsIntrigue(card)
                    ? "Plot / buy Influence"
                  : isDepartForArrakisIntrigue(card)
                    ? `Plot / ${departForArrakisCanDraw ? "draw / " : ""}spend spice for troops`
                  : isCouncilorsAmbitionIntrigue(card)
                    ? "Plot / High Council water"
                  : isStrategicStockpilingIntrigue(card)
                    ? "Plot / spend stockpiles for VP"
                  : isShaddamsFavorIntrigue(card)
                    ? `Plot / recruit${shaddamsFavorGainsSolari ? " / 3 Solari" : ""}`
                  : isMarketOpportunityIntrigue(card)
                    ? "Plot / exchange spice and Solari"
                  : isMercenariesIntrigue(card)
                    ? "Plot / hire troops and Intrigue"
                  : isFindWeaknessIntrigue(card)
                    ? "Combat / +2 / recall spy for +3"
                  : isQuestionableMethodsIntrigue(card)
                    ? "Combat / +1 / lose Ally/Cmdr personal Inf. for +4"
                  : isGoToGroundIntrigue(card)
                    ? "Combat / retreat 1-2 troops / optional spy"
                  : isReachAgreementIntrigue(card)
                    ? "Combat / retreat 1-2 troops / take contract"
                  : isSpiceIsPowerIntrigue(card)
                    ? "Combat / retreat 3 troops for spice / spend 3 spice for +6"
                  : isTacticalOptionIntrigue(card)
                    ? "Combat / +2 strength / retreat troops"
                  : isSpringTheTrapIntrigue(card)
                    ? "Combat / recall 2 spies for +7"
                  : isDevourIntrigue(card)
                    ? activeCombatStrength
                      ? `Combat / +${activeCombatStrength} strength${activePlayer.deployedSandworms > 0 ? " / optional trash" : ""}`
                      : "Combat / +2 or +4 with worm"
                  : isBackedByChoamIntrigue(card)
                    ? activeCombatStrength ? `Plot / lose Inf. for +4 Solari / Combat +${activeCombatStrength}` : "Plot / lose Inf. for +4 Solari / Combat needs 2 contracts"
                  : isWeirdingCombatIntrigue(card) && activeCombatStrength
                    ? `Combat / +${activeCombatStrength} strength`
                    : card.battleIcon
                      ? `Plot / Endgame / ${battleIconLabels[card.battleIcon]}`
                      : card.combatSwords
                        ? `Combat / +${card.combatSwords} printed strength`
                        : "Intrigue"}
              </span>
              <strong>{card.name}</strong>
              <p>{card.summary}</p>
              {card.battleIcon && (
                <button
                  type="button"
                  onClick={() => scorePlotIntrigue(card.id)}
                  disabled={plotIntrigueLocked}
                >
                  <Sparkles size={14} />
                  Gain Plot Spice
                </button>
              )}
              {isContingencyPlanIntrigue(card) && (
                <button
                  type="button"
                  onClick={() => playContingencyPlanPlot(card.id)}
                  disabled={plotIntrigueLocked}
                >
                  <CircleDollarSign size={14} />
                  Gain 2 Solari
                </button>
              )}
              {isCallToArmsIntrigue(card) && (
                <button
                  type="button"
                  onClick={() => playCallToArmsPlot(card.id)}
                  disabled={plotIntrigueLocked}
                  title="Each card you acquire during this Reveal turn recruits 1 troop"
                >
                  <Users size={14} />
                  Arm Acquisitions
                </button>
              )}
              {isIntelligenceReportIntrigue(card) && (
                <button
                  type="button"
                  onClick={() => playIntelligenceReportPlot(card.id)}
                  disabled={plotIntrigueLocked}
                >
                  <BookOpen size={14} />
                  Draw {intelligenceReportDrawCount}
                </button>
              )}
              {isInspireAweIntrigue(card) && (
                <button
                  type="button"
                  onClick={() => playInspireAwePlot(card.id)}
                  disabled={plotIntrigueLocked}
                  title={
                    inspireAweToHand
                      ? "Acquire a card that costs 3 or less to your hand"
                      : "Acquire a card that costs 3 or less to your discard pile"
                  }
                >
                  <BookOpen size={14} />
                  Acquire &lt;=3{inspireAweToHand ? " to Hand" : ""}
                </button>
              )}
              {isManipulateIntrigue(card) && (
                <div className="intrigue-actions">
                  {manipulateChoices.map((rowCard) => (
                    <button
                      type="button"
                      key={rowCard.id}
                      onClick={() => playManipulatePlot(card.id, rowCard.id)}
                      disabled={plotIntrigueLocked}
                      title={`Remove ${rowCard.name} from the Imperium Row and discount it by 1 this round`}
                    >
                      <BookOpen size={14} />
                      Remove {rowCard.name}
                    </button>
                  ))}
                  {manipulateChoices.length === 0 && <span>No Imperium Row cards to remove.</span>}
                </div>
              )}
              {isLeverageIntrigue(card) && (
                <button
                  type="button"
                  onClick={() => playLeveragePlot(card.id)}
                  disabled={plotIntrigueLocked || !leverageCanPlay}
                  title="Requires gaining spice during this turn"
                >
                  <FileText size={14} />
                  Leverage Contract
                </button>
              )}
              {isDistractionIntrigue(card) && (
                <button
                  type="button"
                  onClick={() => playDistractionPlot(card.id)}
                  disabled={plotIntrigueLocked || !distractionCanPlay}
                  title={distractionTriggerMet ? "Requires another player's spy post and a spy to place" : "Requires deploying three or more units this turn"}
                >
                  <Eye size={14} />
                  Share Spy Post
                </button>
              )}
              {isCunningIntrigue(card) && (
                <div className="intrigue-actions">
                  <button
                    type="button"
                    onClick={() => playCunningPlot(card.id, "draw")}
                    disabled={plotIntrigueLocked}
                  >
                    <BookOpen size={14} />
                    Draw 1
                  </button>
                  <button
                    type="button"
                    onClick={() => playCunningPlot(card.id, "paid-trash")}
                    disabled={plotIntrigueLocked || !cunningCanPay}
                    title="Spend 1 spice to draw 1 card, then trash 1 card"
                  >
                    <X size={14} />
                    1 Spice -&gt; Draw + Trash
                  </button>
                </div>
              )}
              {isSietchRitualIntrigue(card) && (
                <div className="intrigue-actions">
                  {activePlayer.hand.length === 0 && <span>Requires a card in hand to discard.</span>}
                  {activePlayer.hand.map((discardCard) =>
                    sietchRitualChoices.map((faction) => {
                      const personalFaction = activePlayer.role === "Commander" && activePlayer.team === "muaddib"
                        ? "fremen"
                        : undefined;
                      const ownerLabel = activePlayer.role === "Commander" && faction !== personalFaction
                        ? `: ${activatedAlly.leader}`
                        : "";
                      return (
                        <button
                          type="button"
                          key={`${discardCard.id}-${faction}`}
                          onClick={() => playSietchRitualPlot(card.id, discardCard.id, faction)}
                          disabled={plotIntrigueLocked}
                          title={`Discard ${discardCard.name} to gain 1 ${factionLabels[faction]} Influence${ownerLabel ? ` for ${activatedAlly.leader}` : ""}`}
                        >
                          <Minus size={14} />
                          Discard {discardCard.name} -&gt; {factionShortLabels[faction]}{ownerLabel}
                        </button>
                      );
                    }),
                  )}
                </div>
              )}
              {isChangeAllegiancesIntrigue(card) && (
                <div className="intrigue-actions">
                  {changeAllegiancesLossOptions.length > 0 && (
                    <div className="intrigue-choice-row">
                      <label>
                        <span>Lose</span>
                        <select
                          aria-label="Change Allegiances lose Influence"
                          className="intrigue-select"
                          value={selectedChangeLoss ?? ""}
                          onChange={(event) =>
                            updateChangeAllegiancesSelection(card.id, {
                              loseFaction: event.target.value as FactionId,
                            })
                          }
                        >
                          {changeAllegiancesLossOptions.map((faction) => (
                            <option key={faction} value={faction}>
                              {factionShortLabels[faction]}{changeAllegiancesOwnerLabel(faction)}
                            </option>
                          ))}
                        </select>
                      </label>
                      <label>
                        <span>Gain</span>
                        <select
                          aria-label="Change Allegiances shift gain Influence"
                          className="intrigue-select"
                          value={selectedChangeShiftGain ?? ""}
                          onChange={(event) =>
                            updateChangeAllegiancesSelection(card.id, {
                              shiftGainFaction: event.target.value as FactionId,
                            })
                          }
                        >
                          {changeAllegiancesGainOptions.map((faction) => (
                            <option key={faction} value={faction}>
                              {factionShortLabels[faction]}{changeAllegiancesOwnerLabel(faction)}
                            </option>
                          ))}
                        </select>
                      </label>
                      <button
                        type="button"
                        onClick={() => {
                          if (!selectedChangeLoss || !selectedChangeShiftGain) return;
                          playChangeAllegiancesPlot(card.id, {
                            kind: "shift",
                            loseFaction: selectedChangeLoss,
                            gainFaction: selectedChangeShiftGain,
                          });
                        }}
                        disabled={plotIntrigueLocked || !selectedChangeLoss || !selectedChangeShiftGain}
                        title="Lose 1 Influence to gain 1 Influence"
                      >
                        <Minus size={14} />
                        Lose -&gt; Gain
                      </button>
                    </div>
                  )}
                  {changeAllegiancesLossOptions.length === 0 && <span>Lose branch requires Influence.</span>}
                  <div className="intrigue-choice-row">
                    <label>
                      <span>3 Spice gain</span>
                      <select
                        aria-label="Change Allegiances spice gain Influence"
                        className="intrigue-select"
                        value={selectedChangeSpiceGain ?? ""}
                        onChange={(event) =>
                          updateChangeAllegiancesSelection(card.id, {
                            spiceGainFaction: event.target.value as FactionId,
                          })
                        }
                      >
                        {changeAllegiancesGainOptions.map((faction) => (
                          <option key={faction} value={faction}>
                            {factionShortLabels[faction]}{changeAllegiancesOwnerLabel(faction)}
                          </option>
                        ))}
                      </select>
                    </label>
                    <button
                      type="button"
                      onClick={() => {
                        if (!selectedChangeSpiceGain) return;
                        playChangeAllegiancesPlot(card.id, {
                          kind: "spend-spice",
                          gainFaction: selectedChangeSpiceGain,
                        });
                      }}
                      disabled={plotIntrigueLocked || !changeAllegiancesCanPaySpice || !selectedChangeSpiceGain}
                      title="Spend 3 spice to gain 1 Influence"
                    >
                      <HandCoins size={14} />
                      3 Spice -&gt; Gain
                    </button>
                    <button
                      type="button"
                      onClick={() => {
                        if (!selectedChangeLoss || !selectedChangeShiftGain || !selectedChangeSpiceGain) return;
                        playChangeAllegiancesPlot(card.id, {
                          kind: "both",
                          loseFaction: selectedChangeLoss,
                          shiftGainFaction: selectedChangeShiftGain,
                          spiceGainFaction: selectedChangeSpiceGain,
                        });
                      }}
                      disabled={
                        plotIntrigueLocked ||
                        !changeAllegiancesCanPaySpice ||
                        !selectedChangeLoss ||
                        !selectedChangeShiftGain ||
                        !selectedChangeSpiceGain
                      }
                      title="Resolve both rows: lose Influence, spend 3 spice, and gain twice"
                    >
                      <Sparkles size={14} />
                      Both rows
                    </button>
                  </div>
                </div>
              )}
              {isSpecialMissionIntrigue(card) && (
                <div className="intrigue-actions">
                  <button
                    type="button"
                    onClick={() => playSpecialMissionPlot(card.id, { kind: "place-spy" })}
                    disabled={plotIntrigueLocked || !specialMissionCanPlaceSpy}
                    title={
                      activePlayer.spies > 0
                        ? "Place 1 spy on a City observation post"
                        : "Recall one of your spies for supply, then place it on a City observation post"
                    }
                  >
                    <Eye size={14} />
                    City Spy
                  </button>
                  {specialMissionCitySpaces.length === 0 && activePlayer.spies > 0 && (
                    <span>No open City spy posts.</span>
                  )}
                  {specialMissionRecallSpaces.map((space) => (
                    <button
                      type="button"
                      key={space.id}
                      onClick={() => playSpecialMissionPlot(card.id, { kind: "recall-spy", spaceId: space.id })}
                      disabled={plotIntrigueLocked}
                      title={`Recall a spy from ${space.name}, remove the Shield Wall, and gain 2 spice`}
                    >
                      <RotateCcw size={14} />
                      {space.name} -&gt; Wall + 2 Spice
                    </button>
                  ))}
                  {specialMissionRecallSpaces.length === 0 && <span>Recall branch requires one of your spies on the board.</span>}
                </div>
              )}
              {isOpportunismIntrigue(card) && (
                <div className="intrigue-actions">
                  {opportunismChoices.map(([first, second]) => {
                    const lossLabel = first === second
                      ? `2 ${factionShortLabels[first]}`
                      : `${factionShortLabels[first]} + ${factionShortLabels[second]}`;
                    const fullLossLabel = first === second
                      ? `2 ${factionLabels[first]} Influence`
                      : `1 ${factionLabels[first]} Influence and 1 ${factionLabels[second]} Influence`;
                    return (
                      <button
                        type="button"
                        key={`${first}-${second}`}
                        onClick={() => playOpportunismPlot(card.id, [first, second])}
                        disabled={plotIntrigueLocked || !opportunismCanPay}
                        title={`Spend 2 Solari and lose ${fullLossLabel} to gain 1 VP`}
                      >
                        <Minus size={14} />
                        2 Solari + {lossLabel} -&gt; VP
                      </button>
                    );
                  })}
                  {opportunismChoices.length === 0 && <span>Requires two Influence to lose.</span>}
                </div>
              )}
              {isImperiumPoliticsIntrigue(card) && (
                <div className="intrigue-actions">
                  {imperiumPoliticsChoices.map((faction) => {
                    const ownerLabel =
                      activePlayer.role === "Commander" && faction !== "emperor"
                        ? `: ${imperiumPoliticsOwner.leader}`
                        : "";
                    return (
                      <button
                        type="button"
                        key={faction}
                        onClick={() => playImperiumPoliticsPlot(card.id, faction)}
                        disabled={plotIntrigueLocked || !imperiumPoliticsCanPay}
                        title={`Spend 1 Solari to gain 1 ${factionLabels[faction]} Influence${ownerLabel ? ` for ${imperiumPoliticsOwner.leader}` : ""}`}
                      >
                        <HandCoins size={14} />
                        1 Solari -&gt; {factionShortLabels[faction]}{ownerLabel}
                      </button>
                    );
                  })}
                </div>
              )}
              {isBuyAccessIntrigue(card) && (
                <div className="intrigue-actions">
                  {buyAccessChoices.map(([first, second]) => {
                    const personalFaction = activePlayer.role === "Commander"
                      ? activePlayer.team === "muaddib" ? "fremen" : "emperor"
                      : undefined;
                    const buyAccessLabel = activePlayer.role === "Commander"
                      ? [
                          [first, second].filter((faction) => faction === personalFaction),
                          [first, second].filter((faction) => faction !== personalFaction),
                        ]
                        .flatMap((factions, index) => {
                          if (factions.length === 0) return [];
                          const label = factions.map((faction) => factionShortLabels[faction]).join(" + ");
                          return index === 0 ? [`Self: ${label}`] : [`${activatedAlly.leader}: ${label}`];
                        })
                        .join(" / ")
                      : `${factionShortLabels[first]} + ${factionShortLabels[second]}`;
                    return (
                      <button
                        type="button"
                        key={`${first}-${second}`}
                        onClick={() => playBuyAccessPlot(card.id, [first, second])}
                        disabled={plotIntrigueLocked || !buyAccessCanPay}
                        title={`Spend 5 Solari to gain 1 ${factionLabels[first]} Influence and 1 ${factionLabels[second]} Influence${activePlayer.role === "Commander" ? `; game-board Influence goes to ${activatedAlly.leader}` : ""}`}
                      >
                        <HandCoins size={14} />
                        5 Solari -&gt; {buyAccessLabel}
                      </button>
                    );
                  })}
                </div>
              )}
              {isDepartForArrakisIntrigue(card) && (
                <div className="intrigue-actions">
                  <button
                    type="button"
                    onClick={() => playDepartForArrakisPlot(card.id, "draw")}
                    disabled={plotIntrigueLocked || !departForArrakisCanDraw}
                    title="Requires 3 Fremen/Fringe Influence"
                  >
                    <BookOpen size={14} />
                    Draw 1
                  </button>
                  <button
                    type="button"
                    onClick={() => playDepartForArrakisPlot(card.id, "spend-spice")}
                    disabled={plotIntrigueLocked || !departForArrakisCanPay}
                    title={departForArrakisSpendTitle}
                  >
                    <Users size={14} />
                    2 Spice -&gt; {departForArrakisSpendRewardLabel}
                    {departForArrakisCanRecruit && departForArrakisOwner.id !== activePlayer.id
                      ? `: ${departForArrakisOwner.leader}`
                      : ""}
                    {departForArrakisCanRecruit && departForArrakisCanActuallyDraw ? " + Draw" : ""}
                  </button>
                </div>
              )}
              {isCouncilorsAmbitionIntrigue(card) && (
                <button
                  type="button"
                  onClick={() => playCouncilorsAmbitionPlot(card.id)}
                  disabled={plotIntrigueLocked || !councilorsAmbitionCanPlay}
                  title="Requires a High Council seat"
                >
                  <Droplets size={14} />
                  Gain 2 Water
                </button>
              )}
              {isStrategicStockpilingIntrigue(card) && (
                <div className="intrigue-actions">
                  <button
                    type="button"
                    onClick={() => playStrategicStockpilingPlot(card.id, "spice")}
                    disabled={plotIntrigueLocked || !strategicStockpilingCanSpice}
                    title="Spend 5 spice to gain 1 VP"
                  >
                    <Sparkles size={14} />
                    5 Spice -&gt; VP
                  </button>
                  <button
                    type="button"
                    onClick={() => playStrategicStockpilingPlot(card.id, "water")}
                    disabled={plotIntrigueLocked || !strategicStockpilingCanWater}
                    title="Requires 3 Spacing Guild Influence; spend 3 water to gain 1 VP"
                  >
                    <Droplets size={14} />
                    3 Water -&gt; VP
                  </button>
                  <button
                    type="button"
                    onClick={() => playStrategicStockpilingPlot(card.id, "both")}
                    disabled={plotIntrigueLocked || !strategicStockpilingCanSpice || !strategicStockpilingCanWater}
                    title="Resolve both Strategic Stockpiling effects"
                  >
                    <Crown size={14} />
                    Both -&gt; 2 VP
                  </button>
                </div>
              )}
              {isShaddamsFavorIntrigue(card) && (
                <button
                  type="button"
                  onClick={() => playShaddamsFavorPlot(card.id)}
                  disabled={plotIntrigueLocked || !shaddamsFavorCanResolve}
                  title={shaddamsFavorGainsSolari
                    ? `${shaddamsFavorCanRecruit ? "Recruit 1 troop and gain" : "Gain"} 3 Solari`
                    : "Requires troop supply or 3 Emperor/Great Houses Influence"}
                >
                  <Users size={14} />
                  Recruit{activePlayer.role === "Commander" ? `: ${shaddamsFavorOwner.leader}` : ""}
                  {shaddamsFavorGainsSolari ? " + 3 Solari" : ""}
                </button>
              )}
              {isMarketOpportunityIntrigue(card) && (
                <div className="intrigue-actions">
                  <button
                    type="button"
                    onClick={() => playMarketOpportunityPlot(card.id, "spice-to-solari")}
                    disabled={plotIntrigueLocked || !marketOpportunityCanSellSpice}
                    title="Spend 2 spice to gain 5 Solari"
                  >
                    <CircleDollarSign size={14} />
                    2 Spice -&gt; 5 Solari
                  </button>
                  <button
                    type="button"
                    onClick={() => playMarketOpportunityPlot(card.id, "solari-to-spice")}
                    disabled={plotIntrigueLocked || !marketOpportunityCanBuySpice}
                    title="Spend 5 Solari to gain 5 spice"
                  >
                    <Sparkles size={14} />
                    5 Solari -&gt; 5 Spice
                  </button>
                </div>
              )}
              {isMercenariesIntrigue(card) && (
                <button
                  type="button"
                  onClick={() => playMercenariesPlot(card.id)}
                  disabled={plotIntrigueLocked || !mercenariesCanPay}
                  title="Spend 3 Solari to draw 1 Intrigue and recruit 2 troops"
                >
                  <Users size={14} />
                  Hire Mercs
                  {activePlayer.role === "Commander" ? `: ${mercenariesOwner.leader}` : ""}
                </button>
              )}
              {isBackedByChoamIntrigue(card) && (
                <div className="intrigue-actions">
                  {backedByChoamPlotChoices.map((faction) => (
                    <button
                      type="button"
                      key={faction}
                      onClick={() => playBackedByChoamPlot(card.id, faction)}
                      disabled={plotIntrigueLocked}
                      title={`Lose 1 ${factionLabels[faction]} Influence to gain 4 Solari`}
                    >
                      <CircleDollarSign size={14} />
                      Lose {factionShortLabels[faction]} -&gt; 4 Solari
                    </button>
                  ))}
                  {backedByChoamPlotChoices.length === 0 && (
                    <button type="button" disabled title="Requires at least 1 Influence">
                      Need Influence
                    </button>
                  )}
                </div>
              )}
              {isDetonationIntrigue(card) && (
                <div className="intrigue-actions">
                  <button
                    type="button"
                    onClick={() => playDetonation(card.id, "shield-wall")}
                    disabled={plotIntrigueLocked || !game.shieldWall}
                  >
                    <Shield size={14} />
                    Remove Shield Wall
                  </button>
                  <button
                    type="button"
                    onClick={() => playDetonation(card.id, "deploy")}
                    disabled={plotIntrigueLocked || !game.conflict || detonationDeploymentBlocked}
                    title={detonationDeploymentBlocked ? "Conflict deployment is blocked this turn" : undefined}
                  >
                    <Swords size={14} />
                    Deploy up to {Math.min(detonationDeployOwner.garrison, 4)}
                  </button>
                </div>
              )}
              {isUnexpectedAlliesIntrigue(card) && (
                <div className="intrigue-actions">
                  {unexpectedAlliesCanSummonWithoutWall && (
                    <button
                      type="button"
                      onClick={() => playUnexpectedAllies(card.id, false)}
                      disabled={unexpectedAlliesDisabled}
                      title={unexpectedAlliesDeploymentBlocked ? "Conflict deployment is blocked this turn" : undefined}
                    >
                      <Sparkles size={14} />
                      Worm{unexpectedAlliesOwner.id !== activePlayer.id ? `: ${unexpectedAlliesOwner.leader}` : ""}
                    </button>
                  )}
                  {game.shieldWall && (
                    <button
                      type="button"
                      onClick={() => playUnexpectedAllies(card.id, true)}
                      disabled={unexpectedAlliesDisabled}
                      title={unexpectedAlliesDeploymentBlocked ? "Conflict deployment is blocked this turn" : undefined}
                    >
                      <Shield size={14} />
                      {unexpectedAlliesBlockedByShieldWall ? "Wall + worm" : "Remove wall + worm"}
                    </button>
                  )}
                </div>
              )}
            </article>
          );
        })}
      </div>
    </section>
  );
}
