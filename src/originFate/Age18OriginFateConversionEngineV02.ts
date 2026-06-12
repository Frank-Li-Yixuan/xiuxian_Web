import type { LifeSimulationState } from "../types/life-monthly-events-types.v0.1";
import type {
  Age18ConvertedCarriedItemV02,
  Age18OriginFateInputV02,
  Age18OriginFateResolutionV02,
  Age18RevealedHiddenFateV02,
  Age18SealedHiddenFateV02,
  CarriedItemNarrativeDefinitionV02,
  CarriedItemNarrativeStateV02,
  HiddenFateDefinitionV02,
  HiddenFateNarrativeStateV02,
  Id,
  OriginFateAge18TraceRecordV02,
  OriginFateNarrativeStateV02
} from "../types/origin-fate-narrative-types.v0.2";
import {
  loadOriginFateNarrativeRegistry,
  type OriginFateNarrativeRegistry
} from "./OriginFateNarrativeRegistry";
import { buildPublicOmenView } from "./RevealMisdirectionEngine";

export interface BuildAge18OriginFateInputV02Options {
  readonly revealHistory?: readonly Id[];
  readonly misleadingOmenHistory?: readonly Id[];
  readonly keyChoiceRecords?: readonly Id[];
  readonly keyInterludeRecords?: readonly Id[];
  readonly traceRecords?: readonly OriginFateAge18TraceRecordV02[];
}

export interface Age18OriginFateConversionContextV02 {
  readonly registry?: OriginFateNarrativeRegistry;
}

export interface ResolveAge18OriginFateFromLifeSimulationOptionsV02 extends BuildAge18OriginFateInputV02Options {
  readonly allowMissing?: boolean;
}

export function buildAge18OriginFateInputV02(
  narrativeState: OriginFateNarrativeStateV02,
  options: BuildAge18OriginFateInputV02Options = {}
): Age18OriginFateInputV02 {
  return deepFreeze({
    originNarrativeState: narrativeState.origin,
    hiddenFateStates: [...narrativeState.hiddenFates],
    carriedItemStates: [...narrativeState.carriedItems],
    revealHistory: uniqueStable(options.revealHistory ?? narrativeState.hiddenFates.flatMap((hiddenFate) => hiddenFate.omenHistory)),
    misleadingOmenHistory: uniqueStable(
      options.misleadingOmenHistory ?? narrativeState.hiddenFates.flatMap((hiddenFate) => hiddenFate.misleadingOmenIds)
    ),
    keyChoiceRecords: uniqueStable(options.keyChoiceRecords ?? []),
    keyInterludeRecords: uniqueStable(options.keyInterludeRecords ?? []),
    traceRecords: uniqueStableById(options.traceRecords ?? [])
  });
}

export function resolveAge18OriginFateConversionV02(
  input: Age18OriginFateInputV02,
  context: Age18OriginFateConversionContextV02 = {}
): Age18OriginFateResolutionV02 {
  const registry = context.registry ?? loadOriginFateNarrativeRegistry();
  const traceability = buildTraceability(input, registry);
  const hiddenResolution = resolveHiddenFates(input.hiddenFateStates, traceability, registry);
  const convertedCarriedItems = resolveConvertedCarriedItems(input, traceability, registry);
  const hiddenLongTermTags = [
    ...hiddenResolution.revealed.map((hiddenFate) => `hiddenFate:${hiddenFate.hiddenFateId}:revealed`),
    ...hiddenResolution.sealed.map((hiddenFate) => `hiddenFate:${hiddenFate.hiddenFateId}:sealed`)
  ];
  const convertedLongTermTags = convertedCarriedItems.map((item) => `carriedItem:${item.itemId}:converted`);

  return deepFreeze({
    revealedHiddenFates: hiddenResolution.revealed,
    sealedHiddenFates: hiddenResolution.sealed,
    convertedCarriedItems,
    outerBattlefieldModifiers: uniqueStable([
      ...hiddenResolution.revealed.flatMap((hiddenFate) => hiddenFate.age18OutcomeIds.map((id) => `hiddenFateOutcome:${id}`)),
      ...convertedCarriedItems.flatMap((item) => item.conversionIds.map((id) => `age18Conversion:${id}`))
    ]),
    dongfuHooks: uniqueStable(convertedCarriedItems.flatMap((item) => item.dongfuHooks)),
    longTermTags: uniqueStable([
      `origin:${input.originNarrativeState.originId}`,
      ...hiddenLongTermTags,
      ...convertedLongTermTags,
      ...input.keyChoiceRecords.map((id) => `age18Trace.choice:${id}`),
      ...input.keyInterludeRecords.map((id) => `age18Trace.interlude:${id}`)
    ]),
    traceability,
    debugTags: uniqueStable([
      "originFateAge18.v02",
      `originFateAge18.origin:${input.originNarrativeState.originId}`,
      ...hiddenResolution.revealed.map((hiddenFate) => `originFateAge18.hidden:${hiddenFate.hiddenFateId}:revealed`),
      ...hiddenResolution.sealed.map((hiddenFate) => `originFateAge18.hidden:${hiddenFate.hiddenFateId}:sealed`),
      ...convertedCarriedItems.map((item) => `originFateAge18.item:${item.itemId}:converted`)
    ])
  });
}

