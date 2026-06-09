【全局约束】
- 不要使用 generated PNG 作为交互控件。
- 前端控件使用 DOM/React + 本地 ui-system + CSS/Tailwind tokens。
- 不要修改 src/sim/**，除非任务明确要求且必须解释原因。
- 不要改变战斗 gameplay。
- 使用 Seeded RNG；不要 Math.random。
- 每次完成后运行 npm run typecheck、npm test、npm run build。若存在 validate:data、check:forbidden，也一起运行。

执行 LSTG-C002：LifeStageState 与年龄阶段引擎。

目标：
实现 LifeStageState 初始化与年龄阶段自动变化。

任务：
1. 创建 createInitialLifeStageState(characterOrigin)。
2. 根据 ageMonths 计算 agePhaseId。
3. 默认 identityStageIds = ["mortal_child"]。
4. 实现 updateAgePhase(lifeState, ageMonths)。
5. 实现 applyLifeStageEffect。
6. 实现 cooldowns 每月衰减。
7. 不接入 UI。
8. 不改 src/sim/**。

测试：
- 0 月为 infant。
- 48 月为 childhood。
- 108 月为 youth。
- 168 月为 adolescence。
- 216 月为 adulthood_threshold。
- 初始身份为 mortal_child。
