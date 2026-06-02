import { SeededRng, type RngSeed } from "../sim/core/SeededRng";
import type {
  OriginFateDraft,
  OriginFateGenerationContext,
  OriginFateLocks
} from "../types/origin-fate-types.v0.1";
import { generateBackgroundOrigin } from "./BackgroundOriginGenerator";
import { generateCarriedItems } from "./CarriedItemsGenerator";
import { generateHiddenFate } from "./HiddenFateGenerator";
import {
  loadOriginFateRegistry,
  type OriginFateRegistry
} from "./OriginFateRegistry";

export interface GenerateOriginFateDraftInput {
  readonly seed: RngSeed;
  readonly draftId: string;
  readonly rerollIndex: number;
  readonly openingTags: readonly string[];
  readonly destinyTags: readonly string[];
  readonly spiritualRootTags: readonly string[];
  readonly aptitudeTags: readonly string[];
  readonly locks?: OriginFateLocks;
  readonly previousDraft?: OriginFateDraft;
  readonly divinationTokens?: number;
}

export interface OriginFateGenerator {
  generate(input: GenerateOriginFateDraftInput): OriginFateDraft;
}

export class DefaultOriginFateGenerator implements OriginFateGenerator {
  private readonly registry: OriginFateRegistry;

  constructor(registry: OriginFateRegistry = loadOriginFateRegistry()) {
    this.registry = registry;
  }

  generate(input: GenerateOriginFateDraftInput): OriginFateDraft {
    validateInput(input);

    const rootRng = new SeededRng(
      `${String(input.seed)}:origin_fate:${input.rerollIndex}`,
      "character_creation_origin_fate"
    );
    const context: OriginFateGenerationContext = {
      seed: String(input.seed),
      rerollIndex: input.rerollIndex,
      openingTags: uniqueStable(input.openingTags),
      destinyTags: uniqueStable(input.destinyTags),
      spiritualRootTags: uniqueStable(input.spiritualRootTags),
      aptitudeTags: uniqueStable(input.aptitudeTags),
      ...(input.locks === undefined ? {} : { locks: input.locks }),
      ...(input.divinationTokens === undefined ? {} : { divinationTokens: input.divinationTokens })
    };

    const generatedBackground = generateBackgroundOrigin(context, this.registry, rootRng.fork("background"));
    const backgroundResult =
      context.locks?.backgroundOriginId !== undefined && input.previousDraft?.backgroundOrigin.originId === context.locks.backgroundOriginId
        ? input.previousDraft.backgroundOrigin
        : generatedBackground.result;
    const generatedHiddenFate = generateHiddenFate(context, backgroundResult, this.registry, rootRng.fork("hidden_fate"));
    const hiddenFateInternal =
      context.locks?.hiddenFateId !== undefined && input.previousDraft?.hiddenFateInternal.hiddenFateId === context.locks.hiddenFateId
        ? input.previousDraft.hiddenFateInternal
        : generatedHiddenFate.internal;
    const visibleHiddenOmen =
      context.locks?.hiddenFateId !== undefined && input.previousDraft?.hiddenFateInternal.hiddenFateId === context.locks.hiddenFateId
        ? input.previousDraft.visibleHiddenOmen
        : generatedHiddenFate.visibleOmen;
    const generatedCarriedItems = generateCarriedItems(
      context,
      backgroundResult,
      hiddenFateInternal,
      this.registry,
      rootRng.fork("carried_items")
    );
    const carriedItemIds = context.locks?.carriedItemIds;
    const carriedItemResults =
      carriedItemIds !== undefined &&
      input.previousDraft !== undefined &&
      idsEqual(input.previousDraft.carriedItems.map((item) => item.itemId), carriedItemIds)
        ? input.previousDraft.carriedItems
        : generatedCarriedItems.items;

    const backgroundDefinition = this.registry.getBackgroundOrigin(backgroundResult.originId);
    const hiddenFateDefinition = this.registry.getHiddenFate(hiddenFateInternal.hiddenFateId);
    const carriedItemDefinitions = carriedItemResults.map((item) => this.registry.getCarriedItem(item.itemId));

    return deepFreeze({
      draftId: input.draftId,
      seed: String(input.seed),
      rerollIndex: input.rerollIndex,
      backgroundOrigin: backgroundResult,
      hiddenFateInternal,
      visibleHiddenOmen,
      carriedItems: carriedItemResults,
      lifeEventBiasTags: uniqueStable([
        ...backgroundDefinition.lifeEventBiasTags,
        ...hiddenFateDefinition.lifeEventBiasTags,
        ...carriedItemDefinitions.flatMap((item) => item.lifeEventTags)
      ]),
      modeProjectionTags: uniqueStable([
        ...backgroundDefinition.modeBiasTags,
        ...hiddenFateDefinition.outerBattlefieldEffects
          .filter((effect) => hiddenFateInternal.progress >= effect.threshold)
          .map((effect) => effect.effect),
        ...carriedItemResults.map((item) => item.conversion.outerBattlefieldEffect)
      ]),
      age18ConversionHooks: uniqueStable([
        ...hiddenFateDefinition.dongfuHooks,
        ...carriedItemResults.map((item) => item.conversion.dongfuHook)
      ]),
      debug: {
        backgroundCandidateWeights: generatedBackground.debug.candidateWeights,
        hiddenFateCandidateWeights: generatedHiddenFate.debug.candidateWeights,
        carriedItemCandidateWeights: generatedCarriedItems.debug.candidateWeights
      }
    });
  }
}

function validateInput(input: GenerateOriginFateDraftInput): void {
  if (String(input.seed).length === 0) {
    throw new Error("Origin fate draft seed must not be empty");
  }
  if (input.draftId.length === 0) {
    throw new Error("Origin fate draftId must not be empty");
  }
  if (!Number.isInteger(input.rerollIndex) || input.rerollIndex < 0) {
    throw new Error("Origin fate draft rerollIndex must be a non-negative integer");
  }
}

function uniqueStable<T>(values: readonly T[]): readonly T[] {
  return [...new Set(values)];
}

function idsEqual(first: readonly string[], second: readonly string[]): boolean {
  return first.length === second.length && first.every((value, index) => value === second[index]);
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
