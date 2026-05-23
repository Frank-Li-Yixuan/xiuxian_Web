export type VfxQuality = "low" | "medium" | "high";
export type ShakeProfileId = "micro" | "small" | "medium" | "large" | "ultimate";

export interface EffectProfile {
  readonly id: string;
  readonly name: string;
  readonly category: string;
  readonly defaultLayer: string;
  readonly durationFrames: number;
  readonly maxInstances: number;
  readonly screenShake: string | null;
  readonly screenFlash: unknown;
  readonly particles: {
    readonly shape: string;
    readonly count?: readonly number[];
    readonly lifeFrames?: readonly number[];
    readonly colors?: readonly string[];
  };
  readonly readability: Record<string, unknown>;
}

export interface SpellVfxProfile {
  readonly name: string;
  readonly element: string;
  readonly events: readonly {
    readonly frame: number | string;
    readonly effect: string;
  }[];
  readonly readability: Record<string, unknown>;
}

export interface ArtifactVfxProfile {
  readonly name: string;
  readonly projectileShape: string;
  readonly trailFrames?: number;
  readonly warningFrames?: number;
  readonly hitEffect?: string;
  readonly impactEffect?: string;
  readonly colors: readonly string[];
  readonly rules: Record<string, unknown>;
}

export interface TribulationVfxProfile {
  readonly name: string;
  readonly timeline: readonly Record<string, unknown>[];
  readonly warning: {
    readonly durationFrames: number;
    readonly lastFlashFrames: number;
    readonly outerAlpha: number;
    readonly innerAlpha: number;
    readonly layer: string;
  };
  readonly strike: Record<string, unknown>;
  readonly success: Record<string, unknown>;
}

export interface ParticleBudget {
  readonly normalParticles: number;
  readonly spellParticles: number;
  readonly backgroundParticles: number;
  readonly pickupTrails: number;
  readonly audioVoices: number;
  readonly targetFps: number;
}

export interface ParticleBudgetsData {
  readonly defaultQuality: string;
  readonly qualityProfiles: Record<string, ParticleBudget>;
  readonly autoDowngrade?: Record<string, number>;
  readonly autoUpgrade?: Record<string, number>;
  readonly mergeThresholds?: Record<string, number>;
}

export interface ShakeProfile {
  readonly intensityPx: readonly number[];
  readonly durationFrames: readonly number[];
  readonly decay: string;
}

export interface ScreenShakeProfilesData {
  readonly profiles: Record<string, ShakeProfile>;
  readonly composition: string;
  readonly renderOnly: boolean;
  readonly rules: readonly string[];
}

export interface VfxRegistryInput {
  readonly effectProfiles: {
    readonly effects: readonly EffectProfile[];
  };
  readonly spellProfiles: {
    readonly spells: Record<string, SpellVfxProfile>;
  };
  readonly artifactProfiles: {
    readonly artifacts: Record<string, ArtifactVfxProfile>;
  };
  readonly tribulationProfiles: {
    readonly profiles: Record<string, TribulationVfxProfile>;
  };
  readonly particleBudgets: ParticleBudgetsData;
  readonly visualTokens: {
    readonly colors: Record<string, Record<string, string>>;
    readonly alphaLimits?: Record<string, number>;
    readonly hitbox?: Record<string, number>;
  };
  readonly readabilityRules: {
    readonly rules: Record<string, number>;
    readonly automaticGuards?: readonly Record<string, string>[];
  };
  readonly screenShakeProfiles: ScreenShakeProfilesData;
}

export class VfxRegistry {
  private readonly effectProfilesById: ReadonlyMap<string, EffectProfile>;
  private readonly spellProfiles: Readonly<Record<string, SpellVfxProfile>>;
  private readonly artifactProfiles: Readonly<Record<string, ArtifactVfxProfile>>;
  private readonly tribulationProfiles: Readonly<Record<string, TribulationVfxProfile>>;
  private readonly particleBudgets: ParticleBudgetsData;
  private readonly visualTokens: VfxRegistryInput["visualTokens"];
  private readonly readabilityRules: VfxRegistryInput["readabilityRules"];
  private readonly screenShakeProfiles: ScreenShakeProfilesData;

