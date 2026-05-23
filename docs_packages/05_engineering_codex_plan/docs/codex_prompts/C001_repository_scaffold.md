# Codex Prompt C001 — 仓库骨架

请在当前仓库创建 TypeScript + Vite + Vitest 工程骨架。

必须先阅读：

- `AGENTS.md`
- `docs/engineering_architecture_and_codex_plan_v0.1.md`
- `docs/module_boundaries_v0.1.md`

请只完成以下内容：

1. 创建 `package.json`，包含：
   - `dev`
   - `build`
   - `typecheck`
   - `test`
   - `test:determinism`
   - `validate:data`
   - `check:forbidden`
2. 创建 `tsconfig.json`，开启 strict。
3. 创建 `vite.config.ts` 和 `vitest.config.ts`。
4. 创建推荐目录结构中的空目录和必要 `.gitkeep`。
5. 创建 `src/app/DevBootstrap.ts`，只输出启动占位信息。
6. 创建一个最小 smoke test。

不要实现 gameplay。不要实现渲染。不要添加外部图片、字体或 CDN。

验收：

```bash
npm run typecheck
npm test
```
