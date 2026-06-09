# MIG-C009：Age18 / Adult Node Bridge

目标：把旧 A18 系统改造成成年节点桥接，不再硬写 18 岁必定域外战场。

任务：

1. 新增 AdultNodeResolver。
2. 输入：LifeSimulationV02State、LifeStorylineState、LifeStageState、OriginFateNarrativeState、DestinyEvaluationResult。
3. 输出成年路径评分：
   - system_outer_battlefield
   - mortal_initiation_trial
   - disaster_reckoning
   - hidden_fate_inner_trial
   - hermit_delay，v0.1 可 planned
4. 默认 fallback 仍可为 outer battlefield，但必须通过评分生成。
5. 兼容 A18-C002 ~ A18-C006 的旧 resolution 输出。
6. 不重复 Roll：AdultNodeResolution 写入 profile 后不可重复生成。

测试：

- 系统前兆型更容易 outer battlefield。
- 药铺丹道型不应总是 outer battlefield。
- 灾劫主线 dominant 时 disaster_reckoning 分数提高。
- 隐藏命 nearAwake 时 hidden_fate_inner_trial 分数提高。
