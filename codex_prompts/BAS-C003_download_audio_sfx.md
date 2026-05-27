# BAS-C003：下载/登记第一批音效资产

## 目标

为战斗反馈下载授权清楚的音效资源，登记到 audio manifest。不要接入 AudioBus。

## 来源

- Kenney audio
- OpenGameArt sound effects
- Freesound，仅 CC0 或 CC-BY

## 第一批音效

1. 飞剑发射
2. 普通命中
3. 护盾命中/碎裂
4. 小怪死亡爆裂
5. 精英/重击爆炸
6. 五雷正法释放
7. 雷电链跳
8. 回春丹吞服/治疗
9. 灵气球拾取
10. 稀有掉落拾取
11. Boss/雷劫警告
12. 域外战场环境底噪 loop

## 任务

1. 下载音效到：

```text
public/assets/audio/...
```

2. 更新：

```text
public/assets/audio/manifest.v0.1.json
public/assets/audio/licenses/THIRD_PARTY_AUDIO_ASSETS.md
public/assets/audio/licenses/ATTRIBUTION.md
```

3. 音效 manifest 必须写：

```text
mixGroup
volume
cooldownMs
maxInstances
license/source/author
```

4. 对 CC-BY 资源必须写 attribution。

## 禁止

- 不使用 CC-BY-NC。
- 不使用授权不明。
- 不接入正式战斗。
- 不改 sim。

## 运行

```text
npm run validate:combat-assets
npm run typecheck
npm test
```

## 输出

- 音效列表
- license/source
- attribution 文件
- 建议下一步
