# LFP-C005：Playable Interlude Flow

目标：实现人生模拟中的玩法插曲入口、自动推演和结果回写。

范围：
- 首版至少接入一个 STG 短插曲或使用现有战斗壳作为 rain_backhill_stg。
- 其他模式可 auto-resolve。

任务：
1. 从 major choice resolution 识别 interludeCandidate。
2. 显示 InterludePrompt：手动挑战 / 自动推演 / 返回选择。
3. 自动推演最高结果为 success，不触发 hiddenSuccess。
4. 手动挑战完成后接受 LifeInterludeResult。
5. 回写主线、隐藏进度、随身物亲和、伤病/心结、age18 hook。
6. 插曲失败不终止人生。
7. 插曲完成后回到月度播放。

验收：
- 一个携带 STG 插曲的选择能进入插曲 prompt。
- 自动推演能回写。
- 手动路径如果未完全实现，有清晰 fallback。
- npm run typecheck / npm test / npm run build。
