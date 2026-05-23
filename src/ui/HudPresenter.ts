import type {
  ArtifactSlotViewState,
  BossHudViewState,
  CultivationBarViewState,
  InRunUiViewState,
  PillSlotViewState,
  PlayerHudViewState,
  Rect,
  SpellSlotViewState,
  SpiritTreasureSlotViewState
} from "../view/InRunViewState";

export type HudRegion = "left" | "center" | "right" | "top" | "bottom" | "overlay";
export type HudSemantic =
  | "player_core"
  | "qi"
  | "team_insight"
  | "spell_bar"
  | "cultivation"
  | "pill_digestion"
  | "artifact_treasure"
  | "stage"
  | "boss"
  | "rescue"
  | "tribulation"
  | "prompt";
export type HudColorToken =
  | "player1"
  | "player2"
  | "hp"
  | "qi"
  | "teamInsight"
  | "cultivation"
  | "pill"
  | "artifact"
  | "boss"
  | "neutral"
  | "warning"
  | "danger";
export type HudRowState = "normal" | "ready" | "warning" | "danger" | "disabled";

export interface HudLayout {
  readonly leftDaoPanel: Rect;
  readonly combatPanel: Rect;
  readonly rightExternalPanel: Rect;
  readonly topCenterBand: Rect;
  readonly bottomPromptBand: Rect;
}

export interface HudRow {
  readonly label: string;
  readonly value: string;
  readonly progress01?: number;
  readonly state?: HudRowState;
}

export interface HudSection {
  readonly id: string;
  readonly region: HudRegion;
  readonly title: string;
  readonly semantic: HudSemantic;
  readonly colorToken: HudColorToken;
  readonly rows: readonly HudRow[];
}

export interface HudSpellBarPresentation {
  readonly playerId: string;
  readonly region: "left" | "right";
  readonly slots: readonly HudSpellSlotPresentation[];
}

export interface HudSpellSlotPresentation {
  readonly slotIndex: number;
  readonly keyLabel: string;
  readonly label: string;
  readonly state: SpellSlotViewState["state"];
  readonly detail: string;
  readonly progress01?: number;
  readonly element?: SpellSlotViewState["element"];
}

export interface HudPillBarPresentation {
  readonly playerId: string;
  readonly region: "left" | "right";
  readonly slots: readonly HudPillSlotPresentation[];
}

export interface HudPillSlotPresentation {
  readonly slotIndex: number;
  readonly keyLabel: string;
  readonly label: string;
  readonly state: PillSlotViewState["state"];
  readonly detail: string;
  readonly digesting?: {
    readonly remainingTime: number;
    readonly totalTime: number;
    readonly progress01: number;
  };
}

export interface HudArtifactRackPresentation {
  readonly playerId: string;
  readonly region: "left" | "right";
  readonly outer: string;
  readonly inner: string;
  readonly treasures: readonly string[];
}

export interface HudStagePresentation {
  readonly stageName: string;
  readonly segmentText: string;
  readonly timeRemainingText?: string;
  readonly nextEventText?: string;
  readonly intensity: InRunUiViewState["stage"]["intensity"];
}

export interface HudBossPresentation {
  readonly visible: boolean;
  readonly name: string;
  readonly hpText: string;
  readonly phaseText: string;
  readonly warningText?: string;
}

export interface HudAlertPresentation {
  readonly semantic: "rescue" | "tribulation" | "prompt";
  readonly text: string;
  readonly priority: "P0" | "P1" | "P2" | "P3" | "P4";
}

export interface HudPresentation {
  readonly mode: InRunUiViewState["mode"];
  readonly layout: HudLayout;
  readonly sections: readonly HudSection[];
  readonly spellBars: readonly HudSpellBarPresentation[];
  readonly pillBars: readonly HudPillBarPresentation[];
  readonly artifactRacks: readonly HudArtifactRackPresentation[];
  readonly stage: HudStagePresentation;
  readonly boss?: HudBossPresentation;
  readonly alerts: readonly HudAlertPresentation[];
}

