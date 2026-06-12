import { SeededRng } from "../../sim/core/SeededRng";
import { applyAntiWeirdnessRules, buildDestinyEligibilityInputFromNinePalace } from "../../ninePalace/NinePalaceDestinyEngine";
import { applyDestinyConflictSynergy } from "../../destinyV2/DestinyConflictSynergyEngine";
import { evaluateDestinyEligibility } from "../../destinyV2/DestinyEligibilityEvaluator";
import { resolveDestinyMutation } from "../../destinyV2/DestinyMutationResolver";
import { projectDestinyLifeManifestationHooksForTraitIds } from "../../destinyV2/DestinyLifeManifestationHooks";
import {
  DestinyV2Registry,
  loadDestinyV2Registry
} from "../../destinyV2/DestinyV2Registry";
import {
  loadDestinyRegistry,
  type DestinyRegistry
} from "../destiny/DestinyRegistry";
import type {
  DestinyDefinitionV2,
  DestinyConflictSynergyResult,
  DestinyEligibilityResult as DestinyV2EligibilityResult,
  DestinyMutationResolutionResult,
  Id
} from "../../types/destiny-eligibility-types.v0.1";
import type {
  DestinyFateAlignmentInfo,
  DestinyQuality,
  CharacterCreationLocks,
  DestinyRollDebugInfo,
  DestinyRollDraft,
  DestinyRoller,
  DestinyRollSlotKey,
  DestinySlotType,
  DestinyTraitDefinition,
  FateMeterState,
  GenerateDestinyRollInput,
  NinePalaceDestinyRollDebugInfo
} from "../../types/destiny-types.v0.1";
import type { NinePalaceEvaluation } from "../../types/nine-palace-fate-types.v0.1";

const SLOT_KEYS = ["main", "secondary0", "secondary1", "flaw"] as const satisfies readonly DestinyRollSlotKey[];
const SLOT_TYPES: Readonly<Record<DestinyRollSlotKey, Exclude<DestinySlotType, "hidden">>> = {
  main: "main",
  secondary0: "secondary",
  secondary1: "secondary",
  flaw: "flaw"
};
const QUALITY_RANK: Readonly<Record<DestinyDefinitionV2["quality"], number>> = {
  flaw: 0,
  mortal: 1,
  good: 2,
  rare: 3,
  arcane: 4,
  earth: 5,
  heaven: 6,
  reversal: 6,
  forbidden: 7
};
const SUPPORT_SCORE_BY_LEVEL: Readonly<Record<DestinyV2EligibilityResult["supportLevel"], number>> = {
  none: 0,
  weak: 25,
  normal: 60,
  strong: 90
};
const ANTI_WEIRDNESS_ORIGINAL_IDS = new Set<string>([
  "destiny_heaven_jealous_talent",
  "destiny_waste_root_reversal",
  "destiny_cowardly_supreme"
]);
const ALIGNMENT_LABELS: Readonly<Record<DestinyFateAlignmentInfo["alignment"], string>> = {
  matched: "命盘相合",
  conflicted: "命盘相冲",
  mutated: "命盘异变",
  neutral: "命盘未定"
};

interface SlotResolution {
  readonly slot: DestinyRollSlotKey;
  readonly originalDestinyId: Id;
  readonly finalDestinyId: Id;
  readonly eligibilityResult: DestinyV2EligibilityResult;
  readonly mutationResults: readonly DestinyMutationResolutionResult[];
  readonly alignment: DestinyFateAlignmentInfo;
  readonly locked: boolean;
}

interface CandidateScore {
  readonly destiny: DestinyDefinitionV2;
  readonly score: number;
  readonly eligibilityResult: DestinyV2EligibilityResult;
}

interface SlotConvergenceResult {
  readonly resolutions: readonly SlotResolution[];
  readonly conflictSynergyResult: DestinyConflictSynergyResult;
}

export class OpeningDestinyV2Roller implements DestinyRoller {
  private readonly registry: DestinyV2Registry;
  private readonly legacyRegistry: DestinyRegistry;

  constructor(registry = loadDestinyV2Registry(), legacyRegistry = loadDestinyRegistry()) {
    this.registry = registry;
    this.legacyRegistry = legacyRegistry;
  }

