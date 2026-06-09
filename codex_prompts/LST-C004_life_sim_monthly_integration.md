# LST-C004：接入月度事件系统

目标：让月度事件抽取读取 LifeStorylineState。

前提：LST-C001~C003 完成。LM 初版如果已存在，则接入；若未存在，只提供 adapter 和测试。

任务：
1. 创建 `MonthlyEventStorylineAdapter`。
2. 从 LifeStorylineState 生成：
   - monthlyEventWeightTags
   - requiredHooks
   - suppressionTags
3. 月度事件权重计算加入主线/事件线加成。
4. 月度事件结果能推进 eventThread。
5. 不要泄露隐藏真名。
6. 测试：
   - 药铺丹道线 active 时 herb/furnace 事件权重提高
   - 山村灾劫线 crisis 时 bandit/demon/calamity 事件权重提高
   - 系统前兆线 active 时 system_static/outer_omen 事件权重提高

硬约束：
- 不修改 src/sim/**
- 不改变已有 LM 行为，除非通过 adapter 增量接入

运行：
- npm run typecheck
- npm test
- npm run build
