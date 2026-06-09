# SIM-C011：E2E 与 RC Gate

## 目标

验证 SIM-REDESIGN 主链是否可作为下一阶段实现基础。

## 路径

```text
主菜单
  → 新游戏
  → 存档位
  → 角色创建
  → 确认此生
  → 人生模拟
  → 半年选择
  → 玩法插曲候选 / 自动推演
  → 阶段总结
  → 成年节点
  → 首个试炼 pending 或洞府 pending
```

## 任务

1. 写 E2E 脚本或手动验收报告。
2. 截图：
   - 主菜单
   - 存档页
   - 角色创建
   - 重 Roll / 锁定
   - 人生模拟播放中
   - 半年选择
   - 插曲提示
   - 阶段总结
   - 成年节点
   - 试炼/洞府 pending
3. 运行：

```text
npm run typecheck
npm test
npm run build
npm run validate:data
npm run check:forbidden
```

4. 检查：

```text
hidden trueName 不泄露
src/sim/** 未非法修改
不使用 generated PNG 控件
不依赖真实 LLM
不读 debug_run_config 作为正式首战输入
```

## 输出

```text
artifacts/sim-redesign-e2e-YYYY-MM-DD/
  E2E_REPORT.md
  RC_GATE_REPORT.md
  BLOCKERS.md
  SCREENSHOT_INDEX.md
  screenshots/
```

## 最终回复

- 通过/阻塞
- 截图路径
- 测试结果
- Blocker 清单
- 下一阶段建议