  generate(input: GenerateDestinyRollInput): DestinyRollDraft {
    validateInput(input);
    const evaluation = input.openingInnateDraft?.ninePalaceEvaluation;
    if (evaluation === undefined) {
      throw new Error("Opening ninePalaceEvaluation is required for destiny v2 rolling");
    }

    const rng = new SeededRng(`${input.seed}:destiny_v2_roll:${input.rerollIndex}`, "destiny_v2_roll");
    const fateMeterBefore = normalizeFateMeter(input.fateMeter, this.legacyRegistry);
    const selectedIds: string[] = [];
    const selectedFlawIds: string[] = [];
    const debugWeights: Record<string, number> = {};
    const slotResolutions: SlotResolution[] = [];

    for (const slot of SLOT_KEYS) {
      const locked = getLockedTrait(slot, input);
      if (locked !== undefined) {
        const lockedDestiny = this.registry.getDestiny(locked.id);
        const eligibilityResult = evaluateDestinyEligibility(
          buildDestinyEligibilityInputFromNinePalace(evaluation, {
            destinyRegistry: this.registry,
            selectedDestinyIds: selectedIds,
            selectedFlawIds
          }),
          lockedDestiny
        );
        const resolution = createSlotResolution({
          slot,
          originalDestiny: lockedDestiny,
          finalDestiny: lockedDestiny,
          eligibilityResult,
          mutationResults: [],
          locked: true,
          ...(input.previousDraft?.debug.ninePalace?.slotAlignments[slot] === undefined
            ? {}
            : { forcedAlignmentInfo: input.previousDraft.debug.ninePalace.slotAlignments[slot] })
        });
        slotResolutions.push(resolution);
        addSelectedId(slot, lockedDestiny.id, selectedIds, selectedFlawIds);
        continue;
      }

      const resolution = this.resolveSlot({
        slot,
        evaluation,
        selectedIds,
        selectedFlawIds,
        previousTraitIds: input.previousTraitIds ?? [],
        fateMeterBefore,
        rng: rng.fork(slot),
        debugWeights
      });
      slotResolutions.push(resolution);
      addSelectedId(slot, resolution.finalDestinyId, selectedIds, selectedFlawIds);
    }

    const convergenceResult = this.convergeSlotResolutions(slotResolutions, evaluation);
    const conflictSynergyResult = convergenceResult.conflictSynergyResult;
    const finalSlotResolutions = convergenceResult.resolutions;
    const main = this.toLegacyTrait(finalSlotResolutions[0]!.finalDestinyId);
    const secondary0 = this.toLegacyTrait(finalSlotResolutions[1]!.finalDestinyId);
    const secondary1 = this.toLegacyTrait(finalSlotResolutions[2]!.finalDestinyId);
    const flaw = this.toLegacyTrait(finalSlotResolutions[3]!.finalDestinyId);
    const lifeManifestationHooks = projectDestinyLifeManifestationHooksForTraitIds(
      finalSlotResolutions.map((resolution) => resolution.finalDestinyId),
      { registry: this.registry }
    );
    const fateMeterAfter = updateFateMeter(fateMeterBefore, main.quality, this.legacyRegistry);
    const ninePalaceDebug = buildNinePalaceDebug(finalSlotResolutions, conflictSynergyResult);
    const debug: DestinyRollDebugInfo = {
      attempts: Object.keys(debugWeights).length,
      rejectedByExclusive: conflictSynergyResult.rerollDestinyIds.map((id) => `destiny_v2:${id}`),
      selectedWeights: Object.freeze({ ...debugWeights }),
      fateMeterBefore,
      fateMeterAfter,
      ninePalace: ninePalaceDebug
    };

    return deepFreeze({
      draftId: input.draftId,
      seed: input.seed,
      rerollIndex: input.rerollIndex,
      destinies: {
        main,
        secondary: [secondary0, secondary1],
        flaw,
        synergies: conflictSynergyResult.synergies.map(toLegacySynergyRule),
        softConflicts: conflictSynergyResult.conflictWarnings,
        synergyWarnings: conflictSynergyResult.synergyWarnings,
        conflictWarnings: conflictSynergyResult.conflictWarnings,
        warnings: conflictSynergyResult.warnings,
        lifeManifestationHooks
      },
      fateMeter: fateMeterAfter,
      ...(input.locks === undefined ? {} : { locks: input.locks }),
      debug
    });
  }

