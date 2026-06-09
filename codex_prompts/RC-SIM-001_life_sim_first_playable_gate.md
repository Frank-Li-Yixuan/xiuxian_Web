# RC-SIM-001：Life Simulation First Playable Gate

目标：判断人生模拟是否达到首版可玩。

检查项：

## 角色创建

- 页面是命盘推演台，不是旧立绘页。
- 九宫、灵根、天命、身世、随身物可理解。
- 重 Roll / 锁定 / 天机推演可用。
- 天命成立/变异规则生效。

## 人生模拟

- 216 个月可完整推进。
- 每 6 个月选择一次。
- 月度事件有主线倾向，不是随机流水账。
- 阶段总结清楚。
- 至少 1 个插曲入口和回写。
- 存档可恢复。

## 叙事安全

- hidden trueName 不提前泄露。
- LLM disabled 可运行。
- LLM fallback 可运行。

## 性能/UI

- 1920×1080 可用。
- 1366×768 可用。
- 速度控制可用。
- 长日志可滚动。

输出：

artifacts/rc-sim-first-playable-YYYY-MM-DD/
  RC_GATE_REPORT.md
  BLOCKERS.md
  POLISH_LIST.md
  SCREENSHOT_INDEX.md
