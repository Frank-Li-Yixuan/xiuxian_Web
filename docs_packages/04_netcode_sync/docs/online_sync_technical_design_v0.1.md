# 《联机同步技术设计 v0.1》

项目：双人雷霆战机修仙版  
版本：v0.1  
目标：为 PC 端宽屏垂直卷轴 STG + Roguelike + 修仙养成项目建立在线双人合作的技术地基。

---

## 0. 文档定位

本文件不是网络协议白皮书，也不是最终线上运维方案。它的目标是让 Codex 能够据此搭建第一版在线双人同步骨架，并且不破坏后续扩展：

- 当前 v0.1 先保证 **两人在线合作跑通第一大阶段**。
- 同步模型优先服务 **STG 弹幕、怪潮、Boss、顿悟、雷劫、救援**。
- 网络架构必须从一开始避免“每颗子弹状态同步”的死路。
- 所有影响玩法的随机、时间、碰撞、奖励、掉落、雷劫都必须可复现。

当前 Gemini Demo 有很好的本地双人、Canvas 特效、Boss、敌弹和掉落雏形，但它仍是单文件、全局状态、直接 DOM 键盘读取、`Math.random()` 到处调用的 Demo 结构。正式版应参考其效果，不继承其同步结构。

---

## 1. 联机目标与非目标

### 1.1 v0.1 必须做到

1. 两名玩家可以加入同一个房间。
2. 双方使用同一份 RunConfig、数据包版本和随机种子。
3. 双方在本地各自模拟完整战斗世界。
4. 网络只传输输入帧、房间事件和少量校验信息。
5. 战斗过程中不同步每颗子弹、每个敌人、每个掉落物的位置。
6. 双人顿悟全局时停，双方明牌选择，公共气运重 Roll 一致。
7. 某一名玩家触发局内修为雷劫时，雷劫作为全场环境事件一致发生。
8. 精血渡魂救援进度、丹药消化、法术冷却、Boss 阶段全部一致。
9. 每隔固定帧进行状态哈希校验。
10. 发现不同步时能提示、记录、并通过 Host 快照修正。

### 1.2 v0.1 暂不做

- 匹配系统。
- 排位、竞技、公平反作弊。
- 四人联机。
- 真正的服务器权威模拟。
- 复杂 Rollback 预测。
- 中途加入正在战斗的房间。
- Host 迁移。
- 跨平台主机版联机。
- Steam Lobby / EOS / Photon 集成。

但数据结构要为这些系统预留扩展位。

---

## 2. 总体架构选择

### 2.1 推荐方案：确定性帧同步 + 轻量中继服务器

v0.1 推荐架构：

```text
Client A ─┐
          │  WebSocket Relay Server
Client B ─┘

两端客户端都运行完整 Combat Simulation。
服务器只负责：
- 房间创建/加入
- 版本校验
- 转发输入帧
- 分配 UI 决策顺序号
- 保持连接心跳
- 可选保存 Host 快照摘要
```

服务器不负责：

```text
- 计算子弹位置
- 计算敌人 AI
- 计算掉落
- 计算奖励池
- 判断碰撞
- 判定 Boss 死亡
```

这些全部由两端客户端本地确定性模拟。

---

### 2.2 为什么不做全量状态同步

STG 的同屏实体会非常多：

```text
玩家 2
玩家弹幕 200–800
敌人 30–80
敌弹 200–1200
掉落物 50–300
粒子 500+
```

如果每帧同步所有实体：

```text
实体数量 × 位置/速度/状态 × 60 FPS
```

带宽、延迟、序列化成本都会被拖垮，而且非常不利于“满屏弹幕 + 连锁爆炸”的爽感。

因此 v0.1 的原则是：

> 同步“输入”和“种子”，不同步“结果”。

只要所有客户端的输入序列、随机数序列、数据表、模拟逻辑完全一致，结果就应完全一致。

---

## 3. 同步模式

### 3.1 Fixed Tick

战斗模拟必须使用固定逻辑帧。

```ts
const SIM_FPS = 60;
const FRAME_MS = 1000 / SIM_FPS;
```

规则：

- 所有玩法时间用 `frame` 计数。
- 冷却不用秒数浮点，而用 `cooldownFrames`。
- 丹药消化不用 `remainingTime: number`，而用 `remainingFrames`。
- Boss 攻击时间线不用 `at: 12.5s`，而用 `atFrame: 750`。
- 雷劫持续时间不用 `24s`，而用 `1440 frames`。
- UI 可以显示秒数，但 gameplay state 不以秒为准。

