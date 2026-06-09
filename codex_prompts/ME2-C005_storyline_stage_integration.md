# ME2-C005：人生主线、事件线与阶段转化集成

目标：月度事件能推进 LifeStorylineState 和 LifeStageState。

实现：
1. 事件绑定 storylineIds 时增加相应主线权重。
2. 事件绑定 threadIds 时推进事件线。
3. hooks 写入最近 6 个月窗口。
4. interludeCandidate 交给半年选择系统。
5. stageTransitionSignal 交给阶段转化系统。
6. age18Hook 写入状态。

验收：
- 木剑轻鸣推进破落修士遗脉/木剑事件线
- 药炉火候推进药铺丹道/火候事件线
- 天外战鼓写入 age18Hook
- 不直接强制进入玩法插曲
- npm run typecheck
- npm test
