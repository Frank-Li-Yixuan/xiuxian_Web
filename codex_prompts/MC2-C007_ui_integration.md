# MC2-C007：人生模拟 UI 集成

目标：把半年重大选择 v0.2 接入 LifeSimulationScreen。

UI 要求：
1. 显示事件标题和描述。
2. 显示过去六个月摘要。
3. 显示选项列表。
4. 每个选项显示 风险标签：稳/正/险/凶/禁/命。
5. 显示模糊风险提示。
6. 显示可见收益方向和可能代价方向。
7. 显示是否触发玩法插曲。
8. 不能显示精确概率、隐藏真名、内部 progress。

交互：
- 点击选择
- 如果有 interludeCandidate，先进入插曲简报。
- 可自动推演。
- 选择后显示结果日志。

运行：
npm run typecheck
npm test
npm run build
