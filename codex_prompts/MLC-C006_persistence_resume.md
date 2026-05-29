# MLC-C006：半年选择存档与恢复

目标：人生模拟在半年选择节点可中途退出并恢复。

任务：
1. 将 PendingMajorChoiceState 存入 Profile。
2. 若未选择，恢复后显示相同事件和选项。
3. 若已选择但未继续，恢复后显示相同结果，不重 roll。
4. 若已结算并继续，pendingChoice 清除。

测试：
- 生成 pending 后保存恢复一致。
- 选择后保存恢复 outcome 一致。
- 不允许刷新页面刷结果。
