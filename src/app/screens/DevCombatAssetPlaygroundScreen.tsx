import { useEffect, useMemo, useRef, useState, type ReactElement } from "react";

import type {
  CanvasPresentationAbilityVfxEvent,
  CanvasPresentationEntityAnimationEvent,
  CanvasPresentationState
} from "../../render/CanvasPresentationState";
import { AbilityVfxRenderer, getAbilityVfxProfile } from "../../render/AbilityVfxRenderer";
import { BackgroundParallaxRenderer } from "../../render/BackgroundParallaxRenderer";
import { CanvasRenderer, type CanvasRenderFrame } from "../../render/CanvasRenderer";
import { CombatVfxRenderer } from "../../render/CombatVfxRenderer";
import { getImpactVfxProfile } from "../../render/ImpactVfxRenderer";
import { PickupPresentationSystem } from "../../render/PickupPresentationSystem";
import { ProjectileSkinRenderer, type ProjectileDensityMode } from "../../render/ProjectileSkinRenderer";
import { loadSpriteAssetRegistry, type SpriteAssetRegistry } from "../../render/SpriteAssetRegistry";
import { SpriteEntityRenderer } from "../../render/SpriteEntityRenderer";
import type { InRunUiViewState } from "../../view/InRunViewState";

const CANVAS_WIDTH = 1920;
const CANVAS_HEIGHT = 1080;
const ENEMY_BULLET_COUNT = 100;
type AbilitySceneMode = "all" | "spells" | "artifacts" | "pills" | "treasures";
type EntitySceneMode = "entities" | "idle" | "move" | "attack" | "hit" | "death";
type BackgroundSceneMode = "background" | "outer_battlefield" | "qingyun_reserve" | "tribulation_sky";

