# 《工程架构与 Codex 实施计划 v0.1》

版本：v0.1  
目标：把现有 GDD、垂直切片、核心数值、UI/UX、联机同步设计，转化为可执行的工程架构和 Codex 开发路线。

---

## 0. 文档定位

本文件不是新玩法设定，而是工程实施蓝图。它回答以下问题：

1. 项目应该采用什么代码结构？
2. 哪些模块先做，哪些模块后做？
3. Gemini Canvas Demo 哪些可以参考，哪些必须重写？
4. Codex 每次应该接什么粒度的任务？
5. 如何保证第一版既可玩，又不在后续联机和数据驱动上返工？

v0.1 的目标不是“完整游戏”，而是做出一个结构正确、可扩展、可测试、能跑通第一大阶段的工程底座。

---

## 1. 工程决策摘要

### 1.1 第一阶段技术路线

推荐技术栈：

```text
TypeScript strict
Vite
Canvas 2D
Vitest
Node-based headless simulation tests
WebSocket relay prototype later
```

v0.1 不建议第一步引入大型渲染引擎。原因：

- 当前卖点不是复杂贴图，而是代码绘制的发光、粒子、弹幕、震屏。
- 不依赖外部资源是项目特色。
- Canvas 2D 已足够承载第一阶段垂直切片。
- 先保证 Simulation 确定性，再追求渲染复杂度。

### 1.2 非协商规则

```text
先 Headless Simulation，再 Canvas Playable。
先单机确定性，再本地双人，再在线同步。
先数据契约，再内容接入。
先测试第一大阶段，再扩展 10 大阶段。
```

### 1.3 第一版工程核心目标

第一版必须完成：

```text
第一大阶段 1-1 到 1-5
双人本地输入
自动普攻
4 法术主动释放
3 丹药主动吞服 + 消化
1 外 + 1 内本命法宝
2 外 + 2 内灵宝
灵气经验/顿悟
个人修为/局内雷劫 Debug
Boss 青云劫灵
神魂出窍 + 精血渡魂
基础结算
Headless determinism test
```

---

## 2. 推荐工程目录

```text
xiuxian-stg/
  AGENTS.md
  package.json
  tsconfig.json
  vite.config.ts
  vitest.config.ts

  public/
    index.html

  data/
    stages/
    enemies/
    bosses/
    artifacts/
    treasures/
    spells/
    pills/
    rewards/
    progression/
    events/
    balance/
    ui/
    netcode/

  src/
    app/
      BrowserGameApp.ts
      DevBootstrap.ts

    sim/
      CombatSimulation.ts
      FixedTickRunner.ts
      SimState.ts
      SimConstants.ts

      core/
        Vec2.ts
        FixedMath.ts
        SeededRng.ts
        StableSort.ts
        IdGenerator.ts
        StateHash.ts
        ObjectPool.ts
        EventQueue.ts

      content/
        ContentRegistry.ts
        ContentLoader.ts
        DataValidator.ts
        ContentHash.ts

      input/
        InputMapper.ts
        InputBuffer.ts
        FrameInput.ts
        LocalKeyboardSource.ts

      entities/
        Entity.ts
        EntityManager.ts
        PlayerEntity.ts
        EnemyEntity.ts
        ProjectileEntity.ts
        PickupEntity.ts
        BossEntity.ts

      systems/
        PlayerSystem.ts
        ArtifactSystem.ts
        SpiritTreasureSystem.ts
        SpellSystem.ts
        PillDigestionSystem.ts
        EnemySystem.ts
        ProjectileSystem.ts
        CollisionSystem.ts
        DamageSystem.ts
        DropSystem.ts
        PickupSystem.ts
        TeamInsightSystem.ts
        CultivationSystem.ts
        TribulationSystem.ts
        RescueSystem.ts
        BossSystem.ts
        StageSystem.ts
        WaveSpawnerSystem.ts

      view/
        ViewStateBuilder.ts
        InRunViewState.ts

    render/
      canvas/
        CanvasRenderer.ts
        BackgroundRenderer.ts
        EntityRenderer.ts
        ProjectileRenderer.ts
        EffectsRenderer.ts
        UiCanvasRenderer.ts
        DebugOverlayRenderer.ts

    ui/
      HudPresenter.ts
      InsightOverlayPresenter.ts
      PauseMenuPresenter.ts
      UiInputController.ts

    net/
      NetSession.ts
      RelayClient.ts
      LockstepInputTransport.ts
      SnapshotManager.ts
      DesyncDetector.ts
      ReconnectManager.ts

    debug/
      DebugRunConfig.ts
      DebugConsole.ts
      DeterminismHarness.ts
      BalanceTelemetry.ts

    types/
      combat-data.ts
      balance-types.ts
      ui-types.ts
      netcode-types.ts

  tests/
    unit/
    determinism/
    content/
    integration/
    perf/

  tools/
    validate-data.ts
    content-hash.ts
    sim-runner.ts
    replay-runner.ts
    grep-forbidden.ts

  docs/
    architecture/
    design/
    implementation/
```

