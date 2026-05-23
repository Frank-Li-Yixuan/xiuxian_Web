# FP-C024_first_playable_rc — First Playable RC 验收与收尾

## Objective
First Playable RC 验收与收尾。

## Stop condition
完成本任务列出的范围、通过验收命令、提交变更摘要后停止。不要提前进入下一个 FP 任务。

## Read first
- `docs_packages/08_first_playable_acceptance/docs/release_candidate_checklist_v0.1.md`
- `docs_packages/08_first_playable_acceptance/data/acceptance/acceptance_checklist.v0.1.json`

## Allowed scope
- `docs/first_playable_rc_report.md`
- `tests/**`
- `package scripts`

## Required work
1. 运行全部验收命令
2. 整理阻塞 Bug
3. 确认 G0-G8 gate
4. 生成 RC 报告
5. 不要新增大系统

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
```bash
npm run validate:data
```
```bash
npm run check:forbidden
```
```bash
npm run test:determinism
```
```bash
npm run test:headless:stage01
```

## Final response format for Codex
- Changed files
- Commands run and result
- Tests added
- Risks / follow-ups