  private convergeSlotResolutions(
    resolutions: readonly SlotResolution[],
    evaluation: NinePalaceEvaluation
  ): SlotConvergenceResult {
    let current = resolutions;

    for (let pass = 0; pass < 4; pass += 1) {
      const before = toResolutionSignature(current);
      const conflictSynergyResult = applyDestinyConflictSynergy(
        current.map((resolution) => this.registry.getDestiny(resolution.finalDestinyId)),
        { registry: this.registry }
      );
      current = this.applyCrossSlotResult(current, conflictSynergyResult, evaluation);
      current = this.applyContextualAntiResults(current, evaluation);
      current = this.ensureUniqueFinalDestinies(current, evaluation);

      if (toResolutionSignature(current) === before) {
        break;
      }
    }

    return {
      resolutions: current,
      conflictSynergyResult: applyDestinyConflictSynergy(
        current.map((resolution) => this.registry.getDestiny(resolution.finalDestinyId)),
        { registry: this.registry }
      )
    };
  }

  private resolveSlot(options: {
    readonly slot: DestinyRollSlotKey;
    readonly evaluation: NinePalaceEvaluation;
    readonly selectedIds: readonly string[];
    readonly selectedFlawIds: readonly string[];
    readonly previousTraitIds: readonly string[];
    readonly fateMeterBefore: FateMeterState;
    readonly rng: SeededRng;
    readonly debugWeights: Record<string, number>;
  }): SlotResolution {
    const slotType = SLOT_TYPES[options.slot];
    const candidates = this.getCandidateScores(options);
    if (candidates.length === 0) {
      throw new Error(`No destiny v2 candidates available for ${slotType} slot`);
    }
    const chosen = pickHighestScore(candidates, options.rng);
    options.debugWeights[`${options.slot}:${chosen.destiny.id}`] = chosen.score;
    const fallbackInclusiveCandidates = this.getCandidateScores({
      ...options,
      includeFallbackCandidates: true
    });
    const orderedCandidates = uniqueStable([chosen, ...candidates, ...fallbackInclusiveCandidates]);
    const selectedIds = new Set([...options.selectedIds, ...options.selectedFlawIds]);
    for (const candidate of orderedCandidates) {
      const resolution = this.createResolutionFromCandidate({
        slot: options.slot,
        candidate,
        evaluation: options.evaluation,
        selectedIds: options.selectedIds,
        selectedFlawIds: options.selectedFlawIds
      });
      if (isAllowedForSlot(this.registry.getDestiny(resolution.finalDestinyId), options.slot) && !selectedIds.has(resolution.finalDestinyId)) {
        return resolution;
      }
    }

    throw new Error(`No slot-compatible destiny v2 candidates available for ${slotType} slot`);
  }

  private createResolutionFromCandidate(options: {
    readonly slot: DestinyRollSlotKey;
    readonly candidate: CandidateScore;
    readonly evaluation: NinePalaceEvaluation;
    readonly selectedIds: readonly string[];
    readonly selectedFlawIds: readonly string[];
  }): SlotResolution {
    const resolved = applyAntiWeirdnessRules([options.candidate.destiny.id], options.evaluation, {
      destinyRegistry: this.registry,
      selectedDestinyIds: options.selectedIds,
      selectedFlawIds: options.selectedFlawIds
    });
    const finalDestinyId = resolved.finalDestinyIds[0] ?? options.candidate.destiny.id;
    const finalDestiny = this.registry.getDestiny(finalDestinyId);

    return createSlotResolution({
      slot: options.slot,
      originalDestiny: options.candidate.destiny,
      finalDestiny,
      eligibilityResult: options.candidate.eligibilityResult,
      mutationResults: resolved.mutationResults,
      locked: false
    });
  }

  private getCandidateScores(options: {
    readonly slot: DestinyRollSlotKey;
    readonly evaluation: NinePalaceEvaluation;
    readonly selectedIds: readonly string[];
    readonly selectedFlawIds: readonly string[];
    readonly previousTraitIds: readonly string[];
    readonly fateMeterBefore: FateMeterState;
    readonly includeFallbackCandidates?: boolean;
  }): readonly CandidateScore[] {
    const slotType = SLOT_TYPES[options.slot];
    const input = buildDestinyEligibilityInputFromNinePalace(options.evaluation, {
      destinyRegistry: this.registry,
      selectedDestinyIds: options.selectedIds,
      selectedFlawIds: options.selectedFlawIds
    });
    const selected = new Set([...options.selectedIds, ...options.selectedFlawIds]);
    const scoredPool = this.registry.getDestiniesForSlot(slotType)
      .filter((destiny) => !selected.has(destiny.id))
      .filter((destiny) => !isSourceMutationOnly(destiny))
      .map((destiny) => {
        const eligibilityResult = evaluateDestinyEligibility(input, destiny);
        return {
          destiny,
          eligibilityResult,
          score: scoreCandidate(destiny, eligibilityResult, options.evaluation, options.previousTraitIds, options.fateMeterBefore)
        };
      });
    const strictCandidates = sortCandidates(scoredPool.filter((candidate) => candidate.score > 0));
    const fallbackCandidates = sortCandidates(scoredPool
      .map((candidate) => ({
        ...candidate,
        score: scoreNeutralFallbackCandidate(candidate.destiny, candidate.eligibilityResult, options.evaluation)
      }))
      .filter((candidate) => candidate.score > 0));
    if (options.includeFallbackCandidates === true) {
      return sortCandidates([...strictCandidates, ...fallbackCandidates]);
    }
    if (strictCandidates.length > 0) {
      return strictCandidates;
    }

    return fallbackCandidates;
  }