export function DevCombatAssetPlaygroundScreen(): ReactElement {
  const canvasRef = useRef<HTMLCanvasElement | null>(null);
  const frameRef = useRef(0);
  const pausedRef = useRef(false);
  const stepTokenRef = useRef(0);
  const magnetStartFrameRef = useRef(0);
  const [spriteRegistry, setSpriteRegistry] = useState<SpriteAssetRegistry | undefined>(undefined);
  const [error, setError] = useState<string | undefined>(undefined);
  const [paused, setPaused] = useState(false);
  const [stepToken, setStepToken] = useState(0);
  const [statusFrame, setStatusFrame] = useState(0);
  const [densityMode, setDensityMode] = useState<ProjectileDensityMode>("simplified");
  const [magnetToken, setMagnetToken] = useState(0);
  const [abilityMode, setAbilityMode] = useState<AbilitySceneMode>("all");
  const [abilityToken, setAbilityToken] = useState(0);
  const [entityMode, setEntityMode] = useState<EntitySceneMode>("entities");
  const [entityToken, setEntityToken] = useState(0);
  const [backgroundMode, setBackgroundMode] = useState<BackgroundSceneMode>("background");
  const [backgroundToken, setBackgroundToken] = useState(0);

  useEffect(() => {
    let cancelled = false;
    void loadSpriteAssetRegistry()
      .then((registry) => {
        if (!cancelled) {
          setSpriteRegistry(registry);
        }
      })
      .catch((reason: unknown) => {
        if (!cancelled) {
          setError(reason instanceof Error ? reason.message : String(reason));
        }
      });
    return () => {
      cancelled = true;
    };
  }, []);

  useEffect(() => {
    pausedRef.current = paused;
  }, [paused]);

  useEffect(() => {
    stepTokenRef.current = stepToken;
  }, [stepToken]);

  const renderer = useMemo(() => {
    if (spriteRegistry === undefined) {
      return new CanvasRenderer({
        backgroundParallaxRenderer: new BackgroundParallaxRenderer(),
        abilityVfxRenderer: new AbilityVfxRenderer()
      });
    }
    return new CanvasRenderer({
      backgroundParallaxRenderer: new BackgroundParallaxRenderer({ spriteRegistry }),
      abilityVfxRenderer: new AbilityVfxRenderer(),
      combatVfxRenderer: new CombatVfxRenderer({ spriteRegistry }),
      projectileSkinRenderer: new ProjectileSkinRenderer({
        spriteRegistry,
        highDensityEnemyBulletThreshold: densityMode === "full" ? 120 : 80
      }),
      pickupPresentationSystem: new PickupPresentationSystem({ spriteRegistry }),
      spriteEntityRenderer: new SpriteEntityRenderer({ spriteRegistry })
    });
  }, [densityMode, spriteRegistry]);

  useEffect(() => {
    const canvas = canvasRef.current;
    const context = canvas?.getContext("2d") ?? null;
    if (canvas === null || context === null) {
      return;
    }

    let running = true;
    let animationFrameId = 0;
    let consumedStepToken = stepTokenRef.current;
    let metricCountdown = 0;

    const draw = (): void => {
      if (!running) {
        return;
      }
      if (!pausedRef.current) {
        frameRef.current += 1;
      } else if (stepTokenRef.current !== consumedStepToken) {
        frameRef.current += 1;
        consumedStepToken = stepTokenRef.current;
      }

      renderer.renderFrame(
        context,
        createPlaygroundFrame({
          frame: frameRef.current,
          magnetStartFrame: magnetStartFrameRef.current,
          abilityMode,
          entityMode,
          backgroundMode
        })
      );

      metricCountdown -= 1;
      if (metricCountdown <= 0) {
        metricCountdown = 12;
        setStatusFrame(frameRef.current);
      }

      animationFrameId = window.requestAnimationFrame(draw);
    };

    animationFrameId = window.requestAnimationFrame(draw);
    return () => {
      running = false;
      window.cancelAnimationFrame(animationFrameId);
    };
  }, [abilityMode, abilityToken, backgroundMode, backgroundToken, entityMode, entityToken, renderer, magnetToken]);

  const playMagnet = (): void => {
    magnetStartFrameRef.current = frameRef.current;
    setMagnetToken((value) => value + 1);
  };
  const playAbilityMode = (mode: AbilitySceneMode): void => {
    setAbilityMode(mode);
    setAbilityToken((value) => value + 1);
  };
  const playEntityMode = (mode: EntitySceneMode): void => {
    setEntityMode(mode);
    setEntityToken((value) => value + 1);
  };
  const playBackgroundMode = (mode: BackgroundSceneMode): void => {
    setBackgroundMode(mode);
    setBackgroundToken((value) => value + 1);
  };

  return (
    <main className="dev-combat-asset-playground-screen">
      <canvas
        ref={canvasRef}
        className="dev-combat-asset-playground-canvas"
        width={CANVAS_WIDTH}
        height={CANVAS_HEIGHT}
        data-testid="dev-combat-asset-playground-canvas"
      />
      <section className="dev-combat-asset-playground-toolbar" aria-label="Combat asset playground controls">
        <div className="dev-combat-asset-playground-title">
          <strong>Combat Asset Playground</strong>
          <span>
            {error ?? (spriteRegistry === undefined ? "Loading sprite assets" : `Frame ${statusFrame}`)} · {ENEMY_BULLET_COUNT} enemy bullets
          </span>
        </div>
        <button type="button" onClick={() => setDensityMode((value) => (value === "full" ? "simplified" : "full"))}>
          Density {densityMode}
        </button>
        <button type="button" onClick={playMagnet}>
          Play Magnet
        </button>
        <button type="button" onClick={() => playAbilityMode("all")}>
          Play All
        </button>
        <button type="button" onClick={() => playAbilityMode("spells")}>
          Spells
        </button>
        <button type="button" onClick={() => playAbilityMode("artifacts")}>
          Artifacts
        </button>
        <button type="button" onClick={() => playAbilityMode("pills")}>
          Pills
        </button>
        <button type="button" onClick={() => playAbilityMode("treasures")}>
          Treasures
        </button>
        <button type="button" onClick={() => playEntityMode("entities")}>
          Entities
        </button>
        <button type="button" onClick={() => playEntityMode("idle")}>
          Idle
        </button>
        <button type="button" onClick={() => playEntityMode("move")}>
          Move
        </button>
        <button type="button" onClick={() => playEntityMode("attack")}>
          Attack
        </button>
        <button type="button" onClick={() => playEntityMode("hit")}>
          Hit
        </button>
        <button type="button" onClick={() => playEntityMode("death")}>
          Death
        </button>
        <button type="button" onClick={() => playBackgroundMode("background")}>
          Background
        </button>
        <button type="button" onClick={() => playBackgroundMode("outer_battlefield")}>
          Outer Battlefield
        </button>
        <button type="button" onClick={() => playBackgroundMode("qingyun_reserve")}>
          Qingyun Reserve
        </button>
        <button type="button" onClick={() => playBackgroundMode("tribulation_sky")}>
          Tribulation Sky
        </button>
        <button type="button" onClick={() => setPaused((value) => !value)}>
          {paused ? "Resume" : "Pause"}
        </button>
        <button type="button" onClick={() => setStepToken((value) => value + 1)}>
          Step
        </button>
      </section>
      <aside className="dev-combat-asset-playground-list" aria-label="Combat asset playground scenarios">
        <section>
          <h2>Projectile skins</h2>
          <p>Player flying sword · gourd flame · seal impact · enemy danger bullets</p>
        </section>
        <section>
          <h2>Pickup magnet</h2>
          <p>qi orb · zhenyuan orb · material glint · collect flash</p>
        </section>
        <section>
          <h2>Impact / death VFX</h2>
          <p>projectile_hit · enemy_damaged · enemy_killed · elite_killed · player_hit · shield_break · boss_phase_changed · boss_killed</p>
        </section>
        <section>
          <h2>Spell / Artifact / Pill / Treasure VFX</h2>
          <p>
            spell_five_thunder · spell_bagua_sword_ring · spell_red_lotus_fire · spell_sleeve_universe · artifact_qingshuang_sword ·
            artifact_ziyang_gourd · artifact_xuanyue_seal · pill_rejuvenation · pill_burning_blood · pill_clear_mind ·
            pill_minor_breakthrough · treasure_minor_sword_array · treasure_bagua_jade · treasure_gold_toad · treasure_tongxin_lock
          </p>
        </section>
        <section>
          <h2>Entity Sprite Animation</h2>
          <p>
            entity.player.cultivator_01 · entity.player.soul_01 · entity.enemy.mountain_imp_01 · entity.enemy.wolf_demon_01 ·
            entity.enemy.elite_split_wind_wolf_01 · entity.enemy.rogue_cultivator_shadow_01 · entity.enemy.stone_armor_demon_01
          </p>
        </section>
        <section>
          <h2>Background Parallax</h2>
          <p>background.space_dark_01 路 Outer Battlefield 路 Qingyun Reserve 路 Tribulation Sky</p>
        </section>
      </aside>
    </main>
  );
}

