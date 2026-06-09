# LLM-C002：脱敏器与隐藏泄露检测

目标：实现 NarrativeSanitizer 与 hiddenLeakDetector。

任务：
1. 输入结构化事件，输出 NarrativeRequest。
2. 将 hidden trueName/id 替换成 safe omen aliases。
3. 输出前检测 forbidden_terms。
4. 任何 LLM response 或 fallback response 包含 hidden trueName，都必须报错并替换为 fallback。
5. 禁止现代词检测。

测试：
- 古雷真血不能出现在 request。
- hidden_fate_ 前缀不能出现在 request。
- 输出包含 forbidden term 时 validation 失败。
