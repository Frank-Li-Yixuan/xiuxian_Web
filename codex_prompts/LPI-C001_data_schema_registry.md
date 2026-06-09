# LPI-C001：玩法插曲数据 Schema 与 Registry

目标：接入 `data/life_interludes/**`，建立 LifeInterludeRegistry。

硬约束：
- 不实现具体 STG/割草/DBG/自走棋玩法。
- 不修改 src/sim/**。
- 不改变人生模拟现有行为。
- 只做数据、类型、校验和 Registry。

任务：
1. 导入/复制 `interlude_mode_definitions.v0.1.json`、`interlude_trigger_rules.v0.1.json`、`interlude_event_catalog.v0.1.json`、`interlude_result_writeback_rules.v0.1.json`、`interlude_frequency_budget.v0.1.json`。
2. 创建或整合 TypeScript 类型。
3. 实现 `LifeInterludeRegistry`：
   - listModes()
   - getMode(modeId)
   - listInterludes()
   - getInterlude(id)
   - getWritebackRule(id)
   - getFrequencyBudget()
4. 增加数据校验：
   - interlude 引用的 mode 存在
   - resultWritebackId 存在
   - ageRange 合法
   - difficulty 合法
   - mode 合法
5. 增加 npm script 或集成现有 validate:data。

验收：
- 数据加载成功。
- 无缺失引用。
- npm run typecheck
- npm test
- npm run build
- npm run validate:data
