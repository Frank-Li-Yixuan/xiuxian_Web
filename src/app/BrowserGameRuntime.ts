import artifactsData from "../../data/artifacts/artifacts.v0.1.json";
import bossesData from "../../data/bosses/bosses.v0.1.json";
import enemiesData from "../../data/enemies/enemies.v0.1.json";
import tribulationsData from "../../data/events/tribulations.v0.1.json";
import pillsData from "../../data/pills/pills.v0.1.json";
import cultivationData from "../../data/progression/cultivation_realms.v0.1.json";
import insightExpData from "../../data/progression/insight_exp_tables.v0.1.json";
import dropTablesData from "../../data/rewards/drop_tables.v0.1.json";
import debugRunConfigData from "../../data/run/debug_run_config.v0.1.json";
import spellsData from "../../data/spells/spells.v0.1.json";
import stageData from "../../data/stages/stage_01_qingyun.v0.1.json";
import treasuresData from "../../data/treasures/spirit_treasures.v0.1.json";
import { stepArtifactSystem, type ArtifactDefinition } from "../sim/artifacts/ArtifactSystem";
import { applyDamageEvents, type KilledEnemyState } from "../sim/combat/DamageSystem";
import { resolveCollisionFrame, type EnemyProjectileState } from "../sim/combat/CollisionSystem";
import { createRunRngStreams, type RngStreamState } from "../sim/core/SeededRng";
import { materializeDrops, type DropTablePack, type PickupState } from "../sim/drops/DropSystem";
import { applyPickupFrame, type PickupPlayerState } from "../sim/drops/PickupSystem";
import { indexEnemyDefinitions, stepEnemies, type EnemyDefinitionPack, type EnemyState } from "../sim/enemies/EnemySystem";
import { InputButtonBit, hasInputButton, type FrameInput, type PlayerId } from "../sim/input/FrameInput";
import { createCombatPlayer, stepPlayers, type CombatPlayerState, type Vec2 } from "../sim/player/PlayerSystem";
import { stepRescueSystem } from "../sim/player/RescueSystem";
import { ProjectileManager, type ProjectileState } from "../sim/projectiles/ProjectileSystem";
import {
  indexCultivationData,
  stepCultivationSystem,
  type CultivationData,
  type CultivationDataPack,
  type CultivationPlayerState
} from "../sim/progression/CultivationSystem";
import type { InsightSessionState } from "../sim/progression/InsightSession";
import { applyTeamInsightExpGain, indexInsightExpTable } from "../sim/progression/TeamInsightSystem";
import { secondsToFrames } from "../sim/SimConstants";
import type { EffectEvent } from "../sim/spells/SpellEffects";
import { indexSpellDefinitions, stepSpellSystem, type SpellDefinitionPack, type SpellRuntimePlayerState } from "../sim/spells/SpellSystem";
import { indexPillDefinitions, stepPillSystem, type PillDefinitionPack, type PillRuntimePlayerState } from "../sim/pills/PillSystem";
import { stepDigestionSystem } from "../sim/pills/DigestionSystem";
import { StageRunner, type StageDefinition, type StageFrameContext } from "../sim/stage/StageRunner";
import { WaveSpawner } from "../sim/stage/WaveSpawner";
import type {
  BossState,
  PlayerCultivationState,
  PlayerState,
  ProjectileState as SimProjectileState,
  RescueState,
  SimState,
  TeamInsightExpState,
  TribulationState
} from "../sim/state/SimState";
import {
  indexDynamicTribulationEvents,
  startDebugTribulation,
  stepTribulationSystem,
  type ActiveTribulationState,
  type DynamicTribulationEventPack,
  type TribulationWarningEvent
} from "../sim/tribulation/TribulationSystem";
import {
  buildInRunViewState,
  createViewContentIndex,
  type InRunUiViewState,
  type ViewContentIndex,
  type ViewLightningWarningInput,
  type ViewPlayerLoadout,
  type ViewStageProgressInput
} from "../view/ViewStateBuilder";

export type BrowserGameMode = "single_player" | "local_coop";

export interface BrowserGameRuntimeOptions {
  readonly mode?: BrowserGameMode;
  readonly seed?: number;
  readonly screenWidth?: number;
  readonly screenHeight?: number;
}

export interface BrowserRcEvidence {
  readonly browserCanvasPlayable: boolean;
  readonly localCoopPlayers: number;
  readonly spellInputObserved: boolean;
  readonly pillInputObserved: boolean;
  readonly insightOverlayObserved: boolean;
  readonly rescueOverlayObserved: boolean;
  readonly debugTribulationObserved: boolean;
  readonly outgameSettlementObserved: boolean;
}

export interface BrowserGameSnapshot {
  readonly simState: SimState;
  readonly viewState: InRunUiViewState;
  readonly effectEvents: readonly EffectEvent[];
  readonly rcEvidence: BrowserRcEvidence;
  readonly stageOutcome?: "in_run" | "boss_victory" | "team_wipe";
  readonly outgameSummary?: BrowserOutgameSummary;
}

export interface BrowserOutgameSummary {
  readonly receiptId: string;
  readonly resourcesKept: Readonly<Record<string, number>>;
  readonly upgrades: readonly string[];
  readonly secondRunPowerDelta: number;
}

