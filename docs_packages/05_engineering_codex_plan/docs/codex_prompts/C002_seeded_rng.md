# Codex Prompt C002 — SeededRng

请实现确定性随机数模块。

范围限定：

- `src/sim/core/SeededRng.ts`
- `tests/unit/seeded-rng.test.ts`

功能要求：

1. 支持通过 seed 初始化。
2. 支持 stream name 派生独立 RNG。
3. 支持：
   - `nextUint32()`
   - `nextFloat01()`
   - `rangeInt(min, maxInclusive)`
   - `rangeFloat(min, max)`
   - `bool(probability)`
   - `pickWeighted(items)`
   - `fork(streamName)`
   - `getState()` / `setState()`
4. 不允许调用 `Math.random()`。
5. 输出必须跨运行稳定。

验收测试：

- 同 seed 序列完全一致。
- 不同 seed 序列不同。
- fork 后 stream 相互独立。
- pickWeighted 在固定 seed 下稳定。
- state restore 后继续序列一致。
