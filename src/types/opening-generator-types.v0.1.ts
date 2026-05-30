// Opening Attribute & Spiritual Root Generator Types v0.1
// 本文件是实现草案，可并入项目正式 types 目录。

export type OpeningId = string;

export type ElementId =
  | "metal"
  | "wood"
  | "water"
  | "fire"
  | "earth"
  | "thunder"
  | "yin";

export type SpiritualRootCategoryId =
  | "single"
  | "dual"
  | "triple"
  | "mixed"
  | "heavenly"
  | "variant"
  | "hidden"
  | "closed"
  | "chaos";

export interface AptitudeStats {
  readonly rootBone: number;
  readonly comprehension: number;
  readonly inspiration: number;
  readonly fortune: number;
  readonly heart: number;
  readonly lifespan: number;
}

export interface CoreSeedStats {
  readonly jing: number;
  readonly qi: number;
  readonly shen: number;
}

export interface OpeningGrowthBias {
  readonly jingGrowth: number;
  readonly qiGrowth: number;
  readonly shenGrowth: number;
  readonly studyBias: number;
  readonly martialBias: number;
  readonly alchemyBias: number;
  readonly artifactBias: number;
  readonly seclusionBias: number;
  readonly adventureBias: number;
}

export interface AttributeArchetypeDefinition {
  readonly id: OpeningId;
  readonly name: string;
  readonly weight: number;
  readonly description: string;
  readonly aptitudeRanges: Record<keyof AptitudeStats, readonly [number, number]>;
  readonly skew?: Partial<Record<keyof AptitudeStats, number>>;
  readonly coreSeedBase: CoreSeedStats;
  readonly rootCategoryWeightModifiers?: Partial<Record<SpiritualRootCategoryId | string, number>>;
  readonly biasTags: readonly string[];
}

export interface SpiritualRootCategoryDefinition {
  readonly id: SpiritualRootCategoryId;
  readonly name: string;
  readonly weight: number;
  readonly description: string;
  readonly elementCount: readonly [number, number];
  readonly allowedElements?: readonly ElementId[];
  readonly metricRanges: {
    readonly purity: readonly [number, number];
    readonly stability: readonly [number, number];
    readonly conflict: readonly [number, number];
    readonly breadth: readonly [number, number];
  };
  readonly cultivationRateModifier: number;
  readonly hasLatentRoot?: boolean;
  readonly tags: readonly string[];
}

export interface OpeningElementDefinition {
  readonly id: ElementId;
  readonly name: string;
  readonly tags: readonly string[];
}

export interface OpeningSpecialElementRelationship {
  readonly pair: readonly [ElementId, ElementId];
  readonly relation: string;
  readonly conflictBonus: number;
  readonly tags: readonly string[];
}

export interface OpeningRootElementWeightsDefinition {
  readonly version: string;
  readonly baseElementWeights: Readonly<Record<ElementId, number>>;
  readonly archetypeElementModifiers: Readonly<Record<string, Readonly<Partial<Record<ElementId, number>>>>>;
  readonly relationships: {
    readonly generating: readonly (readonly [ElementId, ElementId])[];
    readonly controlling: readonly (readonly [ElementId, ElementId])[];
    readonly special: readonly OpeningSpecialElementRelationship[];
  };
}

export interface OpeningGenerationRulesDefinition {
  readonly version: string;
  readonly rng: {
    readonly requiresSeededRng: boolean;
    readonly forbidden: readonly string[];
    readonly streams: readonly string[];
  };
  readonly statDomains: {
    readonly aptitudeMin: number;
    readonly aptitudeSoftMax: number;
    readonly aptitudeHardMax: number;
    readonly coreSeedMin: number;
    readonly coreSeedMax: number;
    readonly rootMetricMin: number;
    readonly rootMetricMax: number;
  };
  readonly distinctiveness: {
    readonly minimumScoreAfterCompensation: number;
    readonly scoring: readonly {
      readonly condition: string;
      readonly score: number;
    }[];
    readonly compensationHooks: readonly {
      readonly id: string;
      readonly effect: Readonly<Record<string, number>>;
      readonly tags: readonly string[];
    }[];
  };
  readonly locks: {
    readonly supported: readonly string[];
    readonly recommendedUiLocks: readonly string[];
  };
  readonly displayTiers: readonly {
    readonly min: number;
    readonly max: number;
    readonly label: string;
  }[];
}

export interface OpeningAttributeArchetypesDataFile {
  readonly version: string;
  readonly notes?: string;
  readonly archetypes: readonly AttributeArchetypeDefinition[];
}

