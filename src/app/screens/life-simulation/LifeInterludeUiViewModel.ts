import type { LifeInterludeOutcome } from "../../../types/life-interlude-types.v0.1";
import type { LifeSimulationState, PendingLifeInterludeState } from "../../../types/life-monthly-events-types.v0.1";

export type LifeInterludeUiResolutionMode = "autoResolve" | "manualChallenge";

export interface LifeInterludeUiResultSummary {
  readonly definitionId: string;
  readonly interludeRunId: string;
  readonly mode: string;
  readonly outcome: LifeInterludeOutcome;
  readonly resolutionMode: LifeInterludeUiResolutionMode;
  readonly title: string;
  readonly visibleLogs: readonly string[];
  readonly statChanges: readonly string[];
  readonly woundChanges: readonly string[];
  readonly heartKnotChanges: readonly string[];
  readonly hookHints: readonly string[];
}

const HIDDEN_TRUE_NAME_TERMS = [
  hiddenTermFromCodePoints([0x53e4, 0x96f7, 0x771f, 0x8840]),
  hiddenTermFromCodePoints([0x4e39, 0x5723, 0x9057, 0x9aa8]),
  hiddenTermFromCodePoints([0x7cfb, 0x7edf, 0x5171, 0x9e23, 0x4f53]),
  hiddenTermFromCodePoints([0x524d, 0x4e16, 0x5251, 0x9b44]),
  hiddenTermFromCodePoints([0x9b54, 0x5370, 0x5fae, 0x75d5]),
  hiddenTermFromCodePoints([0x592a, 0x9634, 0x6b8b, 0x8109]),
  hiddenTermFromCodePoints([0x9f99, 0x9aa8, 0x672a, 0x9192]),
  hiddenTermFromCodePoints([0x5929, 0x4e66, 0x6b8b, 0x9875]),
  hiddenTermFromCodePoints([0x57df, 0x5916, 0x6218, 0x573a, 0x56de, 0x54cd]),
  hiddenTermFromCodePoints([0x529f, 0x5fb7, 0x79cd, 0x5b50])
] as const;

function hiddenTermFromCodePoints(codePoints: readonly number[]): string {
  return String.fromCodePoint(...codePoints);
}

export function buildLifeInterludeUiResultSummary(
  beforeState: LifeSimulationState,
  afterState: LifeSimulationState,
  pendingInterlude: PendingLifeInterludeState,
  resolutionMode: LifeInterludeUiResolutionMode
): LifeInterludeUiResultSummary {
  const latestHistory = [...(afterState.lifeInterludeHistory ?? [])]
    .reverse()
    .find((entry) =>
      entry.interludeId === pendingInterlude.runConfig.definitionId &&
      entry.sourceChoiceId === pendingInterlude.sourceOptionInstanceId
    );
  const result = pendingInterlude.result;
  const newLogs = afterState.monthlyLogs.slice(beforeState.monthlyLogs.length);

  return deepFreeze({
    definitionId: sanitizeLifeInterludeUiText(pendingInterlude.runConfig.definitionId),
    interludeRunId: sanitizeLifeInterludeUiText(pendingInterlude.runConfig.interludeRunId),
    mode: sanitizeLifeInterludeUiText(pendingInterlude.runConfig.mode),
    outcome: result?.outcome ?? latestHistory?.outcome ?? "success",
    resolutionMode,
    title: sanitizeLifeInterludeUiText(pendingInterlude.candidate.name || pendingInterlude.runConfig.scenario.title),
    visibleLogs: freezeArray(publicUniqueText([
      ...(result === undefined ? [] : [result.visibleSummary]),
      ...newLogs.flatMap((log) => [
        log.eventTitle,
        log.eventDescription,
        ...(log.visibleEffectSummary ?? [])
      ])
    ])),
    statChanges: freezeArray(readStatChanges(beforeState, afterState)),
    woundChanges: freezeArray(readWoundChanges(beforeState, afterState)),
    heartKnotChanges: freezeArray(readHeartKnotChanges(beforeState, afterState)),
    hookHints: freezeArray(publicUniqueText([
      ...(result?.generatedHooks ?? []),
      ...newLogs.flatMap((log) => log.hooks)
    ]))
  } satisfies LifeInterludeUiResultSummary);
}

export function sanitizeLifeInterludeUiValue(value: unknown): string {
  if (typeof value === "string") {
    return sanitizeLifeInterludeUiText(value);
  }
  if (typeof value === "number" || typeof value === "boolean") {
    return String(value);
  }
  return "public-safe";
}

