// TypeScript draft types for 《18 岁系统觉醒与域外战场开局转化 v0.1》.
// These are design-level contracts for Codex implementation.

export type Id = string;
export type SaveStage =
  | "empty"
  | "character_creation"
  | "life_simulation"
  | "life_simulation_completed"
  | "age18_awakening"
  | "outer_battlefield_pending"
  | "outer_battlefield_in_progress"
  | "system_home_unlocked"
  | "dongfu";

export type HiddenFateRevealState = "sealed" | "halfAwakened" | "revealed" | "unstable";
export type Age18SystemMessageKind = "system" | "warning" | "reveal" | "item" | "destiny" | "home";

export interface Age18AwakeningInput {
  readonly profileId: Id;
  readonly characterId: Id;
  readonly seed: string;
  readonly openingDraft: unknown;
  readonly destinySelection: unknown;
  readonly originFate: unknown;
  readonly lifeSimulation: unknown;
  readonly majorChoiceHistory: readonly unknown[];
  readonly currentSaveStage: "life_simulation_completed";
}

export interface FinalLifeStats {
  readonly core: {
    readonly jing: number;
    readonly qi: number;
    readonly shen: number;
  };
  readonly aptitude: {
    readonly rootBone: number;
    readonly comprehension: number;
    readonly inspiration: number;
    readonly fortune: number;
    readonly heart: number;
    readonly lifespan: number;
  };
  readonly lifeSkills: {
    readonly knowledge: number;
    readonly martial: number;
    readonly alchemy: number;
    readonly insight: number;
    readonly reputation: number;
    readonly survival: number;
  };
  readonly karma: number;
  readonly merit: number;
  readonly heartDemon: number;
  readonly wounds: readonly unknown[];
  readonly heartKnots: readonly unknown[];
}

export interface AwakeningScoreBreakdown {
  readonly total: number;
  readonly bandLabel: string;
  readonly coreScore: number;
  readonly aptitudeScore: number;
  readonly destinyScore: number;
  readonly hiddenFateScore: number;
  readonly carriedItemScore: number;
  readonly lifeChoiceScore: number;
  readonly karmaMeritScore: number;
}

export interface RevealedHiddenFate {
  readonly hiddenFateId: Id;
  readonly trueName: string;
  readonly revealState: HiddenFateRevealState;
  readonly progress: number;
  readonly visibleMessage: string;
  readonly grantedTags: readonly string[];
  readonly outerBattlefieldModifiers: readonly Id[];
  readonly homeHooks: readonly Id[];
}

export interface SealedHiddenFate {
  readonly hiddenFateId: Id;
  readonly revealState: "sealed";
  readonly visibleOmen: string;
  readonly sealedTags: readonly string[];
}

export interface ConvertedCarriedItem {
  readonly sourceItemId: Id;
  readonly conversionId: Id;
  readonly visibleName: string;
  readonly conversionTier: "low" | "medium" | "high" | "perfect";
  readonly outerBattlefieldLoadout: readonly Id[];
  readonly outerBattlefieldModifiers: readonly Id[];
  readonly homeHooks: readonly Id[];
  readonly systemMessage: string;
}

export interface DestinyAge18Projection {
  readonly destinyId: Id;
  readonly name: string;
  readonly outerBattlefieldLoadout: readonly Id[];
  readonly outerBattlefieldModifiers: readonly Id[];
  readonly homeHooks: readonly Id[];
  readonly riskTags: readonly string[];
  readonly systemMessage?: string;
}

export interface OuterBattlefieldModifier {
  readonly id: Id;
  readonly source: "stat" | "destiny" | "hiddenFate" | "carriedItem" | "lifeChoice" | "karma" | "merit";
  readonly label: string;
  readonly description: string;
  readonly tags: readonly string[];
  readonly numeric?: Record<string, number>;
}

export interface OuterBattlefieldInitialLoadout {
  readonly natalArtifactId: Id;
  readonly spellIds: readonly Id[];
  readonly pillIds: readonly Id[];
  readonly talismanIds: readonly Id[];
  readonly treasureIds: readonly Id[];
  readonly notes: readonly string[];
}

export interface SystemAwakeningMessage {
  readonly id: Id;
  readonly kind: Age18SystemMessageKind;
  readonly text: string;
  readonly canSkip: boolean;
}

export interface Age18Warning {
  readonly id: Id;
  readonly severity: "info" | "minor" | "major" | "danger";
  readonly text: string;
}

