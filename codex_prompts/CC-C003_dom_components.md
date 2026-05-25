# CC-C003：创建角色页 DOM 组件

当前项目没有 React 依赖，默认用 vanilla TypeScript 实现 DOM 组件。不要引入 UI 框架。

## 任务

创建：

```text
src/app/components/AssetButton.ts
src/app/components/AssetPanel.ts
src/app/components/CloseButton.ts
src/app/components/DestinyCard.ts
src/app/components/AttributePanel.ts
src/app/components/SpiritualRootDisc.ts
src/app/components/CharacterPortraitFrame.ts
```

组件要求：

1. PNG 作为背景/边框图层。
2. 中文和数值由 DOM text 渲染。
3. `AssetButton` 支持 normal/hover/pressed/disabled。
4. `DestinyCard` 根据稀有度选择对应卡框。
5. `DestinyCard` 显示：名称、稀有度、标签、正面效果、负面效果、锁定按钮。
6. `AttributePanel` 显示精气神和六维。
7. `SpiritualRootDisc` 显示灵根名称、元素列表、标签。
8. 所有按钮必须支持鼠标点击。

## 禁止

- 不要实现完整 CharacterCreationScreen。
- 不要把文字画进 Canvas。
- 不要修改 sim。

## 验收

- 组件可以被测试挂载到 DOM。
- 组件输出真实 DOM text。
- 按钮状态 class 可切换。
