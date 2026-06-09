【全局约束】
- 不要使用 generated PNG 作为交互控件。
- 前端控件使用 DOM/React + 本地 ui-system + CSS/Tailwind tokens。
- 不要修改 src/sim/**，除非任务明确要求且必须解释原因。
- 不要改变战斗 gameplay。
- 使用 Seeded RNG；不要 Math.random。
- 每次完成后运行 npm run typecheck、npm test、npm run build。若存在 validate:data、check:forbidden，也一起运行。

执行 LSTG-C005：人生模拟与玩法插曲集成。

目标：
让月度事件、半年选择、玩法插曲结果能够向阶段系统写入 transitionTokens 与 stageEffects。

任务：
1. 在 LifeSimulationState 中加入 stage: LifeStageState。
2. 月度事件应用后可写入 stage token。
3. 半年选择结果可写入 stage effects。
4. LifeInterludeResult 可写入 transitionTokens。
5. 每月推进后调用 evaluateStageTransitions。
6. pendingStageTransition 必须可持久化。
7. 不改 combat sim。

测试：
- interlude result stg_rain_mountain_success 推进阶段候选。
- pendingStageTransition 存档恢复后不变。
- age18 时生成成年节点 pending。
