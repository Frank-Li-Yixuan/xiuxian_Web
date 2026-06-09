# LLM-C001：叙事数据 Schema 与 Registry

目标：接入 data/llm_narrative/**，建立 NarrativeTaskRegistry。

硬约束：
- 不接真实 DeepSeek API。
- 不修改人生模拟规则。
- 不修改 src/sim/**。
- 不让 LLM 决定数值。

任务：
1. 添加/迁移 data/llm_narrative/**。
2. 创建 src/narrative/NarrativeTaskRegistry.ts。
3. 创建类型文件或接入 src/types/llm-narrative-types.v0.1.ts。
4. 添加 validate:llm-narrative-data npm script。
5. 测试 JSON 加载、task 数量、forbidden terms 存在。

运行：
- npm run validate:llm-narrative-data
- npm run typecheck
- npm test
- npm run build