### 3.2 渲染与模拟分离

```text
Simulation: 固定 60 Hz
Rendering: 跟随显示器刷新率，可插值
Network: 按输入批次发送，不必每帧单包
```

渲染层不能改变 gameplay state。

### 3.3 逻辑分辨率固定

所有 gameplay 坐标基于固定逻辑分辨率，不基于真实窗口尺寸。

```ts
LOGICAL_WIDTH = 1920;
LOGICAL_HEIGHT = 1080;
COMBAT_RECT = { x: 360, y: 0, width: 1080, height: 1080 };
```

真实 canvas 缩放只影响渲染，不影响碰撞、索敌、落雷位置和掉落吸附。

---

## 4. 输入同步模型

### 4.1 输入延迟

v0.1 使用输入延迟缓冲，降低远端抖动导致的卡顿。

推荐默认：

```ts
inputDelayFrames = 4; // 约 66.7ms
```

根据 RTT 动态调整：

| RTT | 推荐 inputDelayFrames |
|---:|---:|
| 0–50ms | 3 |
| 50–90ms | 4 |
| 90–140ms | 5–6 |
| 140–200ms | 7–9 |
| >200ms | 可玩性下降，提示网络不佳 |

本地玩家在真实时间第 `F` 帧按键时，不是立即作用于 `F`，而是提交到：

```ts
targetFrame = currentSimFrame + inputDelayFrames;
```

双方都在同一目标帧应用输入。

---

### 4.2 FrameInput

```ts
export interface FrameInput {
  frame: number;
  playerId: PlayerId;

  moveX: -1 | 0 | 1;
  moveY: -1 | 0 | 1;

  downMask: InputButtonMask;
  pressedMask: InputButtonMask;
  releasedMask: InputButtonMask;

  inputSeq: number;
}
```

建议使用 bitmask 表示按钮：

```ts
export const enum InputButtonBit {
  Spell1 = 1 << 0,
  Spell2 = 1 << 1,
  Spell3 = 1 << 2,
  Spell4 = 1 << 3,
  Pill1 = 1 << 4,
  Pill2 = 1 << 5,
  Pill3 = 1 << 6,
  Interact = 1 << 7,
  Focus = 1 << 8,
  Confirm = 1 << 9,
  Cancel = 1 << 10
}
```

解释：

- `downMask`：这一帧持续按住的按钮。
- `pressedMask`：这一帧刚按下的按钮。
- `releasedMask`：这一帧刚松开的按钮。

这样以后可以支持蓄力法术：

```text
pressed = 开始蓄力
hold/down = 持续消耗真元
released = 释放
```

### 4.3 输入批次消息

v0.1 不需要每帧发一个包，建议批量发送。

```ts
export interface InputBatchMessage {
  type: "input_batch";
  roomId: string;
  senderId: PlayerId;
  seq: number;

  baseFrame: number;
  inputs: EncodedFrameInput[];

  ackFrame: number;
  lastKnownStateHash?: StateHashReport;

  sentAtClientMs: number;
}
```

推荐每 2–3 帧发送一次输入批次。

---

## 5. 房间协议

### 5.1 房间流程

```text
1. Host 创建房间
2. Guest 加入房间
3. 双方交换 clientInfo
4. 校验游戏版本与数据包 hash
5. 双方提交局外 Loadout
6. Host 生成 runId 与 seed
7. Relay Server 广播 run_start
8. 双方加载阶段与资源
9. 双方发送 ready
10. Relay Server 广播 countdown_start
11. 第 startFrame 开始帧同步
```

### 5.2 房间状态机

```ts
export type RoomPhase =
  | "lobby"
  | "loadout_commit"
  | "loading"
  | "countdown"
  | "in_run"
  | "insight_pause"
  | "network_waiting"
  | "finished"
  | "aborted";
```

### 5.3 版本校验

进入房间前必须校验：

```ts
export interface VersionHandshake {
  clientVersion: string;
  protocolVersion: string;
  dataPackHash: string;
  balanceHash: string;
  uiSchemaHash?: string;
  platform: "web" | "desktop";
}
```

只要以下任意不同，禁止开局：

