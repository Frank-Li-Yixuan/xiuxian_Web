# 《战斗资源脱胎换骨计划 v0.1》

## 0. 背景与目标

当前战斗问题不是单一 bug，而是缺少完整表现资产链路：

- 人物/敌人仍像占位图形。
- 子弹种类少，视觉差异弱。
- 命中、受击、死亡、爆炸反馈不足。
- 法宝、丹药、灵宝缺乏可见效果。
- 掉落物不够“活”，缺少弹出、漂浮、旋转、磁吸、入池反馈。
- 音效没有形成“动作—反馈—节奏”的闭环。
- 背景缺少层次，不能支撑关卡推进感。

本计划目标：

> 保持 Canvas 2D 高性能和高读弹优势，使用网上授权清楚的 2D sprites / VFX / audio 资源，把战斗表现提升到精致小厂级别。

## 1. 技术边界

### 1.1 不改确定性模拟

禁止本阶段修改：

```text
src/sim/**
src/combat/** 中影响判定、伤害、掉落、RNG、AI、Boss 时间轴的逻辑
```

资源接入只允许修改：

```text
src/app/**
src/render/**
src/assets/**
src/audio/**
src/dev/**
public/assets/**
scripts/**
```

### 1.2 表现层读取 ViewState / EffectEvent

正确链路：

```text
CombatSimulation
  → ViewState / EffectEvent
  → Presentation Asset Registry
  → CanvasRenderer / VfxRenderer / AudioBus
```

错误链路：

```text
Renderer 修改 SimState
VFX 改碰撞
音效触发游戏逻辑
下载资源直接影响战斗数值
```

## 2. 总体资源分类

### 2.1 视觉资源

| 类别 | 用途 | 推荐格式 | 优先级 |
|---|---|---|---|
| player sprites | 玩家/神魂/御剑占位 | PNG sheet / atlas | P1 |
| enemy sprites | 山魈、狼妖、邪修、石甲妖、虫族 | PNG sheet / atlas | P1 |
| projectiles | 敌弹、玩家弹、法术弹 | PNG | P0 |
| VFX sprite sheets | 爆炸、雷电、剑气、护盾、治疗、清弹 | PNG sheet | P0 |
| pickups | 灵气球、真元球、妖丹、雷髓、玉简 | PNG / sheet | P0 |
| backgrounds | 域外战场、青云山、雷劫、虫巢 | PNG parallax layers | P1 |
| UI combat icons | 法术/丹药/法宝图标 | PNG | P2 |

### 2.2 音效资源

| 类别 | 用途 | 推荐格式 |
|---|---|---|
| UI clicks | 菜单、卡牌、选择 | wav/ogg |
| player fire | 飞剑/法宝普攻 | wav/ogg |
| enemy fire | 敌弹发射 | wav/ogg |
| hit impacts | 命中、护盾、受击 | wav/ogg |
| explosions | 小爆、精英爆、Boss 爆 | wav/ogg |
| spell casts | 五雷、剑阵、红莲、袖里乾坤 | wav/ogg |
| pill consume | 吞丹、炼化、后遗症 | wav/ogg |
| pickup | 灵气、真元、材料吸取 | wav/ogg |
| warnings | Boss、大招、雷劫、系统提示 | wav/ogg |
| ambience | 战场底噪、雷云、洞府灵气 | ogg |

## 3. 推荐资源来源策略

### 3.1 优先来源

1. **Kenney**
   用于：通用 2D/UI/audio/占位资源。优先 CC0。

2. **OpenGameArt**
   用于：VFX、sprites、tilesets、音效。优先 CC0，CC-BY 可用但必须署名；避开 NC/ND/SA/GPL 复杂资源。

3. **itch.io free assets**
   用于：高质量 sprite/VFX 包。必须逐包确认 license。

4. **Freesound**
   用于：音效。优先 CC0；CC-BY 可用但必须记录 attribution；避开 CC-BY-NC。

### 3.2 许可证原则

允许：

```text
CC0
Public Domain
CC-BY，必须记录 attribution
MIT / permissive custom license，必须记录全文或链接
```

暂时禁止：

```text
NC 非商业
ND 禁止改作
SA 共享相同方式
GPL / LGPL 音频或美术
Editorial only
个人使用
授权不明
需要外链 CDN 才可用
```

即使当前不商业化，也按“未来可商用”标准筛选，避免以后重做。

## 4. 文件目录

