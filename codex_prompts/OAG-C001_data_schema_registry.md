# OAG-C001：开局属性与灵根数据 Schema / Registry

## 目标

接入 `data/opening/**` 数据，建立 OpeningGenerator 数据注册表和校验。

## 必须阅读

- `docs/opening_attribute_root_generator_v0.1.md`
- `docs/algorithm_and_balance_v0.1.md`
- `data/opening/attribute_archetypes.v0.1.json`
- `data/opening/spiritual_roots.v0.1.json`
- `data/opening/root_element_weights.v0.1.json`
- `data/opening/generation_rules.v0.1.json`
- `src/types/opening-generator-types.v0.1.ts`

## 任务

1. 将 JSON 数据复制/迁移到项目正式 `data/opening/`。
2. 创建 Opening 数据类型。
3. 实现 `OpeningDataRegistry`：
   - 加载命盘类型。
   - 加载灵根类型。
   - 加载元素权重与相生相克关系。
   - 加载生成规则。
4. 实现数据校验：
   - 权重 > 0。
   - 属性范围 min <= max。
   - 灵根 metric 范围合法。
   - 元素 id 存在。
   - 相生相克关系引用的元素存在。
5. 添加测试。

## 禁止

- 不要实现 UI。
- 不要实现完整人生模拟。
- 不要改 `src/sim/**`。
- 不要使用 `Math.random()`。

## 验收

- `npm run typecheck`
- `npm test`
- 数据校验失败时测试能捕获。
- 所有 opening JSON 可加载。
