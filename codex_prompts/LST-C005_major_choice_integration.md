# LST-C005：接入半年重大选择系统

目标：让半年重大选择读取事件线 tension / crisis / resolution 候选。

任务：
1. 创建 `MajorChoiceStorylineAdapter`。
2. 根据最近 6 个月 logs + LifeStorylineState 生成 choice hooks。
3. 支持：
   - 主线推进选项
   - 主线回避选项
   - 主线转向选项
   - 玩法插曲选项
   - 阶段转化候选选项
4. 输出 UI 可见的模糊提示，不显示 score。
5. 测试：
   - 山村灾劫 tension 高时生成防守/逃离/求援相关 hooks
   - 药铺丹道 developing 时生成火候/救治相关 hooks
   - 系统前兆 active 时生成追随/抵抗系统信号 hooks

硬约束：
- 不修改 src/sim/**
- 不实现具体玩法插曲

运行：
- npm run typecheck
- npm test
- npm run build
