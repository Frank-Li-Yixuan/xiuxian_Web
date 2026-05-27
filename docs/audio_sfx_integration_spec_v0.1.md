# 《战斗音效接入与混音规范 v0.1》

## 1. 音效目标

音效要让玩家感到：

```text
我发射了
我命中了
敌人死了
我吃药了
法术生效了
危险来了
东西被吸进来了
```

## 2. Mix Groups

| 组 | 音量建议 | 用途 |
|---|---:|---|
| ui | 0.6 | 菜单、按钮、卡牌 |
| player_fire | 0.35 | 玩家普攻，需低调 |
| enemy_fire | 0.3 | 敌人发弹 |
| hit | 0.45 | 命中反馈 |
| explosion | 0.7 | 死亡/爆炸 |
| spell | 0.75 | 主动法术 |
| pill | 0.55 | 丹药 |
| pickup | 0.4 | 收集 |
| warning | 0.85 | Boss/雷劫 |
| ambience | 0.35 | 背景氛围 |

## 3. 防爆音规则

必须实现：

```text
同一 sfx cooldownMs
同一 mixGroup maxInstances
同一帧合并相同 hit 音效
距离/重要性优先
小怪死亡音效合批
Boss/雷劫警告高优先级
```

## 4. 事件映射

| 事件 | 音效 |
|---|---|
| player_projectile_fire | sword_whoosh_light |
| enemy_projectile_fire | enemy_shoot_soft |
| projectile_hit_enemy | hit_flesh / hit_armor |
| enemy_killed_small | pop_burst |
| elite_killed | heavy_burst |
| spell_five_thunder_cast | thunder_cast |
| spell_five_thunder_chain | lightning_chain |
| spell_bagua_sword_ring | metal_ring_spin |
| pill_rejuvenation | healing_breath |
| pill_burning_blood | blood_flame |
| pickup_qi | qi_pickup_soft |
| pickup_material_rare | rare_pickup_chime |
| boss_warning | danger_gong |
| tribulation_warning | thunder_warning |

## 5. 文件格式

优先：

```text
ogg
wav
```

浏览器运行时可以用 ogg；开发编辑保留 wav 可选。

## 6. 验收

```text
高密度战斗不爆音
拾取音不会刷屏刺耳
Boss/雷劫警告能被听见
法术释放有分量
普通飞剑不烦人
```
