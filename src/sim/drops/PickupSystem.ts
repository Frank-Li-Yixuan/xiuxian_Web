import type { TeamInsightExpState } from "../state/SimState";
import type { CombatPlayerState, Vec2 } from "../player/PlayerSystem";
import type { DropPickupType, PickupState } from "./DropSystem";

export interface PickupPlayerState extends CombatPlayerState {
  readonly pickupRadius: number;
}

export type PickupTeamInsightState = TeamInsightExpState;

export interface PlayerCultivationGain {
  readonly playerId: string;
  readonly amount: number;
  readonly pickupId: string;
}

export interface MaterialPickup {
  readonly playerId: string;
  readonly pickupId: string;
  readonly type: DropPickupType;
  readonly amount: number;
}

export interface ApplyPickupFrameOptions {
  readonly players: readonly PickupPlayerState[];
  readonly teamInsightExp: PickupTeamInsightState;
  readonly pickups: readonly PickupState[];
}

export interface PickupFrameResult {
  readonly players: readonly PickupPlayerState[];
  readonly teamInsightExp: PickupTeamInsightState;
  readonly remainingPickups: readonly PickupState[];
  readonly collectedPickupIds: readonly number[];
  readonly playerCultivationGains: readonly PlayerCultivationGain[];
  readonly materialPickups: readonly MaterialPickup[];
}

const QI_COOP_ECHO_MULTIPLIER = 0.3;

export function applyPickupFrame(options: ApplyPickupFrameOptions): PickupFrameResult {
  let players: readonly PickupPlayerState[] = [...options.players].sort((a, b) => a.playerId.localeCompare(b.playerId));
  let teamInsightExp = options.teamInsightExp;
  const remainingPickups: PickupState[] = [];
  const collectedPickupIds: number[] = [];
  const playerCultivationGains: PlayerCultivationGain[] = [];
  const materialPickups: MaterialPickup[] = [];

  for (const pickup of [...options.pickups].sort((a, b) => a.entityId - b.entityId)) {
    const collector = findCollector(pickup.position, players);
    if (collector === undefined) {
      remainingPickups.push(pickup);
      continue;
    }

    collectedPickupIds.push(pickup.entityId);

    switch (pickup.type) {
      case "insight_exp_orb":
        teamInsightExp = {
          ...teamInsightExp,
          exp: teamInsightExp.exp + pickup.amount
        };
        break;
      case "qi_orb":
        players = applyQiPickup(players, collector.playerId, pickup.amount);
        break;
      case "cultivation_material":
      case "heavenly_material":
        playerCultivationGains.push({
          playerId: collector.playerId,
          amount: getCultivationGainAmount(pickup),
          pickupId: pickup.pickupId
        });
        break;
      case "outer_material":
      case "reward_token":
        materialPickups.push({
          playerId: collector.playerId,
          pickupId: pickup.pickupId,
          type: pickup.type,
          amount: pickup.amount
        });
        break;
      default:
        assertNever(pickup.type);
    }
  }

  return {
    players,
    teamInsightExp,
    remainingPickups,
    collectedPickupIds,
    playerCultivationGains,
    materialPickups
  };
}

function applyQiPickup(
  players: readonly PickupPlayerState[],
  collectorPlayerId: string,
  amount: number
): readonly PickupPlayerState[] {
  return players.map((player) => {
    if (!canCollect(player)) {
      return player;
    }

    const gain = player.playerId === collectorPlayerId ? amount : amount * QI_COOP_ECHO_MULTIPLIER;
    return {
      ...player,
      qi: Math.min(player.maxQi, player.qi + gain)
    };
  });
}

function findCollector(position: Vec2, players: readonly PickupPlayerState[]): PickupPlayerState | undefined {
  let collector: PickupPlayerState | undefined;
  let nearestDistanceSq = Number.POSITIVE_INFINITY;

  for (const player of players) {
    if (!canCollect(player)) {
      continue;
    }
    const dx = player.position.x - position.x;
    const dy = player.position.y - position.y;
    const distanceSq = dx * dx + dy * dy;
    if (distanceSq > player.pickupRadius * player.pickupRadius) {
      continue;
    }
    if (distanceSq < nearestDistanceSq || (distanceSq === nearestDistanceSq && player.playerId < (collector?.playerId ?? ""))) {
      collector = player;
      nearestDistanceSq = distanceSq;
    }
  }

  return collector;
}

function canCollect(player: PickupPlayerState): boolean {
  return player.aliveState === "body" || player.aliveState === "yang_shen";
}

function getCultivationGainAmount(pickup: PickupState): number {
  const explicitGain = pickup.params?.cultivationGain;
  return typeof explicitGain === "number" && Number.isFinite(explicitGain) ? explicitGain : pickup.amount;
}

function assertNever(value: never): never {
  throw new Error(`Unsupported pickup type: ${value}`);
}
