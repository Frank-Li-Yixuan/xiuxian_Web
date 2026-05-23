# Codex Prompt C003 — FixedTickRunner

请实现固定 60 FPS 逻辑帧推进器。

范围限定：

- `src/sim/SimConstants.ts`
- `src/sim/FixedTickRunner.ts`
- `tests/unit/fixed-tick-runner.test.ts`

要求：

1. `SIM_FPS = 60`。
2. 支持 `stepOneFrame()`。
3. 支持 `runFrames(count)`。
4. 支持暂停/恢复。
5. 支持传入 tick callback。
6. 不依赖 `requestAnimationFrame`。
7. 不依赖真实时间推进测试。

验收：

- `runFrames(60)` 调用 tick 60 次。
- 每次 frame index 单调递增。
- 暂停时不推进。
- 恢复后继续原 frame。