function createPlaygroundFrame(options: {
  readonly frame: number;
  readonly magnetStartFrame: number;
  readonly abilityMode: AbilitySceneMode;
  readonly entityMode: EntitySceneMode;
  readonly backgroundMode: BackgroundSceneMode;
}): CanvasRenderFrame {
  return {
    viewState: createPlaygroundViewState(options.frame, options.backgroundMode),
    effectEvents: [],
    presentation: createPlaygroundPresentation(options)
  };
}

function createPlaygroundPresentation(options: {
  readonly frame: number;
  readonly magnetStartFrame: number;
  readonly abilityMode: AbilitySceneMode;
  readonly entityMode: EntitySceneMode;
  readonly backgroundMode: BackgroundSceneMode;
}): CanvasPresentationState {
  return {
    frame: options.frame,
    screen: { width: CANVAS_WIDTH, height: CANVAS_HEIGHT },
    players: [
      {
        playerId: "p1",
        position: { x: 920, y: 880 },
        velocity: entityVelocity(options.entityMode, 90, 0),
        spawnFrame: 0,
        ...(options.entityMode === "attack" ? { animationHint: "cast" as const } : {}),
        renderColor: "player1",
        realmLayer: 3,
        aliveState: "body",
        focusActive: true,
        hpRatio: 0.9,
        qiRatio: 0.72
      },
      {
        playerId: "p2",
        position: { x: 1035, y: 880 },
        velocity: { x: 0, y: 0 },
        spawnFrame: 0,
        renderColor: "player2",
        realmLayer: 3,
        aliveState: "soul",
        focusActive: false,
        hpRatio: 0,
        qiRatio: 0.45
      }
    ],
    enemies: createEntityShowcaseEnemies(options.frame, options.entityMode),
    playerProjectiles: createPlayerProjectiles(options.frame),
    enemyProjectiles: createEnemyBulletGrid(options.frame),
    pickups: createPickupShowcase(options.frame, options.magnetStartFrame),
    warnings: createPlaygroundWarnings(options.backgroundMode),
    visualEvents: createImpactShowcase(options.frame),
    abilityVfx: createAbilityShowcase(options.frame, options.abilityMode),
    entityAnimationEvents: createEntityAnimationShowcase(options.frame, options.entityMode)
  };
}

