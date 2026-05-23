import { type ContentEntry, type ContentFile, ContentRegistry, isJsonObject } from "./ContentRegistry";

export interface ValidationIssue {
  readonly file: string;
  readonly fieldPath: string;
  readonly reason: string;
}

export function validateContentRegistry(registry: ContentRegistry): ValidationIssue[] {
  const issues: ValidationIssue[] = [];

  validateDuplicateIds(registry, issues);
  for (const entry of registry.getAllEntries()) {
    validateEntry(entry, registry, issues);
  }
  for (const file of registry.getAllFiles()) {
    validateRunConfig(file, registry, issues);
  }

  return issues.sort(
    (a, b) => a.file.localeCompare(b.file) || a.fieldPath.localeCompare(b.fieldPath) || a.reason.localeCompare(b.reason)
  );
}

function validateDuplicateIds(registry: ContentRegistry, issues: ValidationIssue[]): void {
  const seen = new Set<string>();

  for (const entry of registry.getAllEntries()) {
    if (seen.has(entry.id)) {
      issues.push({
        file: entry.path,
        fieldPath: entry.fieldPath,
        reason: `Duplicate id '${entry.id}'`
      });
    } else {
      seen.add(entry.id);
    }
  }
}

function validateEntry(entry: ContentEntry, registry: ContentRegistry, issues: ValidationIssue[]): void {
  switch (entry.category) {
    case "stages":
      validateStage(entry, registry, issues);
      break;
    case "enemies":
      validateEnemy(entry, registry, issues);
      break;
    case "bosses":
      validateBoss(entry, registry, issues);
      break;
    case "rewards":
      validateRewardOrDrop(entry, registry, issues);
      break;
    default:
      break;
  }
}

function validateStage(entry: ContentEntry, registry: ContentRegistry, issues: ValidationIssue[]): void {
  requireReference(entry, "bossId", "bosses", registry, issues);

  const segments = arrayAt(entry.value, "segments");
  for (let segmentIndex = 0; segmentIndex < segments.length; segmentIndex += 1) {
    const segment = objectAt(segments[segmentIndex]);
    if (segment === undefined) {
      continue;
    }

    const segmentPath = `segments[${segmentIndex}]`;
    const duration = numberAt(segment, "duration");
    if (duration !== undefined) {
      requireNonNegative(entry, `${segmentPath}.duration`, duration, issues);
    }

    const waves = arrayAt(segment, "waves");
    for (let waveIndex = 0; waveIndex < waves.length; waveIndex += 1) {
      const wave = objectAt(waves[waveIndex]);
      if (wave === undefined) {
        continue;
      }

      const wavePath = `${segmentPath}.waves[${waveIndex}]`;
      const startTime = numberAt(wave, "startTime");
      const endTime = numberAt(wave, "endTime");
      if (startTime !== undefined) {
        requireNonNegative(entry, `${wavePath}.startTime`, startTime, issues);
      }
      if (endTime !== undefined) {
        requireNonNegative(entry, `${wavePath}.endTime`, endTime, issues);
      }
      if (startTime !== undefined && endTime !== undefined && endTime < startTime) {
        issue(entry, `${wavePath}.endTime`, "wave endTime must be >= startTime", issues);
      }
      if (duration !== undefined && endTime !== undefined && endTime > duration) {
        issue(entry, `${wavePath}.endTime`, "wave endTime must not exceed segment duration", issues);
      }

      const spawnGroups = arrayAt(wave, "spawnGroups");
      for (let groupIndex = 0; groupIndex < spawnGroups.length; groupIndex += 1) {
        const group = objectAt(spawnGroups[groupIndex]);
        if (group === undefined) {
          continue;
        }

        const groupPath = `${wavePath}.spawnGroups[${groupIndex}]`;
        requireReferenceAt(entry, group, "enemyId", `${groupPath}.enemyId`, "enemies", registry, issues);
        validateOptionalNonNegative(entry, group, "count", `${groupPath}.count`, issues);
        validateOptionalNonNegative(entry, group, "interval", `${groupPath}.interval`, issues);
      }
    }

    const endEvent = objectAt(segment.endEvent);
    if (endEvent !== undefined) {
      if (typeof endEvent.rewardPoolId === "string") {
        requireReferenceAt(entry, endEvent, "rewardPoolId", `${segmentPath}.endEvent.rewardPoolId`, "rewards", registry, issues);
      }
      if (typeof endEvent.enemyId === "string") {
        requireReferenceAt(entry, endEvent, "enemyId", `${segmentPath}.endEvent.enemyId`, "enemies", registry, issues);
      }
    }
  }
}

