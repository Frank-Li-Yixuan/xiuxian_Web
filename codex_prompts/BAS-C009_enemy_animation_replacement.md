# BAS-C009：人物/敌人动画接入

## 目标

把敌人和玩家从几何占位改为 sprites / sprite sheets。

## 任务

1. SpriteEntityRenderer：
   - 支持 idle/move/attack/hit/death 动画。
   - 根据 enemy type 映射 sprite asset。
   - 没有 sprite 时 fallback 到当前几何形。

2. 玩家：
   - idle hover。
   - move lean。
   - cast flash。
   - hit flash。
   - soul form 显示。

3. 敌人：
   - 山魈、狼妖、邪修残影、石甲妖至少有不同外观。
   - 狼妖冲锋预警更明显。
   - 邪修施法前有蓄光。
   - 石甲妖受击有重甲火花。

## 验收

- 不同敌人一眼能分辨。
- 动画不会让 hitbox 误判。
- fallback 正常。
- 不改 sim。