export interface OpeningSpiritualRootsDataFile {
  readonly version: string;
  readonly rootCategories: readonly SpiritualRootCategoryDefinition[];
  readonly elements: readonly OpeningElementDefinition[];
}

export interface OpeningGeneratorDataFiles {
  readonly attributeArchetypes?: OpeningAttributeArchetypesDataFile;
  readonly spiritualRoots?: OpeningSpiritualRootsDataFile;
  readonly rootElementWeights?: OpeningRootElementWeightsDefinition;
  readonly generationRules?: OpeningGenerationRulesDefinition;
}

export interface SpiritualRootState {
  readonly categoryId: SpiritualRootCategoryId;
  readonly displayName: string;
  readonly elements: Readonly<Partial<Record<ElementId, number>>>;
  readonly primaryElement?: ElementId;
  readonly secondaryElements: readonly ElementId[];
  readonly latentRoot?: ElementId;
  readonly purity: number;
  readonly stability: number;
  readonly conflict: number;
  readonly breadth: number;
  readonly relationTags: readonly string[];
  readonly tags: readonly string[];
}

export interface AttributeArchetypeResult {
  readonly id: OpeningId;
  readonly name: string;
  readonly description: string;
  readonly tags: readonly string[];
}

export interface OpeningDraftTags {
  readonly destinyBiasTags: readonly string[];
  readonly lifeEventBiasTags: readonly string[];
  readonly modeBiasTags: readonly string[];
  readonly hiddenFateBiasTags: readonly string[];
}

export interface OpeningGenerationLocks {
  readonly attributeArchetype?: boolean;
  readonly aptitudeStats?: boolean;
  readonly coreSeedStats?: boolean;
  readonly spiritualRootCategory?: boolean;
  readonly spiritualRootElements?: boolean;
  readonly spiritualRootFull?: boolean;
}

export interface OpeningInnateDraft {
  readonly draftId: string;
  readonly seed: string;
  readonly rerollIndex: number;
  readonly archetype: AttributeArchetypeResult;
  readonly aptitude: AptitudeStats;
  readonly coreSeed: CoreSeedStats;
  readonly spiritualRoot: SpiritualRootState;
  readonly growthBias: OpeningGrowthBias;
  readonly tags: OpeningDraftTags;
  readonly distinctivenessScore: number;
  readonly locks?: OpeningGenerationLocks;
  readonly debug?: OpeningGenerationDebugInfo;
}

export type OpeningAttributeDraft = Omit<OpeningInnateDraft, "spiritualRoot">;

export interface OpeningSpiritualRootDraft {
  readonly draftId: string;
  readonly seed: string;
  readonly rerollIndex: number;
  readonly spiritualRoot: SpiritualRootState;
  readonly tags: OpeningDraftTags;
  readonly distinctivenessScore: number;
  readonly locks?: OpeningGenerationLocks;
  readonly debug?: OpeningGenerationDebugInfo;
}

export interface OpeningGenerationDebugInfo {
  readonly selectedArchetypeWeightRoll: number;
  readonly selectedRootCategoryWeightRoll: number;
  readonly appliedDramaHookIds: readonly string[];
  readonly distributionTags: readonly string[];
}

export interface GenerateOpeningInnateInput {
  readonly seed: string;
  readonly draftId: string;
  readonly rerollIndex: number;
  readonly locks?: OpeningGenerationLocks;
  readonly previousDraft?: OpeningInnateDraft;
}

export interface GenerateOpeningAttributeInput {
  readonly seed: string;
  readonly draftId: string;
  readonly rerollIndex: number;
  readonly locks?: OpeningGenerationLocks;
  readonly previousDraft?: OpeningAttributeDraft;
}

export interface GenerateOpeningSpiritualRootInput {
  readonly seed: string;
  readonly draftId: string;
  readonly rerollIndex: number;
  readonly archetype: AttributeArchetypeResult;
  readonly locks?: OpeningGenerationLocks;
  readonly previousDraft?: OpeningSpiritualRootDraft;
}

export interface OpeningGenerator {
  generate(input: GenerateOpeningInnateInput): OpeningInnateDraft;
}

export interface OpeningAttributeGenerator {
  generate(input: GenerateOpeningAttributeInput): OpeningAttributeDraft;
}

export interface OpeningSpiritualRootGenerator {
  generate(input: GenerateOpeningSpiritualRootInput): OpeningSpiritualRootDraft;
}
