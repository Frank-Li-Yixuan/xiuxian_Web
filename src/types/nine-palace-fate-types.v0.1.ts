export type FateAttributeId =
  | "jing"
  | "qi"
  | "shen"
  | "rootBone"
  | "comprehension"
  | "inspiration"
  | "fortune"
  | "heart"
  | "lifespan";

export type ThreePowerId = "heaven" | "human" | "earth";
export type PolarityId = "yin" | "yang" | "balanced" | "variable" | "hidden";
export type ElementId = "metal" | "wood" | "water" | "fire" | "earth" | "thunder" | "yin";

export interface NinePalaceAttributes {
  jing: number;
  qi: number;
  shen: number;
  rootBone: number;
  comprehension: number;
  inspiration: number;
  fortune: number;
  heart: number;
  lifespan: number;
}

export interface ThreePowerScores {
  heaven: number;
  human: number;
  earth: number;
}

export interface DerivedFateScores {
  talentScore: number;
  vesselScore: number;
  stabilityScore: number;
  destinyPressureScore: number;
  lateBloomScore: number;
  rebellionScore: number;
}

export interface WuxingInclination {
  metal: number;
  wood: number;
  water: number;
  fire: number;
  earth: number;
  thunder: number;
  yin: number;
}

export interface FateCausalityTags {
  destinyBiasTags: string[];
  lifeEventBiasTags: string[];
  hiddenFateBiasTags: string[];
  rootBiasTags: string[];
  modeBiasTags: string[];
  warnings: string[];
}

export interface NinePalaceEvaluation {
  attributes: NinePalaceAttributes;
  threePowers: ThreePowerScores;
  derived: DerivedFateScores;
  wuxing: WuxingInclination;
  tags: FateCausalityTags;
}

export interface DestinyEligibilityRule {
  id: string;
  name: string;
  archetype: string;
  requiredAny?: unknown[];
  supportAny?: unknown[];
  antiConditions?: unknown[];
  ifContradictedMutateTo?: string;
  lifeEventBias?: string[];
  age18Hooks?: string[];
  reason: string;
}

export interface DestinyEligibilityResult {
  traitId: string;
  eligible: boolean;
  supportScore: number;
  contradictionScore: number;
  mutationTarget?: string;
  explanation: string[];
}

export interface AntiWeirdnessResult {
  originalTraitId: string;
  acceptedTraitId: string;
  action: "accept" | "reject" | "mutate" | "warn";
  warnings: string[];
}
