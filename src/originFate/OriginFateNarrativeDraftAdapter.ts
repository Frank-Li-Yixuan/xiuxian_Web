import { SeededRng, type RngSeed } from "../sim/core/SeededRng";
import type { DestinySelectionState } from "../types/character-creation-types.v0.1";
import type { OpeningInnateDraft } from "../types/opening-generator-types.v0.1";
import type { OriginFateDraft } from "../types/origin-fate-types.v0.1";
import type {
  HiddenFateNarrativeDebugMetadataV02,
  HiddenFateNarrativeStateV02,
  OriginFateNarrativeStateV02
} from "../types/origin-fate-narrative-types.v0.2";
import { generateCarriedItemNarrativeStates } from "./CarriedItemLifecycleEngine";
import { generateHiddenFateNarrativeState } from "./HiddenFateNarrativeEngine";
import {
  loadOriginFateNarrativeRegistry,
  type OriginFateNarrativeRegistry
} from "./OriginFateNarrativeRegistry";

export interface OriginFateNarrativeDraftAdapterInput {
  readonly originFate: OriginFateDraft;
  readonly openingInnateDraft: OpeningInnateDraft;
  readonly destinies: DestinySelectionState;
  readonly seed?: RngSeed;
}

export interface OriginFateNarrativeDraftAdapterContext {
  readonly registry?: OriginFateNarrativeRegistry;
  readonly maxVisibleOmenLines?: number;
}

const FALLBACK_ORIGIN_ID = "origin_mountain_orphan";

const ORIGIN_ID_MAP: Readonly<Record<string, string>> = {
  origin_gravekeeper_child: "origin_grave_keeper_child",
  origin_daoist_temple_servant: "origin_temple_servant"
};

const HIDDEN_FATE_ID_MAP: Readonly<Record<string, string>> = {
  hidden_lunar_remnant_vein: "hidden_taiyin_remnant_vein",
  hidden_pill_saint_remains: "hidden_alchemy_saint_bone",
  hidden_system_resonance_body: "hidden_system_resonance",
  hidden_heaven_book_fragment: "hidden_book_of_heaven_fragment",
  hidden_void_battlefield_echo: "hidden_outer_battlefield_echo"
};

const CARRIED_ITEM_ID_MAP: Readonly<Record<string, string>> = {
  origin_item_broken_wooden_sword: "item_wooden_sword",
  origin_item_ancestral_jade: "item_jade_amulet",
  origin_item_wordless_page: "item_blank_fragment",
  origin_item_family_letter: "item_old_family_letter",
  item_rusty_hunting_bow: "item_rust_bowstring",
  item_daoist_incense_burner: "item_old_incense_burner",
  item_childhood_stone_charm: "item_childhood_stone_talisman"
};

export function buildOriginFateNarrativeStateFromDraft(
  input: OriginFateNarrativeDraftAdapterInput,
  context: OriginFateNarrativeDraftAdapterContext = {}
): OriginFateNarrativeStateV02 {
  const registry = context.registry ?? loadOriginFateNarrativeRegistry();
  const debugTags: string[] = [];
  const originId = resolveOriginId(input.originFate.backgroundOrigin.originId, registry, debugTags);
  const hiddenFateId = resolveOptionalHiddenFateId(input.originFate.hiddenFateInternal.hiddenFateId, registry, debugTags);
  const lockedItemIds = resolveLockedItemIds(input.originFate.carriedItems.map((item) => item.itemId), registry, debugTags);
  const selectedDestinyIds = getSelectedDestinyIds(input.destinies);
  const seed = String(input.seed ?? `${input.originFate.seed}:origin_fate_narrative_v02`);
  const rng = new SeededRng(seed, "origin_fate_narrative_v02");

  const carriedItems = generateCarriedItemNarrativeStates(
    {
      originId,
      hiddenFateIds: hiddenFateId === undefined ? [] : [hiddenFateId],
      selectedDestinyIds,
      rng: rng.fork("carried_items"),
      ...(lockedItemIds.length === 0 ? {} : { lockedItemIds })
    },
    { registry }
  ).items;
  const origin = registry.getOriginStoryline(originId);
  const previousHiddenFates = hiddenFateId === undefined
    ? undefined
    : [buildPreviousHiddenFateState(hiddenFateId, input.originFate, registry)];

  const state = generateHiddenFateNarrativeState(
    {
      openingInnateDraft: input.openingInnateDraft,
      destinies: input.destinies,
      originStoryline: {
        originId,
        activeStorylineIds: origin.storylineBias,
        matchedTags: uniqueStable([
          input.originFate.backgroundOrigin.originId,
          ...input.originFate.backgroundOrigin.matchedTags,
          ...input.originFate.lifeEventBiasTags
        ])
      },
      carriedItems,
      rng: rng.fork("hidden_fate"),
      ...(previousHiddenFates === undefined ? {} : { previousHiddenFates }),
      ...(context.maxVisibleOmenLines === undefined ? {} : { maxVisibleOmenLines: context.maxVisibleOmenLines })
    },
    { registry }
  );

  return appendDebugTags(state, debugTags);
}

