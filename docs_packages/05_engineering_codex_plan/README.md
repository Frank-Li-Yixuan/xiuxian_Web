# 《工程架构与 Codex 实施计划 v0.1》

本包用于把前置设计文档转化为 Codex 可执行的工程蓝图。

核心原则：

1. 先做 **确定性 Headless Simulation**，再做 Canvas 可玩表现。
2. Gameplay Simulation 不读取 DOM、不绘制 Canvas、不调用 `Math.random()`、不使用浮点 `dt` 推进玩法。
3. 所有玩法内容由 JSON/TS 数据驱动：阶段、敌人、Boss、法宝、灵宝、法术、丹药、奖励池、雷劫。
4. UI 只读取 ViewState；渲染和粒子不能反向修改玩法状态。
5. 第一版必须可玩：第一大阶段 1-1 到 1-5、双人、本命法宝、灵宝、法术、丹药、顿悟、修为、局内雷劫 Debug、Boss、结算。

主要文件：

```text
docs/engineering_architecture_and_codex_plan_v0.1.md   主文档
docs/codex_task_backlog_v0.1.md                       Codex 任务拆分
docs/gemini_demo_migration_notes_v0.1.md              Gemini Demo 迁移说明
docs/testing_and_ci_strategy_v0.1.md                  测试与 CI 策略
docs/module_boundaries_v0.1.md                        模块边界与导入规则
docs/codex_prompts/                                   可直接复制给 Codex 的任务提示词
data/engineering/*.json                               结构化计划数据
src/types/architecture-types.v0.1.ts                  TypeScript 类型草案
AGENTS.md                                             Codex 项目级工作约定模板
templates/                                            推荐初始工程模板
scripts/check-forbidden-patterns.mjs                  禁用模式检查脚本模板
```
