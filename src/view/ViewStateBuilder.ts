import { SIM_FPS } from "../sim/SimConstants";
import type { PlayerId } from "../sim/input/FrameInput";
import type { InsightSessionState } from "../sim/progression/InsightSession";
import type { PlayerCultivationState, PlayerState, RescueState, SimState, TribulationState } from "../sim/state/SimState";
import type {
  ArtifactPanelViewState,
  ArtifactSlotViewState,
  BuildSummaryViewState,
  CultivationBarViewState,
  CultivationBottleneckViewState,
  InRunUiViewState,
  InsightOptionCardViewState,
  InsightOverlayViewState,
  LightningWarningViewState,
  PillSlotViewState,
  PlayerCorePanelViewState,
  PlayerHudViewState,
  Rect,
  RescueViewState,
  SpellSlotViewState,
  SpiritTreasureRackViewState,
  SpiritTreasureSlotViewState,
  StageProgressViewState,
  TeamInsightBarViewState,
  TribulationOverlayViewState,
  UiMode
} from "./InRunViewState";

export type NameValue = string | { readonly zhCN?: string; readonly en?: string };

export interface ViewContentInput {
  readonly artifacts?: readonly ViewArtifactContent[];
  readonly bosses?: readonly ViewBossContent[];
  readonly cultivationRules?: {
    readonly inRunBreathGainPerSecond?: number;
  };
  readonly pills?: readonly ViewPillContent[];
  readonly realms?: readonly ViewRealmContent[];
  readonly spells?: readonly ViewSpellContent[];
  readonly stages?: readonly ViewStageContent[];
  readonly treasures?: readonly ViewTreasureContent[];
  readonly tribulations?: readonly ViewTribulationContent[];
}

export interface ViewContentIndex {
  readonly artifacts: Readonly<Record<string, ViewArtifactContent>>;
  readonly bosses: Readonly<Record<string, ViewBossContent>>;
  readonly inRunBreathGainPerSecond: number;
  readonly pills: Readonly<Record<string, ViewPillContent>>;
  readonly realms: Readonly<Record<string, ViewRealmContent>>;
  readonly spells: Readonly<Record<string, ViewSpellContent>>;
  readonly stages: Readonly<Record<string, ViewStageContent>>;
  readonly treasures: Readonly<Record<string, ViewTreasureContent>>;
  readonly tribulations: Readonly<Record<string, ViewTribulationContent>>;
}

export interface ViewSpellContent {
  readonly id: string;
  readonly name?: NameValue;
  readonly element?: string;
  readonly costQi?: number;
  readonly cooldown?: number;
  readonly tags?: readonly string[];
}

export interface ViewPillContent {
  readonly id: string;
  readonly name?: NameValue;
  readonly digestTime?: number;
  readonly tags?: readonly string[];
}

export interface ViewArtifactContent {
  readonly id: string;
  readonly name?: NameValue;
}

export interface ViewTreasureContent {
  readonly id: string;
  readonly name?: NameValue;
  readonly role?: string;
}

export interface ViewRealmContent {
  readonly id: string;
  readonly name?: NameValue;
  readonly layers?: number;
  readonly breakthrough?: {
    readonly nextRealmId?: string;
  };
}

export interface ViewBossContent {
  readonly id: string;
  readonly name?: NameValue;
  readonly hp?: number;
  readonly phases?: readonly { readonly id: string }[];
}

export interface ViewStageContent {
  readonly id: string;
  readonly name?: NameValue;
  readonly segments?: readonly ViewStageSegmentContent[];
}

export interface ViewStageSegmentContent {
  readonly id: string;
  readonly name?: NameValue;
  readonly duration?: number;
}

export interface ViewTribulationContent {
  readonly id: string;
  readonly name?: NameValue;
  readonly duration?: number;
  readonly trigger?: {
    readonly realmTo?: string;
  };
  readonly overlay?: {
    readonly warningText?: string;
  };
}

