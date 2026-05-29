# LM-C002：LifeSimulationState 与月度推进器

范围：
- 实现 LifeSimulationState 初始化和 advanceOneMonth。
- 不实现半年选择完整 UI。
- 不实现 18 岁结算。
- 不修改 src/sim/**。

必须阅读：
- docs/monthly_life_event_system_v0.1.md
- docs/algorithm_and_balance_v0.1.md
- data/life_sim/monthly_event_rules.v0.1.json

任务：
1. 实现 createInitialLifeSimulationState(input)。
2. 从 CharacterCreation / Opening / Destiny / OriginFate 结果初始化：
   - ageMonths = 0
   - core = 出生精气神种子
   - aptitude = 先天资质
   - lifeSkills 全部 0 或根据身世微调
   - hiddenFateProgress 来自 OriginFateDraft
   - carriedItemAffinity 来自随身物
3. 实现 applyBaselineGrowth(state, phase, context)。
4. 实现 advanceOneMonth(state, context, rng)。
5. 每月：
   - 应用基础成长
   - 抽取事件
   - 应用 visible/hidden effects
   - 写 monthly log
   - ageMonths +1
   - 如果到半年，生成 pendingMajorChoice
6. 所有时间以月份整数推进。
7. 必须使用 Seeded RNG。

验收：
- 同 seed 跑 216 月结果一致。
- ageMonths 从 0 推到 216。
- monthlyLogs 数量正确。
- 每 6 个月有 pendingMajorChoice。
- npm run typecheck
- npm test

最终回复包括：
- 文件修改
- 手动验证方式
- 测试结果
