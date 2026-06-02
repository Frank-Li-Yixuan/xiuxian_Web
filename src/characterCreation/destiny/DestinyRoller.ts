import { SeededRng } from "../../sim/core/SeededRng";
import type {
  CharacterCreationLocks,
  DestinyQuality,
  DestinyRollDebugInfo,
  DestinyRollDraft,
  DestinyRoller,
  DestinySelectionState,
  DestinySlotType,
  DestinyTraitDefinition,
  FateMeterState,
  GenerateDestinyRollInput
} from "../../types/destiny-types.v0.1";
import { DestinyCombinationEngine } from "./DestinyCombinationEngine";
import { DestinyRegistry, loadDestinyRegistry } from "./DestinyRegistry";

const RARE_OR_ABOVE_QUALITY: readonly DestinyQuality[] = ["rare", "mystic", "earthly", "heavenly", "defiant", "forbidden"];
const HIGH_QUALITY: readonly DestinyQuality[] = ["earthly", "heavenly", "defiant", "forbidden"];
const DESTINY_BIAS_ALIASES: Readonly<Record<string, readonly string[]>> = {
  heaven_jealous_talent: ["destiny_heaven_jealous_talent"],
  fortunate_star: ["destiny_fortune_star"],
  waste_root_reversal: ["destiny_waste_root_defiant"],
  tribulation_affinity: ["destiny_thunder_affinity", "destiny_thunder_mind", "flaw_thunder_drawn"],
  clear_glass_heart: ["destiny_glass_heart"],
  forbidden: ["destiny_demon_seed", "destiny_borrow_lifespan"]
};

type DestinyRollSlot = "main" | "secondary0" | "secondary1" | "flaw";

interface DestinyRngStreams {
  readonly mainQuality: SeededRng;
  readonly mainTrait: SeededRng;
  readonly secondaryQuality: SeededRng;
  readonly secondaryTrait: SeededRng;
  readonly flawSeverity: SeededRng;
  readonly flawTrait: SeededRng;
}

interface RollContext {
  readonly input: GenerateDestinyRollInput;
  readonly fateMeterBefore: FateMeterState;
  readonly streams: DestinyRngStreams;
  readonly debug: MutableDestinyRollDebugInfo;
  readonly selected: readonly DestinyTraitDefinition[];
  readonly openingBiasTags: readonly string[];
}

interface MutableDestinyRollDebugInfo {
  attempts: number;
  rejectedByExclusive: string[];
  selectedWeights: Record<string, number>;
}

export class DefaultDestinyRoller implements DestinyRoller {
  private readonly registry: DestinyRegistry;
  private readonly combinationEngine: DestinyCombinationEngine;

  constructor(registry = loadDestinyRegistry()) {
    this.registry = registry;
    this.combinationEngine = new DestinyCombinationEngine(registry);
  }

  generate(input: GenerateDestinyRollInput): DestinyRollDraft {
    validateInput(input);

    const streams = createDestinyRngStreams(input.seed, input.rerollIndex);
    const fateMeterBefore = normalizeFateMeter(input.fateMeter, this.registry);
    const debug: MutableDestinyRollDebugInfo = {
      attempts: 0,
      rejectedByExclusive: [],
      selectedWeights: {}
    };
    const selected: DestinyTraitDefinition[] = [];
    const contextBase = {
      input,
      fateMeterBefore,
      streams,
      debug,
      openingBiasTags: input.openingInnateDraft?.tags.destinyBiasTags ?? []
    };

    const main = this.resolveSlot("main", {
      ...contextBase,
      selected
    });
    addSelected(selected, main);
    const secondary0 = this.resolveSlot("secondary0", {
      ...contextBase,
      selected
    });
    addSelected(selected, secondary0);
    const secondary1 = this.resolveSlot("secondary1", {
      ...contextBase,
      selected
    });
    addSelected(selected, secondary1);
    const flaw = this.resolveSlot("flaw", {
      ...contextBase,
      selected
    });
    addSelected(selected, flaw);

    const fateMeterAfter = updateFateMeter(fateMeterBefore, main.quality, this.registry);
    const destinies = this.buildSelectionState(main, secondary0, secondary1, flaw);
    const finalDebug: DestinyRollDebugInfo = {
      attempts: debug.attempts,
      rejectedByExclusive: uniqueStable(debug.rejectedByExclusive),
      selectedWeights: Object.freeze({ ...debug.selectedWeights }),
      fateMeterBefore,
      fateMeterAfter
    };
    const draft: DestinyRollDraft = {
      draftId: input.draftId,
      seed: input.seed,
      rerollIndex: input.rerollIndex,
      destinies,
      fateMeter: fateMeterAfter,
      ...(input.locks === undefined ? {} : { locks: input.locks }),
      debug: finalDebug
    };

    return deepFreeze(draft);
  }