- `protocolVersion`
- `dataPackHash`
- `balanceHash`

原因：哪怕某个客户端 Boss HP 表不同，也会在几秒内必然不同步。

---

## 6. RunStart 契约

```ts
export interface RunStartMessage {
  type: "run_start";
  roomId: string;
  runId: string;
  hostId: PlayerId;

  protocolVersion: string;
  dataPackHash: string;
  balanceHash: string;

  seed: number;
  stageId: string;
  difficultyId: string;

  players: PlayerRunStartInfo[];

  simFps: 60;
  inputDelayFrames: number;
  startFrame: number;

  createdAtServerMs: number;
}
```

`seed` 是全局起点。之后应派生出多条 RNG：

```ts
runSeed
  ├─ gameplayRng
  ├─ dropRng
  ├─ rewardRng
  ├─ stageRng
  ├─ bossRng
  ├─ tribulationRng
  └─ visualRng     // 不进入状态 hash
```

---

## 7. 确定性要求

### 7.1 禁止事项

玩法逻辑中禁止：

```ts
Math.random()
Date.now()
performance.now()
setTimeout 影响 gameplay
setInterval 影响 gameplay
真实窗口尺寸影响 gameplay
Object.keys 未排序后参与 gameplay 顺序
Map/Set 迭代顺序参与 gameplay 判定
浮点 dt 积累决定 cooldown
不同客户端单独生成奖励池
```

### 7.2 推荐事项

玩法逻辑必须：

1. 使用 Seeded RNG。
2. 使用固定帧计时。
3. 使用稳定实体 ID。
4. 使用稳定排序。
5. 所有碰撞结果按固定顺序处理。
6. 所有奖励选项由同一个 RNG 流生成。
7. 所有拾取归属用确定性规则判定。
8. 所有 UI 决策由 server sequence 排序。

---

## 8. RNG 分层

### 8.1 RNG 分类

```ts
export interface RunRngState {
  gameplay: RngStreamState;
  stage: RngStreamState;
  drop: RngStreamState;
  reward: RngStreamState;
  boss: RngStreamState;
  tribulation: RngStreamState;
  visual: RngStreamState;
}
```

| RNG 流 | 用途 | 是否进入 hash |
|---|---|---|
| gameplay | 暴击、索敌打平、AI 分支 | 是 |
| stage | 怪物刷新位置、波次细节 | 是 |
| drop | 掉落类型与数量 | 是 |
| reward | 顿悟奖励池 | 是 |
| boss | Boss 弹幕随机分支 | 是 |
| tribulation | 雷劫落点与节奏 | 是 |
| visual | 粒子、星星、屏幕噪声 | 否 |

### 8.2 视觉随机不允许影响玩法

例如：

```text
爆炸粒子数量、角度、颜色闪烁、星空速度、浮字抖动
```

都必须走 `visualRng`，并且不进入碰撞、伤害、掉落、奖励。

---

## 9. 实体确定性

### 9.1 EntityId

每个实体必须有稳定 ID。

```ts
export type EntityId = number;
```

生成规则：

```ts
entityId = entityIdAllocator.next();
```

两端只要模拟一致，分配顺序就一致。

### 9.2 稳定更新顺序

每帧更新顺序固定：

```text
1. Apply FrameInput
2. StageRunner
3. WaveSpawner
4. PlayerSystem
5. ArtifactSystem
6. SpiritTreasureSystem
7. SpellSystem
8. PillDigestionSystem
9. ProjectileSystem
10. EnemySystem
11. BossSystem
12. TribulationSystem
13. CollisionSystem
14. DamageSystem.flush()
15. DropSystem.flush()
16. PickupSystem
17. TeamInsightExpSystem
18. CultivationSystem
19. InsightPauseSystem
20. StateHashSystem
```

同类实体内部按 `entityId ASC` 更新。

### 9.3 碰撞处理顺序

碰撞系统不应发现一个碰撞就立即修改一切，而应先记录，再排序处理。

```ts
interface CollisionEvent {
  frame: number;
  a: EntityId;
  b: EntityId;
  collisionType: CollisionType;
}
```

排序：

```text
frame ASC
collisionType priority ASC
a ASC
b ASC
```

这样能避免不同客户端因为遍历顺序差异导致某颗子弹先打谁不同。

---

## 10. 拾取与归属规则

掉落拾取在双人联机里非常容易不同步，必须定死。

