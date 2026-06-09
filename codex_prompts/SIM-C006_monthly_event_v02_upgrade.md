# SIM-C006：月度事件 v0.2 升级

## 目标

用 ME2 覆盖旧月度事件池和权重系统。

## 任务

1. 接入 `monthly_event_pool.v0.2.json`。
2. 实现 NarrativeDensityController。
3. 实现 MonthlyEventSelectorV02。
4. 月度事件读取：
   - 九宫命盘
   - 天命
   - 身世 / 隐藏命 / 随身物
   - 人生主线
   - 事件线
   - 阶段
   - 插曲预算
5. 事件输出：
   - visibleEffects
   - hiddenEffects
   - hooks
   - interludeCandidate
   - stageTransitionSignal
6. 日志不得泄露隐藏真名。

## 验收

- 216 月可跑完。
- 同 seed 可复现。
- 不同预设角色事件分布不同。
- 叙事密度预算生效。
- 主线长期不推进时权重提高。

## 命令

```text
npm run typecheck
npm test
npm run build
```