  private resolveSlot(slot: DestinyRollSlot, context: RollContext): DestinyTraitDefinition {
    const locked = getLockedTrait(slot, context.input);
    if (locked !== undefined) {
      return locked;
    }
    return slot === "flaw" ? this.rollFlaw(context) : this.rollDestiny(slot, context);
  }

  private rollDestiny(slot: Exclude<DestinyRollSlot, "flaw">, context: RollContext): DestinyTraitDefinition {
    const slotType: DestinySlotType = slot === "main" ? "main" : "secondary";
    const candidates = this.getCompatibleCandidates(slotType, context.selected, context.debug);
    if (candidates.length === 0) {
      throw new Error(`No compatible destiny traits available for ${slotType} slot`);
    }

    const quality = this.pickQuality(slotType, candidates, context);
    const qualityCandidates = candidates.filter((trait) => trait.quality === quality);
    const finalCandidates = qualityCandidates.length > 0 ? qualityCandidates : candidates;
    const trait = pickWeightedWithDebug(
      slot === "main" ? context.streams.mainTrait : context.streams.secondaryTrait,
      finalCandidates.map((candidate) => ({
        item: candidate,
        weight: this.getTraitWeight(candidate, context)
      })),
      context.debug
    );

    return trait;
  }

  private rollFlaw(context: RollContext): DestinyTraitDefinition {
    const candidates = this.getCompatibleCandidates("flaw", context.selected, context.debug);
    if (candidates.length === 0) {
      throw new Error("No compatible destiny traits available for flaw slot");
    }

    const severityWeights = Object.entries(this.registry.qualityWeights.flawSeverity).filter(
      (entry): entry is [NonNullable<DestinyTraitDefinition["calamitySeverity"]>, number] =>
        entry[1] !== undefined && entry[1] > 0 && candidates.some((trait) => trait.calamitySeverity === entry[0])
    );
    const severity = severityWeights.length === 0
      ? undefined
      : pickWeightedWithDebug(
          context.streams.flawSeverity,
          severityWeights.map(([item, weight]) => ({ item, weight })),
          context.debug
        );
    const severityCandidates = severity === undefined
      ? candidates
      : candidates.filter((trait) => trait.calamitySeverity === severity);

    return pickWeightedWithDebug(
      context.streams.flawTrait,
      severityCandidates.map((candidate) => ({
        item: candidate,
        weight: this.getTraitWeight(candidate, context)
      })),
      context.debug
    );
  }

  private pickQuality(
    slotType: "main" | "secondary",
    candidates: readonly DestinyTraitDefinition[],
    context: RollContext
  ): DestinyQuality {
    const qualityWeights = this.registry.qualityWeights[slotType];
    const forceRare = slotType === "main" && context.fateMeterBefore.guaranteeRareNext;
    const boosted = slotType === "main" && context.fateMeterBefore.value >= this.registry.rerollRules.fateMeter.thresholdBoost;
    const choices = Object.entries(qualityWeights).flatMap(([quality, rawWeight]) => {
      if (rawWeight === undefined || rawWeight <= 0) {
        return [];
      }
      const typedQuality = quality as DestinyQuality;
      if (slotType === "main" && typedQuality === "mortal") {
        return [];
      }
      if (forceRare && !RARE_OR_ABOVE_QUALITY.includes(typedQuality)) {
        return [];
      }
      if (!candidates.some((trait) => trait.quality === typedQuality)) {
        return [];
      }
      const boost = boosted && RARE_OR_ABOVE_QUALITY.includes(typedQuality)
        ? this.getQualityRank(typedQuality) >= this.getQualityRank("mystic") ? 2.25 : 1.75
        : 1;
      return [{ item: typedQuality, weight: rawWeight * boost }];
    });

    if (choices.length > 0) {
      return pickWeightedWithDebug(
        slotType === "main" ? context.streams.mainQuality : context.streams.secondaryQuality,
        choices,
        context.debug
      );
    }

    return pickWeightedWithDebug(
      slotType === "main" ? context.streams.mainQuality : context.streams.secondaryQuality,
      uniqueStable(candidates.map((trait) => trait.quality))
        .filter((quality) => slotType !== "main" || quality !== "mortal")
        .map((quality) => ({ item: quality, weight: 1 })),
      context.debug
    );
  }

