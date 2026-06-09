# E2E-SIM-001：Life Simulation Redesign Full Flow

目标：验证 SIM-REDESIGN 首版完整链路。

路径：

```text
主菜单
  → 新的游戏
  → 存档
  → 创建角色
  → 重 Roll / 锁定 / 确认此生
  → LifeSimulationScreen
  → 0–18 岁自动推进
  → 至少 1 次半年选择
  → 至少 1 次插曲自动推演或手动插曲
  → 阶段总结
  → 成年节点 pending
```

要求：

1. 不泄露 hidden trueName。
2. 角色创建天命合理性规则生效。
3. 人生事件受角色命盘影响。
4. 半年选择来自过去事件。
5. 插曲候选受频率预算控制。
6. 存档可恢复。
7. LLM disabled 时完整可玩。

运行：

npm run typecheck
npm test
npm run build
npm run validate:data
npm run check:forbidden

输出：

artifacts/e2e-sim-redesign-YYYY-MM-DD/
  E2E_REPORT.md
  SCREENSHOT_INDEX.md
  screenshots/

截图：

- main menu
- save slot
- character creation
- life sim monthly playback
- major choice
- interlude prompt
- stage summary
- adult node pending