### 10.1 团队共享掉落

以下掉落直接团队共享：

```text
灵气经验球
局外基础材料
Boss 稀有材料
团队气运点
```

如果任意玩家拾取，效果对团队生效。

### 10.2 个人归属掉落

以下掉落有个人归属：

```text
真元球
临时护盾
丹药补给
局内单人法术替换
```

判定规则：

```text
1. 在同一帧内，所有可拾取者计算距离。
2. 距离更近者获得。
3. 距离完全相同，playerId 小者获得。
4. 若掉落带 ownerHint，ownerHint 只影响吸附，不覆盖最终距离规则。
```

### 10.3 吸附规则

吸附目标每帧也必须确定：

```text
1. 找到所有进入 pickupRadius 的玩家。
2. 选择距离最近者。
3. 距离相同按 playerId。
4. 目标锁定后，除非目标死亡或距离超过 releaseRadius，否则不切换。
```

---

## 11. 顿悟同步

顿悟是 v0.1 联机高风险点。

### 11.1 触发来源

顿悟由 `TeamInsightExpState` 触发：

```text
灵气经验满
  ↓
在当前 frame 结束时进入 insight_pause
  ↓
Combat Simulation 冻结
  ↓
UI 可继续动画
```

顿悟不是修为突破。修为突破走 Cultivation / Tribulation 系统。

### 11.2 奖励生成

奖励生成必须在两端本地由同一个 `rewardRng` 生成。

```ts
InsightSession {
  insightId
  triggeredFrame
  teamInsightLevel
  optionsByPlayer
  sharedFortuneReroll
}
```

`optionsByPlayer` 的生成顺序固定：

```text
1. 按 playerId ASC
2. 每名玩家生成 3 个选项
3. 生成时消耗 rewardRng
4. 结果进入 state hash
```

### 11.3 重 Roll 同步

重 Roll 消耗公共气运点，必须严格排序。

UI 事件不直接由客户端各自执行，而是发送到服务器排序。

```ts
export interface InsightDecisionMessage {
  type: "insight_decision";
  roomId: string;
  playerId: PlayerId;
  insightId: string;
  clientDecisionSeq: number;
  action: "choose" | "reroll";
  optionIndex?: 0 | 1 | 2;
}
```

服务器转发时添加：

```ts
serverDecisionSeq: number;
```

所有客户端按 `serverDecisionSeq ASC` 应用。

这样可以避免两人同时按重 Roll 时，双方本地先后顺序不同。

### 11.4 继续战斗

只有当：

```text
P1 已选择
P2 已选择
所有 insight_decision 已按序应用
```

才能退出顿悟暂停。

退出后从同一 `resumeFrame` 继续模拟。

---

## 12. 修为与雷劫同步

### 12.1 修为是个人状态

```ts
PlayerCultivationState {
  realmId
  layer
  cultivation
  cultivationToNext
  bottleneck
  inTribulation
}
```

修为增长来源必须确定：

```text
周天吐纳：每 N 帧增加固定值
小破境丹：丹药消化完成帧增加固定值
精英天材地宝：掉落并拾取后增加固定值
Boss 天材地宝：结算帧增加固定值
顿悟词条：选择应用帧增加固定值
```

### 12.2 雷劫触发

当玩家修为到达大境界瓶颈：

```text
cultivation >= cultivationToNext
bottleneck.type = major_realm
```

如果当前规则允许局内雷劫，则在确定帧进入：

```ts
TribulationState {
  tribulationId
  triggeringPlayerId
  startFrame
  durationFrames
  phase
  rngState
}
```

### 12.3 多人同时瓶颈

如果两人同帧到达瓶颈，v0.1 不同时叠双雷劫，按固定顺序排队：

```text
1. playerId ASC 的玩家先触发
2. 另一名玩家进入 queuedBottleneck
3. 当前雷劫结束后，若仍满足条件，再触发下一场
```

### 12.4 雷劫落点

雷劫落点由 `tribulationRng` 和当前帧决定。

禁止：

```text
客户端本地随便 Math.random 落雷
根据真实鼠标/窗口状态改落雷
视觉粒子随机改变真实雷击半径
```

允许：

```text
落雷视觉比真实 hitbox 大
视觉闪烁走 visualRng
真实命中半径固定
```

### 12.5 雷劫成功