  private applyCrossSlotResult(
    resolutions: readonly SlotResolution[],
    conflictSynergyResult: DestinyConflictSynergyResult,
    evaluation: NinePalaceEvaluation
  ): readonly SlotResolution[] {
    const finalDestinyIds = conflictSynergyResult.finalDestinyIds;
    const availableIds = [...finalDestinyIds];
    const blockedIds = new Set([
      ...conflictSynergyResult.removedDestinyIds,
      ...resolutions
        .filter((resolution) => resolution.originalDestinyId !== resolution.finalDestinyId)
        .map((resolution) => resolution.originalDestinyId)
    ]);
    const usedIds = new Set<string>();
    return resolutions.map((resolution) => {
      if (availableIds.includes(resolution.finalDestinyId) && !usedIds.has(resolution.finalDestinyId)) {
        usedIds.add(resolution.finalDestinyId);
        return resolution;
      }
      const mutationId = availableIds.find((id) => !usedIds.has(id) && this.registry.getDestiny(id).allowedSlots.includes(SLOT_TYPES[resolution.slot]));
      if (mutationId !== undefined) {
        usedIds.add(mutationId);
        const finalDestiny = this.registry.getDestiny(mutationId);
        return createSlotResolution({
          slot: resolution.slot,
          originalDestiny: this.registry.getDestiny(resolution.originalDestinyId),
          finalDestiny,
          eligibilityResult: resolution.eligibilityResult,
          mutationResults: resolution.mutationResults,
          locked: resolution.locked,
          forcedAlignment: "mutated"
        });
      }

      const replacement = this.getCandidateScores({
        slot: resolution.slot,
        evaluation,
        selectedIds: [...usedIds],
        selectedFlawIds: [],
        previousTraitIds: [],
        fateMeterBefore: { value: 0, guaranteeRareNext: false }
      }).find((candidate) => !usedIds.has(candidate.destiny.id) && !blockedIds.has(candidate.destiny.id))?.destiny;
      if (replacement === undefined) {
        usedIds.add(resolution.finalDestinyId);
        return resolution;
      }
      usedIds.add(replacement.id);
      return createSlotResolution({
        slot: resolution.slot,
        originalDestiny: this.registry.getDestiny(resolution.originalDestinyId),
        finalDestiny: replacement,
        eligibilityResult: resolution.eligibilityResult,
        mutationResults: resolution.mutationResults,
        locked: resolution.locked,
        forcedAlignment: "conflicted"
      });
    });
  }

