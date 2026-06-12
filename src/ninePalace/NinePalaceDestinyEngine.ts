import { applyDestinyConflictSynergy } from "../destinyV2/DestinyConflictSynergyEngine";
import { evaluateDestinyEligibility } from "../destinyV2/DestinyEligibilityEvaluator";
import { resolveDestinyMutation } from "../destinyV2/DestinyMutationResolver";
import { loadDestinyV2Registry } from "../destinyV2/DestinyV2Registry";
import type {
  DestinyDefinitionV2,
  DestinyEligibilityEvaluationInput,
  DestinyEligibilityResult as DestinyV2EligibilityResult,
  DestinyMutationResolutionResult,
  Id
} from "../types/destiny-eligibility-types.v0.1";
import type {
  DestinyEligibilityResult,
  NinePalaceDestinyEngineContext,
  NinePalaceDestinyResolutionResult,
  NinePalaceEvaluation
} from "../types/nine-palace-fate-types.v0.1";

const SUPPORT_SCORE_BY_LEVEL: Readonly<Record<DestinyV2EligibilityResult["supportLevel"], number>> = {
  none: 0,
  weak: 25,
  normal: 60,
  strong: 90
};

export function buildDestinyEligibilityInputFromNinePalace(
  evaluation: NinePalaceEvaluation,
  context: NinePalaceDestinyEngineContext = {}
): DestinyEligibilityEvaluationInput {
  return {
    attributes: { ...evaluation.attributes },
    derivedScores: { ...evaluation.derived },
    tags: collectEligibilityTags(evaluation, context.tags),
    ...(context.selectedDestinyIds !== undefined
      ? { selectedDestinyIds: [...context.selectedDestinyIds] }
      : {}),
    ...(context.selectedFlawIds !== undefined ? { selectedFlawIds: [...context.selectedFlawIds] } : {}),
    ...(context.extraAttributes !== undefined ? { extraAttributes: { ...context.extraAttributes } } : {})
  };
}

export function evaluateNinePalaceDestinyEligibility(
  destinyId: Id,
  evaluation: NinePalaceEvaluation,
  context: NinePalaceDestinyEngineContext = {}
): DestinyEligibilityResult {
  const registry = context.destinyRegistry ?? loadDestinyV2Registry();
  const destiny = registry.getDestiny(destinyId);
  const input = buildDestinyEligibilityInputFromNinePalace(evaluation, context);
  const result = evaluateDestinyEligibility(input, destiny);

  return toNinePalaceEligibilityResult(result);
}

export function applyAntiWeirdnessRules(
  selectionIds: readonly Id[],
  evaluation: NinePalaceEvaluation,
  context: NinePalaceDestinyEngineContext = {}
): NinePalaceDestinyResolutionResult {
  const registry = context.destinyRegistry ?? loadDestinyV2Registry();
  const originalSelectionIds = uniqueStable([...selectionIds, ...(context.selectedDestinyIds ?? [])]);
  const selectedCandidateIds = uniqueStable(selectionIds);
  const resolvedIds: Id[] = [];
  const rerollDestinyIds: Id[] = [];
  const eligibilityResults: DestinyEligibilityResult[] = [];
  const destinyEligibilityResults: DestinyV2EligibilityResult[] = [];
  const mutationResults: DestinyMutationResolutionResult[] = [];
  const debugTags: string[] = [];

  for (const destinyId of selectedCandidateIds) {
    const candidate = registry.getDestiny(destinyId);
    const eligibilityContext: NinePalaceDestinyEngineContext = {
      ...context,
      destinyRegistry: registry,
      selectedDestinyIds: originalSelectionIds
    };
    const input = buildDestinyEligibilityInputFromNinePalace(evaluation, eligibilityContext);
    const destinyEligibility = evaluateDestinyEligibility(input, candidate);
    const compatibilityEligibility = toNinePalaceEligibilityResult(destinyEligibility);
    const mutationResult = resolveDestinyMutation(candidate, destinyEligibility, { registry });

    destinyEligibilityResults.push(destinyEligibility);
    eligibilityResults.push(compatibilityEligibility);
    mutationResults.push(mutationResult);
    debugTags.push(...toEligibilityDebugTags(destinyEligibility), ...mutationResult.debugTags);

    if (mutationResult.action === "mutate" && mutationResult.resolvedDestinyId !== undefined) {
      resolvedIds.push(mutationResult.resolvedDestinyId);
      continue;
    }
    if (mutationResult.action === "keep") {
      resolvedIds.push(destinyId);
      continue;
    }
    rerollDestinyIds.push(destinyId);
  }

  const resolvedDestinies = uniqueStable(resolvedIds).map((destinyId) => registry.getDestiny(destinyId));
  const conflictSynergyResult = applyDestinyConflictSynergy(resolvedDestinies, { registry });
  const finalRerollDestinyIds = uniqueStable([...rerollDestinyIds, ...conflictSynergyResult.rerollDestinyIds]);
  const warnings = uniqueStable(conflictSynergyResult.warnings);
  const result: NinePalaceDestinyResolutionResult = {
    finalDestinyIds: [...conflictSynergyResult.finalDestinyIds],
    rerollDestinyIds: finalRerollDestinyIds,
    eligibilityResults: eligibilityResults.map(cloneJson),
    destinyEligibilityResults: destinyEligibilityResults.map(cloneJson),
    mutationResults: mutationResults.map(cloneJson),
    conflictSynergyResult: cloneJson(conflictSynergyResult),
    warnings,
    debugTags: uniqueStable([...debugTags, ...conflictSynergyResult.debugTags])
  };

  return deepFreeze(result);
}

function toNinePalaceEligibilityResult(result: DestinyV2EligibilityResult): DestinyEligibilityResult {
  const explanation = uniqueStable([
    ...result.reasonTags,
    `support:${result.supportLevel}`,
    ...result.antiMatched.map((_, index) => `anti:${index}`),
    ...result.supportMatched.map((_, index) => `supportMatched:${index}`),
    ...(result.mutationCandidate !== undefined ? [`mutation:${result.mutationCandidate}`] : [])
  ]);

  return {
    traitId: result.destinyId,
    eligible: result.eligible,
    supportScore: SUPPORT_SCORE_BY_LEVEL[result.supportLevel],
    contradictionScore: Math.min(100, result.antiMatched.length * 50),
    ...(result.mutationCandidate !== undefined ? { mutationTarget: result.mutationCandidate } : {}),
    explanation
  };
}

function toEligibilityDebugTags(result: DestinyV2EligibilityResult): string[] {
  return [
    `eligibility:${result.destinyId}:${result.eligible ? "eligible" : "blocked"}`,
    `eligibility:${result.destinyId}:support:${result.supportLevel}`,
    ...(result.antiMatched.length > 0 ? [`eligibility:${result.destinyId}:anti:${result.antiMatched.length}`] : []),
    ...(result.mutationCandidate !== undefined
      ? [`eligibility:${result.destinyId}:mutation:${result.mutationCandidate}`]
      : [])
  ];
}

function collectEligibilityTags(
  evaluation: NinePalaceEvaluation,
  contextTags: readonly string[] | undefined
): readonly string[] {
  return uniqueStable([
    ...evaluation.tags.destinyBiasTags,
    ...evaluation.tags.lifeEventBiasTags,
    ...evaluation.tags.hiddenFateBiasTags,
    ...evaluation.tags.rootBiasTags,
    ...evaluation.tags.modeBiasTags,
    ...(contextTags ?? [])
  ]);
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
