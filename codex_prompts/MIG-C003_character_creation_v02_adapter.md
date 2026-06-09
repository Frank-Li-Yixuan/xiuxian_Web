# MIG-C003：Character Creation v0.2 Adapter

目标：在不推翻 CCUI2 页面和现有 OAG/DT/HFO 的情况下，加入 v0.2 适配层。

任务：

1. 新增 CharacterCreationV02Adapter。
2. 输入现有 draft：OpeningInnateDraft、DestinySelectionState、OriginFateDraft。
3. 生成：
   - NinePalaceEvaluation
   - DestinyEvaluationResult[]
   - OriginFateNarrativeState
   - LifeStorylineInitialScores
   - LifeStageInitialState
4. 更新 CharacterCreationViewModelBuilder，显示：
   - 九宫评价
   - 天命成立 / 变异结果
   - 共鸣 / 相冲
   - 身世叙事链摘要
   - 随身物生命周期摘要
   - 人生主线倾向预览
5. 页面不显示隐藏 trueName。
6. 如果某天命变异，卡牌显示最终变异命格，并在详情里说明“原始天机产生偏转”，但不暴露 debug id。

禁止：

- 不恢复旧 PNG UI。
- 不改 src/sim/**。
- 不直接进入 LifeSimulation。

测试：

- 低悟性低灵感 + 天妒英才 -> 妄承天机。
- 高悟性低寿元 -> 天妒英才成立。
- 高资质 + 废灵逆命 -> 天骄遭厄。
- hidden trueName 不在 ViewModel visible fields。

运行：

npm run typecheck
npm test
npm run build
