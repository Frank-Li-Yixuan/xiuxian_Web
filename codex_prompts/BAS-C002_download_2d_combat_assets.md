# BAS-C002：下载/登记第一批 2D 战斗视觉资产

## 目标

下载少量授权清楚的 2D 战斗资源，登记到 manifest。不要接入正式战斗。

## 首选来源

- Kenney
- OpenGameArt
- itch.io free assets，但必须逐包确认 license

## 授权规则

允许：CC0、Public Domain、CC-BY。
禁止：NC、ND、SA、GPL、授权不明、个人使用、Editorial。

## 第一批目标资源

1. 玩家飞剑/能量弹 projectile sprite
2. 敌弹 sprite，要求白芯/危险边
3. 灵气球 pickup sprite
4. 真元球 pickup sprite
5. 小爆炸 VFX sprite sheet
6. 雷电/链雷 VFX sprite sheet
7. 剑气/斩击 VFX sprite sheet
8. 治疗/绿色药气 VFX sprite sheet
9. 护盾/屏障 VFX sprite sheet
10. 域外战场背景或深色幻想背景层

## 任务

1. 下载小批量资源，放入：

```text
public/assets/2d/combat/...
```

2. 更新：

```text
public/assets/2d/manifest.v0.1.json
public/assets/2d/licenses/THIRD_PARTY_2D_ASSETS.md
public/assets/2d/licenses/ATTRIBUTION.md
```

3. 如果资源是 CC-BY，必须写明作者、标题、source URL、license、是否修改。

4. 如果找不到合适资源，创建 `planned`/`required:false` 项，不要乱用授权不明资源。

## 禁止

- 不修改 `src/sim/**`。
- 不改 renderer。
- 不接入战斗。
- 不下载超过 20MB 单文件的大包。
- 不使用无 license 包。

## 运行

```text
npm run validate:combat-assets
npm run typecheck
npm test
```

## 输出

- 下载资源列表。
- 每个资源 license/source。
- manifest entries。
- 总大小。
- 失败/计划资源。
