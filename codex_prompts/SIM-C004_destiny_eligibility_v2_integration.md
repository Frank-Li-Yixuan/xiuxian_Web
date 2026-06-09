# SIM-C004：天命成立与变异集成

## 目标

将 DEM v0.1 覆盖旧 DT 的松散抽取逻辑。

## 硬约束

- 先阅读 `codex_prompts/00_GLOBAL_PREFIX_SIM_REDESIGN.md`。
- 不要恢复旧 PNG 控件 UI。
- 不要执行废弃的 `CC-C001~CC-C006`。
- 除非本任务明确要求，不修改 `src/sim/**`。
- 不要让 LLM 决定数值或规则结果。

## 任务


1. 接入核心天命定义、成立条件、互斥、共鸣、变异规则。
2. 在 DestinyGenerator 中加入 eligibility/mutation resolver。
3. 更新重 Roll / 锁定逻辑。
4. 更新 UI 显示变异命格、共鸣、冲突。


## 验收


- 不合理天妒英才会变异为妄承天机。
- 魔心暗种 + 清净琉璃心可变异为净莲藏影。
- 互斥测试通过。


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
