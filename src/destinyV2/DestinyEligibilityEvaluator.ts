import type {
  DestinyDefinitionV2,
  DestinyEligibilityAttributeId,
  DestinyEligibilityEvaluationInput,
  DestinyEligibilityResult,
  EligibilityExpression
} from "../types/destiny-eligibility-types.v0.1";

export function evaluateDestinyEligibility(
  input: DestinyEligibilityEvaluationInput,
  destinyDefinition: DestinyDefinitionV2
): DestinyEligibilityResult {
  const eligibility = destinyDefinition.eligibility;

  if (hasExpressions(eligibility.sourceMutationOf)) {
    return {
      destinyId: destinyDefinition.id,
      eligible: false,
      supportLevel: "none",
      antiMatched: [],
      supportMatched: [],
      reasonTags: ["blocked:source_mutation_only"]
    };
  }

  const antiMatched = getMatchedExpressions(eligibility.anti, input);
  if (antiMatched.length > 0) {
    const result: DestinyEligibilityResult = {
      destinyId: destinyDefinition.id,
      eligible: false,
      supportLevel: "none",
      antiMatched,
      supportMatched: [],
      reasonTags: ["anti:matched"]
    };
    return withMutationCandidate(result, destinyDefinition.mutation?.antiResult);
  }

  const anyRequired = hasExpressions(eligibility.any);
  const anyMatched = getMatchedExpressions(eligibility.any, input);
  const anyPassed = !anyRequired || anyMatched.length > 0;
  const allRequired = hasExpressions(eligibility.all);
  const allMatched = getMatchedExpressions(eligibility.all, input);
  const allPassed = !allRequired || allMatched.length === eligibility.all?.length;
  const baseReasonTags = [
    anyRequired ? (anyPassed ? "base:any_matched" : "base:any_missing") : "base:any_not_required",
    allRequired ? (allPassed ? "base:all_matched" : "base:all_missing") : "base:all_not_required"
  ];

  if (!anyPassed || !allPassed) {
    return {
      destinyId: destinyDefinition.id,
      eligible: false,
      supportLevel: "none",
      antiMatched: [],
      supportMatched: [],
      reasonTags: baseReasonTags
    };
  }

  const supportMatched = getMatchedExpressions(eligibility.supportAny, input);
  const supportLevel = getSupportLevel(eligibility.supportAny, supportMatched.length);
  const mutationCandidate =
    supportLevel === "weak" ? destinyDefinition.mutation?.weakSupportResult : undefined;

  const result: DestinyEligibilityResult = {
    destinyId: destinyDefinition.id,
    eligible: true,
    supportLevel,
    antiMatched: [],
    supportMatched,
    reasonTags: [...baseReasonTags, `support:${supportLevel}`]
  };
  return withMutationCandidate(result, mutationCandidate);
}

function getSupportLevel(
  supportAny: readonly EligibilityExpression[] | undefined,
  matchedCount: number
): DestinyEligibilityResult["supportLevel"] {
  if (!hasExpressions(supportAny)) {
    return "normal";
  }
  if (matchedCount === 0) {
    return "weak";
  }
  if (matchedCount === 1) {
    return "normal";
  }
  return "strong";
}

function getMatchedExpressions(
  expressions: readonly EligibilityExpression[] | undefined,
  input: DestinyEligibilityEvaluationInput
): readonly EligibilityExpression[] {
  if (!hasExpressions(expressions)) {
    return [];
  }
  return expressions.filter((expression) => matchesExpression(expression, input));
}

function matchesExpression(
  expression: EligibilityExpression,
  input: DestinyEligibilityEvaluationInput
): boolean {
  if ("all" in expression) {
    return hasExpressions(expression.all) && expression.all.every((child) => matchesExpression(child, input));
  }
  if ("attr" in expression) {
    return matchesNumericValue(getAttributeValue(input, expression.attr), expression.gte, expression.lte);
  }
  if ("score" in expression) {
    return matchesNumericValue(input.derivedScores[expression.score], expression.gte, expression.lte);
  }
  if ("tag" in expression) {
    return new Set(input.tags).has(expression.tag);
  }
  if ("id" in expression) {
    return getSelectedIdSet(input).has(expression.id);
  }
  if ("flaw" in expression) {
    return new Set(input.selectedFlawIds ?? []).has(expression.flaw);
  }
  if ("sumAttrs" in expression) {
    const values: number[] = [];
    for (const attributeId of expression.sumAttrs) {
      const value = getAttributeValue(input, attributeId);
      if (value === undefined) {
        return false;
      }
      values.push(value);
    }
    const total = values.reduce((sum, value) => sum + value, 0);
    return matchesNumericValue(total, expression.gte, expression.lte);
  }
  return false;
}

function withMutationCandidate(
  result: DestinyEligibilityResult,
  mutationCandidate: string | undefined
): DestinyEligibilityResult {
  if (mutationCandidate === undefined) {
    return result;
  }
  return { ...result, mutationCandidate };
}

function getAttributeValue(
  input: DestinyEligibilityEvaluationInput,
  attributeId: DestinyEligibilityAttributeId
): number | undefined {
  if (attributeId in input.attributes) {
    return input.attributes[attributeId as keyof typeof input.attributes];
  }
  const value = input.extraAttributes?.[attributeId];
  return typeof value === "number" && Number.isFinite(value) ? value : undefined;
}

function getSelectedIdSet(input: DestinyEligibilityEvaluationInput): ReadonlySet<string> {
  return new Set([...(input.selectedDestinyIds ?? []), ...(input.selectedFlawIds ?? [])]);
}

function matchesNumericValue(value: number | undefined, gte: number | undefined, lte: number | undefined): boolean {
  if (typeof value !== "number" || !Number.isFinite(value)) {
    return false;
  }
  if (gte !== undefined && value < gte) {
    return false;
  }
  if (lte !== undefined && value > lte) {
    return false;
  }
  return true;
}

function hasExpressions<T>(values: readonly T[] | undefined): values is readonly T[] {
  return Array.isArray(values) && values.length > 0;
}
