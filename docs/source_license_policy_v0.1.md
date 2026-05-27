# 《网上资源来源与授权策略 v0.1》

## 1. 原则

本项目可以使用网上资源，但必须做到：

```text
能追溯来源
能确认授权
能记录作者
能记录是否需要署名
能在未来替换
```

不要因为“现在不商业化”就使用授权不明或非商业资源。未来如果项目变大，授权问题会成为返工灾难。

## 2. 推荐来源

### Kenney

用途：通用 2D、UI、音频、3D 原型资源。
策略：优先使用，因为 CC0 多、风格干净、适合原型。

### OpenGameArt

用途：VFX、sprites、tilesets、音效。
策略：只使用 CC0 或 CC-BY；CC-BY 必须署名。暂时避开 CC-BY-SA、GPL、NC、ND。

### itch.io Free Assets

用途：高质量 VFX 包、sprite 包、背景包。
策略：逐包确认授权；“free”不等于可商用。没有明确 license 的包不要用。

### Freesound

用途：音效。
策略：优先 CC0；CC-BY 可用但需要署名；绝对避开 CC-BY-NC。

## 3. 授权等级

| 等级 | 允许性 | 说明 |
|---|---|---|
| CC0/Public Domain | 允许 | 首选 |
| CC-BY | 允许 | 必须记录和展示 attribution |
| MIT/Permissive | 允许 | 需记录 license |
| Custom permissive | 条件允许 | 必须保存 license 文本 |
| CC-BY-SA | 暂不允许 | 共享条款复杂 |
| GPL/LGPL art/audio | 暂不允许 | 可能污染分发 |
| NC | 禁止 | 非商业限制 |
| ND | 禁止 | 禁止改作，不适合游戏处理 |
| Editorial/Personal only | 禁止 | 不适合项目 |
| Unknown | 禁止 | 无法审计 |

## 4. 必填元数据

每个资源必须记录：

```json
{
  "id": "vfx.explosion.small_01",
  "sourceName": "OpenGameArt",
  "sourceUrl": "https://...",
  "author": "AuthorName",
  "license": "CC0",
  "attributionRequired": false,
  "downloadDate": "2026-05-26",
  "originalFileName": "explosion.png",
  "notes": "cropped into sprite sheet"
}
```

## 5. Attribution 文件

必须维护：

```text
public/assets/2d/licenses/ATTRIBUTION.md
public/assets/audio/licenses/ATTRIBUTION.md
```

格式：

```text
## Asset ID
- Title:
- Author:
- Source:
- License:
- Changes:
```

## 6. Codex 禁止事项

```text
不要从 Google 图片下载
不要从 Pinterest 下载
不要从 B站/知乎/贴吧/论坛扒图
不要用模型/音效合集但找不到原作者
不要用 license 缺失的 itch 包
不要用 NC/ND 资源
不要把网络 URL 作为运行时依赖
不要使用 CDN 外链资源
```