export function resolveAge18OriginFateConversionFromLifeSimulationState(
  state: LifeSimulationState,
  options: ResolveAge18OriginFateFromLifeSimulationOptionsV02 = {},
  context: Age18OriginFateConversionContextV02 = {}
): Age18OriginFateResolutionV02 | undefined {
  if (state.originFateNarrativeState === undefined) {
    if (options.allowMissing === true) {
      return undefined;
    }
    throw new Error("Missing origin fate narrative state for HFO2 age18 conversion");
  }
  return resolveAge18OriginFateConversionV02(buildAge18OriginFateInputV02(state.originFateNarrativeState, options), context);
}

function resolveHiddenFates(
  states: readonly HiddenFateNarrativeStateV02[],
  traceability: readonly OriginFateAge18TraceRecordV02[],
  registry: OriginFateNarrativeRegistry
): {
  readonly revealed: readonly Age18RevealedHiddenFateV02[];
  readonly sealed: readonly Age18SealedHiddenFateV02[];
} {
  const revealed: Age18RevealedHiddenFateV02[] = [];
  const sealed: Age18SealedHiddenFateV02[] = [];

  for (const state of states) {
    const hiddenFate = registry.getHiddenFate(state.hiddenFateId);
    const publicView = buildPublicOmenView(state, {
      registry,
      surface: "age18",
      age18Resolved: true
    });
    const band = registry.getRevealBandForProgress(state.progress).id;
    const common = {
      hiddenFateId: state.hiddenFateId,
      revealBand: band,
      publicAlias: hiddenFate.publicAlias,
      age18OutcomeIds: [...hiddenFate.age18Outcomes],
      stageTransitionTokens: [...hiddenFate.stageTransitionTokens],
      clueLines: uniqueStable([...publicView.omenLines, ...publicView.misdirectionLines]),
      traceRecordIds: traceability.filter((trace) => trace.tags.includes(`hiddenFate:${state.hiddenFateId}`)).map((trace) => trace.id)
    };

    if (publicView.canRevealName && publicView.revealedName !== undefined) {
      revealed.push({
        ...common,
        revealedName: publicView.revealedName
      });
    } else {
      sealed.push(common);
    }
  }

  return {
    revealed: deepFreeze(revealed),
    sealed: deepFreeze(sealed)
  };
}

function resolveConvertedCarriedItems(
  input: Age18OriginFateInputV02,
  traceability: readonly OriginFateAge18TraceRecordV02[],
  registry: OriginFateNarrativeRegistry
): readonly Age18ConvertedCarriedItemV02[] {
  return deepFreeze(
    input.carriedItemStates.flatMap((state) => {
      const definition = registry.getCarriedItemNarrative(state.itemId);
      if (!shouldConvertCarriedItem(state, input, traceability)) {
        return [];
      }
      return [
        {
          itemId: state.itemId,
          affinity: clampAffinity(state.affinity),
          lifecycleStage: state.lifecycleStage,
          conversionIds: [...definition.age18Conversions],
          dongfuHooks: [...definition.dongfuHooks],
          traceRecordIds: traceability.filter((trace) => trace.tags.includes(`carriedItem:${state.itemId}`)).map((trace) => trace.id)
        }
      ];
    })
  );
}

function shouldConvertCarriedItem(
  state: CarriedItemNarrativeStateV02,
  input: Age18OriginFateInputV02,
  traceability: readonly OriginFateAge18TraceRecordV02[]
): boolean {
  const affinity = clampAffinity(state.affinity);
  if (state.converted || state.lifecycleStage === "converted" || affinity >= 70) {
    return true;
  }
  return affinity >= 50 && hasPriorTraceForItem(state.itemId, input, traceability);
}

function hasPriorTraceForItem(
  itemId: Id,
  input: Age18OriginFateInputV02,
  traceability: readonly OriginFateAge18TraceRecordV02[]
): boolean {
  const state = input.carriedItemStates.find((item) => item.itemId === itemId);
  if (state !== undefined && state.eventHistory.length > 0) {
    return true;
  }
  return traceability.some((trace) => trace.tags.includes(`carriedItem:${itemId}`) && trace.source !== "carried_item_state");
}

