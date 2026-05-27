# 《战斗资源重制验收与截图门槛 v0.1》

## 1. 必须截图

每次进入 RC 前生成：

```text
artifacts/combat-asset-pass/YYYY-MM-DD/
  01_asset_preview_2d.png
  02_audio_preview.png
  03_initial_battle.png
  04_projectiles_pickups.png
  05_hit_death_vfx.png
  06_spell_vfx.png
  07_pill_artifact_treasure_vfx.png
  08_enemy_animation.png
  09_boss_warning.png
  10_background_parallax.png
  11_high_density_stress.png
```

## 2. 自动测试

```text
npm run validate:2d-assets
npm run validate:audio-assets
npm run typecheck
npm test
npm run build
npm run check:forbidden
```

## 3. 手动验收

### 读弹

```text
敌弹和玩家特效不混淆
敌弹白芯始终可见
雷劫预警清楚
hitbox 不被遮挡
```

### 爽感

```text
击杀有 burst
精英死亡有震屏和音效
Boss 阶段转换有警告
掉落吸附有多巴胺
法术释放有仪式感
```

### 性能

```text
常规 60 FPS
高压 ≥ 50 FPS
音效不爆
VFX 不无限堆积
```

### 授权

```text
所有资源在 manifest 中
所有 CC-BY 在 attribution 中
无 NC/ND/Unknown
```

## 4. 阻塞问题

任一存在，不允许合并：

```text
资源来源不明
NC/ND 资源进入项目
src/sim/** 被修改
战斗帧率明显下降
敌弹不可读
音效爆音
没有预览页
无法定位某资源来源
```