export interface ViewPlayerLoadout {
  readonly playerId: PlayerId;
  readonly displayName?: string;
  readonly spellSlots?: readonly (string | null)[];
  readonly spellLevels?: Readonly<Record<string, number>>;
  readonly pillSlots?: readonly (string | null)[];
  readonly outerArtifact?: ViewArtifactLoadoutSlot;
  readonly innerArtifact?: ViewArtifactLoadoutSlot;
  readonly treasureSlots?: readonly ViewTreasureLoadoutSlot[];
  readonly techniqueTags?: readonly string[];
  readonly talentTags?: readonly string[];
  readonly constitutionTags?: readonly string[];
  readonly synergyText?: string;
}

export interface ViewArtifactLoadoutSlot {
  readonly itemId: string | null;
  readonly star?: number;
}

export interface ViewTreasureLoadoutSlot {
  readonly source: "outer" | "inner";
  readonly itemId: string | null;
}

export interface ViewScreenInput {
  readonly width: number;
  readonly height: number;
  readonly scale: number;
  readonly safeArea?: Rect;
}

export interface ViewStageProgressInput {
  readonly stageId?: string;
  readonly segmentId?: string;
  readonly segmentIndex?: number;
  readonly segmentCount?: number;
  readonly segmentStartFrame?: number;
  readonly segmentEndFrame?: number;
  readonly nextEventText?: string;
  readonly intensity?: StageProgressViewState["intensity"];
}

export interface ViewLightningWarningInput {
  readonly id: string;
  readonly tribulationId: string;
  readonly x: number;
  readonly y: number;
  readonly radius: number;
  readonly impactFrame: number;
  readonly severity: LightningWarningViewState["severity"];
}

export interface BuildInRunViewStateOptions {
  readonly simState: SimState;
  readonly content: ViewContentIndex;
  readonly screen: ViewScreenInput;
  readonly playerLoadouts?: readonly ViewPlayerLoadout[];
  readonly stageProgress?: ViewStageProgressInput;
  readonly insightSession?: InsightSessionState;
  readonly lightningWarnings?: readonly ViewLightningWarningInput[];
}

const SPELL_SLOT_INDEXES = [0, 1, 2, 3] as const;
const PILL_SLOT_INDEXES = [0, 1, 2] as const;
const TREASURE_SLOT_INDEXES = [0, 1, 2, 3] as const;
const P1_SPELL_KEYS = ["J", "K", "L", "I"] as const;
const P2_SPELL_KEYS = ["Num1", "Num2", "Num5", "Num6"] as const;
const P1_PILL_KEYS = ["1", "2", "3"] as const;
const P2_PILL_KEYS = ["7", "8", "9"] as const;
const P1_INSIGHT_KEYS = ["J", "K", "L"] as const;
const P2_INSIGHT_KEYS = ["Num1", "Num2", "Num3"] as const;

export function createViewContentIndex(input: ViewContentInput): ViewContentIndex {
  return {
    artifacts: indexById(input.artifacts ?? []),
    bosses: indexById(input.bosses ?? []),
    inRunBreathGainPerSecond: input.cultivationRules?.inRunBreathGainPerSecond ?? 0,
    pills: indexById(input.pills ?? []),
    realms: indexById(input.realms ?? []),
    spells: indexById(input.spells ?? []),
    stages: indexById(input.stages ?? []),
    treasures: indexById(input.treasures ?? []),
    tribulations: indexById(input.tribulations ?? [])
  };
}

export function buildInRunViewState(options: BuildInRunViewStateOptions): InRunUiViewState {
  const players = [...options.simState.players].sort((a, b) => a.playerId.localeCompare(b.playerId));
  const loadoutsByPlayer = new Map((options.playerLoadouts ?? []).map((loadout) => [loadout.playerId, loadout]));
  const cultivationByPlayer = new Map(options.simState.playerCultivations.map((cultivation) => [cultivation.playerId, cultivation]));
  const rescue = buildRescueView(options.simState.rescueStates);
  const rescueByDownedPlayer = new Map(options.simState.rescueStates.map((state) => [state.downedPlayerId, state]));
  const boss = buildBossView(options.simState, options.content);
  const tribulation = buildTribulationView(options.simState, options.content, options.lightningWarnings ?? []);
  const insight = buildInsightView(options.insightSession, options.content);

  const view: InRunUiViewState = {
    mode: chooseMode({ insight, tribulation, rescue, boss }),
    screen: {
      width: options.screen.width,
      height: options.screen.height,
      scale: options.screen.scale,
      safeArea: options.screen.safeArea ?? { x: 0, y: 0, width: options.screen.width, height: options.screen.height }
    },
    players: players.map((player) =>
      buildPlayerHud({
        player,
        loadout: loadoutsByPlayer.get(player.playerId),
        cultivation: cultivationByPlayer.get(player.playerId),
        rescue: rescueByDownedPlayer.get(player.playerId),
        content: options.content,
        frame: options.simState.frame
      })
    ),
    teamInsight: buildTeamInsight(options.simState),
    stage: buildStageProgress(options.simState, options.content, options.stageProgress),
    ...(boss === undefined ? {} : { boss }),
    ...(tribulation === undefined ? {} : { tribulation }),
    ...(rescue === undefined ? {} : { rescue }),
    ...(insight === undefined ? {} : { insight }),
    prompts: []
  };

  return deepFreeze(view);
}

