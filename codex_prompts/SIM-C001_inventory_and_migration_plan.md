# SIM-C001：当前实现盘点与迁移计划

## 目标

只读盘点当前 OAG/DT/HFO/CCUI2/LM/MLC/A18/BAS/STG 真实实现状态，生成迁移计划。

## 硬约束

- 先阅读 `codex_prompts/00_GLOBAL_PREFIX_SIM_REDESIGN.md`。
- 不要恢复旧 PNG 控件 UI。
- 不要执行废弃的 `CC-C001~CC-C006`。
- 除非本任务明确要求，不修改 `src/sim/**`。
- 不要让 LLM 决定数值或规则结果。

## 任务


1. 扫描当前代码与 prompt 文件夹。
2. 识别已实现、未实现、旧版、废弃模块。
3. 生成 artifacts/sim-redesign-inventory-YYYY-MM-DD/。
4. 输出：CURRENT_STATE.md、PROMPT_STATUS.md、MIGRATION_TODO.md、RISK_REGISTER.md。
5. 不修改源码。


## 验收


- 报告列出旧 CC-C 废弃状态。
- 报告列出 CCUI2 当前状态。
- 报告列出 OAG/DT/HFO 是否已接入真实页面。
- src/sim 无改动。


## 必跑命令

```text
npm run typecheck
npm test
npm run build
npm run validate:data
npm run check:forbidden
```

如果某命令不存在，记录为 missing，不要临时发明命令。

## 最终回复

- 修改文件列表
- 测试结果
- `git diff --name-only -- src/sim` 结果
- 手动验证步骤
- 已知问题