  public constructor(input: VfxRegistryInput) {
    const effectProfilesById = new Map<string, EffectProfile>();
    for (const profile of cloneReadonly(input.effectProfiles.effects)) {
      validateId(profile.id, "effect profile id");
      if (effectProfilesById.has(profile.id)) {
        throw new Error(`Duplicate VFX effect profile id: ${profile.id}`);
      }
      effectProfilesById.set(profile.id, profile);
    }

    this.effectProfilesById = effectProfilesById;
    this.spellProfiles = cloneReadonly(input.spellProfiles.spells);
    this.artifactProfiles = cloneReadonly(input.artifactProfiles.artifacts);
    this.tribulationProfiles = cloneReadonly(input.tribulationProfiles.profiles);
    this.particleBudgets = cloneReadonly(input.particleBudgets);
    this.visualTokens = cloneReadonly(input.visualTokens);
    this.readabilityRules = cloneReadonly(input.readabilityRules);
    this.screenShakeProfiles = cloneReadonly(input.screenShakeProfiles);

    validateBudgets(this.particleBudgets);
  }

  public getEffectProfile(effectId: string): EffectProfile {
    const profile = this.effectProfilesById.get(effectId);
    if (profile === undefined) {
      throw new Error(`Unknown VFX effect profile: ${effectId}`);
    }
    return profile;
  }

  public getSpellProfile(spellId: string): SpellVfxProfile {
    return requireRecord(this.spellProfiles, spellId, "VFX spell profile");
  }

  public getArtifactProfile(artifactId: string): ArtifactVfxProfile {
    return requireRecord(this.artifactProfiles, artifactId, "VFX artifact profile");
  }

  public getTribulationProfile(tribulationId: string): TribulationVfxProfile {
    return requireRecord(this.tribulationProfiles, tribulationId, "VFX tribulation profile");
  }

  public getParticleBudget(quality: string = this.particleBudgets.defaultQuality): ParticleBudget {
    return requireRecord(this.particleBudgets.qualityProfiles, quality, "particle budget");
  }

  public getDefaultQuality(): string {
    return this.particleBudgets.defaultQuality;
  }

  public getVisualColor(group: string, token: string): string {
    const colors = requireRecord(this.visualTokens.colors, group, "visual color group");
    return requireRecord(colors, token, `visual color ${group}`);
  }

  public getReadabilityRule(key: string): number {
    return requireRecord(this.readabilityRules.rules, key, "readability rule");
  }

  public getShakeProfile(profileId: string): ShakeProfile {
    return requireRecord(this.screenShakeProfiles.profiles, profileId, "screen shake profile");
  }

  public listEffectProfiles(): readonly EffectProfile[] {
    return Object.freeze([...this.effectProfilesById.values()]);
  }
}

export function createVfxRegistryFromData(input: VfxRegistryInput): VfxRegistry {
  return new VfxRegistry(input);
}

function validateBudgets(data: ParticleBudgetsData): void {
  if (!data.qualityProfiles[data.defaultQuality]) {
    throw new Error(`default particle quality ${data.defaultQuality} is missing`);
  }
  for (const [quality, budget] of Object.entries(data.qualityProfiles)) {
    for (const [key, value] of Object.entries(budget)) {
      if (!Number.isFinite(value) || value < 0) {
        throw new Error(`particle budget ${quality}.${key} must be a non-negative finite number`);
      }
    }
  }
}

function validateId(value: string, label: string): void {
  if (value.length === 0) {
    throw new Error(`${label} must not be empty`);
  }
}

function requireRecord<T>(record: Readonly<Record<string, T>>, key: string, label: string): T {
  const value = record[key];
  if (value === undefined) {
    throw new Error(`Unknown ${label}: ${key}`);
  }
  return value;
}

function cloneReadonly<T>(value: T): T {
  if (Array.isArray(value)) {
    return Object.freeze(value.map((entry) => cloneReadonly(entry))) as T;
  }
  if (value && typeof value === "object") {
    const clone: Record<string, unknown> = {};
    for (const [key, entry] of Object.entries(value as Record<string, unknown>)) {
      clone[key] = cloneReadonly(entry);
    }
    return Object.freeze(clone) as T;
  }
  return value;
}
