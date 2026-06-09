执行 HFO2-C001：隐藏血脉、身世、随身物 v0.2 数据 Schema 与 Registry。

目标：
接入 data/origin_fate_v02 下的 v0.2 数据，并建立 OriginFateNarrativeRegistry。

范围：
- 只做数据、类型、Registry、校验。
- 不改 UI。
- 不改 src/sim/**。
- 不接人生模拟。
- 不接 18 岁觉醒。

任务：
1. 接入 hidden_fate_definitions.v0.2.json。
2. 接入 origin_storyline_definitions.v0.2.json。
3. 接入 carried_item_narrative_chains.v0.2.json。
4. 接入 reveal_stage_rules.v0.2.json。
5. 接入 omen_phrase_bank.v0.2.json。
6. 接入 origin_item_hidden_synergy_rules.v0.2.json。
7. 添加 TypeScript 类型。
8. 添加数据校验：
   - hidden trueName 不得出现在 omenStages 文本中。
   - 每个 hidden fate 至少有 2 个 omen stage。
   - 每个 item 至少有 obtained / noticed / converted 生命周期。
   - 每个 origin 至少有 storylineBias 和 carriedItemBias。
9. 新增脚本 validate:origin-fate-v02。

运行：
npm run typecheck
npm test
npm run build
npm run validate:origin-fate-v02

最终回复：
- 修改文件
- Registry API
- 数据校验结果
- 是否发现 trueName 泄露