  private getCompatibleCandidates(
    slotType: DestinySlotType,
    selected: readonly DestinyTraitDefinition[],
    debug: MutableDestinyRollDebugInfo
  ): readonly DestinyTraitDefinition[] {
    const baseCandidates = this.registry.getTraitsForSlot(slotType).filter((trait) => {
      if (selected.some((existing) => existing.id === trait.id)) {
        return false;
      }
      if (slotType === "main" && trait.quality === "mortal") {
        return false;
      }
      return true;
    });
    const compatible = baseCandidates.filter((trait) => {
      const blocked = this.combinationEngine.getHardExclusiveRuleIds([
        ...selected.map((existing) => existing.id),
        trait.id
      ]);
      if (blocked.length > 0) {
        debug.rejectedByExclusive.push(...blocked.map((ruleId) => `${trait.id}:${ruleId}`));
        return false;
      }
      return true;
    });
    const highQualityLimited = compatible.filter((trait) => this.withinHighQualityLimits(trait, selected));

    return highQualityLimited.length > 0 ? highQualityLimited : compatible;
  }

  private withinHighQualityLimits(trait: DestinyTraitDefinition, selected: readonly DestinyTraitDefinition[]): boolean {
    if (HIGH_QUALITY.includes(trait.quality)) {
      const highCount = selected.filter((existing) => HIGH_QUALITY.includes(existing.quality)).length;
      if (highCount >= this.registry.rerollRules.highQualityLimits.maxEarthlyOrAbovePerDraft) {
        return false;
      }
    }
    if (trait.quality === "forbidden") {
      const forbiddenCount = selected.filter((existing) => existing.quality === "forbidden").length;
      if (forbiddenCount >= this.registry.rerollRules.highQualityLimits.maxForbiddenPerDraft) {
        return false;
      }
    }
    return true;
  }

  private getTraitWeight(trait: DestinyTraitDefinition, context: RollContext): number {
    let weight = trait.baseWeight * getOpeningBiasMultiplier(trait, context.openingBiasTags);
    if (context.input.previousTraitIds?.includes(trait.id) === true) {
      weight *= this.registry.rerollRules.rerollHistory.repetitionPenalty;
    }
    return weight;
  }

  private buildSelectionState(
    main: DestinyTraitDefinition,
    secondary0: DestinyTraitDefinition,
    secondary1: DestinyTraitDefinition,
    flaw: DestinyTraitDefinition
  ): DestinySelectionState {
    const traits = [main, secondary0, secondary1, flaw];
    const evaluation = this.combinationEngine.evaluateTraits(traits);
    if (evaluation.hardExclusiveRuleIds.length > 0) {
      throw new Error(`Locked destiny traits contain hard-exclusive rules: ${evaluation.hardExclusiveRuleIds.join(", ")}`);
    }
    const warnings = uniqueStable([...evaluation.synergyWarnings, ...evaluation.conflictWarnings]);

    return {
      main,
      secondary: [secondary0, secondary1],
      flaw,
      synergies: evaluation.synergies,
      softConflicts: evaluation.softConflictRuleIds,
      synergyWarnings: evaluation.synergyWarnings,
      conflictWarnings: evaluation.conflictWarnings,
      warnings
    };
  }

  private getQualityRank(quality: DestinyQuality): number {
    return getQualityRank(this.registry, quality, 0);
  }
}

export function generateDestinyRollDraft(input: GenerateDestinyRollInput): DestinyRollDraft {
  return new DefaultDestinyRoller().generate(input);
}