export function buildHudPresentation(viewState: InRunUiViewState): HudPresentation {
  const layout = buildLayout(viewState.screen.safeArea);
  const spellBars = viewState.players.map((player, index) => buildSpellBar(player, regionForPlayer(index)));
  const pillBars = viewState.players.map((player, index) => buildPillBar(player, regionForPlayer(index)));
  const artifactRacks = viewState.players.map((player, index) => buildArtifactRack(player, regionForPlayer(index)));
  const sections = [
    buildTeamInsightSection(viewState),
    buildStageSection(viewState),
    ...viewState.players.flatMap((player, index) => buildPlayerSections(player, regionForPlayer(index)))
  ];
  const boss = viewState.boss?.visible ? buildBossPresentation(viewState.boss) : undefined;
  const presentation: HudPresentation = {
    mode: viewState.mode,
    layout,
    sections,
    spellBars,
    pillBars,
    artifactRacks,
    stage: buildStagePresentation(viewState),
    ...(boss ? { boss } : {}),
    alerts: buildAlerts(viewState)
  };

  return deepFreeze(presentation);
}

function buildLayout(safeArea: Rect): HudLayout {
  const leftWidth = clamp(Math.round(safeArea.width * 0.1875), 320, 360);
  const combatWidth = clamp(Math.round(safeArea.width * 0.5625), 1000, 1120);
  const rightX = safeArea.x + leftWidth + combatWidth;
  const rightWidth = Math.max(320, safeArea.x + safeArea.width - rightX);
  const topWidth = clamp(Math.round(safeArea.width * 0.416667), 640, 800);
  const bottomWidth = clamp(Math.round(safeArea.width * 0.4375), 700, 840);

  return {
    leftDaoPanel: { x: safeArea.x, y: safeArea.y, width: leftWidth, height: safeArea.height },
    combatPanel: { x: safeArea.x + leftWidth, y: safeArea.y, width: combatWidth, height: safeArea.height },
    rightExternalPanel: { x: rightX, y: safeArea.y, width: rightWidth, height: safeArea.height },
    topCenterBand: { x: safeArea.x + Math.round((safeArea.width - topWidth) / 2), y: safeArea.y + 20, width: topWidth, height: 96 },
    bottomPromptBand: {
      x: safeArea.x + leftWidth + Math.round((combatWidth - bottomWidth) / 2) + 20,
      y: safeArea.y + Math.max(0, safeArea.height - 150),
      width: bottomWidth,
      height: 64
    }
  };
}

function buildTeamInsightSection(viewState: InRunUiViewState): HudSection {
  const insight = viewState.teamInsight;
  const triggerText = insight.isReadyToInsight ? "灵气将满：即将顿悟" : insight.nextTriggerText;

  return {
    id: "team_insight",
    region: "top",
    title: "团队灵气",
    semantic: "team_insight",
    colorToken: "teamInsight",
    rows: [
      { label: "灵气经验", value: `${insight.exp} / ${insight.expToNext}`, progress01: clamp01(insight.progress01) },
      { label: "触发", value: triggerText, state: insight.isReadyToInsight ? "ready" : "normal" },
      { label: "公共气运", value: String(insight.sharedFortuneReroll) }
    ]
  };
}

function buildStageSection(viewState: InRunUiViewState): HudSection {
  return {
    id: "stage_progress",
    region: "top",
    title: "阶段",
    semantic: "stage",
    colorToken: "neutral",
    rows: [
      { label: "关卡", value: viewState.stage.stageName },
      { label: "小段", value: `${viewState.stage.segmentName} ${viewState.stage.segmentIndex} / ${viewState.stage.segmentCount}` },
      ...(viewState.stage.nextEventText ? [{ label: "下一事件", value: viewState.stage.nextEventText } satisfies HudRow] : [])
    ]
  };
}

