import type {
  AptitudeStats,
  CharacterCreationDraft,
  CharacterCreationLockKey,
  CharacterCreationLocks,
  CoreThreeTreasures,
  DestinyTraitState
} from "../../character/CharacterCreationTypes";
import {
  CHARACTER_CREATION_V02_MUTATION_EXPLANATION,
  createCharacterCreationV02Projection,
  type CarriedItemLifecycleSummary,
  type DestinyEvaluationResult,
  type LifeStageInitialState,
  type LifeStorylineInitialScores,
  type OriginNarrativeChainSummary
} from "../../character/CharacterCreationV02Adapter";
import { loadDestinyRegistry } from "../../characterCreation/destiny/DestinyRegistry";
import { loadDestinyV2Registry } from "../../destinyV2/DestinyV2Registry";
import type { ElementId, SpiritualRootCategoryId } from "../../types/opening-generator-types.v0.1";

type CharacterCreationModeProjectionBucketId = "outerBattlefield" | "horde" | "deckbuilder" | "autochess";

export interface CharacterCreationModeProjectionViewModel {
  readonly bucket: CharacterCreationModeProjectionBucketId;
  readonly label: string;
  readonly tags: readonly string[];
}

export interface CharacterCreationLifeHookViewModel {
  readonly destinyId: string;
  readonly phase: string;
  readonly phaseRule: string;
  readonly hook: string;
  readonly visible: string;
}

export interface CharacterCreationDestinySynergyViewModel {
  readonly id: string;
  readonly name: string;
  readonly traits: readonly string[];
  readonly description: string;
  readonly effects: readonly string[];
}

export type CharacterCreationDetailTab = "stats" | "root" | "destiny" | "origin" | "items";
export type CharacterCreationDestinyCardSlot = "main" | "secondary0" | "secondary1" | "flaw";
export type CharacterCreationCoreTreasureId = keyof CoreThreeTreasures;
export type CharacterCreationAptitudeId = keyof AptitudeStats;
export type CharacterCreationRootMetricId = "purity" | "stability" | "conflict" | "breadth";

export interface CharacterCreationNumericRow<TId extends string = string> {
  readonly id: TId;
  readonly label: string;
  readonly value: number;
  readonly description: string;
}

export interface CharacterCreationRootElementViewModel {
  readonly id: string;
  readonly label: string;
  readonly percentage: number;
  readonly primary: boolean;
  readonly secondary: boolean;
  readonly latent: boolean;
}

export interface CharacterCreationSpiritualRootViewModel {
  readonly categoryId: SpiritualRootCategoryId;
  readonly categoryLabel: string;
  readonly displayName: string;
  readonly elements: readonly CharacterCreationRootElementViewModel[];
  readonly primaryElement?: string;
  readonly secondaryElements: readonly string[];
  readonly latentRoot?: string;
  readonly metrics: Readonly<Record<CharacterCreationRootMetricId, number>>;
  readonly metricRows: readonly CharacterCreationNumericRow<CharacterCreationRootMetricId>[];
  readonly relationTags: readonly string[];
  readonly tags: readonly string[];
}

export interface CharacterCreationOriginFateViewModel {
  readonly backgroundName: string;
  readonly backgroundDescription: string;
  readonly backgroundTags: readonly string[];
  readonly omen: {
    readonly levelLabel: string;
    readonly hints: readonly string[];
    readonly riskHint: string;
    readonly relatedTags: readonly string[];
  };
  readonly carriedItems: readonly {
    readonly itemId: string;
    readonly name: string;
    readonly visibleDescription: string;
    readonly conversionLabel: string;
    readonly outerBattlefieldEffect: string;
    readonly dongfuHook: string;
    readonly tags: readonly string[];
  }[];
}

export interface CharacterCreationSelectionState {
  readonly selectedSlot: CharacterCreationDestinyCardSlot;
  readonly activeTab: CharacterCreationDetailTab;
}

export interface CharacterCreationDestinyCardViewModel {
  readonly slot: CharacterCreationDestinyCardSlot;
  readonly slotLabel: string;
  readonly lockKey: CharacterCreationLockKey;
  readonly traitId: string;
  readonly name: string;
  readonly rarity: string;
  readonly qualityLabel: string;
  readonly description: string;
  readonly tags: readonly string[];
  readonly positiveEffects: readonly string[];
  readonly negativeEffects: readonly string[];
  readonly fateAlignment?: DestinyTraitState["fateAlignment"];
  readonly fateAlignmentLabel: string;
  readonly fateAlignmentReasonTags: readonly string[];
  readonly mutationExplanation?: string;
  readonly locked: boolean;
  readonly synergyWarnings: readonly string[];
  readonly conflictWarnings: readonly string[];
  readonly synergies: readonly CharacterCreationDestinySynergyViewModel[];
  readonly lifeImpactHooks: readonly CharacterCreationLifeHookViewModel[];
  readonly modeProjectionBuckets: readonly CharacterCreationModeProjectionViewModel[];
}

