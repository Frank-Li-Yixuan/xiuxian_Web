# FP-C003_fixed_tick_and_frame_input — 实现固定 60 FPS 逻辑帧与 FrameInput

## Objective
实现固定 60 FPS 逻辑帧与 FrameInput。

## Stop condition
完成本任务列出的范围、通过验收命令、提交变更摘要后停止。不要提前进入下一个 FP 任务。

## Read first
- `AGENTS.md`
- `docs_packages/04_netcode_sync/docs/online_sync_technical_design_v0.1.md`

## Allowed scope
- `src/sim/SimConstants.ts`
- `src/sim/FixedTickRunner.ts`
- `src/sim/input/FrameInput.ts`
- `src/sim/input/InputBuffer.ts`
- `tests/unit/fixed-tick-runner.test.ts`
- `tests/unit/input-buffer.test.ts`

## Required work
1. SIM_FPS=60
2. 所有 gameplay 时间用 frame
3. 实现 stepOneFrame/runFrames/pause/resume
4. 实现 FrameInput bitmask、inputDelayFrames 基础缓冲

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
npm test -- fixed-tick-runner
```
```bash
npm test -- input-buffer
```

## Final response format for Codex
- Changed files
- Commands run and result
- Tests added
- Risks / follow-ups