function buildPlayerHud(options: {
  readonly player: PlayerState;
  readonly loadout: ViewPlayerLoadout | undefined;
  readonly cultivation: PlayerCultivationState | undefined;
  readonly rescue: RescueState | undefined;
  readonly content: ViewContentIndex;
  readonly frame: number;
}): PlayerHudViewState {
  const cultivation = buildCultivationView(options.player.playerId, options.cultivation, options.content);
  return {
    playerId: options.player.playerId,
    core: buildPlayerCore(options.player, options.loadout, cultivation, options.rescue),
    cultivation,
    spells: buildSpellSlots(options.player, options.loadout, options.content, options.frame),
    pills: buildPillSlots(options.player, options.loadout, options.content),
    artifacts: buildArtifactPanel(options.loadout, options.content),
    treasures: buildTreasureRack(options.loadout, options.content),
    buildSummary: buildSummary(options.loadout)
  };
}

function buildPlayerCore(
  player: PlayerState,
  loadout: ViewPlayerLoadout | undefined,
  cultivation: CultivationBarViewState,
  rescue: RescueState | undefined
): PlayerCorePanelViewState {
  const base: PlayerCorePanelViewState = {
    playerId: player.playerId,
    displayName: loadout?.displayName ?? player.playerId.toUpperCase(),
    colorToken: player.playerId === "p1" ? "player1" : "player2",
    realmName: cultivation.realmName,
    realmLayer: cultivation.layer,
    hp: round3(player.hp),
    maxHp: round3(player.maxHp),
    qi: round3(player.qi),
    maxQi: round3(player.maxQi),
    aliveState: player.aliveState,
    activeStatusTags: [],
    lowHp: player.maxHp > 0 && player.hp / player.maxHp <= 0.4,
    canBeRescued: rescue !== undefined
  };
  if (rescue === undefined) {
    return base;
  }
  return {
    ...base,
    rescueProgress: progress01(rescue.progressFrames, rescue.requiredFrames)
  };
}

function buildTeamInsight(simState: SimState): TeamInsightBarViewState {
  return {
    visible: true,
    teamLevel: simState.teamInsightExp.level,
    exp: round3(simState.teamInsightExp.exp),
    expToNext: round3(simState.teamInsightExp.expToNext),
    progress01: progress01(simState.teamInsightExp.exp, simState.teamInsightExp.expToNext),
    nextTriggerText: "下一次顿悟",
    sharedFortuneReroll: simState.teamInsightExp.sharedFortuneReroll,
    isReadyToInsight: simState.teamInsightExp.exp >= simState.teamInsightExp.expToNext
  };
}

function buildCultivationView(
  playerId: PlayerId,
  cultivation: PlayerCultivationState | undefined,
  content: ViewContentIndex
): CultivationBarViewState {
  const state =
    cultivation ??
    ({
      playerId,
      realmId: "unknown_realm",
      layer: 1,
      cultivation: 0,
      cultivationToNext: 0,
      inTribulation: false
    } satisfies PlayerCultivationState);
  const realm = content.realms[state.realmId];
  const bottleneck = buildCultivationBottleneck(state, realm, content);
  return {
    playerId,
    realmName: displayName(realm, state.realmId),
    layer: state.layer,
    cultivation: round3(state.cultivation),
    cultivationToNext: round3(state.cultivationToNext),
    progress01: progress01(state.cultivation, state.cultivationToNext),
    regenPerSecond: round3(content.inRunBreathGainPerSecond),
    ...(bottleneck === undefined ? {} : { bottleneck })
  };
}

