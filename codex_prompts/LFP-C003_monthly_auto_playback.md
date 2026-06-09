# LFP-C003：Monthly Auto Playback

目标：实现月度事件自动推进与日志播放。

前提：ME2 月度事件系统已实现或有兼容接口。

任务：
1. 实现 LifePlaybackController。
2. 支持播放速度：slow / standard / fast / debug。
3. 每月推进调用月度事件选择与效果应用。
4. 将日志写入 visibleLogWindow。
5. 在 6 个月边界暂停进入 major_choice_pending。
6. 支持“播放到下一选择”“播放到阶段结束”“暂停/继续”。
7. 支持普通 breath 事件折叠。
8. 禁止泄露 hidden trueName。

验收：
- 自动推进能从 0 月推进到第一个半年选择。
- 日志显示清楚。
- 速度控制生效。
- 同 seed 可复现。
- npm run typecheck / npm test / npm run build。
