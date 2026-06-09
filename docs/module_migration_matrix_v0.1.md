# 模块迁移矩阵 v0.1

| 现有模块 | 新目标 | 迁移策略 | 保留 | 替换 | 风险 |
|---|---|---|---|---|---|
| OAG v0.1 | Opening + NinePalaceEvaluation | 在 OAG 输出后增加 NPF 评分层 | Seeded RNG、灵根数据 | 松散权重 | 与 DT 集成顺序 |
| DT v0.1 | Destiny v2 Eligibility/Mutation | DEM 覆盖天命成立条件和变异 | 词条 UI、锁定基础 | 任意抽天命 | 旧数据 ID 兼容 |
| HFO v0.1 | HFO2 Narrative Chain | 隐藏命由一次生成升级为生命周期 | 身世/随身物池 | 直接显示隐藏名 | 泄露 trueName |
| LM v0.1 | Monthly Events v0.2 | ME2 覆盖事件池、密度和主线联动 | 月度推进器 | 随机流水账 | 存档迁移 |
| MLC v0.1 | Major Choices v0.2 | MC2 覆盖风险、隐藏分支、插曲候选 | 半年选择触发点 | 简单选项 | UI 复杂度 |
| A18 v0.1 | Adult Node Bridge | 保留 216 月结算，但不写死域外唯一出口 | 属性转化公式 | 必定域外 | 设计分支过多 |
| CC-C 旧角色创建 | CCUI2 | DOM 命盘推演页替代 | 数据生成结果 | 旧布局/PNG 控件 | 页面重复 |
| BAS | Combat Asset Pipeline | 保留资源/VFX/Audio管线 | manifest、预览、音频 | 不直接扩玩法 | 与 STG-R衔接 |
| STG-R | Outer Battlefield Redesign | 在 AdultNode 后执行 | Canvas、资产管线 | debug_run_config | 过早打磨战斗 |

## 迁移原则

1. 新系统优先覆盖旧逻辑，但旧数据不要立刻删除。
2. 先加 adapter，再删除旧入口。
3. 每次迁移必须有 snapshot / e2e 测试。
4. 未完成前，保留 feature flag。
5. 任何迁移不得恢复旧 PNG 控件方案。
