# 测试与验收 v0.1

## 核心功能验收

```text
1. 创建角色确认后进入 LifeSimulationScreen。
2. LifeSimulationState 初始化成功。
3. 月度事件可自动推进。
4. 每 6 个月暂停为重大选择。
5. 选择结算能修改状态。
6. 玩法插曲候选可以手动或自动推演。
7. 结果能回写人生状态。
8. 阶段总结按年龄阶段触发。
9. 216 月后进入成年节点 pending。
10. 刷新后能恢复到当前月/当前选择/当前插曲结果。
```

## 防泄露验收

```text
创建页、月度日志、半年选择、阶段总结均不能显示隐藏命 trueName。
除非 revealState 为 revealed。
```

## 可玩性验收

```text
标准速度完整人生 8–12 分钟。
快速模式 4–6 分钟。
玩家每 30–60 秒有一次 meaningful pause 或明显反馈。
玩法插曲不超过 8–12 次候选。
```

## 预设角色验收

至少测试：

```text
药铺丹道型
破落剑魄型
阴梦魂修型
山村雷劫型
苟道潜修型
魔心禁忌型
```

每种应产生不同人生主线与事件倾向。

## 命令

```text
npm run typecheck
npm test
npm run build
npm run validate:data
npm run check:forbidden
```

若新增验证脚本：

```text
npm run validate:life-playable
```
