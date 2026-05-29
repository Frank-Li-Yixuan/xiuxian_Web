# MLC-C003：成功判定引擎

目标：玩家选择某个选项后，计算 outcome tier。

任务：
1. 实现 resolveMajorChoiceOption(lifeState, pendingChoice, optionId, rng)。
2. 实现 score 公式：
   d100 + statScore + skillScore + fortune/heart + modifiers - difficulty - penalties。
3. 实现 outcome 分层：
   failure / mixed / success / great / great_plus / hidden。
4. 实现隐藏成功条件检查。
5. 输出 MajorChoiceResolution。

规则：
- 同 seed / rngState 下结果可复现。
- 失败也必须有结果。
- hidden outcome 不得泄露隐藏血脉真名。

测试：
- 高属性提高成功率。
- wound/heartDemon 会降低成功率。
- forbidden 选项失败代价更高。
- hidden outcome 只有满足条件才触发。
