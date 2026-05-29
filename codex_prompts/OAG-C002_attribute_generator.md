# OAG-C002：开局属性生成器

## 目标

实现命盘类型、六维资质、精气神种子、成长偏置生成器。

## 前置

OAG-C001 已完成。

## 任务

1. 实现 `generateAttributeArchetype(seed, locks)`。
2. 实现六维资质生成：
   - 根骨
   - 悟性
   - 灵感
   - 气运
   - 心性
   - 寿元
3. 使用三骰钟形分布，不使用均匀随机。
4. 实现精气神种子生成：
   - `jingSeed`
   - `qiSeed`
   - `shenSeed`
5. 实现成长偏置 `OpeningGrowthBias`。
6. 实现属性显示评级函数：
   - 破败 / 下等 / 平庸 / 尚佳 / 上乘 / 天资 / 非凡
7. 实现锁定：
   - 锁定 attributeArchetype
   - 锁定 aptitudeStats
   - 锁定 coreSeedStats

## 测试

1. 同 seed 结果一致。
2. 不同 seed 结果大概率不同。
3. 所有属性在合法范围内。
4. 命薄天才的悟性均值高、寿元均值低。
5. 肉身强横的根骨和 jingSeed 均值高。
6. 锁定属性时重 Roll 不改变属性。

## 禁止

- 不要碰 UI。
- 不要生成灵根。
- 不要实现天命词条。
- 不要改 `src/sim/**`。
