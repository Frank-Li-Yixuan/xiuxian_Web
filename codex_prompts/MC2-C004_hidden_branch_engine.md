# MC2-C004：隐藏分支与命/禁选项解析

目标：实现 hiddenBranch 解析，防止隐藏信息泄露。

任务：
1. 读取 hidden_branch_rules。
2. 根据 signals 判断隐藏选项是否出现。
3. UI 只能显示 visibleHint。
4. internalTrueName 永远不进入 visible ViewModel。
5. hiddenSuccess 必须检查 requiredSignals。
6. 添加 non-leakage tests。

运行：
npm run typecheck
npm test
npm run build