function buildCultivationBottleneck(
  cultivation: PlayerCultivationState,
  realm: ViewRealmContent | undefined,
  content: ViewContentIndex
): CultivationBottleneckViewState | undefined {
  if (cultivation.cultivation < cultivation.cultivationToNext || cultivation.cultivationToNext <= 0) {
    return undefined;
  }
  const maxLayer = realm?.layers ?? 9;
  if (cultivation.inTribulation || cultivation.layer >= maxLayer) {
    const targetRealmId = realm?.breakthrough?.nextRealmId;
    const targetRealmName = targetRealmId === undefined ? undefined : displayName(content.realms[targetRealmId], targetRealmId);
    return {
      type: "major_realm",
      ...(targetRealmName === undefined ? {} : { targetRealmName }),
      tribulationIncoming: cultivation.inTribulation
    };
  }
  return {
    type: "minor_layer",
    tribulationIncoming: false
  };
}

function buildSpellSlots(
  player: PlayerState,
  loadout: ViewPlayerLoadout | undefined,
  content: ViewContentIndex,
  frame: number
): readonly SpellSlotViewState[] {
  const slots = loadout?.spellSlots ?? [];
  const labels = player.playerId === "p2" ? P2_SPELL_KEYS : P1_SPELL_KEYS;
  return SPELL_SLOT_INDEXES.map((slotIndex) => {
    const spellId = slots[slotIndex] ?? null;
    if (spellId === null) {
      return { slotIndex, keyLabel: labels[slotIndex], state: "empty" };
    }
    const definition = content.spells[spellId];
    const cooldownTotal = definition?.cooldown ?? 0;
    const cooldownRemainingFrames = Math.max(0, (player.cooldowns[spellId] ?? 0) - frame);
    const state = getSpellSlotState(player, definition, cooldownRemainingFrames);
    return {
      slotIndex,
      keyLabel: labels[slotIndex],
      spellId,
      name: displayName(definition, spellId),
      level: loadout?.spellLevels?.[spellId] ?? 1,
      costQi: definition?.costQi ?? 0,
      cooldownTotal: round3(cooldownTotal),
      ...(cooldownRemainingFrames <= 0 ? {} : { cooldownRemaining: framesToSeconds(cooldownRemainingFrames) }),
      state,
      ...(isSpellElement(definition?.element) ? { element: definition.element } : {})
    };
  });
}

function getSpellSlotState(
  player: PlayerState,
  definition: ViewSpellContent | undefined,
  cooldownRemainingFrames: number
): SpellSlotViewState["state"] {
  if (!canUseActiveSlots(player)) {
    return "disabled";
  }
  if (cooldownRemainingFrames > 0) {
    return "cooldown";
  }
  if (definition !== undefined && player.qi < (definition.costQi ?? 0)) {
    return "qi_insufficient";
  }
  return "ready";
}

function buildPillSlots(player: PlayerState, loadout: ViewPlayerLoadout | undefined, content: ViewContentIndex): readonly PillSlotViewState[] {
  const slots = loadout?.pillSlots ?? [];
  const labels = player.playerId === "p2" ? P2_PILL_KEYS : P1_PILL_KEYS;
  return PILL_SLOT_INDEXES.map((slotIndex) => {
    const pillId = slots[slotIndex] ?? null;
    if (pillId === null) {
      return { slotIndex, keyLabel: labels[slotIndex], state: "empty" };
    }
    const definition = content.pills[pillId];
    const digestion = player.digestionSlots.find((candidate) => candidate.pillId === pillId);
    if (digestion !== undefined) {
      return {
        slotIndex,
        keyLabel: labels[slotIndex],
        pillId,
        name: displayName(definition, pillId),
        state: "digesting",
        remainingTime: framesToSeconds(digestion.remainingFrames),
        totalTime: framesToSeconds(digestion.totalFrames)
      };
    }
    return {
      slotIndex,
      keyLabel: labels[slotIndex],
      pillId,
      name: displayName(definition, pillId),
      state: canUseActiveSlots(player) ? "ready" : "disabled"
    };
  });
}