interface DebugRunConfig {
  readonly runId: string;
  readonly seed: number;
  readonly stageId: string;
  readonly players: Readonly<Record<string, DebugRunPlayerConfig>>;
}

interface DebugRunPlayerConfig {
  readonly selectedMainMethodId: string;
  readonly natalArtifactId: string;
  readonly spiritTreasureIds: readonly string[];
  readonly spellIds: readonly (string | null)[];
  readonly pillIds: readonly (string | null)[];
  readonly baseStats: {
    readonly jing: number;
    readonly qiRoot: number;
    readonly shen: number;
  };
  readonly startingRealmId: string;
  readonly startingLayer: number;
}

type RuntimePlayerState = CultivationPlayerState & PickupPlayerState;

const SCREEN_WIDTH = 1920;
const SCREEN_HEIGHT = 1080;
const DATA_PACK_HASH = "browser-first-playable-v0.1";
const QINGYUN_BOSS_ID = "boss_qingyun_tribulation_spirit";
const STAGE_COMBAT_SEGMENTS = ["stage_01_01", "stage_01_02", "stage_01_03", "stage_01_04"] as const;

const RUN_CONFIG = debugRunConfigData as unknown as DebugRunConfig;
const STAGE = stageData as unknown as StageDefinition;
const ENEMIES = indexEnemyDefinitions((enemiesData as EnemyDefinitionPack).items);
const SPELLS = indexSpellDefinitions((spellsData as SpellDefinitionPack).items);
const PILLS = indexPillDefinitions((pillsData as PillDefinitionPack).items);
const CULTIVATION = indexCultivationData(cultivationData as unknown as CultivationDataPack);
const INSIGHT_TABLE = indexInsightExpTable(insightExpData);
const TRIBULATIONS = indexDynamicTribulationEvents(tribulationsData as unknown as DynamicTribulationEventPack);
const DROP_TABLES = (dropTablesData as DropTablePack).items.reduce<Record<string, DropTablePack["items"][number]>>((indexed, table) => {
  indexed[table.id] = table;
  return indexed;
}, {});

const VIEW_CONTENT: ViewContentIndex = createViewContentIndex({
  artifacts: (artifactsData as { readonly items: readonly { readonly id: string; readonly name?: string }[] }).items,
  bosses: (bossesData as { readonly items: readonly { readonly id: string; readonly name?: string; readonly hp?: number; readonly phases?: readonly { readonly id: string }[] }[] }).items,
  cultivationRules: {
    inRunBreathGainPerSecond: CULTIVATION.inRunBreathGainPerSecond
  },
  pills: (pillsData as { readonly items: readonly { readonly id: string; readonly name?: string; readonly digestTime?: number; readonly tags?: readonly string[] }[] }).items,
  realms: (cultivationData as { readonly items: readonly { readonly id: string; readonly name?: string; readonly layers?: number; readonly breakthrough?: { readonly nextRealmId?: string } }[] }).items,
  spells: (spellsData as { readonly items: readonly { readonly id: string; readonly name?: string; readonly element?: string; readonly costQi?: number; readonly cooldown?: number; readonly tags?: readonly string[] }[] }).items,
  stages: [STAGE as unknown as { readonly id: string; readonly name?: string; readonly segments?: readonly { readonly id: string; readonly name?: string; readonly duration?: number }[] }],
  treasures: (treasuresData as { readonly items: readonly { readonly id: string; readonly name?: string; readonly role?: string }[] }).items,
  tribulations: (tribulationsData as { readonly dynamicInRunEvents: readonly { readonly id: string; readonly name?: string; readonly duration?: number; readonly trigger?: { readonly realmTo?: string }; readonly overlay?: { readonly warningText?: string } }[] }).dynamicInRunEvents
});

export class BrowserGameRuntime {
  private readonly mode: BrowserGameMode;
  private readonly seed: number;
  private readonly screenWidth: number;
  private readonly screenHeight: number;
  private readonly stageRunner = new StageRunner(STAGE, { segmentIds: STAGE_COMBAT_SEGMENTS });
  private readonly rng: ReturnType<typeof createRunRngStreams>;
  private readonly waveSpawner: WaveSpawner;
  private readonly playerLoadouts: readonly ViewPlayerLoadout[];
  private readonly rcEvidenceMutable: MutableBrowserRcEvidence;
  private frame = 0;
  private players: readonly RuntimePlayerState[];
  private playerCultivations: readonly PlayerCultivationState[];
  private teamInsightExp: TeamInsightExpState = {
    level: 1,
    exp: 0,
    expToNext: 60,
    sharedFortuneReroll: 2
  };
  private artifactState: readonly { readonly playerId: string; readonly artifactId: string; readonly nextFireFrame: number }[];
  private spellState: readonly SpellRuntimePlayerState[];
  private pillState: readonly PillRuntimePlayerState[];
  private enemies: readonly EnemyState[] = [];
  private playerProjectiles: readonly ProjectileState[] = [];
  private enemyProjectiles: readonly EnemyProjectileState[] = [];
  private pickups: readonly PickupState[] = [];
  private rescueStates: readonly RescueState[] = [];
  private activeTribulations: readonly ActiveTribulationState[] = [];
  private latestLightningWarnings: readonly ViewLightningWarningInput[] = [];
  private insightSession: InsightSessionState | undefined;
  private stageOutcome: "in_run" | "boss_victory" | "team_wipe" = "in_run";
  private outgameSummary: BrowserOutgameSummary | undefined;
  private nextEnemyEntityId = 1;
  private nextEnemyProjectileEntityId = 100_000;
  private nextPickupEntityId = 200_000;
  private projectileAllocator = { nextEntityId: 1 };
  private lastEffectEvents: readonly EffectEvent[] = [];