function validateEnemy(entry: ContentEntry, registry: ContentRegistry, issues: ValidationIssue[]): void {
  validateOptionalNonNegative(entry, entry.value, "hp", entryPath(entry, "hp"), issues);
  validateOptionalNonNegative(entry, entry.value, "speed", entryPath(entry, "speed"), issues);
  validateOptionalNonNegative(entry, entry.value, "contactDamage", entryPath(entry, "contactDamage"), issues);
  requireReference(entry, "drops", "rewards", registry, issues);
}

function validateBoss(entry: ContentEntry, registry: ContentRegistry, issues: ValidationIssue[]): void {
  validateOptionalNonNegative(entry, entry.value, "hp", entryPath(entry, "hp"), issues);
  requireReference(entry, "drops", "rewards", registry, issues);

  const rewards = arrayAt(entry.value, "rewards");
  for (let index = 0; index < rewards.length; index += 1) {
    const rewardId = rewards[index];
    if (typeof rewardId === "string" && !registry.hasIdInCategory("rewards", rewardId)) {
      issue(entry, `${entryPath(entry, "rewards")}[${index}]`, `missing rewards id '${rewardId}'`, issues);
    }
  }

  const phases = arrayAt(entry.value, "phases");
  for (let phaseIndex = 0; phaseIndex < phases.length; phaseIndex += 1) {
    const phase = objectAt(phases[phaseIndex]);
    if (phase === undefined) {
      continue;
    }

    const threshold = numberAt(phase, "hpThreshold");
    if (threshold !== undefined && (threshold < 0 || threshold > 1)) {
      issue(entry, `${entryPath(entry, "phases")}[${phaseIndex}].hpThreshold`, "boss hpThreshold must be between 0 and 1", issues);
    }
  }
}

function validateRewardOrDrop(entry: ContentEntry, registry: ContentRegistry, issues: ValidationIssue[]): void {
  const entries = arrayAt(entry.value, "entries");
  if (entries.length === 0) {
    return;
  }

  let totalWeight = 0;
  for (let index = 0; index < entries.length; index += 1) {
    const item = objectAt(entries[index]);
    if (item === undefined) {
      continue;
    }

    const weight = numberAt(item, "weight");
    if (weight !== undefined) {
      if (weight < 0) {
        issue(entry, `${entryPath(entry, "entries")}[${index}].weight`, "reward weight must be non-negative", issues);
      }
      totalWeight += weight;
    }

    const chance = numberAt(item, "chance");
    if (chance !== undefined && chance < 0) {
      issue(entry, `${entryPath(entry, "entries")}[${index}].chance`, "drop chance must be non-negative", issues);
    }

    validateRewardTarget(entry, item, `${entryPath(entry, "entries")}[${index}]`, registry, issues);
  }

  if (entries.some((item) => objectAt(item)?.weight !== undefined) && totalWeight <= 0) {
    issue(entry, entryPath(entry, "entries"), "reward pool total weight must be positive", issues);
  }
}

function validateRewardTarget(
  entry: ContentEntry,
  item: Record<string, unknown>,
  itemPath: string,
  registry: ContentRegistry,
  issues: ValidationIssue[]
): void {
  if (typeof item.targetId !== "string" || typeof item.type !== "string") {
    return;
  }

  const category = rewardTargetCategory(item.type);
  if (category !== undefined && !registry.hasIdInCategory(category, item.targetId)) {
    issue(entry, `${itemPath}.targetId`, `missing ${category} id '${item.targetId}'`, issues);
  }
}