function buildPlayerSections(player: PlayerHudViewState, region: "left" | "right"): readonly HudSection[] {
  return [
    {
      id: `core_${player.playerId}`,
      region,
      title: `${player.core.displayName} 核心`,
      semantic: "player_core",
      colorToken: player.core.colorToken,
      rows: [
        { label: "生命/精", value: `${player.core.hp} / ${player.core.maxHp}`, progress01: ratio(player.core.hp, player.core.maxHp), state: player.core.lowHp ? "warning" : "normal" },
        { label: "存续", value: player.core.aliveState, state: player.core.aliveState === "body" ? "normal" : "warning" },
        { label: "境界", value: `${player.core.realmName}${formatLayer(player.core.realmLayer)}层` }
      ]
    },
    {
      id: `qi_${player.playerId}`,
      region,
      title: `${player.core.displayName} 真元`,
      semantic: "qi",
      colorToken: "qi",
      rows: [
        {
          label: "真元/气",
          value: `${player.core.qi} / ${player.core.maxQi}`,
          progress01: ratio(player.core.qi, player.core.maxQi),
          state: ratio(player.core.qi, player.core.maxQi) <= 0.35 ? "warning" : "normal"
        }
      ]
    },
    {
      id: `spell_bar_${player.playerId}`,
      region,
      title: `${player.core.displayName} 法术`,
      semantic: "spell_bar",
      colorToken: "qi",
      rows: player.spells.map(buildSpellRow)
    },
    {
      id: `cultivation_${player.playerId}`,
      region,
      title: `${player.core.displayName} 修为`,
      semantic: "cultivation",
      colorToken: "cultivation",
      rows: buildCultivationRows(player.cultivation)
    },
    {
      id: `pill_bar_${player.playerId}`,
      region,
      title: `${player.core.displayName} 丹药`,
      semantic: "pill_digestion",
      colorToken: "pill",
      rows: player.pills.map(buildPillRow)
    },
    {
      id: `artifact_rack_${player.playerId}`,
      region,
      title: `${player.core.displayName} 法宝灵宝`,
      semantic: "artifact_treasure",
      colorToken: "artifact",
      rows: [
        { label: "外带", value: formatArtifact(player.artifacts.outer) },
        { label: "局内", value: formatArtifact(player.artifacts.inner) },
        { label: "灵宝", value: player.treasures.slots.map(formatTreasure).join(" / ") || "空" }
      ]
    }
  ];
}

function buildSpellRow(slot: SpellSlotViewState): HudRow {
  return {
    label: slot.keyLabel,
    value: spellLabel(slot),
    ...(slot.state === "cooldown" ? { progress01: cooldownProgress(slot) } : {}),
    state: slotStateToHudState(slot.state)
  };
}

function buildPillRow(slot: PillSlotViewState): HudRow {
  return {
    label: slot.keyLabel,
    value: pillLabel(slot),
    ...(slot.state === "digesting" ? { progress01: digestionProgress(slot) } : {}),
    state: pillStateToHudState(slot.state)
  };
}

function buildCultivationRows(cultivation: CultivationBarViewState): readonly HudRow[] {
  const rows: HudRow[] = [
    { label: "境界", value: `${cultivation.realmName}${formatLayer(cultivation.layer)}层` },
    {
      label: "修为",
      value: `${cultivation.cultivation} / ${cultivation.cultivationToNext}`,
      progress01: clamp01(cultivation.progress01),
      state: cultivation.bottleneck ? "warning" : "normal"
    },
    { label: "周天", value: `+${formatNumber(cultivation.regenPerSecond)}/s` }
  ];

  if (cultivation.bottleneck) {
    rows.push({ label: "瓶颈", value: formatBottleneck(cultivation), state: cultivation.bottleneck.tribulationIncoming ? "danger" : "warning" });
  }

  return rows;
}

function buildSpellBar(player: PlayerHudViewState, region: "left" | "right"): HudSpellBarPresentation {
  return {
    playerId: player.playerId,
    region,
    slots: player.spells.map((slot) => ({
      slotIndex: slot.slotIndex,
      keyLabel: slot.keyLabel,
      label: spellLabel(slot),
      state: slot.state,
      detail: spellDetail(slot),
      ...(slot.state === "cooldown" ? { progress01: cooldownProgress(slot) } : {}),
      ...(slot.element ? { element: slot.element } : {})
    }))
  };
}