export interface CharacterCreationLockTargetViewModel {
  readonly key: CharacterCreationLockKey;
  readonly label: string;
  readonly locked: boolean;
  readonly canToggle: boolean;
  readonly canAdd: boolean;
  readonly buttonLabel: string;
  readonly state: "locked" | "unlocked";
  readonly disabledReason?: string;
}

export interface CharacterCreationActionViewModel {
  readonly label: string;
  readonly disabled: boolean;
  readonly warning?: string;
}

export interface CharacterCreationV02ViewModel {
  readonly ninePalace: {
    readonly attributes: Readonly<Record<string, number>>;
    readonly derivedScores: Readonly<Record<string, number>>;
    readonly threePowers: Readonly<Record<string, number>>;
    readonly wuxing: Readonly<Record<string, number>>;
    readonly biasTags: readonly string[];
  };
  readonly destinyEvaluationResults: readonly DestinyEvaluationResult[];
  readonly originNarrativeSummary: OriginNarrativeChainSummary;
  readonly carriedItemLifecycleSummary: CarriedItemLifecycleSummary;
  readonly lifeStorylineInitialScores: LifeStorylineInitialScores;
  readonly lifeStageInitialState: LifeStageInitialState;
}

export interface CharacterCreationViewModel {
  readonly coreTreasureRows: readonly CharacterCreationNumericRow<CharacterCreationCoreTreasureId>[];
  readonly aptitudeRows: readonly CharacterCreationNumericRow<CharacterCreationAptitudeId>[];
  readonly spiritualRoot: CharacterCreationSpiritualRootViewModel;
  readonly originFate: CharacterCreationOriginFateViewModel;
  readonly destinyCards: readonly CharacterCreationDestinyCardViewModel[];
  readonly v02: CharacterCreationV02ViewModel;
  readonly selectedLockKey?: CharacterCreationLockKey;
  readonly selectedLock?: CharacterCreationLockTargetViewModel;
  readonly lockTargets: readonly CharacterCreationLockTargetViewModel[];
  readonly actions: {
    readonly reroll: CharacterCreationActionViewModel;
    readonly lock: CharacterCreationActionViewModel;
    readonly divination: CharacterCreationActionViewModel;
    readonly confirm: CharacterCreationActionViewModel;
  };
  readonly lockBudget: {
    readonly activeLocks: readonly CharacterCreationLockKey[];
    readonly locksRemaining: number;
    readonly maxLocks: number;
  };
  readonly fateMeter: {
    readonly value: number;
    readonly boostThreshold: number;
    readonly guaranteeThreshold: number;
    readonly guaranteeRareNext: boolean;
  };
  readonly rerollCount: number;
  readonly divinationTokens: number;
  readonly canUseDivination: boolean;
  readonly synergyWarnings: readonly string[];
  readonly conflictWarnings: readonly string[];
  readonly warnings: readonly string[];
}

const DESTINY_CARD_CONFIG = [
  { slot: "main", slotLabel: "主天命", lockKey: "mainDestiny" },
  { slot: "secondary0", slotLabel: "副天命 1", lockKey: "secondaryDestiny0" },
  { slot: "secondary1", slotLabel: "副天命 2", lockKey: "secondaryDestiny1" },
  { slot: "flaw", slotLabel: "劫命", lockKey: "flawDestiny" }
] as const;
const DESTINY_REROLL_RULES = loadDestinyRegistry().rerollRules;
const DESTINY_V2_REGISTRY = loadDestinyV2Registry();
const MODE_PROJECTION_BUCKETS = ["outerBattlefield", "horde", "deckbuilder", "autochess"] as const;

const LOCK_TARGET_CONFIG: readonly { readonly key: CharacterCreationLockKey; readonly label: string }[] = [
  { key: "spiritualRoot", label: "灵根" },
  { key: "mainDestiny", label: "主天命" },
  { key: "secondaryDestiny0", label: "副天命 1" },
  { key: "secondaryDestiny1", label: "副天命 2" },
  { key: "flawDestiny", label: "劫命" },
  { key: "background", label: "身世" },
  { key: "carriedItems", label: "随身物" }
];