```text
public/assets/2d/
  manifest.v0.1.json
  licenses/
    THIRD_PARTY_2D_ASSETS.md
    ATTRIBUTION.md

  combat/
    bullets/
    pickups/
    vfx/
    enemies/
    player/
    backgrounds/

public/assets/audio/
  manifest.v0.1.json
  licenses/
    THIRD_PARTY_AUDIO_ASSETS.md
    ATTRIBUTION.md

  ui/
  combat/
  spells/
  pickups/
  ambience/
```

## 5. Manifest 基本原则

所有资源必须通过 manifest 使用，不允许页面或 renderer 硬编码路径。

Manifest 必须记录：

```text
id
path
category
type
sourceName
sourceUrl
author
license
attributionRequired
downloadDate
fileSize
runtime
notes
```

VFX sprite sheet 还必须记录：

```text
frameWidth
frameHeight
frameCount
fps
loop
blendMode
anchor
recommendedScale
```

音效还必须记录：

```text
duration
sampleRate
channels
volume
cooldownMs
mixGroup
```

## 6. 战斗表现替换顺序

### Phase A：子弹与掉落

最先替换，因为读弹和多巴胺最直接。

必须实现：

```text
敌弹白芯 + 危险描边
玩家飞剑 / 雷弹 / 火弹
灵气球弹出、漂浮、旋转、磁吸
真元球入池反馈
稀有材料落地闪光
```

### Phase B：命中与死亡

必须实现：

```text
命中火花
受击闪白
护盾碎裂
小怪死亡 burst
精英死亡 shockwave
Boss 阶段转换爆光
浮字
屏幕震动
```

### Phase C：法术、法宝、丹药、灵宝

必须实现：

```text
五雷正法链雷
八卦剑阵护身环
红莲业火地面火场
袖里乾坤吸弹扭曲
青霜飞剑剑芒
紫阳葫芦火息
玄岳重印砸落法印
回春丹绿气
燃血丹血纹
清心丹净光
八卦玉佩挡弹
聚宝金蟾牵引线
```

### Phase D：人物/敌人动画

必须实现：

```text
玩家御器 idle / move / cast / hit / soul
山魈移动/死亡
狼妖冲锋预警/冲锋/死亡
邪修驻留施法/死亡
石甲妖重压/受击/死亡
```

### Phase E：音效与混音

必须实现：

```text
事件映射
音效冷却
同类音效去重
音量组
低血/高压氛围
Boss/雷劫警告
```

### Phase F：背景分层

必须实现：

```text
域外战场远景
虚空碎石层
战场云雾层
阵纹地面层
雷劫天象层
parallax 滚动
```

## 7. 资源质量门槛

### 7.1 视觉

| 指标 | 标准 |
|---|---|
| 敌弹可读 | 高压下敌弹白芯始终清楚 |
| 玩家 hitbox | 永远在最上层可见 |
| 法术特效 | 不遮挡敌弹核心 |
| 掉落物 | 远处可辨识，磁吸轨迹清晰 |
| 背景 | 不抢战斗主体 |
| 爆炸 | 有爽感但时长可控 |

### 7.2 性能

| 指标 | 标准 |
|---|---:|
| 1920×1080 常规战斗 | 55–60 FPS |
| 1-4 怪潮高压 | ≥50 FPS |
| Boss Phase 3 | ≥50 FPS |
| 同屏 VFX 实例 | 有预算和降级 |
| Audio voices | 同时播放限制 24–32 |

### 7.3 授权

```text
所有资源必须在 ATTRIBUTION.md 可追踪。
CI 必须校验 license 字段。
CC-BY 资源必须显示作者名和 URL。
禁止不明授权进入 manifest required asset。
```

## 8. 是否继续 3D 战斗

根据已完成验证：

```text
Canvas：约 60 FPS，读弹清楚。
3D 模型战斗：约 25 FPS。
3D 1000 bullets：约 8 FPS。
```

因此本阶段不推进 3D 战斗替换。3D 只保留：

```text
局外洞府
3D 资产预览
模型烘焙 2D sprite
天地棋局/低密度模式
```

## 9. 成功标准

当以下成立时，本阶段成功：

```text
1. 战斗中主要对象不再是简单几何占位。
2. 子弹、掉落、命中、死亡、法术、丹药、法宝都有明确视觉反馈。
3. 音效形成“发射—命中—爆炸—拾取—警告”的完整反馈链。
4. Canvas 性能保持稳定。
5. 授权记录完整。
6. /dev/2d-assets 和 /dev/audio-assets 可预览所有资源。
7. 截图能明显看出画面脱胎换骨。
```
