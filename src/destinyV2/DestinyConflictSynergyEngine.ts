import { loadDestinyV2Registry } from "./DestinyV2Registry";
import type {
  DestinyConflictSynergyEngineContext,
  DestinyConflictSynergyResult,
  DestinyDefinitionV2,
  DestinySynergyRule,
  HardConflictRule,
  Id,
  SoftConflictRule
} from "../types/destiny-eligibility-types.v0.1";

export function applyDestinyConflictSynergy(
  selectedDestinies: readonly DestinyDefinitionV2[],
  context: DestinyConflictSynergyEngineContext = {}
): DestinyConflictSynergyResult {
  const registry = context.registry ?? loadDestinyV2Registry();
  const hardConflicts = context.hardConflicts ?? registry.hardConflicts;
  const softConflicts = context.softConflicts ?? registry.softConflicts;
  const synergies = context.synergies ?? registry.synergies;

  const currentIds = uniqueStable(selectedDestinies.map((destiny) => destiny.id));
  const removedDestinyIds: Id[] = [];
  const mutatedDestinyIds: Id[] = [];
  const rerollDestinyIds: Id[] = [];
  const conflictWarnings: string[] = [];
  const debugTags: string[] = [];

  for (const rule of hardConflicts) {
    if (!containsAll(currentIds, [rule.a, rule.b])) {
      continue;
    }

    if (rule.mutation !== undefined) {
      const mutationTarget = getOptionalDestiny(registry, rule.mutation);
      if (mutationTarget !== undefined) {
        replaceConflictWithMutation(currentIds, rule, mutationTarget.id);
        removedDestinyIds.push(rule.a, rule.b);
        mutatedDestinyIds.push(mutationTarget.id);
        conflictWarnings.push(formatHardConflictWarning(rule, `mutated:${mutationTarget.id}`));
        debugTags.push(`hard_conflict:mutate:${rule.a}+${rule.b}->${mutationTarget.id}`);
        continue;
      }
      debugTags.push(`hard_conflict:missing_mutation_target:${rule.mutation}`);
    }

    const removedId = removeLowerPriorityConflictId(currentIds, rule);
    if (removedId !== undefined) {
      removedDestinyIds.push(removedId);
      rerollDestinyIds.push(removedId);
      conflictWarnings.push(formatHardConflictWarning(rule, `reroll:${removedId}`));
      debugTags.push(`hard_conflict:reroll:${rule.a}+${rule.b}:removed:${removedId}`);
    }
  }

  for (const rule of softConflicts) {
    if (containsAll(currentIds, [rule.a, rule.b])) {
      conflictWarnings.push(formatSoftConflictWarning(rule));
      debugTags.push(`soft_conflict:keep:${rule.a}+${rule.b}`);
    }
  }

  const matchedSynergies: DestinySynergyRule[] = [];
  const synergyWarnings: string[] = [];
  const synergyTags: string[] = [];
  for (const rule of synergies) {
    if (containsAll(currentIds, rule.ids)) {
      matchedSynergies.push(rule);
      synergyTags.push(...rule.effectTags);
      synergyWarnings.push(formatSynergyWarning(rule));
      debugTags.push(`synergy:keep:${rule.ids.join("+")}`);
    }
  }

  return deepFreeze({
    finalDestinyIds: [...currentIds],
    removedDestinyIds: uniqueStable(removedDestinyIds),
    mutatedDestinyIds: uniqueStable(mutatedDestinyIds),
    rerollDestinyIds: uniqueStable(rerollDestinyIds),
    warnings: uniqueStable([...conflictWarnings, ...synergyWarnings]),
    conflictWarnings: uniqueStable(conflictWarnings),
    synergyWarnings: uniqueStable(synergyWarnings),
    synergyTags: uniqueStable(synergyTags),
    synergies: matchedSynergies.map((synergy) => cloneJson(synergy)),
    debugTags: uniqueStable(debugTags)
  });
}

function replaceConflictWithMutation(currentIds: Id[], rule: HardConflictRule, mutationId: Id): void {
  const indexA = currentIds.indexOf(rule.a);
  const indexB = currentIds.indexOf(rule.b);
  const insertionSourceIndex = Math.min(indexA, indexB);
  const insertionIndex = currentIds
    .slice(0, insertionSourceIndex)
    .filter((id) => id !== rule.a && id !== rule.b && id !== mutationId).length;
  const nextIds = currentIds.filter((id) => id !== rule.a && id !== rule.b && id !== mutationId);
  nextIds.splice(insertionIndex, 0, mutationId);
  currentIds.splice(0, currentIds.length, ...nextIds);
}

function removeLowerPriorityConflictId(currentIds: Id[], rule: HardConflictRule): Id | undefined {
  const indexA = currentIds.indexOf(rule.a);
  const indexB = currentIds.indexOf(rule.b);
  if (indexA === -1 || indexB === -1) {
    return undefined;
  }
  const removedId = indexA > indexB ? rule.a : rule.b;
  currentIds.splice(currentIds.indexOf(removedId), 1);
  return removedId;
}

function containsAll(selectedIds: readonly Id[], requiredIds: readonly Id[]): boolean {
  const selected = new Set(selectedIds);
  return requiredIds.every((id) => selected.has(id));
}

function getOptionalDestiny(
  registry: DestinyConflictSynergyEngineContext["registry"],
  destinyId: Id
): DestinyDefinitionV2 | undefined {
  try {
    return registry?.getDestiny(destinyId);
  } catch {
    return undefined;
  }
}

function formatHardConflictWarning(rule: HardConflictRule, action: string): string {
  return `hard_conflict:${rule.a}+${rule.b}:${action}: ${rule.reason}`;
}

function formatSoftConflictWarning(rule: SoftConflictRule): string {
  return `soft_conflict:${rule.a}+${rule.b}: ${rule.warning}`;
}

function formatSynergyWarning(rule: DestinySynergyRule): string {
  const warning = rule.warning === undefined ? "" : ` - ${rule.warning}`;
  return `synergy:${rule.name}: ${rule.effectTags.join(",")}${warning}`;
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
