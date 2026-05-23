import type { EffectDefinition, EffectEvent, RenderLayerDefinition } from "../src/types/vfx-types.v0.1";

export class VfxRegistry {
  private effects = new Map<string, EffectDefinition>();
  private layers: RenderLayerDefinition[] = [];

  registerEffect(def: EffectDefinition): void {
    if (this.effects.has(def.id)) {
      throw new Error(`Duplicate VFX effect id: ${def.id}`);
    }
    this.effects.set(def.id, def);
  }

  registerLayers(layers: RenderLayerDefinition[]): void {
    this.layers = [...layers].sort((a, b) => a.z - b.z);
  }

  getEffect(id: string): EffectDefinition {
    const effect = this.effects.get(id);
    if (!effect) throw new Error(`Unknown VFX effect id: ${id}`);
    return effect;
  }

  resolveLayer(event: EffectEvent): string {
    return event.layerOverride ?? this.getEffect(event.effectId).defaultLayer;
  }
}
