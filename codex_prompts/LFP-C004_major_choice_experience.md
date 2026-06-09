# LFP-C004：Major Choice Experience

目标：把半年重大选择 v0.2 接到 LifeSimulationScreen。

任务：
1. 在每 6 个月暂停时生成 PendingMajorChoiceStateV02。
2. UI 展示标题、过去 6 个月摘要、3–4 个选择。
3. 显示风险标签：稳/正/险/凶/禁/命。
4. 显示胜算提示，不显示精确概率。
5. 点击选择后调用风险判定引擎。
6. 展示结算结果。
7. 结果回写 LifeSimulationState。
8. 若选择携带 interludeCandidate，进入 interlude_prompt。
9. 不泄露 hidden trueName。

验收：
- 半年选择可生成、可点击、可结算。
- 失败、成功、大成功至少有不同反馈。
- 选择能改变属性/日志/主线或 hook。
- npm run typecheck / npm test / npm run build。
