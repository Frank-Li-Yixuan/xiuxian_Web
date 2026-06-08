> Deprecated / legacy reference only (SIM-REDESIGN).
> Do not execute this prompt directly. Reason: it restores the old generated-asset, portrait-frame character-creation layout instead of the current black seated figure + destiny plate + effect-layer direction.
> Replacement route: CCUI2 baseline, then MIG-C003/SIM-C008.

# CC-C004：CharacterCreationScreen 静态布局

目标：使用生成好的 UI 资产搭出完整创建角色页面。

## 任务

1. 创建 `src/app/screens/CharacterCreationScreen.ts`。
2. 使用 `cc.mainPanel` 作为主面板。
3. 左侧：角色立绘框、名字输入、外观占位。
4. 中部：属性面板、灵根命盘。
5. 右侧：主命格、副命格 x2、缺陷命格、出身、隐藏预兆。
6. 底部：重新推演、天机 token、确认此生、返回。
7. 顶部右侧：关闭按钮。
8. 初始 draft 由 CharacterDraftGenerator 生成。
9. 页面必须适配 16:9，最小支持 1366×768。
10. 不要引入 React。

## 视觉要求

- 不能看起来像默认 HTML 表单。
- 所有大面板、按钮、卡牌必须使用生成资产。
- 文字必须清晰。
- 命格卡 hover 有光效/微缩放。

## 验收

- 页面能在 app 中独立显示。
- 所有区域都有内容。
- 未接入交互也要显示一份完整 draft。
