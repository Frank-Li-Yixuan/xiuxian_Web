import { describe, expect, it } from "vitest";

import { buildHudPresentation } from "../../src/ui/HudPresenter";
import { buildInsightOverlayPresentation } from "../../src/ui/InsightOverlayPresenter";
import type { InRunUiViewState } from "../../src/view/InRunViewState";

describe("HUD presentation", () => {
  it("maps the 1920x1080 in-run ViewState into the three-column HUD architecture without mutating gameplay ViewState", () => {
    const viewState = createViewState();
    const before = structuredClone(viewState);

    const hud = buildHudPresentation(viewState);

    expect(viewState).toEqual(before);
    expect(Object.isFrozen(hud)).toBe(true);
    expect(Object.isFrozen(hud.sections)).toBe(true);
    expect(hud.layout).toEqual({
      leftDaoPanel: { x: 0, y: 0, width: 360, height: 1080 },
      combatPanel: { x: 360, y: 0, width: 1080, height: 1080 },
      rightExternalPanel: { x: 1440, y: 0, width: 480, height: 1080 },
      topCenterBand: { x: 560, y: 20, width: 800, height: 96 },
      bottomPromptBand: { x: 500, y: 930, width: 840, height: 64 }
    });

    expect(hud.sections.map((section) => section.semantic)).toEqual(
      expect.arrayContaining(["team_insight", "player_core", "qi", "spell_bar", "cultivation", "pill_digestion"])
    );
    expect(hud.sections.find((section) => section.semantic === "team_insight")).toEqual(
      expect.objectContaining({
        id: "team_insight",
        region: "top",
        title: "团队灵气",
        colorToken: "teamInsight",
        rows: expect.arrayContaining([
          expect.objectContaining({ label: "灵气经验", value: "180 / 180" }),
          expect.objectContaining({ label: "触发", value: "灵气将满：即将顿悟" }),
          expect.objectContaining({ label: "公共气运", value: "2" })
        ])
      })
    );

    const p1Cultivation = hud.sections.find((section) => section.id === "cultivation_p1");
    expect(p1Cultivation).toEqual(
      expect.objectContaining({
        semantic: "cultivation",
        title: "P1 修为",
        colorToken: "cultivation",
        rows: expect.arrayContaining([
          expect.objectContaining({ label: "境界", value: "练气九层" }),
          expect.objectContaining({ label: "修为", value: "860 / 860" }),
          expect.objectContaining({ label: "瓶颈", value: "天道感应：准备渡劫" })
        ])
      })
    );
    expect(p1Cultivation?.rows.map((row) => row.label)).not.toContain("灵气经验");

    expect(hud.sections.find((section) => section.id === "qi_p1")).toEqual(
      expect.objectContaining({
        semantic: "qi",
        title: "P1 真元",
        rows: [expect.objectContaining({ label: "真元/气", value: "30 / 100", state: "warning" })]
      })
    );
  });

  it("exposes spell, pill, artifact, stage, boss, rescue, and tribulation status as read-only HUD data", () => {
    const hud = buildHudPresentation(createViewState());

    expect(hud.spellBars.find((bar) => bar.playerId === "p1")?.slots).toEqual([
      expect.objectContaining({
        slotIndex: 0,
        keyLabel: "J",
        label: "五雷正法 Lv.2",
        state: "cooldown",
        detail: "CD 2s / 真元 45",
        progress01: 0.25
      }),
      expect.objectContaining({
        slotIndex: 1,
        keyLabel: "K",
        label: "八卦剑阵",
        state: "qi_insufficient",
        detail: "真元不足 / 需要 35"
      }),
      expect.objectContaining({ slotIndex: 2, keyLabel: "L", label: "局内可顿悟获得", state: "empty" }),
      expect.objectContaining({ slotIndex: 3, keyLabel: "I", label: "局内可顿悟获得", state: "empty" })
    ]);
    expect(Object.isFrozen(hud.spellBars[0]?.slots)).toBe(true);

    expect(hud.pillBars.find((bar) => bar.playerId === "p1")?.slots).toEqual([
      expect.objectContaining({
        slotIndex: 0,
        keyLabel: "1",
        label: "回春丹",
        state: "digesting",
        detail: "炼化中 6s / 12s",
        digesting: { remainingTime: 6, totalTime: 12, progress01: 0.5 }
      }),
      expect.objectContaining({ slotIndex: 1, keyLabel: "2", label: "小破境丹", state: "ready" }),
      expect.objectContaining({ slotIndex: 2, keyLabel: "3", label: "空鼎", state: "empty" })
    ]);

    expect(hud.stage).toEqual(
      expect.objectContaining({
        stageName: "青云山·妖潮初临",
        segmentText: "妖潮压境 4 / 5",
        nextEventText: "Boss将临",
        intensity: "boss"
      })
    );
    expect(hud.boss).toEqual(
      expect.objectContaining({ visible: true, name: "青云劫灵", hpText: "2600 / 5200", phaseText: "2 / 3 phase_2_cloud_press" })
    );
    expect(hud.alerts).toEqual(
      expect.arrayContaining([
        expect.objectContaining({ semantic: "rescue", text: "P2 可救援：H", priority: "P1" }),
        expect.objectContaining({ semantic: "tribulation", text: "练气破筑基·局内三九雷劫 23.3s", priority: "P0" })
      ])
    );
    expect(hud.artifactRacks.find((rack) => rack.playerId === "p1")).toEqual(
      expect.objectContaining({
        outer: "青霜飞剑 ★★",
        inner: "紫阳葫芦 ★",
        treasures: ["剑阵", "八卦玉", "空", "空"]
      })
    );
  });
});

