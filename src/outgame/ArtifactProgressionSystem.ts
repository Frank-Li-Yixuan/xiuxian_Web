import { cloneOutgameProfile, type EquipmentProgressState, type OutgameProfileState } from "./ProfileState";
import { spendResources, type ResourceMap } from "./ResourceWallet";

export interface ArtifactProgressionPack {
  readonly schemaVersion: string;
  readonly rules: Readonly<Record<string, unknown>>;
  readonly artifacts: readonly EquipmentUpgradeDefinition[];
  readonly treasures: readonly EquipmentUpgradeDefinition[];
}

export interface EquipmentUpgradeDefinition {
  readonly id: string;
  readonly name: string;
  readonly unlockDefault?: boolean;
  readonly unlockCost?: ResourceMap;
  readonly stars: readonly StarUpgradeDefinition[];
}

export interface StarUpgradeDefinition {
  readonly star: number;
  readonly cost?: ResourceMap;
  readonly effects: Readonly<Record<string, number | boolean | string>>;
}

export interface UpgradeArtifactStarOptions {
  readonly profile: OutgameProfileState;
  readonly progression: ArtifactProgressionPack;
  readonly artifactId: string;
}

export interface UpgradeArtifactStarResult {
  readonly profile: OutgameProfileState;
  readonly artifactId: string;
  readonly fromStar: number;
  readonly toStar: number;
  readonly spent: ResourceMap;
}

export function upgradeArtifactStar(options: UpgradeArtifactStarOptions): UpgradeArtifactStarResult {
  const definition = requireEquipment(options.progression.artifacts, options.artifactId);
  const current = requireUnlocked(options.profile.artifacts[options.artifactId], options.artifactId);
  const toStar = current.star + 1;
  const target = requireStar(definition, toStar);
  const spent = spendResources(options.profile.wallet, target.cost);
  const artifacts = {
    ...options.profile.artifacts,
    [options.artifactId]: {
      unlocked: true,
      star: toStar
    }
  };

  return deepFreeze({
    profile: cloneOutgameProfile({
      ...options.profile,
      wallet: spent.wallet,
      artifacts
    }),
    artifactId: options.artifactId,
    fromStar: current.star,
    toStar,
    spent: spent.spent
  });
}

function requireEquipment(definitions: readonly EquipmentUpgradeDefinition[], equipmentId: string): EquipmentUpgradeDefinition {
  const definition = definitions.find((candidate) => candidate.id === equipmentId);
  if (definition === undefined) {
    throw new Error(`Missing equipment progression ${equipmentId}`);
  }
  return definition;
}

function requireUnlocked(state: EquipmentProgressState | undefined, equipmentId: string): EquipmentProgressState {
  if (state === undefined || !state.unlocked || state.star <= 0) {
    throw new Error(`Equipment ${equipmentId} is not unlocked`);
  }
  return state;
}

function requireStar(definition: EquipmentUpgradeDefinition, star: number): StarUpgradeDefinition {
  const upgrade = definition.stars.find((candidate) => candidate.star === star);
  if (upgrade === undefined) {
    throw new Error(`Equipment ${definition.id} does not define star ${star}`);
  }
  if (upgrade.cost === undefined) {
    throw new Error(`Equipment ${definition.id} star ${star} has no upgrade cost`);
  }
  return upgrade;
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
