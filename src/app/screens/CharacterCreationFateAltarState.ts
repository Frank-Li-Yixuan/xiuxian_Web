import { GENERATED_UI_ASSET_IDS, type GeneratedUiAssetId } from "../../assets/generatedUiAssets";
import type {
  CharacterCreationLockKey,
  CharacterCreationLocks,
  CoreThreeTreasures,
  DestinyTraitState,
  SpiritualRootState
} from "../../character/CharacterCreationTypes";

export type StatAuraCssVars = Readonly<Record<"--jing-aura" | "--qi-aura" | "--shen-aura", string>>;

const ROOT_AURA_BY_ELEMENT: Readonly<Record<string, GeneratedUiAssetId>> = {
  metal: GENERATED_UI_ASSET_IDS.rootAuraMetal,
  wood: GENERATED_UI_ASSET_IDS.rootAuraWood,
  water: GENERATED_UI_ASSET_IDS.rootAuraWater,
  fire: GENERATED_UI_ASSET_IDS.rootAuraFire,
  earth: GENERATED_UI_ASSET_IDS.rootAuraEarth,
  thunder: GENERATED_UI_ASSET_IDS.rootAuraThunder,
  yin: GENERATED_UI_ASSET_IDS.rootAuraYin
};

export function getRootAuraAssetId(root: SpiritualRootState): GeneratedUiAssetId {
  if (root.rootId.includes("mixed") || root.elements.length !== 1) {
    return GENERATED_UI_ASSET_IDS.rootAuraMixed;
  }
  return ROOT_AURA_BY_ELEMENT[root.elements[0] ?? ""] ?? GENERATED_UI_ASSET_IDS.rootAuraMixed;
}

export function getStatAuraCssVars(stats: CoreThreeTreasures): StatAuraCssVars {
  return {
    "--jing-aura": toAuraIntensity(stats.jing),
    "--qi-aura": toAuraIntensity(stats.qi),
    "--shen-aura": toAuraIntensity(stats.shen)
  };
}

export function getDestinyOverlayClasses(traits: readonly DestinyTraitState[]): readonly string[] {
  const tags = new Set(traits.flatMap((trait) => trait.tags));
  const classes: string[] = [];
  if (hasAny(tags, ["雷法", "天劫"])) {
    classes.push("has-thunder-destiny");
  }
  if (hasAny(tags, ["魔念", "心魔", "魔道"])) {
    classes.push("has-demonic-destiny");
  }
  if (hasAny(tags, ["剑修", "飞剑"])) {
    classes.push("has-sword-destiny");
  }
  if (hasAny(tags, ["炼丹", "药理"])) {
    classes.push("has-alchemy-destiny");
  }
  if (hasAny(tags, ["短寿", "劫命", "劫数"])) {
    classes.push("has-tribulation-destiny");
  }
  return classes;
}

export function toggleCharacterCreationLock(
  locks: CharacterCreationLocks,
  lockKey: CharacterCreationLockKey
): CharacterCreationLocks {
  return {
    ...locks,
    [lockKey]: !locks[lockKey]
  };
}

function toAuraIntensity(value: number): string {
  if (!Number.isFinite(value)) {
    return "0";
  }
  const normalized = Math.min(1, Math.max(0, (value - 72) / 28));
  return normalized.toFixed(3);
}

function hasAny(tags: ReadonlySet<string>, expected: readonly string[]): boolean {
  return expected.some((tag) => tags.has(tag));
}
