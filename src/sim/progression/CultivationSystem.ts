import { SIM_FPS } from "../SimConstants";
import type { CombatPlayerState } from "../player/PlayerSystem";
import type { PlayerCultivationState, TeamInsightExpState } from "../state/SimState";

export interface CultivationDataPack {
  readonly cultivationRules: {
    readonly inRunBreathGainPerSecond: number;
  };
  readonly items: readonly RealmDefinition[];
  readonly layerProgression: readonly LayerProgressionDefinition[];
}

export interface RealmDefinition {
  readonly id: string;
  readonly layers: number;
  readonly baseStatMultiplier: number;
  readonly qiPoolMultiplier: number;
  readonly shenMultiplier: number;
  readonly breakthrough: {
    readonly type: "major_realm";
    readonly nextRealmId: string;
    readonly tribulationEventId: string;
    readonly outOfRunTribulationStageId: string;
  };
}

export interface LayerProgressionDefinition {
  readonly realmId: string;
  readonly layer: number;
  readonly cultivationToNext: number;
  readonly minorStatAdd?: CultivationStatAdd;
  readonly majorBottleneck?: boolean;
  readonly targetRealmId?: string;
}

export interface CultivationStatAdd {
  readonly jing: number;
  readonly qiRoot: number;
  readonly shen: number;
}

export interface CultivationData {
  readonly inRunBreathGainPerSecond: number;
  readonly realms: Readonly<Record<string, RealmDefinition>>;
  readonly layerProgression: Readonly<Record<string, LayerProgressionDefinition>>;
}

export interface CultivationPlayerState extends CombatPlayerState {
  readonly jing: number;
  readonly qiRoot: number;
  readonly shen: number;
}

export interface CultivationGainInput {
  readonly playerId: string;
  readonly amount: number;
  readonly source: string;
}

export interface TribulationRequest {
  readonly frame: number;
  readonly playerId: string;
  readonly eventId: string;
  readonly realmFrom: string;
  readonly realmTo: string;
  readonly reason: "major_bottleneck" | "debug_force";
}

export type CultivationEvent =
  | {
      readonly frame: number;
      readonly type: "cultivation_gain";
      readonly playerId: string;
      readonly source: string;
      readonly amount: number;
    }
  | {
      readonly frame: number;
      readonly type: "minor_breakthrough";
      readonly playerId: string;
      readonly fromLayer: number;
      readonly toLayer: number;
      readonly statAdd: CultivationStatAdd;
    }
  | {
      readonly frame: number;
      readonly type: "tribulation_triggered";
      readonly playerId: string;
      readonly eventId: string;
    };

export interface StepCultivationSystemOptions {
  readonly frame: number;
  readonly deltaFrames: number;
  readonly players: readonly CultivationPlayerState[];
  readonly playerCultivations: readonly PlayerCultivationState[];
  readonly teamInsightExp: TeamInsightExpState;
  readonly cultivationData: CultivationData;
  readonly gains?: readonly CultivationGainInput[];
}

export interface StepCultivationSystemResult {
  readonly players: readonly CultivationPlayerState[];
  readonly playerCultivations: readonly PlayerCultivationState[];
  readonly teamInsightExp: TeamInsightExpState;
  readonly events: readonly CultivationEvent[];
  readonly tribulationRequests: readonly TribulationRequest[];
}

export function indexCultivationData(pack: CultivationDataPack): CultivationData {
  if (!Number.isFinite(pack.cultivationRules.inRunBreathGainPerSecond) || pack.cultivationRules.inRunBreathGainPerSecond < 0) {
    throw new Error("inRunBreathGainPerSecond must be non-negative");
  }

  const realms: Record<string, RealmDefinition> = {};
  for (const realm of pack.items) {
    validateRealm(realm);
    if (realms[realm.id] !== undefined) {
      throw new Error(`Duplicate realm id: ${realm.id}`);
    }
    realms[realm.id] = realm;
  }

  const layerProgression: Record<string, LayerProgressionDefinition> = {};
  for (const layer of pack.layerProgression) {
    validateLayer(layer);
    layerProgression[layerKey(layer.realmId, layer.layer)] = layer;
  }

  return {
    inRunBreathGainPerSecond: pack.cultivationRules.inRunBreathGainPerSecond,
    realms,
    layerProgression
  };
}

