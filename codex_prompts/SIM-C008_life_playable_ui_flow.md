# SIM-C008：18 年人生模拟首版 UI 与流程

## 目标

实现可玩的 LifeSimulationScreen。

## 任务

1. 进入 LifeSimulationScreen 后初始化 LifeSimulationPlayableState。
2. 支持月度自动播放。
3. 每 6 个月暂停为重大选择。
4. 支持：

```text
暂停 / 继续
慢速 / 标准 / 快速
播放到下一选择
播放到阶段结束
```

5. 显示：
   - 年龄
   - 年龄阶段
   - 修行身份阶段
   - 九宫变化
   - 月度日志
   - 人生主线进度
   - 随身物亲和
   - 隐藏预兆
   - 半年选择
   - 插曲提示
   - 阶段总结

6. 首版至少支持一个手动插曲入口：雨夜后山 STG；其他插曲可自动推演。
7. 216 月后进入 adult_node_pending。

## 验收

- 创建角色确认后进入人生模拟。
- 216 月可跑完。
- 每半年停顿。
- 可保存恢复。
- 不泄露隐藏真名。
- 1366×768 可用。

## 命令

```text
npm run typecheck
npm test
npm run build
```
