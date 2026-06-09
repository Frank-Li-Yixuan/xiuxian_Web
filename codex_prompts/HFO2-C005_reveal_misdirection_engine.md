执行 HFO2-C005：揭示、误导与半觉醒引擎。

目标：
实现 RevealMisdirectionEngine，统一控制隐藏信息在创建页、月度日志、半年选择、18 岁中的可见程度。

任务：
1. 读取 reveal_stage_rules.v0.2.json。
2. 提供函数：
   - getRevealBand(progress)
   - buildPublicOmenView(hiddenFateState, context)
   - canRevealTrueName(stage, context)
   - buildMisdirectionCandidates(signalTags)
3. 创建页：不显示 trueName，不显示精确进度。
4. 月度日志：只显示叙事文本。
5. 半年选择：允许显示“命”选项的模糊提示。
6. 18 岁：允许根据结算结果显示真名。
7. 添加防泄露测试。

验收：
- trueName 不出现在 CharacterCreationViewModel。
- trueName 不出现在 MonthlyLifeLogEntry。
- trueName 不出现在 PendingMajorChoiceState。
- age18 revealed 时允许显示 trueName。
