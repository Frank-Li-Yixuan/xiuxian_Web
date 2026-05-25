import particleBudgetsData from "../../../docs_packages/06_combat_feel_vfx/data/vfx/particle_budgets.v0.1.json";
import readabilityRulesData from "../../../docs_packages/06_combat_feel_vfx/data/vfx/readability_rules.v0.1.json";
import type {
  CanvasPresentationBoss,
  CanvasPresentationEnemy,
  CanvasPresentationEnemyProjectile,
  CanvasPresentationPlayer,
  CanvasPresentationPlayerProjectile,
  CanvasPresentationState,
  CanvasPresentationVisualEvent,
  CanvasPresentationWarning
} from "../../render/CanvasPresentationState";
import { ParticlePool, type VisualRng } from "../../render/vfx/ParticlePool";
import {
  ReadabilityGuard,
  type AdjustedReadabilityEffect,
  type ReadabilityEffect
} from "../../render/vfx/ReadabilityGuard";
import type { InRunUiViewState, PlayerHudViewState, SpellSlotViewState } from "../../view/InRunViewState";

export type VfxLabScenarioId =
  | "five_thunder_chain"
  | "red_lotus_field"
  | "sleeve_universe_absorb"
  | "tribulation_warning"
  | "boss_death_cascade";

export type VfxLabPresetId = "readable" | "balanced" | "flashy";
export type VfxLabPressure = "low" | "medium" | "high" | "boss";

export interface VfxLabScenario {
  readonly id: VfxLabScenarioId;
  readonly name: string;
  readonly durationFrames: number;
  readonly pressure: VfxLabPressure;
  readonly enemyBulletCount: number;
  readonly playerPosition: {
    readonly x: number;
    readonly y: number;
  };
  readonly effectScript: readonly VfxLabScriptedEffect[];
}

export interface VfxLabScriptedEffect {
  readonly frame: number;
  readonly effectId: string;
  readonly spellId: string;
  readonly position: {
    readonly x: number;
    readonly y: number;
  };
}

export interface VfxLabPreset {
  readonly id: VfxLabPresetId;
  readonly name: string;
  readonly particleMultiplier: number;
  readonly spellAlpha: number;
  readonly bulletMultiplier: number;
  readonly quality: "low" | "medium" | "high";
}

export interface VfxLabEffectEvent {
  readonly frame: number;
  readonly ownerPlayerId: string;
  readonly spellId: string;
  readonly effectId: string;
  readonly position: {
    readonly x: number;
    readonly y: number;
  };
}

export interface VfxLabFrame {
  readonly viewState: InRunUiViewState;
  readonly effectEvents: readonly VfxLabEffectEvent[];
  readonly presentation: CanvasPresentationState;
}

export interface CreateVfxLabFrameOptions {
  readonly scenarioId: VfxLabScenarioId;
  readonly presetId: VfxLabPresetId;
  readonly frame: number;
}

export interface VfxLabReadabilitySummary {
  readonly enemyBulletCount: number;
  readonly activeParticleBudget: number;
  readonly mergedBursts: number;
  readonly droppedParticles: number;
  readonly flags: readonly string[];
  readonly adjustedEffects: readonly AdjustedReadabilityEffect[];
}

export const VFX_LAB_PRESETS: readonly VfxLabPreset[] = Object.freeze([
  {
    id: "readable",
    name: "可读",
    particleMultiplier: 0.55,
    spellAlpha: 0.38,
    bulletMultiplier: 0.75,
    quality: "low"
  },
  {
    id: "balanced",
    name: "平衡",
    particleMultiplier: 1,
    spellAlpha: 0.52,
    bulletMultiplier: 1,
    quality: "medium"
  },
  {
    id: "flashy",
    name: "华丽",
    particleMultiplier: 1.75,
    spellAlpha: 0.82,
    bulletMultiplier: 1.25,
    quality: "high"
  }
]);

