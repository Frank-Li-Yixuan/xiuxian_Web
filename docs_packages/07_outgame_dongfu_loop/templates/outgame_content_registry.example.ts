import type {
  ResourceDefinition,
  BuildingDefinition,
  CultivationMethodDefinition,
  SpellCompendiumDefinition,
  AlchemyRecipeDefinition,
  EquipmentUpgradeDefinition,
  BreakthroughTrialDefinition,
} from '../src/types/outgame-types.v0.1';

export interface OutgameContentRegistry {
  resources: Map<string, ResourceDefinition>;
  buildings: Map<string, BuildingDefinition>;
  methods: Map<string, CultivationMethodDefinition>;
  spells: Map<string, SpellCompendiumDefinition>;
  alchemyRecipes: Map<string, AlchemyRecipeDefinition>;
  artifacts: Map<string, EquipmentUpgradeDefinition>;
  treasures: Map<string, EquipmentUpgradeDefinition>;
  breakthroughTrials: Map<string, BreakthroughTrialDefinition>;
}

export function validateOutgameContent(registry: OutgameContentRegistry): string[] {
  const errors: string[] = [];
  const hasResource = (id: string) => registry.resources.has(id) || id === 'cultivation';

  for (const recipe of registry.alchemyRecipes.values()) {
    for (const resourceId of Object.keys(recipe.cost)) {
      if (!hasResource(resourceId)) errors.push(`Recipe ${recipe.id} references missing resource ${resourceId}`);
    }
    if (recipe.output) {
      for (const resourceId of Object.keys(recipe.output)) {
        if (!hasResource(resourceId)) errors.push(`Recipe ${recipe.id} outputs missing resource ${resourceId}`);
      }
    }
  }

  for (const building of registry.buildings.values()) {
    for (const level of building.levels) {
      if (!level.cost) continue;
      for (const resourceId of Object.keys(level.cost)) {
        if (!hasResource(resourceId)) errors.push(`Building ${building.id} level ${level.level} references missing resource ${resourceId}`);
      }
    }
  }

  return errors;
}