describe("Insight overlay presentation", () => {
  it("shows both coop players, public fortune, selected state, and guardian waiting without deciding rewards", () => {
    const viewState = createViewState();
    const before = structuredClone(viewState);

    const overlay = buildInsightOverlayPresentation(viewState);

    expect(viewState).toEqual(before);
    expect(Object.isFrozen(overlay)).toBe(true);
    expect(Object.isFrozen(overlay.panels)).toBe(true);
    expect(overlay).toEqual(
      expect.objectContaining({
        visible: true,
        mode: "coop",
        title: "顿悟",
        decisionsReadOnly: true,
        sharedFortune: {
          rerollCount: 2,
          label: "公共气运：2",
          hint: "重Roll 消耗团队气运"
        }
      })
    );
    expect(overlay.panels).toEqual([
      expect.objectContaining({
        playerId: "p1",
        title: "P1 顿悟",
        selected: true,
        guardianState: true,
        statusText: "已悟出大道，正在为道友护法……",
        options: [
          expect.objectContaining({
            optionId: "p1_choice_spell",
            keyLabel: "J",
            rewardTypeLabel: "法术升级",
            name: "五雷正法",
            rarity: "rare",
            disabled: false
          }),
          expect.objectContaining({
            optionId: "p1_choice_pill",
            keyLabel: "K",
            rewardTypeLabel: "丹药",
            name: "回春丹"
          })
        ]
      }),
      expect.objectContaining({
        playerId: "p2",
        title: "P2 顿悟",
        selected: false,
        guardianState: false,
        statusText: "等待选择",
        options: [
          expect.objectContaining({
            optionId: "p2_choice_cultivation",
            keyLabel: "Num1",
            rewardTypeLabel: "修为助益",
            name: "屏息凝神",
            note: "不会触发顿悟等级变化"
          })
        ]
      })
    ]);

    expect(overlay).not.toHaveProperty("chooseReward");
    expect(overlay).not.toHaveProperty("applyReward");
    expect(overlay).not.toHaveProperty("onChoose");
    expect(overlay.panels[0]?.options[0]).not.toHaveProperty("onSelect");
  });

  it("returns a hidden read-only overlay when no insight ViewState is visible", () => {
    const { insight: _insight, ...baseViewState } = createViewState();
    const viewState: InRunUiViewState = { ...baseViewState, mode: "combat" };

    const overlay = buildInsightOverlayPresentation(viewState);

    expect(overlay).toEqual({
      visible: false,
      mode: "single",
      title: "顿悟",
      sharedFortune: { rerollCount: 0, label: "公共气运：0", hint: "重Roll 消耗团队气运" },
      panels: [],
      decisionsReadOnly: true
    });
    expect(Object.isFrozen(overlay)).toBe(true);
  });
});

