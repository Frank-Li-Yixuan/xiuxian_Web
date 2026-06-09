【全局约束】
- 不要使用 generated PNG 作为交互控件。
- 前端控件使用 DOM/React + 本地 ui-system + CSS/Tailwind tokens。
- 不要修改 src/sim/**，除非任务明确要求且必须解释原因。
- 不要改变战斗 gameplay。
- 使用 Seeded RNG；不要 Math.random。
- 每次完成后运行 npm run typecheck、npm test、npm run build。若存在 validate:data、check:forbidden，也一起运行。

执行 LSTG-C003：阶段转化触发引擎。

目标：
根据 tokens、scores、age 和 cooldowns 生成 pendingStageTransition。

任务：
1. 实现 evaluateStageTransitions(lifeStageState, context)。
2. 支持 token requirement。
3. 支持 scoreAtLeast requirement。
4. 支持 ageMonthsAtLeast requirement。
5. 按 priority 排序。
6. 应用 cooldown 过滤。
7. 支持 automatic/prompt/forced 三种 policy。
8. 不直接应用 prompt 转化，只生成 pendingStageTransition。

测试：
- first_omen 可 mortal_child → omen_touched。
- first_qi_sense 可 path_seed → half_initiated。
- systemResonance >= 65 可添加 system_candidate。
- ageMonths >= 216 生成 age18 transition。
