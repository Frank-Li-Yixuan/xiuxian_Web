import type {
  CanvasPresentationBoss,
  CanvasPresentationEnemy,
  CanvasPresentationEnemyProjectile,
  CanvasPresentationPickup,
  CanvasPresentationPlayer,
  CanvasPresentationPlayerProjectile,
  CanvasPresentationState,
  CanvasPresentationWarning
} from "../CanvasPresentationState";
import type { InRunUiViewState } from "../../view/InRunViewState";
import { shouldUseFallbackPreview, type ThreeAssetPreviewEntry, type ThreeAssetRegistry } from "../../assets/ThreeAssetRegistry";

export interface Combat3dSnapshotInput {
  readonly viewState: InRunUiViewState;
  readonly presentation: CanvasPresentationState;
}

export interface Combat3dViewStateOptions {
  readonly stressBulletCount?: number;
}

export interface Combat3dScreen {
  readonly width: number;
  readonly height: number;
}

export interface Combat3dWorldPosition {
  readonly x: number;
  readonly y: number;
  readonly z: number;
}

export interface Combat3dModelRef {
  readonly assetId: Combat3dAssetId;
  readonly path: string | undefined;
  readonly usesFallback: boolean;
  readonly scale: {
    readonly x: number;
    readonly y: number;
    readonly z: number;
  };
}

export type Combat3dAssetId =
  | "player.baseHumanoid"
  | "artifact.sword"
  | "enemy.smallImp"
  | "enemy.wolfBeast"
  | "enemy.insect"
  | "enemy.stoneGolem"
  | "pickup.qiOrb"
  | "boss.floatingCrystal";

export interface Combat3dPlayerView {
  readonly id: string;
  readonly playerId: string;
  readonly position: Combat3dWorldPosition;
  readonly model: Combat3dModelRef;
  readonly renderColor: "player1" | "player2";
  readonly aliveState: CanvasPresentationPlayer["aliveState"];
  readonly hpRatio: number;
  readonly qiRatio: number;
}

export interface Combat3dArtifactView {
  readonly id: string;
  readonly ownerPlayerId: string;
  readonly position: Combat3dWorldPosition;
  readonly model: Combat3dModelRef;
}

export interface Combat3dEnemyView {
  readonly id: string;
  readonly entityId: number;
  readonly enemyId: string;
  readonly renderKind: string;
  readonly position: Combat3dWorldPosition;
  readonly model: Combat3dModelRef;
  readonly hpRatio: number;
}

export interface Combat3dPickupView {
  readonly id: string;
  readonly entityId: number;
  readonly pickupId: string;
  readonly renderKind: string;
  readonly label: string;
  readonly position: Combat3dWorldPosition;
  readonly model: Combat3dModelRef;
}

export interface Combat3dBossView {
  readonly id: string;
  readonly entityId: number;
  readonly bossId: string;
  readonly position: Combat3dWorldPosition;
  readonly model: Combat3dModelRef;
  readonly hpRatio: number;
  readonly phaseIndex: number;
  readonly phaseCount: number;
  readonly status: CanvasPresentationBoss["status"];
}

export interface Combat3dBulletView {
  readonly id: string;
  readonly entityId: number | string;
  readonly kind: "player" | "enemy";
  readonly ownerKind: string;
  readonly renderKind: string;
  readonly position: Combat3dWorldPosition;
  readonly radiusWorld: number;
  readonly emissiveColor: string;
}

export interface Combat3dWarningView {
  readonly id: string;
  readonly kind: CanvasPresentationWarning["kind"];
  readonly position: Combat3dWorldPosition;
  readonly radiusWorld: number;
  readonly severity: CanvasPresentationWarning["severity"];
}

export interface Combat3dMetrics {
  readonly objectCount: number;
  readonly activeBullets: number;
  readonly modelCount: number;
  readonly fallbackCount: number;
}

export interface Combat3dViewState {
  readonly frame: number;
  readonly mode: InRunUiViewState["mode"];
  readonly screen: Combat3dScreen;
  readonly players: readonly Combat3dPlayerView[];
  readonly artifacts: readonly Combat3dArtifactView[];
  readonly enemies: readonly Combat3dEnemyView[];
  readonly pickups: readonly Combat3dPickupView[];
  readonly playerBullets: readonly Combat3dBulletView[];
  readonly enemyBullets: readonly Combat3dBulletView[];
  readonly warnings: readonly Combat3dWarningView[];
  readonly boss?: Combat3dBossView;
  readonly metrics: Combat3dMetrics;
}