function buildPillBar(player: PlayerHudViewState, region: "left" | "right"): HudPillBarPresentation {
  return {
    playerId: player.playerId,
    region,
    slots: player.pills.map((slot) => ({
      slotIndex: slot.slotIndex,
      keyLabel: slot.keyLabel,
      label: pillLabel(slot),
      state: slot.state,
      detail: pillDetail(slot),
      ...(slot.state === "digesting" && slot.remainingTime !== undefined && slot.totalTime !== undefined
        ? {
            digesting: {
              remainingTime: slot.remainingTime,
              totalTime: slot.totalTime,
              progress01: digestionProgress(slot)
            }
          }
        : {})
    }))
  };
}

function buildArtifactRack(player: PlayerHudViewState, region: "left" | "right"): HudArtifactRackPresentation {
  return {
    playerId: player.playerId,
    region,
    outer: formatArtifact(player.artifacts.outer),
    inner: formatArtifact(player.artifacts.inner),
    treasures: player.treasures.slots.map(formatTreasure)
  };
}

function buildStagePresentation(viewState: InRunUiViewState): HudStagePresentation {
  return {
    stageName: viewState.stage.stageName,
    segmentText: `${viewState.stage.segmentName} ${viewState.stage.segmentIndex} / ${viewState.stage.segmentCount}`,
    ...(viewState.stage.timeRemaining !== undefined ? { timeRemainingText: formatSeconds(viewState.stage.timeRemaining) } : {}),
    ...(viewState.stage.nextEventText ? { nextEventText: viewState.stage.nextEventText } : {}),
    intensity: viewState.stage.intensity
  };
}

function buildBossPresentation(boss: BossHudViewState): HudBossPresentation {
  return {
    visible: boss.visible,
    name: boss.name ?? boss.bossId ?? "Boss",
    hpText: boss.hp !== undefined && boss.maxHp !== undefined ? `${boss.hp} / ${boss.maxHp}` : "未知",
    phaseText: formatBossPhase(boss),
    ...(boss.currentWarning ? { warningText: boss.currentWarning.text } : {})
  };
}

function buildAlerts(viewState: InRunUiViewState): readonly HudAlertPresentation[] {
  const alerts: HudAlertPresentation[] = [];

  if (viewState.tribulation?.active) {
    alerts.push({
      semantic: "tribulation",
      text: `${viewState.tribulation.tribulationName} ${formatSeconds(viewState.tribulation.remainingTime)}`,
      priority: "P0"
    });
  }

  if (viewState.rescue?.visible) {
    alerts.push({
      semantic: "rescue",
      text: `${viewState.rescue.downedPlayerId.toUpperCase()} 可救援：${viewState.rescue.keyLabel}`,
      priority: "P1"
    });
  }

  for (const prompt of viewState.prompts) {
    alerts.push({
      semantic: "prompt",
      text: prompt.subText ? `${prompt.mainText}：${prompt.subText}` : prompt.mainText,
      priority: prompt.priority
    });
  }

  return alerts;
}

function spellLabel(slot: SpellSlotViewState): string {
  if (slot.state === "empty") {
    return "局内可顿悟获得";
  }
  if (!slot.name) {
    return "未命名法术";
  }
  return slot.level !== undefined ? `${slot.name} Lv.${slot.level}` : slot.name;
}

function spellDetail(slot: SpellSlotViewState): string {
  if (slot.state === "empty") {
    return "空槽";
  }
  if (slot.state === "cooldown") {
    return `CD ${formatSeconds(slot.cooldownRemaining ?? 0)} / 真元 ${slot.costQi ?? 0}`;
  }
  if (slot.state === "qi_insufficient") {
    return `真元不足 / 需要 ${slot.costQi ?? 0}`;
  }
  if (slot.state === "ready") {
    return `Ready / 真元 ${slot.costQi ?? 0}`;
  }
  if (slot.state === "casting") {
    return "施放中";
  }
  return "不可用";
}

function pillLabel(slot: PillSlotViewState): string {
  if (slot.state === "empty") {
    return "空鼎";
  }
  return slot.name ?? "未命名丹药";
}

