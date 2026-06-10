# WORLD-C001：世界观数据 Schema 与 Registry

目标：接入凡域边地世界观数据，为人生模拟事件和半年选择提供 world tags、location tags、faction tags 和 truthLevel 约束。

范围：
- data/world/world_regions.v0.1.json
- data/world/world_factions.v0.1.json
- data/world/world_event_rules.v0.1.json
- data/world/world_glossary.v0.1.json
- src/types/worldbuilding-types.v0.1.ts

任务：
1. 将 data/world/*.json 放入项目 data/world/。
2. 创建 WorldbuildingRegistry。
3. 提供：
   - getLocation(id)
   - getFaction(id)
   - getAllowedTruthLevelsForAge(ageMonths)
   - getAllowedGameplayInterludesForAge(ageMonths)
   - getForbiddenModernTerms()
4. 添加数据校验。
5. 不改 src/sim/**。
6. 不实现人生模拟。

验收：
- npm run typecheck
- npm test
- npm run build
- 数据缺字段时测试失败。
