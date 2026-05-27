# BAS-C006：子弹、掉落、磁吸轨迹资源化

## 目标

先替换最影响观感和手感的对象：子弹与掉落物。

## 范围

- 玩家 projectile 视觉。
- 敌弹视觉。
- 灵气球/真元球/材料掉落视觉。
- 掉落物生命周期动画。
- 不改掉落逻辑。

## 要求

1. ProjectileSkinRenderer：
   - 根据 projectile tags / source 映射 assetId。
   - 敌弹必须白芯 + 危险外圈。
   - 玩家飞剑/雷弹与敌弹颜色明显区分。
   - 高密度下支持简化绘制。

2. PickupPresentationSystem：
   - spawnBurst。
   - floatIdle。
   - magnetAcquire。
   - magnetTravel。
   - collectFlash。
   - 灵气/真元/稀有材料不同颜色和音效 hook。

3. 加 `/dev/combat-asset-playground` 场景：
   - 显示 100 个敌弹。
   - 显示掉落磁吸。
   - 显示不同 projectile skin。

## 验收

- 1-1 战斗里子弹不再是简单几何圆点。
- 掉落物会弹出、漂浮、磁吸。
- 敌弹读弹清楚。
- 性能稳定。
- 不改 sim。
