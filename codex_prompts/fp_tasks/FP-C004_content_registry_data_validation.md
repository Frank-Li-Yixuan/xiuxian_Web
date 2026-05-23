# FP-C004_content_registry_data_validation — 实现 ContentRegistry 与 v0.1 JSON 数据校验

## Objective
实现 ContentRegistry 与 v0.1 JSON 数据校验。

## Stop condition
完成本任务列出的范围、通过验收命令、提交变更摘要后停止。不要提前进入下一个 FP 任务。

## Read first
- `AGENTS.md`
- `PROJECT_DOCUMENT_INDEX.md`
- `docs_packages/01_foundation_vertical_slice/src/types/combat-data.ts`
- `docs_packages/05_engineering_codex_plan/docs/testing_and_ci_strategy_v0.1.md`

## Allowed scope
- `src/sim/content/ContentRegistry.ts`
- `src/sim/content/DataValidator.ts`
- `src/sim/content/ContentHash.ts`
- `tools/validate-data.ts`
- `tests/content/content-registry.test.ts`
- `data/**`

## Required work
1. 加载 data/**/*.json
2. 稳定排序
3. 校验 id 唯一和基础跨表引用
4. 生成 contentHash
5. 错误输出包含文件、字段路径、原因

## Do not
- 不要扩展 v0.1 范围外系统。
- 不要在 `src/sim/**` 中使用 `Math.random()`、DOM、Canvas、真实时间或音频。
- 不要把灵气经验和修为合并。
- 不要引入外部图片、字体、CDN 或音频素材。
- 不要让 Renderer/UI 修改 gameplay state。

## Acceptance commands
```bash
npm run validate:data
```
```bash
npm test -- content-registry
```

## Final response format for Codex
- Changed files
- Commands run and result
- Tests added
- Risks / follow-ups