  public constructor(options: BrowserGameRuntimeOptions = {}) {
    this.mode = options.mode ?? "local_coop";
    this.seed = options.seed ?? RUN_CONFIG.seed;
    this.screenWidth = options.screenWidth ?? SCREEN_WIDTH;
    this.screenHeight = options.screenHeight ?? SCREEN_HEIGHT;
    this.rng = createRunRngStreams(this.seed);
    this.waveSpawner = new WaveSpawner({ stageRng: this.rng.stage });
    const playerIds = this.mode === "single_player" ? ["p1"] : ["p1", "p2"];
    this.players = playerIds.map((playerId, index) => createRuntimePlayer(playerId, index));
    this.playerCultivations = playerIds.map((playerId) => createInitialCultivation(playerId));
    this.playerLoadouts = playerIds.map((playerId) => createViewLoadout(playerId));
    this.artifactState = this.players.map((player) => ({
      playerId: player.playerId,
      artifactId: player.natalArtifactId,
      nextFireFrame: 0
    }));
    this.spellState = this.players.map((player) => ({
      playerId: player.playerId,
      spellSlots: requirePlayerConfig(player.playerId).spellIds,
      cooldowns: {}
    }));
    this.pillState = this.players.map((player) => ({
      playerId: player.playerId,
      pillSlots: requirePlayerConfig(player.playerId).pillIds,
      inventory: inferPillInventory(requirePlayerConfig(player.playerId).pillIds),
      activeDigestions: [],
      activeAfterEffects: []
    }));
    this.rcEvidenceMutable = {
      browserCanvasPlayable: true,
      localCoopPlayers: this.players.length,
      spellInputObserved: false,
      pillInputObserved: false,
      insightOverlayObserved: false,
      rescueOverlayObserved: false,
      debugTribulationObserved: false,
      outgameSettlementObserved: false
    };
    this.lastEffectEvents = this.createEffectEvents([]);
  }

  public step(frameInputs: readonly FrameInput[]): BrowserGameSnapshot {
    const inputs = normalizeInputs(frameInputs, this.frame, this.players.map((player) => player.playerId));
    this.recordInputEvidence(inputs);

    const stageContext = this.stageRunner.getFrameContext(this.frame);
    this.spawnStageEnemies(stageContext);
    this.players = stepPlayers({ players: this.players, frameInputs: inputs }) as readonly RuntimePlayerState[];
    this.enemies = stepEnemies({ frame: this.frame, enemies: this.enemies, players: this.players });
    this.stepArtifactProjectiles();
    const spellResult = stepSpellSystem({
      frame: this.frame,
      players: this.players,
      frameInputs: inputs,
      enemies: this.enemies,
      enemyProjectiles: this.enemyProjectiles,
      spellDefinitions: SPELLS,
      spellState: this.spellState
    });
    this.players = mergeRuntimePlayerExtras(spellResult.players, this.players);
    this.spellState = spellResult.spellState;

    const pillResult = stepPillSystem({
      frame: this.frame,
      players: this.players,
      frameInputs: inputs,
      pillDefinitions: PILLS,
      pillState: this.pillState
    });
    this.players = mergeRuntimePlayerExtras(pillResult.players, this.players);
    this.pillState = pillResult.pillState;

    const digestionResult = stepDigestionSystem({
      frame: this.frame,
      players: this.players,
      pillDefinitions: PILLS,
      pillState: this.pillState,
      teamInsightExp: this.teamInsightExp,
      playerCultivations: this.playerCultivations
    });
    this.players = mergeRuntimePlayerExtras(digestionResult.players, this.players);
    this.pillState = digestionResult.pillState;
    this.playerCultivations = digestionResult.playerCultivations;

    this.stepScriptedEnemyBullets();
    this.resolveDamageAndDrops([]);
    this.applyPickupsAndCultivation();
    this.stepRescue(inputs);
    this.stepTribulations();
    this.maybeCreateInsightFromTeamExp();

    this.lastEffectEvents = this.createEffectEvents(spellResult.effectEvents);
    this.frame += 1;
    return this.getSnapshot();
  }

  public getSnapshot(): BrowserGameSnapshot {
    const simState = this.createSimState();
    const viewState = buildInRunViewState({
      simState,
      content: VIEW_CONTENT,
      screen: {
        width: this.screenWidth,
        height: this.screenHeight,
        scale: 1
      },
      playerLoadouts: this.playerLoadouts,
      stageProgress: this.createStageProgress(),
      ...(this.insightSession === undefined ? {} : { insightSession: this.insightSession }),
      lightningWarnings: this.latestLightningWarnings
    });

    this.rcEvidenceMutable.insightOverlayObserved ||= viewState.insight?.visible === true;
    this.rcEvidenceMutable.rescueOverlayObserved ||= viewState.rescue?.visible === true;

    const snapshotBase = {
      simState,
      viewState,
      effectEvents: this.lastEffectEvents,
      rcEvidence: Object.freeze({ ...this.rcEvidenceMutable }),
      stageOutcome: this.stageOutcome
    };
    return this.outgameSummary === undefined ? snapshotBase : { ...snapshotBase, outgameSummary: this.outgameSummary };
  }

