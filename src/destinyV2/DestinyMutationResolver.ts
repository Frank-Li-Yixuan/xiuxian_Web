import { loadDestinyV2Registry } from "./DestinyV2Registry";
import type {
  DestinyDefinitionV2,
  DestinyEligibilityResult,
  DestinyMutationResolutionReason,
  DestinyMutationResolutionResult,
  DestinyMutationResolverContext,
  Id
} from "../types/destiny-eligibility-types.v0.1";

export function resolveDestinyMutation(
  candidate: DestinyDefinitionV2,
  eligibilityResult: DestinyEligibilityResult,
  context: DestinyMutationResolverContext = {}
): DestinyMutationResolutionResult {
  const currentDepth = context.mutationDepth ?? 0;

  if (isSourceMutationOnly(candidate)) {
    return createRerollResult(candidate.id, "source_mutation_only", currentDepth);
  }

  const mutationReason = getMutationReason(eligibilityResult);
  if (mutationReason === undefined) {
    if (eligibilityResult.eligible) {
      return createKeepResult(candidate, currentDepth);
    }
    return createRerollResult(candidate.id, "missing_mutation_candidate", currentDepth);
  }

  if (currentDepth >= 1) {
    return createRerollResult(candidate.id, "max_mutation_depth", currentDepth);
  }

  const mutationCandidate = eligibilityResult.mutationCandidate;
  if (mutationCandidate === undefined) {
    if (eligibilityResult.eligible) {
      return createKeepResult(candidate, currentDepth);
    }
    return createRerollResult(candidate.id, "missing_mutation_candidate", currentDepth);
  }

  const registry = context.registry ?? loadDestinyV2Registry();
  const mutationTarget = getOptionalDestiny(registry, mutationCandidate);
  if (mutationTarget === undefined) {
    return createRerollResult(candidate.id, "missing_mutation_target", currentDepth, mutationCandidate);
  }
  if (!isMutationFromSource(mutationTarget, candidate.id)) {
    return createRerollResult(candidate.id, "invalid_mutation_source", currentDepth, mutationCandidate);
  }

  return {
    originalDestinyId: candidate.id,
    resolvedDestinyId: mutationTarget.id,
    action: "mutate",
    reason: mutationReason,
    mutationDepth: currentDepth + 1,
    resolvedDestiny: mutationTarget,
    debugTags: [
      `mutation:${mutationReason}`,
      `mutation:source:${candidate.id}`,
      `mutation:target:${mutationTarget.id}`,
      `mutation:depth:${currentDepth + 1}`
    ]
  };
}

function getMutationReason(
  eligibilityResult: DestinyEligibilityResult
): Extract<DestinyMutationResolutionReason, "anti_result" | "weak_support_result"> | undefined {
  if (eligibilityResult.antiMatched.length > 0 && eligibilityResult.mutationCandidate !== undefined) {
    return "anti_result";
  }
  if (eligibilityResult.supportLevel === "weak" && eligibilityResult.mutationCandidate !== undefined) {
    return "weak_support_result";
  }
  return undefined;
}

function createKeepResult(candidate: DestinyDefinitionV2, mutationDepth: number): DestinyMutationResolutionResult {
  return {
    originalDestinyId: candidate.id,
    resolvedDestinyId: candidate.id,
    action: "keep",
    reason: "eligible_original",
    mutationDepth,
    resolvedDestiny: candidate,
    debugTags: [`mutation:keep`, `mutation:source:${candidate.id}`, `mutation:depth:${mutationDepth}`]
  };
}

function createRerollResult(
  originalDestinyId: Id,
  reason: Exclude<DestinyMutationResolutionReason, "eligible_original" | "anti_result" | "weak_support_result">,
  mutationDepth: number,
  mutationCandidate?: Id
): DestinyMutationResolutionResult {
  return {
    originalDestinyId,
    action: "reroll",
    reason,
    mutationDepth,
    debugTags: [
      `mutation:reroll:${reason}`,
      `mutation:source:${originalDestinyId}`,
      ...(mutationCandidate !== undefined ? [`mutation:target:${mutationCandidate}`] : []),
      `mutation:depth:${mutationDepth}`
    ]
  };
}

function getOptionalDestiny(
  registry: DestinyMutationResolverContext["registry"],
  destinyId: string
): DestinyDefinitionV2 | undefined {
  try {
    return registry?.getDestiny(destinyId);
  } catch {
    return undefined;
  }
}

function isMutationFromSource(mutationTarget: DestinyDefinitionV2, sourceDestinyId: string): boolean {
  return mutationTarget.eligibility.sourceMutationOf?.includes(sourceDestinyId) === true;
}

function isSourceMutationOnly(destiny: DestinyDefinitionV2): boolean {
  return Array.isArray(destiny.eligibility.sourceMutationOf) && destiny.eligibility.sourceMutationOf.length > 0;
}
