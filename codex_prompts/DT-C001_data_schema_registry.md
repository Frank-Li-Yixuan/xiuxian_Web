# DT-C001：天命数据 Schema 与 Registry

目标：接入天命系统数据，不实现 UI。

必须阅读：
- docs/destiny_traits_rarity_conflict_reroll_v0.1.md
- data/destiny/quality_tables.v0.1.json
- data/destiny/destiny_traits.v0.1.json
- data/destiny/conflict_synergy_rules.v0.1.json
- src/types/destiny-types.v0.1.ts

任务：
1. 将 `data/destiny/*.json` 复制/接入项目数据目录。
2. 新建 `src/characterCreation/destiny/DestinyRegistry.ts`。
3. 实现数据加载与校验：trait id 唯一、quality 合法、slotType 合法、规则引用存在。
4. 新建类型文件或接入现有类型。
5. 增加单元测试。

禁止：
- 不要实现 UI。
- 不要修改战斗模拟。
- 不要引入非确定性 Math.random。

验收：
- npm run typecheck
- npm test
- 缺失 trait id 或非法 quality 会导致测试失败。
