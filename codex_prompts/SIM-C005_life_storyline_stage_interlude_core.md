# SIM-C005：人生主线、阶段转化与玩法插曲核心

## 目标

实现人生模拟的三个核心状态：

```text
LifeStorylineState
LifeStageState
LifeInterludeState
```

## 任务

1. StorylineScoringEngine：
   - 寒门读书线
   - 药铺丹道线
   - 猎户练武线
   - 道观香火线
   - 破落修士遗脉线
   - 山村灾劫线
   - 阴梦魂修线
   - 系统前兆线

2. EventThreadEngine：
   - seed / omen / development / crisis / resolution
   - progress / tension / clarity / risk

3. LifeStageEngine：
   - 年龄阶段
   - 修行身份阶段
   - 入道节点
   - 成年路径评分

4. InterludeTriggerEngine：
   - STG
   - Horde
   - DBG
   - FormationAuto
   - TextCheck

5. 不实现具体玩法，只生成 interludeCandidate 和 runConfig placeholder。

## 验收

- 药铺角色激活丹道主线。
- 破落修士后代激活遗脉线。
- 雷灵根天妒角色激活系统前兆/灾劫。
- 0–3 岁不会生成真实玩法插曲。
- 插曲预算生效。

## 命令

```text
npm run typecheck
npm test
npm run build
```