function validateRunConfig(file: ContentFile, registry: ContentRegistry, issues: ValidationIssue[]): void {
  if (!isJsonObject(file.data) || typeof file.data.runId !== "string") {
    return;
  }

  if (typeof file.data.stageId === "string" && !registry.hasIdInCategory("stages", file.data.stageId)) {
    issues.push({ file: file.path, fieldPath: "stageId", reason: `missing stages id '${file.data.stageId}'` });
  }

  const players = objectAt(file.data.players);
  if (players === undefined) {
    return;
  }

  for (const [playerId, loadoutValue] of Object.entries(players)) {
    const loadout = objectAt(loadoutValue);
    if (loadout === undefined) {
      continue;
    }

    validateLoadoutRef(file, `${playerId}.natalArtifactId`, loadout.natalArtifactId, "artifacts", registry, issues);
    validateLoadoutArray(file, `${playerId}.spiritTreasureIds`, loadout.spiritTreasureIds, "treasures", registry, issues);
    validateLoadoutArray(file, `${playerId}.spellIds`, loadout.spellIds, "spells", registry, issues);
    validateLoadoutArray(file, `${playerId}.pillIds`, loadout.pillIds, "pills", registry, issues);
  }
}

function validateLoadoutArray(
  file: ContentFile,
  fieldPath: string,
  value: unknown,
  category: string,
  registry: ContentRegistry,
  issues: ValidationIssue[]
): void {
  if (!Array.isArray(value)) {
    return;
  }

  for (let index = 0; index < value.length; index += 1) {
    validateLoadoutRef(file, `${fieldPath}[${index}]`, value[index], category, registry, issues);
  }
}

function validateLoadoutRef(
  file: ContentFile,
  fieldPath: string,
  value: unknown,
  category: string,
  registry: ContentRegistry,
  issues: ValidationIssue[]
): void {
  if (typeof value === "string" && !registry.hasIdInCategory(category, value)) {
    issues.push({ file: file.path, fieldPath, reason: `missing ${category} id '${value}'` });
  }
}

function rewardTargetCategory(type: string): string | undefined {
  switch (type) {
    case "spell_new":
      return "spells";
    case "spirit_treasure":
      return "treasures";
    case "natal_artifact_inner":
      return "artifacts";
    case "pill":
      return "pills";
    default:
      return undefined;
  }
}

function requireReference(
  entry: ContentEntry,
  field: string,
  category: string,
  registry: ContentRegistry,
  issues: ValidationIssue[]
): void {
  requireReferenceAt(entry, entry.value, field, entryPath(entry, field), category, registry, issues);
}

function requireReferenceAt(
  entry: ContentEntry,
  object: Record<string, unknown>,
  field: string,
  fieldPath: string,
  category: string,
  registry: ContentRegistry,
  issues: ValidationIssue[]
): void {
  const id = object[field];
  if (typeof id === "string" && !registry.hasIdInCategory(category, id)) {
    issue(entry, fieldPath, `missing ${category} id '${id}'`, issues);
  }
}

function validateOptionalNonNegative(
  entry: ContentEntry,
  object: Record<string, unknown>,
  field: string,
  fieldPath: string,
  issues: ValidationIssue[]
): void {
  const value = numberAt(object, field);
  if (value !== undefined) {
    requireNonNegative(entry, fieldPath, value, issues);
  }
}

function requireNonNegative(entry: ContentEntry, fieldPath: string, value: number, issues: ValidationIssue[]): void {
  if (value < 0) {
    issue(entry, fieldPath, "number must be non-negative", issues);
  }
}

function issue(entry: ContentEntry, fieldPath: string, reason: string, issues: ValidationIssue[]): void {
  issues.push({ file: entry.path, fieldPath, reason });
}

function entryPath(entry: ContentEntry, field: string): string {
  return entry.fieldPath === "id" ? field : entry.fieldPath.replace(/\.id$/, `.${field}`);
}

function objectAt(value: unknown): Record<string, unknown> | undefined {
  return value !== null && typeof value === "object" && !Array.isArray(value) ? (value as Record<string, unknown>) : undefined;
}

function arrayAt(object: Record<string, unknown>, field: string): unknown[] {
  const value = object[field];
  return Array.isArray(value) ? value : [];
}

function numberAt(object: Record<string, unknown>, field: string): number | undefined {
  const value = object[field];
  return typeof value === "number" && Number.isFinite(value) ? value : undefined;
}