function createEntityShowcaseEnemies(frame: number, mode: EntitySceneMode): CanvasPresentationState["enemies"] {
  const bob = Math.sin(frame / 18) * 4;
  const attack = mode === "attack" || mode === "entities";
  const velocity = (x: number, y = 0): { readonly x: number; readonly y: number } => entityVelocity(mode, x, y);
  return [
    {
      entityId: 9001,
      enemyId: "enemy_mountain_imp",
      renderKind: "mountain_imp",
      position: { x: 620, y: 245 + bob },
      velocity: velocity(70, 40),
      spawnFrame: 0,
      hpRatio: 0.84
    },
    {
      entityId: 9002,
      enemyId: "enemy_wolf_demon",
      renderKind: "wolf_demon",
      position: { x: 800, y: 235 },
      velocity: velocity(260, 60),
      spawnFrame: 0,
      ...(attack ? { animationHint: "attack" as const } : {}),
      hpRatio: 0.68
    },
    {
      entityId: 9003,
      enemyId: "elite_split_wind_wolf",
      renderKind: "elite_split_wind_wolf",
      position: { x: 980, y: 230 },
      velocity: velocity(-220, 80),
      spawnFrame: 0,
      ...(attack ? { animationHint: "attack" as const } : {}),
      hpRatio: 0.72
    },
    {
      entityId: 9004,
      enemyId: "enemy_rogue_cultivator_shadow",
      renderKind: "rogue_cultivator_shadow",
      position: { x: 1160, y: 245 + bob * 0.5 },
      velocity: velocity(0, 0),
      spawnFrame: 0,
      ...(attack ? { animationHint: "attack" as const } : {}),
      hpRatio: 0.9
    },
    {
      entityId: 9005,
      enemyId: "enemy_stone_armor_demon",
      renderKind: "stone_armor_demon",
      position: { x: 1340, y: 250 },
      velocity: velocity(-40, 20),
      spawnFrame: 0,
      hpRatio: 0.58
    }
  ];
}

function createEntityAnimationShowcase(frame: number, mode: EntitySceneMode): readonly CanvasPresentationEntityAnimationEvent[] {
  const baseFrame = frame - (frame % 90);
  if (mode !== "hit" && mode !== "death" && mode !== "attack" && mode !== "entities") {
    return [];
  }
  if (mode === "death") {
    return [9001, 9002, 9003, 9004, 9005].map((entityId, index) => ({
      id: `entity_death_${entityId}`,
      entityKind: "enemy" as const,
      entityId: String(entityId),
      animation: "death" as const,
      frame,
      startFrame: baseFrame + index * 3,
      endFrame: baseFrame + 60 + index * 3,
      position: { x: 620 + index * 180, y: 245 },
      sourceId: ENTITY_ASSET_IDS[index + 2] ?? "entity.enemy.mountain_imp_01"
    }));
  }
  const events: CanvasPresentationEntityAnimationEvent[] = [9005].map((entityId) => ({
    id: `entity_hit_${entityId}`,
    entityKind: "enemy" as const,
    entityId: String(entityId),
    animation: "hit" as const,
    frame,
    startFrame: baseFrame,
    endFrame: baseFrame + 24,
    position: { x: 1340, y: 250 },
    sourceId: "entity.enemy.stone_armor_demon_01"
  }));
  if (mode === "attack" || mode === "entities") {
    events.push({
      id: "entity_player_cast_p1",
      entityKind: "player",
      entityId: "p1",
      animation: "cast",
      frame,
      startFrame: baseFrame,
      endFrame: baseFrame + 36,
      position: { x: 920, y: 880 },
      sourceId: "spell_five_thunder"
    });
  }
  return events;
}

