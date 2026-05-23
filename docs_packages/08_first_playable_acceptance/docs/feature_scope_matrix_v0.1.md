# 《Feature Scope Matrix v0.1》

本表用于防止 v0.1 范围失控。Codex 或开发者新增任何功能前，必须先判断它属于 Must / Should / Optional / Deferred。

## 1. 范围分级定义

| 等级 | 定义 | v0.1 策略 |
|---|---|---|
| Must | 不做就不能证明 First Playable 闭环 | 必须实现和测试 |
| Should | 强烈建议实现，会显著提升可玩性或验证关键架构 | 可进入 v0.1，但不能阻塞 Must |
| Optional | 有价值但不是门槛 | 只在 Must 全过后做 |
| Deferred | 明确延后 | v0.1 禁止做，除非降低到 skeleton |

## 2. 局内战斗

| 功能 | 等级 | 说明 |
|---|---|---|
| 第一大阶段 1-1 到 1-5 | Must | v0.1 核心内容 |
| 第二大阶段 | Deferred | 等第一阶段可玩后再扩 |
| 自动普攻 | Must | 本命法宝核心 |
| 4 个主动法术 | Must | 验证真元经济和高压救场 |
| 3 个丹药槽 | Must | 验证炼化预判 |
| 4 个灵宝 | Must | 攻击/防御/拾取/双人四类功能 |
| 精血渡魂 | Must | 双人核心差异化 |
| 魂修完整流派 | Deferred | 先预留 SoulState |
| 局内雷劫 Debug | Should | 验证修为线和雷劫表现 |
| 正式自然触发筑基雷劫 | Optional | 第一阶段正常流程不应自然触发 |

## 3. 双轨成长

| 功能 | 等级 | 说明 |
|---|---|---|
| TeamInsightExpState | Must | 灵气经验 / 顿悟 |
| PlayerCultivationState | Must | 修为 / 境界 |
| 顿悟三选一 | Must | 肉鸽构筑核心 |
| 公共气运重 Roll | Must | 双人协作点 |
| 小层突破 | Must | 修为线即时反馈 |
| 大境界雷劫 | Should | Debug 必须可测 |
| 局外劫雷台完整战斗 | Optional/Deferred | v0.1 可有 skeleton |

## 4. 局外洞府

| 功能 | 等级 | 说明 |
|---|---|---|
| 默认存档 | Must | 开发与试玩入口 |
| 结算 Receipt | Must | 局内外桥梁 |
| 资源钱包 | Must | 资源闭环 |
| 聚灵阵 | Must | 挂机收益最小版 |
| 藏经阁：修功 | Must | 功法长线成长 |
| 藏经阁：研法 | Must | 法术永久成长 |
| 炼丹房 | Must | 丹药和破境丹 |
| 炼器阁 | Must | 法宝/灵宝升星 |
| 劫雷台入口 | Should | 局外突破预留 |
| 弟子系统 | Deferred | 容易扩大模拟经营范围 |
| 宗门经营 | Deferred | v0.1 不做 |

## 5. 联机与工程

| 功能 | 等级 | 说明 |
|---|---|---|
| 本地双人 | Must | First Playable 需要双人手感 |
| Determinism Harness | Should | 联机前置门槛 |
| StateHash | Must | 确定性基础 |
| Host Snapshot 修正 | Optional | v0.1 可先 mock |
| WebSocket Relay 原型 | Optional | 不作为可玩门槛 |
| 公开 matchmaking | Deferred | v0.2+ |
| 断线重连完整体验 | Deferred | v0.2+ |

## 6. 表现与音效

| 功能 | 等级 | 说明 |
|---|---|---|
| 程序绘制 Canvas VFX | Must | 不依赖外部资源 |
| VFX Event Pipeline | Must | Simulation 与表现分离 |
| 屏幕震动 | Must | 战斗反馈基础 |
| 程序音效 | Should | 提升手感但不阻塞模拟 |
| 低配模式 | Should | 粒子降级 |
| 外部字体/CDN/图片 | Deferred/Forbidden | v0.1 禁止 |
