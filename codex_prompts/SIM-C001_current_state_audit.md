# SIM-C001：当前状态审计

你正在执行 SIM-REDESIGN 总集成的第一步。

## 目标

只读审计当前项目，确认哪些系统已经完成，哪些只是文档/占位，哪些需要迁移。

## 硬约束

- 不修改源码。
- 不实现功能。
- 不重构。
- 只在 `artifacts/sim-redesign-audit-YYYY-MM-DD/` 下生成报告。
- 不修改 `src/sim/**`。

## 审计范围

检查：

```text
BAS 系列是否已完成
CCUI2 是否已完成
OAG 是否已完成
DT 是否已完成
HFO 是否已完成
NPF/DEM/HFO2/LST/LPI/LSTG/ME2/MC2/LLM/LFP 是否只是文档还是已接代码
LM/MLC/A18 是否旧版实现
主菜单/存档/创建角色/人生模拟/战斗入口当前可运行状态
```

## 输出

创建：

```text
artifacts/sim-redesign-audit-YYYY-MM-DD/
  AUDIT_REPORT.md
  MODULE_STATUS_MATRIX.json
  CURRENT_ENTRY_FLOW.md
  BLOCKERS.md
  NEXT_STEP_RECOMMENDATION.md
```

## 命令

运行存在的命令：

```text
npm run typecheck
npm test
npm run build
npm run validate:data
npm run check:forbidden
npm run validate:combat-assets
```

如果命令不存在，记录 missing。

## 最终回复

包含：

- 报告路径
- 测试结果
- `src/sim/**` 是否未修改
- 建议是否进入 SIM-C002
