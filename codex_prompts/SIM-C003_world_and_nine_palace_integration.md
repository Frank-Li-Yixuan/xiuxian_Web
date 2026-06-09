# SIM-C003：世界观与九宫命盘接入

## 目标

接入 WORLD 与 NPF，使角色生成具有三才/阴阳/五行/派生评分。

## 硬约束

- 先阅读 `codex_prompts/00_GLOBAL_PREFIX_SIM_REDESIGN.md`。
- 不要恢复旧 PNG 控件 UI。
- 不要执行废弃的 `CC-C001~CC-C006`。
- 除非本任务明确要求，不修改 `src/sim/**`。
- 不要让 LLM 决定数值或规则结果。

## 任务


1. 实现 NinePalaceEvaluation 计算。
2. 将 OAG 输出升级为 OpeningInnateDraft + NinePalaceEvaluation。
3. 输出 destiny/root/lifeEvent/mode bias tags。
4. 更新角色创建 ViewModel 显示派生评分或调试信息。


## 验收


- 低悟性低灵感样例不会标记为天才倾向。
- 高悟性低寿元样例产生 heaven_attention / illness 倾向。
- 同 seed 可复现。


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