export function stepCultivationSystem(options: StepCultivationSystemOptions): StepCultivationSystemResult {
  assertFrame(options.frame);
  if (!Number.isInteger(options.deltaFrames) || options.deltaFrames < 0) {
    throw new Error("deltaFrames must be a non-negative integer");
  }

  let players: readonly CultivationPlayerState[] = [...options.players].sort((a, b) => a.playerId.localeCompare(b.playerId));
  const playerById = new Map(players.map((player) => [player.playerId, player]));
  const gainByPlayer = new Map<string, CultivationGainInput[]>();
  const events: CultivationEvent[] = [];
  const tribulationRequests: TribulationRequest[] = [];

  for (const gain of options.gains ?? []) {
    validateGain(gain);
    const gains = gainByPlayer.get(gain.playerId) ?? [];
    gains.push(gain);
    gainByPlayer.set(gain.playerId, gains);
    events.push({
      frame: options.frame,
      type: "cultivation_gain",
      playerId: gain.playerId,
      source: gain.source,
      amount: gain.amount
    });
  }

  const naturalGain = (options.cultivationData.inRunBreathGainPerSecond * options.deltaFrames) / SIM_FPS;
  const nextCultivations: PlayerCultivationState[] = [];

  for (const cultivation of [...options.playerCultivations].sort((a, b) => a.playerId.localeCompare(b.playerId))) {
    const player = playerById.get(cultivation.playerId);
    const explicitGain = (gainByPlayer.get(cultivation.playerId) ?? []).reduce((sum, gain) => sum + gain.amount, 0);
    const totalGain = explicitGain + (player !== undefined && canCultivate(player) && !cultivation.inTribulation ? naturalGain : 0);
    const resolved = applyCultivationToPlayer({
      frame: options.frame,
      cultivation,
      totalGain,
      players,
      cultivationData: options.cultivationData
    });

    players = resolved.players;
    nextCultivations.push(resolved.cultivation);
    events.push(...resolved.events);
    tribulationRequests.push(...resolved.tribulationRequests);
  }

  return {
    players,
    playerCultivations: nextCultivations.sort((a, b) => a.playerId.localeCompare(b.playerId)),
    teamInsightExp: options.teamInsightExp,
    events,
    tribulationRequests
  };
}

function applyCultivationToPlayer(options: {
  readonly frame: number;
  readonly cultivation: PlayerCultivationState;
  readonly totalGain: number;
  readonly players: readonly CultivationPlayerState[];
  readonly cultivationData: CultivationData;
}): {
  readonly cultivation: PlayerCultivationState;
  readonly players: readonly CultivationPlayerState[];
  readonly events: readonly CultivationEvent[];
  readonly tribulationRequests: readonly TribulationRequest[];
} {
  if (options.totalGain <= 0 || options.cultivation.inTribulation) {
    return {
      cultivation: options.cultivation,
      players: options.players,
      events: [],
      tribulationRequests: []
    };
  }

  const layerDefinition = getLayerDefinition(options.cultivationData, options.cultivation.realmId, options.cultivation.layer);
  const totalCultivation = options.cultivation.cultivation + options.totalGain;
  if (totalCultivation < options.cultivation.cultivationToNext) {
    return {
      cultivation: { ...options.cultivation, cultivation: totalCultivation },
      players: options.players,
      events: [],
      tribulationRequests: []
    };
  }

  if (layerDefinition.majorBottleneck === true) {
    const request = createTribulationRequest(options.frame, options.cultivation, options.cultivationData, layerDefinition);
    return {
      cultivation: {
        ...options.cultivation,
        cultivation: options.cultivation.cultivationToNext,
        inTribulation: true
      },
      players: options.players,
      events: [
        {
          frame: options.frame,
          type: "tribulation_triggered",
          playerId: options.cultivation.playerId,
          eventId: request.eventId
        }
      ],
      tribulationRequests: [request]
    };
  }

  const nextLayer = options.cultivation.layer + 1;
  const overflow = totalCultivation - options.cultivation.cultivationToNext;
  const nextLayerDefinition = getLayerDefinition(options.cultivationData, options.cultivation.realmId, nextLayer);
  const statAdd = layerDefinition.minorStatAdd ?? { jing: 0, qiRoot: 0, shen: 0 };

  return {
    cultivation: {
      ...options.cultivation,
      layer: nextLayer,
      cultivation: overflow,
      cultivationToNext: nextLayerDefinition.cultivationToNext
    },
    players: options.players.map((player) =>
      player.playerId === options.cultivation.playerId
        ? {
            ...player,
            jing: player.jing + statAdd.jing,
            qiRoot: player.qiRoot + statAdd.qiRoot,
            shen: player.shen + statAdd.shen
          }
        : player
    ),
    events: [
      {
        frame: options.frame,
        type: "minor_breakthrough",
        playerId: options.cultivation.playerId,
        fromLayer: options.cultivation.layer,
        toLayer: nextLayer,
        statAdd
      }
    ],
    tribulationRequests: []
  };
}

