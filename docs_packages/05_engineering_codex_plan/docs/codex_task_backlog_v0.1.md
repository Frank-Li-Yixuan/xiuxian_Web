# 《Codex 任务拆分 v0.1》

每个任务都应独立提交，避免一次性大改。

---

## C001 — 仓库骨架

目标：创建 TypeScript + Vite + Vitest 项目结构。

范围：

```text
package.json
tsconfig.json
vite.config.ts
vitest.config.ts
AGENTS.md
src/ 空目录
tests/ 空目录
```

验收：

```text
npm run typecheck
npm test
```

---

## C002 — SeededRng

目标：实现确定性随机数。

范围：

```text
src/sim/core/SeededRng.ts
tests/unit/seeded-rng.test.ts
```

验收：

```text
同 seed 结果完全一致
不同 stream 相互独立
pickWeighted 稳定
不调用 Math.random
```

---

## C003 — FixedTickRunner

目标：实现固定 60 FPS 逻辑帧调度，不依赖渲染帧。

范围：

```text
src/sim/FixedTickRunner.ts
src/sim/SimConstants.ts
tests/unit/fixed-tick-runner.test.ts
```

验收：

```text
1 秒 = 60 tick
暂停/恢复正确
单步推进正确
```

---

## C004 — FrameInput 与 InputBuffer

目标：输入与模拟解耦。

范围：

```text
src/sim/input/FrameInput.ts
src/sim/input/InputBuffer.ts
src/sim/input/InputMapper.ts
tests/unit/input-buffer.test.ts
```

验收：

```text
down/pressed/released mask 正确
输入延迟帧可配置
缺帧可补默认输入
```

---

## C005 — ContentRegistry 与数据校验

目标：加载第一批 JSON 并校验引用。

范围：

```text
src/sim/content/ContentRegistry.ts
src/sim/content/DataValidator.ts
tools/validate-data.ts
tests/content/content-registry.test.ts
```

验收：

```text
所有数据 id 唯一
跨表引用存在
content hash 稳定
```

---

## C006 — EntityManager 与 StateHash

目标：实体管理与状态哈希。

范围：

```text
src/sim/entities/EntityManager.ts
src/sim/core/StateHash.ts
tests/unit/entity-manager.test.ts
tests/unit/state-hash.test.ts
```

验收：

```text
entityId 稳定递增
删除不影响排序稳定性
同状态 hash 一致
```

---

## C007 — PlayerSystem

目标：实现 P1/P2 移动、边界、专注模式预留。

范围：

```text
src/sim/entities/PlayerEntity.ts
src/sim/systems/PlayerSystem.ts
tests/unit/player-system.test.ts
```

验收：

```text
移动归一化
边界限制
固定帧下位置确定
不读取 DOM keys
```

---

## C008 — ArtifactSystem 自动普攻

目标：实现三种本命法宝。

范围：

```text
src/sim/systems/ArtifactSystem.ts
src/sim/systems/ProjectileSystem.ts
src/sim/entities/ProjectileEntity.ts
tests/unit/artifact-system.test.ts
```

验收：

```text
青霜飞剑/紫阳葫芦/玄岳重印都能按 frame 自动发射
输出数量和数据表一致
```

---

## C009 — Enemy + WaveSpawner

目标：第一大阶段 1-1 到 1-4 怪潮。

范围：

```text
src/sim/systems/StageSystem.ts
src/sim/systems/WaveSpawnerSystem.ts
src/sim/systems/EnemySystem.ts
tests/integration/stage01-waves.test.ts
```

验收：

```text
固定 seed 下生成顺序一致
小阶段时长正确
敌人数量符合预算
```

---

## C010 — Collision + Damage

目标：实现基础碰撞与伤害队列。

范围：

```text
src/sim/systems/CollisionSystem.ts
src/sim/systems/DamageSystem.ts
tests/unit/collision-system.test.ts
```

验收：

```text
玩家弹打敌人
敌弹打玩家
伤害通过队列 flush
不在遍历中直接删除实体
```

---

## C011 — SpellSystem

目标：实现 4 个主动法术。

范围：

```text
src/sim/systems/SpellSystem.ts
tests/unit/spell-system.test.ts
```

验收：

```text
真元消耗
冷却帧
五雷连锁
八卦清弹
红莲领域
袖里乾坤吸弹反击
```

---

## C012 — PillDigestionSystem

目标：实现 3+1 丹药。

范围：

```text
src/sim/systems/PillDigestionSystem.ts
tests/unit/pill-digestion-system.test.ts
```

验收：

```text
回春丹持续回血
燃血丹 buff + 虚弱
清心丹解控
小破境丹增加修为但不增加灵气经验
```