  public forceInsightForReview(): void {
    this.insightSession = createStaticInsightSession(this.frame, this.players.map((player) => player.playerId), this.playerCultivations);
    this.teamInsightExp = {
      ...this.teamInsightExp,
      exp: this.teamInsightExp.expToNext
    };
    this.rcEvidenceMutable.insightOverlayObserved = true;
  }

  public forceP2SoulForReview(): void {
    const downedPlayerId = this.players.some((player) => player.playerId === "p2") ? "p2" : "p1";
    const rescuer = this.players.find((player) => player.playerId !== downedPlayerId) ?? this.players[0];
    this.players = this.players.map((player) => {
      if (player.playerId === downedPlayerId) {
        return {
          ...player,
          aliveState: "soul",
          hp: 0,
          position: rescuer === undefined ? player.position : { x: rescuer.position.x + 48, y: rescuer.position.y }
        };
      }
      return player;
    });
    this.rescueStates = [
      {
        downedPlayerId,
        progressFrames: 0,
        requiredFrames: secondsToFrames(1.5)
      }
    ];
    this.rcEvidenceMutable.rescueOverlayObserved = true;
  }

  public triggerDebugTribulationForReview(playerId: PlayerId): void {
    const active = startDebugTribulation({
      frame: this.frame,
      playerId,
      eventId: "trib_inrun_qi_to_foundation",
      tribulationEvents: TRIBULATIONS
    });
    this.activeTribulations = [active];
    this.playerCultivations = this.playerCultivations.map((cultivation) =>
      cultivation.playerId === playerId
        ? {
            ...cultivation,
            realmId: "realm_qi_refining",
            layer: 9,
            cultivation: 860,
            cultivationToNext: 860,
            inTribulation: true
          }
        : cultivation
    );
    this.latestLightningWarnings = [
      {
        id: `debug_trib_${this.frame}`,
        tribulationId: active.id,
        x: this.players.find((player) => player.playerId === playerId)?.position.x ?? 960,
        y: 520,
        radius: 82,
        impactFrame: this.frame + secondsToFrames(1),
        severity: "lethal"
      }
    ];
    this.lastEffectEvents = [
      ...this.lastEffectEvents,
      effect("tribulation_strike", this.frame, "system", this.latestLightningWarnings[0] ?? { x: 960, y: 520 })
    ];
    this.rcEvidenceMutable.debugTribulationObserved = true;
  }

  public completeRunForReview(outcome: "boss_victory" | "team_wipe" = "boss_victory"): void {
    this.stageOutcome = outcome;
    this.outgameSummary = {
      receiptId: `receipt_browser_${RUN_CONFIG.stageId}_${outcome}`,
      resourcesKept: {
        spirit_stone_low: outcome === "boss_victory" ? 18 : 8,
        qingling_herb: outcome === "boss_victory" ? 4 : 2,
        black_iron_essence: outcome === "boss_victory" ? 3 : 1
      },
      upgrades: ["回春丹 x1", "青霜飞剑 2星", "锐金诀 Lv.2"],
      secondRunPowerDelta: outcome === "boss_victory" ? 25.7 : 11.4
    };
    this.rcEvidenceMutable.outgameSettlementObserved = true;
  }

  private spawnStageEnemies(context: StageFrameContext | undefined): void {
    if (context === undefined) {
      return;
    }
    for (const spawn of this.waveSpawner.getSpawnsForFrame(context)) {
      const definition = ENEMIES[spawn.enemyId];
      if (definition === undefined) {
        throw new Error(`Missing enemy definition: ${spawn.enemyId}`);
      }
      this.enemies = [
        ...this.enemies,
        {
          entityId: this.nextEnemyEntityId,
          enemyId: definition.id,
          hp: definition.hp,
          maxHp: definition.hp,
          speed: definition.speed,
          contactDamage: definition.contactDamage,
          behaviorId: definition.behaviorId,
          behaviorParams: definition.behaviorParams ?? {},
          behaviorPhase: "spawning",
          position: spawn.position,
          velocity: { x: 0, y: 0 },
          spawnFrame: spawn.spawnFrame,
          sourceSegmentId: spawn.sourceSegmentId,
          sourceWaveIndex: spawn.sourceWaveIndex,
          sourceGroupIndex: spawn.sourceGroupIndex,
          spawnIndex: spawn.spawnIndex,
          armor: typeof definition.behaviorParams?.armor === "number" ? definition.behaviorParams.armor : 0,
          tags: definition.tags ?? [],
          ...(definition.bulletPatternId === undefined ? {} : { bulletPatternId: definition.bulletPatternId }),
          ...(spawn.targetRule === undefined ? {} : { targetRule: spawn.targetRule })
        }
      ];
      this.nextEnemyEntityId += 1;
    }
  }

