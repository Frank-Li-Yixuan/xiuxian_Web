# CC-C001：角色创建数据、类型与 Draft 生成器

你正在实现修仙模拟器的角色创建系统第一步。不要实现 UI。

## 必须阅读

- docs/character_creation_implementation_v0.1.md
- src/types/character-creation-types.v0.1.ts
- data/character_creation/spiritual_roots.v0.1.json
- data/character_creation/destiny_traits.v0.1.json
- data/character_creation/background_origins.v0.1.json
- data/character_creation/hidden_fates.v0.1.json
- data/character_creation/carried_items.v0.1.json
- data/character_creation/character_creation_defaults.v0.1.json

## 任务

1. 在项目中新增 `data/character_creation/` 并放入角色创建数据 JSON。
2. 新增 `src/character/CharacterCreationTypes.ts`。
3. 新增 `src/character/CharacterCreationData.ts`，负责加载/导出数据。当前项目没有 runtime fetch 数据的统一机制时，可先用静态 import 或与现有 ContentRegistry 风格一致的方式。
4. 新增 `src/character/CharacterDraftGenerator.ts`。
5. Draft 生成器必须支持：
   - 生成基础三宝：精、气、神。
   - 生成六维：根骨、悟性、灵感、气运、心性、寿元。
   - 生成灵根。
   - 生成主命格、副命格 x2、缺陷命格。
   - 生成出身。
   - 生成隐藏预兆。
   - 生成随身物。
   - reroll 时保留锁定项。
   - 不允许 exclusiveWith 命格同时出现。
6. 使用项目现有 SeededRng，或者在 app 层使用非 gameplay RNG，但不得改 `src/sim/**`。
7. 新增测试：
   - 能生成完整 draft。
   - 互斥命格不会同时出现。
   - 锁定主命格后 reroll 不改变主命格。
   - 未锁定字段 reroll 后可变化。
   - 缺陷命格一定来自 flaw slot。

## 禁止

- 不要实现 CharacterCreationScreen。
- 不要修改战斗模拟。
- 不要引入 React 或其他 UI 框架。
- 不要让新游戏直接进入战斗。

## 验收

运行：

```bash
npm run typecheck
npm test
```

最终回复包含文件列表、测试结果、已知问题。