const CORE_TREASURE_LABELS: Readonly<Record<CharacterCreationCoreTreasureId, string>> = {
  jing: "精",
  qi: "气",
  shen: "神"
};

const APTITUDE_LABELS: Readonly<Record<CharacterCreationAptitudeId, string>> = {
  rootBone: "根骨",
  comprehension: "悟性",
  inspiration: "灵感",
  fortune: "气运",
  heart: "心性",
  lifespan: "寿元"
};

const ROOT_METRIC_LABELS: Readonly<Record<CharacterCreationRootMetricId, string>> = {
  purity: "纯度",
  stability: "稳定",
  conflict: "冲突",
  breadth: "广度"
};

const CORE_TREASURE_DESCRIPTIONS: Readonly<Record<CharacterCreationCoreTreasureId, string>> = {
  jing: "精代表体魄血气、筋骨耐受和开局生命底子；当前值越高，越适合承受高压开局。",
  qi: "气代表先天真元种子、呼吸吐纳和施法续航；当前值越高，法术循环越顺。",
  shen: "神代表神魂清明、感知抗扰和悟道稳定性；当前值越高，越不容易被异兆扰乱。"
};

const APTITUDE_DESCRIPTIONS: Readonly<Record<CharacterCreationAptitudeId, string>> = {
  rootBone: "根骨影响体魄成长、修炼承载和近身抗压，是肉身根基的核心资质。",
  comprehension: "悟性影响理解功法、读懂天命代价和后续研法效率。",
  inspiration: "灵感影响异象感知、奇遇触发和对隐藏预兆的捕捉能力。",
  fortune: "气运影响开局随机资源、事件偏向和重 Roll 后的稀有机会。",
  heart: "心性影响定力、风险承受和面对劫命代价时的稳定程度。",
  lifespan: "寿元影响先天寿命余量、禁术代价空间和长线修行容错。"
};

const ROOT_METRIC_DESCRIPTIONS: Readonly<Record<CharacterCreationRootMetricId, string>> = {
  purity: "纯度代表灵气集中程度；高纯度通常让主元素路线更明确。",
  stability: "稳定影响开局灵根风险；稳定越低，后续异动和反噬风险越需要关注。",
  conflict: "冲突代表元素相克、杂质碰撞和修行噪声；冲突越高，路线代价越明显。",
  breadth: "广度代表元素覆盖和转修余地；广度越高，可兼容的玩法标签越多。"
};

const ROOT_CATEGORY_LABELS: Readonly<Record<SpiritualRootCategoryId, string>> = {
  single: "单灵根",
  dual: "双灵根",
  triple: "三灵根",
  mixed: "杂灵根",
  heavenly: "天灵根",
  variant: "异灵根",
  hidden: "隐灵根",
  closed: "闭灵根",
  chaos: "混沌灵根"
};

const ELEMENT_LABELS: Readonly<Record<ElementId, string>> = {
  metal: "金",
  wood: "木",
  water: "水",
  fire: "火",
  earth: "土",
  thunder: "雷",
  yin: "阴"
};

