import type {
  DestinyExclusiveRule,
  DestinySynergyRule,
  DestinyTagConflictRule,
  DestinyTraitDefinition
} from "../../types/destiny-types.v0.1";
import { DestinyRegistry, loadDestinyRegistry } from "./DestinyRegistry";

export interface DestinyCombinationEvaluation {
  readonly hasHardExclusive: boolean;
  readonly hardExclusiveRuleIds: readonly string[];
  readonly synergies: readonly DestinySynergyRule[];
  readonly softConflictRuleIds: readonly string[];
  readonly synergyWarnings: readonly string[];
  readonly conflictWarnings: readonly string[];
}

export class DestinyCombinationEngine {
  private readonly registry: DestinyRegistry;

  constructor(registry = loadDestinyRegistry()) {
    this.registry = registry;
  }

  hasHardExclusive(traitIds: readonly string[]): boolean {
    return this.getHardExclusiveRuleIds(traitIds).length > 0;
  }

  getHardExclusiveRuleIds(traitIds: readonly string[]): readonly string[] {
    return this.getMatchingExclusiveRules(traitIds, false).map((rule) => rule.id);
  }

  getSynergies(traitIds: readonly string[]): readonly DestinySynergyRule[] {
    const selected = new Set(traitIds);
    return this.registry.synergyRules.filter((rule) => rule.traits.every((traitId) => selected.has(traitId)));
  }

  getSoftConflictWarnings(traitIds: readonly string[], tags: readonly string[] = []): readonly string[] {
    const softWarnings = this.getMatchingExclusiveRules(traitIds, true).map(formatSoftConflictWarning);
    return freezeArray([...softWarnings, ...this.getConflictWarnings(tags)]);
  }

  getConflictWarnings(tags: readonly string[]): readonly string[] {
    return this.getMatchingTagConflictRules(tags).map(formatTagConflictWarning);
  }

  evaluateTraits(traits: readonly DestinyTraitDefinition[]): DestinyCombinationEvaluation {
    return this.evaluateTraitIds(
      traits.map((trait) => trait.id),
      traits.flatMap((trait) => trait.tags)
    );
  }

  evaluateTraitIds(traitIds: readonly string[], tags: readonly string[] = []): DestinyCombinationEvaluation {
    const derivedTags = uniqueStable([
      ...traitIds.flatMap((traitId) => {
        try {
          return this.registry.getTrait(traitId).tags;
        } catch {
          return [];
        }
      }),
      ...tags
    ]);
    const hardExclusiveRuleIds = this.getHardExclusiveRuleIds(traitIds);
    const synergies = this.getSynergies(traitIds);
    const softConflictRuleIds = this.getMatchingExclusiveRules(traitIds, true).map((rule) => rule.id);
    const synergyWarnings = synergies.map(formatSynergyWarning);
    const conflictWarnings = [
      ...this.getMatchingExclusiveRules(traitIds, true).map(formatSoftConflictWarning),
      ...this.getMatchingTagConflictRules(derivedTags).map(formatTagConflictWarning)
    ];

    return deepFreeze({
      hasHardExclusive: hardExclusiveRuleIds.length > 0,
      hardExclusiveRuleIds,
      synergies,
      softConflictRuleIds,
      synergyWarnings,
      conflictWarnings
    });
  }

  private getMatchingExclusiveRules(traitIds: readonly string[], soft: boolean): readonly DestinyExclusiveRule[] {
    const selected = new Set(traitIds);
    return this.registry.exclusiveRules.filter(
      (rule) => (rule.soft === true) === soft && rule.traits.every((traitId) => selected.has(traitId))
    );
  }

  private getMatchingTagConflictRules(tags: readonly string[]): readonly DestinyTagConflictRule[] {
    const selected = new Set(tags);
    return this.registry.conflictRules.filter((rule) => rule.tags.every((tag) => selected.has(tag)));
  }
}

function formatSynergyWarning(rule: DestinySynergyRule): string {
  return `${rule.id}: ${rule.name} - ${rule.description}`;
}

function formatSoftConflictWarning(rule: DestinyExclusiveRule): string {
  return `${rule.id}: ${rule.reason}`;
}

function formatTagConflictWarning(rule: DestinyTagConflictRule): string {
  return `${rule.id}: ${rule.description}`;
}

function uniqueStable<T>(values: readonly T[]): readonly T[] {
  return [...new Set(values)];
}

function freezeArray<T>(values: readonly T[]): readonly T[] {
  return Object.freeze([...values]);
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