function validateInput(input: GenerateDestinyRollInput): void {
  if (input.seed.length === 0) {
    throw new Error("Destiny roll seed must not be empty");
  }
  if (input.draftId.length === 0) {
    throw new Error("Destiny roll draftId must not be empty");
  }
  if (!Number.isInteger(input.rerollIndex) || input.rerollIndex < 0) {
    throw new Error("Destiny roll rerollIndex must be a non-negative integer");
  }
}

function createDestinyRngStreams(seed: string, rerollIndex: number): DestinyRngStreams {
  const root = new SeededRng(`${seed}:destiny_roll:${rerollIndex}`, "destiny_roll");
  return {
    mainQuality: root.fork("mainQuality"),
    mainTrait: root.fork("mainTrait"),
    secondaryQuality: root.fork("secondaryQuality"),
    secondaryTrait: root.fork("secondaryTrait"),
    flawSeverity: root.fork("flawSeverity"),
    flawTrait: root.fork("flawTrait")
  };
}

function getLockedTrait(slot: DestinyRollSlot, input: GenerateDestinyRollInput): DestinyTraitDefinition | undefined {
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

function getLockName(slot: DestinyRollSlot): keyof Pick<
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
  const qualityRank = getQualityRank(registry, mainQuality, 0);
  const rareRank = getQualityRank(registry, "rare", 3);
  const mysticRank = getQualityRank(registry, "mystic", 4);
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

function getOpeningBiasMultiplier(trait: DestinyTraitDefinition, destinyBiasTags: readonly string[]): number {
  let multiplier = 1;

  for (const tag of destinyBiasTags) {
    if (!tag.startsWith("destinyBias:")) {
      continue;
    }
    const key = tag.slice("destinyBias:".length);
    const aliases = DESTINY_BIAS_ALIASES[key] ?? [];
    if (aliases.includes(trait.id)) {
      multiplier *= 8;
      continue;
    }
    if (trait.id.includes(key)) {
      multiplier *= 6;
      continue;
    }
    if (key === "forbidden" && (trait.quality === "forbidden" || trait.tags.includes("forbidden"))) {
      multiplier *= 5;
      continue;
    }

    const tokens = key.split("_").filter((token) => token.length > 2);
    if (tokens.some((token) => trait.tags.includes(token) || trait.id.includes(token))) {
      multiplier *= 2;
    }
  }

  return multiplier;
}

function pickWeightedWithDebug<T>(
  rng: SeededRng,
  choices: readonly { readonly item: T; readonly weight: number }[],
  debug: MutableDestinyRollDebugInfo
): T {
  debug.attempts += 1;
  if (choices.length === 0) {
    throw new Error("Destiny weighted pick requires at least one choice");
  }

  let totalWeight = 0;
  for (const choice of choices) {
    if (!Number.isFinite(choice.weight) || choice.weight < 0) {
      throw new Error("Destiny weighted pick weights must be finite and non-negative");
    }
    totalWeight += choice.weight;
  }
  if (totalWeight <= 0) {
    throw new Error("Destiny weighted pick requires at least one positive weight");
  }

  const roll = rng.rangeFloat(0, totalWeight);
  let cumulative = 0;
  let fallback = choices[0]!.item;
  for (const choice of choices) {
    if (choice.weight > 0) {
      fallback = choice.item;
    }
    const key = getDebugWeightKey(choice.item);
    debug.selectedWeights[key] = choice.weight;
    cumulative += choice.weight;
    if (roll < cumulative) {
      return choice.item;
    }
  }

  return fallback;
}

function getQualityRank(registry: DestinyRegistry, quality: DestinyQuality, fallback: number): number {
  if (quality === "flaw") {
    return 0;
  }
  try {
    return registry.getQuality(quality).rank;
  } catch {
    return fallback;
  }
}

function getDebugWeightKey(item: unknown): string {
  if (item !== null && typeof item === "object" && "id" in item && typeof item.id === "string") {
    return item.id;
  }
  return String(item);
}

function addSelected(selected: DestinyTraitDefinition[], trait: DestinyTraitDefinition): void {
  if (!selected.some((existing) => existing.id === trait.id)) {
    selected.push(trait);
  }
}

function uniqueStable<T>(values: readonly T[]): readonly T[] {
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