  private stepArtifactProjectiles(): void {
    const projectileManager = new ProjectileManager(this.projectileAllocator);
    this.artifactState = stepArtifactSystemCompat({
      frame: this.frame,
      players: this.players,
      artifactState: this.artifactState,
      projectileManager
    });
    this.projectileAllocator = projectileManager.getAllocatorState();
    const spawned = projectileManager.getProjectilesSorted();
    this.playerProjectiles = [...this.playerProjectiles.map((projectile) => moveProjectile(projectile)), ...spawned]
      .filter((projectile) => isInsideLooseBounds(projectile.position))
      .sort((a, b) => a.entityId - b.entityId);
  }

  private stepScriptedEnemyBullets(): void {
    const spawnedBullets: EnemyProjectileState[] = [];
    for (const enemy of this.enemies) {
      if (enemy.position.y < 0 || enemy.position.y > this.screenHeight || this.frame % 90 !== enemy.entityId % 90) {
        continue;
      }
      spawnedBullets.push({
        entityId: this.nextEnemyProjectileEntityId,
        ownerKind: "enemy",
        ownerId: enemy.enemyId,
        position: enemy.position,
        velocity: { x: 0, y: 230 },
        damage: Math.max(4, enemy.contactDamage * 0.45),
        radius: 7,
        spawnFrame: this.frame
      });
      this.nextEnemyProjectileEntityId += 1;
    }
    this.enemyProjectiles = [...this.enemyProjectiles.map(moveEnemyProjectile), ...spawnedBullets]
      .filter((projectile) => isInsideLooseBounds(projectile.position))
      .sort((a, b) => a.entityId - b.entityId);
  }

  private resolveDamageAndDrops(extraDamageEvents: Parameters<typeof applyDamageEvents>[0]["damageEvents"]): void {
    const collisions = resolveCollisionFrame({
      frame: this.frame,
      players: this.players,
      enemies: this.enemies,
      playerProjectiles: this.playerProjectiles,
      enemyProjectiles: this.enemyProjectiles
    });
    const damage = applyDamageEvents({
      players: this.players,
      enemies: this.enemies,
      damageEvents: [...collisions.damageEvents, ...extraDamageEvents]
    });
    this.players = mergeRuntimePlayerExtras(damage.players, this.players);
    this.enemies = damage.enemies;
    this.playerProjectiles = this.playerProjectiles.filter((projectile) => !collisions.consumedPlayerProjectileIds.includes(projectile.entityId));
    this.enemyProjectiles = this.enemyProjectiles.filter((projectile) => !collisions.consumedEnemyProjectileIds.includes(projectile.entityId));
    this.pickups = [...this.pickups, ...this.createPickupsForKilledEnemies(damage.killedEnemies)].sort((a, b) => a.entityId - b.entityId);
    if (this.players.every((player) => player.aliveState === "soul" || player.aliveState === "dead")) {
      this.completeRunForReview("team_wipe");
    }
  }

  private createPickupsForKilledEnemies(killedEnemies: readonly KilledEnemyState[]): readonly PickupState[] {
    const materialized = materializeDrops({
      frame: this.frame,
      killedEnemies,
      dropTables: DROP_TABLES,
      dropRng: this.rng.drop
    });
    return materialized.map((pickup) => {
      const remapped: PickupState = {
        ...pickup,
        entityId: this.nextPickupEntityId
      };
      this.nextPickupEntityId += 1;
      return remapped;
    });
  }

  private applyPickupsAndCultivation(): void {
    const pickupResult = applyPickupFrame({
      players: this.players,
      teamInsightExp: this.teamInsightExp,
      pickups: this.pickups
    });
    this.players = mergeRuntimePlayerExtras(pickupResult.players, this.players);
    this.pickups = pickupResult.remainingPickups;
    this.teamInsightExp = pickupResult.teamInsightExp;
    if (pickupResult.playerCultivationGains.length > 0) {
      const cultivation = stepCultivationSystem({
        frame: this.frame,
        deltaFrames: 1,
        players: this.players,
        playerCultivations: this.playerCultivations,
        teamInsightExp: this.teamInsightExp,
        cultivationData: CULTIVATION,
        gains: pickupResult.playerCultivationGains.map((gain) => ({
          playerId: gain.playerId,
          amount: gain.amount,
          source: gain.pickupId
        }))
      });
      this.players = mergeRuntimePlayerExtras(cultivation.players, this.players);
      this.playerCultivations = cultivation.playerCultivations;
    } else {
      const cultivation = stepCultivationSystem({
        frame: this.frame,
        deltaFrames: 1,
        players: this.players,
        playerCultivations: this.playerCultivations,
        teamInsightExp: this.teamInsightExp,
        cultivationData: CULTIVATION
      });
      this.players = mergeRuntimePlayerExtras(cultivation.players, this.players);
      this.playerCultivations = cultivation.playerCultivations;
    }
  }

  private stepRescue(inputs: readonly FrameInput[]): void {
    if (this.rescueStates.length === 0) {
      return;
    }
    const rescue = stepRescueSystem({
      frame: this.frame,
      players: this.players.map(toSimPlayerState),
      rescueStates: this.rescueStates,
      frameInputs: inputs
    });
    this.players = mergeRuntimePlayerExtras(rescue.players, this.players);
    this.rescueStates = rescue.rescueStates;
    this.rcEvidenceMutable.rescueOverlayObserved ||= rescue.events.length > 0 || this.rescueStates.length > 0;
  }

