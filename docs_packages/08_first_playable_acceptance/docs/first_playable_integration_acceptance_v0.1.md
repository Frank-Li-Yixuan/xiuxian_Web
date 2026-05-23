# 《v0.1 First Playable 总集成验收文档》

版本：v0.1  
文档目标：把局内战斗、核心数值、UI/UX、联机同步、工程架构、战斗特效、局外洞府七条设计线收束为一个可执行、可测试、可交给 Codex 开工的 First Playable 版本门槛。

---

## 0. 总原则

v0.1 First Playable 只服务一个目标：

> 做出一段 5–7 分钟局内战斗 + 一轮局外强化 + 第二局开局变强的完整闭环。

v0.1 不追求内容量，不追求完整 10 大阶段，不追求完整修仙模拟器。它必须证明以下四件事：

1. **局内爽**：宽屏竖版 STG 的移动、弹幕、法术、丹药、Boss、救援都能形成高压但可读的战斗体验。
2. **修仙味对**：灵气经验与修为彻底分离，顿悟抓牌与境界雷劫不是同一个系统。
3. **局外有驱动力**：打完一局能回洞府炼丹、炼器、修功、研法，并明显影响下一局。
4. **工程可扩展**：Headless 确定性模拟、数据驱动、ViewState、VFX 事件、测试 harness 都能支撑后续联机和内容扩展。

---

## 1. v0.1 First Playable 的一句话定义

```text
玩家从默认洞府存档出发，配置本命法宝、灵宝、法术、丹药进入第一大阶段；
在 5 个小阶段中完成自动普攻、主动法术、丹药炼化、灵气经验顿悟、修为增长、Boss 战、死亡救援；
击败或战死后 100% 带回基础资源；
回洞府完成至少一次炼丹、一次炼器、一次修功/研法；
生成第二局配置并重新进入战斗，能清楚感到开局变强。
```

---

## 2. v0.1 必须进入的功能

### 2.1 战斗核心

| 功能 | 必须程度 | 验收标准 |
|---|---|---|
| 宽屏竖版战斗区 | Must | 1920×1080 下三栏布局可用，中央战斗区清晰 |
| 玩家移动 | Must | WASD / P2 方向键可移动，斜向归一化，专注模式降速 |
| 自动普攻 | Must | 本命法宝自动开火，不需要玩家按射击键 |
| 本命法宝 | Must | 青霜飞剑、紫阳葫芦、玄岳重印至少 3 个实现 |
| 灵宝 | Must | 小周天剑阵、八卦玉佩、聚宝金蟾、同心锁至少 4 个实现基础效果 |
| 主动法术 | Must | J/K/L/I 四格，真元消耗、冷却、Ready/不足/冷却 UI 正常 |
| 丹药炼化 | Must | 1/2/3 三格，吞服后持续炼化，不是瞬间血瓶 |
| 敌人波次 | Must | 1-1 到 1-4 按 Stage JSON 刷新 |
| Boss 青云劫灵 | Must | 三阶段、血条、攻击模式、死亡结算 |
| 掉落与拾取 | Must | 灵气经验、真元球、材料、丹药、奖励触发正常 |
| 精血渡魂 | Must | 玩家死亡变神魂，队友长按救援消耗生命复活 |

### 2.2 双轨成长

| 功能 | 必须程度 | 验收标准 |
|---|---|---|
| 灵气经验 | Must | 团队共享，只触发顿悟抓牌，不改变境界 |
| 顿悟三选一 | Must | 双人明牌，公共气运重 Roll，双方确认后恢复 |
| 修为增长 | Must | 玩家个人独立修为，随周天吐纳/丹药/材料增长 |
| 小层突破 | Must | 练气小层突破能提升基础面板 |
| 局内雷劫 | Should for debug / Optional in normal | Debug 场景可强制触发，成功后清场、回满、境界质变 |
| 局外劫雷台 | Skeleton Must | 有入口、数据表和状态流；完整战斗可延后到 v0.2 |

### 2.3 局外洞府