export interface Age18AwakeningResolution {
  readonly resolutionId: Id;
  readonly profileId: Id;
  readonly characterId: Id;
  readonly resolvedAtAgeMonths: 216;
  readonly seed: string;
  readonly finalLifeStats: FinalLifeStats;
  readonly awakeningScore: AwakeningScoreBreakdown;
  readonly revealedHiddenFates: readonly RevealedHiddenFate[];
  readonly sealedHiddenFates: readonly SealedHiddenFate[];
  readonly convertedCarriedItems: readonly ConvertedCarriedItem[];
  readonly destinyProjections: readonly DestinyAge18Projection[];
  readonly firstBattleModifiers: readonly OuterBattlefieldModifier[];
  readonly initialLoadout: OuterBattlefieldInitialLoadout;
  readonly systemMessages: readonly SystemAwakeningMessage[];
  readonly warnings: readonly Age18Warning[];
  readonly debug?: Age18AwakeningDebugInfo;
}

export interface Age18AwakeningDebugInfo {
  readonly rngTrace: readonly string[];
  readonly hiddenFateRevealRolls: readonly Record<string, unknown>[];
  readonly carriedItemConversionRolls: readonly Record<string, unknown>[];
  readonly statConversion: Record<string, number>;
}

export interface OuterBattlefieldPlayerStart {
  readonly maxHp: number;
  readonly hp: number;
  readonly maxQi: number;
  readonly qi: number;
  readonly pickupRadius: number;
  readonly critChance: number;
  readonly passiveQiRegen: number;
  readonly spellInsightBonus: number;
  readonly dropLuckBonus: number;
  readonly heartDemonResist: number;
  readonly modifiers: readonly OuterBattlefieldModifier[];
  readonly loadout: OuterBattlefieldInitialLoadout;
}

export interface TutorialStepDefinition {
  readonly id: Id;
  readonly trigger: string;
  readonly message: string;
  readonly blocking: boolean;
}

export interface OuterBattlefieldIntroScenarioPhase {
  readonly id: Id;
  readonly startSec: number;
  readonly endSec: number;
  readonly title: string;
  readonly enemyGroups?: readonly Id[];
  readonly bossId?: Id;
  readonly forceInsight?: boolean;
  readonly triggerDestinyEvent?: boolean;
  readonly clearEnemies?: boolean;
  readonly grantHomePermission?: boolean;
}

export interface OuterBattlefieldIntroScenario {
  readonly id: Id;
  readonly displayName: string;
  readonly phases: readonly OuterBattlefieldIntroScenarioPhase[];
  readonly enemyPool: readonly Id[];
  readonly rewardPools: readonly Id[];
}

export interface FirstBattleFailurePolicy {
  readonly retryable: boolean;
  readonly preserveLifeSimulation: boolean;
  readonly onFailureStage: SaveStage;
  readonly failureHooks: readonly string[];
  readonly lowFailAssistAfterAttempts: number;
}

export interface OuterBattlefieldIntroRunConfig {
  readonly modeId: "outer_battlefield_intro";
  readonly runId: Id;
  readonly seed: string;
  readonly playerProfile: OuterBattlefieldPlayerStart;
  readonly scenario: OuterBattlefieldIntroScenario;
  readonly tutorialSteps: readonly TutorialStepDefinition[];
  readonly enemyPool: readonly Id[];
  readonly rewardPoolIds: readonly Id[];
  readonly failurePolicy: FirstBattleFailurePolicy;
}

export interface ResourceGrant {
  readonly id: Id;
  readonly amount: number;
}

export interface SystemHomeModuleUnlock {
  readonly id: Id;
  readonly name: string;
  readonly status: "unlocked" | "partial" | "locked";
  readonly description: string;
}

export interface OriginBasedHomeBonus {
  readonly id: Id;
  readonly source: "origin" | "hiddenFate" | "carriedItem" | "destiny" | "karma" | "merit";
  readonly description: string;
}

export interface MainObjective {
  readonly id: Id;
  readonly title: string;
  readonly description: string;
}

export interface SystemHomeUnlockPlan {
  readonly unlockId: Id;
  readonly profileId: Id;
  readonly trigger: "after_outer_battlefield_intro_clear";
  readonly initialHomeModules: readonly SystemHomeModuleUnlock[];
  readonly initialResources: readonly ResourceGrant[];
  readonly originBasedBonuses: readonly OriginBasedHomeBonus[];
  readonly nextMainObjectives: readonly MainObjective[];
}

export interface ProfileAge18State {
  readonly awakeningResolution?: Age18AwakeningResolution;
  readonly outerBattlefieldIntro?: {
    readonly status: "pending" | "in_progress" | "cleared" | "failed_retryable";
    readonly runConfig?: OuterBattlefieldIntroRunConfig;
    readonly attempts: number;
    readonly lastFailureReason?: string;
  };
  readonly systemHome?: {
    readonly status: "locked" | "unlock_pending" | "unlocked";
    readonly unlockPlan?: SystemHomeUnlockPlan;
  };
}