export function sanitizeLifeInterludeUiText(value: string): string {
  const trimmed = value.trim();
  if (trimmed.length === 0) {
    return "public-safe";
  }
  return isPublicText(trimmed) ? trimmed : "public-safe";
}

function readStatChanges(beforeState: LifeSimulationState, afterState: LifeSimulationState): readonly string[] {
  return publicUniqueText([
    ...readRecordNumberChanges("core", beforeState.core, afterState.core),
    ...readRecordNumberChanges("aptitude", beforeState.aptitude, afterState.aptitude),
    ...readRecordNumberChanges("lifeSkills", beforeState.lifeSkills, afterState.lifeSkills),
    ...readScalarChange("karma", beforeState.karma, afterState.karma),
    ...readScalarChange("merit", beforeState.merit, afterState.merit),
    ...readScalarChange("heartDemon", beforeState.heartDemon, afterState.heartDemon),
    ...readRecordNumberChanges("carriedItemAffinity", beforeState.carriedItemAffinity, afterState.carriedItemAffinity)
  ]);
}

function readRecordNumberChanges(
  prefix: string,
  before: object,
  after: object
): readonly string[] {
  const beforeRecord = before as Readonly<Record<string, number | undefined>>;
  const afterRecord = after as Readonly<Record<string, number | undefined>>;
  const keys = [...new Set([...Object.keys(before), ...Object.keys(after)])].sort();
  return keys.flatMap((key) => readScalarChange(`${prefix}.${key}`, beforeRecord[key] ?? 0, afterRecord[key] ?? 0));
}

function readScalarChange(label: string, before: number, after: number): readonly string[] {
  const delta = after - before;
  if (delta === 0) {
    return [];
  }
  const sign = delta > 0 ? "+" : "";
  return [`${label} ${sign}${delta}`];
}

function readWoundChanges(beforeState: LifeSimulationState, afterState: LifeSimulationState): readonly string[] {
  const before = new Map(beforeState.wounds.map((wound) => [wound.id, wound.severity]));
  return publicUniqueText(afterState.wounds.flatMap((wound) => {
    const previous = before.get(wound.id);
    if (previous === wound.severity) {
      return [];
    }
    const label = previous === undefined
      ? `${wound.id} severity ${wound.severity}`
      : `${wound.id} severity ${previous}->${wound.severity}`;
    return [label];
  }));
}

function readHeartKnotChanges(beforeState: LifeSimulationState, afterState: LifeSimulationState): readonly string[] {
  const before = new Map(beforeState.heartKnots.map((knot) => [knot.id, knot.severity]));
  return publicUniqueText(afterState.heartKnots.flatMap((knot) => {
    const previous = before.get(knot.id);
    if (previous === knot.severity) {
      return [];
    }
    const label = previous === undefined
      ? `${knot.id} severity ${knot.severity}`
      : `${knot.id} severity ${previous}->${knot.severity}`;
    return [label];
  }));
}

function publicUniqueText(values: readonly string[]): readonly string[] {
  const unique: string[] = [];
  const seen = new Set<string>();
  for (const value of values) {
    const safe = sanitizeLifeInterludeUiText(value);
    if (safe === "public-safe" || seen.has(safe)) {
      continue;
    }
    seen.add(safe);
    unique.push(safe);
  }
  return unique;
}

function isPublicText(value: string): boolean {
  const normalized = normalizeToken(value);
  const normalizedForLeakScan = normalized.replaceAll("true_name_revealed", "");
  return normalized.length > 0 &&
    !normalizedForLeakScan.includes("true_name") &&
    !normalizedForLeakScan.includes("truename") &&
    !normalizedForLeakScan.includes("hidden_fate_internal") &&
    !normalizedForLeakScan.includes("hiddenfateinternal") &&
    !normalizedForLeakScan.includes("should_not_leak_hidden_name") &&
    HIDDEN_TRUE_NAME_TERMS.every((term) => !value.includes(term));
}

function normalizeToken(value: string): string {
  return value
    .trim()
    .replace(/([a-z])([A-Z])/g, "$1_$2")
    .replace(/[^a-zA-Z0-9:_]+/g, "_")
    .replace(/_+/g, "_")
    .replace(/^_|_$/g, "")
    .toLowerCase();
}

function freezeArray<T>(items: readonly T[]): readonly T[] {
  return Object.freeze([...items]);
}

function deepFreeze<T>(value: T): T {
  if (value !== null && typeof value === "object") {
    for (const nested of Object.values(value)) {
      deepFreeze(nested);
    }
    Object.freeze(value);
  }
  return value;
}