export function createCharacterCreationViewModel(
  draft: CharacterCreationDraft,
  selection: CharacterCreationSelectionState
): CharacterCreationViewModel {
  const activeLocks = getActiveBudgetedLocks(draft.locks);
  const locksRemaining = draft.destinyRerollSession?.locksRemaining ?? 0;
  const maxLocks = draft.destinyRerollSession === undefined
    ? DESTINY_REROLL_RULES.maxLockedFields
    : activeLocks.length + locksRemaining;
  const fateMeter = draft.destinyRerollSession?.fateMeter ?? draft.destinyRollDraft?.fateMeter ?? {
    value: 0,
    guaranteeRareNext: false
  };
  const v02 = toCharacterCreationV02ViewModel(createCharacterCreationV02Projection(draft));

  const selectedLockKey = getCharacterCreationLockKeyForSelection(selection);
  const lockTargets = toLockTargets(draft.locks, locksRemaining, maxLocks);
  const selectedLock = selectedLockKey === undefined
    ? undefined
    : lockTargets.find((target) => target.key === selectedLockKey);
  const lockAction = selectedLock === undefined
    ? { label: "选择可锁定项", disabled: true }
    : {
        label: selectedLock.buttonLabel,
        disabled: false,
        ...(selectedLock.canAdd ? {} : { warning: selectedLock.disabledReason })
      };

  return {
    coreTreasureRows: toCoreTreasureRows(draft.openingInnateDraft.coreSeed),
    aptitudeRows: toAptitudeRows(draft.openingInnateDraft.aptitude),
    spiritualRoot: toSpiritualRootViewModel(draft),
    originFate: toOriginFateViewModel(draft),
    destinyCards: DESTINY_CARD_CONFIG.map((config) => {
      const trait = getTraitForCard(draft, config.slot);
      const v02Destiny = v02.destinyEvaluationResults.find((result) => result.slot === config.slot);
      return {
        slot: config.slot,
        slotLabel: config.slotLabel,
        lockKey: config.lockKey,
        traitId: trait.traitId,
        name: trait.name,
        rarity: trait.rarity,
        qualityLabel: trait.qualityLabel ?? trait.rarity,
        description: trait.description ?? "此天命暂无详细描述。",
        tags: trait.tags,
        positiveEffects: trait.positiveEffects,
        negativeEffects: trait.negativeEffects,
        fateAlignment: trait.fateAlignment ?? "neutral",
        fateAlignmentLabel: trait.fateAlignmentLabel ?? "命盘未定",
        fateAlignmentReasonTags: filterPublicReasonTags(trait.fateAlignmentReasonTags ?? []),
        ...(v02Destiny?.mutation.mutated === true ? { mutationExplanation: CHARACTER_CREATION_V02_MUTATION_EXPLANATION } : {}),
        locked: draft.locks[config.lockKey],
        synergyWarnings: draft.destinies.synergyWarnings,
        conflictWarnings: draft.destinies.conflictWarnings,
        synergies: getSynergiesForTrait(draft, trait.traitId),
        lifeImpactHooks: getLifeImpactHooksForTrait(draft, trait.traitId),
        modeProjectionBuckets: getModeProjectionBucketsForTrait(trait.traitId)
      };
    }),
    v02,
    ...(selectedLockKey === undefined ? {} : { selectedLockKey }),
    ...(selectedLock === undefined ? {} : { selectedLock }),
    lockTargets,
    actions: {
      reroll: { label: "重新推演", disabled: false },
      lock: lockAction,
      divination: { label: `天机推演 ${draft.divinationTokens}`, disabled: draft.divinationTokens <= 0 },
      confirm: { label: "确认此生", disabled: false }
    },
    lockBudget: {
      activeLocks,
      locksRemaining,
      maxLocks
    },
    fateMeter: {
      value: fateMeter.value,
      boostThreshold: DESTINY_REROLL_RULES.fateMeter.thresholdBoost,
      guaranteeThreshold: DESTINY_REROLL_RULES.fateMeter.thresholdGuaranteeRare,
      guaranteeRareNext: fateMeter.guaranteeRareNext
    },
    rerollCount: draft.rerollCount,
    divinationTokens: draft.divinationTokens,
    canUseDivination: draft.divinationTokens > 0,
    synergyWarnings: draft.destinies.synergyWarnings,
    conflictWarnings: draft.destinies.conflictWarnings,
    warnings: draft.destinies.warnings
  };
}