export const VFX_LAB_SCENARIOS: readonly VfxLabScenario[] = Object.freeze([
  {
    id: "five_thunder_chain",
    name: "五雷正法连锁",
    durationFrames: 180,
    pressure: "medium",
    enemyBulletCount: 42,
    playerPosition: { x: 960, y: 860 },
    effectScript: [
      script(0, "thunder_gather", "spell_five_thunder", 960, 700),
      script(12, "thunder_chain_hit", "spell_five_thunder", 900, 520),
      script(22, "thunder_chain_hit", "spell_five_thunder", 1010, 460),
      script(34, "thunder_kill_burst", "spell_five_thunder", 1080, 370),
      script(52, "thunder_chain_hit", "spell_five_thunder", 830, 410)
    ]
  },
  {
    id: "red_lotus_field",
    name: "红莲业火铺场",
    durationFrames: 240,
    pressure: "high",
    enemyBulletCount: 96,
    playerPosition: { x: 960, y: 825 },
    effectScript: [
      script(0, "lotus_area_warning", "spell_red_lotus_fire", 960, 565),
      script(18, "low_flame_field", "spell_red_lotus_fire", 960, 565),
      script(76, "burn_pop_ring", "spell_red_lotus_fire", 880, 480),
      script(104, "burn_pop_ring", "spell_red_lotus_fire", 1060, 515)
    ]
  },
  {
    id: "sleeve_universe_absorb",
    name: "袖里乾坤吸弹",
    durationFrames: 210,
    pressure: "high",
    enemyBulletCount: 78,
    playerPosition: { x: 960, y: 830 },
    effectScript: [
      script(0, "void_fan_open", "spell_sleeve_universe", 960, 690),
      script(32, "bullet_absorb_lines", "spell_sleeve_universe", 960, 660),
      script(112, "void_core_compress", "spell_sleeve_universe", 960, 575),
      script(146, "sword_qi_reflect", "spell_sleeve_universe", 960, 525)
    ]
  },
  {
    id: "tribulation_warning",
    name: "局内三九雷劫",
    durationFrames: 180,
    pressure: "high",
    enemyBulletCount: 64,
    playerPosition: { x: 890, y: 820 },
    effectScript: [
      script(0, "sky_darkening", "tribulation", 960, 540),
      script(42, "single_lock_thunder", "tribulation", 900, 650),
      script(78, "tribulation_strike", "tribulation", 900, 650),
      script(112, "double_lock_thunder", "tribulation", 1060, 620),
      script(152, "final_heaven_punishment", "tribulation", 960, 540)
    ]
  },
  {
    id: "boss_death_cascade",
    name: "青云劫灵死亡连爆",
    durationFrames: 220,
    pressure: "boss",
    enemyBulletCount: 34,
    playerPosition: { x: 960, y: 870 },
    effectScript: [
      script(0, "boss_phase_shift", "boss_qingyun_tribulation_spirit", 960, 225),
      script(34, "boss_death_cascade", "boss_qingyun_tribulation_spirit", 960, 225),
      script(104, "screen_clear_fortune_qi", "boss_qingyun_tribulation_spirit", 960, 475)
    ]
  }
]);