function pillDetail(slot: PillSlotViewState): string {
  if (slot.state === "empty") {
    return "空";
  }
  if (slot.state === "digesting") {
    return `炼化中 ${formatSeconds(slot.remainingTime ?? 0)} / ${formatSeconds(slot.totalTime ?? 0)}`;
  }
  if (slot.state === "side_effect") {
    return slot.effectSummary ?? "后遗症";
  }
  if (slot.state === "ready") {
    return slot.effectSummary ?? "Ready";
  }
  return "不可用";
}

function formatBottleneck(cultivation: CultivationBarViewState): string {
  if (!cultivation.bottleneck) {
    return "无";
  }
  if (cultivation.bottleneck.tribulationIncoming) {
    return cultivation.bottleneck.countdown !== undefined
      ? `天道感应：${formatSeconds(cultivation.bottleneck.countdown)}后渡劫`
      : "天道感应：准备渡劫";
  }
  if (cultivation.bottleneck.type === "major_realm") {
    return `境界瓶颈：${cultivation.realmName}${formatLayer(cultivation.layer)}层 → ${cultivation.bottleneck.targetRealmName ?? "下一境界"}`;
  }
  return "周天圆满：准备突破";
}

function formatBossPhase(boss: BossHudViewState): string {
  if (boss.phaseIndex !== undefined && boss.phaseCount !== undefined) {
    return boss.phaseName ? `${boss.phaseIndex} / ${boss.phaseCount} ${boss.phaseName}` : `${boss.phaseIndex} / ${boss.phaseCount}`;
  }
  return boss.phaseName ?? "阶段未知";
}

function formatArtifact(slot: ArtifactSlotViewState | undefined): string {
  if (!slot?.itemId && !slot?.name) {
    return "空";
  }
  const name = slot.name ?? slot.itemId ?? "空";
  return slot.star !== undefined && slot.star > 0 ? `${name} ${"★".repeat(slot.star)}` : name;
}

function formatTreasure(slot: SpiritTreasureSlotViewState): string {
  return slot.itemId || slot.name ? slot.name ?? slot.itemId ?? "空" : "空";
}

function cooldownProgress(slot: SpellSlotViewState): number {
  return ratio(slot.cooldownRemaining ?? 0, slot.cooldownTotal ?? 0);
}

function digestionProgress(slot: PillSlotViewState): number {
  const total = slot.totalTime ?? 0;
  const remaining = slot.remainingTime ?? 0;
  return total > 0 ? clamp01(round3(1 - remaining / total)) : 0;
}

function slotStateToHudState(state: SpellSlotViewState["state"]): HudRowState {
  if (state === "ready" || state === "casting") {
    return "ready";
  }
  if (state === "cooldown" || state === "qi_insufficient") {
    return "warning";
  }
  return state === "empty" ? "disabled" : "danger";
}

function pillStateToHudState(state: PillSlotViewState["state"]): HudRowState {
  if (state === "ready") {
    return "ready";
  }
  if (state === "digesting") {
    return "warning";
  }
  return state === "empty" ? "disabled" : "danger";
}

function regionForPlayer(index: number): "left" | "right" {
  return index === 0 ? "left" : "right";
}

function ratio(value: number, max: number): number {
  return max > 0 ? clamp01(round3(value / max)) : 0;
}

function clamp01(value: number): number {
  return clamp(value, 0, 1);
}

function clamp(value: number, min: number, max: number): number {
  return Math.min(max, Math.max(min, value));
}

function formatSeconds(value: number): string {
  const rounded = Math.round(value * 10) / 10;
  return Number.isInteger(rounded) ? `${rounded}s` : `${rounded.toFixed(1)}s`;
}

function formatNumber(value: number): string {
  const rounded = Math.round(value * 10) / 10;
  return Number.isInteger(rounded) ? String(rounded) : rounded.toFixed(1);
}

function formatLayer(layer: number): string {
  const labels = ["零", "一", "二", "三", "四", "五", "六", "七", "八", "九", "十"];
  return labels[layer] ?? String(layer);
}

function round3(value: number): number {
  return Math.round(value * 1000) / 1000;
}

function deepFreeze<T>(value: T): T {
  if (value && typeof value === "object" && !Object.isFrozen(value)) {
    Object.freeze(value);
    for (const child of Object.values(value as Record<string, unknown>)) {
      deepFreeze(child);
    }
  }
  return value;
}