---

## 3. 分层架构

### 3.1 层级图

```text
Browser / Electron Shell
        ↓
Input Sources / Network Transport
        ↓
FrameInputBuffer
        ↓
FixedTickRunner 60 FPS
        ↓
CombatSimulation
        ↓
Sim Systems + ContentRegistry + SeededRng
        ↓
ViewStateBuilder
        ↓
CanvasRenderer + DOM/HUD Presenter
```

### 3.2 核心边界

| 层 | 可以访问 | 禁止访问 |
|---|---|---|
| `sim/` | 数据表、输入帧、RNG、固定帧 | DOM、Canvas、真实时间、声音、浏览器事件、`Math.random()` |
| `render/` | ViewState、视觉 RNG | 修改 SimState、生成 gameplay 结果 |
| `ui/` | ViewState、UI 输入 | 直接改玩家血量/真元/奖励 |
| `input/` | DOM 键盘、手柄 | 直接操作玩家实体 |
| `net/` | FrameInput、SyncEvent、Snapshot | 直接生成怪物/掉落/奖励 |
| `content/` | JSON、schema、hash | 运行时随意补默认值 |
| `debug/` | 开发命令、telemetry | 进入正式 gameplay hash |

---

## 4. 数据流

### 4.1 开局数据流

```text
DebugRunConfig / PlayerLoadout
        ↓
ContentRegistry.loadAll()
        ↓
ContentHash.verify()
        ↓
CombatSimulation.create(seed, content, loadouts)
        ↓
FixedTickRunner.start()
```

### 4.2 每帧数据流

```text
Keyboard / Gamepad / Network
        ↓
FrameInput
        ↓
InputBuffer
        ↓
Simulation.tick(frameInputPair)
        ↓
Systems update in deterministic order
        ↓
StateHash every N frames
        ↓
ViewStateBuilder
        ↓
CanvasRenderer / UI Presenter
```

### 4.3 系统更新顺序

v0.1 推荐固定顺序：

```text
1. ApplyFrameInput
2. StageSystem
3. WaveSpawnerSystem
4. PlayerSystem
5. ArtifactSystem
6. SpiritTreasureSystem
7. SpellSystem
8. PillDigestionSystem
9. EnemySystem
10. BossSystem
11. ProjectileSystem
12. TribulationSystem
13. CollisionSystem
14. DamageSystem.flush
15. DropSystem.flush
16. PickupSystem
17. TeamInsightSystem
18. CultivationSystem
19. RescueSystem
20. EventQueue.flush
21. StateHash optional
```

任何系统不能依赖 JS 对象遍历的非稳定顺序。实体数组应按 `entityId` 或 `spawnFrame + serial` 稳定排序。

---

## 5. 现有 Gemini Demo 迁移策略

### 5.1 可以借鉴

```text
Canvas 发光风格
玩家/敌人/Boss 的轮廓绘制思路
Boss 血条与警告 overlay
爆炸粒子、浮字、震屏
双人本地输入概念
实体数组 update/draw 的直观节奏
```