  private applyContextualAntiResults(
    resolutions: readonly SlotResolution[],
    evaluation: NinePalaceEvaluation
  ): readonly SlotResolution[] {
    const finalDestinyIds = resolutions.map((resolution) => resolution.finalDestinyId);
    const selectedFlawIds = finalDestinyIds.filter((id) => this.registry.getDestiny(id).kind === "flaw");

    return resolutions.map((resolution, index) => {
      if (resolution.locked) {
        return resolution;
      }

      const currentDestiny = this.registry.getDestiny(resolution.finalDestinyId);
      const contextualInput = buildDestinyEligibilityInputFromNinePalace(evaluation, {
        destinyRegistry: this.registry,
        selectedDestinyIds: finalDestinyIds,
        selectedFlawIds
      });
      const contextualEligibility = evaluateDestinyEligibility(contextualInput, currentDestiny);
      const mustResolveContext = contextualEligibility.antiMatched.length > 0 ||
        (ANTI_WEIRDNESS_ORIGINAL_IDS.has(currentDestiny.id) && !contextualEligibility.eligible);
      if (!mustResolveContext) {
        return resolution;
      }

      const selectedWithoutCurrent = finalDestinyIds.filter((_, selectedIndex) => selectedIndex !== index);
      const mutationResult = resolveDestinyMutation(currentDestiny, contextualEligibility, { registry: this.registry });
      if (mutationResult.action === "mutate" && mutationResult.resolvedDestinyId !== undefined) {
        const mutationDestiny = this.registry.getDestiny(mutationResult.resolvedDestinyId);
        if (isAllowedForSlot(mutationDestiny, resolution.slot) && !selectedWithoutCurrent.includes(mutationDestiny.id)) {
          return createSlotResolution({
            slot: resolution.slot,
            originalDestiny: currentDestiny,
            finalDestiny: mutationDestiny,
            eligibilityResult: contextualEligibility,
            mutationResults: [...resolution.mutationResults, mutationResult],
            locked: false,
            forcedAlignment: "mutated"
          });
        }
      }

      const replacement = this.getCandidateScores({
        slot: resolution.slot,
        evaluation,
        selectedIds: selectedWithoutCurrent,
        selectedFlawIds: [],
        previousTraitIds: [],
        fateMeterBefore: { value: 0, guaranteeRareNext: false }
      }).find((candidate) => !selectedWithoutCurrent.includes(candidate.destiny.id));
      if (replacement === undefined) {
        return resolution;
      }

      return createSlotResolution({
        slot: resolution.slot,
        originalDestiny: currentDestiny,
        finalDestiny: replacement.destiny,
        eligibilityResult: replacement.eligibilityResult,
        mutationResults: resolution.mutationResults,
        locked: false,
        forcedAlignment: "conflicted"
      });
    });
  }

  private ensureUniqueFinalDestinies(
    resolutions: readonly SlotResolution[],
    evaluation: NinePalaceEvaluation
  ): readonly SlotResolution[] {
    const resolvedSlots: SlotResolution[] = [];

    for (let index = 0; index < resolutions.length; index += 1) {
      const resolution = resolutions[index]!;
      const usedIds = resolvedSlots.map((resolvedSlot) => resolvedSlot.finalDestinyId);
      if (!usedIds.includes(resolution.finalDestinyId)) {
        resolvedSlots.push(resolution);
        continue;
      }
      if (resolution.locked) {
        resolvedSlots.push(resolution);
        continue;
      }

      const futureIds = resolutions.slice(index + 1).map((futureResolution) => futureResolution.finalDestinyId);
      const selectedWithoutCurrent = [...usedIds, ...futureIds];
      const selectedDestinyIds = selectedWithoutCurrent.filter((id) => this.registry.getDestiny(id).kind !== "flaw");
      const selectedFlawIds = selectedWithoutCurrent.filter((id) => this.registry.getDestiny(id).kind === "flaw");
      const replacement = this.getCandidateScores({
        slot: resolution.slot,
        evaluation,
        selectedIds: selectedDestinyIds,
        selectedFlawIds,
        previousTraitIds: [],
        fateMeterBefore: { value: 0, guaranteeRareNext: false },
        includeFallbackCandidates: true
      })
        .map((candidate) => this.createResolutionFromCandidate({
          slot: resolution.slot,
          candidate,
          evaluation,
          selectedIds: selectedDestinyIds,
          selectedFlawIds
        }))
        .find((candidateResolution) =>
          isAllowedForSlot(this.registry.getDestiny(candidateResolution.finalDestinyId), resolution.slot) &&
          !selectedWithoutCurrent.includes(candidateResolution.finalDestinyId)
        );

      resolvedSlots.push(replacement ?? resolution);
    }

    return resolvedSlots;
  }

  private toLegacyTrait(destinyId: Id): DestinyTraitDefinition {
    const destiny = this.registry.getDestiny(destinyId);
    const effects = flattenEffects(destiny);
    return {
      id: destiny.id,
      name: destiny.name,
      quality: mapDestinyQuality(destiny.quality),
      slotTypes: destiny.allowedSlots
        .filter((slot): slot is Exclude<DestinySlotType, "hidden"> => slot === "main" || slot === "secondary" || slot === "flaw"),
      ...(destiny.quality === "flaw" ? { calamitySeverity: "minor" as const } : {}),
      tags: destiny.tags,
      description: destiny.description,
      positiveEffects: effects.length === 0 ? [destiny.oneLine] : effects,
      negativeEffects: destiny.kind === "mutated" ? ["mutation:resolved_from_nine_palace"] : [],
      modifiers: {
        destinyV2: true,
        kind: destiny.kind,
        quality: destiny.quality
      },
      baseWeight: 100
    };
  }
}

