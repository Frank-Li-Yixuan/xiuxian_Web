【全局约束】
- 不要使用 generated PNG 作为交互控件。
- 前端控件使用 DOM/React + 本地 ui-system + CSS/Tailwind tokens。
- 不要修改 src/sim/**，除非任务明确要求且必须解释原因。
- 不要改变战斗 gameplay。
- 使用 Seeded RNG；不要 Math.random。
- 每次完成后运行 npm run typecheck、npm test、npm run build。若存在 validate:data、check:forbidden，也一起运行。

执行 LSTG-C001：人生阶段转化数据 Schema 与 Registry。

目标：
接入 life_age_phase_definitions、cultivation_identity_stages、transition_trigger_rules、initiation_node_definitions、rhythm_budget_rules 等数据。

任务：
1. 创建 LifeStageRegistry。
2. 加载并校验 data/life_stage/*.json。
3. 接入 TypeScript 类型。
4. 添加数据校验测试。
5. 不实现阶段转化逻辑。
6. 不改 UI。
7. 不改 src/sim/**。

验收：
- 数据可加载。
- 无重复 id。
- transition rule 引用的 stage 存在。
- initiation node 引用的 stage 存在。
- npm run typecheck / npm test / npm run build 通过。
