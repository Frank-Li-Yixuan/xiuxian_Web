# LPI-C002：玩法插曲触发引擎

目标：根据半年选择上下文，生成可选玩法插曲候选。

硬约束：
- 不实现具体玩法。
- 不修改 src/sim/**。
- 不改变现有选择 UI，只提供引擎接口。

任务：
1. 实现 `LifeInterludeTriggerEngine`。
2. 输入 `LifeInterludeTriggerContext`。
3. 输出 `LifeInterludeCandidate[]`。
4. 实现：
   - 年龄硬规则
   - 模式允许列表
   - baseWeight
   - recent hook 加成
   - storyline / thread 标签加成
   - root / destiny / origin / item 标签加成
   - 同模式 cooldown
   - 同 thread cooldown
   - fatigue 惩罚
5. 不允许 0–3 岁触发真实玩法。
6. 4–8 岁只允许 safe/steady dream/training/spirit_projection。
7. 同 seed 可复现。

验收：
- 雷灵根 + 系统前兆更容易生成 STG 候选。
- 药铺丹道更容易生成 horde 候选。
- 道观/旧书更容易生成 DBG 候选。
- 祖传玉佩/阵法更容易生成 formation_auto 候选。
- 频率预算生效。
- npm run typecheck
- npm test