function scoreCandidate(
  destiny: DestinyDefinitionV2,
  eligibility: DestinyV2EligibilityResult,
  evaluation: NinePalaceEvaluation,
  previousTraitIds: readonly string[],
  fateMeter: FateMeterState
): number {
  const qualityRank = QUALITY_RANK[destiny.quality];
  if (fateMeter.guaranteeRareNext && qualityRank < QUALITY_RANK.rare && destiny.quality !== "flaw") {
    return 0;
  }

  let score = qualityRank * 100;
  if (eligibility.eligible) {
    score += 1_000 + SUPPORT_SCORE_BY_LEVEL[eligibility.supportLevel] * 5;
  } else if (eligibility.antiMatched.length > 0 && eligibility.mutationCandidate !== undefined) {
    score += 900 + qualityRank * 120;
  } else if (eligibility.mutationCandidate !== undefined) {
    score += 500;
  } else {
    return 0;
  }
  score += getNinePalaceBiasScore(destiny, evaluation);
  if (previousTraitIds.includes(destiny.id)) {
    score *= 0.25;
  }
  return Math.max(0, Math.round(score));
}

function scoreNeutralFallbackCandidate(
  destiny: DestinyDefinitionV2,
  eligibility: DestinyV2EligibilityResult,
  evaluation: NinePalaceEvaluation
): number {
  if (eligibility.eligible || eligibility.mutationCandidate !== undefined || eligibility.antiMatched.length > 0) {
    return 0;
  }
  if (ANTI_WEIRDNESS_ORIGINAL_IDS.has(destiny.id)) {
    return 0;
  }
  return Math.max(1, Math.round(QUALITY_RANK[destiny.quality] * 15 + getNinePalaceBiasScore(destiny, evaluation) * 0.05));
}

function sortCandidates(candidates: readonly CandidateScore[]): readonly CandidateScore[] {
  return [...candidates].sort((first, second) => second.score - first.score || first.destiny.id.localeCompare(second.destiny.id));
}

function isAllowedForSlot(destiny: DestinyDefinitionV2, slot: DestinyRollSlotKey): boolean {
  return destiny.allowedSlots.includes(SLOT_TYPES[slot]);
}

function toResolutionSignature(resolutions: readonly SlotResolution[]): string {
  return resolutions.map((resolution) => `${resolution.slot}:${resolution.finalDestinyId}`).join("|");
}

function getNinePalaceBiasScore(destiny: DestinyDefinitionV2, evaluation: NinePalaceEvaluation): number {
  const strippedId = stripDestinyPrefix(destiny.id);
  let score = 0;
  for (const tag of evaluation.tags.destinyBiasTags) {
    if (tag === `destinyBias:${strippedId}`) {
      score += 10_000;
      continue;
    }
    const key = tag.slice("destinyBias:".length);
    if (key.length > 0 && (strippedId.includes(key) || destiny.tags.some((destinyTag) => destinyTag.includes(key)))) {
      score += 800;
    }
  }
  for (const tag of [...evaluation.tags.lifeEventBiasTags, ...evaluation.tags.rootBiasTags, ...evaluation.tags.modeBiasTags]) {
    const token = tag.includes(":") ? tag.split(":").at(-1)! : tag;
    if (destiny.tags.some((destinyTag) => token.includes(destinyTag) || destinyTag.includes(token))) {
      score += 120;
    }
  }
  return score;
}

