import type { ImpactFeedback, VfxPreset, VfxScenario } from "./types";

export const PRESETS: readonly VfxPreset[] = Object.freeze([
  {
    id: "readable",
    name: "可读",
    particleScale: 0.55,
    filterStrength: 0.55,
    flashAlpha: 0.08
  },
  {
    id: "balanced",
    name: "平衡",
    particleScale: 1,
    filterStrength: 1,
    flashAlpha: 0.14
  },
  {
    id: "flashy",
    name: "华丽",
    particleScale: 1.75,
    filterStrength: 1.55,
    flashAlpha: 0.24
  }
]);

export const SCENARIOS: readonly VfxScenario[] = Object.freeze([
  {
    id: "five_thunder_chain",
    name: "五雷正法连锁",
    reviewNote: "审查重点：电弧连锁、命中爆点、Shockwave 是否比 Canvas 更有冲击力，同时敌弹白芯不被盖住。",
    durationFrames: 180,
    enemyBullets: 42,
    playerPosition: { x: 800, y: 760 }
  },
  {
    id: "red_lotus_field",
    name: "红莲业火铺场",
    reviewNote: "审查重点：Bloom + BulgePinch 做火场热浪，验证高压弹幕下白芯、玩家判定点和火场边界是否仍清楚。",
    durationFrames: 240,
    enemyBullets: 96,
    playerPosition: { x: 800, y: 745 }
  },
  {
    id: "sleeve_universe_absorb",
    name: "袖里乾坤吸弹",
    reviewNote: "审查重点：局部 ZoomBlur 只在压缩窗口短暂增强，吸入轨迹要有方向性但不能持续旋转眩晕。",
    durationFrames: 210,
    enemyBullets: 78,
    playerPosition: { x: 800, y: 750 }
  },
  {
    id: "tribulation_warning",
    name: "三九雷劫预警",
    reviewNote: "审查重点：落雷前红圈和锁定柱必须最清楚，Shockwave 和 RGBSplit 只能增强危险感，不能抢读预警。",
    durationFrames: 180,
    enemyBullets: 60,
    playerPosition: { x: 745, y: 740 }
  },
  {
    id: "boss_death_cascade",
    name: "Boss 死亡连爆",
    reviewNote: "审查重点：Glitch/RGBSplit/冲击波/清场白闪是否显著提升死亡反馈，右侧 UI 和战斗区保持分离。",
    durationFrames: 220,
    enemyBullets: 34,
    playerPosition: { x: 800, y: 770 }
  },
  {
    id: "impact_gallery",
    name: "命中反馈审查",
    reviewNote: "审查重点：逐个检查敌人受击、子弹命中和擦弹反馈，画面干净，白芯和判定点不能被滤镜污染。",
    durationFrames: 150,
    enemyBullets: 18,
    playerPosition: { x: 800, y: 760 }
  }
]);

export const IMPACT_FEEDBACKS: readonly ImpactFeedback[] = Object.freeze([
  {
    id: "light_hit",
    name: "普通受击",
    reviewNote: "小白闪、方向火花、轻微退让，用于飞剑或低伤害命中。",
    family: "enemy_hit"
  },
  {
    id: "thunder_hit",
    name: "雷法受击",
    reviewNote: "蓝白电弧缠身、小冲击波、敌人轮廓反白，用于五雷正法命中。",
    family: "enemy_hit"
  },
  {
    id: "fire_dot_hit",
    name: "火焰灼烧",
    reviewNote: "红莲火星爆开、短灼烧圈、余烬上飘，用于持续伤害跳字。",
    family: "enemy_hit"
  },
  {
    id: "armor_break_hit",
    name: "破甲命中",
    reviewNote: "金属裂纹、碎片外崩、低频冲击环，用于精英破防。",
    family: "enemy_hit"
  },
  {
    id: "kill_pop",
    name: "击杀爆点",
    reviewNote: "核心塌缩、灵气碎片喷出、残魂上升，用于小怪死亡。",
    family: "enemy_hit"
  },
  {
    id: "enemy_bullet_blocked",
    name: "敌弹撞盾",
    reviewNote: "红白芯爆开、护体涟漪，用于护盾/护体挡弹。",
    family: "bullet_impact"
  },
  {
    id: "enemy_bullet_clear",
    name: "清弹净化",
    reviewNote: "白芯消失、青色净化圈扩散，用于清弹法术。",
    family: "bullet_impact"
  },
  {
    id: "player_bullet_impact",
    name: "飞剑命中",
    reviewNote: "斜向切痕、金属火花，用于玩家普通攻击命中。",
    family: "bullet_impact"
  },
  {
    id: "boss_bullet_impact",
    name: "Boss 大弹撞击",
    reviewNote: "厚重橙红冲击圈、短震感，用于大弹撞屏障。",
    family: "bullet_impact"
  },
  {
    id: "graze_flash",
    name: "擦弹一闪",
    reviewNote: "判定点旁细白线一闪，不遮挡玩家，用于擦弹奖励反馈。",
    family: "bullet_impact"
  }
]);