export function createVfxLabFrame(options: CreateVfxLabFrameOptions): VfxLabFrame {
  const scenario = requireScenario(options.scenarioId);
  const preset = requirePreset(options.presetId);
  const localFrame = positiveModulo(options.frame, scenario.durationFrames);
  const bulletCount = Math.round(scenario.enemyBulletCount * preset.bulletMultiplier);
  const enemyProjectiles = createEnemyProjectiles(scenario, bulletCount, localFrame);
  const players = createPlayers(scenario);
  const presentation: CanvasPresentationState = deepFreeze({
    frame: localFrame,
    screen: { width: 1920, height: 1080 },
    players,
    enemies: createEnemies(scenario, localFrame),
    playerProjectiles: createPlayerProjectiles(scenario, localFrame),
    enemyProjectiles,
    pickups: [
      {
        entityId: 30_001,
        pickupId: "pickup_spirit_exp",
        position: { x: 820, y: 690 },
        label: "灵",
        renderKind: "spirit_exp"
      },
      {
        entityId: 30_002,
        pickupId: "pickup_qi_orb",
        position: { x: 1100, y: 710 },
        label: "气",
        renderKind: "qi_orb"
      }
    ],
    warnings: createWarnings(scenario, localFrame),
    visualEvents: createVisualEvents(scenario, preset, localFrame),
    ...(scenario.pressure === "boss" ? { boss: createBoss(localFrame) } : {})
  });

  return deepFreeze({
    viewState: createViewState(scenario, preset, localFrame),
    effectEvents: createEffectEvents(scenario, localFrame),
    presentation
  });
}

export function createVfxLabReadabilitySummary(frame: VfxLabFrame): VfxLabReadabilitySummary {
  const scenario = requireScenarioFromFrame(frame);
  const preset = requirePresetFromFrame(frame);
  const guard = new ReadabilityGuard({ rules: readabilityRulesData });
  const player = frame.presentation.players[0];
  const spellCenter = scenario.id === "red_lotus_field" ? { x: 960, y: 565 } : scenario.playerPosition;
  const effects: readonly ReadabilityEffect[] = [
    {
      id: `${scenario.id}_spell_fill`,
      effectId: scenario.effectScript[0]?.effectId ?? scenario.id,
      kind: "player_spell_fill",
      layerId: "player_projectiles_high",
      position: spellCenter,
      radius: scenario.id === "red_lotus_field" ? 330 : 180,
      alpha: preset.spellAlpha
    },
    {
      id: `${scenario.id}_pickup_trails`,
      effectId: "pickup_magnet_trail",
      kind: "pickup_trail",
      layerId: "pickup_trails",
      position: { x: 960, y: 720 },
      radius: 18,
      alpha: 0.72,
      count: Math.round(130 * preset.particleMultiplier)
    }
  ];
  const result = guard.apply({
    frame: frame.presentation.frame,
    effects,
    enemyBullets: frame.presentation.enemyProjectiles.map((projectile) => ({
      x: projectile.position.x,
      y: projectile.position.y,
      radius: projectile.radius
    })),
    playerHitboxes:
      player === undefined
        ? []
        : [
            {
              playerId: player.playerId,
              x: player.position.x,
              y: player.position.y,
              radius: 7
            }
          ],
    tribulationActive: frame.viewState.tribulation?.active === true
  });
  const pool = new ParticlePool({ budgets: particleBudgetsData, quality: preset.quality });
  pool.spawnBurst({
    frame: frame.presentation.frame,
    bucket: "normal",
    effectId: scenario.id,
    origin: scenario.playerPosition,
    requestedCount: Math.round(260 * preset.particleMultiplier),
    lifeFrames: 32,
    visualRng: createDeterministicRng(frame.presentation.frame + scenario.enemyBulletCount)
  });
  const stats = pool.getStats();

  return deepFreeze({
    enemyBulletCount: frame.presentation.enemyProjectiles.length,
    activeParticleBudget: stats.active,
    mergedBursts: stats.mergedBursts,
    droppedParticles: stats.droppedParticles,
    flags: [...new Set(result.adjustedEffects.flatMap((effect) => effect.readabilityFlags))],
    adjustedEffects: result.adjustedEffects
  });
}