| 功能 | 必须程度 | 验收标准 |
|---|---|---|
| 默认 Profile | Must | 新存档可直接进入第一局 |
| 结算 Receipt | Must | 第一大阶段胜利/失败均生成资源结算 |
| 资源钱包 | Must | 灵石、灵草、矿石、妖丹、玉简等可增加/消耗 |
| 聚灵阵 | Must | 可收取离线收益；v0.1 可用模拟时间 |
| 藏经阁修功 | Must | 至少 3 本功可修炼并影响基础属性/Loadout |
| 藏经阁研法 | Must | 至少 4 个法术可永久升 masteryLevel |
| 炼丹房 | Must | 至少能炼回春丹、燃血丹、清心丹、小破境丹 |
| 炼器阁 | Must | 至少能把青霜飞剑升到 2 星 |
| Loadout Builder | Must | 可选择 1 本功、1 本命法宝、2 灵宝、4 法术、3 丹药进入下一局 |

### 2.4 工程和测试

| 功能 | 必须程度 | 验收标准 |
|---|---|---|
| Headless Simulation | Must | 可不渲染跑完第一阶段脚本 |
| Seeded RNG | Must | Gameplay 不直接调用 `Math.random()` |
| Fixed Tick | Must | 60 FPS 固定逻辑帧，玩法时间以 frame 表达 |
| ContentRegistry | Must | 所有 JSON 数据能校验并注册 |
| StateHash | Must | 至少每 120 frame 生成 gameplay hash |
| ViewStateBuilder | Must | UI 只读 ViewState，不直接读 SimState |
| VFX Event Pipeline | Must | Simulation 只发 EffectEvent，不直接画粒子 |
| Two-client Harness | Should | 同 seed 双客户端 10 分钟无 hash mismatch |
| WebSocket Relay | Optional for v0.1 | 原型可做，但不作为 First Playable 阻塞项 |

---

## 3. v0.1 明确不进入的功能

以下内容必须延后，避免 v0.1 范围失控：

| 功能 | 延后原因 | 建议版本 |
|---|---|---|
| 完整 10 大阶段 | 内容量过大 | v0.2+ |
| 第二大阶段正式内容 | 先验证第一大阶段 | v0.2 |
| 完整魂修流派 | 需要更多死亡/复活平衡 | v0.2/v0.3 |
| 局外完整弟子/宗门经营 | 会扩大模拟器复杂度 | v0.3+ |
| 市场/交易/拍卖 | 经济复杂度过高 | v0.3+ |
| 完整在线匹配/房间列表 | First Playable 先验证同步架构 | v0.2+ |
| 排行榜/成就/云存档 | 非核心玩法 | v0.3+ |
| 完整控制器适配 | 先做键盘 | v0.2 |
| 21:9 专属布局 | 先稳定 16:9 | v0.2 |
| 外部素材包 | 当前目标是不依赖外部资源 | 永久限制，除非明确改变目标 |
| 镜像心魔劫完整 Boss | 局外雷劫 skeleton 即可 | v0.2+ |

---

## 4. First Playable 版本门槛 G0-G8

### G0：内容包与数据校验

**目标**：所有 JSON 数据和 TypeScript 契约能被工程读取。

验收：

- `data/**.json` 全部可解析。
- ContentRegistry 能加载：stage、enemy、boss、artifact、treasure、spell、pill、reward、progression、ui、vfx、outgame。
- 关键 ID 不缺失，不重复。
- `debug_run_config.v0.1.json` 能生成 RunConfig。
- `default_profile.v0.1.json` 能生成 OutgameProfile。

### G1：Headless 确定性模拟

**目标**：不渲染也能跑完整战斗逻辑。

验收：

- 60 FPS 固定 tick。
- 输入来自 FrameInput，而不是 DOM。
- Seeded RNG 分 gameplay/stage/drop/reward/boss/tribulation/visual。
- 同 seed、同 input script 重跑 3 次，最终 state hash 一致。
- 第一小阶段 1-1 可无渲染跑完并触发第一次顿悟。

### G2：基础 Canvas 可玩

