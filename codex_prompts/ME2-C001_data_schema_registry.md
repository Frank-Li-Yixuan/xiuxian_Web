# ME2-C001：月度事件 v0.2 数据 Schema 与 Registry

目标：接入 `data/life_sim_v02/**`，建立 MonthlyEventRegistryV02 和数据校验。

硬约束：
- 不修改 src/sim/**
- 不实现 UI
- 不调用 LLM
- 不改变人生模拟流程，只做数据和 registry

任务：
1. 接入 monthly_event_categories.v0.2.json
2. 接入 monthly_event_tiers.v0.2.json
3. 接入 monthly_event_pool.v0.2.json
4. 接入 narrative_density_rules.v0.2.json
5. 接入 monthly_event_weighting_rules.v0.2.json
6. 接入 storyline_event_mapping.v0.2.json
7. 创建/更新 TypeScript 类型
8. 创建 MonthlyEventRegistryV02
9. 增加 validate_monthly_events_v02 脚本到 package.json

验收：
- 数据能加载
- event id 唯一
- category/tier 合法
- hidden trueName 不泄露
- npm run typecheck
- npm test
- node scripts/validate_monthly_events_v02.mjs
