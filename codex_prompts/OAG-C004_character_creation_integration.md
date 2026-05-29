# OAG-C004：接入创建角色页

## 目标

将 OpeningInnateDraft 接入当前创建角色页面，替换 mock 属性和 mock 灵根。

## 前置

OAG-C001、OAG-C002、OAG-C003 已完成。

## 任务

1. 创建或更新 `CharacterCreationDraft`，加入：
   - openingInnateDraft
   - attributeLock
   - spiritualRootLock
2. 创建角色页点击“重新推演”时：
   - 调用 OpeningGenerator。
   - 更新属性显示。
   - 更新灵根命盘。
   - 更新标签摘要。
3. 支持锁定：
   - 锁定属性命盘。
   - 锁定灵根。
4. 若天命系统已经接入：
   - 将 OpeningInnateDraft.tags 传给天命生成器。
   - 让天命权重受灵根和属性影响。
5. UI 只使用 DOM/CSS，不依赖 generated PNG 控件。
6. 不重做整页视觉，只接数据和交互。

## 验收

- 重新推演会改变命盘和灵根。
- 锁定灵根后，重 Roll 不改变灵根。
- 锁定属性命盘后，重 Roll 不改变属性。
- 页面显示命盘类型、六维、精气神、灵根类型、纯度/稳定/冲突/广度。
- 生成的 tags 能在 debug 面板或开发信息中查看。
- `npm run typecheck`
- `npm test`