**目标**：单人能进入 1-1 到 1-4，能移动、自动普攻、释放法术、吃丹药。

验收：

- 中央战斗区能清楚看到玩家、敌人、玩家弹、敌弹、掉落。
- 左右 UI 能显示生命、真元、灵气经验、修为、法术、丹药、法宝、灵宝。
- 法术 Ready/CD/真元不足状态可读。
- 丹药炼化进度可读。
- 小怪击杀反馈清脆，但不遮挡敌弹。

### G3：双人本地合作

**目标**：P1/P2 同屏可玩，双人机制成立。

验收：

- P1/P2 均可移动、自动普攻、释放法术、吃丹药。
- 灵气经验团队共享。
- 顿悟时 P1/P2 并排三选一，公共气运重 Roll。
- 一名玩家倒下后进入神魂，另一名玩家可精血渡魂救援。
- 救援期间生命扣除、进度条、复活无敌均可读。

### G4：第一大阶段完整局内闭环

**目标**：第一大阶段可完整通关或失败结算。

验收：

- 1-1 到 1-4 按节奏表运行。
- 1-2 精英狼妖，1-3 远程弹幕，1-4 综合怪潮能体现机制差异。
- 1-5 Boss 青云劫灵入场、三阶段、死亡爆炸、掉落。
- 正常通关时长 5–7 分钟。
- 稳定触发 3 次顿悟，第 4 次可在 Boss 后可选。
- Boss 战目标时长 90–130 秒。

### G5：双轨成长与局内雷劫 Debug

**目标**：灵气经验和修为在代码、UI、玩法上彻底分离。

验收：

- 灵气经验满只触发顿悟，不修改 realm/layer。
- 修为满只触发小层突破或瓶颈，不弹三选一。
- Debug 配置可让玩家进入练气九层瓶颈。
- 局内雷劫叠加到当前战斗，不切地图，不停止 Boss/怪潮。
- 雷劫成功后全屏清场、回满、基础面板暴涨。

### G6：局外洞府闭环

**目标**：打完第一局后，玩家能进行有意义的局外强化并进入第二局。

验收：

- 结算 Receipt 100% 带回基础材料。
- 洞府总览能展示获得资源和推荐下一步。
- 聚灵阵可收取离线收益。
- 炼丹房能炼至少一种局内消耗丹。
- 炼器阁能升星青霜飞剑。
- 藏经阁能修功或研法。
- Loadout Builder 能生成第二局 RunConfig。
- 第二局开局火力或生存明显强于第一局。

### G7：VFX 可读性与性能

**目标**：特效华丽但不破坏读弹。

验收：

- 自机判定点永远可见。
- 敌弹白芯在五雷、红莲、重印爆炸中仍可见。
- 雷劫红圈与内圈真实命中范围可读。
- Boss 大招预警不被 UI 和粒子遮挡。
- Medium 档 1920×1080，1-4 高压怪潮平均 60 FPS 附近，不出现长时间卡顿。
- 低配模式能降低粒子但不影响 gameplay hash。

### G8：First Playable Release Candidate

**目标**：可以给内部试玩者稳定体验。

验收：

- 单人完整闭环可跑 3 次无崩溃。
- 本地双人完整闭环可跑 2 次无崩溃。
- Headless 同 seed 回放 10 分钟无 hash mismatch。
- 所有 Must checklist 通过。
- 所有阻塞级 Bug 修复或有明确豁免。
- 打包产物不依赖外部 CDN、外部字体、外部图片、外部音频。

---

## 5. 第一版默认内容清单

### 5.1 本命法宝

| ID | 名称 | v0.1 要求 |
|---|---|---|
| `artifact_qingshuang_sword` | 青霜飞剑 | 必做，开局默认 |
| `artifact_ziyang_gourd` | 紫阳葫芦 | 必做，局内可获得 |
| `artifact_xuanyue_seal` | 玄岳重印 | 必做，局内/局外可选 |

### 5.2 灵宝

