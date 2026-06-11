import type {
  FactionDefinition,
  LocationDefinition,
  WorldNarrativeContextBuildInput,
  WorldNarrativeContextFragment,
  WorldNarrativeSafetyFlag
} from "../types/worldbuilding-types.v0.1";
import { loadWorldbuildingRegistry, type WorldbuildingRegistry } from "./WorldbuildingRegistry";

export class WorldNarrativeContextBuilder {
  constructor(private readonly registry: WorldbuildingRegistry) {}

  build(input: WorldNarrativeContextBuildInput): WorldNarrativeContextFragment {
    if (!Array.isArray(input.locationIds) || input.locationIds.length === 0) {
      throw new Error("World narrative context requires at least one location id");
    }

    const hiddenTerms = normalizeTerms([...(input.hiddenTrueNames ?? []), ...(input.hiddenInternalIds ?? [])]);
    const forbiddenTerms = Object.freeze([...this.registry.eventRules.forbiddenModernTerms]);
    const safetyFlags = new Set<WorldNarrativeSafetyFlag>();
    const locations = input.locationIds.map((id) => this.registry.getLocation(id));
    const factions = (input.factionIds ?? []).map((id) => this.registry.getFaction(id));
    const locationTags = uniqueStable(locations.flatMap((location) => location.tags));
    const factionTags = uniqueStable(factions.flatMap((faction) => faction.tags));
    const preferredTerms = clonePreferredTerms(this.registry.glossary.preferredTerms, hiddenTerms, forbiddenTerms, safetyFlags);
    const visibleOmenAliases = filterSafeTerms(
      input.visibleOmenAliases ?? [],
      hiddenTerms,
      forbiddenTerms,
      safetyFlags
    );
    const allowedTerms = filterSafeTerms(
      [
        ...Object.values(preferredTerms).flat(),
        ...locations.map((location) => location.name),
        ...locationTags,
        ...factions.map((faction) => faction.name),
        ...factionTags
      ],
      hiddenTerms,
      forbiddenTerms,
      safetyFlags
    );
    const locationNames = safeNames(locations, hiddenTerms, forbiddenTerms, safetyFlags);
    const factionNames = safeNames(factions, hiddenTerms, forbiddenTerms, safetyFlags);

    const systemPromptFragment = [
      "WORLD narrative context v0.1.",
      "LLM may polish prose only; rules engine decides all gameplay facts.",
      "LLM must not decide numeric values.",
      "LLM must not decide events.",
      "LLM must not decide success or failure.",
      "LLM must not emit effects or rewards.",
      "LLM must not request or output hidden trueName or internal hidden ids.",
      `Use restrained xiuxian border-world prose. Tone rules: ${this.registry.glossary.toneRules.join(" | ")}`,
      `Banned tone: ${this.registry.glossary.bannedTone.join(" | ")}`,
      `forbidden modern terms: ${forbiddenTerms.join(", ")}`
    ].join("\n");

    const contextPromptFragment = [
      `worldId=${this.registry.worldId}`,
      `regionId=${this.registry.startingRegionId}`,
      `locations=${locationNames.join(",")}`,
      `locationTags=${locationTags.join(",")}`,
      `factions=${factionNames.join(",")}`,
      `factionTags=${factionTags.join(",")}`,
      `truthLevel=${input.truthLevel}`,
      `lifePhase=${input.lifePhase}`,
      `allowedTerms=${allowedTerms.join(",")}`,
      `visibleOmenAliases=${visibleOmenAliases.join(",")}`
    ].join("; ");

    return {
      systemPromptFragment,
      contextPromptFragment,
      fallbackTemplateContext: {
        locationNames,
        locationTags,
        factionNames,
        factionTags,
        truthLevel: input.truthLevel,
        lifePhase: input.lifePhase,
        preferredTerms,
        toneRules: Object.freeze([...this.registry.glossary.toneRules]),
        bannedTone: Object.freeze([...this.registry.glossary.bannedTone]),
        visibleOmenAliases,
        allowedTerms
      },
      safeWorldContext: {
        regionId: this.registry.startingRegionId,
        agePhaseId: input.lifePhase,
        locationIds: Object.freeze([...input.locationIds]),
        allowedTerms,
        forbiddenTerms
      },
      forbiddenTerms,
      safetyFlags: Object.freeze([...safetyFlags])
    };
  }
}

export function createWorldNarrativeContextBuilder(
  registry: WorldbuildingRegistry = loadWorldbuildingRegistry()
): WorldNarrativeContextBuilder {
  return new WorldNarrativeContextBuilder(registry);
}

export function buildWorldNarrativeContext(
  input: WorldNarrativeContextBuildInput,
  registry: WorldbuildingRegistry = loadWorldbuildingRegistry()
): WorldNarrativeContextFragment {
  return createWorldNarrativeContextBuilder(registry).build(input);
}

function clonePreferredTerms(
  preferredTerms: Readonly<Record<string, readonly string[]>>,
  hiddenTerms: readonly string[],
  forbiddenTerms: readonly string[],
  safetyFlags: Set<WorldNarrativeSafetyFlag>
): Readonly<Record<string, readonly string[]>> {
  const entries = Object.entries(preferredTerms).map(([key, terms]) => [
    key,
    filterSafeTerms(terms, hiddenTerms, forbiddenTerms, safetyFlags)
  ] as const);
  return Object.freeze(Object.fromEntries(entries));
}

function safeNames(
  entries: readonly (LocationDefinition | FactionDefinition)[],
  hiddenTerms: readonly string[],
  forbiddenTerms: readonly string[],
  safetyFlags: Set<WorldNarrativeSafetyFlag>
): readonly string[] {
  return filterSafeTerms(entries.map((entry) => entry.name), hiddenTerms, forbiddenTerms, safetyFlags);
}

function filterSafeTerms(
  values: readonly string[],
  hiddenTerms: readonly string[],
  forbiddenTerms: readonly string[],
  safetyFlags: Set<WorldNarrativeSafetyFlag>
): readonly string[] {
  const safeValues: string[] = [];
  for (const value of values) {
    if (typeof value !== "string" || value.length === 0) {
      continue;
    }
    if (containsBlockedTerm(value, hiddenTerms)) {
      safetyFlags.add("hidden_term_redacted");
      continue;
    }
    if (containsBlockedTerm(value, forbiddenTerms)) {
      safetyFlags.add("forbidden_term_redacted");
      continue;
    }
    safeValues.push(value);
  }
  return Object.freeze(uniqueStable(safeValues));
}

function containsBlockedTerm(value: string, blockedTerms: readonly string[]): boolean {
  return blockedTerms.some((term) => term.length > 0 && value.includes(term));
}

function normalizeTerms(values: readonly string[]): readonly string[] {
  return Object.freeze(uniqueStable(values.filter((value) => typeof value === "string" && value.length > 0)));
}

function uniqueStable(values: readonly string[]): readonly string[] {
  const seen = new Set<string>();
  const result: string[] = [];
  for (const value of values) {
    if (seen.has(value)) {
      continue;
    }
    seen.add(value);
    result.push(value);
  }
  return Object.freeze(result);
}