function createViewState(): InRunUiViewState {
  return {
    mode: "insight_paused",
    screen: {
      width: 1920,
      height: 1080,
      scale: 1,
      safeArea: { x: 0, y: 0, width: 1920, height: 1080 }
    },
    players: [
      {
        playerId: "p1",
        core: {
          playerId: "p1",
          displayName: "P1",
          colorToken: "player1",
          realmName: "练气",
          realmLayer: 9,
          hp: 35,
          maxHp: 100,
          qi: 30,
          maxQi: 100,
          aliveState: "body",
          activeStatusTags: [{ id: "status_low_qi", label: "真元不足", remainingTime: 0.5, severity: "warning" }],
          lowHp: true,
          canBeRescued: false
        },
        cultivation: {
          playerId: "p1",
          realmName: "练气",
          layer: 9,
          cultivation: 860,
          cultivationToNext: 860,
          progress01: 1,
          regenPerSecond: 1.6,
          bottleneck: {
            type: "major_realm",
            targetRealmName: "筑基",
            tribulationIncoming: true
          }
        },
        spells: [
          {
            slotIndex: 0,
            keyLabel: "J",
            spellId: "spell_five_thunder",
            name: "五雷正法",
            level: 2,
            costQi: 45,
            cooldownRemaining: 2,
            cooldownTotal: 8,
            state: "cooldown",
            element: "thunder"
          },
          {
            slotIndex: 1,
            keyLabel: "K",
            spellId: "spell_bagua_sword_ring",
            name: "八卦剑阵",
            costQi: 35,
            state: "qi_insufficient",
            element: "metal"
          },
          { slotIndex: 2, keyLabel: "L", state: "empty" },
          { slotIndex: 3, keyLabel: "I", state: "empty" }
        ],
        pills: [
          {
            slotIndex: 0,
            keyLabel: "1",
            pillId: "pill_rejuvenation",
            name: "回春丹",
            state: "digesting",
            remainingTime: 6,
            totalTime: 12,
            effectSummary: "持续回复生命"
          },
          {
            slotIndex: 1,
            keyLabel: "2",
            pillId: "pill_minor_breakthrough",
            name: "小破境丹",
            state: "ready",
            effectSummary: "小幅增加修为"
          },
          { slotIndex: 2, keyLabel: "3", state: "empty" }
        ],
        artifacts: {
          outer: { slotType: "outer", itemId: "artifact_qingshuang_sword", name: "青霜飞剑", star: 2, state: "active" },
          inner: { slotType: "inner", itemId: "artifact_ziyang_gourd", name: "紫阳葫芦", star: 1, state: "empowered" }
        },
        treasures: {
          slots: [
            { slotIndex: 0, source: "outer", itemId: "treasure_minor_sword_array", name: "剑阵", role: "offense", state: "active" },
            { slotIndex: 1, source: "outer", itemId: "treasure_bagua_jade", name: "八卦玉", role: "defense", state: "cooldown", cooldownRemaining: 3 },
            { slotIndex: 2, source: "inner", itemId: null, state: "empty" },
            { slotIndex: 3, source: "inner", itemId: null, state: "empty" }
          ]
        },
        buildSummary: {
          techniqueTags: ["metal"],
          talentTags: ["chain"],
          constitutionTags: ["root_qi"],
          synergyText: "金系连锁"
        }
      },
      {
        playerId: "p2",
        core: {
          playerId: "p2",
          displayName: "P2",
          colorToken: "player2",
          realmName: "练气",
          realmLayer: 2,
          hp: 0,
          maxHp: 100,
          qi: 70,
          maxQi: 100,
          aliveState: "soul",
          activeStatusTags: [],
          lowHp: true,
          canBeRescued: true,
          rescueProgress: 0.5
        },
        cultivation: {
          playerId: "p2",
          realmName: "练气",
          layer: 2,
          cultivation: 40,
          cultivationToNext: 190,
          progress01: 0.211,
          regenPerSecond: 1.6
        },
        spells: [
          { slotIndex: 0, keyLabel: "Num1", spellId: "spell_red_lotus_fire", name: "红莲业火", costQi: 30, state: "ready", element: "fire" },
          { slotIndex: 1, keyLabel: "Num2", state: "empty" },
          { slotIndex: 2, keyLabel: "Num5", state: "empty" },
          { slotIndex: 3, keyLabel: "Num6", state: "empty" }
        ],
        pills: [
          { slotIndex: 0, keyLabel: "7", pillId: "pill_clear_mind", name: "清心丹", state: "ready" },
          { slotIndex: 1, keyLabel: "8", state: "empty" },
          { slotIndex: 2, keyLabel: "9", state: "empty" }
        ],
        artifacts: {
          outer: { slotType: "outer", itemId: "artifact_xuanyue_seal", name: "玄月印", star: 1, state: "active" }
        },
        treasures: { slots: [] },
        buildSummary: { techniqueTags: [], talentTags: [], constitutionTags: [] }
      }
    ],
    teamInsight: {
      visible: true,
      teamLevel: 3,
      exp: 180,
      expToNext: 180,
      progress01: 1,
      nextTriggerText: "下一次顿悟",
      sharedFortuneReroll: 2,
      isReadyToInsight: true
    },
    stage: {
      stageName: "青云山·妖潮初临",
      segmentName: "妖潮压境",
      segmentIndex: 4,
      segmentCount: 5,
      timeRemaining: 69.333,
      nextEventText: "Boss将临",
      intensity: "boss"
    },
    boss: {
      visible: true,
      bossId: "boss_qingyun_tribulation_spirit",
      name: "青云劫灵",
      hp: 2600,
      maxHp: 5200,
      phaseIndex: 2,
      phaseCount: 3,
      phaseName: "phase_2_cloud_press"
    },
    tribulation: {
      active: true,
      playerId: "p1",
      tribulationName: "练气破筑基·局内三九雷劫",
      phase: "active",
      remainingTime: 23.333,
      warningText: "天象异变 · 三九雷劫",
      canClearThunder: false,
      targetRealmName: "筑基",
      lightningWarnings: []
    },
    rescue: {
      visible: true,
      downedPlayerId: "p2",
      rescuerPlayerId: "p1",
      canRescue: true,
      inRange: true,
      progress01: 0.5,
      hpCostPreviewPercent: 0.35,
      keyLabel: "H",
      decayActive: false
    },
    insight: {
      visible: true,
      mode: "coop",
      sharedFortuneReroll: 2,
      players: [
        {
          playerId: "p1",
          selected: true,
          guardianState: true,
          options: [
            {
              optionId: "p1_choice_spell",
              rewardType: "spell_upgrade",
              name: "五雷正法",
              rarity: "rare",
              shortDescription: "连锁次数 +1",
              buildSynergyTags: ["thunder", "chain"],
              keyLabel: "J"
            },
            {
              optionId: "p1_choice_pill",
              rewardType: "pill",
              name: "回春丹",
              rarity: "common",
              shortDescription: "获得回春丹 x1",
              buildSynergyTags: ["sustain"],
              keyLabel: "K"
            }
          ]
        },
        {
          playerId: "p2",
          selected: false,
          guardianState: false,
          options: [
            {
              optionId: "p2_choice_cultivation",
              rewardType: "cultivation_boost",
              name: "屏息凝神",
              rarity: "uncommon",
              shortDescription: "获得 +80 修为",
              buildSynergyTags: ["cultivation"],
              keyLabel: "Num1"
            }
          ]
        }
      ]
    },
    prompts: []
  };
}
