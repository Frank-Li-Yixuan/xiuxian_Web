# SIM-C010：总 E2E 与质量门槛

## 目标

验证新建存档到成年节点 pending 的完整 SIM-REDESIGN 链路。

## 硬约束

- 先阅读 `codex_prompts/00_GLOBAL_PREFIX_SIM_REDESIGN.md`。
- 不要恢复旧 PNG 控件 UI。
- 不要执行废弃的 `CC-C001~CC-C006`。
- 除非本任务明确要求，不修改 `src/sim/**`。
- 不要让 LLM 决定数值或规则结果。

## 任务


1. 建立 E2E 测试或手动验收脚本。
2. 截图：创建角色、重 Roll、人生模拟、半年选择、插曲提示、阶段总结、成年节点。
3. 运行全部测试。
4. 输出 artifacts/sim-redesign-e2e-YYYY-MM-DD/。


## 验收


- 完整链路跑通。
- 不泄露隐藏真名。
- 不依赖 debug_run_config。
- 通过 RC 前置门槛。


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