function createTribulationRequest(
  frame: number,
  cultivation: PlayerCultivationState,
  cultivationData: CultivationData,
  layerDefinition: LayerProgressionDefinition
): TribulationRequest {
  const realm = cultivationData.realms[cultivation.realmId];
  if (realm === undefined) {
    throw new Error(`Missing realm definition: ${cultivation.realmId}`);
  }
  const realmTo = layerDefinition.targetRealmId ?? realm.breakthrough.nextRealmId;

  return {
    frame,
    playerId: cultivation.playerId,
    eventId: realm.breakthrough.tribulationEventId,
    realmFrom: cultivation.realmId,
    realmTo,
    reason: "major_bottleneck"
  };
}

function getLayerDefinition(data: CultivationData, realmId: string, layer: number): LayerProgressionDefinition {
  const definition = data.layerProgression[layerKey(realmId, layer)];
  if (definition === undefined) {
    throw new Error(`Missing cultivation layer progression: ${realmId} layer ${layer}`);
  }
  return definition;
}

function layerKey(realmId: string, layer: number): string {
  return `${realmId}:${layer}`;
}

function canCultivate(player: CultivationPlayerState): boolean {
  return player.aliveState === "body" || player.aliveState === "yang_shen";
}

function validateRealm(realm: RealmDefinition): void {
  if (realm.id.length === 0) {
    throw new Error("realm id must not be empty");
  }
  if (!Number.isInteger(realm.layers) || realm.layers <= 0) {
    throw new Error(`realm ${realm.id} layers must be a positive integer`);
  }
}

function validateLayer(layer: LayerProgressionDefinition): void {
  if (layer.realmId.length === 0) {
    throw new Error("layer realmId must not be empty");
  }
  if (!Number.isInteger(layer.layer) || layer.layer <= 0) {
    throw new Error(`layer ${layer.realmId} layer must be a positive integer`);
  }
  if (!Number.isFinite(layer.cultivationToNext) || layer.cultivationToNext < 0) {
    throw new Error(`layer ${layer.realmId}:${layer.layer} cultivationToNext must be non-negative`);
  }
}

function validateGain(gain: CultivationGainInput): void {
  if (gain.playerId.length === 0) {
    throw new Error("gain playerId must not be empty");
  }
  if (gain.source.length === 0) {
    throw new Error("gain source must not be empty");
  }
  if (!Number.isFinite(gain.amount) || gain.amount < 0) {
    throw new Error("gain amount must be non-negative");
  }
}

function assertFrame(frame: number): void {
  if (!Number.isInteger(frame) || frame < 0) {
    throw new Error("frame must be a non-negative integer");
  }
}