| ID | 名称 | v0.1 要求 |
|---|---|---|
| `treasure_minor_sword_array` | 小周天剑阵 | 必做 |
| `treasure_bagua_jade` | 八卦玉佩 | 必做 |
| `treasure_gold_toad` | 聚宝金蟾 | 必做 |
| `treasure_tongxin_lock` | 同心锁 | 必做，双人重点 |

### 5.3 法术

| ID | 名称 | v0.1 要求 |
|---|---|---|
| `spell_five_thunder` | 五雷正法 | 必做 |
| `spell_bagua_sword_ring` | 八卦剑阵 | 必做 |
| `spell_red_lotus_fire` | 红莲业火 | 必做 |
| `spell_sleeve_universe` | 袖里乾坤 | 必做 |

### 5.4 丹药

| ID | 名称 | v0.1 要求 |
|---|---|---|
| `pill_rejuvenation` | 回春丹 | 必做 |
| `pill_burning_blood` | 燃血丹 | 必做 |
| `pill_clear_mind` | 清心丹 | 必做 |
| `pill_minor_breakthrough` | 小破境丹 | 必做，用于修为线测试 |

### 5.5 敌人与 Boss

| ID | 名称 | v0.1 要求 |
|---|---|---|
| `enemy_mountain_imp` | 山魈 | 必做 |
| `enemy_wolf_demon` | 狼妖 | 必做 |
| `enemy_rogue_cultivator_shadow` | 邪修残影 | 必做 |
| `enemy_stone_armor_demon` | 石甲妖 | 必做 |
| `elite_split_wind_wolf` | 裂风狼妖 | 必做 |
| `boss_qingyun_tribulation_spirit` | 青云劫灵 | 必做 |

---

## 6. 关键体验指标

### 6.1 战斗节奏指标

| 指标 | 合格范围 |
|---|---:|
| 第一大阶段总时长 | 5–7 分钟 |
| Boss 青云劫灵战斗时长 | 90–130 秒 |
| 1-1 小怪平均存活 | 0.4–0.8 秒 |
| 1-4 同屏敌人峰值 | 35–55 |
| 法术释放频率 | 3–6 次/分钟/玩家 |
| 丹药使用 | 第一阶段至少自然使用 1 次，Boss 前推荐使用 1 次 |
| 顿悟次数 | 稳定 3 次，可选 4 次 |
| 普通玩家受击次数 | 4–10 次 |

### 6.2 双轨成长指标

| 指标 | 合格范围 |
|---|---:|
| 第一阶段灵气经验触发顿悟 | 3 次稳定 |
| 第一阶段修为提升 | 约 2 个练气小层 |
| 普通流程触发筑基雷劫 | 不应自然触发 |
| Debug 雷劫通过率 | 新手 30%，熟练 65%+ |
| 灵气经验与修为 UI 混淆反馈 | 试玩者明确反馈低于 20% |

### 6.3 局外驱动力指标

| 指标 | 合格范围 |
|---|---:|
| 通关第一阶段后可执行强化项 | 至少 3 项 |
| 死亡结算后可执行强化项 | 至少 1–2 项 |
| 第二局开局火力提升 | 至少 10–20% 可感知 |
| 第二局玩家目标感 | 能明确知道“再打一局为了什么” |

### 6.4 技术指标

| 指标 | 合格范围 |
|---|---:|
| Headless 第一阶段完成时间 | 显著快于实时 |
| Same-seed replay hash | 完全一致 |
| Two-client harness hash mismatch | 10 分钟 0 次 |
| `src/sim/**` 裸 `Math.random()` | 0 处 |
| 外部资源依赖 | 0 |
| JSON 校验错误 | 0 |

---

## 7. 集成测试场景

### Scenario A：默认单人通关

```text
默认 Profile
→ 稳健开荒 Loadout
→ 单人进入 stage_01_qingyun
→ 完成 1-1 到 1-4
→ 击败青云劫灵
→ 获得结算
→ 回洞府炼回春丹、升青霜飞剑、修锐金诀
→ 生成第二局 RunConfig
```

通过标准：全流程无崩溃，第二局开局火力或 UI 星级明显变化。

### Scenario B：本地双人救援

