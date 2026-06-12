import { loadDestinyV2Registry } from "./DestinyV2Registry";
import type { DestinySelectionState } from "../character/CharacterCreationTypes";
import type {
  DestinyLifeManifestationHookProjection,
  DestinyLifeManifestationHooksByPhase,
  DestinyLifeManifestationHooksContext,
  DestinyLifeManifestationProjectedHook,
  Id,
  LifeManifestationPhaseId
} from "../types/destiny-eligibility-types.v0.1";

export function projectDestinyLifeManifestationHooks(
  selection: DestinySelectionState,
  context: DestinyLifeManifestationHooksContext = {}
): DestinyLifeManifestationHookProjection {
  return projectDestinyLifeManifestationHooksForTraitIds(getDestinyTraitIds(selection), context);
}

export function projectDestinyLifeManifestationHooksForTraitIds(
  traitIds: readonly Id[],
  context: DestinyLifeManifestationHooksContext = {}
): DestinyLifeManifestationHookProjection {
  const registry = context.registry ?? loadDestinyV2Registry();
  const uniqueTraitIds = uniqueStable(traitIds);
  const hooks: DestinyLifeManifestationProjectedHook[] = [];
  const missingManifestationTraitIds: Id[] = [];

  for (const traitId of uniqueTraitIds) {
    try {
      const manifestation = registry.getManifestation(traitId);
      for (const event of manifestation.events) {
        const phaseRule = registry.phaseManifestationRules[event.phase as LifeManifestationPhaseId];
        hooks.push({
          destinyId: traitId,
          phase: event.phase as LifeManifestationPhaseId,
          hook: event.hook,
          visible: event.visible,
          phaseRule
        });
      }
    } catch (error) {
      if (error instanceof Error && error.message === `Missing destiny v2 manifestation: ${traitId}`) {
        missingManifestationTraitIds.push(traitId);
        continue;
      }
      throw error;
    }
  }

  const projection: DestinyLifeManifestationHookProjection = {
    traitIds: uniqueTraitIds,
    phaseRules: cloneJson(registry.phaseManifestationRules),
    hooks,
    hooksByPhase: buildHooksByPhase(hooks),
    missingManifestationTraitIds,
    debugTags: [
      `life_manifestation:traits:${uniqueTraitIds.length}`,
      `life_manifestation:hooks:${hooks.length}`,
      `life_manifestation:missing:${missingManifestationTraitIds.length}`
    ]
  };

  return deepFreeze(projection);
}

export function getLifeManifestationPhaseForAgeMonths(ageMonths: number): LifeManifestationPhaseId {
  if (!Number.isInteger(ageMonths) || ageMonths < 0) {
    throw new Error("ageMonths must be a non-negative integer");
  }
  if (ageMonths < 48) {
    return "infant_0_3";
  }
  if (ageMonths < 108) {
    return "child_4_8";
  }
  if (ageMonths < 168) {
    return "juvenile_9_13";
  }
  if (ageMonths < 216) {
    return "youth_14_17";
  }
  return "adult_18";
}

export function getDestinyLifeManifestationHooksForAge(
  selection: DestinySelectionState,
  ageMonths: number,
  context: DestinyLifeManifestationHooksContext = {}
): DestinyLifeManifestationHookProjection {
  const phase = getLifeManifestationPhaseForAgeMonths(ageMonths);
  const projection = projectDestinyLifeManifestationHooks(selection, context);
  const hooks = projection.hooks.filter((hook) => hook.phase === phase);

  return deepFreeze({
    ...projection,
    hooks,
    hooksByPhase: buildHooksByPhase(hooks),
    debugTags: [...projection.debugTags, `life_manifestation:phase:${phase}`]
  });
}

function getDestinyTraitIds(selection: DestinySelectionState): readonly Id[] {
  return [
    selection.main.traitId,
    selection.secondary[0].traitId,
    selection.secondary[1].traitId,
    selection.flaw.traitId
  ];
}

function buildHooksByPhase(
  hooks: readonly DestinyLifeManifestationProjectedHook[]
): DestinyLifeManifestationHooksByPhase {
  return deepFreeze({
    infant_0_3: hooks.filter((hook) => hook.phase === "infant_0_3"),
    child_4_8: hooks.filter((hook) => hook.phase === "child_4_8"),
    juvenile_9_13: hooks.filter((hook) => hook.phase === "juvenile_9_13"),
    youth_14_17: hooks.filter((hook) => hook.phase === "youth_14_17"),
    adult_18: hooks.filter((hook) => hook.phase === "adult_18")
  });
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
