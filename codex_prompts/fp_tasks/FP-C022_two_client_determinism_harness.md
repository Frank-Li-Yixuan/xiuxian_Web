# FP-C022_two_client_determinism_harness — 实现 Two-client 确定性同步 Harness

## Objective
实现 Two-client 确定性同步 Harness。

## Stop condition
完成本任务列出的范围、通过验收命令、提交变更摘要后停止。不要提前进入下一个 FP 任务。

## Read first
- `docs_packages/04_netcode_sync/docs/online_sync_technical_design_v0.1.md`
- `docs_packages/04_netcode_sync/data/netcode/desync_test_scenarios.v0.1.json`

## Allowed scope
- `src/net/LockstepHarness.ts`
- `src/net/SnapshotManager.ts`
- `src/net/DesyncDetector.ts`
- `tests/determinism/two-client-stage01.test.ts`

## Required work
1. 同 seed 同输入双客户端 hash 一致
2. 模拟 input delay
3. 每 120 帧 hash
4. 支持快照修正接口占位
5. 不需要真实 WebSocket 服务

## Do not
- 不要扩展 v0.1 范围外系统。
- 不要在 `src/sim/**` 中使用 `Math.random()`、DOM、Canvas、真实时间或音频。
- 不要把灵气经验和修为合并。
- 不要引入外部图片、字体、CDN 或音频素材。
- 不要让 Renderer/UI 修改 gameplay state。

## Acceptance commands
```bash
npm run test:determinism
```
```bash
npm test -- two-client-stage01
```

## Final response format for Codex
- Changed files
- Commands run and result
- Tests added
- Risks / follow-ups
