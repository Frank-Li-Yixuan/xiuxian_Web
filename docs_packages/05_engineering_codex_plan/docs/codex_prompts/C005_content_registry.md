# Codex Prompt C005 — ContentRegistry 与数据校验

请实现数据加载与校验骨架。

范围限定：

- `src/sim/content/ContentRegistry.ts`
- `src/sim/content/DataValidator.ts`
- `src/sim/content/ContentHash.ts`
- `tools/validate-data.ts`
- `tests/content/content-registry.test.ts`

要求：

1. 加载 `data/**/*.json`。
2. 按文件路径稳定排序。
3. 校验所有 `id` 唯一。
4. 校验基础跨表引用。
5. 生成稳定 `contentHash`。
6. 校验失败输出可读错误，包含文件名、字段路径、错误原因。

暂时可以使用手写 validator，不要急着引入大型 schema 库。

验收：

```bash
npm run validate:data
npm test -- content-registry
```