function createSlotResolution(options: {
  readonly slot: DestinyRollSlotKey;
  readonly originalDestiny: DestinyDefinitionV2;
  readonly finalDestiny: DestinyDefinitionV2;
  readonly eligibilityResult: DestinyV2EligibilityResult;
  readonly mutationResults: readonly DestinyMutationResolutionResult[];
  readonly locked: boolean;
  readonly forcedAlignment?: DestinyFateAlignmentInfo["alignment"];
  readonly forcedAlignmentInfo?: DestinyFateAlignmentInfo;
}): SlotResolution {
  if (options.forcedAlignmentInfo !== undefined) {
    return {
      slot: options.slot,
      originalDestinyId: options.originalDestiny.id,
      finalDestinyId: options.finalDestiny.id,
      eligibilityResult: options.eligibilityResult,
      mutationResults: options.mutationResults.map(cloneJson),
      locked: options.locked,
      alignment: cloneJson(options.forcedAlignmentInfo)
    };
  }

  const mutation = options.mutationResults.find(
    (result) => result.action === "mutate" && result.resolvedDestinyId === options.finalDestiny.id
  );
  const alignment = options.forcedAlignment ??
    (mutation !== undefined || options.originalDestiny.id !== options.finalDestiny.id
      ? "mutated"
      : options.eligibilityResult.antiMatched.length > 0
        ? "conflicted"
        : options.eligibilityResult.eligible
          ? "matched"
          : "neutral");
  const reasonTags = uniqueStable([
    ...options.eligibilityResult.reasonTags,
    ...options.mutationResults.flatMap((result) => result.debugTags),
    ...(options.locked ? ["locked"] : [])
  ]);

  return {
    slot: options.slot,
    originalDestinyId: options.originalDestiny.id,
    finalDestinyId: options.finalDestiny.id,
    eligibilityResult: options.eligibilityResult,
    mutationResults: options.mutationResults.map(cloneJson),
    locked: options.locked,
    alignment: {
      traitId: options.finalDestiny.id,
      alignment,
      label: ALIGNMENT_LABELS[alignment],
      reasonTags,
      ...(options.originalDestiny.id === options.finalDestiny.id ? {} : { sourceTraitId: options.originalDestiny.id })
    }
  };
}

function buildNinePalaceDebug(
  resolutions: readonly SlotResolution[],
  conflictSynergyResult: DestinyConflictSynergyResult
): NinePalaceDestinyRollDebugInfo {
  const slotAlignments = Object.fromEntries(resolutions.map((resolution) => [resolution.slot, resolution.alignment])) as Record<
    DestinyRollSlotKey,
    DestinyFateAlignmentInfo
  >;
  return {
    slotAlignments,
    finalDestinyIds: resolutions.map((resolution) => resolution.finalDestinyId),
    rerollDestinyIds: conflictSynergyResult.rerollDestinyIds,
    eligibilityResults: resolutions.map((resolution) => cloneJson(resolution.eligibilityResult)),
    mutationResults: resolutions.flatMap((resolution) => resolution.mutationResults.map(cloneJson)),
    conflictSynergyResult: cloneJson(conflictSynergyResult),
    debugTags: uniqueStable([
      ...resolutions.flatMap((resolution) => resolution.alignment.reasonTags),
      ...conflictSynergyResult.debugTags
    ])
  };
}

function pickHighestScore(candidates: readonly CandidateScore[], rng: SeededRng): CandidateScore {
  const bestScore = candidates[0]!.score;
  const nearBest = candidates.filter((candidate) => bestScore - candidate.score <= 2);
  if (nearBest.length === 1) {
    return nearBest[0]!;
  }
  return rng.pickWeighted(nearBest.map((candidate) => ({ item: candidate, weight: Math.max(1, candidate.score) })));
}

function getLockedTrait(slot: DestinyRollSlotKey, input: GenerateDestinyRollInput): DestinyTraitDefinition | undefined {
  const lockName = getLockName(slot);
  if (input.locks?.[lockName] !== true) {
    return undefined;
  }
  if (input.previousDraft === undefined) {
    throw new Error(`previousDraft is required when locking ${lockName}`);
  }
  switch (slot) {
    case "main":
      return cloneJson(input.previousDraft.destinies.main);
    case "secondary0":
      return cloneJson(input.previousDraft.destinies.secondary[0]);
    case "secondary1":
      return cloneJson(input.previousDraft.destinies.secondary[1]);
    case "flaw":
      return cloneJson(input.previousDraft.destinies.flaw);
  }
}

function getLockName(slot: DestinyRollSlotKey): keyof Pick<
  CharacterCreationLocks,
  "mainDestiny" | "secondaryDestiny0" | "secondaryDestiny1" | "flawDestiny"
> {
  switch (slot) {
    case "main":
      return "mainDestiny";
    case "secondary0":
      return "secondaryDestiny0";
    case "secondary1":
      return "secondaryDestiny1";
    case "flaw":
      return "flawDestiny";
  }
}

function addSelectedId(
  slot: DestinyRollSlotKey,
  destinyId: string,
  selectedIds: string[],
  selectedFlawIds: string[]
): void {
  if (slot === "flaw") {
    selectedFlawIds.push(destinyId);
    return;
  }
  selectedIds.push(destinyId);
}

