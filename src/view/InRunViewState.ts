export type PlayerId = string;

export interface Rect {
  readonly x: number;
  readonly y: number;
  readonly width: number;
  readonly height: number;
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
  readonly mode: UiMode;
  readonly screen: {
    readonly width: number;
    readonly height: number;
    readonly scale: number;
    readonly safeArea: Rect;
  };
  readonly players: readonly PlayerHudViewState[];
  readonly teamInsight: TeamInsightBarViewState;
  readonly stage: StageProgressViewState;
  readonly boss?: BossHudViewState;
  readonly tribulation?: TribulationOverlayViewState;
  readonly rescue?: RescueViewState;
  readonly insight?: InsightOverlayViewState;
  readonly prompts: readonly CombatPromptViewState[];
}

export interface PlayerHudViewState {
  readonly playerId: PlayerId;
  readonly core: PlayerCorePanelViewState;
  readonly cultivation: CultivationBarViewState;
  readonly spells: readonly SpellSlotViewState[];
  readonly pills: readonly PillSlotViewState[];
  readonly artifacts: ArtifactPanelViewState;
  readonly treasures: SpiritTreasureRackViewState;
  readonly buildSummary: BuildSummaryViewState;
}

export interface PlayerCorePanelViewState {
  readonly playerId: PlayerId;
  readonly displayName: string;
  readonly colorToken: "player1" | "player2";
  readonly realmName: string;
  readonly realmLayer: number;
  readonly hp: number;
  readonly maxHp: number;
  readonly qi: number;
  readonly maxQi: number;
  readonly aliveState: "body" | "soul" | "yang_shen" | "reshaping" | "dead";
  readonly activeStatusTags: readonly StatusTagView[];
  readonly lowHp: boolean;
  readonly canBeRescued: boolean;
  readonly rescueProgress?: number;
}

export interface StatusTagView {
  readonly id: string;
  readonly label: string;
  readonly remainingTime?: number;
  readonly severity: "buff" | "debuff" | "warning" | "neutral";
}

export interface TeamInsightBarViewState {
  readonly visible: boolean;
  readonly teamLevel: number;
  readonly exp: number;
  readonly expToNext: number;
  readonly progress01: number;
  readonly nextTriggerText: string;
  readonly sharedFortuneReroll: number;
  readonly isReadyToInsight: boolean;
}

export interface CultivationBarViewState {
  readonly playerId: PlayerId;
  readonly realmName: string;
  readonly layer: number;
  readonly cultivation: number;
  readonly cultivationToNext: number;
  readonly progress01: number;
  readonly regenPerSecond: number;
  readonly bottleneck?: CultivationBottleneckViewState;
}

export interface CultivationBottleneckViewState {
  readonly type: "minor_layer" | "major_realm";
  readonly targetRealmName?: string;
  readonly tribulationIncoming: boolean;
  readonly countdown?: number;
}

export interface SpellSlotViewState {
  readonly slotIndex: 0 | 1 | 2 | 3;
  readonly keyLabel: string;
  readonly spellId?: string;
  readonly name?: string;
  readonly level?: number;
  readonly costQi?: number;
  readonly cooldownRemaining?: number;
  readonly cooldownTotal?: number;
  readonly state: "empty" | "ready" | "cooldown" | "qi_insufficient" | "casting" | "disabled";
  readonly element?: "metal" | "wood" | "water" | "fire" | "earth" | "thunder" | "void";
  readonly comboCounter?: number;
}

export interface PillSlotViewState {
  readonly slotIndex: 0 | 1 | 2;
  readonly keyLabel: string;
  readonly pillId?: string;
  readonly name?: string;
  readonly state: "empty" | "ready" | "digesting" | "side_effect" | "disabled";
  readonly remainingTime?: number;
  readonly totalTime?: number;
  readonly effectSummary?: string;
  readonly warningRecommended?: boolean;
}

export interface ArtifactPanelViewState {
  readonly outer?: ArtifactSlotViewState;
  readonly inner?: ArtifactSlotViewState;
}

