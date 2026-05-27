import type { AudioBusPlayRequest, AudioBusPriority } from "./AudioBus";
import type {
  CanvasPresentationAbilityVfxEvent,
  CanvasPresentationEnemyProjectile,
  CanvasPresentationPickup,
  CanvasPresentationState,
  CanvasPresentationVisualEvent,
  CanvasPresentationWarning
} from "../render/CanvasPresentationState";

const PLAYER_PROJECTILE_FIRE_SFX = "sfx.artifact.flying_sword_fire_01";
const TEMP_ENEMY_PROJECTILE_FIRE_SFX = "sfx.spell.chain_lightning_jump_01";
const WARNING_SFX = "sfx.warning.boss_tribulation_01";
const HIGH_PRESSURE_ENEMY_PROJECTILE_COUNT = 80;

export class CombatSfxMapper {
  private readonly seenPlayerProjectiles = new Set<number>();
  private readonly seenEnemyProjectiles = new Set<number>();
  private readonly seenVisualEvents = new Set<string>();
  private readonly seenAbilityEvents = new Set<string>();
  private readonly seenPickupEntities = new Set<number>();
  private readonly seenWarnings = new Set<string>();

  public createRequests(presentation: CanvasPresentationState): readonly AudioBusPlayRequest[] {
    const requests: AudioBusPlayRequest[] = [];
    const highPressure = isHighPressure(presentation);

    for (const projectile of presentation.playerProjectiles) {
      if (this.markSeen(this.seenPlayerProjectiles, projectile.entityId) && !highPressure) {
        requests.push({
          assetId: PLAYER_PROJECTILE_FIRE_SFX,
          priority: "low",
          volumeScale: projectile.renderKind === "flying_sword" ? 0.72 : 0.55
        });
      }
    }

    for (const projectile of presentation.enemyProjectiles) {
      if (this.markSeen(this.seenEnemyProjectiles, projectile.entityId) && !highPressure) {
        requests.push(enemyProjectileFireRequest(projectile));
      }
    }

    for (const event of presentation.visualEvents) {
      if (!this.markSeen(this.seenVisualEvents, event.id) || event.sfxCueId === undefined) {
        continue;
      }
      const priority = priorityForVisualEvent(event);
      if (highPressure && isLowValueVisualEvent(event, priority)) {
        continue;
      }
      requests.push({ assetId: event.sfxCueId, priority });
    }

    for (const event of presentation.abilityVfx ?? []) {
      if (!this.markSeen(this.seenAbilityEvents, event.id) || event.sfxCueId === undefined) {
        continue;
      }
      requests.push({ assetId: event.sfxCueId, priority: priorityForAbilityEvent(event) });
    }

    for (const pickup of presentation.pickups) {
      if (!this.markSeen(this.seenPickupEntities, pickup.entityId) || pickup.sfxCueId === undefined) {
        continue;
      }
      const priority = priorityForPickup(pickup);
      if (highPressure && priority === "low") {
        continue;
      }
      requests.push({ assetId: pickup.sfxCueId, priority, volumeScale: pickup.renderKind === "material" ? 0.9 : 0.7 });
    }

    for (const warning of presentation.warnings) {
      if (isAudioWarning(warning) && this.markSeen(this.seenWarnings, warning.id)) {
        requests.push({ assetId: WARNING_SFX, priority: warning.severity === "medium" ? "high" : "critical" });
      }
    }

    return Object.freeze(requests);
  }

  public reset(): void {
    this.seenPlayerProjectiles.clear();
    this.seenEnemyProjectiles.clear();
    this.seenVisualEvents.clear();
    this.seenAbilityEvents.clear();
    this.seenPickupEntities.clear();
    this.seenWarnings.clear();
  }

  private markSeen<TValue>(seen: Set<TValue>, value: TValue): boolean {
    if (seen.has(value)) {
      return false;
    }
    seen.add(value);
    return true;
  }
}

function enemyProjectileFireRequest(projectile: CanvasPresentationEnemyProjectile): AudioBusPlayRequest {
  return {
    assetId: TEMP_ENEMY_PROJECTILE_FIRE_SFX,
    priority: projectile.ownerKind === "boss" || projectile.ownerKind === "tribulation" ? "normal" : "low",
    volumeScale: projectile.ownerKind === "boss" ? 0.48 : 0.35
  };
}

function priorityForVisualEvent(event: CanvasPresentationVisualEvent): AudioBusPriority {
  if (event.priority === "critical" || event.kind === "boss_killed" || event.kind === "boss_phase_changed") {
    return "critical";
  }
  if (event.priority === "high" || event.kind === "player_hit" || event.kind === "shield_break" || event.kind === "elite_killed") {
    return "high";
  }
  if (event.priority === "low" || event.kind === "projectile_hit" || event.kind === "enemy_damaged") {
    return "low";
  }
  return "normal";
}

function priorityForAbilityEvent(event: CanvasPresentationAbilityVfxEvent): AudioBusPriority {
  if (event.kind === "spell" && (event.phase === "cast" || event.phase === "hit")) {
    return "high";
  }
  if (event.kind === "artifact") {
    return "normal";
  }
  return "normal";
}

function priorityForPickup(pickup: CanvasPresentationPickup): AudioBusPriority {
  return pickup.renderKind === "material" || pickup.renderKind === "pill" ? "normal" : "low";
}

function isHighPressure(presentation: CanvasPresentationState): boolean {
  return presentation.enemyProjectiles.length > HIGH_PRESSURE_ENEMY_PROJECTILE_COUNT || presentation.warnings.some(isAudioWarning);
}

function isAudioWarning(warning: CanvasPresentationWarning): boolean {
  return warning.kind === "tribulation" || warning.kind === "boss_warning";
}

function isLowValueVisualEvent(event: CanvasPresentationVisualEvent, priority: AudioBusPriority): boolean {
  return priority === "low" || event.kind === "projectile_hit" || event.kind === "enemy_damaged";
}
