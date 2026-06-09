执行 DEM-C006：天命 v2 与角色创建页面集成。

前提：
CCUI2 页面已使用 DOM 化命盘推演台。
不要恢复旧 CC 页面，不要使用 generated PNG 控件。

目标：
让角色创建页显示 v2 天命结果：
- 成立条件后的命格
- 变异命格
- 共鸣提示
- 软冲突提示
- Debug 中可见变异来源

要求：
1. CharacterCreationController 使用 v2 eligibility/mutation/conflict 引擎。
2. 命格卡显示最终命格，不显示被变异前的废弃候选。
3. 详情抽屉显示共鸣/冲突/人生影响/模式投射。
4. 不泄露隐藏血脉真名。
5. 不修改 src/sim/**。

运行：
npm run typecheck
npm test
npm run build
