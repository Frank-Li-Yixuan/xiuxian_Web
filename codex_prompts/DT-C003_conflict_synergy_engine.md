# DT-C003：互斥、共鸣与相冲引擎

目标：实现命格组合规则。

任务：
1. 新建 `DestinyCombinationEngine.ts`。
2. 实现 `hasHardExclusive(traitIds)`。
3. 实现 `getSynergies(traitIds)`。
4. 实现 `getSoftConflictWarnings(traitIds, tags)`。
5. 生成结果中写入 synergies 和 warnings。
6. 添加测试覆盖典型组合。

验收：
- 天妒英才 + 大器晚成不能同时出现。
- 苟道至尊 + 以战养战不能同时出现。
- 天妒英才 + 劫雷亲和识别共鸣。
- 废灵逆命 + 百折不摧识别共鸣。