const SIM_TO_WORLD_SCALE = 120;

export function mapSimToWorld(
  position: { readonly x: number; readonly y: number },
  screen: Combat3dScreen
): Combat3dWorldPosition {
  return {
    x: (position.x - screen.width / 2) / SIM_TO_WORLD_SCALE,
    y: 0,
    z: (position.y - screen.height / 2) / SIM_TO_WORLD_SCALE
  };
}

export function buildCombat3dViewState(
  snapshot: Combat3dSnapshotInput,
  assetRegistry: ThreeAssetRegistry,
  options: Combat3dViewStateOptions = {}
): Combat3dViewState {
  const screen = snapshot.presentation.screen;
  const players = snapshot.presentation.players.map((player) => mapPlayer(player, screen, assetRegistry));
  const artifacts = snapshot.presentation.players.map((player) => mapArtifact(player, screen, assetRegistry));
  const enemies = snapshot.presentation.enemies.map((enemy) => mapEnemy(enemy, screen, assetRegistry));
  const pickups = snapshot.presentation.pickups.map((pickup) => mapPickup(pickup, screen, assetRegistry));
  const playerBullets = snapshot.presentation.playerProjectiles.map((projectile) => mapPlayerBullet(projectile, screen));
  const enemyBullets = [
    ...snapshot.presentation.enemyProjectiles.map((projectile) => mapEnemyBullet(projectile, screen)),
    ...createStressBullets(options.stressBulletCount ?? 0, screen)
  ];
  const warnings = snapshot.presentation.warnings.map((warning) => ({
    id: warning.id,
    kind: warning.kind,
    position: mapSimToWorld(warning.position, screen),
    radiusWorld: warning.radius / SIM_TO_WORLD_SCALE,
    severity: warning.severity
  }));
  const boss = snapshot.presentation.boss === undefined ? undefined : mapBoss(snapshot.presentation.boss, screen, assetRegistry);

  const modelRefs = [
    ...players.map((entity) => entity.model),
    ...artifacts.map((entity) => entity.model),
    ...enemies.map((entity) => entity.model),
    ...pickups.map((entity) => entity.model),
    ...(boss === undefined ? [] : [boss.model])
  ];
  const activeBullets = playerBullets.length + enemyBullets.length;
  const metrics: Combat3dMetrics = {
    objectCount: modelRefs.length + activeBullets + warnings.length,
    activeBullets,
    modelCount: modelRefs.filter((model) => !model.usesFallback).length,
    fallbackCount: modelRefs.filter((model) => model.usesFallback).length
  };

  return {
    frame: snapshot.presentation.frame,
    mode: snapshot.viewState.mode,
    screen,
    players,
    artifacts,
    enemies,
    pickups,
    playerBullets,
    enemyBullets,
    warnings,
    ...(boss === undefined ? {} : { boss }),
    metrics
  };
}

export function mapEnemyKindToAssetId(renderKind: string): Combat3dAssetId {
  switch (renderKind) {
    case "wolf_demon":
    case "elite_split_wind_wolf":
      return "enemy.wolfBeast";
    case "stone_armor_demon":
      return "enemy.stoneGolem";
    case "insect":
    case "bug":
      return "enemy.insect";
    case "mountain_imp":
    case "rogue_cultivator_shadow":
    case "unknown":
    default:
      return "enemy.smallImp";
  }
}

export function mapPickupKindToAssetId(renderKind: string): Combat3dAssetId {
  switch (renderKind) {
    case "spirit_exp":
    case "qi_orb":
    case "material":
    case "pill":
    case "unknown":
    default:
      return "pickup.qiOrb";
  }
}

function mapPlayer(player: CanvasPresentationPlayer, screen: Combat3dScreen, assetRegistry: ThreeAssetRegistry): Combat3dPlayerView {
  return {
    id: `player_${player.playerId}`,
    playerId: player.playerId,
    position: mapSimToWorld(player.position, screen),
    model: resolveModel(assetRegistry, "player.baseHumanoid"),
    renderColor: player.renderColor,
    aliveState: player.aliveState,
    hpRatio: player.hpRatio,
    qiRatio: player.qiRatio
  };
}

function mapArtifact(player: CanvasPresentationPlayer, screen: Combat3dScreen, assetRegistry: ThreeAssetRegistry): Combat3dArtifactView {
  const position = mapSimToWorld({ x: player.position.x + 34, y: player.position.y - 42 }, screen);
  return {
    id: `artifact_${player.playerId}`,
    ownerPlayerId: player.playerId,
    position: { x: position.x, y: 0.58, z: position.z },
    model: resolveModel(assetRegistry, "artifact.sword")
  };
}