export interface ArtifactSlotViewState {
  readonly slotType: "outer" | "inner";
  readonly itemId?: string | null;
  readonly name?: string;
  readonly star?: number;
  readonly state: "empty" | "active" | "cooldown" | "empowered";
  readonly procFlash?: boolean;
}

export interface SpiritTreasureRackViewState {
  readonly slots: readonly SpiritTreasureSlotViewState[];
}

export interface SpiritTreasureSlotViewState {
  readonly slotIndex: 0 | 1 | 2 | 3;
  readonly source: "outer" | "inner";
  readonly itemId?: string | null;
  readonly name?: string;
  readonly role?: "offense" | "defense" | "utility" | "coop";
  readonly state: "empty" | "active" | "cooldown" | "triggered";
  readonly cooldownRemaining?: number;
}

export interface BuildSummaryViewState {
  readonly techniqueTags: readonly string[];
  readonly talentTags: readonly string[];
  readonly constitutionTags: readonly string[];
  readonly synergyText?: string;
}

export interface BossHudViewState {
  readonly visible: boolean;
  readonly bossId?: string;
  readonly name?: string;
  readonly hp?: number;
  readonly maxHp?: number;
  readonly phaseIndex?: number;
  readonly phaseCount?: number;
  readonly phaseName?: string;
  readonly currentWarning?: {
    readonly text: string;
    readonly remainingTime: number;
    readonly severity: "medium" | "high" | "lethal";
  };
}

export interface StageProgressViewState {
  readonly stageName: string;
  readonly segmentName: string;
  readonly segmentIndex: number;
  readonly segmentCount: number;
  readonly timeRemaining?: number;
  readonly nextEventText?: string;
  readonly intensity: "low" | "medium" | "high" | "boss";
}

export interface InsightOverlayViewState {
  readonly visible: boolean;
  readonly mode: "single" | "coop";
  readonly sharedFortuneReroll: number;
  readonly players: readonly InsightPlayerPanelViewState[];
}

export interface InsightPlayerPanelViewState {
  readonly playerId: PlayerId;
  readonly selected: boolean;
  readonly guardianState: boolean;
  readonly options: readonly InsightOptionCardViewState[];
}

export interface InsightOptionCardViewState {
  readonly optionId: string;
  readonly rewardType:
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
  readonly name: string;
  readonly rarity: "common" | "uncommon" | "rare" | "epic" | "legendary";
  readonly shortDescription: string;
  readonly buildSynergyTags: readonly string[];
  readonly keyLabel: string;
  readonly disabled?: boolean;
}

export interface TribulationOverlayViewState {
  readonly active: boolean;
  readonly playerId: PlayerId;
  readonly tribulationName: string;
  readonly phase: "incoming" | "active" | "final_strike" | "success" | "failed";
  readonly remainingTime: number;
  readonly warningText: string;
  readonly canClearThunder: false;
  readonly targetRealmName?: string;
  readonly lightningWarnings: readonly LightningWarningViewState[];
}

export interface LightningWarningViewState {
  readonly id: string;
  readonly x: number;
  readonly y: number;
  readonly radius: number;
  readonly timeToImpact: number;
  readonly severity: "medium" | "high" | "lethal";
}

export interface RescueViewState {
  readonly visible: boolean;
  readonly downedPlayerId: PlayerId;
  readonly rescuerPlayerId?: PlayerId;
  readonly canRescue: boolean;
  readonly inRange: boolean;
  readonly progress01: number;
  readonly hpCostPreviewPercent: number;
  readonly keyLabel: string;
  readonly decayActive: boolean;
}

export interface CombatPromptViewState {
  readonly id: string;
  readonly priority: "P0" | "P1" | "P2" | "P3" | "P4";
  readonly kind: "resource" | "combat" | "system" | "coop" | "tribulation" | "build";
  readonly mainText: string;
  readonly subText?: string;
  readonly remainingTime: number;
  readonly anchor:
    | { readonly type: "screen"; readonly x: number; readonly y: number }
    | { readonly type: "entity"; readonly entityId: string }
    | { readonly type: "component"; readonly componentId: string };
}
