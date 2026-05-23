# 《Document Index and Traceability v0.1》

本文件说明 First Playable Gate 如何追踪前序文档。

---

## 1. 上游文档索引

| 上游文档 | 对 First Playable 的作用 |
|---|---|
| 《局内战斗垂直切片 v0.1》 | 定义第一大阶段、敌人、Boss、法宝、法术、丹药、槽位 |
| 《核心数值模型 v0.1》 | 定义 TTK、DPS、真元经济、灵气经验、修为、雷劫压强 |
| 《局内 UI/UX 信息架构 v0.1》 | 定义三栏布局、双轨成长 UI、顿悟/雷劫/救援显示 |
| 《联机同步技术设计 v0.1》 | 定义 fixed tick、FrameInput、Seeded RNG、StateHash、two-client harness |
| 《工程架构与 Codex 实施计划 v0.1》 | 定义项目结构、模块边界、Codex 任务顺序、测试策略 |
| 《战斗手感与特效规范 v0.1》 | 定义渲染层级、VFX 可读性、粒子预算、震屏规则 |
| 《局外洞府最小闭环 v0.1》 | 定义 Profile、Receipt、资源钱包、聚灵阵、藏经阁、炼丹、炼器、Loadout |

---

## 2. 追踪关系

| First Playable Gate | 追踪来源 |
|---|---|
| G0 内容包与数据校验 | 工程架构、局内垂直切片、局外洞府 |
| G1 Headless 确定性模拟 | 联机同步、工程架构 |
| G2 基础 Canvas 可玩 | 局内垂直切片、UI/UX、VFX |
| G3 双人本地合作 | 局内垂直切片、UI/UX、联机同步 |
| G4 第一大阶段局内闭环 | 局内垂直切片、核心数值、VFX |
| G5 双轨成长与雷劫 Debug | 核心数值、UI/UX、联机同步 |
| G6 局外洞府闭环 | 局外洞府、工程架构 |
| G7 VFX 可读性与性能 | 战斗手感与特效规范 |
| G8 Release Candidate | 全部上游文档 |

---

## 3. 关键不可破坏约束

以下约束来自多个上游文档，First Playable 必须统一执行：

```text
1. 灵气经验 != 修为。
2. 普攻自动，法术和丹药主动。
3. 丹药持续炼化，不是瞬间血瓶。
4. 本命法宝：局外 1 + 局内 1。
5. 灵宝：局外 2 + 局内 2。
6. 法术槽固定 4 个。
7. 丹药槽固定 3 个。
8. Simulation 不直接读 DOM/Canvas/真实时间。
9. Gameplay RNG 必须 seeded。
10. UI 只读 ViewState。
11. VFX 不进入 gameplay hash。
12. v0.1 不依赖外部资源。
13. 局内资源 100% 带回局外。
14. 第一阶段完成后必须能强化并进入第二局。
```