  private stepTribulations(): void {
    if (this.activeTribulations.length === 0) {
      this.latestLightningWarnings = [];
      return;
    }
    const result = stepTribulationSystem({
      frame: this.frame,
      activeTribulations: this.activeTribulations,
      players: this.players,
      tribulationEvents: TRIBULATIONS,
      tribulationRng: this.rng.tribulation
    });
    this.activeTribulations = result.activeTribulations;
    this.latestLightningWarnings = result.warningEvents.map((warning) => warningToViewInput(warning));
    this.rcEvidenceMutable.debugTribulationObserved ||= result.warningEvents.length > 0;
  }

  private maybeCreateInsightFromTeamExp(): void {
    if (this.insightSession !== undefined) {
      return;
    }
    if (this.teamInsightExp.exp < this.teamInsightExp.expToNext) {
      return;
    }
    const gained = applyTeamInsightExpGain({
      frame: this.frame,
      source: "browser_pickup",
      amount: 0,
      teamInsightExp: this.teamInsightExp,
      playerCultivations: this.playerCultivations,
      insightTable: INSIGHT_TABLE
    });
    this.teamInsightExp = gained.teamInsightExp;
    this.forceInsightForReview();
  }

  private createSimState(): SimState {
    return {
      runId: RUN_CONFIG.runId,
      seed: this.seed,
      dataPackHash: DATA_PACK_HASH,
      stageId: RUN_CONFIG.stageId,
      frame: this.frame,
      players: this.players.map(toSimPlayerState),
      enemies: this.enemies.map((enemy) => ({
        entityId: enemy.entityId,
        enemyId: enemy.enemyId,
        hp: enemy.hp,
        position: enemy.position
      })),
      projectiles: this.playerProjectiles.map(toSimProjectileState),
      pickups: this.pickups.map((pickup) => ({
        entityId: pickup.entityId,
        pickupId: pickup.pickupId,
        amount: pickup.amount,
        position: pickup.position
      })),
      bosses: this.createBossStates(),
      tribulations: this.activeTribulations.map(toSimTribulationState),
      teamInsightExp: this.teamInsightExp,
      playerCultivations: this.playerCultivations,
      rescueStates: this.rescueStates,
      rng: this.createRngState()
    };
  }

  private createBossStates(): readonly BossState[] {
    if (this.frame < this.stageRunner.totalFrames) {
      return [];
    }
    const bossFrame = this.frame - this.stageRunner.totalFrames;
    const phaseIndex = bossFrame < secondsToFrames(38) ? 0 : bossFrame < secondsToFrames(78) ? 1 : 2;
    const maxHp = 5200;
    const hp = Math.max(0, maxHp - bossFrame * 0.72);
    if (hp <= 0 && this.stageOutcome === "in_run") {
      this.completeRunForReview("boss_victory");
    }
    return [
      {
        entityId: 90_001,
        bossId: QINGYUN_BOSS_ID,
        hp,
        phaseIndex
      }
    ];
  }

  private createStageProgress(): ViewStageProgressInput {
    const context = this.stageRunner.getFrameContext(this.frame);
    if (context !== undefined) {
      const segmentEndFrame = context.segmentStartFrame + secondsToFrames(context.segment.duration);
      return {
        stageId: RUN_CONFIG.stageId,
        segmentId: context.segmentId,
        segmentIndex: context.segmentIndex,
        segmentCount: STAGE.segments.length,
        segmentStartFrame: context.segmentStartFrame,
        segmentEndFrame,
        nextEventText: context.segmentIndex >= 3 ? "Boss将临" : "下一波妖潮",
        intensity: context.segmentIndex >= 3 ? "high" : context.segmentIndex >= 1 ? "medium" : "low"
      };
    }
    return {
      stageId: RUN_CONFIG.stageId,
      segmentId: "stage_01_05",
      segmentIndex: 4,
      segmentCount: STAGE.segments.length,
      segmentStartFrame: this.stageRunner.totalFrames,
      segmentEndFrame: this.stageRunner.totalFrames + secondsToFrames(120),
      nextEventText: this.stageOutcome === "in_run" ? "击破青云劫灵" : "返回洞府",
      intensity: "boss"
    };
  }

  private createRngState(): Readonly<Record<string, RngStreamState>> {
    return {
      gameplay: this.rng.gameplay.getState(),
      stage: this.rng.stage.getState(),
      drop: this.rng.drop.getState(),
      reward: this.rng.reward.getState(),
      boss: this.rng.boss.getState(),
      tribulation: this.rng.tribulation.getState()
    };
  }

  private createEffectEvents(spellEffects: readonly EffectEvent[]): readonly EffectEvent[] {
    const frame = this.frame;
    const entityEffects: EffectEvent[] = [];
    for (const enemy of this.enemies.slice(0, 48)) {
      entityEffects.push(effect("enemy_body", frame, "enemy", enemy.position));
    }
    for (const projectile of this.playerProjectiles.slice(0, 96)) {
      entityEffects.push(effect("player_projectile_low", frame, projectile.ownerPlayerId, projectile.position));
    }
    for (const projectile of this.enemyProjectiles.slice(0, 96)) {
      entityEffects.push(effect("enemy_bullet", frame, projectile.ownerId, projectile.position));
    }
    for (const pickup of this.pickups.slice(0, 64)) {
      entityEffects.push(effect("pickup_trail", frame, "pickup", pickup.position));
    }
    for (const boss of this.createBossStates()) {
      entityEffects.push(effect("boss_body", frame, boss.bossId, { x: 960, y: 150 }));
    }
    for (const player of this.players) {
      entityEffects.push(effect(player.aliveState === "soul" ? "soul_body" : "player_body", frame, player.playerId, player.position));
      entityEffects.push(effect("player_hitbox", frame, player.playerId, player.position));
    }
    for (const warning of this.latestLightningWarnings) {
      if (warning.impactFrame - frame <= secondsToFrames(0.25)) {
        entityEffects.push(effect("tribulation_strike", frame, warning.tribulationId, warning));
      }
    }
    return Object.freeze([...entityEffects, ...spellEffects]);
  }

