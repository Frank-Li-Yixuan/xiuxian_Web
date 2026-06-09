# LPI-C003：玩法插曲 RunConfig 工厂

目标：把插曲候选转成具体可执行或可自动结算的 `LifeInterludeRunConfig`。

硬约束：
- 不需要完整实现各玩法。
- 不修改 src/sim/**。
- 可以先为未实现玩法生成 placeholder config。

任务：
1. 实现 `LifeInterludeRunConfigFactory`。
2. 输入：
   - LifeSimulationState
   - MajorChoiceOption
   - LifeInterludeCandidate
   - seed
3. 输出：
   - LifeInterludeRunConfig
4. 为每种 mode 生成基础 scenario：
   - stg：短 STG 参数
   - horde：短生存参数
   - deckbuilder：回合数/牌池占位
   - formation_auto：棋盘/阵位占位
   - text_check：判定占位
5. 生成 playerProjection：
   - 根据年龄、精气神、相关技能、天命、随身物做轻量投射。
   - 儿童阶段不要按成年人战斗强度。
6. 提供 fallback placeholder resolver。

验收：
- 生成 config 同 seed 可复现。
- 4–8 岁 STG 生成低风险短场景。
- 14–17 岁核心插曲可生成 dangerous 场景。
- 未实现玩法也能自动结算。
- npm run typecheck
- npm test