---

## C013 — Drop/Pickup/TeamInsight

目标：实现灵气经验与拾取。

范围：

```text
src/sim/systems/DropSystem.ts
src/sim/systems/PickupSystem.ts
src/sim/systems/TeamInsightSystem.ts
tests/integration/insight-exp.test.ts
```

验收：

```text
灵气经验团队共享
经验满触发 InsightSession
不改变 PlayerCultivationState
```

---

## C014 — Cultivation + Tribulation

目标：实现个人修为与局内雷劫 Debug。

范围：

```text
src/sim/systems/CultivationSystem.ts
src/sim/systems/TribulationSystem.ts
tests/integration/tribulation.test.ts
```

验收：

```text
修为个人独立
小层突破加基础属性
大境界瓶颈触发雷劫
雷劫成功全屏清场 + 回满 + 突破
```

---

## C015 — Insight RewardGenerator

目标：实现双人三选一、重 Roll、护法等待。

范围：

```text
src/sim/systems/RewardGenerator.ts
src/sim/systems/TeamInsightSystem.ts
tests/integration/insight-session.test.ts
```

验收：

```text
P1/P2 选项按固定顺序生成
公共气运重 Roll 消耗正确
双方都确认后恢复战斗
```

---

## C016 — ViewStateBuilder

目标：生成 UI/Renderer 只读状态。

范围：

```text
src/sim/view/ViewStateBuilder.ts
src/sim/view/InRunViewState.ts
tests/unit/view-state-builder.test.ts
```

验收：

```text
灵气经验、修为、真元、丹药消化状态都映射正确
UI 不读取 SimState 内部对象引用
```

---

## C017 — CanvasRenderer

目标：可视化第一阶段基础战斗。

范围：

```text
src/render/canvas/**
src/app/BrowserGameApp.ts
```

验收：

```text
浏览器中 P1/P2 可见
敌人/弹幕/掉落可见
关闭粒子不影响 hash
```

---

## C018 — HUD + InsightOverlay

目标：实现局内 UI。

范围：

```text
src/ui/HudPresenter.ts
src/ui/InsightOverlayPresenter.ts
```

验收：

```text
灵气经验和修为明显区分
法术冷却/真元不足可读
丹药炼化进度可读
双人顿悟明牌
```

---

## C019 — Boss 青云劫灵

目标：实现第一 Boss 三阶段。

范围：

```text
src/sim/systems/BossSystem.ts
src/render/canvas/BossRenderer.ts
tests/integration/boss-qingyun.test.ts
```

验收：

```text
三阶段转化
弹幕时间轴稳定
Boss 死亡掉落和结算事件
```

---

## C020 — Soul/Rescue/Settlement

目标：实现死亡、神魂、精血渡魂、结算。

范围：

```text
src/sim/systems/RescueSystem.ts
src/sim/systems/RunSettlementSystem.ts
tests/integration/rescue-settlement.test.ts
```

验收：

```text
倒地进入 soul
队友靠近长按救援
救援消耗精血
全员无法继续时结算
```

---

## C021 — Determinism Harness

目标：同 seed 同输入重复运行完全一致。

范围：

```text
src/debug/DeterminismHarness.ts
tests/determinism/stage01-determinism.test.ts
```

验收：

```text
10,000 帧 hash 一致
stage01 smoke 一致
粒子开关不影响 hash
```

---

## C022 — Two-client Lockstep Mock

目标：本机模拟在线联机。

范围：

```text
src/net/LockstepInputTransport.ts
src/net/DesyncDetector.ts
tests/determinism/two-client-lockstep.test.ts
```

验收：

```text
100ms RTT / 2% 丢包模拟下 hash 一致
顿悟、雷劫、救援一致
```

---

## C023 — WebSocket Relay Prototype

目标：两台浏览器输入同步。

范围：

```text
src/net/RelayClient.ts
server/relay.ts
```

验收：

```text
创建房间
加入房间
交换输入帧
hash report
基础重连
```

---

## C024 — Balance Telemetry

目标：第一版可玩性调参。

范围：

```text
src/debug/BalanceTelemetry.ts
src/render/canvas/DebugOverlayRenderer.ts
```

验收：

```text
显示 FPS、实体峰值、DPS、受击次数、法术释放次数、Boss 时长
```

---

## C025 — First Playable Gate

目标：把所有模块接成第一版可玩 Demo。

验收：

```text
P1/P2 完整跑完第一大阶段
3 次顿悟
至少 1 次丹药有效使用
至少 1 次救援可完成
Boss 可击杀
结算可显示
```