function buildArtifactPanel(loadout: ViewPlayerLoadout | undefined, content: ViewContentIndex): ArtifactPanelViewState {
  return {
    outer: buildArtifactSlot("outer", loadout?.outerArtifact, content),
    inner: buildArtifactSlot("inner", loadout?.innerArtifact, content)
  };
}

function buildArtifactSlot(
  slotType: "outer" | "inner",
  slot: ViewArtifactLoadoutSlot | undefined,
  content: ViewContentIndex
): ArtifactSlotViewState {
  if (slot === undefined || slot.itemId === null) {
    return { slotType, itemId: null, state: "empty" };
  }
  return {
    slotType,
    itemId: slot.itemId,
    name: displayName(content.artifacts[slot.itemId], slot.itemId),
    ...(slot.star === undefined ? {} : { star: slot.star }),
    state: "active"
  };
}

function buildTreasureRack(loadout: ViewPlayerLoadout | undefined, content: ViewContentIndex): SpiritTreasureRackViewState {
  const slots = loadout?.treasureSlots ?? [];
  return {
    slots: TREASURE_SLOT_INDEXES.map((slotIndex) => {
      const slot = slots[slotIndex];
      const source = slot?.source ?? (slotIndex < 2 ? "outer" : "inner");
      if (slot === undefined || slot.itemId === null) {
        return { slotIndex, source, itemId: null, state: "empty" };
      }
      const definition = content.treasures[slot.itemId];
      return {
        slotIndex,
        source,
        itemId: slot.itemId,
        name: displayName(definition, slot.itemId),
        ...(isTreasureRole(definition?.role) ? { role: definition.role } : {}),
        state: "active"
      };
    })
  };
}

function buildSummary(loadout: ViewPlayerLoadout | undefined): BuildSummaryViewState {
  return {
    techniqueTags: loadout?.techniqueTags ?? [],
    talentTags: loadout?.talentTags ?? [],
    constitutionTags: loadout?.constitutionTags ?? [],
    ...(loadout?.synergyText === undefined ? {} : { synergyText: loadout.synergyText })
  };
}

function buildBossView(simState: SimState, content: ViewContentIndex): InRunUiViewState["boss"] {
  const boss = [...simState.bosses].sort((a, b) => a.entityId - b.entityId)[0];
  if (boss === undefined) {
    return undefined;
  }
  const definition = content.bosses[boss.bossId];
  const phases = definition?.phases ?? [];
  const phaseName = phases[boss.phaseIndex]?.id;
  return {
    visible: true,
    bossId: boss.bossId,
    name: displayName(definition, boss.bossId),
    hp: round3(boss.hp),
    maxHp: round3(definition?.hp ?? boss.hp),
    phaseIndex: boss.phaseIndex + 1,
    phaseCount: phases.length,
    ...(phaseName === undefined ? {} : { phaseName })
  };
}

function buildTribulationView(
  simState: SimState,
  content: ViewContentIndex,
  lightningWarnings: readonly ViewLightningWarningInput[]
): TribulationOverlayViewState | undefined {
  const tribulation = [...simState.tribulations].sort((a, b) => a.triggeringPlayerId.localeCompare(b.triggeringPlayerId))[0];
  if (tribulation === undefined) {
    return undefined;
  }
  const definition = content.tribulations[tribulation.id];
  const durationFrames = Math.max(0, (definition?.duration ?? 0) * SIM_FPS);
  const remainingFrames = Math.max(0, tribulation.startFrame + durationFrames - simState.frame);
  const targetRealmId = definition?.trigger?.realmTo;
  const targetRealmName = targetRealmId === undefined ? undefined : displayName(content.realms[targetRealmId], targetRealmId);
  return {
    active: true,
    playerId: tribulation.triggeringPlayerId,
    tribulationName: displayName(definition, tribulation.id),
    phase: mapTribulationPhase(tribulation),
    remainingTime: framesToSeconds(remainingFrames),
    warningText: definition?.overlay?.warningText ?? "天雷不可清除",
    canClearThunder: false,
    ...(targetRealmName === undefined ? {} : { targetRealmName }),
    lightningWarnings: lightningWarnings
      .filter((warning) => warning.tribulationId === tribulation.id)
      .map((warning) => ({
        id: warning.id,
        x: round3(warning.x),
        y: round3(warning.y),
        radius: round3(warning.radius),
        timeToImpact: framesToSeconds(Math.max(0, warning.impactFrame - simState.frame)),
        severity: warning.severity
      }))
  };
}

