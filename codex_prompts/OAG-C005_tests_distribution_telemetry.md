# OAG-C005：分布测试与遥测

## 目标

为开局属性与灵根生成器补充分布测试、锁定测试和开发调试输出。

## 任务

1. 添加分布测试：
   - 生成 10000 次。
   - 统计命盘类型分布。
   - 统计灵根类型分布。
   - 统计 rare root 出现率。
   - 统计属性均值和极端值比例。
2. 添加 distinctiveness 测试：
   - 补偿后 `distinctivenessScore < 2` 的比例应为 0。
3. 添加锁定重 Roll 测试。
4. 添加 debug summary：
   - 当前 seed
   - rerollIndex
   - archetype
   - root category
   - element vector
   - tags
   - distinctivenessScore
5. 可选：创建 `/dev/opening-generator` 展示页。

## 验收

- 分布测试稳定。
- 同 seed 确定性测试通过。
- 没有 Math.random。
- `npm run typecheck`
- `npm test`
- 如项目有 build：`npm run build`