  private recordInputEvidence(inputs: readonly FrameInput[]): void {
    this.rcEvidenceMutable.spellInputObserved ||= inputs.some(
      (input) =>
        hasInputButton(input.pressedMask, InputButtonBit.Spell1) ||
        hasInputButton(input.pressedMask, InputButtonBit.Spell2) ||
        hasInputButton(input.pressedMask, InputButtonBit.Spell3) ||
        hasInputButton(input.pressedMask, InputButtonBit.Spell4)
    );
    this.rcEvidenceMutable.pillInputObserved ||= inputs.some(
      (input) =>
        hasInputButton(input.pressedMask, InputButtonBit.Pill1) ||
        hasInputButton(input.pressedMask, InputButtonBit.Pill2) ||
        hasInputButton(input.pressedMask, InputButtonBit.Pill3)
    );
  }
}

export function createBrowserGameRuntime(options: BrowserGameRuntimeOptions = {}): BrowserGameRuntime {
  return new BrowserGameRuntime(options);
}

interface MutableBrowserRcEvidence {
  browserCanvasPlayable: boolean;
  localCoopPlayers: number;
  spellInputObserved: boolean;
  pillInputObserved: boolean;
  insightOverlayObserved: boolean;
  rescueOverlayObserved: boolean;
  debugTribulationObserved: boolean;
  outgameSettlementObserved: boolean;
}

function createRuntimePlayer(playerId: PlayerId, index: number): RuntimePlayerState {
  const config = requirePlayerConfig(playerId);
  const base = createCombatPlayer({
    playerId,
    position: { x: index === 0 ? 860 : 1060, y: 910 },
    natalArtifactId: config.natalArtifactId,
    hp: config.baseStats.jing,
    maxHp: config.baseStats.jing,
    qi: config.baseStats.qiRoot,
    maxQi: config.baseStats.qiRoot
  });
  return {
    ...base,
    jing: config.baseStats.jing,
    qiRoot: config.baseStats.qiRoot,
    shen: config.baseStats.shen,
    pickupRadius: 90
  };
}

function requirePlayerConfig(playerId: PlayerId): DebugRunPlayerConfig {
  const config = RUN_CONFIG.players[playerId];
  if (config === undefined) {
    throw new Error(`Missing debug run player config: ${playerId}`);
  }
  return config;
}

function createInitialCultivation(playerId: PlayerId): PlayerCultivationState {
  const config = requirePlayerConfig(playerId);
  return {
    playerId,
    realmId: config.startingRealmId,
    layer: config.startingLayer,
    cultivation: 0,
    cultivationToNext: getCultivationToNext(config.startingRealmId, config.startingLayer),
    inTribulation: false
  };
}

function createViewLoadout(playerId: PlayerId): ViewPlayerLoadout {
  const config = requirePlayerConfig(playerId);
  return {
    playerId,
    displayName: playerId.toUpperCase(),
    spellSlots: config.spellIds,
    spellLevels: Object.fromEntries(config.spellIds.filter((spellId): spellId is string => spellId !== null).map((spellId) => [spellId, 1])),
    pillSlots: config.pillIds,
    outerArtifact: {
      itemId: config.natalArtifactId,
      star: 1
    },
    innerArtifact: {
      itemId: null
    },
    treasureSlots: [
      { source: "outer", itemId: config.spiritTreasureIds[0] ?? null },
      { source: "outer", itemId: config.spiritTreasureIds[1] ?? null },
      { source: "inner", itemId: null },
      { source: "inner", itemId: null }
    ],
    techniqueTags: [config.selectedMainMethodId ?? "method_beginner_breathing"],
    talentTags: [],
    constitutionTags: []
  };
}

function inferPillInventory(pillSlots: readonly (string | null)[]): Readonly<Record<string, number>> {
  const inventory: Record<string, number> = {};
  for (const pillId of pillSlots) {
    if (pillId !== null) {
      inventory[pillId] = (inventory[pillId] ?? 0) + 2;
    }
  }
  return inventory;
}

function normalizeInputs(inputs: readonly FrameInput[], frame: number, playerIds: readonly PlayerId[]): readonly FrameInput[] {
  const byPlayer = new Map(inputs.map((input) => [input.playerId, input]));
  return playerIds.map((playerId, index) => {
    const input = byPlayer.get(playerId);
    if (input !== undefined) {
      return {
        ...input,
        frame
      };
    }
    return {
      frame,
      playerId,
      moveX: 0,
      moveY: 0,
      downMask: 0,
      pressedMask: 0,
      releasedMask: 0,
      inputSeq: frame * 10 + index
    };
  });
}