function createViewState(scenario: VfxLabScenario, preset: VfxLabPreset, frame: number): InRunUiViewState {
  return {
    mode: scenario.id === "tribulation_warning" ? "combat_tribulation" : scenario.pressure === "boss" ? "combat_boss" : "combat",
    screen: {
      width: 1920,
      height: 1080,
      scale: 1,
      safeArea: { x: 360, y: 0, width: 1200, height: 1080 }
    },
    players: [createHudPlayer("p1", "player1", "P1", scenario.playerPosition, 0.82, 0.68), createHudPlayer("p2", "player2", "P2", { x: 1045, y: 880 }, 0.62, 0.84)],
    teamInsight: {
      visible: true,
      teamLevel: 3,
      exp: 140 + frame,
      expToNext: 260,
      progress01: Math.min(1, (140 + frame) / 260),
      nextTriggerText: "VFX Lab 固定事件流",
      sharedFortuneReroll: 2,
      isReadyToInsight: false
    },
    stage: {
      stageName: "VFX Lab",
      segmentName: `${scenario.name} / ${preset.name}`,
      segmentIndex: 4,
      segmentCount: 5,
      timeRemaining: (scenario.durationFrames - frame) / 60,
      nextEventText: "截图对比可读性 / 爽感 / FPS",
      intensity: scenario.pressure
    },
    ...(scenario.pressure === "boss"
      ? {
          boss: {
            visible: true,
            bossId: "boss_qingyun_tribulation_spirit",
            name: "青云劫灵",
            hp: 5200 * Math.max(0, 1 - frame / scenario.durationFrames),
            maxHp: 5200,
            phaseIndex: 3,
            phaseCount: 3,
            phaseName: "死亡连爆",
            currentWarning: {
              text: "Boss 死亡清场后允许强反馈",
              remainingTime: 2,
              severity: "high"
            }
          }
        }
      : {}),
    ...(scenario.id === "tribulation_warning"
      ? {
          tribulation: {
            active: true,
            playerId: "p1",
            tribulationName: "三九雷劫特效验证",
            phase: frame > 145 ? "final_strike" : "active",
            remainingTime: (scenario.durationFrames - frame) / 60,
            warningText: "红圈真实命中范围必须清楚",
            canClearThunder: false,
            targetRealmName: "筑基",
            lightningWarnings: [
              {
                id: "lab_warning_primary",
                x: 900,
                y: 650,
                radius: 88,
                timeToImpact: Math.max(0, 1 - frame / 60),
                severity: "lethal"
              },
              {
                id: "lab_warning_secondary",
                x: 1060,
                y: 620,
                radius: 72,
                timeToImpact: Math.max(0, 1.4 - frame / 60),
                severity: "high"
              }
            ]
          }
        }
      : {}),
    prompts: [
      {
        id: "vfx_lab_prompt",
        priority: "P2",
        kind: "system",
        mainText: "VFX Lab",
        subText: "中心战斗区保持可读，右上角查看指标",
        remainingTime: 999,
        anchor: { type: "screen", x: 960, y: 80 }
      }
    ]
  };
}

function createHudPlayer(
  playerId: "p1" | "p2",
  colorToken: "player1" | "player2",
  displayName: string,
  position: { readonly x: number; readonly y: number },
  hpRatio: number,
  qiRatio: number
): PlayerHudViewState {
  return {
    playerId,
    core: {
      playerId,
      displayName,
      colorToken,
      realmName: "练气",
      realmLayer: playerId === "p1" ? 9 : 6,
      hp: Math.round(100 * hpRatio),
      maxHp: 100,
      qi: Math.round(100 * qiRatio),
      maxQi: 100,
      aliveState: "body",
      activeStatusTags: [],
      lowHp: hpRatio < 0.35,
      canBeRescued: false
    },
    cultivation: {
      playerId,
      realmName: "练气",
      layer: playerId === "p1" ? 9 : 6,
      cultivation: playerId === "p1" ? 840 : 520,
      cultivationToNext: 860,
      progress01: playerId === "p1" ? 0.98 : 0.6,
      regenPerSecond: 1.6
    },
    spells: [
      spellSlot(0, "J", "spell_five_thunder", "五雷正法", "ready", "thunder"),
      spellSlot(1, "K", "spell_bagua_sword_ring", "八卦剑阵", "cooldown", "metal"),
      spellSlot(2, "L", "spell_red_lotus_fire", "红莲业火", "ready", "fire"),
      spellSlot(3, "I", "spell_sleeve_universe", "袖里乾坤", "ready", "void")
    ],
    pills: [
      { slotIndex: 0, keyLabel: "1", pillId: "pill_rejuvenation", name: "回春丹", state: "ready", effectSummary: "缓回" },
      { slotIndex: 1, keyLabel: "2", pillId: "pill_burning_blood", name: "燃血丹", state: "digesting", remainingTime: 12, totalTime: 20, effectSummary: "火力" },
      { slotIndex: 2, keyLabel: "3", pillId: "pill_clear_mind", name: "清心丹", state: "ready", effectSummary: "清障" }
    ],
    artifacts: {
      outer: {
        slotType: "outer",
        itemId: "artifact_qingshuang_sword",
        name: "青霜飞剑",
        star: 2,
        state: "active"
      }
    },
    treasures: { slots: [] },
    buildSummary: { techniqueTags: ["vfx_lab"], talentTags: [], constitutionTags: [] }
  };
}

