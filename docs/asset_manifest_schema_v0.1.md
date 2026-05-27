# 《2D 与音效 Asset Manifest 规范 v0.1》

## 1. 2D Manifest

路径：

```text
public/assets/2d/manifest.v0.1.json
```

根结构：

```json
{
  "version": "0.1",
  "assets": {
    "vfx.explosion.small_01": {
      "path": "/assets/2d/combat/vfx/explosion_small_01.png",
      "type": "spriteSheet",
      "category": "explosion",
      "sourceName": "OpenGameArt",
      "sourceUrl": "https://...",
      "author": "Author",
      "license": "CC0",
      "attributionRequired": false,
      "frameWidth": 128,
      "frameHeight": 128,
      "frameCount": 16,
      "fps": 24,
      "loop": false,
      "blendMode": "screen",
      "anchor": { "x": 0.5, "y": 0.5 },
      "recommendedScale": 1,
      "required": true,
      "notes": ""
    }
  }
}
```

## 2. 类型说明

| type | 说明 |
|---|---|
| image | 静态图片 |
| spriteSheet | 固定帧宽高序列帧 |
| atlas | 图片 + JSON atlas |
| parallaxLayer | 背景分层 |
| icon | UI/技能/资源图标 |

## 3. blendMode

建议支持：

```text
normal
additive
screen
multiply
lighter
```

VFX 通常用 `screen` 或 `lighter`。

## 4. Audio Manifest

路径：

```text
public/assets/audio/manifest.v0.1.json
```

示例：

```json
{
  "version": "0.1",
  "assets": {
    "sfx.hit.enemy_light_01": {
      "path": "/assets/audio/combat/hit_enemy_light_01.ogg",
      "category": "hit",
      "mixGroup": "combat",
      "sourceName": "Freesound",
      "sourceUrl": "https://...",
      "author": "Author",
      "license": "CC0",
      "attributionRequired": false,
      "durationMs": 240,
      "volume": 0.55,
      "cooldownMs": 35,
      "maxInstances": 4,
      "required": true,
      "notes": ""
    }
  }
}
```

## 5. 校验规则

2D 资源校验：

```text
文件存在
license 存在且允许
sourceUrl 存在
spriteSheet 必须有 frameWidth/frameHeight/frameCount/fps
单文件不超过 20MB
大型背景不超过 4096×4096
```

音效校验：

```text
文件存在
license 存在且允许
duration 不超过合理长度
volume/cooldown/maxInstances 存在
同类音效数量不为 0
```
