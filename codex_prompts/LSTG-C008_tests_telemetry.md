【全局约束】
- 不要使用 generated PNG 作为交互控件。
- 前端控件使用 DOM/React + 本地 ui-system + CSS/Tailwind tokens。
- 不要修改 src/sim/**，除非任务明确要求且必须解释原因。
- 不要改变战斗 gameplay。
- 使用 Seeded RNG；不要 Math.random。
- 每次完成后运行 npm run typecheck、npm test、npm run build。若存在 validate:data、check:forbidden，也一起运行。

执行 LSTG-C008：阶段系统测试与遥测。

目标：
补充确定性、分布、节奏、转化测试。

测试：
1. 同 seed 同输入，阶段转化一致。
2. 0–3 岁不触发真实玩法插曲。
3. 身份转化受 cooldown 限制。
4. 系统前兆高角色 18 岁 system path score 高。
5. 苟道角色 seclusion path score 高。
6. pendingStageTransition 可保存恢复。
7. 玩法插曲失败不终止人生。
8. 成年节点 fallback 为 outer_battlefield。

输出：
artifacts/life-stage-telemetry-YYYY-MM-DD/
