# HFO-C001：隐藏血脉 / 身世 / 随身物数据 Schema 与 Registry

目标：接入本系统的 JSON 数据与 TypeScript 类型，不做 UI，不接人生模拟。

## 必读

- docs/hidden_bloodline_origin_items_system_v0.1.md
- docs/algorithm_and_balance_v0.1.md
- data/origin_fate/background_origins.v0.1.json
- data/origin_fate/hidden_fates.v0.1.json
- data/origin_fate/carried_items.v0.1.json
- data/origin_fate/generation_rules.v0.1.json
- data/origin_fate/reveal_rules.v0.1.json
- src/types/origin-fate-types.v0.1.ts

## 任务

1. 创建 OriginFateRegistry。
2. 加载 background origins、hidden fates、carried items、generation rules、reveal rules。
3. 创建或合并 TypeScript 类型。
4. 校验：id 唯一、权重合法、隐藏命有 omenHints、随身物有 eighteenConversion。
5. 暴露查询接口：
   - getBackgroundOrigin(id)
   - listBackgroundOrigins()
   - getHiddenFate(id)
   - listHiddenFates()
   - getCarriedItem(id)
   - listCarriedItems()

## 禁止

- 不实现 UI。
- 不实现人生模拟。
- 不修改 src/sim/**。
- 不使用 Math.random。

## 验收

- npm run typecheck
- npm test
- 数据校验测试通过。
