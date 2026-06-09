执行 DEM-C005：天命人生显化 Hooks。

目标：
把 life_manifestation_hooks.v0.1.json 接入人生模拟事件系统前的 hook 层。

要求：
1. DestinySelectionState 能输出 manifestation hooks。
2. 每个核心天命按年龄阶段输出可用 hooks。
3. 输出给 LM/MLC 的是结构化 hook，不直接生成数值。
4. 不泄露 hidden trueName。
5. 不改 src/sim/**。

验收：
- 天妒英才输出 early_speech_or_scripture、fever_after_insight 等 hooks。
- 苟道至尊输出 hidden/seclusion hooks。
- 废灵逆命输出 failure/reversal hooks。
- 魔心暗种输出 forbidden/demon dream hooks。

运行：
npm run typecheck
npm test
