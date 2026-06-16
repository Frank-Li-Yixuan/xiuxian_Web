import type {
  LifeStorylineDebugInfo,
  StorylineProgress
} from "../types/life-storylines-types.v0.1";

export const DOWNSTREAM_STORYLINE_SELECTOR_SOURCE = "life_storylines_v0_1_downstream_selector";

export interface DownstreamStorylineSelectionInput {
  readonly storylines: readonly StorylineProgress[];
  readonly debug?: Pick<LifeStorylineDebugInfo, "scoreBreakdownByStoryline" | "signalTags">;
  readonly minCount?: number;
  readonly maxCount?: number;
}

interface RankedStoryline {
  readonly storyline: StorylineProgress;
  readonly evidenceCount: number;
  readonly supportWeight: number;
  readonly rank: number;
}

const DEFAULT_MIN_COUNT = 1;
const DEFAULT_MAX_COUNT = 3;
const SYSTEM_PRELUDE_STORYLINE_ID = "storyline_system_prelude";
const SUPPORT_SOURCES = [
  "originNarrative:canonicalActive",
  "originNarrative:progress",
  "ninePalace",
  "spiritualRoot",
  "destiny",
  "origin",
  "hiddenFate",
  "carriedItem",
  "lifeState",
  "recentMonthlyEvents",
  "majorChoiceOutcome"
] as const;
const NON_EVIDENCE_SOURCES = ["baseWeight", "agePhaseAffinity", "limit"] as const;
const SYSTEM_EXPLICIT_SOURCES = ["hiddenFate", "carriedItem", "lifeState", "recentMonthlyEvents", "majorChoiceOutcome"] as const;
const SYSTEM_EXPLICIT_TOKENS = [
  "age18_system",
  "age18:system",
  "hook_system_static",
  "thread_system_static"
] as const;

export function selectDownstreamActiveStorylines(
  input: DownstreamStorylineSelectionInput
): readonly StorylineProgress[] {
  const minCount = clampCount(input.minCount ?? DEFAULT_MIN_COUNT, 0, DEFAULT_MAX_COUNT);
  const maxCount = clampCount(input.maxCount ?? DEFAULT_MAX_COUNT, Math.max(1, minCount), DEFAULT_MAX_COUNT);
  const nonDormant = input.storylines.filter((storyline) => storyline.status !== "dormant");
  const ranked = nonDormant
    .filter((storyline) => shouldAllowDownstreamStoryline(storyline, input.debug))
    .map((storyline) => rankStoryline(storyline, input.debug))
    .sort(compareRankedStorylines);
  const selected: RankedStoryline[] = [];
  let fatedCount = 0;
  let dominantCount = 0;

  for (const candidate of ranked) {
    if (selected.length >= maxCount) {
      break;
    }
    if (candidate.storyline.status === "fated" && fatedCount >= 1) {
      continue;
    }
    if (candidate.storyline.status === "dominant" && dominantCount >= 2) {
      continue;
    }
    selected.push(candidate);
    if (candidate.storyline.status === "fated") {
      fatedCount += 1;
    }
    if (candidate.storyline.status === "dominant") {
      dominantCount += 1;
    }
  }

  if (selected.length < minCount) {
    for (const candidate of ranked) {
      if (selected.some((entry) => entry.storyline.storylineId === candidate.storyline.storylineId)) {
        continue;
      }
      selected.push(candidate);
      if (selected.length >= minCount) {
        break;
      }
    }
  }

  return deepFreeze(selected.map((entry) => cloneStoryline(entry.storyline)));
}

export function getDownstreamActiveStorylineIds(
  input: DownstreamStorylineSelectionInput
): readonly string[] {
  return deepFreeze(selectDownstreamActiveStorylines(input).map((storyline) => storyline.storylineId));
}

export function countStorylineEvidence(
  storylineId: string,
  debug?: Pick<LifeStorylineDebugInfo, "scoreBreakdownByStoryline">
): number {
  return getPositiveEvidenceEntries(storylineId, debug).length;
}

function rankStoryline(
  storyline: StorylineProgress,
  debug?: Pick<LifeStorylineDebugInfo, "scoreBreakdownByStoryline">
): RankedStoryline {
  const evidence = getPositiveEvidenceEntries(storyline.storylineId, debug);
  return {
    storyline,
    evidenceCount: evidence.length,
    supportWeight: evidence.reduce((sum, entry) => sum + entry.weight, 0),
    rank: toStatusRank(storyline.status)
  };
}

function compareRankedStorylines(left: RankedStoryline, right: RankedStoryline): number {
  return right.storyline.score - left.storyline.score ||
    right.evidenceCount - left.evidenceCount ||
    right.supportWeight - left.supportWeight ||
    right.rank - left.rank ||
    left.storyline.storylineId.localeCompare(right.storyline.storylineId);
}

function shouldAllowDownstreamStoryline(
  storyline: StorylineProgress,
  debug?: Pick<LifeStorylineDebugInfo, "scoreBreakdownByStoryline" | "signalTags">
): boolean {
  if (storyline.storylineId !== SYSTEM_PRELUDE_STORYLINE_ID) {
    return true;
  }
  return hasExplicitSystemPreludeSupport(storyline, debug);
}

function hasExplicitSystemPreludeSupport(
  storyline: StorylineProgress,
  debug?: Pick<LifeStorylineDebugInfo, "scoreBreakdownByStoryline" | "signalTags">
): boolean {
  const breakdown = debug?.scoreBreakdownByStoryline[storyline.storylineId] ?? [];
  const hasExplicitSource = breakdown.some((entry) =>
    entry.weight > 0 && SYSTEM_EXPLICIT_SOURCES.some((source) => entry.source === source || entry.source.startsWith(`${source}:`))
  );
  const signalText = (debug?.signalTags ?? []).join(" ").toLowerCase();
  const hasExplicitToken = SYSTEM_EXPLICIT_TOKENS.some((token) => signalText.includes(token));
  if (hasExplicitToken) {
    return true;
  }
  return hasExplicitSource && (storyline.status === "dominant" || storyline.status === "fated");
}

function getPositiveEvidenceEntries(
  storylineId: string,
  debug?: Pick<LifeStorylineDebugInfo, "scoreBreakdownByStoryline">
): readonly { readonly source: string; readonly weight: number; readonly note?: string }[] {
  return (debug?.scoreBreakdownByStoryline[storylineId] ?? []).filter((entry) =>
    entry.weight > 0 &&
    !NON_EVIDENCE_SOURCES.some((source) => entry.source === source || entry.source.startsWith(`${source}:`)) &&
    SUPPORT_SOURCES.some((source) => entry.source === source || entry.source.startsWith(`${source}:`))
  );
}

function toStatusRank(status: StorylineProgress["status"]): number {
  switch (status) {
    case "fated":
      return 5;
    case "dominant":
      return 4;
    case "active":
      return 3;
    case "hinted":
      return 2;
    case "dormant":
      return 1;
  }
}

function cloneStoryline(storyline: StorylineProgress): StorylineProgress {
  return {
    ...storyline,
    tags: [...storyline.tags]
  };
}

function clampCount(value: number, min: number, max: number): number {
  if (!Number.isInteger(value)) {
    return min;
  }
  return Math.min(max, Math.max(min, value));
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