成功帧统一应用：

```text
1. 最终雷罚命中地面
2. 造化清气触发
3. 全屏清除普通敌弹
4. 回满 HP/Qi
5. 境界提升
6. 精气神倍率应用
7. fortuneBoon 持续帧开始
8. 状态 hash 记录
```

---

## 13. 精血渡魂同步

救援完全由输入决定。

### 13.1 状态

```ts
RescueState {
  downedPlayerId
  rescuerPlayerId?
  progressFrames
  requiredFrames
  radius
  hpCostPerFrame
  startedFrame?
}
```

### 13.2 判定

每帧按以下顺序：

```text
1. 检查倒地玩家 aliveState === soul
2. 检查存活玩家 interactDown
3. 检查距离 <= rescueRadius
4. 如果成立，progressFrames += 1
5. 施救者每帧扣精血
6. 如果中断，开始 decayDelay
7. progressFrames 满，复活
```

### 13.3 双人同时互救

v0.1 只有两名玩家，因此不可能双方同时是施救者。若未来扩展多人：

```text
救援目标相同：施救者按 playerId ASC 选主施救者，其余提供加速
```

---

## 14. 丹药与法术同步

### 14.1 法术释放

法术只能由 `pressedMask` 触发。

```text
按下法术键
  ↓
检查 aliveState
  ↓
检查 cooldownFrames
  ↓
检查 qi
  ↓
扣真元
  ↓
生成法术实体/效果
  ↓
进入 cooldownFrames
```

所有检查在同一帧、同一顺序执行。

### 14.2 丹药吞服与消化

丹药吞服也是输入事件。

```text
pressed Pill1
  ↓
检查 pillSlot 是否 ready
  ↓
创建 DigestionState
  ↓
remainingFrames = digestFrames
  ↓
每帧 tick
  ↓
按 fixed interval 生效
  ↓
结束后 sideEffect
```

回血 tick 不应依赖真实秒数，而是：

```ts
healTickEveryFrames = 60;
```

---

## 15. Boss 同步

Boss 时间轴必须纯数据驱动。

```ts
BossState {
  bossId
  hp
  phaseIndex
  attackTimelineFrame
  attackPatternState
  rngState
}
```

Boss 攻击不由“本地攻击计时器 + random”决定，而由：

```text
stageFrame
bossPhase
bossTimeline
bossRng
targetRule
```

### 15.1 目标选择

自动索敌或 Boss 瞄准必须确定。

```text
1. 存活肉身玩家优先
2. 距离最近
3. 距离相同按 playerId ASC
4. 如果无肉身玩家，允许瞄准神魂或中心点，取决于技能配置
```

---

## 16. 状态哈希与不同步检测

### 16.1 Hash 间隔

```ts
hashEveryFrames = 120; // 每 2 秒
```

### 16.2 StateHashReport

```ts
export interface StateHashReport {
  frame: number;
  hash: string;
  simFrame: number;
  rngDigest: string;
  entityCountDigest: string;
}
```

### 16.3 Hash 包含

必须包含：

```text
runId
frame
stage state
players gameplay state
team insight exp state
player cultivation states
boss state
enemy states
projectile states
pickup states
damage queues
cooldown frames
digestion states
rescue states
tribulation state
gameplay/drop/reward/boss/tribulation RNG state
```

不包含：

```text
粒子
浮字
屏幕震动
UI 动画
音效播放位置
星空背景
真实 FPS
网络延迟
```

### 16.4 Hash 规范化

所有状态序列化前必须排序：

```text
players by playerId
enemies by entityId
projectiles by entityId
pickups by entityId
buffs by buffId + appliedFrame
```

推荐使用 canonical JSON 或二进制 canonical encoder。

---

## 17. 不同步恢复

### 17.1 检测流程

```text
1. Client A 发送 hash(frame=1200)
2. Client B 发送 hash(frame=1200)
3. Relay 或 Host 比较
4. 若不同，标记 suspected_desync
5. 连续 2 次 hash mismatch，则进入 desync_repair
```

### 17.2 v0.1 恢复方案：Host 快照修正

v0.1 暂不做复杂 rollback，采用 Host 修正。

```text
1. Host 保留最近 SnapshotRingBuffer
2. Client 请求最新 confirmed snapshot
3. Host 发送 snapshot + input history after snapshot
4. Client 替换本地 gameplay state
5. Client 重放 input history 到当前帧
6. 继续 lockstep
```

