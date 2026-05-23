// 局内 UI/UX 信息架构 v0.1 TypeScript 契约草案
// 目标：UI 从 ViewState 渲染，不直接读取 gameplay state 或 DOM 输入。

export type PlayerId = "p1" | "p2";

export interface Rect {
  x: number;
  y: number;
  width: number;
  height: number;
}

export type UiMode =
  | "combat"
  | "combat_boss"
  | "combat_tribulation"
  | "insight_paused"
  | "rescue_focus"
  | "pause"
  | "run_end";

export interface InRunUiViewState {
  mode: UiMode;
  screen: {
    width: number;
    height: number;
    scale: number;
    safeArea: Rect;
  };

  players: PlayerHudViewState[];
  teamInsight: TeamInsightBarViewState;
  stage: StageProgressViewState;

  boss?: BossHudViewState;
  tribulation?: TribulationOverlayViewState;
  rescue?: RescueViewState;
  insight?: InsightOverlayViewState;

  prompts: CombatPromptViewState[];
}

export interface PlayerHudViewState {
  playerId: PlayerId;
  core: PlayerCorePanelViewState;
  cultivation: CultivationBarViewState;
  spells: SpellSlotViewState[];
  pills: PillSlotViewState[];
  artifacts: ArtifactPanelViewState;
  treasures: SpiritTreasureRackViewState;
  buildSummary: BuildSummaryViewState;
}

export interface PlayerCorePanelViewState {
  playerId: PlayerId;
  displayName: string;
  colorToken: "player1" | "player2";

  realmName: string;
  realmLayer: number;

  hp: number;
  maxHp: number;
  qi: number;
  maxQi: number;

  aliveState: "body" | "soul" | "reshaping" | "dead";

  activeStatusTags: StatusTagView[];
  lowHp: boolean;
  canBeRescued: boolean;
  rescueProgress?: number;
}

export interface StatusTagView {
  id: string;
  label: string;
  remainingTime?: number;
  severity: "buff" | "debuff" | "warning" | "neutral";
}

export interface TeamInsightBarViewState {
  visible: boolean;
  teamLevel: number;
  exp: number;
  expToNext: number;
  progress01: number;
  nextTriggerText: string;
  sharedFortuneReroll: number;
  isReadyToInsight: boolean;
}

export interface CultivationBarViewState {
  playerId: PlayerId;
  realmName: string;
  layer: number;
  cultivation: number;
  cultivationToNext: number;
  progress01: number;
  regenPerSecond: number;
  bottleneck?: {
    type: "minor_layer" | "major_realm";
    targetRealmName?: string;
    tribulationIncoming: boolean;
    countdown?: number;
  };
}

export interface SpellSlotViewState {
  slotIndex: 0 | 1 | 2 | 3;
  keyLabel: string;
  spellId?: string;
  name?: string;
  level?: number;
  costQi?: number;
  cooldownRemaining?: number;
  cooldownTotal?: number;
  state: "empty" | "ready" | "cooldown" | "qi_insufficient" | "casting" | "disabled";
  element?: "metal" | "wood" | "water" | "fire" | "earth" | "thunder" | "void";
  comboCounter?: number;
}

export interface PillSlotViewState {
  slotIndex: 0 | 1 | 2;
  keyLabel: string;
  pillId?: string;
  name?: string;
  state: "empty" | "ready" | "digesting" | "side_effect" | "disabled";
  remainingTime?: number;
  totalTime?: number;
  effectSummary?: string;
  warningRecommended?: boolean;
}

export interface ArtifactPanelViewState {
  outer?: ArtifactSlotViewState;
  inner?: ArtifactSlotViewState;
}

export interface ArtifactSlotViewState {
  slotType: "outer" | "inner";
  itemId?: string;
  name?: string;
  star?: number;
  state: "empty" | "active" | "cooldown" | "empowered";
  procFlash?: boolean;
}

export interface SpiritTreasureRackViewState {
  slots: SpiritTreasureSlotViewState[];
}

export interface SpiritTreasureSlotViewState {
  slotIndex: 0 | 1 | 2 | 3;
  source: "outer" | "inner";
  itemId?: string;
  name?: string;
  role?: "offense" | "defense" | "utility" | "coop";
  state: "empty" | "active" | "cooldown" | "triggered";
  cooldownRemaining?: number;
}

export interface BuildSummaryViewState {
  techniqueTags: string[];
  talentTags: string[];
  constitutionTags: string[];
  synergyText?: string;
}

export interface BossHudViewState {
  visible: boolean;
  bossId?: string;
  name?: string;
  hp?: number;
  maxHp?: number;
  phaseIndex?: number;
  phaseCount?: number;
  phaseName?: string;
  currentWarning?: {
    text: string;
    remainingTime: number;
    severity: "medium" | "high" | "lethal";
  };
}

export interface StageProgressViewState {
  stageName: string;
  segmentName: string;
  segmentIndex: number;
  segmentCount: number;
  timeRemaining?: number;
  nextEventText?: string;
  intensity: "low" | "medium" | "high" | "boss";
}

export interface InsightOverlayViewState {
  visible: boolean;
  mode: "single" | "coop";
  sharedFortuneReroll: number;
  players: InsightPlayerPanelViewState[];
}

export interface InsightPlayerPanelViewState {
  playerId: PlayerId;
  selected: boolean;
  guardianState: boolean;
  options: InsightOptionCardViewState[];
}

export interface InsightOptionCardViewState {
  optionId: string;
  rewardType:
    | "spell_new"
    | "spell_upgrade"
    | "technique"
    | "talent"
    | "constitution"
    | "spirit_treasure"
    | "natal_artifact_inner"
    | "pill"
    | "cultivation_boost"
    | "heavenly_material";
  name: string;
  rarity: "common" | "uncommon" | "rare" | "epic" | "legendary";
  shortDescription: string;
  buildSynergyTags: string[];
  keyLabel: string;
  disabled?: boolean;
}

export interface TribulationOverlayViewState {
  active: boolean;
  playerId: PlayerId;
  tribulationName: string;
  phase: "incoming" | "active" | "final_strike" | "success" | "failed";
  remainingTime: number;
  warningText: string;
  canClearThunder: false;
  targetRealmName?: string;
  lightningWarnings: LightningWarningViewState[];
}

export interface LightningWarningViewState {
  id: string;
  x: number;
  y: number;
  radius: number;
  timeToImpact: number;
  severity: "medium" | "high" | "lethal";
}

export interface RescueViewState {
  visible: boolean;
  downedPlayerId: PlayerId;
  rescuerPlayerId?: PlayerId;
  canRescue: boolean;
  inRange: boolean;
  progress01: number;
  hpCostPreviewPercent: number;
  keyLabel: string;
  decayActive: boolean;
}

export interface CombatPromptViewState {
  id: string;
  priority: "P0" | "P1" | "P2" | "P3" | "P4";
  kind: "resource" | "combat" | "system" | "coop" | "tribulation" | "build";
  mainText: string;
  subText?: string;
  remainingTime: number;
  anchor:
    | { type: "screen"; x: number; y: number }
    | { type: "entity"; entityId: string }
    | { type: "component"; componentId: string };
}
