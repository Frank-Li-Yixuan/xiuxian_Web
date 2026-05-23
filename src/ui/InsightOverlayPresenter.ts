import type {
  InsightOptionCardViewState,
  InsightOverlayViewState,
  InRunUiViewState
} from "../view/InRunViewState";

export interface InsightOverlayPresentation {
  readonly visible: boolean;
  readonly mode: InsightOverlayViewState["mode"];
  readonly title: "顿悟";
  readonly sharedFortune: {
    readonly rerollCount: number;
    readonly label: string;
    readonly hint: string;
  };
  readonly panels: readonly InsightPlayerPresentation[];
  readonly decisionsReadOnly: true;
}

export interface InsightPlayerPresentation {
  readonly playerId: string;
  readonly title: string;
  readonly selected: boolean;
  readonly guardianState: boolean;
  readonly statusText: string;
  readonly options: readonly InsightOptionPresentation[];
}

export interface InsightOptionPresentation {
  readonly optionId: string;
  readonly keyLabel: string;
  readonly rewardType: InsightOptionCardViewState["rewardType"];
  readonly rewardTypeLabel: string;
  readonly name: string;
  readonly rarity: InsightOptionCardViewState["rarity"];
  readonly shortDescription: string;
  readonly synergyTags: readonly string[];
  readonly disabled: boolean;
  readonly note?: string;
}

const REWARD_TYPE_LABELS: Record<InsightOptionCardViewState["rewardType"], string> = {
  spell_new: "新法术",
  spell_upgrade: "法术升级",
  technique: "功法",
  talent: "天赋",
  constitution: "体质",
  spirit_treasure: "灵宝",
  natal_artifact_inner: "本命法宝",
  pill: "丹药",
  cultivation_boost: "修为助益",
  heavenly_material: "天材地宝"
};

export function buildInsightOverlayPresentation(input: InRunUiViewState | InsightOverlayViewState | undefined): InsightOverlayPresentation {
  const insight = extractInsight(input);

  if (!insight?.visible) {
    return deepFreeze({
      visible: false,
      mode: "single",
      title: "顿悟",
      sharedFortune: buildSharedFortune(0),
      panels: [],
      decisionsReadOnly: true
    });
  }

  return deepFreeze({
    visible: true,
    mode: insight.mode,
    title: "顿悟",
    sharedFortune: buildSharedFortune(insight.sharedFortuneReroll),
    panels: insight.players.map((panel) => ({
      playerId: panel.playerId,
      title: `${panel.playerId.toUpperCase()} 顿悟`,
      selected: panel.selected,
      guardianState: panel.guardianState,
      statusText: buildPanelStatus(panel.selected, panel.guardianState),
      options: panel.options.map(buildOption)
    })),
    decisionsReadOnly: true
  });
}

function extractInsight(input: InRunUiViewState | InsightOverlayViewState | undefined): InsightOverlayViewState | undefined {
  if (!input) {
    return undefined;
  }
  return "screen" in input ? input.insight : input;
}

function buildSharedFortune(rerollCount: number): InsightOverlayPresentation["sharedFortune"] {
  return {
    rerollCount,
    label: `公共气运：${rerollCount}`,
    hint: "重Roll 消耗团队气运"
  };
}

function buildPanelStatus(selected: boolean, guardianState: boolean): string {
  if (guardianState) {
    return "已悟出大道，正在为道友护法……";
  }
  return selected ? "已选择" : "等待选择";
}

function buildOption(option: InsightOptionCardViewState): InsightOptionPresentation {
  return {
    optionId: option.optionId,
    keyLabel: option.keyLabel,
    rewardType: option.rewardType,
    rewardTypeLabel: REWARD_TYPE_LABELS[option.rewardType],
    name: option.name,
    rarity: option.rarity,
    shortDescription: option.shortDescription,
    synergyTags: [...option.buildSynergyTags],
    disabled: option.disabled ?? false,
    ...(option.rewardType === "cultivation_boost" ? { note: "不会触发顿悟等级变化" } : {})
  };
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
