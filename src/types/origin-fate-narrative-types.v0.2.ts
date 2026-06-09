export type Id = string;

export type HiddenFateCategory =
  | "bloodline"
  | "pastLife"
  | "curseSeal"
  | "karmicSeed"
  | "systemResonance"
  | "karmicObject"
  | "battlefieldEcho"
  | "falseOmen";

export type HiddenFateRarity =
  | "minor"
  | "rare"
  | "epic"
  | "legendary"
  | "forbidden";

export type HiddenFateRevealBand =
  | "seed"
  | "omen"
  | "stirring"
  | "halfReveal"
  | "nearAwake"
  | "awakened";

export interface HiddenFateOmenStageV02 {
  readonly band: HiddenFateRevealBand;
  readonly text: string;
}

export interface HiddenFateDefinitionV02 {
  readonly id: Id;
  readonly trueName: string; // internal only
  readonly publicAlias: string;
  readonly category: HiddenFateCategory;
  readonly rarity: HiddenFateRarity;
  readonly primaryTags: readonly string[];
  readonly antiTags: readonly string[];
  readonly preferredOrigins: readonly Id[];
  readonly preferredRoots: readonly Id[];
  readonly preferredDestinies: readonly Id[];
  readonly preferredItems: readonly Id[];
  readonly omenStages: readonly HiddenFateOmenStageV02[];
  readonly misleadingOmenIds: readonly Id[];
  readonly lifeEventHooks: readonly string[];
  readonly majorChoiceHooks: readonly string[];
  readonly interludeHooks: readonly string[];
  readonly stageTransitionTokens: readonly string[];
  readonly age18Outcomes: readonly Id[];
}

export interface OriginStorylineDefinitionV02 {
  readonly id: Id;
  readonly name: string;
  readonly regionTags: readonly string[];
  readonly narrativeTheme: string;
  readonly storylineBias: readonly Id[];
  readonly earlyEchoEvents: readonly string[];
  readonly childhoodSeedEvents: readonly string[];
  readonly youthConflictEvents: readonly string[];
  readonly teenChoiceEvents: readonly string[];
  readonly hiddenFateBias: readonly Id[];
  readonly carriedItemBias: readonly Id[];
  readonly interludeBias: readonly Id[];
}

export type CarriedItemLifecycleStage =
  | "obtained"
  | "noticed"
  | "resonating"
  | "tested"
  | "damaged"
  | "deepened"
  | "converted"
  | "inherited";

export interface CarriedItemLifecycleEntryV02 {
  readonly stage: CarriedItemLifecycleStage;
  readonly text: string;
}

export interface CarriedItemNarrativeDefinitionV02 {
  readonly id: Id;
  readonly name: string;
  readonly surfaceDescription: string;
  readonly lifecycle: readonly CarriedItemLifecycleEntryV02[];
  readonly preferredOrigins: readonly Id[];
  readonly preferredHiddenFates: readonly Id[];
  readonly preferredDestinies: readonly Id[];
  readonly eventHooks: readonly string[];
  readonly interludeHooks: readonly Id[];
  readonly age18Conversions: readonly Id[];
  readonly dongfuHooks: readonly Id[];
}

export interface HiddenFateNarrativeStateV02 {
  readonly hiddenFateId: Id;
  readonly progress: number;
  readonly revealBand: HiddenFateRevealBand;
  readonly knownToPlayer: boolean;
  readonly trueNameRevealed: boolean;
  readonly misleadingOmenIds: readonly Id[];
  readonly omenHistory: readonly Id[];
  readonly lastProgressMonth?: number;
}

export interface CarriedItemNarrativeStateV02 {
  readonly itemId: Id;
  readonly affinity: number;
  readonly lifecycleStage: CarriedItemLifecycleStage;
  readonly eventHistory: readonly Id[];
  readonly damaged: boolean;
  readonly converted: boolean;
}

export interface OriginNarrativeStateV02 {
  readonly originId: Id;
  readonly activeStorylineIds: readonly Id[];
  readonly originThreadProgress: Record<Id, number>;
  readonly familyTie: number;
  readonly worldlyTie: number;
}

export interface OriginFateNarrativeStateV02 {
  readonly origin: OriginNarrativeStateV02;
  readonly hiddenFates: readonly HiddenFateNarrativeStateV02[];
  readonly carriedItems: readonly CarriedItemNarrativeStateV02[];
  readonly visibleOmenLines: readonly string[];
  readonly lifeEventBiasTags: readonly string[];
  readonly majorChoiceSignals: readonly string[];
  readonly interludeBiasTags: readonly string[];
  readonly stageTransitionTokens: readonly string[];
  readonly age18Hooks: readonly string[];
}

export interface Age18OriginFateInputV02 {
  readonly originNarrativeState: OriginNarrativeStateV02;
  readonly hiddenFateStates: readonly HiddenFateNarrativeStateV02[];
  readonly carriedItemStates: readonly CarriedItemNarrativeStateV02[];
  readonly revealHistory: readonly Id[];
  readonly misleadingOmenHistory: readonly Id[];
  readonly keyChoiceRecords: readonly Id[];
  readonly keyInterludeRecords: readonly Id[];
}
