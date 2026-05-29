# LM-C001：月度事件数据 Schema 与 Registry

你正在实现《0–18 岁人生模拟月度事件系统 v0.1》的第一步。

范围：
- 只接入数据、类型、Registry 和数据校验。
- 不实现 UI。
- 不实现完整人生推进。
- 不修改 src/sim/**。

必须阅读：
- docs/monthly_life_event_system_v0.1.md
- docs/event_taxonomy_and_schema_v0.1.md
- data/life_sim/*.json
- src/types/life-monthly-events-types.v0.1.ts

任务：
1. 将 data/life_sim 下 JSON 放入项目对应 data 目录。
2. 创建或整合 TypeScript 类型：
   - LifePhaseDefinition
   - MonthlyLifeEventDefinition
   - LifeEffect
   - LifeEventCondition
   - LifeSimulationState
   - MonthlyLifeLogEntry
3. 实现 LifeEventRegistry：
   - loadPhaseDefinitions()
   - loadMonthlyEventCategories()
   - loadMonthlyEvents()
   - getEventsForAge(ageMonth)
   - getEventById(id)
   - validate()
4. 添加数据校验：
   - event id 唯一
   - category 存在
   - ageRange 合法
   - effects kind 合法
   - conditions kind 合法
   - 每阶段事件数量足够
5. 不要使用 Math.random。

验收：
- npm run typecheck
- npm test
- 数据校验测试通过
- 故意改坏一个 category，测试会失败

最终回复：
- 修改文件
- 测试结果
- 数据加载路径
- 已知缺口
