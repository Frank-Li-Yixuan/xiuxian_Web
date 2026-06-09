# ME2-C004：叙事密度控制器

目标：实现 NarrativeDensityController，避免人生模拟流水账或高能过载。

实现：
1. 六个月窗口 densityUsed。
2. hardEventCount。
3. category/tier/hook 计数。
4. 同类事件重复惩罚。
5. 插曲候选频率限制。
6. 压力事件控制。
7. 主线长期不推进时提高权重。
8. 快速推演时 breath/growth 可折叠。

验收：
- 36 次半年窗口密度合理
- 连续同类事件显著减少
- active 主线长时间不推进时权重提升
- interludeCandidate 不过频
- npm run typecheck
- npm test
