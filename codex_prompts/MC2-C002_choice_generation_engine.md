# MC2-C002：半年选择生成器 v2

目标：根据过去六个月窗口、主线、事件线、命盘标签生成 PendingMajorChoiceStateV02。

任务：
1. 实现 buildSixMonthWindowSummary。
2. 实现 selectMajorChoiceEventV02。
3. 实现 buildMajorChoiceOptionsV02。
4. 至少生成 3 个选项，最多 5 个。
5. 支持隐藏/命/禁选项条件判断。
6. 支持 interludeCandidateId。
7. 同 seed 可复现。
8. 不泄露隐藏真名。

运行：
npm run typecheck
npm test
npm run build
