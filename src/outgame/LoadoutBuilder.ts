import type { EquipmentProgressState, OutgameProfileState } from "./ProfileState";

export interface LoadoutPresetPack {
  readonly schemaVersion: string;
  readonly presets: readonly LoadoutPresetDefinition[];
}

export interface LoadoutPresetDefinition {
  readonly id: string;
  readonly name: string;
  readonly description: string;
  readonly loadout: LoadoutPresetSelection;
}

export interface LoadoutPresetSummary {
  readonly id: string;
  readonly name: string;
  readonly description: string;
}

export interface LoadoutPresetSelection {
  readonly mainMethodId: string | null;
  readonly natalArtifactId: string | null;
  readonly spiritTreasureIds: readonly (string | null)[];
  readonly spellIds: readonly (string | null)[];
  readonly pillIds: readonly (string | null)[];
}

export interface BuiltEquipmentSlot {
  readonly itemId: string;
  readonly star: number;
}

export interface BuiltPlayerLoadout {
  readonly playerId: string;
  readonly presetId: string;
  readonly presetName: string;
  readonly mainMethodId: string | null;
  readonly natalArtifact: BuiltEquipmentSlot | null;
  readonly spiritTreasures: readonly (BuiltEquipmentSlot | null)[];
  readonly spellIds: readonly (string | null)[];
  readonly spellLevels: Readonly<Record<string, number>>;
  readonly pillIds: readonly (string | null)[];
  readonly openingPowerScore: number;
}

export interface BuildPlayerLoadoutOptions {
  readonly profile: OutgameProfileState;
  readonly presets: LoadoutPresetPack;
  readonly presetId: string;
  readonly playerId: string;
}

const OUTGAME_TO_RUN_PILL_ID: Readonly<Record<string, string>> = Object.freeze({
  rejuvenation_pill: "pill_rejuvenation",
  burning_blood_pill: "pill_burning_blood",
  clear_mind_pill: "pill_clear_mind",
  minor_breakthrough_pill: "pill_minor_breakthrough"
});

export function listAvailableLoadoutPresets(presets: LoadoutPresetPack): readonly LoadoutPresetSummary[] {
  return deepFreeze(
    presets.presets.map((preset) => ({
      id: preset.id,
      name: preset.name,
      description: preset.description
    }))
  );
}

export function buildPlayerLoadoutFromProfile(options: BuildPlayerLoadoutOptions): BuiltPlayerLoadout {
  if (options.playerId.length === 0) {
    throw new Error("playerId must not be empty");
  }
  const preset = requirePreset(options.presets, options.presetId);
  const methodId = resolveMethodId(options.profile, preset.loadout.mainMethodId);
  const natalArtifact = resolveEquipment(options.profile.artifacts, preset.loadout.natalArtifactId);
  const spiritTreasures = padSlots(
    preset.loadout.spiritTreasureIds.map((treasureId) => resolveEquipment(options.profile.treasures, treasureId)),
    2
  );
  const spellIds = padSlots(
    preset.loadout.spellIds.map((spellId) => resolveSpellId(options.profile, spellId)),
    4
  );
  const spellLevels = buildSpellLevels(options.profile, spellIds);
  const pillIds = resolvePillSlots(options.profile, preset.loadout.pillIds);

  return deepFreeze({
    playerId: options.playerId,
    presetId: preset.id,
    presetName: preset.name,
    mainMethodId: methodId,
    natalArtifact,
    spiritTreasures,
    spellIds,
    spellLevels,
    pillIds,
    openingPowerScore: calculateOpeningPowerScore(options.profile, {
      mainMethodId: methodId,
      natalArtifact,
      spiritTreasures,
      spellIds,
      spellLevels,
      pillIds
    })
  });
}

function requirePreset(presets: LoadoutPresetPack, presetId: string): LoadoutPresetDefinition {
  const preset = presets.presets.find((candidate) => candidate.id === presetId);
  if (preset === undefined) {
    throw new Error(`Missing loadout preset ${presetId}`);
  }
  return preset;
}

