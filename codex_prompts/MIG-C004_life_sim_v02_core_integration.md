# MIG-C004：Life Sim v0.2 Core Integration

目标：将人生模拟核心从旧版月度事件/半年选择升级为 v0.2 主线、密度、阶段、插曲候选框架。

任务：

1. 新增 LifeSimulationV02State，或在旧 LifeSimulationState 中添加 v02 子状态。
2. 初始化：
   - LifeStorylineState
   - LifeStageState
   - NarrativeDensityWindowState
   - OriginFateNarrativeState
3. 月度推进时读取：
   - NinePalaceEvaluation
   - DestinyEvaluationResult
   - OriginFateNarrativeState
   - LifeStorylineState
   - LifeStageState
4. 使用 ME2 月度事件池和密度控制。
5. 每月事件应用后更新：
   - eventThreads
   - density window
   - hidden omen progress
   - carried item lifecycle
   - transition tokens
6. 暂不实现 UI polish，只保证状态可推进。

禁止：

- 不改 src/sim/**。
- 不接真实 LLM。
- 不强制 18 岁域外。

测试：

- 216 月可推进。
- 每 6 个月生成 pending choice。
- 药铺丹道型事件倾向明显。
- 破落剑魄型事件倾向明显。
- hidden trueName 不泄露。