function spellSlot(
  slotIndex: 0 | 1 | 2 | 3,
  keyLabel: string,
  spellId: string,
  name: string,
  state: "ready" | "cooldown",
  element: NonNullable<SpellSlotViewState["element"]>
): SpellSlotViewState {
  return {
    slotIndex,
    keyLabel,
    spellId,
    name,
    level: 2,
    costQi: 30,
    cooldownRemaining: state === "cooldown" ? 4.2 : 0,
    cooldownTotal: 8,
    state,
    element
  };
}

function createPlayers(scenario: VfxLabScenario): readonly CanvasPresentationPlayer[] {
  return [
    {
      playerId: "p1",
      position: scenario.playerPosition,
      renderColor: "player1",
      realmLayer: 9,
      aliveState: "body",
      focusActive: true,
      hpRatio: 0.82,
      qiRatio: 0.68
    },
    {
      playerId: "p2",
      position: { x: 1045, y: 880 },
      renderColor: "player2",
      realmLayer: 6,
      aliveState: "body",
      focusActive: false,
      hpRatio: 0.62,
      qiRatio: 0.84
    }
  ];
}

function createEnemies(scenario: VfxLabScenario, frame: number): readonly CanvasPresentationEnemy[] {
  const enemyKinds: readonly CanvasPresentationEnemy["renderKind"][] = [
    "mountain_imp",
    "wolf_demon",
    "rogue_cultivator_shadow",
    "stone_armor_demon",
    "elite_split_wind_wolf"
  ];
  const count = scenario.pressure === "boss" ? 6 : scenario.pressure === "high" ? 18 : 12;

  return Array.from({ length: count }, (_, index) => {
    const angle = index * 1.618 + frame * 0.012;
    const ring = 160 + (index % 4) * 52;
    return {
      entityId: 10_000 + index,
      enemyId: `vfx_lab_enemy_${index}`,
      renderKind: enemyKinds[index % enemyKinds.length] ?? "mountain_imp",
      position: {
        x: round2(960 + Math.cos(angle) * ring),
        y: round2(350 + Math.sin(angle * 0.9) * 130)
      },
      hpRatio: Math.max(0.2, 1 - ((frame + index * 7) % 120) / 160)
    };
  });
}

function createPlayerProjectiles(scenario: VfxLabScenario, frame: number): readonly CanvasPresentationPlayerProjectile[] {
  const count = scenario.id === "red_lotus_field" ? 12 : 8;

  return Array.from({ length: count }, (_, index) => ({
    entityId: 20_000 + index,
    ownerPlayerId: index % 3 === 0 ? "p2" : "p1",
    artifactId: index % 4 === 0 ? "artifact_ziyang_gourd" : "artifact_qingshuang_sword",
    renderKind: index % 4 === 0 ? "gourd_flame" : "flying_sword",
    position: {
      x: round2(760 + index * 42 + Math.sin((frame + index) * 0.1) * 14),
      y: round2(850 - ((frame * 9 + index * 66) % 430))
    },
    velocity: { x: 0, y: -720 },
    radius: 5,
    pierce: 1
  }));
}