function mapEnemy(enemy: CanvasPresentationEnemy, screen: Combat3dScreen, assetRegistry: ThreeAssetRegistry): Combat3dEnemyView {
  return {
    id: `enemy_${enemy.entityId}`,
    entityId: enemy.entityId,
    enemyId: enemy.enemyId,
    renderKind: enemy.renderKind,
    position: mapSimToWorld(enemy.position, screen),
    model: resolveModel(assetRegistry, mapEnemyKindToAssetId(enemy.renderKind)),
    hpRatio: enemy.hpRatio
  };
}

function mapPickup(pickup: CanvasPresentationPickup, screen: Combat3dScreen, assetRegistry: ThreeAssetRegistry): Combat3dPickupView {
  return {
    id: `pickup_${pickup.entityId}`,
    entityId: pickup.entityId,
    pickupId: pickup.pickupId,
    renderKind: pickup.renderKind,
    label: pickup.label,
    position: { ...mapSimToWorld(pickup.position, screen), y: 0.22 },
    model: resolveModel(assetRegistry, mapPickupKindToAssetId(pickup.renderKind))
  };
}

function mapBoss(boss: CanvasPresentationBoss, screen: Combat3dScreen, assetRegistry: ThreeAssetRegistry): Combat3dBossView {
  return {
    id: `boss_${boss.entityId}`,
    entityId: boss.entityId,
    bossId: boss.bossId,
    position: { ...mapSimToWorld(boss.position, screen), y: 0.35 },
    model: resolveModel(assetRegistry, "boss.floatingCrystal"),
    hpRatio: boss.hpRatio,
    phaseIndex: boss.phaseIndex,
    phaseCount: boss.phaseCount,
    status: boss.status
  };
}

function mapPlayerBullet(projectile: CanvasPresentationPlayerProjectile, screen: Combat3dScreen): Combat3dBulletView {
  return {
    id: `player_bullet_${projectile.entityId}`,
    entityId: projectile.entityId,
    kind: "player",
    ownerKind: "player",
    renderKind: projectile.renderKind,
    position: { ...mapSimToWorld(projectile.position, screen), y: 0.18 },
    radiusWorld: Math.max(0.04, projectile.radius / SIM_TO_WORLD_SCALE),
    emissiveColor: projectile.renderKind === "gourd_flame" ? "#fb923c" : "#7dd3fc"
  };
}

function mapEnemyBullet(projectile: CanvasPresentationEnemyProjectile, screen: Combat3dScreen): Combat3dBulletView {
  return {
    id: `enemy_bullet_${projectile.entityId}`,
    entityId: projectile.entityId,
    kind: "enemy",
    ownerKind: projectile.ownerKind,
    renderKind: projectile.renderKind,
    position: { ...mapSimToWorld(projectile.position, screen), y: 0.24 },
    radiusWorld: Math.max(0.05, projectile.radius / SIM_TO_WORLD_SCALE),
    emissiveColor: projectile.ownerKind === "tribulation" ? "#facc15" : projectile.ownerKind === "boss" ? "#fb7185" : "#ef4444"
  };
}

function createStressBullets(count: number, screen: Combat3dScreen): readonly Combat3dBulletView[] {
  const safeCount = Math.max(0, Math.min(1000, Math.trunc(count)));
  const columns = 40;
  return Array.from({ length: safeCount }, (_, index) => {
    const column = index % columns;
    const row = Math.floor(index / columns);
    const x = 280 + column * ((screen.width - 560) / Math.max(1, columns - 1));
    const y = 120 + (row % 25) * ((screen.height - 240) / 24);
    return {
      id: `stress_enemy_bullet_${index}`,
      entityId: `stress_${index}`,
      kind: "enemy",
      ownerKind: "stress",
      renderKind: "enemy_basic",
      position: { ...mapSimToWorld({ x, y }, screen), y: 0.3 },
      radiusWorld: 0.055,
      emissiveColor: "#ef4444"
    };
  });
}

function resolveModel(assetRegistry: ThreeAssetRegistry, assetId: Combat3dAssetId): Combat3dModelRef {
  let asset: ThreeAssetPreviewEntry | undefined;
  if (assetRegistry.has(assetId)) {
    asset = assetRegistry.get(assetId);
  }
  return {
    assetId,
    path: asset?.path,
    usesFallback: asset === undefined || shouldUseFallbackPreview(asset),
    scale: asset?.scale ?? { x: 1, y: 1, z: 1 }
  };
}