function entityVelocity(mode: EntitySceneMode, x: number, y: number): { readonly x: number; readonly y: number } {
  return mode === "move" || mode === "entities" ? { x, y } : { x: 0, y: 0 };
}

const ENTITY_ASSET_IDS = [
  "entity.player.cultivator_01",
  "entity.player.soul_01",
  "entity.enemy.mountain_imp_01",
  "entity.enemy.wolf_demon_01",
  "entity.enemy.elite_split_wind_wolf_01",
  "entity.enemy.rogue_cultivator_shadow_01",
  "entity.enemy.stone_armor_demon_01"
] as const;

function createAbilityShowcase(frame: number, mode: AbilitySceneMode): readonly CanvasPresentationAbilityVfxEvent[] {
  const baseFrame = frame - (frame % 120);
  const entries: readonly CanvasPresentationAbilityVfxEvent[] = [
    abilityEvent("spell_five_thunder", "cast", baseFrame, { x: 540, y: 770 }, { x: 540, y: 350 }, 86),
    abilityEvent("spell_bagua_sword_ring", "active", baseFrame, { x: 680, y: 800 }, undefined, 150),
    abilityEvent("spell_red_lotus_fire", "active", baseFrame, { x: 830, y: 430 }, undefined, 180),
    abilityEvent("spell_sleeve_universe", "active", baseFrame, { x: 1010, y: 720 }, { x: 1030, y: 470 }, 220),
    abilityEvent("artifact_qingshuang_sword", "hit", baseFrame, { x: 710, y: 360 }, undefined, 34),
    abilityEvent("artifact_ziyang_gourd", "hit", baseFrame, { x: 780, y: 360 }, undefined, 42),
    abilityEvent("artifact_xuanyue_seal", "cast", baseFrame, { x: 860, y: 350 }, undefined, 92),
    abilityEvent("pill_rejuvenation", "digest", baseFrame, { x: 900, y: 910 }, undefined, 42),
    abilityEvent("pill_burning_blood", "digest", baseFrame, { x: 950, y: 910 }, undefined, 46),
    abilityEvent("pill_clear_mind", "swallow", baseFrame, { x: 1000, y: 910 }, undefined, 42),
    abilityEvent("pill_minor_breakthrough", "complete", baseFrame, { x: 1050, y: 910 }, undefined, 48),
    abilityEvent("treasure_minor_sword_array", "active", baseFrame, { x: 920, y: 880 }, undefined, 72),
    abilityEvent("treasure_bagua_jade", "active", baseFrame, { x: 920, y: 880 }, undefined, 58),
    abilityEvent("treasure_gold_toad", "trigger", baseFrame, { x: 920, y: 880 }, { x: 650, y: 735 }, 96),
    abilityEvent("treasure_tongxin_lock", "active", baseFrame, { x: 900, y: 850 }, { x: 1040, y: 850 }, 260)
  ];

  return entries.filter((event) => {
    if (mode === "all") {
      return true;
    }
    if (mode === "spells") {
      return event.kind === "spell";
    }
    if (mode === "artifacts") {
      return event.kind === "artifact";
    }
    if (mode === "pills") {
      return event.kind === "pill";
    }
    return event.kind === "treasure";
  });
}