function createEnemyProjectiles(scenario: VfxLabScenario, count: number, frame: number): readonly CanvasPresentationEnemyProjectile[] {
  const bullets: CanvasPresentationEnemyProjectile[] = [];
  const center = scenario.id === "red_lotus_field" ? { x: 960, y: 565 } : scenario.playerPosition;

  bullets.push({
    entityId: 40_000,
    ownerKind: "enemy",
    ownerId: "readability_anchor",
    renderKind: "enemy_basic",
    position: { x: center.x + 12, y: center.y + 8 },
    velocity: { x: 0, y: 180 },
    radius: 7
  });

  for (let index = 1; index < count; index += 1) {
    const angle = ((index * 137.5 + frame * 2.5) * Math.PI) / 180;
    const lane = 360 + (index % 8) * 150;
    const y = 180 + ((index * 37 + frame * 4) % 720);
    bullets.push({
      entityId: 40_000 + index,
      ownerKind: index % 11 === 0 ? "boss" : "enemy",
      ownerId: index % 11 === 0 ? "boss_qingyun_tribulation_spirit" : "vfx_lab_enemy",
      renderKind: index % 11 === 0 ? "boss_big" : index % 5 === 0 ? "enemy_spread" : "enemy_basic",
      position: {
        x: round2(lane + Math.cos(angle) * 34),
        y: round2(y)
      },
      velocity: { x: round2(Math.cos(angle) * 80), y: round2(180 + Math.sin(angle) * 40) },
      radius: index % 11 === 0 ? 15 : 7
    });
  }

  return bullets;
}

function createWarnings(scenario: VfxLabScenario, frame: number): readonly CanvasPresentationWarning[] {
  if (scenario.id !== "tribulation_warning") {
    return [];
  }

  return [
    {
      id: "lab_tribulation_warning_primary",
      kind: "tribulation",
      position: { x: 900, y: 650 },
      radius: 88 + Math.sin(frame * 0.15) * 4,
      severity: "lethal"
    },
    {
      id: "lab_tribulation_warning_secondary",
      kind: "tribulation",
      position: { x: 1060, y: 620 },
      radius: 72 + Math.cos(frame * 0.12) * 3,
      severity: "high"
    }
  ];
}

function createVisualEvents(
  scenario: VfxLabScenario,
  preset: VfxLabPreset,
  frame: number
): readonly CanvasPresentationVisualEvent[] {
  const baseCount = scenario.id === "boss_death_cascade" ? 12 : scenario.id === "red_lotus_field" ? 10 : 7;
  const count = Math.max(3, Math.round(baseCount * preset.particleMultiplier));
  const color = scenario.id === "red_lotus_field" ? "#f97316" : scenario.id === "tribulation_warning" ? "#facc15" : "#a78bfa";

  return Array.from({ length: count }, (_, index) => {
    const kind: CanvasPresentationVisualEvent["kind"] =
      scenario.id === "boss_death_cascade" ? "boss_death" : index % 3 === 0 ? "kill_burst" : "hit_spark";
    const intensity: NonNullable<CanvasPresentationVisualEvent["intensity"]> =
      scenario.id === "boss_death_cascade" ? "ultimate" : preset.id === "flashy" ? "large" : "medium";

    return {
      id: `vfx_lab_visual_${scenario.id}_${index}`,
      kind,
      frame: Math.max(0, frame - (index % 5) * 6),
      position: {
        x: round2(960 + Math.cos(index * 1.7 + frame * 0.03) * (90 + index * 13)),
        y: round2((scenario.pressure === "boss" ? 250 : 520) + Math.sin(index * 1.2) * 120)
      },
      color,
      intensity,
      ...(index === 0 ? { text: scenario.name } : {})
    };
  });
}

