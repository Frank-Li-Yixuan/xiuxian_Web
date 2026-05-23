# 《Codex Execution Order v0.1》

本文件将前序工程计划压缩成 First Playable 的可执行顺序。每个任务应该单独提交，禁止一次性让 Codex 写完整游戏。

---

## 0. Codex 工作总约束

每个 Codex 任务都必须遵守：

```text
1. 先读 AGENTS.md。
2. 修改范围只限当前任务指定模块。
3. 完成后运行对应测试。
4. 不在 src/sim/** 中使用 Math.random、Date.now、DOM、Canvas、Audio。
5. 不新增外部 CDN、字体、图片、音频依赖。
6. 新增 gameplay 行为必须能被 headless test 覆盖。
7. 新增 JSON 必须通过 validate:data。
```

---

## 1. 第一执行串：工程地基

### FP-C001：Repository Scaffold

目标：搭出 Vite + TypeScript + Vitest + 数据目录 + AGENTS.md。

验收：

```bash
npm install
npm run typecheck
npm test
npm run validate:data
```

### FP-C002：Seeded RNG

目标：实现 gameplay/stage/drop/reward/boss/tribulation/visual 分层 RNG。

验收：

- 同 seed 序列稳定。
- 不同 stream 互不影响。
- visualRng 不进入 gameplay hash。

### FP-C003：Fixed Tick + FrameInput

目标：实现 60 FPS 固定逻辑帧和输入缓冲。

验收：

- Headless 可推进 N frame。
- 输入不直接读 DOM。
- spell/pill/interact/focus 都有 bitmask。

### FP-C004：ContentRegistry

目标：加载和校验第一批 JSON。

验收：

- 所有内容 ID 唯一。
- Stage 引用的 enemy/boss/reward 存在。
- Loadout 引用的 artifact/spell/pill 存在。

---

## 2. 第二执行串：Headless Combat

### FP-C005：EntityManager + SimState + StateHash

目标：建立实体存储、序列化、hash。

验收：

- hash 不包含 VFX/UI。
- 同 seed 同输入 hash 一致。

### FP-C006：PlayerSystem + ArtifactSystem

目标：玩家移动、生命/真元、自动普攻、本命法宝。

验收：

- 青霜飞剑可自动射击。
- 紫阳葫芦/玄岳重印可在 headless 中产生不同 projectile pattern。

### FP-C007：EnemySystem + WaveSpawner

目标：1-1 到 1-4 敌人波次。

验收：

- 按 stage_01_qingyun 数据刷新。
- 山魈/狼妖/邪修残影/石甲妖行为不同。

### FP-C008：Collision + Damage + Drop

目标：碰撞、伤害、掉落。

验收：

- 玩家弹能击杀敌人。
- 敌弹/接触能伤害玩家。
- 掉落来自 drop table 和 dropRng。

---

## 3. 第三执行串：Build 与双轨成长

### FP-C009：SpellSystem

目标：五雷正法、八卦剑阵、红莲业火、袖里乾坤。

验收：

- 真元不足不能释放。
- 冷却以 frame 表示。
- 法术效果可在 headless 中验证。

### FP-C010：PillDigestionSystem

目标：回春丹、燃血丹、清心丹、小破境丹。

验收：

- 丹药持续生效。
- 燃血丹后遗症生效。
- 小破境丹只增加修为，不增加灵气经验。

### FP-C011：TeamInsight + InsightSession

目标：团队灵气经验、顿悟三选一、重 Roll。

验收：

- 灵气满触发 insight_pause。
- P1/P2 各自三选一。
- 公共气运重 Roll 消耗正确。

### FP-C012：Cultivation + Tribulation Debug

目标：个人修为、小层突破、Debug 雷劫。

验收：

- 修为独立增长。
- 修为满不触发顿悟。
- Debug 雷劫能叠加到当前战斗。

---

## 4. 第四执行串：Canvas + UI + VFX

### FP-C013：ViewStateBuilder

目标：将 SimState 转成 UI/ViewState。

验收：

- UI 不直接读 SimState。
- 灵气经验、修为、真元、丹药四者分离显示。

### FP-C014：CanvasRenderer + RenderLayerStack

目标：基础渲染与层级。

验收：

- 玩家、敌人、敌弹、法术、掉落、Boss 均可见。
- 敌弹层高于大部分玩家法术层。

### FP-C015：HUD + InsightOverlay

目标：左右 UI、顿悟界面、Boss UI、雷劫 UI。

验收：

- 双轨成长不混淆。
- 顿悟明牌双人界面可用。

### FP-C016：VFX Pipeline

目标：EffectEventQueue、ParticlePool、ScreenShake、ReadabilityGuard。

验收：

- Simulation 只发 EffectEvent。
- 粒子不影响 hash。
- 自机判定点永远可见。

---

## 5. 第五执行串：Boss、救援、结算、局外

### FP-C017：Boss 青云劫灵

目标：Boss 入场、三阶段、死亡掉落。

验收：

- Boss 战 90–130 秒目标可调。
- Phase 切换、血条、死亡结算正常。

### FP-C018：Soul/Rescue/RunSettlement

目标：神魂出窍、精血渡魂、结算 Receipt。

验收：

- 倒地不直接游戏结束。
- 救援消耗生命。
- 战死/通关均生成 Receipt。

### FP-C019：Outgame Profile + Modules

目标：资源钱包、聚灵阵、藏经阁、炼丹房、炼器阁。

验收：

- Receipt 可应用到 Profile。
- 可炼丹、升星、修功/研法。

### FP-C020：Loadout Builder + Second Run

目标：从强化后的 Profile 生成第二局 RunConfig。

验收：

- 第二局开局可见强化结果。
- 自动化测试覆盖完整闭环。

---

## 6. 第六执行串：验证与 RC

### FP-C021：End-to-end Integration Test

目标：默认存档 → 第一局 → 洞府强化 → 第二局。

### FP-C022：Two-client Determinism Harness

目标：同输入双模拟 10 分钟 hash 一致。

### FP-C023：Balance Telemetry

目标：记录 TTK、法术频率、顿悟次数、Boss 时长。

### FP-C024：First Playable RC

目标：修阻塞 Bug，冻结 v0.1 范围，打包内部试玩版。