```text
P1/P2 本地双人
→ 1-3 或 Boss 阶段强制 P2 倒地
→ P2 进入神魂
→ P1 靠近按住 Interact
→ 精血渡魂成功
→ P2 复活并获得 2 秒无敌
```

通过标准：双方状态、UI、扣血、进度条、复活一致。

### Scenario C：顿悟与重 Roll

```text
1-1 结束触发顿悟
→ P1/P2 并排展示三选一
→ P1 使用公共气运重 Roll
→ P2 选择法术升级
→ P1 选择灵宝
→ 双方确认
→ 战斗恢复
```

通过标准：奖励正确应用，公共气运减少，恢复帧一致。

### Scenario D：局内雷劫 Debug

```text
Debug Profile：P1 练气九层瓶颈
→ 进入 1-4 或 Boss 前
→ 使用小破境丹 / Debug 指令推进修为
→ 触发局内三九雷劫
→ 当前怪潮不暂停
→ 玩家撑过 24 秒
→ 最终雷罚变造化清气
→ 清屏、回满、突破筑基
```

通过标准：雷劫与普通弹幕层级清楚，成功奖励应用，灵气经验不受污染。

### Scenario E：死亡结算也能成长

```text
默认 Profile
→ 故意在 1-3 死亡
→ 生成失败结算 Receipt
→ 100% 带回已获得基础材料
→ 回洞府至少能炼 1 枚回春丹或提升 1 个小项
```

通过标准：死亡不是空手回家，玩家有下一局目标。

---

## 8. Codex 开工顺序压缩版

First Playable 推荐实施顺序：

```text
01. 仓库骨架 + AGENTS.md + CI
02. SeededRng + FixedTickRunner + FrameInput
03. ContentRegistry + 数据校验
04. EntityManager + SimState + StateHash
05. PlayerSystem + ArtifactSystem + ProjectileSystem
06. EnemySystem + WaveSpawner + Collision/Damage
07. SpellSystem + PillDigestionSystem
08. Drop/Pickup + TeamInsightExp + InsightSession
09. CultivationSystem + Tribulation Debug
10. ViewStateBuilder + HUD + InsightOverlay
11. CanvasRenderer + VFX Event Pipeline
12. BossSystem 青云劫灵
13. Soul/Rescue/RunSettlement
14. OutgameProfile + ResourceWallet + SettlementReceipt
15. 聚灵阵 / 藏经阁 / 炼丹房 / 炼器阁 / Loadout Builder
16. End-to-end playtest script
17. Two-client determinism harness
18. First Playable RC 修 Bug 与调参
```

任何时候不得为了新增内容跳过 Headless deterministic gate。

---

## 9. 阻塞级 Bug 定义

以下 Bug 任一存在，不能进入 First Playable RC：

| 类别 | 阻塞条件 |
|---|---|
| 存档 | 默认 Profile 无法进局，或结算后存档损坏 |
| 战斗 | 玩家无法移动/普攻/受击/死亡/结算 |
| 数据 | 关键 JSON 加载失败或 ID 缺失 |
| 双轨成长 | 灵气经验错误修改修为，或修为满错误触发顿悟 |
| 顿悟 | 选择后奖励不生效，或无法恢复战斗 |
| Boss | Boss 无法死亡，或死亡后不结算 |
| 救援 | 神魂/复活状态卡死 |
| 局外 | 回洞府后无法生成下一局 RunConfig |
| 确定性 | 同 seed 同输入重复运行 hash 不一致 |
| 资源依赖 | 产物依赖外部 CDN/字体/图片/音频 |

---

## 10. v0.1 成功标准

v0.1 First Playable 成功，不是因为系统多，而是因为试玩者能自然说出：

```text
我知道我在躲什么。
我知道我为什么要放这个法术。
我知道丹药要提前吃。
我知道灵气满是顿悟，不是境界突破。
我知道修为满会带来雷劫和质变。
我知道死了也能带资源回洞府。
我知道下一局我为什么会更强。
我愿意再打一局。
```

若这八句话成立，v0.1 就达到了项目地基目标。
