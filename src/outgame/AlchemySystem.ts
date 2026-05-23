import { cloneOutgameProfile, type OutgameProfileState } from "./ProfileState";
import { addResources, spendResources, type ResourceMap } from "./ResourceWallet";

export interface AlchemyRecipePack {
  readonly schemaVersion: string;
  readonly rules: Readonly<Record<string, unknown>>;
  readonly recipes: readonly AlchemyRecipeDefinition[];
}

export interface AlchemyRecipeDefinition {
  readonly id: string;
  readonly name: string;
  readonly category: "combat_pill" | "permanent_pill" | "cultivation_pill" | "breakthrough_pill" | "detox";
  readonly requiresBuildingLevel?: Readonly<Record<string, number>>;
  readonly cost: ResourceMap;
  readonly output?: ResourceMap;
  readonly outputPermanentEffect?: {
    readonly jingProgress?: number;
    readonly qiRootProgress?: number;
    readonly shenProgress?: number;
    readonly toxin: {
      readonly body?: number;
      readonly qi?: number;
      readonly shen?: number;
    };
  };
  readonly toxinReduction?: number;
  readonly notes?: string;
}

export interface CraftAlchemyRecipeOptions {
  readonly profile: OutgameProfileState;
  readonly recipes: AlchemyRecipePack;
  readonly recipeId: string;
}

export interface CraftAlchemyRecipeResult {
  readonly profile: OutgameProfileState;
  readonly recipeId: string;
  readonly spent: ResourceMap;
  readonly output: ResourceMap;
}

export function craftAlchemyRecipe(options: CraftAlchemyRecipeOptions): CraftAlchemyRecipeResult {
  const recipe = requireRecipe(options.recipes, options.recipeId);
  assertBuildingRequirements(options.profile, recipe.requiresBuildingLevel);
  const spent = spendResources(options.profile.wallet, recipe.cost);
  const output = recipe.output ?? {};
  const pills = addPills(options.profile.pills, output);
  const permanent = applyPermanentEffect(options.profile, recipe);
  const profile = cloneOutgameProfile({
    ...options.profile,
    wallet: addResources(spent.wallet, filterNonPillOutputs(output)),
    pills,
    alchemy: permanent.alchemy,
    realm: permanent.realm
  });

  return deepFreeze({
    profile,
    recipeId: recipe.id,
    spent: spent.spent,
    output
  });
}

function requireRecipe(recipes: AlchemyRecipePack, recipeId: string): AlchemyRecipeDefinition {
  const recipe = recipes.recipes.find((candidate) => candidate.id === recipeId);
  if (recipe === undefined) {
    throw new Error(`Missing alchemy recipe ${recipeId}`);
  }
  return recipe;
}

function assertBuildingRequirements(profile: OutgameProfileState, requirements: Readonly<Record<string, number>> | undefined): void {
  for (const [buildingId, requiredLevel] of Object.entries(requirements ?? {})) {
    const building = profile.buildings[buildingId];
    if (building === undefined || building.level < requiredLevel) {
      throw new Error(`Building ${buildingId} level ${requiredLevel} is required`);
    }
  }
}

function addPills(pills: OutgameProfileState["pills"], output: ResourceMap): OutgameProfileState["pills"] {
  const next: Record<string, number> = { ...pills };
  for (const [itemId, amount] of Object.entries(output)) {
    if (isPillId(itemId)) {
      next[itemId] = (next[itemId] ?? 0) + amount;
    }
  }
  return Object.freeze(next);
}

function filterNonPillOutputs(output: ResourceMap): ResourceMap {
  const resources: Record<string, number> = {};
  for (const [itemId, amount] of Object.entries(output)) {
    if (!isPillId(itemId)) {
      resources[itemId] = amount;
    }
  }
  return Object.freeze(resources);
}

function isPillId(itemId: string): boolean {
  return itemId.endsWith("_pill");
}

function applyPermanentEffect(
  profile: OutgameProfileState,
  recipe: AlchemyRecipeDefinition
): Pick<OutgameProfileState, "alchemy" | "realm"> {
  const effect = recipe.outputPermanentEffect;
  if (effect === undefined) {
    return {
      alchemy: profile.alchemy,
      realm: profile.realm
    };
  }
  return {
    alchemy: {
      toxin: {
        body: profile.alchemy.toxin.body + (effect.toxin.body ?? 0),
        qi: profile.alchemy.toxin.qi + (effect.toxin.qi ?? 0),
        shen: profile.alchemy.toxin.shen + (effect.toxin.shen ?? 0)
      },
      permanentPillProgress: {
        jing: profile.alchemy.permanentPillProgress.jing + (effect.jingProgress ?? 0),
        qiRoot: profile.alchemy.permanentPillProgress.qiRoot + (effect.qiRootProgress ?? 0),
        shen: profile.alchemy.permanentPillProgress.shen + (effect.shenProgress ?? 0)
      }
    },
    realm: profile.realm
  };
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