function abilityEvent(
  sourceId: string,
  phase: CanvasPresentationAbilityVfxEvent["phase"],
  frame: number,
  position: { readonly x: number; readonly y: number },
  targetPosition: { readonly x: number; readonly y: number } | undefined,
  radius: number
): CanvasPresentationAbilityVfxEvent {
  const profile = getAbilityVfxProfile(sourceId);
  return {
    id: `${sourceId}_${phase}`,
    kind: profile.kind,
    sourceId,
    ownerPlayerId: "p1",
    frame,
    startFrame: frame,
    endFrame: frame + 120,
    position,
    ...(targetPosition === undefined ? {} : { targetPosition }),
    radius,
    phase,
    ...(profile.sfxCueId === undefined ? {} : { sfxCueId: profile.sfxCueId })
  };
}

function createImpactShowcase(frame: number): CanvasPresentationState["visualEvents"] {
  const baseFrame = frame - (frame % 48);
  return [
    impactEvent("projectile_hit", "projectile_hit_playground", baseFrame, { x: 1080, y: 225 }),
    impactEvent("enemy_damaged", "enemy_damaged_playground", baseFrame, { x: 1110, y: 258 }),
    impactEvent("enemy_killed", "enemy_killed_playground", baseFrame, { x: 1150, y: 305 }),
    impactEvent("elite_killed", "elite_killed_playground", baseFrame, { x: 1220, y: 340 }),
    impactEvent("player_hit", "player_hit_playground", baseFrame, { x: 920, y: 880 }),
    impactEvent("shield_break", "shield_break_playground", baseFrame, { x: 1000, y: 850 }),
    impactEvent("boss_phase_changed", "boss_phase_changed_playground", baseFrame, { x: 960, y: 170 }),
    impactEvent("boss_killed", "boss_killed_playground", baseFrame, { x: 1050, y: 170 })
  ];
}

function impactEvent(
  kind: CanvasPresentationState["visualEvents"][number]["kind"],
  id: string,
  frame: number,
  position: { readonly x: number; readonly y: number }
): CanvasPresentationState["visualEvents"][number] {
  const profile = getImpactVfxProfile(kind);
  return {
    id,
    kind,
    frame,
    position,
    color: profile.color,
    intensity: profile.defaultIntensity,
    priority: profile.priority,
    ...(profile.defaultText === undefined ? {} : { text: profile.defaultText }),
    ...(profile.sfxCueId === undefined ? {} : { sfxCueId: profile.sfxCueId }),
    ...(profile.shakeIntensity === undefined ? {} : { shakeIntensity: profile.shakeIntensity })
  };
}

function createPlayerProjectiles(frame: number): CanvasPresentationState["playerProjectiles"] {
  const sway = Math.sin(frame / 18) * 12;
  return [
    {
      entityId: 11,
      ownerPlayerId: "p1",
      artifactId: "artifact_qingshuang_sword",
      renderKind: "flying_sword",
      position: { x: 760 + sway, y: 620 },
      velocity: { x: 0, y: -720 },
      radius: 5,
      pierce: 1
    },
    {
      entityId: 12,
      ownerPlayerId: "p1",
      artifactId: "artifact_ziyang_gourd",
      renderKind: "gourd_flame",
      position: { x: 880, y: 590 },
      velocity: { x: -50, y: -560 },
      radius: 8,
      pierce: 0
    },
    {
      entityId: 13,
      ownerPlayerId: "p2",
      artifactId: "artifact_xuanyue_seal",
      renderKind: "seal_impact",
      position: { x: 1000 - sway, y: 600 },
      velocity: { x: 0, y: -360 },
      radius: 14,
      pierce: 0
    }
  ];
}

function createEnemyBulletGrid(frame: number): CanvasPresentationState["enemyProjectiles"] {
  return Array.from({ length: ENEMY_BULLET_COUNT }, (_, index) => {
    const column = index % 20;
    const row = Math.floor(index / 20);
    return {
      entityId: 1_000 + index,
      ownerKind: "enemy" as const,
      ownerId: "enemy_asset_playground",
      renderKind: index % 17 === 0 ? ("enemy_spread" as const) : ("enemy_basic" as const),
      position: {
        x: 430 + column * 56 + Math.sin((frame + index * 7) / 25) * 5,
        y: 150 + row * 72 + ((frame + index * 3) % 42) * 0.18
      },
      velocity: { x: 0, y: 180 },
      radius: index % 17 === 0 ? 10 : 7
    };
  });
}

