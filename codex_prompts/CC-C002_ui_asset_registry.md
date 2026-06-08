> Deprecated / legacy reference only (SIM-REDESIGN).
> Do not execute this prompt directly. Reason: it creates generated PNG UI asset registries for character-creation controls, which conflicts with the current DOM/React + local UI System route.
> Replacement route: CCUI2 baseline, then MIG-C003/SIM-C008.

# CC-C002：创建角色 UI 资产 Manifest 与 Registry

你正在实现 UI 资产接入。不要实现屏幕，不要生成新图片。

## 资产目录

请使用：

```text
public/assets/generated/ui/common/
public/assets/generated/ui/character_creation/
```

## 任务

1. 创建 `public/assets/generated/ui/character_creation_manifest.v0.1.json`。
2. 包含以下 asset id：
   - `cc.mainPanel`
   - `cc.portraitFrame`
   - `cc.nameInput`
   - `cc.attributePanel`
   - `cc.attributeRow`
   - `cc.spiritualRootDisc`
   - `cc.elementBadgeFrame`
   - `cc.destiny.common`
   - `cc.destiny.rare`
   - `cc.destiny.epic`
   - `cc.destiny.legendary`
   - `cc.destiny.flaw`
   - `cc.traitLock.locked`
   - `cc.traitLock.unlocked`
   - `cc.reroll.normal`
   - `cc.reroll.hover`
   - `cc.confirmLife.normal`
   - `cc.backgroundOriginPanel`
   - `cc.hiddenBloodlinePanel`
   - `cc.divinationTokenBadge`
   - `common.close.normal`
   - `common.close.hover`
   - `common.close.pressed`
   - `common.close.disabled`
3. 创建 `src/assets/UiAssetRegistry.ts`。
4. 支持：
   - `getUiAsset(id)`
   - `validateRequiredUiAssets(manifest)`
   - `preloadUiAssets(manifest)`
5. 测试：required asset 缺失时失败。

## 禁止

- 不要生成新图片。
- 不要硬编码 UI 控件到页面。
- 不要修改 `src/sim/**`。

## 验收

```bash
npm run typecheck
npm test
```
