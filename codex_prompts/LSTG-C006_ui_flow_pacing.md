【全局约束】
- 不要使用 generated PNG 作为交互控件。
- 前端控件使用 DOM/React + 本地 ui-system + CSS/Tailwind tokens。
- 不要修改 src/sim/**，除非任务明确要求且必须解释原因。
- 不要改变战斗 gameplay。
- 使用 Seeded RNG；不要 Math.random。
- 每次完成后运行 npm run typecheck、npm test、npm run build。若存在 validate:data、check:forbidden，也一起运行。

执行 LSTG-C006：人生模拟阶段 UI 与节奏提示。

目标：
在 LifeSimulationScreen 中显示年龄阶段、修行身份、入道机缘、系统前兆和阶段转化提示。

要求：
1. 显示 age phase。
2. 显示 identity stages。
3. 显示 initiationReadiness。
4. 显示 systemResonance。
5. 当 pendingStageTransition 存在且 policy=prompt 时，弹出阶段提示。
6. 支持选择顺其自然/压下异象/主动探寻等 options。
7. 文字使用 DOM。
8. 不使用 generated PNG 控件。
9. 不改 src/sim/**。

测试：
- pending prompt 渲染。
- Esc/取消可用。
- 选择 option 应用效果。