function buildRescueView(rescueStates: readonly RescueState[]): RescueViewState | undefined {
  const rescue = [...rescueStates].sort((a, b) => a.downedPlayerId.localeCompare(b.downedPlayerId))[0];
  if (rescue === undefined) {
    return undefined;
  }
  const progress = progress01(rescue.progressFrames, rescue.requiredFrames);
  return {
    visible: true,
    downedPlayerId: rescue.downedPlayerId,
    ...(rescue.rescuerPlayerId === undefined ? {} : { rescuerPlayerId: rescue.rescuerPlayerId }),
    canRescue: rescue.rescuerPlayerId !== undefined,
    inRange: rescue.rescuerPlayerId !== undefined,
    progress01: progress,
    hpCostPreviewPercent: 0.35,
    keyLabel: rescue.rescuerPlayerId === "p2" ? "Num0" : "H",
    decayActive: rescue.progressFrames > 0 && rescue.rescuerPlayerId === undefined
  };
}

function buildInsightView(session: InsightSessionState | undefined, content: ViewContentIndex): InsightOverlayViewState | undefined {
  if (session === undefined || session.completed) {
    return undefined;
  }
  return {
    visible: true,
    mode: session.mode,
    sharedFortuneReroll: session.sharedFortuneReroll,
    players: [...session.players]
      .sort((a, b) => a.playerId.localeCompare(b.playerId))
      .map((panel) => ({
        playerId: panel.playerId,
        selected: panel.selectedOptionId !== undefined,
        guardianState: panel.guardianState,
        options: panel.options.map((option, index) => buildInsightOption(option, index, content))
      }))
  };
}

function buildInsightOption(
  option: InsightSessionState["players"][number]["options"][number],
  index: number,
  content: ViewContentIndex
): InsightOptionCardViewState {
  return {
    optionId: option.optionId,
    rewardType: option.reward.type,
    name: rewardName(option.reward.type, option.reward.targetId, content),
    rarity: option.reward.rarity,
    shortDescription: rewardDescription(option.reward.type),
    buildSynergyTags: [],
    keyLabel: insightKey(option.playerId, index)
  };
}

function buildStageProgress(
  simState: SimState,
  content: ViewContentIndex,
  input: ViewStageProgressInput | undefined
): StageProgressViewState {
  const stageId = input?.stageId ?? simState.stageId;
  const stage = content.stages[stageId];
  const segmentIndexZeroBased = input?.segmentIndex ?? 0;
  const segment = input?.segmentId === undefined ? stage?.segments?.[segmentIndexZeroBased] : stage?.segments?.find((candidate) => candidate.id === input.segmentId);
  const segmentCount = input?.segmentCount ?? stage?.segments?.length ?? 1;
  const timeRemaining =
    input?.segmentEndFrame === undefined ? undefined : framesToSeconds(Math.max(0, input.segmentEndFrame - simState.frame));
  const base = {
    stageName: displayName(stage, stageId),
    segmentName: displayName(segment, input?.segmentId ?? segment?.id ?? "segment_01"),
    segmentIndex: segmentIndexZeroBased + 1,
    segmentCount,
    intensity: input?.intensity ?? inferStageIntensity(segmentIndexZeroBased + 1, segmentCount)
  } satisfies Omit<StageProgressViewState, "timeRemaining" | "nextEventText">;

  return {
    ...base,
    ...(timeRemaining === undefined ? {} : { timeRemaining }),
    ...(input?.nextEventText === undefined ? {} : { nextEventText: input.nextEventText })
  };
}

function chooseMode(options: {
  readonly insight: InsightOverlayViewState | undefined;
  readonly tribulation: TribulationOverlayViewState | undefined;
  readonly rescue: RescueViewState | undefined;
  readonly boss: InRunUiViewState["boss"] | undefined;
}): UiMode {
  if (options.insight !== undefined) {
    return "insight_paused";
  }
  if (options.tribulation !== undefined) {
    return "combat_tribulation";
  }
  if (options.rescue !== undefined) {
    return "rescue_focus";
  }
  if (options.boss !== undefined) {
    return "combat_boss";
  }
  return "combat";
}

