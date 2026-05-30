import type {
  GenerateOpeningInnateInput,
  OpeningAttributeDraft,
  OpeningDraftTags,
  OpeningGenerationDebugInfo,
  OpeningGenerator,
  OpeningInnateDraft,
  OpeningSpiritualRootDraft,
  SpiritualRootCategoryId,
  SpiritualRootState
} from "../types/opening-generator-types.v0.1";
import { DefaultOpeningAttributeGenerator } from "./OpeningAttributeGenerator";
import { DefaultOpeningSpiritualRootGenerator } from "./OpeningSpiritualRootGenerator";

const RARE_ROOT_CATEGORY_IDS = new Set<SpiritualRootCategoryId>(["heavenly", "variant", "hidden", "chaos"]);

export class DefaultOpeningGenerator implements OpeningGenerator {
  private readonly attributeGenerator: DefaultOpeningAttributeGenerator;
  private readonly spiritualRootGenerator: DefaultOpeningSpiritualRootGenerator;

  constructor(options: {
    readonly attributeGenerator?: DefaultOpeningAttributeGenerator;
    readonly spiritualRootGenerator?: DefaultOpeningSpiritualRootGenerator;
  } = {}) {
    this.attributeGenerator = options.attributeGenerator ?? new DefaultOpeningAttributeGenerator();
    this.spiritualRootGenerator = options.spiritualRootGenerator ?? new DefaultOpeningSpiritualRootGenerator();
  }

  generate(input: GenerateOpeningInnateInput): OpeningInnateDraft {
    const previousAttributeDraft = input.previousDraft === undefined ? undefined : toAttributeDraft(input.previousDraft);
    const attributeDraft = this.attributeGenerator.generate({
      seed: input.seed,
      draftId: input.draftId,
      rerollIndex: input.rerollIndex,
      ...(input.locks === undefined ? {} : { locks: input.locks }),
      ...(previousAttributeDraft === undefined ? {} : { previousDraft: previousAttributeDraft })
    });
    const previousSpiritualRootDraft = input.previousDraft === undefined ? undefined : toSpiritualRootDraft(input.previousDraft);
    const spiritualRootDraft = this.spiritualRootGenerator.generate({
      seed: input.seed,
      draftId: input.draftId,
      rerollIndex: input.rerollIndex,
      archetype: attributeDraft.archetype,
      ...(input.locks === undefined ? {} : { locks: input.locks }),
      ...(previousSpiritualRootDraft === undefined ? {} : { previousDraft: previousSpiritualRootDraft })
    });

    return deepFreeze({
      draftId: input.draftId,
      seed: input.seed,
      rerollIndex: input.rerollIndex,
      archetype: attributeDraft.archetype,
      aptitude: attributeDraft.aptitude,
      coreSeed: attributeDraft.coreSeed,
      spiritualRoot: spiritualRootDraft.spiritualRoot,
      growthBias: attributeDraft.growthBias,
      tags: mergeDraftTags(attributeDraft.tags, spiritualRootDraft.tags),
      distinctivenessScore: attributeDraft.distinctivenessScore + spiritualRootDraft.distinctivenessScore,
      ...(input.locks === undefined ? {} : { locks: input.locks }),
      debug: mergeDebugInfo(attributeDraft.debug, spiritualRootDraft.debug)
    });
  }
}

export function generateOpeningInnateDraft(input: GenerateOpeningInnateInput): OpeningInnateDraft {
  return new DefaultOpeningGenerator().generate(input);
}

function toAttributeDraft(draft: OpeningInnateDraft): OpeningAttributeDraft {
  const {
    spiritualRoot: _spiritualRoot,
    ...attributeDraft
  } = draft;
  return attributeDraft;
}

function toSpiritualRootDraft(draft: OpeningInnateDraft): OpeningSpiritualRootDraft {
  return {
    draftId: draft.draftId,
    seed: draft.seed,
    rerollIndex: draft.rerollIndex,
    spiritualRoot: draft.spiritualRoot,
    tags: draft.tags,
    distinctivenessScore: scoreSpiritualRootDistinctiveness(draft.spiritualRoot),
    ...(draft.locks === undefined ? {} : { locks: draft.locks }),
    ...(draft.debug === undefined ? {} : { debug: draft.debug })
  };
}

function mergeDraftTags(first: OpeningDraftTags, second: OpeningDraftTags): OpeningDraftTags {
  return {
    destinyBiasTags: uniqueStable([...first.destinyBiasTags, ...second.destinyBiasTags]),
    lifeEventBiasTags: uniqueStable([...first.lifeEventBiasTags, ...second.lifeEventBiasTags]),
    modeBiasTags: uniqueStable([...first.modeBiasTags, ...second.modeBiasTags]),
    hiddenFateBiasTags: uniqueStable([...first.hiddenFateBiasTags, ...second.hiddenFateBiasTags])
  };
}

function mergeDebugInfo(
  first: OpeningGenerationDebugInfo | undefined,
  second: OpeningGenerationDebugInfo | undefined
): OpeningGenerationDebugInfo {
  return {
    selectedArchetypeWeightRoll: first?.selectedArchetypeWeightRoll ?? 0,
    selectedRootCategoryWeightRoll: second?.selectedRootCategoryWeightRoll ?? 0,
    appliedDramaHookIds: uniqueStable([
      ...(first?.appliedDramaHookIds ?? []),
      ...(second?.appliedDramaHookIds ?? [])
    ]),
    distributionTags: uniqueStable([
      ...(first?.distributionTags ?? []),
      ...(second?.distributionTags ?? []),
      "opening:innate_full"
    ])
  };
}

function scoreSpiritualRootDistinctiveness(spiritualRoot: SpiritualRootState): number {
  let score = 0;
  if (RARE_ROOT_CATEGORY_IDS.has(spiritualRoot.categoryId)) {
    score += 2;
  }
  if (spiritualRoot.relationTags.includes("rootRelation:generating")) {
    score += 1;
  }
  if (spiritualRoot.relationTags.includes("rootRelation:controlling")) {
    score += 1;
  }
  if (spiritualRoot.relationTags.some((tag) => tag !== "rootRelation:generating" && tag !== "rootRelation:controlling")) {
    score += 1;
  }
  return score;
}

function uniqueStable<T>(values: readonly T[]): readonly T[] {
  return [...new Set(values)];
}

function deepFreeze<T>(value: T): T {
  if (value !== null && typeof value === "object") {
    Object.freeze(value);
    for (const child of Object.values(value)) {
      deepFreeze(child);
    }
  }
  return value;
}