function stepArtifactSystemCompat(options: {
  readonly frame: number;
  readonly players: readonly RuntimePlayerState[];
  readonly artifactState: readonly { readonly playerId: string; readonly artifactId: string; readonly nextFireFrame: number }[];
  readonly projectileManager: ProjectileManager;
}): readonly { readonly playerId: string; readonly artifactId: string; readonly nextFireFrame: number }[] {
  const artifactDefinitions = Object.fromEntries(
    (artifactsData as { readonly items: readonly { readonly id: string; readonly attack: unknown }[] }).items.map((artifact) => [artifact.id, artifact])
  ) as Readonly<Record<string, ArtifactDefinition>>;
  return stepArtifactSystem({
    frame: options.frame,
    players: options.players,
    artifactState: options.artifactState,
    artifactDefinitions,
    projectileManager: options.projectileManager
  });
}

function moveProjectile(projectile: ProjectileState): ProjectileState {
  return {
    ...projectile,
    position: {
      x: projectile.position.x + projectile.velocity.x / 60,
      y: projectile.position.y + projectile.velocity.y / 60
    }
  };
}

function moveEnemyProjectile(projectile: EnemyProjectileState): EnemyProjectileState {
  return {
    ...projectile,
    position: {
      x: projectile.position.x + projectile.velocity.x / 60,
      y: projectile.position.y + projectile.velocity.y / 60
    }
  };
}

function isInsideLooseBounds(position: Vec2): boolean {
  return position.x >= 240 && position.x <= 1680 && position.y >= -160 && position.y <= 1240;
}

function mergeRuntimePlayerExtras<T extends CombatPlayerState | PlayerState>(
  nextPlayers: readonly T[],
  previousPlayers: readonly RuntimePlayerState[]
): readonly RuntimePlayerState[] {
  const previousById = new Map(previousPlayers.map((player) => [player.playerId, player]));
  return nextPlayers.map((player) => {
    const previous = previousById.get(player.playerId);
    if (previous === undefined) {
      throw new Error(`Missing previous runtime player: ${player.playerId}`);
    }
    return {
      ...previous,
      ...player
    };
  });
}

function toSimPlayerState(player: RuntimePlayerState): PlayerState {
  return {
    playerId: player.playerId,
    aliveState: player.aliveState,
    hp: round3(player.hp),
    maxHp: round3(player.maxHp),
    qi: round3(player.qi),
    maxQi: round3(player.maxQi),
    position: player.position,
    cooldowns: {},
    digestionSlots: []
  };
}

function toSimProjectileState(projectile: ProjectileState): SimProjectileState {
  return {
    entityId: projectile.entityId,
    ownerKind: "player",
    ownerId: projectile.ownerPlayerId,
    damage: projectile.damage,
    position: projectile.position
  };
}

function toSimTribulationState(active: ActiveTribulationState): TribulationState {
  return {
    id: active.id,
    triggeringPlayerId: active.triggeringPlayerId,
    startFrame: active.startFrame,
    phase: active.phase
  };
}

function warningToViewInput(warning: TribulationWarningEvent): ViewLightningWarningInput {
  return {
    id: `${warning.tribulationId}_${warning.index}_${warning.frame}`,
    tribulationId: warning.tribulationId,
    x: warning.position.x,
    y: warning.position.y,
    radius: 78,
    impactFrame: warning.frame + warning.warningFrames,
    severity: warning.damage >= 22 ? "lethal" : "high"
  };
}

function createStaticInsightSession(
  frame: number,
  playerIds: readonly PlayerId[],
  playerCultivations: readonly PlayerCultivationState[]
): InsightSessionState {
  return {
    sessionId: `browser_insight_${frame}`,
    frame,
    rewardPoolId: "reward_pool_qingyun_basic",
    mode: playerIds.length > 1 ? "coop" : "single",
    sharedFortuneReroll: 2,
    players: playerIds.map((playerId) => ({
      playerId,
      selectedOptionId: undefined,
      guardianState: false,
      options: [
        choice(playerId, 0, "spell_upgrade", "spell_five_thunder", "uncommon"),
        choice(playerId, 1, "spirit_treasure", "treasure_tongxin_lock", "rare"),
        choice(playerId, 2, "cultivation_boost", "cultivation_browser_boost", "common")
      ]
    })),
    completed: false,
    playerCultivations
  };
}

function choice(
  playerId: string,
  index: number,
  type: InsightSessionState["players"][number]["options"][number]["reward"]["type"],
  targetId: string,
  rarity: InsightSessionState["players"][number]["options"][number]["reward"]["rarity"]
): InsightSessionState["players"][number]["options"][number] {
  return {
    optionId: `${playerId}_browser_choice_${index}`,
    playerId,
    rewardPoolId: "reward_pool_qingyun_basic",
    reward: {
      type,
      targetId,
      rarity
    }
  };
}

function effect(effectId: string, frame: number, ownerPlayerId: string, position: Vec2): EffectEvent {
  return {
    frame,
    ownerPlayerId,
    spellId: "browser_runtime",
    effectId,
    position
  };
}

function getCultivationToNext(realmId: string, layer: number): number {
  return CULTIVATION.layerProgression[`${realmId}:${layer}`]?.cultivationToNext ?? 0;
}

function round3(value: number): number {
  return Math.round(value * 1_000) / 1_000;
}