function createEffectEvents(scenario: VfxLabScenario, frame: number): readonly VfxLabEffectEvent[] {
  const activeEvents = scenario.effectScript.filter(
    (entry) => Math.abs(frame - entry.frame) <= 24 || (entry.effectId === "low_flame_field" && frame >= entry.frame)
  );
  const events = activeEvents.length > 0 ? activeEvents : [nearestScriptedEffect(scenario, frame)];

  return events.map((entry) => ({
    frame,
    ownerPlayerId: "p1",
    spellId: entry.spellId,
    effectId: entry.effectId,
    position: entry.position
  }));
}

function nearestScriptedEffect(scenario: VfxLabScenario, frame: number): VfxLabScriptedEffect {
  const first = scenario.effectScript[0];
  if (first === undefined) {
    return script(0, scenario.id, scenario.id, scenario.playerPosition.x, scenario.playerPosition.y);
  }

  return scenario.effectScript.reduce((nearest, candidate) => {
    const nearestDistance = Math.abs(frame - nearest.frame);
    const candidateDistance = Math.abs(frame - candidate.frame);
    return candidateDistance < nearestDistance ? candidate : nearest;
  }, first);
}

function createBoss(frame: number): CanvasPresentationBoss {
  return {
    entityId: 90_001,
    bossId: "boss_qingyun_tribulation_spirit",
    renderKind: "qingyun_tribulation_spirit",
    position: { x: 960, y: 225 },
    hpRatio: Math.max(0, 1 - frame / 220),
    phaseIndex: 3,
    phaseCount: 3,
    status: frame > 96 ? "defeated" : "active",
    warningText: "死亡连爆"
  };
}

function requireScenario(id: VfxLabScenarioId): VfxLabScenario {
  const scenario = VFX_LAB_SCENARIOS.find((candidate) => candidate.id === id);
  if (scenario === undefined) {
    throw new Error(`Unknown VFX lab scenario: ${id}`);
  }
  return scenario;
}

function requirePreset(id: VfxLabPresetId): VfxLabPreset {
  const preset = VFX_LAB_PRESETS.find((candidate) => candidate.id === id);
  if (preset === undefined) {
    throw new Error(`Unknown VFX lab preset: ${id}`);
  }
  return preset;
}

function requireScenarioFromFrame(frame: VfxLabFrame): VfxLabScenario {
  const label = frame.viewState.stage.segmentName;
  const scenario = VFX_LAB_SCENARIOS.find((candidate) => label.startsWith(candidate.name));
  if (scenario === undefined) {
    return VFX_LAB_SCENARIOS[0] as VfxLabScenario;
  }
  return scenario;
}

function requirePresetFromFrame(frame: VfxLabFrame): VfxLabPreset {
  const label = frame.viewState.stage.segmentName;
  const preset = VFX_LAB_PRESETS.find((candidate) => label.endsWith(candidate.name));
  if (preset === undefined) {
    return VFX_LAB_PRESETS[1] as VfxLabPreset;
  }
  return preset;
}

function script(frame: number, effectId: string, spellId: string, x: number, y: number): VfxLabScriptedEffect {
  return { frame, effectId, spellId, position: { x, y } };
}

function positiveModulo(value: number, divisor: number): number {
  return ((Math.trunc(value) % divisor) + divisor) % divisor;
}

function round2(value: number): number {
  return Math.round(value * 100) / 100;
}

function createDeterministicRng(seed: number): VisualRng {
  let state = seed >>> 0;
  return {
    next01(): number {
      state = Math.imul(state ^ 0x9e3779b9, 1664525) + 1013904223;
      return ((state >>> 0) % 10_000) / 10_000;
    }
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
