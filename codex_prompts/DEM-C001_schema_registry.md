执行 DEM-C001：天命成立条件 v2 数据 Schema 与 Registry。

目标：
接入 data/destiny_v2 下的数据，建立 DestinyV2Registry，并运行校验脚本。

范围：
- 新增/更新类型定义。
- 加载 core_destiny_definitions、conflict_synergy_mutation_rules、life_manifestation_hooks、mode_projection_hooks。
- 不改 UI。
- 不改 src/sim/**。

要求：
1. 所有 destiny id 唯一。
2. 所有 mutation target 存在。
3. 所有 conflict/synergy 引用存在。
4. 所有 manifestation hook 引用存在。
5. 允许旧 destiny 数据继续存在，但新生成器使用 v2 registry。

运行：
npm run typecheck
npm test
node scripts/validate_destiny_eligibility_data.mjs

最终回复：
- 修改文件
- 数据数量
- 校验结果
- 未修改 src/sim/**