function resolveOriginId(
  sourceId: string,
  registry: OriginFateNarrativeRegistry,
  debugTags: string[]
): string {
  const mapped = ORIGIN_ID_MAP[sourceId] ?? sourceId;
  if (hasOrigin(mapped, registry)) {
    if (mapped !== sourceId) {
      debugTags.push(`originFateNarrative.mapOrigin:${sourceId}->${mapped}`);
    }
    return mapped;
  }
  debugTags.push(`originFateNarrative.fallbackOrigin:${sourceId}->${FALLBACK_ORIGIN_ID}`);
  return FALLBACK_ORIGIN_ID;
}

function resolveOptionalHiddenFateId(
  sourceId: string,
  registry: OriginFateNarrativeRegistry,
  debugTags: string[]
): string | undefined {
  const mapped = HIDDEN_FATE_ID_MAP[sourceId] ?? sourceId;
  if (hasHiddenFate(mapped, registry)) {
    if (mapped !== sourceId) {
      debugTags.push(`originFateNarrative.mapHidden:${sourceId}->${mapped}`);
    }
    return mapped;
  }
  debugTags.push(`originFateNarrative.chooseHiddenWithEngine:${sourceId}`);
  return undefined;
}

function resolveLockedItemIds(
  sourceIds: readonly string[],
  registry: OriginFateNarrativeRegistry,
  debugTags: string[]
): readonly string[] {
  const resolved: string[] = [];
  for (const sourceId of sourceIds) {
    const mapped = CARRIED_ITEM_ID_MAP[sourceId] ?? sourceId;
    if (hasCarriedItem(mapped, registry)) {
      if (mapped !== sourceId) {
        debugTags.push(`originFateNarrative.mapItem:${sourceId}->${mapped}`);
      }
      resolved.push(mapped);
    } else {
      debugTags.push(`originFateNarrative.chooseItemWithEngine:${sourceId}`);
    }
  }
  return uniqueStable(resolved).slice(0, 2);
}

function buildPreviousHiddenFateState(
  hiddenFateId: string,
  originFate: OriginFateDraft,
  registry: OriginFateNarrativeRegistry
): HiddenFateNarrativeStateV02 {
  const definition = registry.getHiddenFate(hiddenFateId);
  const progress = clampInteger(originFate.hiddenFateInternal.progress, 0, 100);
  return {
    hiddenFateId,
    progress,
    revealBand: registry.getRevealBandForProgress(progress).id,
    knownToPlayer: true,
    trueNameRevealed: false,
    misleadingOmenIds: [...definition.misleadingOmenIds],
    omenHistory: []
  };
}

function getSelectedDestinyIds(destinies: DestinySelectionState): readonly string[] {
  return uniqueStable([
    destinies.main.traitId,
    ...destinies.secondary.map((trait) => trait.traitId),
    destinies.flaw.traitId
  ]);
}

function appendDebugTags(
  state: OriginFateNarrativeStateV02,
  debugTags: readonly string[]
): OriginFateNarrativeStateV02 {
  if (debugTags.length === 0 || state.debug === undefined) {
    return state;
  }
  const debug: HiddenFateNarrativeDebugMetadataV02 = {
    ...state.debug,
    contextTags: uniqueStable([...state.debug.contextTags, ...debugTags])
  };
  return deepFreeze({
    ...state,
    debug
  });
}

function hasOrigin(id: string, registry: OriginFateNarrativeRegistry): boolean {
  return canRead(() => registry.getOriginStoryline(id));
}

function hasHiddenFate(id: string, registry: OriginFateNarrativeRegistry): boolean {
  return canRead(() => registry.getHiddenFate(id));
}

function hasCarriedItem(id: string, registry: OriginFateNarrativeRegistry): boolean {
  return canRead(() => registry.getCarriedItemNarrative(id));
}

function canRead(read: () => unknown): boolean {
  try {
    read();
    return true;
  } catch {
    return false;
  }
}

function clampInteger(value: number, min: number, max: number): number {
  if (!Number.isFinite(value)) {
    return min;
  }
  return Math.trunc(Math.min(max, Math.max(min, value)));
}

function uniqueStable<T>(values: readonly T[]): T[] {
  return [...new Set(values)];
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