Host 不是长期权威服务器，但在 desync repair 时作为临时权威。

### 17.3 快照频率

```ts
snapshotEveryFrames = 120;
snapshotRingSize = 180; // 约 6 分钟历史
```

v0.1 第一大阶段约 5–7 分钟，180 个快照足够覆盖整场。

### 17.4 严重不同步

如果连续修复失败：

```text
1. 暂停战斗
2. 显示：天机错乱，正在重整因果
3. 保存 desync log
4. 返回局外结算，保留已获得资源
```

由于本游戏采用《哈迪斯》式资源保留，这种兜底不会过度惩罚玩家。

---

## 18. 断线与重连

### 18.1 心跳

```ts
pingIntervalMs = 1000;
timeoutMs = 5000;
reconnectGraceMs = 60000;
```

### 18.2 短暂掉线

当一名玩家断线：

```text
1. 进入 network_waiting
2. Combat Simulation 暂停
3. UI 显示“道友神识离散，正在重连”
4. 最多等待 60 秒
```

### 18.3 重连流程

```text
1. 断线玩家带 reconnectToken 返回
2. Relay 验证 roomId / playerId / token
3. Host 发送最新 confirmed snapshot
4. Relay 发送缺失 input history
5. 客户端恢复到当前帧
6. 倒计时 3 秒后继续
```

### 18.4 超时未回

v0.1 规则：

```text
如果 60 秒未重连：
- Host 可选择继续单人托管本局
- 断线玩家角色进入“神魂离线”状态，不攻击、不拾取个人资源
- 团队共享资源继续保留
```

这是 v0.1 的折中方案。后续可以做 AI 接管或好友重新加入。

---

## 19. 网络等待与体验包装

网络等待不能显示生硬的“同步中”。建议修仙化：

| 技术状态 | 显示文案 |
|---|---|
| 等待输入帧 | 道友气息不稳 |
| 断线重连 | 道友神识离散，正在重聚 |
| desync repair | 天机错乱，正在重整因果 |
| 版本不匹配 | 道统不合，无法同修 |
| 数据包不同 | 功法卷宗不一致 |

---

## 20. Relay Server 职责

### 20.1 必须实现

```text
create_room
join_room
leave_room
ready
run_start
input_relay
insight_decision_ordering
ping/pong
hash_report_relay
reconnect_token
```

### 20.2 不实现

```text
完整战斗模拟
碰撞判定
掉落判定
奖励生成
Boss AI
法术效果
```

### 20.3 消息顺序

Relay 必须保证：

```text
同一 room 内的 room_event 按 serverSeq 单调递增
input_batch 可乱序到达，但客户端按 frame 放入 buffer
insight_decision 必须由 serverSeq 决定应用顺序
```

---

## 21. 消息类型总览

```ts
export type NetMessageType =
  | "hello"
  | "create_room"
  | "join_room"
  | "room_joined"
  | "client_ready"
  | "loadout_commit"
  | "run_start"
  | "countdown_start"
  | "input_batch"
  | "insight_decision"
  | "ordered_room_event"
  | "hash_report"
  | "snapshot_request"
  | "snapshot_response"
  | "ping"
  | "pong"
  | "disconnect_notice"
  | "reconnect_request"
  | "reconnect_accept"
  | "run_finish";
```

---

## 22. 数据包与协议版本

### 22.1 dataPackHash

应该包含：

```text
artifacts
spirit_treasures
spells
pills
enemies
bosses
stages
reward_pools
drop_tables
cultivation_realms
tribulations
balance
```

### 22.2 protocolVersion

联机协议改动时必须升级：

```text
0.1.0 初始协议
0.1.1 消息字段兼容增加
0.2.0 不兼容协议变更
```

---

## 23. 第一版工程目录建议

```text
src/
  net/
    NetClient.ts
    RelayTransport.ts
    RoomClient.ts
    LockstepSession.ts
    InputDelayBuffer.ts
    InputEncoder.ts
    StateHash.ts
    SnapshotManager.ts
    ReconnectManager.ts
    DesyncRepair.ts

  sim/
    CombatSimulation.ts
    FixedTickRunner.ts
    Determinism.ts

  server/
    RelayServer.ts
    RoomRegistry.ts
    RoomState.ts
    DecisionSequencer.ts

  types/
    netcode-types.v0.1.ts
```