function buildTraceability(
  input: Age18OriginFateInputV02,
  registry: OriginFateNarrativeRegistry
): readonly OriginFateAge18TraceRecordV02[] {
  const traces: OriginFateAge18TraceRecordV02[] = [
    {
      id: input.originNarrativeState.originId,
      source: "origin_state",
      tags: uniqueStable([
        `origin:${input.originNarrativeState.originId}`,
        ...input.originNarrativeState.activeStorylineIds.map((id) => `storyline:${id}`),
        ...input.originNarrativeState.canonicalLifeStorylineIds.map((id) => `lifeStoryline:${id}`)
      ])
    },
    ...input.hiddenFateStates.map((state) => hiddenFateTrace(state, registry.getHiddenFate(state.hiddenFateId))),
    ...input.carriedItemStates.flatMap((state) => carriedItemTraces(state, registry.getCarriedItemNarrative(state.itemId))),
    ...input.revealHistory.map((id) => simpleTrace(id, "reveal_history", [`reveal:${id}`])),
    ...input.misleadingOmenHistory.map((id) => simpleTrace(id, "misdirection", [`misdirection:${id}`])),
    ...input.keyChoiceRecords.map((id) => simpleTrace(id, "key_choice", [`choice:${id}`])),
    ...input.keyInterludeRecords.map((id) => simpleTrace(id, "interlude", [`interlude:${id}`])),
    ...(input.traceRecords ?? [])
  ];

  return deepFreeze(uniqueStableById(traces));
}

function hiddenFateTrace(
  state: HiddenFateNarrativeStateV02,
  definition: HiddenFateDefinitionV02
): OriginFateAge18TraceRecordV02 {
  return {
    id: state.hiddenFateId,
    source: "hidden_fate_state",
    tags: uniqueStable([
      `hiddenFate:${state.hiddenFateId}`,
      `hiddenFateBand:${state.revealBand}`,
      `hiddenFateProgressBand:${definition.id}:${state.revealBand}`,
      ...definition.primaryTags,
      ...definition.age18Outcomes.map((id) => `age18Outcome:${id}`)
    ]),
    ...(state.lastProgressMonth === undefined ? {} : { ageMonth: state.lastProgressMonth })
  };
}

function carriedItemTraces(
  state: CarriedItemNarrativeStateV02,
  definition: CarriedItemNarrativeDefinitionV02
): readonly OriginFateAge18TraceRecordV02[] {
  return [
    {
      id: state.itemId,
      source: "carried_item_state",
      tags: uniqueStable([
        `carriedItem:${state.itemId}`,
        `carriedItemLifecycle:${state.lifecycleStage}`,
        `carriedItemAffinity:${getAffinityBand(state.affinity)}`,
        ...definition.age18Conversions.map((id) => `age18Conversion:${id}`),
        ...definition.dongfuHooks.map((id) => `dongfuHook:${id}`)
      ])
    },
    ...state.eventHistory.map((eventId) =>
      simpleTrace(eventId, "life_event", [`carriedItem:${state.itemId}`, `lifeEvent:${eventId}`])
    )
  ];
}

function simpleTrace(
  id: Id,
  source: OriginFateAge18TraceRecordV02["source"],
  tags: readonly string[]
): OriginFateAge18TraceRecordV02 {
  return {
    id,
    source,
    tags: uniqueStable(tags)
  };
}

function getAffinityBand(affinity: number): string {
  const value = clampAffinity(affinity);
  if (value >= 100) {
    return "converted";
  }
  if (value >= 70) {
    return "high";
  }
  if (value >= 50) {
    return "medium";
  }
  return "low";
}

function clampAffinity(value: number): number {
  if (!Number.isFinite(value)) {
    throw new Error("HFO2 age18 carried item affinity must be finite");
  }
  return Math.trunc(Math.max(0, Math.min(100, value)));
}

function uniqueStable<T>(values: readonly T[]): T[] {
  return [...new Set(values)];
}

function uniqueStableById<T extends { readonly id: Id }>(values: readonly T[]): T[] {
  const seen = new Set<Id>();
  const result: T[] = [];
  for (const value of values) {
    if (!seen.has(value.id)) {
      seen.add(value.id);
      result.push(value);
    }
  }
  return result;
}

function deepFreeze<T>(value: T): T {
  if (value !== null && typeof value === "object" && !Object.isFrozen(value)) {
    Object.freeze(value);
    for (const nested of Object.values(value as Record<string, unknown>)) {
      deepFreeze(nested);
    }
  }
  return value;
}
