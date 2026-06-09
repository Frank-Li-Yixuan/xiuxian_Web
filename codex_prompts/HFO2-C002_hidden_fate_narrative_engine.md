执行 HFO2-C002：隐藏命叙事链引擎。

目标：
实现 HiddenFateNarrativeEngine，用于生成并推进隐藏血脉/前世/封印/系统共鸣的叙事状态。

要求：
1. 输入：
   - OpeningInnateDraft
   - DestinySelectionState
   - OriginStorylineResult
   - CarriedItemNarrativeState
   - Seeded RNG
2. 输出：
   - HiddenFateNarrativeStateV02[]
   - visibleOmenLines
   - lifeEventBiasTags
   - majorChoiceSignals
   - interludeBiasTags
   - stageTransitionTokens
   - age18Hooks
3. 支持隐藏命进度带：
   seed / omen / stirring / halfReveal / nearAwake / awakened
4. 不泄露 trueName。
5. 支持误导预兆。
6. 支持根据事件推进 progress。
7. 同 seed 可复现。
8. 不使用 Math.random。
9. 不改 src/sim/**。

测试：
- 高雷偏置更容易生成 thunder hidden fate。
- 药铺+铜炉更容易丹圣线。
- trueName 不出现在 visibleOmenLines。
- progress 达到 60 后 revealBand 为 halfReveal。