### 5.2 必须重写

```text
单 HTML 全局变量结构
DOM/UI/Gameplay 混写
直接读取 keys 对象推进玩家逻辑
直接 Math.random() 决定玩法结果
浮点 dt 决定冷却与 Boss 时间轴
按键射击逻辑，正式版应为本命法宝自动普攻
外部 CDN 样式和字体依赖
```

### 5.3 迁移方式

不要把 Demo 直接搬进 `src/`。推荐：

```text
1. 先把 Demo 作为 visual reference 存入 docs/reference，不进入构建。
2. 从零实现 CombatSimulation。
3. 再把 Demo 的绘制样式逐段翻译到 CanvasRenderer。
4. 每翻译一个视觉效果，都确认不影响 StateHash。
```

---

## 6. 模块实施顺序

### Phase 0：仓库与文档接入

目标：让 Codex 有清楚上下文。

交付：

```text
package.json
AGENTS.md
tsconfig/vite/vitest
src/ 基础目录
data/ 第一批 JSON
README
```

验收：

```text
npm run typecheck 可运行
npm test 可运行
npm run validate:data 可运行
```

### Phase 1：Headless Simulation 地基

目标：无 Canvas 也能跑 60 FPS 模拟。

交付：

```text
FixedTickRunner
SeededRng
SimState
EntityManager
FrameInput
StateHash
ContentRegistry
```

验收：

```text
同 seed + 同 input 跑 10,000 帧，hash 完全一致。
Gameplay 代码中没有裸 Math.random。
```

### Phase 2：玩家、本命法宝、投射物

交付：

```text
PlayerSystem
ArtifactSystem
ProjectileSystem
青霜飞剑/紫阳葫芦/玄岳重印
自动普攻
碰撞基础
```

验收：

```text
P1/P2 能移动。
本命法宝自动发射。
Headless 中可统计 DPS。
```

### Phase 3：敌人、波次、第一小阶段

交付：

```text
StageSystem
WaveSpawnerSystem
EnemySystem
山魈/狼妖/邪修残影/石甲妖
stage_01_qingyun 1-1 到 1-4
```

验收：

```text
Headless 跑完 1-4。
每个小阶段敌人数量与预算一致。
实体峰值不爆。
```

### Phase 4：法术、丹药、掉落、灵气经验

交付：

```text
SpellSystem
PillDigestionSystem
DropSystem
PickupSystem
TeamInsightSystem
五雷正法/八卦剑阵/红莲业火/袖里乾坤
回春丹/燃血丹/清心丹/小破境丹
```

验收：

```text
真元消耗正确。
丹药按 frame 消化。
灵气经验只触发顿悟，不触发境界。
```

### Phase 5：修为、雷劫、顿悟 Overlay 数据

交付：

```text
CultivationSystem
TribulationSystem
InsightSession
RewardGenerator
公共气运重 Roll
```

验收：

```text
顿悟和修为完全分离。
Debug 可强制触发局内三九雷劫。
雷劫落点由 tribulationRng 决定。
```

### Phase 6：Canvas Playable

交付：

```text
CanvasRenderer
BackgroundRenderer
EntityRenderer
ProjectileRenderer
EffectsRenderer
HudPresenter
InsightOverlayPresenter
```

验收：

```text
1920×1080 可玩。
UI 明确区分灵气经验/修为/真元/丹药。
特效不遮挡判定点。
```

### Phase 7：Boss、救援、结算

交付：

```text
BossSystem
青云劫灵三阶段
RescueSystem
SoulState
RunSettlement
```

验收：

```text
第一大阶段完整通关。
倒地后可精血渡魂。
Boss 死亡后结算。
```

### Phase 8：联机同步 Harness

交付：

```text
LockstepInputTransport mock
TwoClientDeterminismHarness
SnapshotManager
DesyncDetector
```

验收：

```text
同机模拟两个客户端跑完整第一大阶段，hash 无差异。
100ms RTT / 2% packet loss 模拟下可恢复输入。
```

