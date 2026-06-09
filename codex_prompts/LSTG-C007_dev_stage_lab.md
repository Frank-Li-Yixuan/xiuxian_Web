【全局约束】
- 不要使用 generated PNG 作为交互控件。
- 前端控件使用 DOM/React + 本地 ui-system + CSS/Tailwind tokens。
- 不要修改 src/sim/**，除非任务明确要求且必须解释原因。
- 不要改变战斗 gameplay。
- 使用 Seeded RNG；不要 Math.random。
- 每次完成后运行 npm run typecheck、npm test、npm run build。若存在 validate:data、check:forbidden，也一起运行。

执行 LSTG-C007：/dev/life-stage-lab 调试页。

目标：
建立阶段系统调试页，用于快速测试不同命盘下阶段推进。

功能：
1. 选择预设角色：天妒雷修、苟道隐修、药铺丹修、破落剑修。
2. 一键推进 216 个月。
3. 显示 age phase timeline。
4. 显示 identity stage timeline。
5. 显示 transition tokens。
6. 显示 age18 path scores。
7. 显示 cooldowns。
8. 不修改正式流程。

验收：
- 页面可打开。
- 预设角色阶段曲线明显不同。
- npm run typecheck/test/build 通过。
