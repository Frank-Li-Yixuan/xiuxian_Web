# HFO-C002：表面身世生成器

目标：根据 OpeningInnateDraft / DestinySelectionState 生成表面身世。

## 任务

1. 实现 generateBackgroundOrigin(context, registry, rng)。
2. 根据 openingTags、destinyTags、spiritualRootTags、aptitudeTags 修正权重。
3. 支持锁定：locks.backgroundOriginId 存在时直接返回该身世。
4. 输出 BackgroundOriginResult。
5. 增加 debug weight 信息。

## 权重规则

参考 docs/algorithm_and_balance_v0.1.md。

## 验收

- 同 seed 结果一致。
- 锁定身世后重 Roll 不改变。
- 药铺/丹道标签提高药铺学徒概率。
- 雷/孤儿/天妒标签提高山村孤儿和雷相关隐藏命后续权重。