### Phase 9：WebSocket Relay Prototype

交付：

```text
RelayClient
Room handshake
input frame exchange
hash report
basic reconnect
```

验收：

```text
两台浏览器可进入同一房间。
能跑完第一大阶段。
短线重连可恢复一次。
```

---

## 7. Codex 工作模式

### 7.1 推荐方式

每次给 Codex 一个小任务，限制修改范围和验收标准。

示例：

```text
请只实现 src/sim/core/SeededRng.ts 和 tests/unit/seeded-rng.test.ts。
不要修改渲染、UI、数据文件。
验收：同 seed 序列一致；不同 stream 序列不同；pickWeighted 稳定。
```

### 7.2 不推荐方式

不要这样给任务：

```text
帮我把游戏做出来。
把所有系统都实现。
顺便优化架构。
```

这会导致 Codex 同时修改太多模块，难以审查，也容易破坏确定性。

### 7.3 并行任务策略

可以并行的任务：

```text
数据表 schema
Canvas 视觉 renderer
Headless unit tests
UI ViewState 类型
文档整理
```

不建议并行的任务：

```text
两个代理同时改 CombatSimulation
两个代理同时改 EntityManager
两个代理同时改 RewardGenerator
两个代理同时改 StateHash
```

---

## 8. 质量闸门

### 8.1 每次 PR 必须过

```bash
npm run typecheck
npm run lint
npm test
npm run validate:data
npm run check:forbidden
```

### 8.2 Gameplay PR 额外必须过

```bash
npm run test:determinism
npm run test:headless:stage01
```

### 8.3 Netcode PR 额外必须过

```bash
npm run test:net:two-client
npm run test:net:desync-repair
```

### 8.4 UI/Render PR 额外检查

```text
不得修改 SimState。
不得修改 StateHash。
不得把 visual RNG 接入 gameplay RNG。
不得把 UI 动画状态写回模拟层。
```

---

## 9. 第一版可玩目标

第一版可玩 Demo 的定义：

```text
P1/P2 进入第一大阶段
局外配置可从 debug_run_config 读取
P1/P2 自动普攻
J/K/L/I 释放法术
1/2/3 吃丹药
怪物按 1-1 到 1-4 刷新
灵气经验触发 3 次顿悟
修为独立增长，Debug 可触发雷劫
1-5 Boss 入场并三阶段攻击
一名玩家死亡后神魂出窍
另一名玩家可精血渡魂复活
Boss 死亡后结算材料
```

如果上述没有全部完成，就不进入“扩展第二大阶段”。

---

## 10. 主要风险与规避

| 风险 | 表现 | 规避 |
|---|---|---|
| 过早做在线 | 同步问题掩盖基础 gameplay 问题 | 先 Headless + 本地双人 + two-client harness |
| 不确定性污染 | 两端 hash 不一致 | 禁止 Math.random，固定帧，稳定排序，分层 RNG |
| UI 信息过载 | 玩家分不清经验/修为/真元 | UI 文档先落地，ViewState 明确语义 |
| 代码回到 Demo 风格 | 全局变量、DOM 混写 | 模块边界 + AGENTS.md + forbidden grep |
| 内容扩张过快 | 一堆法宝但核心不好玩 | 只做 3 法宝/4 法术/4 灵宝/4 丹药，先调手感 |
| Boss 过短/过长 | 第一版可玩性差 | 核心数值模型 + telemetry |
| 双人救援无价值 | 倒地后无互动或救援太安全 | 精血消耗 + 丹药联动 + 高压窗口 |

---

## 11. 推荐下一步执行

马上给 Codex 的第一条任务不应该是“做战斗”，而是：

```text
创建仓库骨架，接入 AGENTS.md、TypeScript strict、Vitest、Vite、目录结构、空的 FixedTickRunner/SeededRng/ContentRegistry，并补基础测试。
```

完成后第二条任务再实现 `SeededRng` 和 `StateHash`。  
这两个模块完成前，不要写敌人、法术、Boss。
