【全局约束】
- 不要使用 generated PNG 作为交互控件。
- 前端控件使用 DOM/React + 本地 ui-system + CSS/Tailwind tokens。
- 不要修改 src/sim/**，除非任务明确要求且必须解释原因。
- 不要改变战斗 gameplay。
- 使用 Seeded RNG；不要 Math.random。
- 每次完成后运行 npm run typecheck、npm test、npm run build。若存在 validate:data、check:forbidden，也一起运行。

执行 LSTG-C004：入道节点解析器。

目标：
实现 initiation node 成功/失败对 LifeStageState 的影响。

任务：
1. 实现 resolveInitiationNode(nodeId, outcome, state)。
2. outcome 支持 success / partial / failure / hiddenSuccess。
3. 应用 successEffects / failureEffects。
4. 记录 completedInitiationNodeIds。
5. 添加 initiation cooldown。
6. 输出 age18Hooks。
7. 不实现实际玩法插曲。

测试：
- first_qi_sense success 添加 half_initiated。
- system_preview success 添加 system_candidate。
- bloodline_stirring failure 增加 heartDemon。