function toCharacterCreationV02ViewModel(
  projection: ReturnType<typeof createCharacterCreationV02Projection>
): CharacterCreationV02ViewModel {
  return {
    ninePalace: {
      attributes: { ...projection.ninePalaceEvaluation.attributes },
      derivedScores: { ...projection.ninePalaceEvaluation.derived },
      threePowers: { ...projection.ninePalaceEvaluation.threePowers },
      wuxing: { ...projection.ninePalaceEvaluation.wuxing },
      biasTags: [
        ...projection.ninePalaceEvaluation.tags.destinyBiasTags,
        ...projection.ninePalaceEvaluation.tags.lifeEventBiasTags,
        ...projection.ninePalaceEvaluation.tags.hiddenFateBiasTags,
        ...projection.ninePalaceEvaluation.tags.rootBiasTags,
        ...projection.ninePalaceEvaluation.tags.modeBiasTags
      ]
    },
    destinyEvaluationResults: projection.destinyEvaluationResults.map((result) => ({ ...result })),
    originNarrativeSummary: {
      ...projection.originNarrativeSummary,
      activeStorylineIds: [...projection.originNarrativeSummary.activeStorylineIds],
      activeStorylineLabels: [...projection.originNarrativeSummary.activeStorylineLabels],
      canonicalLifeStorylineIds: [...projection.originNarrativeSummary.canonicalLifeStorylineIds],
      regionTags: [...projection.originNarrativeSummary.regionTags],
      eventPhaseSeeds: projection.originNarrativeSummary.eventPhaseSeeds.map((phase) => ({
        ...phase,
        events: [...phase.events]
      }))
    },
    carriedItemLifecycleSummary: {
      items: projection.carriedItemLifecycleSummary.items.map((item) => ({
        ...item,
        monthlyEventHooks: [...item.monthlyEventHooks],
        majorChoiceHooks: [...item.majorChoiceHooks],
        interludeHooks: [...item.interludeHooks],
        age18Hooks: [...item.age18Hooks]
      }))
    },
    lifeStorylineInitialScores: {
      source: projection.lifeStorylineInitialScores.source,
      storylines: projection.lifeStorylineInitialScores.storylines.map((storyline) => ({
        ...storyline,
        tags: [...storyline.tags]
      })),
      monthlyEventTags: [...projection.lifeStorylineInitialScores.monthlyEventTags],
      majorChoiceTags: [...projection.lifeStorylineInitialScores.majorChoiceTags]
    },
    lifeStageInitialState: {
      agePhaseId: projection.lifeStageInitialState.agePhaseId,
      identityStageIds: [...projection.lifeStageInitialState.identityStageIds],
      scores: { ...projection.lifeStageInitialState.scores },
      transitionTokens: [...projection.lifeStageInitialState.transitionTokens],
      age18Hooks: [...projection.lifeStageInitialState.age18Hooks]
    }
  };
}

function toLockTargets(
  locks: CharacterCreationLocks,
  locksRemaining: number,
  maxLocks: number
): readonly CharacterCreationLockTargetViewModel[] {
  return LOCK_TARGET_CONFIG.map((target) => {
    const locked = locks[target.key];
    const canAdd = locked || locksRemaining > 0;
    const buttonLabel = `${locked ? "解除" : "锁定"}${target.label}`;
    return {
      key: target.key,
      label: target.label,
      locked,
      canToggle: true,
      canAdd,
      buttonLabel,
      state: locked ? "locked" : "unlocked",
      ...(canAdd ? {} : { disabledReason: `锁定数量已达上限 ${maxLocks}/${maxLocks}` })
    };
  });
}

function toCoreTreasureRows(coreSeed: CoreThreeTreasures): readonly CharacterCreationNumericRow<CharacterCreationCoreTreasureId>[] {
  return (Object.keys(CORE_TREASURE_LABELS) as CharacterCreationCoreTreasureId[]).map((id) => ({
    id,
    label: CORE_TREASURE_LABELS[id],
    value: coreSeed[id],
    description: CORE_TREASURE_DESCRIPTIONS[id]
  }));
}

function toAptitudeRows(aptitude: AptitudeStats): readonly CharacterCreationNumericRow<CharacterCreationAptitudeId>[] {
  return (Object.keys(APTITUDE_LABELS) as CharacterCreationAptitudeId[]).map((id) => ({
    id,
    label: APTITUDE_LABELS[id],
    value: aptitude[id],
    description: APTITUDE_DESCRIPTIONS[id]
  }));
}

function toSpiritualRootViewModel(draft: CharacterCreationDraft): CharacterCreationSpiritualRootViewModel {
  const root = draft.openingInnateDraft.spiritualRoot;
  const metrics = {
    purity: root.purity,
    stability: root.stability,
    conflict: root.conflict,
    breadth: root.breadth
  };

  return {
    categoryId: root.categoryId,
    categoryLabel: ROOT_CATEGORY_LABELS[root.categoryId],
    displayName: root.displayName,
    elements: Object.entries(root.elements)
      .filter((entry): entry is [ElementId, number] => entry[1] !== undefined && entry[1] > 0)
      .sort(([firstElement, firstValue], [secondElement, secondValue]) => secondValue - firstValue || firstElement.localeCompare(secondElement))
      .map(([id, percentage]) => ({
        id,
        label: ELEMENT_LABELS[id],
        percentage,
        primary: root.primaryElement === id,
        secondary: root.secondaryElements.includes(id),
        latent: root.latentRoot === id
      })),
    ...(root.primaryElement === undefined ? {} : { primaryElement: root.primaryElement }),
    secondaryElements: root.secondaryElements,
    ...(root.latentRoot === undefined ? {} : { latentRoot: root.latentRoot }),
    metrics,
    metricRows: (Object.keys(ROOT_METRIC_LABELS) as CharacterCreationRootMetricId[]).map((id) => ({
      id,
      label: ROOT_METRIC_LABELS[id],
      value: metrics[id],
      description: ROOT_METRIC_DESCRIPTIONS[id]
    })),
    relationTags: root.relationTags,
    tags: root.tags
  };
}

