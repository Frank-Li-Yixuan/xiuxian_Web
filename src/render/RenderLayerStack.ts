import type { CanvasLikeContext } from "./PrimitiveDrawing";

export interface RenderLayerDefinition {
  readonly id: string;
  readonly z: number;
  readonly description: string;
}

export interface RenderLayerDataPack {
  readonly schemaVersion?: string;
  readonly layers: readonly RenderLayerDefinition[];
  readonly hardRules?: readonly string[];
}

export interface RenderCommand {
  readonly id: string;
  readonly layerId: string;
  readonly draw: (context: CanvasLikeContext) => void;
}

export class RenderLayerStack {
  private readonly layersById: ReadonlyMap<string, RenderLayerDefinition>;
  private readonly layers: readonly RenderLayerDefinition[];

  public constructor(layers: readonly RenderLayerDefinition[]) {
    const sorted = [...layers].sort((a, b) => a.z - b.z || a.id.localeCompare(b.id));
    const byId = new Map<string, RenderLayerDefinition>();
    for (const layer of sorted) {
      validateLayer(layer);
      if (byId.has(layer.id)) {
        throw new Error(`Duplicate render layer id: ${layer.id}`);
      }
      byId.set(layer.id, layer);
    }
    this.layers = Object.freeze(sorted);
    this.layersById = byId;
  }

  public getLayers(): readonly RenderLayerDefinition[] {
    return this.layers;
  }

  public getLayer(layerId: string): RenderLayerDefinition | undefined {
    return this.layersById.get(layerId);
  }

  public isAbove(upperLayerId: string, lowerLayerId: string): boolean {
    return this.requireLayer(upperLayerId).z > this.requireLayer(lowerLayerId).z;
  }

  public sortCommands(commands: readonly RenderCommand[]): readonly RenderCommand[] {
    const sorted = commands
      .map((command, index) => {
        const layer = this.requireLayer(command.layerId);
        return { command, index, z: layer.z };
      })
      .sort((a, b) => a.z - b.z || a.index - b.index)
      .map((entry) => entry.command);

    return Object.freeze(sorted);
  }

  public flush(context: CanvasLikeContext, commands: readonly RenderCommand[]): void {
    for (const command of this.sortCommands(commands)) {
      command.draw(context);
    }
  }

  private requireLayer(layerId: string): RenderLayerDefinition {
    const layer = this.layersById.get(layerId);
    if (layer === undefined) {
      throw new Error(`Unknown render layer: ${layerId}`);
    }
    return layer;
  }
}

export function createRenderLayerStack(layers: readonly RenderLayerDefinition[]): RenderLayerStack {
  return new RenderLayerStack(layers);
}

export function createRenderLayerStackFromData(data: RenderLayerDataPack): RenderLayerStack {
  return createRenderLayerStack(data.layers);
}

function validateLayer(layer: RenderLayerDefinition): void {
  if (layer.id.length === 0) {
    throw new Error("render layer id must not be empty");
  }
  if (!Number.isFinite(layer.z)) {
    throw new Error(`render layer ${layer.id} z must be finite`);
  }
}