function mapTribulationPhase(tribulation: TribulationState): TribulationOverlayViewState["phase"] {
  switch (tribulation.phase) {
    case "incoming":
    case "active":
    case "final_strike":
    case "success":
    case "failed":
      return tribulation.phase;
    case "warning":
      return "incoming";
    default:
      return "active";
  }
}

function rewardName(
  type: InsightOptionCardViewState["rewardType"],
  targetId: string,
  content: ViewContentIndex
): string {
  switch (type) {
    case "spell_new":
    case "spell_upgrade":
      return displayName(content.spells[targetId], targetId);
    case "pill":
      return displayName(content.pills[targetId], targetId);
    case "spirit_treasure":
      return displayName(content.treasures[targetId], targetId);
    case "natal_artifact_inner":
      return displayName(content.artifacts[targetId], targetId);
    case "cultivation_boost":
      return "修为助益";
    case "technique":
      return "功法";
    case "talent":
      return "天赋";
    case "constitution":
      return "体质";
    case "heavenly_material":
      return "天材地宝";
    default:
      return targetId;
  }
}

function rewardDescription(type: InsightOptionCardViewState["rewardType"]): string {
  switch (type) {
    case "cultivation_boost":
      return "增加个人修为，不改变团队灵气经验";
    case "spell_new":
    case "spell_upgrade":
      return "调整法术构筑";
    case "pill":
      return "获得可炼化丹药";
    default:
      return "顿悟奖励";
  }
}

function insightKey(playerId: PlayerId, index: number): string {
  const labels = playerId === "p2" ? P2_INSIGHT_KEYS : P1_INSIGHT_KEYS;
  return labels[index] ?? String(index + 1);
}

function inferStageIntensity(segmentIndex: number, segmentCount: number): StageProgressViewState["intensity"] {
  if (segmentIndex >= segmentCount) {
    return "boss";
  }
  if (segmentIndex >= 4) {
    return "high";
  }
  if (segmentIndex >= 2) {
    return "medium";
  }
  return "low";
}

function canUseActiveSlots(player: PlayerState): boolean {
  return player.aliveState === "body" || player.aliveState === "yang_shen";
}

function progress01(value: number, total: number): number {
  if (total <= 0) {
    return value > 0 ? 1 : 0;
  }
  return round3(Math.min(1, Math.max(0, value / total)));
}

function framesToSeconds(frames: number): number {
  return round3(frames / SIM_FPS);
}

function round3(value: number): number {
  return Math.round(value * 1_000) / 1_000;
}

function displayName(entry: { readonly name?: NameValue } | undefined, fallback: string): string {
  if (entry === undefined || entry.name === undefined) {
    return fallback;
  }
  if (typeof entry.name === "string") {
    return entry.name;
  }
  return entry.name.zhCN ?? entry.name.en ?? fallback;
}

function isSpellElement(value: string | undefined): value is NonNullable<SpellSlotViewState["element"]> {
  return (
    value === "metal" ||
    value === "wood" ||
    value === "water" ||
    value === "fire" ||
    value === "earth" ||
    value === "thunder" ||
    value === "void"
  );
}

function isTreasureRole(value: string | undefined): value is NonNullable<SpiritTreasureSlotViewState["role"]> {
  return value === "offense" || value === "defense" || value === "utility" || value === "coop";
}

function indexById<T extends { readonly id: string }>(items: readonly T[]): Readonly<Record<string, T>> {
  const indexed: Record<string, T> = {};
  for (const item of items) {
    indexed[item.id] = item;
  }
  return indexed;
}

function deepFreeze<T>(value: T): T {
  if (value === null || typeof value !== "object" || Object.isFrozen(value)) {
    return value;
  }
  for (const key of Object.keys(value as Record<string, unknown>)) {
    deepFreeze((value as Record<string, unknown>)[key]);
  }
  return Object.freeze(value);
}

export type {
  InRunUiViewState,
  InsightOverlayViewState,
  LightningWarningViewState,
  RescueViewState,
  StageProgressViewState,
  TeamInsightBarViewState,
  TribulationOverlayViewState
} from "./InRunViewState";