function resolveMethodId(profile: OutgameProfileState, methodId: string | null): string | null {
  if (methodId === null) {
    return null;
  }
  const method = profile.methods[methodId];
  return method !== undefined && method.unlocked && method.level > 0 ? methodId : null;
}

function resolveEquipment(
  equipment: Readonly<Record<string, EquipmentProgressState>>,
  itemId: string | null
): BuiltEquipmentSlot | null {
  if (itemId === null) {
    return null;
  }
  const state = equipment[itemId];
  if (state === undefined || !state.unlocked || state.star <= 0) {
    return null;
  }
  return {
    itemId,
    star: state.star
  };
}

function resolveSpellId(profile: OutgameProfileState, spellId: string | null): string | null {
  if (spellId === null) {
    return null;
  }
  const spell = profile.spells[spellId];
  return spell !== undefined && spell.unlocked && spell.masteryLevel > 0 ? spellId : null;
}

function buildSpellLevels(profile: OutgameProfileState, spellIds: readonly (string | null)[]): Readonly<Record<string, number>> {
  const levels: Record<string, number> = {};
  for (const spellId of spellIds) {
    if (spellId === null) {
      continue;
    }
    const mastery = profile.spells[spellId]?.masteryLevel ?? 0;
    if (mastery > 0) {
      levels[spellId] = mastery;
    }
  }
  return Object.freeze(levels);
}

function resolvePillSlots(profile: OutgameProfileState, outgamePillIds: readonly (string | null)[]): readonly (string | null)[] {
  const remaining: Record<string, number> = {};
  for (const [pillId, count] of Object.entries(profile.pills)) {
    remaining[pillId] = count;
  }

  return padSlots(
    outgamePillIds.map((pillId) => {
      if (pillId === null || (remaining[pillId] ?? 0) <= 0) {
        return null;
      }
      const runPillId = OUTGAME_TO_RUN_PILL_ID[pillId];
      if (runPillId === undefined) {
        return null;
      }
      remaining[pillId] = (remaining[pillId] ?? 0) - 1;
      return runPillId;
    }),
    3
  );
}

function calculateOpeningPowerScore(
  profile: OutgameProfileState,
  loadout: {
    readonly mainMethodId: string | null;
    readonly natalArtifact: BuiltEquipmentSlot | null;
    readonly spiritTreasures: readonly (BuiltEquipmentSlot | null)[];
    readonly spellIds: readonly (string | null)[];
    readonly spellLevels: Readonly<Record<string, number>>;
    readonly pillIds: readonly (string | null)[];
  }
): number {
  const methodLevel = loadout.mainMethodId === null ? 0 : profile.methods[loadout.mainMethodId]?.level ?? 0;
  const artifactScore = loadout.natalArtifact === null ? 0 : 32 + loadout.natalArtifact.star * 18;
  const treasureScore = loadout.spiritTreasures.reduce((sum, treasure) => sum + (treasure === null ? 0 : 6 + treasure.star * 4), 0);
  const spellScore = loadout.spellIds.reduce((sum, spellId) => sum + (spellId === null ? 0 : 9 + (loadout.spellLevels[spellId] ?? 1) * 7), 0);
  const pillScore = loadout.pillIds.reduce((sum, pillId) => sum + (pillId === null ? 0 : 5), 0);
  return round3(methodLevel * 8 + artifactScore + treasureScore + spellScore + pillScore);
}

function padSlots<T>(slots: readonly T[], size: number): readonly T[] {
  const padded = [...slots].slice(0, size);
  while (padded.length < size) {
    padded.push(null as T);
  }
  return Object.freeze(padded);
}

function round3(value: number): number {
  return Math.round(value * 1_000) / 1_000;
}

function deepFreeze<T>(value: T): T {
  if (value && typeof value === "object" && !Object.isFrozen(value)) {
    Object.freeze(value);
    for (const child of Object.values(value as Record<string, unknown>)) {
      deepFreeze(child);
    }
  }
  return value;
}