function createPickupShowcase(frame: number, magnetStartFrame: number): CanvasPresentationState["pickups"] {
  const progress = ((Math.max(0, frame - magnetStartFrame) % 180) / 180) * Math.PI;
  const pull = Math.sin(progress);
  const target = { x: 920, y: 880 };
  const bases = [
    { entityId: 101, pickupId: "drop_qi_orb", label: "气", renderKind: "qi_orb" as const, x: 610, y: 760 },
    { entityId: 102, pickupId: "drop_spirit_exp", label: "灵", renderKind: "spirit_exp" as const, x: 690, y: 790 },
    { entityId: 103, pickupId: "material_demon_core", label: "妖", renderKind: "material" as const, x: 770, y: 750 },
    { entityId: 104, pickupId: "pill_rejuvenation_drop", label: "丹", renderKind: "pill" as const, x: 850, y: 790 }
  ];

  return bases.map((pickup, index) => ({
    entityId: pickup.entityId,
    pickupId: pickup.pickupId,
    label: pickup.label,
    renderKind: pickup.renderKind,
    position: {
      x: pickup.x + (target.x - pickup.x) * pull * (0.28 + index * 0.08),
      y: pickup.y + (target.y - pickup.y) * pull * (0.28 + index * 0.08)
    },
    sfxCueId: pickup.renderKind === "material" ? "sfx.pickup.rare_drop_01" : "sfx.pickup.qi_orb_01"
  }));
}

function createPlaygroundWarnings(backgroundMode: BackgroundSceneMode): CanvasPresentationState["warnings"] {
  const warnings: CanvasPresentationState["warnings"] = [
    {
      id: "playground_wolf_charge",
      kind: "wolf_charge",
      position: { x: 1080, y: 310 },
      radius: 72,
      severity: "medium"
    }
  ];
  if (backgroundMode !== "tribulation_sky") {
    return warnings;
  }
  return [
    ...warnings,
    {
      id: "playground_tribulation_sky",
      kind: "tribulation",
      position: { x: 960, y: 500 },
      radius: 100,
      severity: "lethal"
    }
  ];
}

function createPlaygroundViewState(frame: number, backgroundMode: BackgroundSceneMode): InRunUiViewState {
  const qingyun = backgroundMode === "qingyun_reserve";
  const tribulationSky = backgroundMode === "tribulation_sky";
  return {
    mode: tribulationSky ? "combat_tribulation" : "combat",
    screen: {
      width: CANVAS_WIDTH,
      height: CANVAS_HEIGHT,
      scale: 1,
      safeArea: { x: 360, y: 0, width: 1200, height: 1080 }
    },
    players: [],
    teamInsight: {
      visible: true,
      teamLevel: 1,
      exp: frame % 120,
      expToNext: 120,
      progress01: (frame % 120) / 120,
      nextTriggerText: "BAS-C011 background parallax pass",
      sharedFortuneReroll: 2,
      isReadyToInsight: false
    },
    stage: {
      stageName: qingyun ? "青云山·背景预留" : "BAS-C011 Outer Battlefield",
      segmentName: tribulationSky ? "雷劫天象层" : qingyun ? "山门 / 云海 / 妖雾预留" : "Combat asset playground",
      segmentIndex: 1,
      segmentCount: 1,
      timeRemaining: 0,
      intensity: tribulationSky ? "boss" : backgroundMode === "background" ? "medium" : "high"
    },
    ...(tribulationSky
      ? {
          tribulation: {
            active: true,
            playerId: "p1",
            tribulationName: "练气破筑基·局内三九雷劫",
            phase: "active" as const,
            remainingTime: 12,
            warningText: "雷劫天象层",
            canClearThunder: false as const,
            lightningWarnings: [
              {
                id: "playground_tribulation_sky",
                x: 960,
                y: 500,
                radius: 100,
                timeToImpact: 0.8,
                severity: "lethal" as const
              }
            ]
          }
        }
      : {}),
    prompts: []
  };
}