function mapDestinyQuality(quality: DestinyDefinitionV2["quality"]): DestinyQuality {
  switch (quality) {
    case "arcane":
      return "mystic";
    case "earth":
      return "earthly";
    case "heaven":
      return "heavenly";
    case "reversal":
      return "defiant";
    case "mortal":
    case "good":
    case "rare":
    case "forbidden":
    case "flaw":
      return quality;
  }
}

function flattenEffects(destiny: DestinyDefinitionV2): readonly string[] {
  return uniqueStable([
    ...(destiny.effects.lifeSim ?? []),
    ...(destiny.effects.outerBattlefield ?? []),
    ...(destiny.effects.outgame ?? []),
    ...(destiny.effects.horde ?? []),
    ...(destiny.effects.deckbuilder ?? []),
    ...(destiny.effects.autochess ?? [])
  ]);
}

function toLegacySynergyRule(rule: { readonly ids: readonly string[]; readonly name: string; readonly effectTags: readonly string[] }) {
  return {
    id: `destiny_v2_synergy:${rule.ids.join("+")}`,
    traits: rule.ids,
    name: rule.name,
    description: rule.name,
    effects: rule.effectTags
  };
}

function normalizeFateMeter(fateMeter: FateMeterState | undefined, registry: DestinyRegistry): FateMeterState {
  const value = fateMeter?.value ?? registry.rerollRules.fateMeter.initial;
  return {
    value,
    ...(fateMeter?.lastHighQualityAtReroll === undefined ? {} : { lastHighQualityAtReroll: fateMeter.lastHighQualityAtReroll }),
    guaranteeRareNext: fateMeter?.guaranteeRareNext === true || value >= registry.rerollRules.fateMeter.thresholdGuaranteeRare
  };
}

function updateFateMeter(fateMeter: FateMeterState, mainQuality: DestinyQuality, registry: DestinyRegistry): FateMeterState {
  const rules = registry.rerollRules.fateMeter;
  const qualityRank = getLegacyQualityRank(registry, mainQuality, 0);
  const rareRank = getLegacyQualityRank(registry, "rare", 3);
  const mysticRank = getLegacyQualityRank(registry, "mystic", 4);
  let nextValue = fateMeter.value;
  let lastHighQualityAtReroll = fateMeter.lastHighQualityAtReroll;

  if (qualityRank < rareRank) {
    nextValue += rules.noRareOrAboveDelta;
  } else if (rules.mysticOrAboveReset && qualityRank >= mysticRank) {
    nextValue = rules.initial;
    lastHighQualityAtReroll = undefined;
  } else {
    nextValue += rules.rareDelta;
    lastHighQualityAtReroll = fateMeter.value;
  }
  nextValue = Math.max(rules.initial, nextValue);

  return {
    value: nextValue,
    ...(lastHighQualityAtReroll === undefined ? {} : { lastHighQualityAtReroll }),
    guaranteeRareNext: nextValue >= rules.thresholdGuaranteeRare
  };
}

function getLegacyQualityRank(registry: DestinyRegistry, quality: DestinyQuality, fallback: number): number {
  if (quality === "flaw") {
    return 0;
  }
  try {
    return registry.getQuality(quality).rank;
  } catch {
    return fallback;
  }
}

function isSourceMutationOnly(destiny: DestinyDefinitionV2): boolean {
  return Array.isArray(destiny.eligibility.sourceMutationOf) && destiny.eligibility.sourceMutationOf.length > 0;
}

function stripDestinyPrefix(id: string): string {
  return id.startsWith("destiny_") ? id.slice("destiny_".length) : id;
}

function validateInput(input: GenerateDestinyRollInput): void {
  if (input.seed.length === 0) {
    throw new Error("Destiny v2 roll seed must not be empty");
  }
  if (input.draftId.length === 0) {
    throw new Error("Destiny v2 roll draftId must not be empty");
  }
  if (!Number.isInteger(input.rerollIndex) || input.rerollIndex < 0) {
    throw new Error("Destiny v2 roll rerollIndex must be a non-negative integer");
  }
}

function uniqueStable<T>(values: readonly T[]): T[] {
  return [...new Set(values)];
}

function cloneJson<T>(value: T): T {
  return structuredClone(value);
}

function deepFreeze<T>(value: T): T {
  if (value !== null && typeof value === "object" && !Object.isFrozen(value)) {
    Object.freeze(value);
    for (const child of Object.values(value as Record<string, unknown>)) {
      deepFreeze(child);
    }
  }
  return value;
}
