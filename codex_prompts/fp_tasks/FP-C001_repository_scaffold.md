# FP-C001_repository_scaffold — 创建 TypeScript + Vite + Vitest 仓库骨架

## Objective
创建 TypeScript + Vite + Vitest 仓库骨架。

## Stop condition
完成本任务列出的范围、通过验收命令、提交变更摘要后停止。不要提前进入下一个 FP 任务。

## Read first
- `AGENTS.md`
- `START_HERE.md`
- `PROJECT_DOCUMENT_INDEX.md`
- `docs_packages/05_engineering_codex_plan/docs/engineering_architecture_and_codex_plan_v0.1.md`
- `docs_packages/05_engineering_codex_plan/docs/module_boundaries_v0.1.md`

## Allowed scope
- `package.json`
- `tsconfig.json`
- `vite.config.ts`
- `vitest.config.ts`
- `src/app/DevBootstrap.ts`
- `tests/unit/smoke.test.ts`
- `目录结构`

## Required work
1. 创建项目基础命令：dev/build/typecheck/test/validate:data/check:forbidden/test:determinism/test:headless:stage01
2. 创建推荐目录结构和 .gitkeep
3. 加入最小 smoke test
4. 不要实现 gameplay 或 renderer

## Do not
- 不要扩展 v0.1 范围外系统。
- 不要在 `src/sim/**` 中使用 `Math.random()`、DOM、Canvas、真实时间或音频。
- 不要把灵气经验和修为合并。
- 不要引入外部图片、字体、CDN 或音频素材。
- 不要让 Renderer/UI 修改 gameplay state。

## Acceptance commands
```bash
npm run typecheck
```
```bash
npm test
```

## Final response format for Codex
- Changed files
- Commands run and result
- Tests added
- Risks / follow-ups