function toOriginFateViewModel(draft: CharacterCreationDraft): CharacterCreationOriginFateViewModel {
  const originFate = draft.originFate;
  return {
    backgroundName: originFate.backgroundOrigin.name,
    backgroundDescription: originFate.backgroundOrigin.visibleDescription,
    backgroundTags: originFate.backgroundOrigin.matchedTags,
    omen: {
      levelLabel: originFate.visibleHiddenOmen.levelLabel,
      hints: originFate.visibleHiddenOmen.hints,
      riskHint: originFate.visibleHiddenOmen.riskHint,
      relatedTags: originFate.visibleHiddenOmen.relatedTags ?? []
    },
    carriedItems: originFate.carriedItems.map((item) => ({
      itemId: item.itemId,
      name: item.name,
      visibleDescription: item.visibleDescription,
      conversionLabel: item.conversion.label,
      outerBattlefieldEffect: item.conversion.outerBattlefieldEffect,
      dongfuHook: item.conversion.dongfuHook,
      tags: item.matchedTags
    }))
  };
}

export function getCharacterCreationLockKeyForSelection(
  selection: CharacterCreationSelectionState
): CharacterCreationLockKey | undefined {
  switch (selection.activeTab) {
    case "root":
      return "spiritualRoot";
    case "destiny":
      return DESTINY_CARD_CONFIG.find((config) => config.slot === selection.selectedSlot)?.lockKey;
    case "origin":
      return "background";
    case "items":
      return "carriedItems";
    case "stats":
      return undefined;
  }
}

function getTraitForCard(
  draft: CharacterCreationDraft,
  slot: CharacterCreationDestinyCardSlot
): DestinyTraitState {
  switch (slot) {
    case "main":
      return draft.destinies.main;
    case "secondary0":
      return draft.destinies.secondary[0];
    case "secondary1":
      return draft.destinies.secondary[1];
    case "flaw":
      return draft.destinies.flaw;
  }
}

function getSynergiesForTrait(
  draft: CharacterCreationDraft,
  traitId: string
): readonly CharacterCreationDestinySynergyViewModel[] {
  return draft.destinies.synergies
    .filter((synergy) => synergy.traits.includes(traitId))
    .map((synergy) => ({
      id: synergy.id,
      name: synergy.name,
      traits: synergy.traits,
      description: synergy.description,
      effects: synergy.effects
    }));
}

function getLifeImpactHooksForTrait(
  draft: CharacterCreationDraft,
  traitId: string
): readonly CharacterCreationLifeHookViewModel[] {
  return draft.destinies.lifeManifestationHooks?.hooks
    .filter((hook) => hook.destinyId === traitId)
    .map((hook) => ({
      destinyId: hook.destinyId,
      phase: hook.phase,
      phaseRule: hook.phaseRule,
      hook: hook.hook,
      visible: hook.visible
    })) ?? [];
}

function getModeProjectionBucketsForTrait(traitId: string): readonly CharacterCreationModeProjectionViewModel[] {
  try {
    const projection = DESTINY_V2_REGISTRY.getModeProjection(traitId);
    return MODE_PROJECTION_BUCKETS
      .map((bucket) => ({
        bucket,
        label: bucket,
        tags: projection[bucket] ?? []
      }))
      .filter((bucket) => bucket.tags.length > 0);
  } catch {
    return [];
  }
}

function filterPublicReasonTags(tags: readonly string[]): readonly string[] {
  return tags.filter((tag) => !tag.startsWith("mutation:source:") && !tag.startsWith("mutation:target:"));
}

function getActiveBudgetedLocks(locks: CharacterCreationLocks): readonly CharacterCreationLockKey[] {
  const lockKeys: readonly CharacterCreationLockKey[] = [
    "spiritualRoot",
    "mainDestiny",
    "secondaryDestiny0",
    "secondaryDestiny1",
    "flawDestiny",
    "background",
    "carriedItems"
  ];
  return lockKeys.filter((lockKey) => locks[lockKey]);
}