---

## 24. Codex 任务拆分

### Task 1：实现 netcode types

交付：

- `netcode-types.v0.1.ts`
- 所有消息类型
- 输入 bitmask
- room phase
- hash report
- snapshot schema

### Task 2：实现 InputBuffer

交付：

- 本地输入采集
- targetFrame 写入
- remote input 插入
- missing frame 检测
- input batch 编码/解码

### Task 3：实现 FixedTickRunner

交付：

- 固定 60 FPS simulation
- render 分离
- online/offline 共用 tick
- 不从 DOM 直接读键盘

### Task 4：实现 Seeded RNG 分层

交付：

- runSeed 派生多个 stream
- visualRng 与 gameplayRng 分离
- 禁止 gameplay 调用 Math.random

### Task 5：实现 Room Relay mock

交付：

- WebSocket relay
- create/join/ready/run_start
- input relay
- insight_decision 排序

### Task 6：实现 StateHash

交付：

- canonical state encoder
- hashEveryFrames
- hash report relay
- mismatch log

### Task 7：实现 SnapshotManager

交付：

- 快照保存
- 快照恢复
- input history 重放
- reconnect 使用

### Task 8：实现顿悟同步

交付：

- insight_pause
- 奖励本地确定性生成
- choose/reroll 通过 serverSeq 应用
- 双方确认后 resume

### Task 9：实现雷劫同步

交付：

- 修为瓶颈触发雷劫
- tribulationRng
- 落雷时间线
- 多人同时瓶颈排队

### Task 10：实现联机测试脚本

交付：

- headless 双客户端模拟
- same input same hash
- jitter/packet loss 模拟
- insight reroll race 测试
- tribulation during boss 测试

---

## 25. 测试用例

### 25.1 Determinism Smoke Test

```text
输入：固定 runSeed + 固定 6000 帧输入
期望：Client A 和 Client B 每 120 帧 hash 相同
```

### 25.2 RNG Isolation Test

```text
输入：A 客户端关闭粒子，B 客户端开启粒子
期望：gameplay hash 相同
```

### 25.3 Insight Race Test

```text
输入：P1/P2 同时点击 reroll
期望：serverDecisionSeq 决定唯一顺序，双方结果一致
```

### 25.4 Drop Pickup Tie Test

```text
输入：灵气球与两名玩家距离完全相同
期望：playerId ASC 获得或团队共享，双方一致
```

### 25.5 Rescue Interrupt Test

```text
输入：P1 倒地，P2 长按救援 1.8 秒后离开，0.8 秒后回来
期望：progress decay 规则一致
```

### 25.6 Tribulation During Boss Test

```text
输入：P1 在 Boss Phase 2 到达筑基瓶颈
期望：Boss 不暂停，雷劫叠加，天雷密度按规则 -10%，双方 hash 一致
```

### 25.7 Reconnect Test

```text
输入：P2 在 frame 3000 断线，frame 4200 重连
期望：Host 发送 snapshot，P2 恢复到当前帧，hash 重新一致
```

---

## 26. 验收标准

v0.1 联机技术通过标准：

1. 两台客户端可进入同一房间。
2. 双方可完成第一大阶段。
3. 连续 10 分钟模拟无 hash mismatch。
4. 100ms RTT、2% 丢包模拟下可玩。
5. 顿悟三选一、重 Roll、选择结果双方一致。
6. 雷劫落点、Boss 弹幕、掉落结果双方一致。
7. 精血渡魂救援进度双方一致。
8. 一次短线重连可恢复。
9. gameplay 代码中搜索不到裸 `Math.random()`。
10. UI、粒子、音效变化不影响 gameplay hash。

---

## 27. v0.1 结论

联机地基必须从一开始服务这个游戏的真实特性：

```text
海量弹幕
高频敌人生成
双人同步走位
主动法术
丹药消化
共享灵气经验
个人修为突破
局内动态雷劫
双人顿悟明牌
精血渡魂救援
```

因此 v0.1 的正确方向不是“同步状态”，而是：

> **确定性帧同步 + 输入延迟缓冲 + Seeded RNG + 状态哈希 + Host 快照修正。**

这个架构足够轻，能支撑第一版在线合作；同时足够严谨，后续可以扩展到 Rollback、服务器权威、匹配系统和更多玩家。
