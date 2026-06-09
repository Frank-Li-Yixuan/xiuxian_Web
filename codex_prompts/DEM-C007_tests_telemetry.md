执行 DEM-C007：天命 v2 测试与遥测。

目标：
补充分布、反怪异、互斥、共鸣、变异、UI 非泄露测试。

测试要求：
1. 10000 次生成，主天命品质分布合理。
2. 硬互斥结果为 0。
3. 反怪异规则生效。
4. 变异命格出现率记录。
5. 共鸣出现率记录。
6. 隐藏真名不出现在 UI visible fields。
7. 同 seed 可复现。

输出：
artifacts/destiny-v2-telemetry-YYYY-MM-DD/
  DESTINY_V2_REPORT.md
  distribution.json

运行：
npm run typecheck
npm test
npm run build
