# REVIEW-PRE-001：当前实现审计

只读审计，不修改代码。

目标：确认当前 OAG、DT、HFO、CCUI2、LM、MLC、A18 的实现状态，为 SIM-REDESIGN v0.2 迁移做准备。

输出目录：

artifacts/sim-redesign-pre-review-YYYY-MM-DD/

生成文件：

- IMPLEMENTATION_STATUS.md
- PROMPT_STATUS.md
- DATA_REGISTRY_STATUS.md
- CHARACTER_CREATION_STATUS.md
- LIFE_SIM_STATUS.md
- HIDDEN_LEAK_RISK.md
- TEST_RESULTS.md
- REVIEW_SUMMARY_FOR_CHATGPT.md

检查：

1. 当前角色创建是否仍使用旧 CC-C 代码或旧布局。
2. 是否存在 NinePalaceEvaluation。
3. Destiny 是否有 eligibility / mutation。
4. HFO 是否有 narrative lifecycle。
5. LM 是否有 storyline/density 控制。
6. MLC 是否有 risk/hidden branch/interlude candidate。
7. A18 是否硬写 18 岁域外。
8. 是否存在 LLM NarrativeService。
9. 是否有隐藏真名泄露到 UI/日志的风险。
10. src/sim/** 是否与这些局外系统耦合。

运行：

npm run typecheck
npm test
npm run build
npm run validate:data
npm run check:forbidden

最终回复：

- 审计目录
- 测试结果
- 当前实现阶段
- 下一个建议 prompt
- src/sim/** 是否未改
